import sample from '../../../fixtures/demo.json' with { type: 'json' };
import { TIERS, HOME_VISIT_FEE, type Tier } from '../../../packages/core/domain.ts';
type Data = Record<string, any>;
const fixture: Data = structuredClone(sample);
let role = 'member';
let signedIn = true;
const roles = fixture.roles;
const portal = roles.member.portal;
const now = () => new Date().toISOString();
const row = (data: Data) => ({
  id: crypto.randomUUID(),
  memberId: 'member-demo',
  createdAt: now(),
  updatedAt: now(),
  ...data,
});
const unsupported = () => {
  throw new Error(
    'This action is available in the locally installed app. This shared sample does not send messages, accept documents or create real accounts.',
  );
};

// Private review only: all records are fictional and all changes live in tab memory.
// This is not authentication. Sites provides the private access boundary.
export async function previewApi(path: string, method = 'GET', body: Data = {}) {
  if (path === '/config') return { ...fixture.config, sharedPreview: true };
  if (path === '/demo/login') {
    if (!roles[body.role]) throw new Error('Choose a sample role.');
    role = body.role;
    signedIn = true;
    return { ok: true };
  }
  if (path === '/auth/logout') {
    signedIn = false;
    return { ok: true };
  }
  if (!signedIn) throw new Error('Please open the fictional member demo.');
  if (path === '/me') return { user: roles[role].user };
  if (path.startsWith('/portal')) {
    if (['member', 'doctor', 'nurse'].includes(role)) return structuredClone(portal);
    if (roles[role].portal) return structuredClone(roles[role].portal);
    throw new Error('This role does not have a member record view.');
  }
  if (path === '/staff/overview') return structuredClone(roles[role].staff || {});
  if (path.endsWith('/emergency') && method === 'GET')
    return structuredClone(roles[role].emergency || roles.member.emergency);
  if (path.startsWith('/audit/')) return structuredClone(roles[role].audit || []);
  if (method === 'GET') return unsupported();
  if (path.endsWith('/vitals')) {
    if (!['member', 'doctor', 'nurse'].includes(role))
      throw new Error('Choose the member or care team preview.');
    if (body.type === 'blood_pressure' && body.secondary >= body.value)
      throw new Error('Enter systolic above diastolic.');
    const units: Data = {
      blood_pressure: 'mmHg',
      glucose: 'mmol/L',
      heart_rate: 'bpm',
      weight: 'kg',
      spo2: '%',
      temperature: '°C',
    };
    const limits = portal.thresholds.find((t: Data) => t.type === body.type);
    const v = row({
      ...body,
      unit: units[body.type],
      flagged:
        !!limits &&
        (body.value < limits.low ||
          body.value > limits.high ||
          body.secondary > (limits.secondaryHigh || Infinity)),
      reviewedAt: null,
      protocolSet: !!limits,
    });
    portal.vitals.unshift(v);
    return v;
  }
  if (path.endsWith('/consults')) {
    const c = row({
      ...body,
      status: 'requested',
      doctorName: 'Awaiting allocation',
      requestedAt: now(),
    });
    portal.consults.unshift(c);
    if (body.mode === 'home')
      portal.invoices.unshift(
        row({
          type: 'home_visit',
          amount: HOME_VISIT_FEE,
          status: 'awaiting_completion',
          description: 'Sample home visit',
          reference: 'PW-REVIEW',
          consultId: c.id,
          test: true,
        }),
      );
    return c;
  }
  if (path.endsWith('/acknowledge')) {
    const item = portal.reminders.find((r: Data) => path.includes(r.id));
    if (item) item.acknowledgedAt = now();
    return { ok: true };
  }
  if (path.endsWith('/membership')) {
    const tier = body.tier as Tier;
    if (!TIERS[tier]) throw new Error('Choose a membership.');
    Object.assign(portal.subscription, {
      pendingTier: tier,
      pendingAmount: TIERS[tier].amount,
      paymentMethod: body.paymentMethod,
    });
    return { ok: true };
  }
  if (path.endsWith('/pay-test')) {
    const inv = portal.invoices.find((r: Data) => path.includes(r.id));
    if (inv?.status !== 'due') throw new Error('Only a due sample invoice can be marked paid.');
    inv.status = 'paid';
    inv.paidAt = now();
    return { ok: true };
  }
  return unsupported();
}
