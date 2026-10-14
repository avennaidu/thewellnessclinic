import { Store } from './db.ts';
const db = new Store(process.env.DB_PATH || 'data/wellness.sqlite', process.env.DATABASE_URL);
try {
  await db.migrate();
  console.log('Domain migration 001 applied.');
} finally {
  await db.close();
}
