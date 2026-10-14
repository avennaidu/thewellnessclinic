import Fastify from 'fastify';
import { z, ZodError } from 'zod';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Store, type Row, type Table } from './db.ts';
import { seed } from './seed.ts';
import {
  TIERS,
  HOME_VISIT_FEE,
  CONSENT_VERSION,
  CONSENT_TEXT,
  DURBAN,
  distanceKm,
  addBusinessDays,
  type Role,
} from '../../../packages/core/domain.ts';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
const id = () => randomUUID();
const fail = (status: number, message: string): never => {
  throw Object.assign(new Error(message), { statusCode: status });
};
const emailSchema = z
  .string()
  .email()
  .max(150)
  .transform((x) => x.trim().toLowerCase());
const roleSchema = z.enum(['member', 'family', 'doctor', 'nurse', 'admin', 'pharmacy', 'driver']);
const tierSchema = z.enum(['connect', 'monitor', 'concierge']);
const dateSchema = z.string().datetime({ offset: true });
const text = z.string().trim().min(1).max(3000);
type Actor = Row & { role: Role; name: string };

export async function createApp(
  options: {
    dbPath?: string;
    databaseUrl?: string;
    demo?: boolean;
    seedData?: boolean;
    webRoot?: string;
  } = {},
) {
  const production = process.env.NODE_ENV === 'production';
  const demo = options.demo ?? !production;
  if (production) {
    // No production fallback to local/demo services. Provider integrations are a release gate.
    if (demo) throw new Error('Demo authentication cannot run in production');
    if (!options.databaseUrl && !process.env.DATABASE_URL)
      throw new Error('Production requires PostgreSQL');
    if (!['af-south-1', 'southafricanorth'].includes(process.env.HOSTING_REGION || ''))
      throw new Error('South African hosting is required');
    if (!process.env.DATA_ENCRYPTION_KEY)
      throw new Error('Production requires a managed encryption key');
    throw new Error(
      'Production release is gated: configure and validate OTP delivery, staff MFA, payments, private object storage, backups and hosting before enabling real member access. See docs/RELEASE.md.',
    );
  }
  const db = new Store(
    options.dbPath || resolve('data/wellness.sqlite'),
    options.databaseUrl || process.env.DATABASE_URL,
  );
  await db.migrate();
  if (demo && options.seedData !== false) await seed(db);
  const app = Fastify({ logger: false, bodyLimit: 15 * 1024 * 1024, trustProxy: false });
  const attempts = new Map<string, { count: number; until: number }>();
  const audit = async (
    actorId: string,
    memberId: string | null,
    action: string,
    entity: string,
    entityId: string,
    ip = 'local',
  ) => db.insert('audit_log', { actorId, action, entity, entityId, at: now(), ip }, memberId);
  const actor = (req: any): Actor => req.actor || fail(401, 'Please sign in.');
  const roles = (req: any, ...allowed: Role[]) => {
    const a = actor(req);
    if (!allowed.includes(a.role)) fail(403, 'This action is not available for your role.');
    return a;
  };
  const ownMember = async (a: Actor) =>
    (await db.list('members')).find((m) => m.userId === a.id) || null;
  const requireConsent = async (memberId: string, type: string) => {
    if (!(await db.list('consents', memberId)).some((c) => c.type === type && !c.revokedAt))
      fail(
        409,
        `Active ${type} consent is required for this action. Update your consent in Settings or contact your coordinator.`,
      );
  };
  const access = async (req: any, memberId: string, allowed: Role[] = ['doctor', 'nurse']) => {
    const a = actor(req);
    const m = await db.get('members', memberId);
    if (!m) fail(404, 'Member not found.');
    if (a.role === 'member' && m!.userId === a.id) return m!;
    if (allowed.includes(a.role)) return m!;
    fail(403, 'You do not have access to this member.');
  };
  const summary = async (member: Row) => ({
    id: member.id,
    name: member.name,
    conditions: member.conditions || [],
    allergies: member.allergies || [],
    doctor: member.doctor,
    nextOfKin: member.nextOfKin,
    medicalAidScheme: member.medicalAidScheme,
    medicalAidNumber: member.medicalAidNumber,
    medications: (await db.list('medication_events', member.id)).filter(
      (x) => x.status === 'current',
    ),
    vitals: (await db.list('vitals', member.id))
      .sort((a, b) => b.takenAt.localeCompare(a.takenAt))
      .slice(0, 3),
    generatedAt: now(),
  });
  const session = async (reply: any, user: Row) => {
    const token = randomBytes(32).toString('hex');
    await db.insert('sessions', {
      tokenHash: hash(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
    reply.header(
      'Set-Cookie',
      `pw_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800${production ? '; Secure' : ''}`,
    );
    return user;
  };
  const safeUser = (u: Row) => ({ id: u.id, name: u.name, role: u.role, email: u.email });
  app.addHook('onRequest', async (req, reply) => {
    reply
      .header('X-Content-Type-Options', 'nosniff')
      .header('Referrer-Policy', 'no-referrer')
      .header('X-Frame-Options', 'DENY');
    reply.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    if (req.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      const expected = `${production ? 'https' : 'http'}://${req.headers.host}`;
      if (origin && origin !== expected) fail(403, 'Cross-origin requests are not permitted.');
      // Required by browser and native clients; prevents simple cross-origin form submissions.
      if (req.headers['x-wellness-client'] !== 'app')
        fail(403, 'Missing application request header.');
    }
    if (req.url.startsWith('/api/auth/') || req.url.startsWith('/api/emergency/redeem')) {
      const key = `${req.ip}:${req.url.split('?')[0]}`;
      let entry = attempts.get(key);
      if (!entry || entry.until < Date.now()) {
        entry = { count: 0, until: Date.now() + 600000 };
        attempts.set(key, entry);
      }
      if (++entry.count > 20) fail(429, 'Too many attempts. Please try again in 10 minutes.');
    }
    const cookie = req.headers.cookie?.match(/(?:^|; )pw_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    const bearer = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    const token = cookie || bearer;
    if (token) {
      const s = (await db.list('sessions')).find(
        (s) => s.tokenHash === hash(token) && new Date(s.expiresAt).getTime() > Date.now(),
      );
      if (s) {
        (req as any).actor = await db.get('users', s.userId);
        (req as any).session = s;
      }
    }
  });
  app.setErrorHandler((error, req, reply) => {
    const e = error as any;
    reply
      .code(e instanceof ZodError ? 400 : e.statusCode || 500)
      .send({
        error:
          e instanceof ZodError
            ? e.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join('; ')
            : e.statusCode
              ? e.message
              : 'Something went wrong. Please try again.',
      });
  });
  app.get('/api/config', async () => ({
    demo,
    tiers: TIERS,
    homeVisitFee: HOME_VISIT_FEE,
    consentVersion: CONSENT_VERSION,
    consents: CONSENT_TEXT,
    serviceHours: 'Monday–Friday, 08:00–17:00',
    deliveryRadiusKm: 20,
    informationOfficer: process.env.INFORMATION_OFFICER_EMAIL || null,
  }));
  app.get('/api/health', async () => ({ status: 'ok', mode: demo ? 'local-demo' : 'configured' }));
  app.post('/api/demo/login', async (req, reply) => {
    if (!demo) fail(404, 'Not found');
    const { role, native } = z
      .object({ role: roleSchema, native: z.boolean().optional() })
      .parse(req.body);
    const user = await db.get('users', `user-${role}`);
    if (!user) fail(404, 'Demo account not found');
    let token: string | undefined;
    if (native) {
      token = randomBytes(32).toString('hex');
      await db.insert('sessions', {
        tokenHash: hash(token),
        userId: user!.id,
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
      });
    } else await session(reply, user!);
    await audit(user!.id, null, 'demo_sign_in', 'users', user!.id, req.ip);
    return { user: safeUser(user!), ...(token ? { token } : {}) };
  });
  const signupSchema = z.object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    phone: z.string().regex(/^\+27[0-9]{9}$/, 'Use +27 and nine digits'),
    address: z.string().trim().min(8).max(300),
    geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
    tier: tierSchema,
    consents: z.object({
      care: z.literal(true),
      communications: z.boolean(),
      delivery: z.boolean(),
    }),
  });
  app.post('/api/auth/register', async (req) => {
    const input = signupSchema.parse(req.body);
    if (distanceKm(DURBAN, input.geo) > 20)
      fail(
        422,
        'This address is outside our 20 km Durban service area. Join the waitlist instead.',
      );
    if ((await db.list('users')).some((u) => u.email === input.email))
      fail(409, 'An account with this email already exists. Please sign in.');
    const otp = String(Math.floor(100000 + (randomBytes(4).readUInt32BE() % 900000)));
    const challenge = await db.insert('otp_challenges', {
      email: input.email,
      purpose: 'signup',
      signup: input,
      otpHash: hash(otp),
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      attempts: 0,
      usedAt: null,
    });
    return {
      challengeId: challenge.id,
      ...(demo ? { demoOtp: otp } : {}),
      message: demo ? 'Local test code. No email has been sent.' : 'Check your email.',
    };
  });
  app.post('/api/auth/request-otp', async (req) => {
    const { email, portal } = z
      .object({ email: emailSchema, portal: z.enum(['member', 'staff']) })
      .parse(req.body);
    const user = (await db.list('users')).find(
      (u) =>
        u.email === email &&
        (['member', 'family', 'driver'].includes(u.role) ? 'member' : 'staff') === portal,
    );
    const otp = String(Math.floor(100000 + (randomBytes(4).readUInt32BE() % 900000)));
    const challenge = await db.insert('otp_challenges', {
      email,
      userId: user?.id || null,
      otpHash: hash(otp),
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      attempts: 0,
      usedAt: null,
      purpose: 'login',
    });
    return {
      challengeId: challenge.id,
      ...(demo && user ? { demoOtp: otp } : {}),
      message: 'If an account exists, you can continue with its verification code.',
    };
  });
  app.post('/api/auth/verify', async (req, reply) => {
    const { challengeId, code, native } = z
      .object({
        challengeId: z.string(),
        code: z.string().regex(/^\d{6}$/),
        native: z.boolean().optional(),
      })
      .parse(req.body);
    return db
      .transaction(async () => {
        const c = await db.get('otp_challenges', challengeId);
        if (!c || c.usedAt || Date.parse(c.expiresAt) < Date.now() || c.attempts >= 5)
          fail(401, 'The code has expired or is no longer valid. Request a new one.');
        // Failed attempts must survive the transaction, so return the rejection after committing.
        await db.update('otp_challenges', c!.id, { attempts: c!.attempts + 1 });
        if (!timingSafeEqual(Buffer.from(c!.otpHash, 'hex'), Buffer.from(hash(code), 'hex')))
          return { invalid: true };
        let user: Row | null = null;
        if (c!.purpose === 'signup') {
          const s = signupSchema.parse(c!.signup);
          if ((await db.list('users')).some((u) => u.email === s.email)) return { invalid: true };
          user = await db.insert('users', {
            name: s.name,
            email: s.email,
            phone: s.phone,
            role: 'member',
          });
          const member = await db.insert('members', {
            userId: user.id,
            name: s.name,
            preferredName: s.name.split(' ')[0],
            email: s.email,
            phone: s.phone,
            address: s.address,
            geo: s.geo,
            tier: s.tier,
            status: 'pending_payment',
            conditions: [],
            allergies: [],
            coordinator: 'To be assigned',
          });
          for (const [type, granted] of Object.entries(s.consents))
            if (granted)
              await db.insert(
                'consents',
                {
                  type,
                  version: CONSENT_VERSION,
                  text: CONSENT_TEXT[type as keyof typeof CONSENT_TEXT],
                  grantedAt: now(),
                  revokedAt: null,
                  grantedBy: user.id,
                },
                member.id,
              );
          await db.insert(
            'subscriptions',
            {
              tier: s.tier,
              amount: TIERS[s.tier].amount,
              status: 'pending',
              paymentMethod: null,
              billingDay: new Date().getDate(),
              startedAt: null,
            },
            member.id,
          );
          await db.insert(
            'invoices',
            {
              type: 'retainer',
              reference: `PW-${Date.now()}`,
              amount: TIERS[s.tier].amount,
              status: 'due',
              description: `${TIERS[s.tier].name} membership`,
              dueAt: now(),
              test: demo,
            },
            member.id,
          );
          await audit(user.id, member.id, 'signup_and_consent', 'members', member.id, req.ip);
        } else user = c!.userId ? await db.get('users', c!.userId) : null;
        if (!user) return { invalid: true };
        await db.update('otp_challenges', c!.id, { usedAt: now() });
        await session(reply, user);
        await audit(user.id, null, 'sign_in', 'users', user.id, req.ip);
        // Mobile uses the same session lifetime, stored with Expo SecureStore.
        let token: string | undefined;
        if (native) {
          token = randomBytes(32).toString('hex');
          await db.insert('sessions', {
            tokenHash: hash(token),
            userId: user.id,
            expiresAt: new Date(Date.now() + 1800000).toISOString(),
          });
        }
        return { user: safeUser(user), ...(token ? { token } : {}) };
      })
      .then((result) => {
        if ('invalid' in result) fail(401, 'The code is incorrect. Please try again.');
        return result;
      });
  });
  app.post('/api/auth/logout', async (req, reply) => {
    if ((req as any).session) await db.remove('sessions', (req as any).session.id);
    reply.header('Set-Cookie', 'pw_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
    return { ok: true };
  });
  app.get('/api/me', async (req) => ({ user: safeUser(actor(req)) }));
  app.post('/api/waitlist', async (req) => {
    const input = z
      .object({ name: text, email: emailSchema, area: z.string().min(2).max(100) })
      .parse(req.body);
    await db.insert('waitlist', input);
    return { ok: true };
  });
  app.get('/api/portal', async (req) => {
    const a = actor(req);
    let m: Row | null = null;
    let grant: Row | undefined;
    const requested = (req.query as any).memberId;
    if (a.role === 'family') {
      grant = (await db.list('family_viewers')).find(
        (g) => g.userId === a.id && !g.revokedAt && (!requested || g.memberId === requested),
      );
      if (grant) m = await db.get('members', grant.memberId!);
    } else if (a.role === 'member') m = await ownMember(a);
    else if (requested) m = (await access(req, requested, ['doctor', 'nurse', 'admin'])) || null;
    if (!m)
      fail(
        404,
        a.role === 'family'
          ? 'No active family access. Ask the member to grant access.'
          : 'Select a member to view their record.',
      );
    await audit(a.id, m!.id, 'view', 'member_portal', m!.id, req.ip);
    if (a.role === 'family') {
      const shared = await summary(m!);
      const { doctor, nextOfKin, medicalAidScheme, medicalAidNumber, ...basic } = shared;
      return {
        member: { id: m!.id, name: m!.name },
        summary: grant!.emergency ? shared : basic,
        familyScope: grant!.scope,
        emergencyAllowed: grant!.emergency,
        consults: grant!.consultNotes
          ? (await db.list('consults', m!.id)).filter((c) => c.signedAt)
          : [],
        updates:
          grant!.scope === 'summary_updates'
            ? (await db.list('consults', m!.id)).map((c) => ({
                id: c.id,
                status: c.status,
                mode: c.mode,
                scheduledAt: c.scheduledAt,
              }))
            : [],
      };
    }
    const result: any = {
      member: m,
      subscription: (await db.list('subscriptions', m!.id))[0] || null,
      invoices: await db.list('invoices', m!.id),
      consents: await db.list('consents', m!.id),
      family: await db.list('family_viewers', m!.id),
      benefits: await db.list('benefits', m!.id),
    };
    if (a.role === 'admin') {
      result.member = {
        id: m!.id,
        name: m!.name,
        tier: m!.tier,
        status: m!.status,
        email: m!.email,
        phone: m!.phone,
        address: m!.address,
      };
      return result;
    }
    for (const [key, table] of Object.entries({
      vitals: 'vitals',
      medications: 'medication_events',
      consults: 'consults',
      orders: 'orders',
      reminders: 'reminders',
      nurseNotes: 'nurse_notes',
      thresholds: 'thresholds',
    }))
      result[key] = await db.list(table as Table, m!.id);
    result.documents = (await db.list('documents', m!.id)).map(({ fileBase64, ...d }) => d);
    return result;
  });
  app.patch('/api/members/:memberId/profile', async (req) => {
    const mid = (req.params as any).memberId;
    const a = actor(req);
    await access(req, mid, ['doctor', 'nurse']);
    const input = z
      .object({
        preferredName: z.string().max(60).optional(),
        phone: z
          .string()
          .regex(/^\+27\d{9}$/)
          .optional(),
        medicalAidScheme: z.string().max(100).optional(),
        medicalAidNumber: z.string().max(100).optional(),
        nextOfKin: z.object({ name: z.string().max(100), phone: z.string().max(30) }).optional(),
        allergies: z.array(z.string().max(100)).max(30).optional(),
        conditions: z.array(z.string().max(100)).max(30).optional(),
      })
      .strict()
      .parse(req.body);
    await db.update('members', mid, input);
    await audit(a.id, mid, 'update', 'member_profile', mid, req.ip);
    return { ok: true };
  });
  app.post('/api/members/:memberId/vitals', async (req) => {
    const mid = (req.params as any).memberId;
    await access(req, mid);
    await requireConsent(mid, 'care');
    const input = z
      .object({
        type: z.enum(['blood_pressure', 'glucose', 'heart_rate', 'weight', 'spo2', 'temperature']),
        value: z.number().positive().max(600),
        secondary: z.number().positive().max(250).optional(),
        takenAt: dateSchema,
        source: z.literal('manual').default('manual'),
      })
      .parse(req.body);
    if (Date.parse(input.takenAt) > Date.now() + 60000)
      fail(400, 'A reading cannot be in the future.');
    if (input.type === 'blood_pressure' && (!input.secondary || input.secondary >= input.value))
      fail(400, 'Enter systolic above diastolic.');
    const ranges: any = {
      blood_pressure: [40, 300],
      glucose: [0.1, 50],
      heart_rate: [20, 250],
      weight: [10, 400],
      spo2: [30, 100],
      temperature: [25, 45],
    };
    if (input.value < ranges[input.type][0] || input.value > ranges[input.type][1])
      fail(400, 'Please check the reading and units.');
    const units: any = {
      blood_pressure: 'mmHg',
      glucose: 'mmol/L',
      heart_rate: 'bpm',
      weight: 'kg',
      spo2: '%',
      temperature: '°C',
    };
    const threshold = (await db.list('thresholds', mid)).find((t) => t.type === input.type);
    const flagged =
      !!threshold &&
      (input.value < threshold.low ||
        input.value > threshold.high ||
        (input.secondary || 0) > (threshold.secondaryHigh || Infinity));
    const v = await db.insert(
      'vitals',
      { ...input, unit: units[input.type], flagged, reviewedAt: null, protocolSet: !!threshold },
      mid,
    );
    await audit(actor(req).id, mid, 'create', 'vitals', v.id, req.ip);
    return v;
  });
  app.post('/api/members/:memberId/consults', async (req) => {
    const mid = (req.params as any).memberId;
    await access(req, mid);
    await requireConsent(mid, 'care');
    const input = z
      .object({
        reason: text,
        urgency: z.enum(['routine', 'soon']),
        mode: z.enum(['virtual', 'home']),
        preferredDate: z.string().optional(),
        feeAccepted: z.boolean().optional(),
      })
      .parse(req.body);
    if (input.mode === 'home' && !input.feeAccepted)
      fail(400, 'Please accept the R 1,850 home visit fee.');
    return db.transaction(async () => {
      const c = await db.insert(
        'consults',
        { ...input, status: 'requested', requestedAt: now(), note: '', signedAt: null },
        mid,
      );
      if (input.mode === 'home') {
        const invoice = await db.insert(
          'invoices',
          {
            type: 'home_visit',
            reference: `PW-HV-${Date.now()}`,
            amount: HOME_VISIT_FEE,
            status: 'awaiting_completion',
            dueAt: null,
            consultId: c.id,
            description: 'Home visit • charged on completion',
            test: demo,
          },
          mid,
        );
        await db.insert(
          'home_visits',
          {
            consultId: c.id,
            status: 'requested',
            fee: HOME_VISIT_FEE,
            invoiceId: invoice.id,
            memberConfirmedAt: now(),
          },
          mid,
        );
      }
      await audit(actor(req).id, mid, 'request', 'consults', c.id, req.ip);
      return c;
    });
  });
  app.post('/api/consults/:id/accept', async (req) => {
    const a = roles(req, 'doctor');
    const c = await db.get('consults', (req.params as any).id);
    if (!c) fail(404, 'Consult not found');
    if (c!.status !== 'requested') fail(409, 'This consult is already scheduled or completed.');
    const input = z.object({ scheduledAt: dateSchema }).parse(req.body);
    if (Date.parse(input.scheduledAt) <= Date.now()) fail(400, 'Choose a future appointment time.');
    await db.update('consults', c!.id, {
      status: 'scheduled',
      scheduledAt: input.scheduledAt,
      doctorId: a.id,
      doctorName: a.name,
    });
    await audit(a.id, c!.memberId, 'accept', 'consults', c!.id, req.ip);
    return { ok: true };
  });
  app.post('/api/consults/:id/sign', async (req) => {
    const a = roles(req, 'doctor');
    const { note } = z.object({ note: text }).parse(req.body);
    return db.transaction(async () => {
      const c = await db.get('consults', (req.params as any).id);
      if (!c) fail(404, 'Consult not found');
      if (c!.doctorId !== a.id) fail(403, 'Only the assigned doctor can sign this consult.');
      if (c!.signedAt || c!.status !== 'scheduled')
        fail(409, 'Only an unsigned, scheduled consult can be completed.');
      await db.update('consults', c!.id, { note, signedAt: now(), status: 'completed' });
      if (c!.mode === 'home') {
        const visit = (await db.list('home_visits', c!.memberId!)).find(
          (v) => v.consultId === c!.id,
        );
        if (visit) {
          await db.update('home_visits', visit.id, { status: 'completed', findings: note });
          await db.update('invoices', visit.invoiceId, { status: 'due', dueAt: now() });
        }
      }
      await audit(a.id, c!.memberId, 'sign', 'consults', c!.id, req.ip);
      return { ok: true };
    });
  });
  app.post('/api/vitals/:id/review', async (req) => {
    const a = roles(req, 'doctor', 'nurse');
    const v = await db.get('vitals', (req.params as any).id);
    if (!v) fail(404, 'Reading not found');
    const { note, escalate } = z.object({ note: text, escalate: z.boolean() }).parse(req.body);
    await db.transaction(async () => {
      await db.update('vitals', v!.id, { reviewedAt: now(), reviewedBy: a.id });
      await db.insert(
        'nurse_notes',
        { type: 'review', note, author: a.name, nurseId: a.id, vitalId: v!.id },
        v!.memberId,
      );
      if (escalate)
        await db.insert(
          'consults',
          {
            mode: 'virtual',
            reason: 'Clinician review requested following vitals check',
            urgency: 'soon',
            status: 'requested',
            requestedAt: now(),
            note: '',
            signedAt: null,
          },
          v!.memberId,
        );
      await audit(a.id, v!.memberId, escalate ? 'escalate' : 'review', 'vitals', v!.id, req.ip);
    });
    return { ok: true };
  });
  app.post('/api/members/:memberId/documents', async (req) => {
    const mid = (req.params as any).memberId;
    await access(req, mid, ['nurse']);
    await requireConsent(mid, 'care');
    const input = z
      .object({
        name: z.string().min(1).max(200),
        mime: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
        fileBase64: z.string().max(14 * 1024 * 1024),
        type: z.enum([
          'script',
          'pathology',
          'radiology',
          'discharge',
          'specialist',
          'vaccination',
          'other',
        ]),
        documentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(req.body);
    const bytes = Buffer.from(input.fileBase64, 'base64');
    if (bytes.length > 10 * 1024 * 1024 || bytes.length < 8)
      fail(400, 'Choose a file up to 10 MB.');
    const valid =
      input.mime === 'application/pdf'
        ? bytes.subarray(0, 5).toString() === '%PDF-'
        : input.mime === 'image/png'
          ? bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!valid) fail(400, 'File content does not match its type.');
    const d = await db.insert(
      'documents',
      {
        ...input,
        status: 'pending_verification',
        ocrStatus: 'not_configured',
        extractedText: '',
        tags: [],
        hasFile: true,
      },
      mid,
    );
    await audit(actor(req).id, mid, 'upload', 'documents', d.id, req.ip);
    return { id: d.id, status: d.status };
  });
  app.get('/api/documents/:id/file', async (req, reply) => {
    const d = await db.get('documents', (req.params as any).id);
    if (!d) fail(404, 'Document not found');
    await access(
      req,
      d!.memberId!,
      d!.status === 'pending_verification' ? ['nurse', 'doctor', 'admin'] : ['nurse', 'doctor'],
    );
    if (!d!.fileBase64) fail(404, 'This is a sample record without a file.');
    await audit(actor(req).id, d!.memberId, 'download', 'documents', d!.id, req.ip);
    reply
      .header('Content-Type', d!.mime)
      .header(
        'Content-Disposition',
        `attachment; filename="${d!.name.replace(/[^a-zA-Z0-9. _-]/g, '_')}"`,
      );
    return Buffer.from(d!.fileBase64, 'base64');
  });
  app.post('/api/documents/:id/verify', async (req) => {
    const a = roles(req, 'nurse', 'admin');
    const d = await db.get('documents', (req.params as any).id);
    if (!d) fail(404, 'Document not found');
    const input = z
      .object({
        extractedText: z.string().max(30000),
        tags: z.array(z.string().max(60)).max(10),
        documentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(req.body);
    await db.update('documents', d!.id, {
      ...input,
      status: 'verified',
      verifiedBy: a.id,
      verifiedAt: now(),
    });
    await audit(a.id, d!.memberId, 'verify', 'documents', d!.id, req.ip);
    return { ok: true };
  });
  app.post('/api/members/:memberId/family', async (req) => {
    const a = roles(req, 'member');
    const mid = (req.params as any).memberId;
    await access(req, mid, []);
    const input = z
      .object({
        name: z.string().min(2).max(100),
        email: emailSchema,
        scope: z.enum(['summary', 'summary_updates']),
        consultNotes: z.boolean(),
        emergency: z.boolean(),
      })
      .parse(req.body);
    return db.transaction(async () => {
      const current = (await db.list('family_viewers', mid)).filter((f) => !f.revokedAt);
      if (current.length >= 3) fail(409, 'You can nominate up to three family viewers.');
      if (current.some((f) => f.email === input.email))
        fail(409, 'This person already has access.');
      let user = (await db.list('users')).find((u) => u.email === input.email);
      if (user && user.role !== 'family')
        fail(409, 'This email belongs to a different account role.');
      if (!user)
        user = await db.insert('users', { name: input.name, email: input.email, role: 'family' });
      const grant = await db.insert(
        'family_viewers',
        { ...input, userId: user.id, grantedAt: now(), revokedAt: null },
        mid,
      );
      await audit(a.id, mid, 'grant', 'family_viewers', grant.id, req.ip);
      return { ok: true, message: 'Access granted. No invitation was sent in this local demo.' };
    });
  });
  app.delete('/api/family/:id', async (req) => {
    roles(req, 'member');
    const f = await db.get('family_viewers', (req.params as any).id);
    if (!f) fail(404, 'Family grant not found');
    await access(req, f!.memberId!, []);
    await db.update('family_viewers', f!.id, { revokedAt: now() });
    await audit(actor(req).id, f!.memberId, 'revoke', 'family_viewers', f!.id, req.ip);
    return { ok: true };
  });
  app.patch('/api/members/:memberId/consents', async (req) => {
    roles(req, 'member');
    const mid = (req.params as any).memberId;
    await access(req, mid, []);
    const { type, granted } = z
      .object({ type: z.enum(['care', 'communications', 'delivery']), granted: z.boolean() })
      .parse(req.body);
    await db.transaction(async () => {
      for (const c of (await db.list('consents', mid)).filter(
        (c) => c.type === type && !c.revokedAt,
      ))
        await db.update('consents', c.id, { revokedAt: now() });
      if (granted)
        await db.insert(
          'consents',
          {
            type,
            version: CONSENT_VERSION,
            text: CONSENT_TEXT[type],
            grantedAt: now(),
            revokedAt: null,
            grantedBy: actor(req).id,
          },
          mid,
        );
      await audit(actor(req).id, mid, granted ? 'grant' : 'revoke', 'consents', type, req.ip);
    });
    return { ok: true };
  });
  app.post('/api/members/:memberId/membership', async (req) => {
    const a = actor(req);
    const mid = (req.params as any).memberId;
    await access(req, mid, ['admin']);
    const { tier, paymentMethod } = z
      .object({ tier: tierSchema, paymentMethod: z.enum(['card', 'debit_order']) })
      .parse(req.body);
    return db.transaction(async () => {
      const sub = (await db.list('subscriptions', mid))[0];
      if (sub?.status === 'active') {
        await db.update('subscriptions', sub.id, {
          pendingTier: tier,
          pendingAmount: TIERS[tier].amount,
          paymentMethod,
        });
      } else if (sub) {
        await db.update('subscriptions', sub.id, {
          tier,
          amount: TIERS[tier].amount,
          paymentMethod,
        });
        for (const inv of (await db.list('invoices', mid)).filter(
          (i) => i.type === 'retainer' && i.status === 'due',
        ))
          await db.update('invoices', inv.id, {
            amount: TIERS[tier].amount,
            description: `${TIERS[tier].name} membership`,
          });
        await db.update('members', mid, { tier });
      } else fail(404, 'Subscription not found');
      await audit(a.id, mid, 'change_plan', 'subscriptions', sub!.id, req.ip);
      return { ok: true, effective: sub!.status === 'active' ? 'next billing date' : 'now' };
    });
  });
  app.post('/api/members/:memberId/cancel-membership', async (req) => {
    const mid = (req.params as any).memberId;
    await access(req, mid, ['admin']);
    const sub = (await db.list('subscriptions', mid))[0];
    if (!sub) fail(404, 'Subscription not found');
    if (sub!.cancelledAt) return { ok: true, effectiveAt: sub!.cancelledAt };
    const effectiveAt = addBusinessDays(new Date(), 20).toISOString();
    await db.update('subscriptions', sub!.id, {
      cancelRequestedAt: now(),
      cancelledAt: effectiveAt,
    });
    await audit(actor(req).id, mid, 'request_cancellation', 'subscriptions', sub!.id, req.ip);
    return { ok: true, effectiveAt };
  });
  app.post('/api/invoices/:id/pay-test', async (req) => {
    if (!demo) fail(404, 'Not found');
    const iid = (req.params as any).id;
    return db.transaction(async () => {
      const inv = await db.get('invoices', iid);
      if (!inv) fail(404, 'Invoice not found');
      await access(req, inv!.memberId!, ['admin']);
      if (inv!.status === 'paid') return { ok: true, alreadyPaid: true };
      if (inv!.status !== 'due')
        fail(409, 'This invoice cannot be paid before the visit is completed.');
      await db.update('invoices', iid, { status: 'paid', paidAt: now(), test: true });
      await db.insert(
        'payment_events',
        {
          invoiceId: iid,
          amount: inv!.amount,
          status: 'succeeded',
          provider: 'local_test',
          eventId: `test-${iid}`,
        },
        inv!.memberId,
      );
      if (inv!.type === 'retainer') {
        const sub = (await db.list('subscriptions', inv!.memberId!))[0];
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        if (sub)
          await db.update('subscriptions', sub.id, {
            status: 'active',
            startedAt: sub.startedAt || now(),
            nextBillingAt: d.toISOString(),
            paymentMethod: sub.paymentMethod || 'card',
          });
        await db.update('members', inv!.memberId!, { status: 'active' });
      }
      await audit(actor(req).id, inv!.memberId, 'test_payment', 'invoices', iid, req.ip);
      return { ok: true, test: true, message: 'Test payment recorded. No money was charged.' };
    });
  });
  app.post('/api/reminders/:id/acknowledge', async (req) => {
    const r = await db.get('reminders', (req.params as any).id);
    if (!r) fail(404, 'Reminder not found');
    await access(req, r!.memberId!, []);
    await db.update('reminders', r!.id, { acknowledgedAt: now() });
    await audit(actor(req).id, r!.memberId, 'acknowledge', 'reminders', r!.id, req.ip);
    return { ok: true };
  });
  app.get('/api/members/:memberId/emergency', async (req) => {
    const mid = (req.params as any).memberId;
    const a = actor(req);
    let m;
    if (a.role === 'family') {
      const grant = (await db.list('family_viewers', mid)).find(
        (g) => g.userId === a.id && !g.revokedAt && g.emergency,
      );
      if (!grant) fail(403, 'Emergency-summary access is not granted.');
      m = await db.get('members', mid);
    } else m = await access(req, mid, ['doctor', 'nurse']);
    await audit(a.id, mid, 'view', 'emergency_summary', mid, req.ip);
    return summary(m!);
  });
  app.post('/api/members/:memberId/emergency-share', async (req) => {
    roles(req, 'member');
    const mid = (req.params as any).memberId;
    await access(req, mid, []);
    const token = randomBytes(24).toString('hex');
    const code = String(100000 + (randomBytes(4).readUInt32BE() % 900000));
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    await db.insert(
      'emergency_shares',
      { tokenHash: hash(token), codeHash: hash(code), expiresAt, usedAt: null, attempts: 0 },
      mid,
    );
    await audit(actor(req).id, mid, 'create_share', 'emergency_summary', mid, req.ip);
    return { token, code, expiresAt };
  });
  app.post('/api/emergency/redeem', async (req) => {
    const { token, code } = z
      .object({ token: z.string().length(48), code: z.string().regex(/^\d{6}$/) })
      .parse(req.body);
    const result = await db.transaction(async () => {
      const s = (await db.list('emergency_shares')).find((s) => s.tokenHash === hash(token));
      if (!s || s.usedAt || s.attempts >= 5 || Date.parse(s.expiresAt) < Date.now()) return null;
      await db.update('emergency_shares', s.id, { attempts: s.attempts + 1 });
      if (s.codeHash !== hash(code)) return null;
      await db.update('emergency_shares', s.id, { usedAt: now() });
      const m = await db.get('members', s.memberId!);
      await audit('emergency_share', s.memberId, 'redeem', 'emergency_summary', s.id, req.ip);
      return summary(m!);
    });
    if (!result) fail(401, 'This link or code is invalid, expired, or already used.');
    return result;
  });
  app.get('/api/members/:memberId/export', async (req, reply) => {
    roles(req, 'member');
    const mid = (req.params as any).memberId;
    const member = await access(req, mid, []);
    const out: any = { member, exportedAt: now() };
    for (const t of [
      'vitals',
      'consents',
      'consults',
      'medication_events',
      'documents',
      'nurse_notes',
      'invoices',
      'family_viewers',
      'audit_log',
    ] as Table[])
      out[t] = await db.list(t, mid);
    await audit(actor(req).id, mid, 'export', 'members', mid, req.ip);
    reply.header('Content-Disposition', 'attachment; filename="my-health-vault.json"');
    return out;
  });
  app.post('/api/members/:memberId/privacy-request', async (req) => {
    roles(req, 'member');
    const mid = (req.params as any).memberId;
    await access(req, mid, []);
    const { reason } = z.object({ reason: text }).parse(req.body);
    const r = await db.insert(
      'privacy_requests',
      { type: 'deletion', reason, status: 'pending_review', requestedAt: now() },
      mid,
    );
    await audit(actor(req).id, mid, 'request_deletion', 'privacy_requests', r.id, req.ip);
    return {
      ok: true,
      message:
        'Request recorded for the information officer. Your records have not yet been deleted.',
    };
  });
  app.get('/api/staff/overview', async (req) => {
    const a = roles(req, 'doctor', 'nurse', 'admin', 'pharmacy', 'driver');
    await audit(a.id, null, 'view', 'staff_dashboard', 'overview', req.ip);
    const members = await db.list('members');
    const safeMembers = members.map((m) => ({
      id: m.id,
      name: m.name,
      tier: m.tier,
      status: m.status,
      coordinator: m.coordinator,
      email: m.email,
    }));
    const orders = await db.list('orders');
    if (a.role === 'driver')
      return {
        orders: orders
          .filter((o) => o.driverId === a.id)
          .map((o) => ({
            id: o.id,
            memberId: o.memberId,
            name: members.find((m) => m.id === o.memberId)?.name,
            status: o.status,
            address: o.address,
            pharmacy: o.pharmacy,
            requiresId: o.items?.some((i: any) => [5, 6].includes(i.scheduleClass)),
            requiresTemperature: o.items?.some((i: any) => i.coldChain),
            events: o.events,
          })),
        deliveries: (await db.list('deliveries')).filter((d) => d.driverId === a.id),
      };
    if (a.role === 'pharmacy')
      return {
        orders: orders.map((o) => ({ ...o, name: members.find((m) => m.id === o.memberId)?.name })),
        scripts: await db.list('scripts'),
      };
    const out: any = {
      members: safeMembers,
      clinics: await db.list('clinic_sessions'),
      villages: await db.list('villages'),
    };
    if (a.role === 'admin') {
      out.invoices = await db.list('invoices');
      out.subscriptions = await db.list('subscriptions');
      out.privacyRequests = await db.list('privacy_requests');
      out.audit = (await db.list('audit_log')).slice(0, 200);
      out.orders = orders.map(({ items, ...o }) => o);
      out.documents = (await db.list('documents'))
        .filter((d) => d.status === 'pending_verification')
        .map(({ fileBase64, ...d }) => d);
    } else {
      out.vitals = await db.list('vitals');
      out.consults = await db.list('consults');
      out.orders = orders;
      out.documents = (await db.list('documents'))
        .filter((d) => d.status === 'pending_verification')
        .map(({ fileBase64, ...d }) => d);
      out.missed = members
        .filter((m) => ['monitor', 'concierge'].includes(m.tier) && m.status === 'active')
        .filter(
          (m) =>
            !out.vitals.some(
              (v: Row) => v.memberId === m.id && Date.parse(v.takenAt) > Date.now() - 2 * 86400000,
            ),
        )
        .map((m) => ({
          memberId: m.id,
          name: m.name,
          reason: 'No readings recorded in the past two days',
        }));
    }
    return out;
  });
  app.post('/api/orders/:id/advance', async (req) => {
    const a = roles(req, 'pharmacy', 'driver', 'admin');
    const { status, recipientName, idChecked, temperature, proofNote } = z
      .object({
        status: z.enum(['dispensing', 'ready', 'collected', 'delivered', 'failed']),
        recipientName: z.string().max(100).optional(),
        idChecked: z.boolean().optional(),
        temperature: z.number().optional(),
        proofNote: z.string().max(500).optional(),
      })
      .parse(req.body);
    return db.transaction(async () => {
      const order = await db.get('orders', (req.params as any).id);
      if (!order) fail(404, 'Order not found');
      const transitions: Record<string, string[]> = {
        sent: ['dispensing'],
        dispensing: ['ready'],
        ready: ['collected'],
        collected: ['delivered', 'failed'],
        failed: [],
        delivered: [],
      };
      if (!transitions[order!.status]?.includes(status))
        fail(409, 'This order has moved on. Refresh the queue.');
      if (['dispensing', 'ready'].includes(status) && a.role !== 'pharmacy')
        fail(403, 'Only the pharmacy can confirm dispensing.');
      if (
        ['collected', 'delivered', 'failed'].includes(status) &&
        (a.role !== 'driver' || order!.driverId !== a.id)
      )
        fail(403, 'Only the assigned driver can update delivery.');
      if (status === 'delivered') {
        if (!recipientName?.trim()) fail(400, 'Enter the recipient name.');
        if (order!.items?.some((i: any) => [5, 6].includes(i.scheduleClass)) && !idChecked)
          fail(400, 'An ID check is required.');
        if (order!.items?.some((i: any) => i.coldChain) && temperature === undefined)
          fail(400, 'A cold-chain temperature is required.');
        await db.insert(
          'deliveries',
          {
            orderId: order!.id,
            driverId: a.id,
            recipientName,
            deliveredAt: now(),
            idChecked,
            temperature,
            proofNote,
            proofType: 'demo_name_confirmation',
            signatureUrl: null,
            photoUrl: null,
          },
          order!.memberId,
        );
        for (const item of order!.items || [])
          await db.insert(
            'medication_events',
            {
              ...item,
              dispensedAt: now(),
              source: 'delivery',
              status: 'current',
              pharmacy: order!.pharmacy,
              orderId: order!.id,
            },
            order!.memberId,
          );
      }
      await db.update('orders', order!.id, {
        status,
        events: [...(order!.events || []), { status, at: now() }],
        ...(status === 'delivered' ? { deliveredAt: now() } : {}),
      });
      await audit(a.id, order!.memberId, status, 'orders', order!.id, req.ip);
      return { ok: true };
    });
  });
  app.get('/api/audit/:memberId', async (req) => {
    const mid = (req.params as any).memberId;
    await access(req, mid, ['admin']);
    await audit(actor(req).id, mid, 'view', 'audit_log', mid, req.ip);
    return (await db.list('audit_log', mid)).slice(0, 200);
  });
  const webRoot = options.webRoot || resolve('dist');
  app.get('/*', async (req, reply) => {
    const path = req.url.split('?')[0];
    if (path.startsWith('/api/')) fail(404, 'Endpoint not found.');
    const names: Record<string, string> = {
      '/app.js': 'text/javascript',
      '/app.css': 'text/css',
      '/manifest.webmanifest': 'application/manifest+json',
    };
    const file = names[path] ? path.slice(1) : 'index.html';
    const target = resolve(webRoot, file);
    if (!existsSync(target))
      return reply.code(503).type('text/plain').send('Build the web app first: npm run build');
    reply.type(names[path] || 'text/html');
    return readFileSync(target);
  });
  app.addHook('onClose', () => db.close());
  return { app, db };
}
