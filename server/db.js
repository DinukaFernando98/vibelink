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
`);

// Migration: add password_hash column if it doesn't exist (for existing databases)
try {
  db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
} catch { /* column already exists */ }

module.exports = db;
