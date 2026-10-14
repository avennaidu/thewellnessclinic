import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

export const TABLES = [
  'users',
  'members',
  'family_viewers',
  'consents',
  'subscriptions',
  'invoices',
  'villages',
  'vitals',
  'thresholds',
  'consults',
  'home_visits',
  'scripts',
  'script_items',
  'orders',
  'deliveries',
  'medication_events',
  'documents',
  'nurse_notes',
  'reminders',
  'clinic_sessions',
  'benefits',
  'claims',
  'audit_log',
  'pharmacies',
  'drivers',
  'sessions',
  'otp_challenges',
  'waitlist',
  'privacy_requests',
  'jobs',
  'payment_events',
  'emergency_shares',
] as const;
export type Table = (typeof TABLES)[number];
export type Row = {
  id: string;
  memberId: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
};

export class Store {
  sqlite?: DatabaseSync;
  pool?: pg.Pool;
  key: Buffer;
  context = new AsyncLocalStorage<pg.PoolClient | 'sqlite'>();
  queue: Promise<any> = Promise.resolve();
  constructor(path: string, databaseUrl?: string) {
    if (databaseUrl)
      this.pool = new pg.Pool({
        connectionString: databaseUrl,
        max: 10,
        ssl:
          process.env.NODE_ENV === 'production'
            ? {
                rejectUnauthorized: true,
                ...(process.env.PG_CA_FILE
                  ? { ca: readFileSync(process.env.PG_CA_FILE, 'utf8') }
                  : {}),
              }
            : undefined,
      });
    else {
      mkdirSync(dirname(resolve(path)), { recursive: true });
      this.sqlite = new DatabaseSync(path);
      this.sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
    }
    if (process.env.DATA_ENCRYPTION_KEY)
      this.key = Buffer.from(process.env.DATA_ENCRYPTION_KEY, 'hex');
    else {
      const keyfile = resolve(dirname(path), '.local-key');
      if (!existsSync(keyfile))
        writeFileSync(keyfile, randomBytes(32).toString('hex'), { mode: 0o600 });
      this.key = Buffer.from(readFileSync(keyfile, 'utf8').trim(), 'hex');
    }
    if (this.key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be 64 hex characters');
  }
  async query(sql: string, values: any[] = []): Promise<any[]> {
    if (this.pool) {
      let i = 0;
      const statement = sql.replace(/\?/g, () => `$${++i}`);
      return (
        await (
          this.context.getStore() && this.context.getStore() !== 'sqlite'
            ? (this.context.getStore() as pg.PoolClient)
            : this.pool
        ).query(statement, values)
      ).rows;
    }
    const statement = this.sqlite!.prepare(sql);
    return /^\s*(SELECT|WITH|PRAGMA)/i.test(sql)
      ? statement.all(...values)
      : (statement.run(...values), []);
  }
  async migrate() {
    await this.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
    );
    for (const table of TABLES) {
      // Structured domain payloads are encrypted. Ownership and timestamps remain indexed.
      await this.query(
        `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, member_id TEXT ${table === 'members' || table === 'users' || table === 'waitlist' ? '' : 'REFERENCES members(id)'}, payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
      );
      await this.query(
        `CREATE INDEX IF NOT EXISTS idx_${table}_member ON ${table}(member_id, created_at)`,
      );
    }
    if (this.sqlite) {
      this.sqlite.exec(
        "CREATE TRIGGER IF NOT EXISTS audit_immutable_update BEFORE UPDATE ON audit_log BEGIN SELECT RAISE(ABORT, 'Audit records are immutable'); END; CREATE TRIGGER IF NOT EXISTS audit_immutable_delete BEFORE DELETE ON audit_log BEGIN SELECT RAISE(ABORT, 'Audit records are immutable'); END;",
      );
    } else {
      await this.query(
        "CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit records are immutable'; END; $$",
      );
      await this.query('DROP TRIGGER IF EXISTS audit_immutable ON audit_log');
      await this.query(
        'CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation()',
      );
    }
    await this.query(
      "INSERT INTO schema_migrations(version,applied_at) VALUES ('001',?) ON CONFLICT(version) DO NOTHING",
      [new Date().toISOString()],
    );
  }
  seal(data: any) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const out = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
    return [
      iv.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      out.toString('base64'),
    ].join('.');
  }
  open(row: any): Row {
    const [iv, tag, data] = row.payload.split('.').map((x: string) => Buffer.from(x, 'base64'));
    const cipher = createDecipheriv('aes-256-gcm', this.key, iv);
    cipher.setAuthTag(tag);
    return {
      ...JSON.parse(Buffer.concat([cipher.update(data), cipher.final()]).toString()),
      id: row.id,
      memberId: row.member_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  async list(table: Table, memberId?: string): Promise<Row[]> {
    return (
      await this.query(
        `SELECT * FROM ${table}${memberId ? ' WHERE member_id=?' : ''} ORDER BY created_at DESC`,
        memberId ? [memberId] : [],
      )
    ).map((r) => this.open(r));
  }
  async get(table: Table, id: string) {
    const rows = await this.query(`SELECT * FROM ${table} WHERE id=?`, [id]);
    return rows[0] ? this.open(rows[0]) : null;
  }
  async insert(
    table: Table,
    data: any,
    memberId: string | null = null,
    id = randomUUID() as string,
  ) {
    const now = new Date().toISOString();
    await this.query(
      `INSERT INTO ${table}(id,member_id,payload,created_at,updated_at) VALUES (?,?,?,?,?)`,
      [id, memberId, this.seal(data), now, now],
    );
    return (await this.get(table, id))!;
  }
  async update(table: Table, id: string, data: any) {
    if (table === 'audit_log') throw new Error('Immutable audit');
    const old = await this.get(table, id);
    if (!old) throw new Error('Record not found');
    const { id: _, memberId, createdAt, updatedAt, ...payload } = { ...old, ...data };
    await this.query(`UPDATE ${table} SET payload=?, updated_at=? WHERE id=?`, [
      this.seal(payload),
      new Date().toISOString(),
      id,
    ]);
    return (await this.get(table, id))!;
  }
  async remove(table: Table, id: string) {
    if (table === 'audit_log') throw new Error('Immutable audit');
    await this.query(`DELETE FROM ${table} WHERE id=?`, [id]);
  }
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.context.getStore()) return fn();
    if (this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(70411001)');
        const result = await this.context.run(client, fn);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
    let release!: () => void;
    const previous = this.queue;
    this.queue = new Promise<void>((r) => (release = r));
    await previous;
    try {
      this.sqlite!.exec('BEGIN IMMEDIATE');
      const result = await this.context.run('sqlite', fn);
      this.sqlite!.exec('COMMIT');
      return result;
    } catch (e) {
      this.sqlite!.exec('ROLLBACK');
      throw e;
    } finally {
      release();
    }
  }
  async close() {
    if (this.pool) await this.pool.end();
    this.sqlite?.close();
  }
}
