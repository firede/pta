import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function openDatabase(filename) {
  if (filename !== ':memory:') {
    mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  }

  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS login_challenges (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      consumed_at INTEGER
    ) STRICT;

    CREATE INDEX IF NOT EXISTS login_challenges_email_created
      ON login_challenges(email, created_at DESC);

    CREATE INDEX IF NOT EXISTS login_challenges_created
      ON login_challenges(created_at);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER
    ) STRICT;

    CREATE INDEX IF NOT EXISTS sessions_token_hash ON sessions(token_hash);
  `);
  return db;
}

export function transaction(db, operation) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
