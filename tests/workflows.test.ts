import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../apps/api/src/app.ts';
import { processBilling } from '../apps/api/src/billing.ts';
import {
  addBusinessDays,
  distanceKm,
  DURBAN,
  TIERS,
  HOME_VISIT_FEE,
} from '../packages/core/domain.ts';
let context: Awaited<ReturnType<typeof createApp>>, dir: string;
const headers = { 'x-wellness-client': 'app' };
async function login(role = 'member') {
  const r = await context.app.inject({
    method: 'POST',
    url: '/api/demo/login',
    headers,
    payload: { role },
  });
  assert.equal(r.statusCode, 200);
  return r.cookies.find((c) => c.name === 'pw_session')!.value;
}
async function call(method: any, url: string, cookie?: string, payload?: any) {
  const r = await context.app.inject({
    method,
    url,
    headers: { ...headers, ...(cookie ? { cookie: `pw_session=${cookie}` } : {}) },
    ...(payload === undefined ? {} : { payload }),
  });
  return { status: r.statusCode, data: r.json(), response: r };
}
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'wellness-tests-'));
  context = await createApp({ dbPath: join(dir, 'test.sqlite'), demo: true });
});
after(async () => {
  await context.app.close();
  await rm(dir, { recursive: true, force: true });
});

test('fixed commercials are represented in cents, including home visits', () => {
  assert.deepEqual(
    Object.values(TIERS).map((t) => t.amount),
    [99500, 170000, 265000],
  );
  assert.equal(HOME_VISIT_FEE, 185000);
});
test('service area and business-day notice exclude weekends and observed holidays', () => {
  assert.ok(distanceKm(DURBAN, { lat: -29.82, lng: 31.01 }) < 20);
  assert.ok(distanceKm(DURBAN, { lat: -26.2, lng: 28.04 }) > 20);
  assert.equal(
    addBusinessDays(new Date('2026-12-24T10:00:00Z'), 1).toISOString().slice(0, 10),
    '2026-12-28',
  );
  assert.equal(
    addBusinessDays(new Date('2026-08-07T10:00:00Z'), 1).toISOString().slice(0, 10),
    '2026-08-11',
  );
});
test('unauthenticated records, cross-origin mutations and missing client header are rejected', async () => {
  assert.equal((await call('GET', '/api/portal')).status, 401);
  const r = await context.app.inject({
    method: 'POST',
    url: '/api/demo/login',
    headers: { ...headers, origin: 'https://other.example' },
    payload: { role: 'doctor' },
  });
  assert.equal(r.statusCode, 403);
  const q = await context.app.inject({
    method: 'POST',
    url: '/api/demo/login',
    payload: { role: 'doctor' },
  });
  assert.equal(q.statusCode, 403);
});
test('member reads are logged, clinical payload is encrypted, audit is immutable', async () => {
  const cookie = await login();
  const r = await call('GET', '/api/portal', cookie);
  assert.equal(r.status, 200);
  assert.equal(r.data.member.name, 'Nomsa Dlamini');
  const audit = await context.db.list('audit_log', 'member-demo');
  assert.ok(audit.some((a) => a.action === 'view' && a.actorId === 'user-member'));
  const raw = await context.db.query('SELECT payload FROM members WHERE id=?', ['member-demo']);
  assert.ok(!raw[0].payload.includes('Nomsa'));
  await assert.rejects(
    context.db.query('DELETE FROM audit_log WHERE id=?', [audit[0].id]),
    /immutable/,
  );
});
test('role boundaries protect clinical data and billing actions', async () => {
  const member = await login(),
    nurse = await login('nurse'),
    admin = await login('admin'),
    driver = await login('driver');
  assert.equal((await call('GET', '/api/staff/overview', member)).status, 403);
  assert.equal((await call('GET', '/api/portal?memberId=member-demo', driver)).status, 403);
  const a = await call('GET', '/api/portal?memberId=member-demo', admin);
  assert.equal(a.data.vitals, undefined);
  assert.equal(a.data.member.conditions, undefined);
  assert.equal(
    (
      await call('POST', '/api/members/member-demo/membership', nurse, {
        tier: 'concierge',
        paymentMethod: 'card',
      })
    ).status,
    403,
  );
  assert.equal(
    (await call('PATCH', '/api/members/member-demo/profile', member, { role: 'admin' })).status,
    400,
  );
});
test('signup enforces consent, radius, OTP expiry and one-time use; creates empty vault', async () => {
  const input = {
    name: 'Test Member',
    email: 'new-member@example.test',
    phone: '+27821234567',
    address: '1 Test Road, Durban',
    geo: DURBAN,
    tier: 'connect',
    consents: { care: true, communications: false, delivery: true },
  };
  assert.equal(
    (
      await call('POST', '/api/auth/register', undefined, {
        ...input,
        consents: { ...input.consents, care: false },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call('POST', '/api/auth/register', undefined, {
        ...input,
        geo: { lat: -26.2, lng: 28.04 },
      })
    ).status,
    422,
  );
  const c = await call('POST', '/api/auth/register', undefined, input);
  assert.equal(c.status, 200);
  const bad = await call('POST', '/api/auth/verify', undefined, {
    challengeId: c.data.challengeId,
    code: '000000',
  });
  assert.equal(bad.status, 401);
  assert.equal((await context.db.get('otp_challenges', c.data.challengeId))?.attempts, 1);
  const v = await call('POST', '/api/auth/verify', undefined, {
    challengeId: c.data.challengeId,
    code: c.data.demoOtp,
  });
  assert.equal(v.status, 200);
  const cookie = v.response.cookies[0].value;
  const portal = await call('GET', '/api/portal', cookie);
  assert.equal(portal.data.vitals.length, 0);
  assert.equal(portal.data.documents.length, 0);
  assert.equal(portal.data.consents.length, 2);
  assert.equal(portal.data.invoices[0].amount, 99500);
  assert.equal(
    (
      await call('POST', '/api/auth/verify', undefined, {
        challengeId: c.data.challengeId,
        code: c.data.demoOtp,
      })
    ).status,
    401,
  );
  assert.equal(
    (await call('GET', '/api/portal?memberId=member-demo', cookie)).data.member.name,
    'Test Member',
  );
  assert.equal(
    (
      await call('POST', '/api/members/member-demo/vitals', cookie, {
        type: 'heart_rate',
        value: 70,
        takenAt: new Date().toISOString(),
      })
    ).status,
    403,
  );
});
test('OTP is locked after five attempts and expiry is enforced', async () => {
  const c = await call('POST', '/api/auth/request-otp', undefined, {
    email: 'nomsa@example.test',
    portal: 'member',
  });
  for (let i = 0; i < 5; i++)
    assert.equal(
      (
        await call('POST', '/api/auth/verify', undefined, {
          challengeId: c.data.challengeId,
          code: '000000',
        })
      ).status,
      401,
    );
  assert.equal(
    (
      await call('POST', '/api/auth/verify', undefined, {
        challengeId: c.data.challengeId,
        code: c.data.demoOtp,
      })
    ).status,
    401,
  );
  const e = await call('POST', '/api/auth/request-otp', undefined, {
    email: 'nomsa@example.test',
    portal: 'member',
  });
  await context.db.update('otp_challenges', e.data.challengeId, {
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  });
  assert.equal(
    (
      await call('POST', '/api/auth/verify', undefined, {
        challengeId: e.data.challengeId,
        code: e.data.demoOtp,
      })
    ).status,
    401,
  );
});
test('readings use clinician thresholds, review records a note and escalation creates consult', async () => {
  const cookie = await login();
  const r = await call('POST', '/api/members/member-demo/vitals', cookie, {
    type: 'blood_pressure',
    value: 151,
    secondary: 95,
    takenAt: new Date().toISOString(),
    source: 'manual',
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.flagged, true);
  assert.equal(
    (await call('POST', `/api/vitals/${r.data.id}/review`, cookie, { note: 'No', escalate: false }))
      .status,
    403,
  );
  const nurse = await login('nurse');
  const review = await call('POST', `/api/vitals/${r.data.id}/review`, nurse, {
    note: 'Fictional test review; escalated for clinician attention.',
    escalate: true,
  });
  assert.equal(review.status, 200);
  assert.ok((await context.db.get('vitals', r.data.id))?.reviewedAt);
  assert.ok(
    (await context.db.list('consults', 'member-demo')).some((c) =>
      c.reason.includes('Clinician review'),
    ),
  );
  assert.equal(
    (
      await call('POST', '/api/members/member-demo/vitals', cookie, {
        type: 'blood_pressure',
        value: 70,
        secondary: 90,
        takenAt: new Date().toISOString(),
      })
    ).status,
    400,
  );
});
test('home visit invoice charges only after assigned doctor signs; signing and payment are idempotent', async () => {
  const member = await login(),
    doctor = await login('doctor');
  const c = await call('POST', '/api/members/member-demo/consults', member, {
    reason: 'Test home assessment',
    mode: 'home',
    urgency: 'routine',
    feeAccepted: true,
  });
  assert.equal(c.status, 200);
  let invoice = (await context.db.list('invoices', 'member-demo')).find(
    (i) => i.consultId === c.data.id,
  )!;
  assert.equal(invoice.amount, 185000);
  assert.equal(invoice.status, 'awaiting_completion');
  assert.equal(
    (await call('POST', `/api/invoices/${invoice.id}/pay-test`, member, {})).status,
    409,
  );
  assert.equal(
    (
      await call('POST', `/api/consults/${c.data.id}/accept`, doctor, {
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call('POST', `/api/consults/${c.data.id}/sign`, doctor, {
        note: 'Fictional home visit findings.',
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call('POST', `/api/consults/${c.data.id}/sign`, doctor, {
        note: 'Attempt to replace signed note.',
      })
    ).status,
    409,
  );
  invoice = (await context.db.get('invoices', invoice.id))!;
  assert.equal(invoice.status, 'due');
  const payments = await Promise.all([
    call('POST', `/api/invoices/${invoice.id}/pay-test`, member, {}),
    call('POST', `/api/invoices/${invoice.id}/pay-test`, member, {}),
  ]);
  assert.ok(payments.every((p) => p.status === 200));
  assert.equal(
    (await context.db.list('payment_events', 'member-demo')).filter(
      (p) => p.invoiceId === invoice.id,
    ).length,
    1,
  );
});
test('tier changes retain fixed amounts and are scheduled for the next billing date', async () => {
  const member = await login();
  assert.equal(
    (
      await call('POST', '/api/members/member-demo/membership', member, {
        tier: 'concierge',
        paymentMethod: 'debit_order',
        amount: 1,
      })
    ).status,
    200,
  );
  const sub = (await context.db.list('subscriptions', 'member-demo'))[0];
  assert.equal(sub.amount, 170000);
  assert.equal(sub.pendingAmount, 265000);
  assert.equal(sub.pendingTier, 'concierge');
});
test('family scopes omit consult notes and are checked again after revocation', async () => {
  const family = await login('family'),
    member = await login();
  const p = await call('GET', '/api/portal', family);
  assert.equal(p.status, 200);
  assert.equal(p.data.consults.length, 0);
  assert.equal(p.data.invoices, undefined);
  assert.equal(
    (
      await call('POST', '/api/members/member-demo/vitals', family, {
        type: 'heart_rate',
        value: 70,
        takenAt: new Date().toISOString(),
      })
    ).status,
    403,
  );
  const grant = (await context.db.list('family_viewers', 'member-demo'))[0];
  assert.equal((await call('DELETE', `/api/family/${grant.id}`, member)).status, 200);
  assert.equal((await call('GET', '/api/portal', family)).status, 404);
  assert.equal((await call('GET', '/api/members/member-demo/emergency', family)).status, 403);
});
test('emergency summary links expire and are redeemed only once, including concurrency', async () => {
  const member = await login();
  const share = await call('POST', '/api/members/member-demo/emergency-share', member, {});
  const [a, b] = await Promise.all([
    call('POST', '/api/emergency/redeem', undefined, share.data),
    call('POST', '/api/emergency/redeem', undefined, share.data),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 401]);
  const success = a.status === 200 ? a : b;
  assert.equal(success.data.name, 'Nomsa Dlamini');
  assert.equal(success.data.vitals.length, 3);
  const share2 = await call('POST', '/api/members/member-demo/emergency-share', member, {});
  const record = (await context.db.list('emergency_shares', 'member-demo')).find((s) => !s.usedAt)!;
  await context.db.update('emergency_shares', record.id, {
    expiresAt: new Date(Date.now() - 1).toISOString(),
  });
  assert.equal((await call('POST', '/api/emergency/redeem', undefined, share2.data)).status, 401);
});
test('documents validate file bytes, require verification, and deny unrelated roles', async () => {
  const member = await login(),
    nurse = await login('nurse'),
    driver = await login('driver');
  const file = {
    name: 'test.pdf',
    mime: 'application/pdf',
    fileBase64: Buffer.from('%PDF-1.4\nFictional sample').toString('base64'),
    type: 'pathology',
    documentDate: '2026-10-14',
  };
  assert.equal(
    (
      await call('POST', '/api/members/member-demo/documents', member, {
        ...file,
        fileBase64: Buffer.from('not a pdf').toString('base64'),
      })
    ).status,
    400,
  );
  const d = await call('POST', '/api/members/member-demo/documents', member, file);
  assert.equal(d.status, 200);
  assert.equal(d.data.status, 'pending_verification');
  assert.equal((await call('GET', `/api/documents/${d.data.id}/file`, driver)).status, 403);
  assert.equal(
    (
      await call('POST', `/api/documents/${d.data.id}/verify`, nurse, {
        extractedText: 'Verified sample only.',
        tags: ['test'],
        documentDate: '2026-10-14',
      })
    ).status,
    200,
  );
  assert.equal((await context.db.get('documents', d.data.id))?.status, 'verified');
});
test('delivery state transitions and driver assignment are enforced; medications update once', async () => {
  const member = await login(),
    driver = await login('driver');
  assert.equal(
    (await call('POST', '/api/orders/order-demo/advance', member, { status: 'collected' })).status,
    403,
  );
  assert.equal(
    (
      await call('POST', '/api/orders/order-demo/advance', driver, {
        status: 'delivered',
        recipientName: 'Demo Recipient',
      })
    ).status,
    409,
  );
  assert.equal(
    (await call('POST', '/api/orders/order-demo/advance', driver, { status: 'collected' })).status,
    200,
  );
  assert.equal(
    (
      await call('POST', '/api/orders/order-demo/advance', driver, {
        status: 'delivered',
        recipientName: 'Demo Recipient',
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call('POST', '/api/orders/order-demo/advance', driver, {
        status: 'delivered',
        recipientName: 'Demo Recipient',
      })
    ).status,
    409,
  );
  assert.equal(
    (await context.db.list('medication_events', 'member-demo')).filter(
      (m) => m.orderId === 'order-demo',
    ).length,
    1,
  );
});
test('privacy requests are recorded without claiming records are deleted', async () => {
  const member = await login();
  const r = await call('POST', '/api/members/member-demo/privacy-request', member, {
    reason: 'Test of deletion review flow.',
  });
  assert.equal(r.status, 200);
  assert.match(r.data.message, /not yet been deleted/);
  assert.ok(await context.db.get('members', 'member-demo'));
});
test('logout invalidates the session', async () => {
  const member = await login();
  assert.equal((await call('POST', '/api/auth/logout', member, {})).status, 200);
  assert.equal((await call('GET', '/api/portal', member)).status, 401);
});

test('native bearer sessions work and are revoked on logout', async () => {
  const signIn = await context.app.inject({
    method: 'POST',
    url: '/api/demo/login',
    headers,
    payload: { role: 'member', native: true },
  });
  assert.equal(signIn.statusCode, 200);
  const nativeHeaders = { ...headers, authorization: `Bearer ${signIn.json().token}` };
  assert.equal(
    (await context.app.inject({ url: '/api/portal', headers: nativeHeaders })).statusCode,
    200,
  );
  await context.app.inject({
    method: 'POST',
    url: '/api/auth/logout',
    headers: nativeHeaders,
    payload: {},
  });
  assert.equal(
    (await context.app.inject({ url: '/api/portal', headers: nativeHeaders })).statusCode,
    401,
  );
});

test('withdrawing care consent blocks new readings and preserves past records', async () => {
  const cookie = await login();
  assert.equal(
    (
      await call('PATCH', '/api/members/member-demo/consents', cookie, {
        type: 'care',
        granted: false,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call('POST', '/api/members/member-demo/vitals', cookie, {
        type: 'heart_rate',
        value: 72,
        takenAt: new Date().toISOString(),
      })
    ).status,
    409,
  );
  assert.equal((await call('GET', '/api/portal', cookie)).status, 200);
  await call('PATCH', '/api/members/member-demo/consents', cookie, { type: 'care', granted: true });
});

test('monthly billing applies the fixed pending price once and honours cancellation', async () => {
  const due = '2026-11-01T06:00:00.000Z';
  await context.db.update('subscriptions', 'subscription-demo', {
    status: 'active',
    nextBillingAt: due,
    pendingTier: 'connect',
    pendingAmount: 1,
    cancelledAt: null,
    billingDay: 1,
  });
  await Promise.all([
    processBilling(context.db, new Date(due)),
    processBilling(context.db, new Date(due)),
  ]);
  const invoices = (await context.db.list('invoices', 'member-demo')).filter(
    (i) => i.id === 'retainer-subscription-demo-2026-11-01',
  );
  assert.equal(invoices.length, 1);
  assert.equal(invoices[0].amount, 99500);
  assert.equal(
    (await context.db.get('subscriptions', 'subscription-demo'))!.nextBillingAt,
    '2026-12-01T06:00:00.000Z',
  );
  await context.db.update('subscriptions', 'subscription-demo', {
    cancelledAt: '2026-11-15T06:00:00.000Z',
  });
  const result = await processBilling(context.db, new Date('2026-12-01T06:00:00.000Z'));
  assert.equal(result.cancellationsApplied, 1);
  assert.equal(result.invoicesCreated, 0);
});
test('production startup is blocked before any demo or unconfigured integration can run', async () => {
  const prior = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await assert.rejects(createApp({ demo: true }), /Demo authentication/);
    await assert.rejects(createApp({ demo: false }), /PostgreSQL/);
  } finally {
    process.env.NODE_ENV = prior;
  }
});
