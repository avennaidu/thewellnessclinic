-- Migration 001: encrypted domain records. PostgreSQL and SQLite compatible.

-- Each payload uses AES-256-GCM; the ownership index contains no clinical text.

CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  member_id TEXT ,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_member ON users(member_id,created_at);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  member_id TEXT ,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_member ON members(member_id,created_at);

CREATE TABLE IF NOT EXISTS family_viewers (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_family_viewers_member ON family_viewers(member_id,created_at);

CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consents_member ON consents(member_id,created_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id,created_at);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_member ON invoices(member_id,created_at);

CREATE TABLE IF NOT EXISTS villages (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_villages_member ON villages(member_id,created_at);

CREATE TABLE IF NOT EXISTS vitals (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vitals_member ON vitals(member_id,created_at);

CREATE TABLE IF NOT EXISTS thresholds (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_thresholds_member ON thresholds(member_id,created_at);

CREATE TABLE IF NOT EXISTS consults (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consults_member ON consults(member_id,created_at);

CREATE TABLE IF NOT EXISTS home_visits (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_home_visits_member ON home_visits(member_id,created_at);

CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scripts_member ON scripts(member_id,created_at);

CREATE TABLE IF NOT EXISTS script_items (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_script_items_member ON script_items(member_id,created_at);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_member ON orders(member_id,created_at);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deliveries_member ON deliveries(member_id,created_at);

CREATE TABLE IF NOT EXISTS medication_events (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_medication_events_member ON medication_events(member_id,created_at);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_member ON documents(member_id,created_at);

CREATE TABLE IF NOT EXISTS nurse_notes (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nurse_notes_member ON nurse_notes(member_id,created_at);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reminders_member ON reminders(member_id,created_at);

CREATE TABLE IF NOT EXISTS clinic_sessions (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clinic_sessions_member ON clinic_sessions(member_id,created_at);

CREATE TABLE IF NOT EXISTS benefits (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_benefits_member ON benefits(member_id,created_at);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_claims_member ON claims(member_id,created_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_member ON audit_log(member_id,created_at);

CREATE TABLE IF NOT EXISTS pharmacies (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pharmacies_member ON pharmacies(member_id,created_at);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drivers_member ON drivers(member_id,created_at);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_member ON sessions(member_id,created_at);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_member ON otp_challenges(member_id,created_at);

CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  member_id TEXT ,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waitlist_member ON waitlist(member_id,created_at);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_member ON privacy_requests(member_id,created_at);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_member ON jobs(member_id,created_at);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_events_member ON payment_events(member_id,created_at);

CREATE TABLE IF NOT EXISTS emergency_shares (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_emergency_shares_member ON emergency_shares(member_id,created_at);
