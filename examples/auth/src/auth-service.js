import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { transaction } from './database.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const OTP_PATTERN = /^(?=.*[0-9])(?=.*[A-Z])[0-9A-Z]{6}$/;

export function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

function hashOtp(secret, challengeId, code) {
  return createHmac('sha256', secret).update(`${challengeId}:${code}`).digest('hex');
}

function generateOtp() {
  let code;
  do {
    code = Array.from({ length: 6 }, () => OTP_ALPHABET[randomInt(0, OTP_ALPHABET.length)]).join(
      '',
    );
  } while (!OTP_PATTERN.test(code));
  return code;
}

function normalizeOtp(value) {
  if (typeof value !== 'string') return null;
  const code = value.toUpperCase();
  return OTP_PATTERN.test(code) ? code : null;
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
  const otpGlobalWindowMs = config.otpGlobalWindowMs ?? 60 * 1000;
  const otpGlobalMaxRequests = config.otpGlobalMaxRequests ?? 10;
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
  const pruneChallenges = db.prepare(`
    DELETE FROM login_challenges
    WHERE created_at <= ? AND (expires_at <= ? OR consumed_at IS NOT NULL)
  `);
  const countRecentChallenges = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM login_challenges WHERE created_at > ?) +
      (SELECT COUNT(*) FROM email_change_challenges WHERE created_at > ?) AS count
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
  const findAccountById = db.prepare('SELECT * FROM accounts WHERE id = ?');
  const insertAccount = db.prepare('INSERT INTO accounts (id, email, created_at) VALUES (?, ?, ?)');
  const findRecentEmailChange = db.prepare(`
    SELECT id FROM email_change_challenges
    WHERE account_id = ? AND email = ? AND created_at > ?
    ORDER BY created_at DESC LIMIT 1
  `);
  const insertEmailChange = db.prepare(`
    INSERT INTO email_change_challenges (id, account_id, email, code_hash, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const findEmailChange = db.prepare('SELECT * FROM email_change_challenges WHERE id = ?');
  const consumePreviousEmailChanges = db.prepare(`
    UPDATE email_change_challenges SET consumed_at = ?
    WHERE account_id = ? AND id != ? AND consumed_at IS NULL
  `);
  const recordEmailChangeFailure = db.prepare(`
    UPDATE email_change_challenges
    SET failed_attempts = failed_attempts + 1,
        consumed_at = CASE WHEN failed_attempts + 1 >= ? THEN ? ELSE consumed_at END
    WHERE id = ? AND consumed_at IS NULL
  `);
  const consumeEmailChange = db.prepare(`
    UPDATE email_change_challenges SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL
  `);
  const updateAccountEmail = db.prepare('UPDATE accounts SET email = ? WHERE id = ?');
  const consumeLoginChallengesForEmails = db.prepare(`
    UPDATE login_challenges SET consumed_at = ?
    WHERE email IN (?, ?) AND consumed_at IS NULL
  `);
  const pruneEmailChanges = db.prepare(`
    DELETE FROM email_change_challenges
    WHERE created_at <= ? AND (expires_at <= ? OR consumed_at IS NOT NULL)
  `);
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
  const listActiveSessions = db.prepare(`
    SELECT id, created_at, expires_at
    FROM sessions
    WHERE account_id = ? AND revoked_at IS NULL AND expires_at > ?
    ORDER BY created_at DESC, id DESC
  `);
  const revokeAccountSession = db.prepare(`
    UPDATE sessions SET revoked_at = ?
    WHERE id = ? AND account_id = ? AND revoked_at IS NULL AND expires_at > ?
  `);

  function authenticate(token) {
    if (typeof token !== 'string' || token.length < 20) return null;
    const row = findSession.get(hashToken(token), now());
    if (!row) return null;
    return {
      account: { id: row.account_id, email: row.email },
      session: { id: row.session_id, createdAt: row.created_at, expiresAt: row.expires_at },
    };
  }

  return {
    async requestCode(rawEmail) {
      const email = normalizeEmail(rawEmail);
      if (!email) return { kind: 'invalid-email' };

      const timestamp = now();
      const windowStart = timestamp - otpGlobalWindowMs;
      pruneChallenges.run(windowStart, timestamp);
      pruneEmailChanges.run(windowStart, timestamp);
      const recent = findRecentChallenge.get(email, timestamp - config.otpCooldownMs);
      if (recent) return { kind: 'accepted', challengeId: recent.id, sent: false };

      if (countRecentChallenges.get(windowStart, windowStart).count >= otpGlobalMaxRequests) {
        return { kind: 'rate-limited', retryAfterMs: otpGlobalWindowMs };
      }

      const challengeId = randomUUID();
      const code = generateOtp();
      insertChallenge.run(
        challengeId,
        email,
        hashOtp(config.authSecret, challengeId, code),
        timestamp,
        timestamp + config.otpTtlMs,
      );

      try {
        await mailer.sendLoginCode({
          email,
          code,
          expiresInMinutes: Math.ceil(config.otpTtlMs / 60_000),
        });
        consumePreviousChallenges.run(now(), email, challengeId);
      } catch (error) {
        db.prepare('DELETE FROM login_challenges WHERE id = ?').run(challengeId);
        throw error;
      }

      return { kind: 'accepted', challengeId, sent: true };
    },

    verifyCode(challengeId, rawCode) {
      const code = normalizeOtp(rawCode);
      if (typeof challengeId !== 'string' || !code) {
        return { kind: 'invalid-code' };
      }

      return transaction(db, () => {
        const timestamp = now();
        const challenge = findChallenge.get(challengeId);
        if (
          !challenge ||
          challenge.consumed_at !== null ||
          challenge.expires_at <= timestamp ||
          challenge.failed_attempts >= config.otpMaxAttempts
        ) {
          return { kind: 'invalid-code' };
        }

        const candidate = hashOtp(config.authSecret, challengeId, code);
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
          expiresAt: timestamp + config.sessionTtlMs,
        };
        insertSession.run(
          session.id,
          account.id,
          hashToken(token),
          session.createdAt,
          session.expiresAt,
        );
        return {
          kind: 'authenticated',
          token,
          account: { id: account.id, email: account.email },
          session,
        };
      });
    },

    authenticate,

    async requestEmailChangeCode(token, rawEmail) {
      const authenticated = authenticate(token);
      if (!authenticated) return { kind: 'unauthorized' };
      const email = normalizeEmail(rawEmail);
      if (!email) return { kind: 'invalid-email' };

      const owner = findAccountByEmail.get(email);
      if (owner) return { kind: 'email-unavailable' };

      const timestamp = now();
      const windowStart = timestamp - otpGlobalWindowMs;
      pruneChallenges.run(windowStart, timestamp);
      pruneEmailChanges.run(windowStart, timestamp);
      const recent = findRecentEmailChange.get(
        authenticated.account.id,
        email,
        timestamp - config.otpCooldownMs,
      );
      if (recent) return { kind: 'accepted', challengeId: recent.id, sent: false };

      if (countRecentChallenges.get(windowStart, windowStart).count >= otpGlobalMaxRequests) {
        return { kind: 'rate-limited', retryAfterMs: otpGlobalWindowMs };
      }

      const challengeId = randomUUID();
      const code = generateOtp();
      insertEmailChange.run(
        challengeId,
        authenticated.account.id,
        email,
        hashOtp(config.authSecret, challengeId, code),
        timestamp,
        timestamp + config.otpTtlMs,
      );

      try {
        await mailer.sendEmailChangeCode({
          email,
          code,
          expiresInMinutes: Math.ceil(config.otpTtlMs / 60_000),
        });
        consumePreviousEmailChanges.run(now(), authenticated.account.id, challengeId);
      } catch (error) {
        db.prepare('DELETE FROM email_change_challenges WHERE id = ?').run(challengeId);
        throw error;
      }

      return { kind: 'accepted', challengeId, sent: true };
    },

    verifyEmailChange(token, challengeId, rawCode) {
      const authenticated = authenticate(token);
      if (!authenticated) return { kind: 'unauthorized' };
      const code = normalizeOtp(rawCode);
      if (typeof challengeId !== 'string' || !code) return { kind: 'invalid-code' };

      return transaction(db, () => {
        const timestamp = now();
        const challenge = findEmailChange.get(challengeId);
        if (
          !challenge ||
          challenge.account_id !== authenticated.account.id ||
          challenge.consumed_at !== null ||
          challenge.expires_at <= timestamp ||
          challenge.failed_attempts >= config.otpMaxAttempts
        ) {
          return { kind: 'invalid-code' };
        }

        const candidate = hashOtp(config.authSecret, challengeId, code);
        if (!hashesMatch(candidate, challenge.code_hash)) {
          recordEmailChangeFailure.run(config.otpMaxAttempts, timestamp, challengeId);
          return { kind: 'invalid-code' };
        }

        const owner = findAccountByEmail.get(challenge.email);
        if (owner && owner.id !== authenticated.account.id) {
          return { kind: 'email-unavailable' };
        }

        const account = findAccountById.get(authenticated.account.id);
        updateAccountEmail.run(challenge.email, account.id);
        consumeEmailChange.run(timestamp, challengeId);
        consumePreviousEmailChanges.run(timestamp, account.id, challengeId);
        consumeLoginChallengesForEmails.run(timestamp, account.email, challenge.email);
        return {
          kind: 'email-changed',
          account: { id: account.id, email: challenge.email },
        };
      });
    },

    listSessions(token) {
      const authenticated = authenticate(token);
      if (!authenticated) return null;
      return listActiveSessions.all(authenticated.account.id, now()).map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        current: row.id === authenticated.session.id,
      }));
    },

    revokeSessionById(token, sessionId) {
      const authenticated = authenticate(token);
      if (!authenticated) return { kind: 'unauthorized' };
      if (typeof sessionId !== 'string' || sessionId.length === 0) {
        return { kind: 'not-found' };
      }
      const timestamp = now();
      const revoked =
        revokeAccountSession.run(timestamp, sessionId, authenticated.account.id, timestamp)
          .changes === 1;
      return { kind: revoked ? 'revoked' : 'not-found' };
    },

    logout(token) {
      if (typeof token !== 'string' || token.length < 20) return false;
      const timestamp = now();
      return revokeSession.run(timestamp, hashToken(token), timestamp).changes === 1;
    },
  };
}
