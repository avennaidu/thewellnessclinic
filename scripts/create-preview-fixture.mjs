import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../apps/api/src/app.ts';

// Always create a fresh fictional database. Never export a running user's records.
const dir = await mkdtemp(join(tmpdir(), 'pw-fictional-fixture-'));
const { app } = await createApp({ dbPath: join(dir, 'sample.sqlite'), demo: true });
try {
  const fixture = {
    fictionalOnly: true,
    generatedAt: new Date().toISOString(),
    config: (await app.inject('/api/config')).json(),
    roles: {},
  };
  for (const role of ['member', 'family', 'doctor', 'nurse', 'admin', 'pharmacy', 'driver']) {
    const login = await app.inject({
      method: 'POST',
      url: '/api/demo/login',
      headers: { 'x-wellness-client': 'app' },
      payload: { role },
    });
    const cookie = `pw_session=${login.cookies.find((c) => c.name === 'pw_session').value}`;
    const get = async (url) => {
      const r = await app.inject({ url, headers: { cookie } });
      if (r.statusCode !== 200) throw new Error(`${role} ${url}: ${r.statusCode}`);
      return r.json();
    };
    const entry = { user: (await get('/api/me')).user };
    if (['member', 'family'].includes(role)) entry.portal = await get('/api/portal');
    else entry.staff = await get('/api/staff/overview');
    if (['doctor', 'nurse', 'admin'].includes(role))
      entry.portal = await get('/api/portal?memberId=member-demo');
    if (['member', 'family', 'doctor', 'nurse'].includes(role))
      entry.emergency = await get('/api/members/member-demo/emergency');
    if (['member', 'admin'].includes(role)) entry.audit = await get('/api/audit/member-demo');
    fixture.roles[role] = entry;
  }
  await mkdir('fixtures', { recursive: true });
  await writeFile('fixtures/demo.json', JSON.stringify(fixture, null, 2) + '\n');
  console.log('Created fictional review fixtures; no runtime database was read.');
} finally {
  await app.close();
  await rm(dir, { recursive: true, force: true });
}
