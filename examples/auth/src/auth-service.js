import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { transaction } from './database.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

function hashOtp(secret, challengeId, code) {
  return createHmac('sha256', secret).update(`${challengeId}:${code}`).digest('hex');
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function hashesMatch(left, right) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createAuthService({ db, mailer, config, now = () => Date.now() }) {
  const findRecentChallenge = db.prepare(`
    SELECT id FROM login_challenges
    WHERE email = ? AND created_at > ?
    ORDER BY created_at DESC LIMIT 1
  `);
  const insertChallenge = db.prepare(`
    INSERT INTO login_challenges (id, email, code_hash, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const consumePreviousChallenges = db.prepare(`
    UPDATE login_challenges SET consumed_at = ?
    WHERE email = ? AND id != ? AND consumed_at IS NULL
  `);
  const findChallenge = db.prepare('SELECT * FROM login_challenges WHERE id = ?');
  const recordFailure = db.prepare(`
    UPDATE login_challenges
    SET failed_attempts = failed_attempts + 1,
        consumed_at = CASE WHEN failed_attempts + 1 >= ? THEN ? ELSE consumed_at END
    WHERE id = ? AND consumed_at IS NULL
  `);
  const consumeChallenge = db.prepare(`
    UPDATE login_challenges SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL
  `);
  const findAccountByEmail = db.prepare('SELECT * FROM accounts WHERE email = ?');
  const insertAccount = db.prepare('INSERT INTO accounts (id, email, created_at) VALUES (?, ?, ?)');
  const insertSession = db.prepare(`
    INSERT INTO sessions (id, account_id, token_hash, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const findSession = db.prepare(`
    SELECT sessions.id AS session_id, sessions.created_at, sessions.expires_at,
           accounts.id AS account_id, accounts.email
    FROM sessions JOIN accounts ON accounts.id = sessions.account_id
    WHERE sessions.token_hash = ? AND sessions.revoked_at IS NULL AND sessions.expires_at > ?
  `);
  const revokeSession = db.prepare(`
    UPDATE sessions SET revoked_at = ?
    WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?
  `);

  return {
    async requestCode(rawEmail) {
      const email = normalizeEmail(rawEmail);
      if (!email) return { kind: 'invalid-email' };

      const timestamp = now();
      const recent = findRecentChallenge.get(email, timestamp - config.otpCooldownMs);
      if (recent) return { kind: 'accepted', challengeId: recent.id, sent: false };

      const challengeId = randomUUID();
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      insertChallenge.run(
        challengeId,
        email,
        hashOtp(config.authSecret, challengeId, code),
        timestamp,
        timestamp + config.otpTtlMs
      );

      try {
        await mailer.sendLoginCode({
          email,
          code,
          expiresInMinutes: Math.ceil(config.otpTtlMs / 60_000)
        });
        consumePreviousChallenges.run(now(), email, challengeId);
      } catch (error) {
        db.prepare('DELETE FROM login_challenges WHERE id = ?').run(challengeId);
        throw error;
      }

      return { kind: 'accepted', challengeId, sent: true };
    },

    verifyCode(challengeId, rawCode) {
      if (typeof challengeId !== 'string' || !/^[0-9]{6}$/.test(rawCode ?? '')) {
        return { kind: 'invalid-code' };
      }

      return transaction(db, () => {
        const timestamp = now();
        const challenge = findChallenge.get(challengeId);
        if (!challenge || challenge.consumed_at !== null || challenge.expires_at <= timestamp ||
            challenge.failed_attempts >= config.otpMaxAttempts) {
          return { kind: 'invalid-code' };
        }

        const candidate = hashOtp(config.authSecret, challengeId, rawCode);
        if (!hashesMatch(candidate, challenge.code_hash)) {
          recordFailure.run(config.otpMaxAttempts, timestamp, challengeId);
          return { kind: 'invalid-code' };
        }

        consumeChallenge.run(timestamp, challengeId);
        let account = findAccountByEmail.get(challenge.email);
        if (!account) {
          account = { id: randomUUID(), email: challenge.email, created_at: timestamp };
          insertAccount.run(account.id, account.email, account.created_at);
        }

        const token = `auth_${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
        const session = {
          id: randomUUID(),
          createdAt: timestamp,
          expiresAt: timestamp + config.sessionTtlMs
        };
        insertSession.run(session.id, account.id, hashToken(token), session.createdAt, session.expiresAt);
        return {
          kind: 'authenticated',
          token,
          account: { id: account.id, email: account.email },
          session
        };
      });
    },

    authenticate(token) {
      if (typeof token !== 'string' || token.length < 20) return null;
      const row = findSession.get(hashToken(token), now());
      if (!row) return null;
      return {
        account: { id: row.account_id, email: row.email },
        session: { id: row.session_id, createdAt: row.created_at, expiresAt: row.expires_at }
      };
    },

    logout(token) {
      if (typeof token !== 'string' || token.length < 20) return false;
      const timestamp = now();
      return revokeSession.run(timestamp, hashToken(token), timestamp).changes === 1;
    }
  };
}
