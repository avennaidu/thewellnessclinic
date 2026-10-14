import test from 'node:test';
import assert from 'node:assert/strict';
import { previewApi } from '../apps/web/src/preview-api.ts';

test('shared review serves fictional roles, keeps sample changes in memory, rejects real actions', async () => {
  assert.equal((await previewApi('/config')).sharedPreview, true);
  const before = await previewApi('/portal');
  assert.equal(before.member.demo, true);
  await previewApi('/members/member-demo/vitals', 'POST', {
    type: 'heart_rate',
    value: 76,
    takenAt: new Date().toISOString(),
  });
  const after = await previewApi('/portal');
  assert.equal(after.vitals.length, before.vitals.length + 1);
  await previewApi('/demo/login', 'POST', { role: 'driver' });
  const driver = await previewApi('/staff/overview');
  assert.ok(driver.orders.length);
  assert.equal(driver.members, undefined);
  await assert.rejects(
    previewApi('/members/member-demo/documents', 'POST', { name: 'real.pdf' }),
    /shared sample/,
  );
  await assert.rejects(previewApi('/auth/register', 'POST', {}), /shared sample/);
  await previewApi('/demo/login', 'POST', { role: 'member' });
});
