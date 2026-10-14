import { TABLES } from '../apps/api/src/db.ts';
import { mkdir, writeFile } from 'node:fs/promises';
const sql = [
  '-- Migration 001: encrypted domain records. PostgreSQL and SQLite compatible.',
  '-- Each payload uses AES-256-GCM; the ownership index contains no clinical text.',
  'CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL);',
];
for (const table of TABLES) {
  sql.push(
    `CREATE TABLE IF NOT EXISTS ${table} (\n  id TEXT PRIMARY KEY,\n  member_id TEXT ${['members', 'users', 'waitlist'].includes(table) ? '' : 'REFERENCES members(id)'},\n  payload TEXT NOT NULL,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);`,
    `CREATE INDEX IF NOT EXISTS idx_${table}_member ON ${table}(member_id,created_at);`,
  );
}
await mkdir('apps/api/migrations', { recursive: true });
await writeFile('apps/api/migrations/001_domain.sql', sql.join('\n\n') + '\n');
