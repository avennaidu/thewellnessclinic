import type { Store } from './db.ts';
import { TIERS, type Tier } from '../../../packages/core/domain.ts';

function nextBillingDate(from: string, billingDay: number) {
  const d = new Date(from);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(billingDay, last), 6)).toISOString();
}
// Local invoice generation only. This never collects funds or sends a message.
export async function processBilling(db: Store, at = new Date()) {
  const result = { invoicesCreated: 0, cancellationsApplied: 0 };
  await db.transaction(async () => {
    for (const sub of await db.list('subscriptions')) {
      if (sub.status !== 'active' || !sub.nextBillingAt) continue;
      if (sub.cancelledAt && Date.parse(sub.cancelledAt) <= +at) {
        await db.update('subscriptions', sub.id, { status: 'cancelled' });
        await db.update('members', sub.memberId!, { status: 'cancelled' });
        await db.insert(
          'audit_log',
          {
            actorId: 'billing-worker',
            action: 'apply_cancellation',
            entity: 'subscriptions',
            entityId: sub.id,
            at: at.toISOString(),
            ip: 'local',
          },
          sub.memberId,
        );
        result.cancellationsApplied++;
        continue;
      }
      if (Date.parse(sub.nextBillingAt) > +at) continue;
      const invoiceId = `retainer-${sub.id}-${sub.nextBillingAt.slice(0, 10)}`;
      if (await db.get('invoices', invoiceId)) continue;
      const tier: Tier = sub.pendingTier || sub.tier;
      await db.insert(
        'invoices',
        {
          type: 'retainer',
          reference: `PW-${sub.nextBillingAt.slice(0, 10)}-${sub.id.slice(-6)}`,
          amount: TIERS[tier].amount,
          status: 'due',
          description: `${TIERS[tier].name} monthly membership`,
          dueAt: sub.nextBillingAt,
          test: true,
        },
        sub.memberId,
        invoiceId,
      );
      await db.update('subscriptions', sub.id, {
        tier,
        amount: TIERS[tier].amount,
        pendingTier: null,
        pendingAmount: null,
        nextBillingAt: nextBillingDate(sub.nextBillingAt, sub.billingDay || 1),
      });
      await db.update('members', sub.memberId!, { tier });
      await db.insert(
        'audit_log',
        {
          actorId: 'billing-worker',
          action: 'create_invoice',
          entity: 'invoices',
          entityId: invoiceId,
          at: at.toISOString(),
          ip: 'local',
        },
        sub.memberId,
      );
      result.invoicesCreated++;
    }
  });
  return result;
}
