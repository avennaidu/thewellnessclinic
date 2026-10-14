import { createApp } from './app.ts';
import { processBilling } from './billing.ts';
const { app, db } = await createApp();
const port = Number(process.env.PORT || 4173);
await app.listen({ port, host: process.env.HOST || '127.0.0.1' });
console.log(`Proactive Wellness is ready at http://localhost:${port}`);
console.log('Local demonstration • fictional records • test payments only');
const billingTimer = setInterval(
  () =>
    processBilling(db).catch(() =>
      console.error('Local invoice run failed; check database availability.'),
    ),
  60000,
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    clearInterval(billingTimer);
    await app.close();
    process.exit(0);
  });
