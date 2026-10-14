import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  TIERS,
  HOME_VISIT_FEE,
  PROTOTYPE_NOTICE,
  SUBSCRIPTION_NOTICE,
} from '../packages/core/domain.ts';
import { previewApi } from '../apps/web/src/preview-api.ts';

test('catalogue preserves approved pricing and qualifies every intended benefit', async () => {
  assert.deepEqual(
    Object.values(TIERS).map((t) => t.amount),
    [99500, 170000, 265000],
  );
  assert.equal(HOME_VISIT_FEE, 185000);
  for (const tier of Object.values(TIERS)) {
    assert.ok(tier.benefits.length);
    for (const benefit of tier.benefits) assert.match(benefit, /^Planned: /);
  }
  assert.match(SUBSCRIPTION_NOTICE, /does not purchase or activate care/);
  assert.match(PROTOTYPE_NOTICE, /Do not enter real patient or financial information/);
  assert.deepEqual((await previewApi('/config')).tiers, TIERS);
});

test('web and mobile disclose limitations before registration and at membership selection', async () => {
  for (const path of ['apps/web/src/main.tsx', 'apps/mobile/src/App.tsx']) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.ok(source.indexOf('{PROTOTYPE_NOTICE}') < source.indexOf("'/auth/register'"));
    assert.ok(source.includes('{SUBSCRIPTION_NOTICE}'));
  }
});
