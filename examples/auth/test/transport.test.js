import assert from 'node:assert/strict';
import { Duplex, Readable } from 'node:stream';
import { test } from 'node:test';
import { buildApp } from '../src/app.js';
import { openDatabase } from '../src/database.js';
import { createMailer } from '../src/mailer.js';

const config = {
  authSecret: 'test-secret-that-is-at-least-32-characters',
  databasePath: ':memory:',
  otpTtlMs: 600_000,
  otpCooldownMs: 60_000,
  otpMaxAttempts: 5,
  otpGlobalWindowMs: 60_000,
  otpGlobalMaxRequests: 100,
  smtpTimeoutMs: 1_000,
  sessionTtlMs: 2_592_000_000,
};

async function httpRequest(app, { method, url, body, headers = {} }) {
  const request = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  request.method = method;
  request.url = url;
  request.headers = headers;
  return new Promise((resolve, reject) => {
    const result = { status: 0, headers: {}, body: '' };
    const reply = {
      writeHead(status, responseHeaders) {
        result.status = status;
        result.headers = responseHeaders;
      },
      end(chunk = '') {
        result.body += chunk;
        resolve(result);
      },
    };
    app.handle(request, reply).catch(reject);
  });
}

test('HTTP 适配层可完成登录态校验、设备查看和远程退出', async (t) => {
  const messages = [];
  const app = buildApp({
    config,
    db: openDatabase(':memory:'),
    mailer: {
      async sendLoginCode(message) {
        messages.push(message);
      },
      async sendEmailChangeCode(message) {
        messages.push(message);
      },
    },
  });
  t.after(() => app.close());
  const requested = await httpRequest(app, {
    method: 'POST',
    url: '/auth/code',
    headers: { 'content-type': 'application/json' },
    body: { email: 'http@example.com' },
  });
  assert.equal(requested.status, 202);

  const authenticated = await httpRequest(app, {
    method: 'POST',
    url: '/auth/session',
    headers: { 'content-type': 'application/json' },
    body: {
      challengeId: JSON.parse(requested.body).challengeId,
      code: messages[0].code,
    },
  });
  assert.equal(authenticated.status, 201);
  const { token } = JSON.parse(authenticated.body);

  const checked = await httpRequest(app, {
    method: 'GET',
    url: '/auth/session',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(checked.status, 200);
  assert.equal(JSON.parse(checked.body).account.email, 'http@example.com');

  const emailChangeRequested = await httpRequest(app, {
    method: 'POST',
    url: '/auth/email/code',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: { email: 'changed@example.com' },
  });
  assert.equal(emailChangeRequested.status, 202);
  const emailChanged = await httpRequest(app, {
    method: 'PUT',
    url: '/auth/email',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: {
      challengeId: JSON.parse(emailChangeRequested.body).challengeId,
      code: messages[1].code,
    },
  });
  assert.equal(emailChanged.status, 200);
  assert.equal(JSON.parse(emailChanged.body).account.email, 'changed@example.com');

  const listed = await httpRequest(app, {
    method: 'GET',
    url: '/auth/sessions',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(listed.status, 200);
  const [currentSession] = JSON.parse(listed.body).sessions;
  assert.equal(currentSession.current, true);

  const revoked = await httpRequest(app, {
    method: 'DELETE',
    url: `/auth/sessions/${currentSession.id}`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(revoked.status, 204);
  assert.equal(revoked.body, '');

  const afterRevoke = await httpRequest(app, {
    method: 'GET',
    url: '/auth/session',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(afterRevoke.status, 401);
});

test('SMTP 投递使用 Mailpit 支持的基础协议', async (t) => {
  let message = '';
  class FakeSmtpSocket extends Duplex {
    constructor() {
      super();
      this.buffer = '';
      this.dataMode = false;
      queueMicrotask(() => this.push('220 test-smtp ready\r\n'));
    }
    _read() {}
    _write(chunk, encoding, callback) {
      this.receive(chunk.toString());
      callback();
    }
    receive(chunk) {
      this.buffer += chunk;
      while (this.buffer.includes('\r\n')) {
        const end = this.buffer.indexOf('\r\n');
        const line = this.buffer.slice(0, end);
        this.buffer = this.buffer.slice(end + 2);
        if (this.dataMode) {
          if (line === '.') {
            this.dataMode = false;
            this.push('250 queued\r\n');
          } else {
            message += `${line}\n`;
          }
        } else if (line.startsWith('EHLO ')) {
          this.push('250-test-smtp\r\n250 8BITMIME\r\n');
        } else if (line.startsWith('MAIL FROM:') || line.startsWith('RCPT TO:')) {
          this.push('250 ok\r\n');
        } else if (line === 'DATA') {
          this.dataMode = true;
          this.push('354 send data\r\n');
        } else if (line === 'QUIT') {
          this.push('221 bye\r\n');
          this.push(null);
        }
      }
    }
  }
  const mailer = createMailer(
    {
      smtpHost: '127.0.0.1',
      smtpPort: 1025,
      mailFrom: 'login@example.test',
    },
    () => new FakeSmtpSocket(),
  );
  t.after(() => mailer.close());

  await mailer.sendLoginCode({
    email: 'mailpit@example.com',
    code: '042731',
    expiresInMinutes: 10,
  });

  assert.match(message, /To: mailpit@example\.com/);
  assert.match(message, /Your login code is 042731\./);

  message = '';
  await mailer.sendEmailChangeCode({
    email: 'new@example.com',
    code: 'A1B2C3',
    expiresInMinutes: 10,
  });
  assert.match(message, /Subject: Confirm your new email address/);
  assert.match(message, /Your email change code is A1B2C3\./);
});

test('SMTP 会话超时会结束 HTTP 请求并回滚验证码', async (t) => {
  class SilentSmtpSocket extends Duplex {
    _read() {}
    _write(chunk, encoding, callback) {
      callback();
    }
  }

  const db = openDatabase(':memory:');
  const mailer = createMailer(
    {
      smtpHost: '127.0.0.1',
      smtpPort: 1025,
      smtpTimeoutMs: 20,
      mailFrom: 'login@example.test',
    },
    () => new SilentSmtpSocket(),
  );
  const app = buildApp({ config, db, mailer });
  t.after(() => app.close());

  const result = await httpRequest(app, {
    method: 'POST',
    url: '/auth/code',
    body: { email: 'timeout@example.com' },
  });
  assert.equal(result.status, 500);
  assert.equal(JSON.parse(result.body).error, 'internal_error');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM login_challenges').get().count, 0);
});

test('邮箱更换邮件投递失败会结束 HTTP 请求并回滚验证码', async (t) => {
  const messages = [];
  const db = openDatabase(':memory:');
  const app = buildApp({
    config,
    db,
    mailer: {
      async sendLoginCode(message) {
        messages.push(message);
      },
      async sendEmailChangeCode() {
        throw new Error('delivery failed');
      },
    },
  });
  t.after(() => app.close());

  const requested = await httpRequest(app, {
    method: 'POST',
    url: '/auth/code',
    body: { email: 'before@example.com' },
  });
  const authenticated = await httpRequest(app, {
    method: 'POST',
    url: '/auth/session',
    body: {
      challengeId: JSON.parse(requested.body).challengeId,
      code: messages[0].code,
    },
  });
  const result = await httpRequest(app, {
    method: 'POST',
    url: '/auth/email/code',
    headers: { authorization: `Bearer ${JSON.parse(authenticated.body).token}` },
    body: { email: 'after@example.com' },
  });
  assert.equal(result.status, 500);
  assert.equal(JSON.parse(result.body).error, 'internal_error');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM email_change_challenges').get().count, 0);
});
