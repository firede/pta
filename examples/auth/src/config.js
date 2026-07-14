import path from 'node:path';

function positiveInteger(value, fallback, name) {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function port(value, fallback, name) {
  const parsed = positiveInteger(value, fallback, name);
  if (parsed > 65_535) throw new Error(`${name} must be at most 65535`);
  return parsed;
}

export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const authSecret = env.AUTH_SECRET ?? (production ? '' : 'development-only-auth-secret-change-me');

  if (authSecret.length < 32) {
    throw new Error('AUTH_SECRET must contain at least 32 characters');
  }

  return {
    host: env.HOST ?? '127.0.0.1',
    port: port(env.PORT, 3000, 'PORT'),
    databasePath: env.DATABASE_PATH ?? path.resolve('data/auth.sqlite'),
    authSecret,
    smtpHost: env.SMTP_HOST ?? '127.0.0.1',
    smtpPort: port(env.SMTP_PORT, 1025, 'SMTP_PORT'),
    mailFrom: env.MAIL_FROM ?? 'login@example.test',
    otpTtlMs: positiveInteger(env.OTP_TTL_MS, 10 * 60 * 1000, 'OTP_TTL_MS'),
    otpCooldownMs: positiveInteger(env.OTP_COOLDOWN_MS, 60 * 1000, 'OTP_COOLDOWN_MS'),
    otpMaxAttempts: positiveInteger(env.OTP_MAX_ATTEMPTS, 5, 'OTP_MAX_ATTEMPTS'),
    otpGlobalWindowMs: positiveInteger(
      env.OTP_GLOBAL_WINDOW_MS,
      60 * 1000,
      'OTP_GLOBAL_WINDOW_MS'
    ),
    otpGlobalMaxRequests: positiveInteger(
      env.OTP_GLOBAL_MAX_REQUESTS,
      10,
      'OTP_GLOBAL_MAX_REQUESTS'
    ),
    smtpTimeoutMs: positiveInteger(env.SMTP_TIMEOUT_MS, 10 * 1000, 'SMTP_TIMEOUT_MS'),
    sessionTtlMs: positiveInteger(env.SESSION_TTL_MS, 30 * 24 * 60 * 60 * 1000, 'SESSION_TTL_MS')
  };
}
