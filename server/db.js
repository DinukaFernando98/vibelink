const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'vibelink.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    dob           TEXT NOT NULL,
    profile_photo TEXT,
    session_token TEXT,
    password_hash TEXT,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL,
    last_seen     INTEGER,
    is_banned     INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS reports (
    id               TEXT PRIMARY KEY,
    reporter_socket  TEXT,
    reported_socket  TEXT,
    reason           TEXT NOT NULL DEFAULT 'inappropriate',
    created_at       INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS friend_requests (
    id         TEXT PRIMARY KEY,
    from_id    TEXT NOT NULL,
    to_id      TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS friends (
    id         TEXT PRIMARY KEY,
    user_id_1  TEXT NOT NULL,
    user_id_2  TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id_1, user_id_2)
  );

  CREATE TABLE IF NOT EXISTS direct_messages (
    id         TEXT PRIMARY KEY,
    from_id    TEXT NOT NULL,
    to_id      TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Migrations for existing databases
const migrations = [
  'ALTER TABLE users ADD COLUMN password_hash TEXT',
  'ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1',
  'ALTER TABLE users ADD COLUMN country_code TEXT',
  'ALTER TABLE users ADD COLUMN country_name TEXT',
];
for (const sql of migrations) {
  try { db.exec(sql); } catch { /* column already exists */ }
}

module.exports = db;
