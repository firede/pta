import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { openDatabase } from '../src/database.js';

const baseConfig = {
  authSecret: 'test-secret-that-is-at-least-32-characters',
  databasePath: ':memory:',
  otpTtlMs: 10 * 60 * 1000,
  otpCooldownMs: 60 * 1000,
  otpMaxAttempts: 5,
  otpGlobalWindowMs: 60 * 1000,
  otpGlobalMaxRequests: 100,
  sessionTtlMs: 30 * 24 * 60 * 60 * 1000
};

function fixture() {
  let clock = Date.parse('2026-07-14T00:00:00.000Z');
  const messages = [];
  const db = openDatabase(':memory:');
  const mailer = {
    async sendLoginCode(message) {
      messages.push(message);
    }
  };
  const app = buildApp({
    config: baseConfig,
    db,
    mailer,
    now: () => clock
  });
  return {
    app,
    db,
    messages,
    advance(ms) { clock += ms; }
  };
}

function codeFrom(messages, index = 0) {
  return messages[index].code;
}

async function requestCode(app, email = 'User@Example.com ') {
  return app.inject({ method: 'POST', url: '/auth/code', payload: { email } });
}

async function login(app, challengeId, code) {
  return app.inject({
    method: 'POST',
    url: '/auth/session',
    payload: { challengeId, code }
  });
}

test('安全相关运行参数可配置且拒绝非正整数', () => {
  const config = loadConfig({
    AUTH_SECRET: 'test-secret-that-is-at-least-32-characters',
    OTP_GLOBAL_WINDOW_MS: '30000',
    OTP_GLOBAL_MAX_REQUESTS: '7',
    SMTP_TIMEOUT_MS: '2500'
  });
  assert.equal(config.otpGlobalWindowMs, 30_000);
  assert.equal(config.otpGlobalMaxRequests, 7);
  assert.equal(config.smtpTimeoutMs, 2_500);
  assert.throws(
    () => loadConfig({
      AUTH_SECRET: 'test-secret-that-is-at-least-32-characters',
      OTP_GLOBAL_MAX_REQUESTS: '0'
    }),
    /OTP_GLOBAL_MAX_REQUESTS must be a positive integer/
  );
});

test('完整流程：请求验证码、登录、校验登录态和退出', async (t) => {
  const { app, messages } = fixture();
  t.after(() => app.close());

  const requested = await requestCode(app);
  assert.equal(requested.statusCode, 202);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].email, 'user@example.com');
  assert.match(codeFrom(messages), /^(?=.*\d)(?=.*[A-Z])[A-Z0-9]{6}$/);

  const authenticated = await login(app, requested.json().challengeId, codeFrom(messages).toLowerCase());
  assert.equal(authenticated.statusCode, 201);
  const { token, account, session } = authenticated.json();
  assert.match(token, /^auth_[a-f0-9]+$/);
  assert.equal(account.email, 'user@example.com');
  assert.ok(account.id);
  assert.ok(session.id);

  const checked = await app.inject({
    method: 'GET', url: '/auth/session', headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(checked.statusCode, 200);
  assert.deepEqual(checked.json().account, account);
  assert.equal(checked.json().session.id, session.id);

  const loggedOut = await app.inject({
    method: 'DELETE', url: '/auth/session', headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(loggedOut.statusCode, 204);

  const afterLogout = await app.inject({
    method: 'GET', url: '/auth/session', headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(afterLogout.statusCode, 401);
});

test('验证码单次有效，错误码统一且错误尝试受限', async (t) => {
  const { app, messages } = fixture();
  t.after(() => app.close());

  const requested = await requestCode(app);
  const challengeId = requested.json().challengeId;
  const wrongCode = codeFrom(messages) === 'A0A0A0' ? 'B1B1B1' : 'A0A0A0';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await login(app, challengeId, wrongCode);
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, 'invalid_code');
  }

  const correctAfterLimit = await login(app, challengeId, codeFrom(messages));
  assert.equal(correctAfterLimit.statusCode, 401);

  const unknown = await login(app, 'not-a-real-challenge', '123456');
  assert.equal(unknown.statusCode, 401);
  assert.deepEqual(unknown.json(), correctAfterLimit.json());
});

test('验证码过期后不可使用', async (t) => {
  const { app, messages, advance } = fixture();
  t.after(() => app.close());

  const requested = await requestCode(app);
  advance(baseConfig.otpTtlMs);
  const response = await login(app, requested.json().challengeId, codeFrom(messages));
  assert.equal(response.statusCode, 401);
});

test('冷却期内不重复投递，冷却后签发新验证码', async (t) => {
  const { app, messages, advance } = fixture();
  t.after(() => app.close());

  const first = await requestCode(app);
  const second = await requestCode(app, 'user@example.com');
  assert.equal(second.statusCode, 202);
  assert.equal(second.json().challengeId, first.json().challengeId);
  assert.equal(messages.length, 1);

  advance(baseConfig.otpCooldownMs + 1);
  const third = await requestCode(app);
  assert.notEqual(third.json().challengeId, first.json().challengeId);
  assert.equal(messages.length, 2);

  const superseded = await login(app, first.json().challengeId, codeFrom(messages, 0));
  assert.equal(superseded.statusCode, 401);
  const current = await login(app, third.json().challengeId, codeFrom(messages, 1));
  assert.equal(current.statusCode, 201);
});

test('发码总量受全局窗口限制，窗口结束后恢复', async (t) => {
  let clock = Date.parse('2026-07-14T00:00:00.000Z');
  const messages = [];
  const db = openDatabase(':memory:');
  const app = buildApp({
    config: { ...baseConfig, otpGlobalMaxRequests: 2 },
    db,
    mailer: { async sendLoginCode(message) { messages.push(message); } },
    now: () => clock
  });
  t.after(() => app.close());

  assert.equal((await requestCode(app, 'first@example.com')).statusCode, 202);
  assert.equal((await requestCode(app, 'second@example.com')).statusCode, 202);
  const limited = await requestCode(app, 'third@example.com');
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.headers['retry-after'], '60');
  assert.equal(limited.json().error, 'rate_limited');
  assert.equal(messages.length, 2);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM login_challenges').get().count, 2);

  clock += baseConfig.otpGlobalWindowMs + 1;
  assert.equal((await requestCode(app, 'third@example.com')).statusCode, 202);
  assert.equal(messages.length, 3);
});

test('并发发码也不能越过全局上限', async (t) => {
  const deliveries = [];
  const app = buildApp({
    config: { ...baseConfig, otpGlobalMaxRequests: 2 },
    db: openDatabase(':memory:'),
    mailer: {
      sendLoginCode() {
        return new Promise((resolve) => deliveries.push(resolve));
      }
    }
  });
  t.after(() => app.close());

  const pending = Array.from(
    { length: 5 },
    (_, index) => requestCode(app, `parallel-${index}@example.com`)
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(deliveries.length, 2);
  deliveries.forEach((resolve) => resolve());
  const responses = await Promise.all(pending);
  assert.deepEqual(
    responses.map(({ statusCode }) => statusCode).sort(),
    [202, 202, 429, 429, 429]
  );
});

test('已消费和已过期的验证码记录会在限流窗口后清理', async (t) => {
  const { app, db, messages, advance } = fixture();
  t.after(() => app.close());

  const consumed = await requestCode(app, 'consumed@example.com');
  assert.equal(
    (await login(app, consumed.json().challengeId, messages[0].code)).statusCode,
    201
  );
  await requestCode(app, 'expired@example.com');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM login_challenges').get().count, 2);

  advance(baseConfig.otpTtlMs + 1);
  await requestCode(app, 'current@example.com');
  assert.deepEqual(
    db.prepare('SELECT email FROM login_challenges ORDER BY email').all().map(({ email }) => ({ email })),
    [{ email: 'current@example.com' }]
  );
});

test('同一账号可多设备登录，退出一个会话不影响另一个', async (t) => {
  const { app, messages, advance } = fixture();
  t.after(() => app.close());

  const firstChallenge = await requestCode(app);
  const firstLogin = await login(app, firstChallenge.json().challengeId, codeFrom(messages, 0));
  advance(baseConfig.otpCooldownMs + 1);
  const secondChallenge = await requestCode(app);
  const secondLogin = await login(app, secondChallenge.json().challengeId, codeFrom(messages, 1));
  const firstToken = firstLogin.json().token;
  const secondToken = secondLogin.json().token;

  assert.equal(firstLogin.json().account.id, secondLogin.json().account.id);
  assert.notEqual(firstLogin.json().session.id, secondLogin.json().session.id);

  await app.inject({
    method: 'DELETE', url: '/auth/session', headers: { authorization: `Bearer ${firstToken}` }
  });
  const firstCheck = await app.inject({
    method: 'GET', url: '/auth/session', headers: { authorization: `Bearer ${firstToken}` }
  });
  const secondCheck = await app.inject({
    method: 'GET', url: '/auth/session', headers: { authorization: `Bearer ${secondToken}` }
  });
  assert.equal(firstCheck.statusCode, 401);
  assert.equal(secondCheck.statusCode, 200);
});

test('可查看当前账号的已登录设备并远程退出指定设备', async (t) => {
  const { app, messages, advance } = fixture();
  t.after(() => app.close());

  const firstChallenge = await requestCode(app);
  const firstLogin = await login(app, firstChallenge.json().challengeId, codeFrom(messages, 0));
  advance(baseConfig.otpCooldownMs + 1);
  const secondChallenge = await requestCode(app);
  const secondLogin = await login(app, secondChallenge.json().challengeId, codeFrom(messages, 1));
  const first = firstLogin.json();
  const second = secondLogin.json();

  const listed = await app.inject({
    method: 'GET',
    url: '/auth/sessions',
    headers: { authorization: `Bearer ${second.token}` }
  });
  assert.equal(listed.statusCode, 200);
  assert.deepEqual(listed.json().sessions, [
    {
      id: second.session.id,
      createdAt: '2026-07-14T00:01:00.001Z',
      expiresAt: '2026-08-13T00:01:00.001Z',
      current: true
    },
    {
      id: first.session.id,
      createdAt: '2026-07-14T00:00:00.000Z',
      expiresAt: '2026-08-13T00:00:00.000Z',
      current: false
    }
  ]);

  const revoked = await app.inject({
    method: 'DELETE',
    url: `/auth/sessions/${first.session.id}`,
    headers: { authorization: `Bearer ${second.token}` }
  });
  assert.equal(revoked.statusCode, 204);

  const firstAfterRevoke = await app.inject({
    method: 'GET', url: '/auth/session', headers: { authorization: `Bearer ${first.token}` }
  });
  assert.equal(firstAfterRevoke.statusCode, 401);

  const listedAfterRevoke = await app.inject({
    method: 'GET', url: '/auth/sessions', headers: { authorization: `Bearer ${second.token}` }
  });
  assert.deepEqual(listedAfterRevoke.json().sessions.map(({ id }) => id), [second.session.id]);
});

test('设备接口要求登录且不能查看或退出其他账号的会话', async (t) => {
  const { app, messages, advance } = fixture();
  t.after(() => app.close());

  const firstChallenge = await requestCode(app, 'first@example.com');
  const firstLogin = await login(app, firstChallenge.json().challengeId, codeFrom(messages, 0));
  advance(baseConfig.otpCooldownMs + 1);
  const secondChallenge = await requestCode(app, 'second@example.com');
  const secondLogin = await login(app, secondChallenge.json().challengeId, codeFrom(messages, 1));

  const anonymousList = await app.inject({ method: 'GET', url: '/auth/sessions' });
  assert.equal(anonymousList.statusCode, 401);
  const anonymousDelete = await app.inject({
    method: 'DELETE', url: `/auth/sessions/${firstLogin.json().session.id}`
  });
  assert.equal(anonymousDelete.statusCode, 401);

  const crossAccountDelete = await app.inject({
    method: 'DELETE',
    url: `/auth/sessions/${secondLogin.json().session.id}`,
    headers: { authorization: `Bearer ${firstLogin.json().token}` }
  });
  assert.equal(crossAccountDelete.statusCode, 404);

  const duplicateDelete = await app.inject({
    method: 'DELETE',
    url: '/auth/sessions/missing-session',
    headers: { authorization: `Bearer ${firstLogin.json().token}` }
  });
  assert.equal(duplicateDelete.statusCode, 404);
  assert.deepEqual(duplicateDelete.json(), crossAccountDelete.json());

  const secondStillActive = await app.inject({
    method: 'GET',
    url: '/auth/session',
    headers: { authorization: `Bearer ${secondLogin.json().token}` }
  });
  assert.equal(secondStillActive.statusCode, 200);
});

test('可通过设备接口退出当前设备，且已失效会话不会列出', async (t) => {
  const { app, messages, advance } = fixture();
  t.after(() => app.close());

  const oldChallenge = await requestCode(app);
  const oldLogin = await login(app, oldChallenge.json().challengeId, codeFrom(messages, 0));
  advance(baseConfig.sessionTtlMs - 1);
  const currentChallenge = await requestCode(app);
  const currentLogin = await login(app, currentChallenge.json().challengeId, codeFrom(messages, 1));
  advance(1);

  const listed = await app.inject({
    method: 'GET',
    url: '/auth/sessions',
    headers: { authorization: `Bearer ${currentLogin.json().token}` }
  });
  assert.deepEqual(listed.json().sessions.map(({ id }) => id), [currentLogin.json().session.id]);

  const revokeCurrent = await app.inject({
    method: 'DELETE',
    url: `/auth/sessions/${currentLogin.json().session.id}`,
    headers: { authorization: `Bearer ${currentLogin.json().token}` }
  });
  assert.equal(revokeCurrent.statusCode, 204);
  const afterRevoke = await app.inject({
    method: 'GET',
    url: '/auth/sessions',
    headers: { authorization: `Bearer ${currentLogin.json().token}` }
  });
  assert.equal(afterRevoke.statusCode, 401);
  assert.ok(oldLogin.json().session.id);
});

test('会话到期后失效，非法输入被拒绝', async (t) => {
  const { app, messages, advance } = fixture();
  t.after(() => app.close());

  const invalidEmails = ['', 'missing-at.example.com', 'a@b', 42];
  for (const email of invalidEmails) {
    const response = await requestCode(app, email);
    assert.equal(response.statusCode, 400);
  }

  const requested = await requestCode(app);
  const authenticated = await login(app, requested.json().challengeId, codeFrom(messages));
  advance(baseConfig.sessionTtlMs);
  const response = await app.inject({
    method: 'GET',
    url: '/auth/session',
    headers: { authorization: `Bearer ${authenticated.json().token}` }
  });
  assert.equal(response.statusCode, 401);
});

test('服务重启后仍可从 SQLite 校验登录态', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'auth-test-'));
  const databasePath = path.join(directory, 'auth.sqlite');
  const messages = [];
  const mailer = { async sendLoginCode(message) { messages.push(message); } };
  const persistentConfig = { ...baseConfig, databasePath };

  const firstApp = buildApp({ config: persistentConfig, mailer });
  const requested = await requestCode(firstApp, 'persistent@example.com');
  const authenticated = await login(firstApp, requested.json().challengeId, codeFrom(messages));
  const token = authenticated.json().token;
  await firstApp.close();

  const restartedApp = buildApp({ config: persistentConfig, mailer });
  t.after(async () => {
    await restartedApp.close();
    await rm(directory, { recursive: true, force: true });
  });
  const checked = await restartedApp.inject({
    method: 'GET', url: '/auth/session', headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(checked.statusCode, 200);
  assert.equal(checked.json().account.email, 'persistent@example.com');
});
