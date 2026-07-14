import { randomUUID } from 'node:crypto';
import net from 'node:net';

function smtpAddress(value) {
  if (/[\r\n]/.test(value)) throw new Error('Mail address contains invalid characters');
  return /<([^>]+)>/.exec(value)?.[1] ?? value;
}

function smtpSession({ host, port, timeoutMs }, connect) {
  const socket = connect({ host, port });
  socket.setEncoding('utf8');
  let buffer = '';
  const responses = [];
  const waiters = [];
  let terminalError = null;
  const timeout = setTimeout(() => {
    socket.destroy(new Error('SMTP session timed out'));
  }, timeoutMs);

  function deliver(response) {
    const waiter = waiters.shift();
    if (waiter) waiter.resolve(response);
    else responses.push(response);
  }

  function fail(error) {
    terminalError ??= error;
    while (waiters.length) waiters.shift().reject(terminalError);
  }

  socket.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\r\n');
    buffer = lines.pop();
    let response = [];
    for (const line of lines) {
      response.push(line);
      if (/^\d{3} /.test(line)) {
        deliver(response.join('\n'));
        response = [];
      }
    }
    if (response.length) buffer = `${response.join('\r\n')}\r\n${buffer}`;
  });

  socket.on('error', fail);
  socket.on('close', () => {
    clearTimeout(timeout);
    fail(new Error('SMTP connection closed before a complete response'));
  });

  function readResponse() {
    if (responses.length) return Promise.resolve(responses.shift());
    if (terminalError) return Promise.reject(terminalError);
    return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
  }

  async function expect(code) {
    const response = await readResponse();
    if (!response.startsWith(String(code))) {
      throw new Error(`SMTP expected ${code}, received: ${response}`);
    }
  }

  async function command(value, code) {
    socket.write(`${value}\r\n`);
    await expect(code);
  }

  return { socket, expect, command };
}

export function createMailer(config, connect = net.createConnection) {
  const sockets = new Set();

  return {
    async sendLoginCode({ email, code, expiresInMinutes }) {
      const session = smtpSession({
        host: config.smtpHost,
        port: config.smtpPort,
        timeoutMs: config.smtpTimeoutMs ?? 10 * 1000
      }, connect);
      sockets.add(session.socket);
      session.socket.once('close', () => sockets.delete(session.socket));
      const text = `Your login code is ${code}. It expires in ${expiresInMinutes} minutes.`;
      const message = [
        `From: ${config.mailFrom}`,
        `To: ${email}`,
        'Subject: Your login code',
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: <${randomUUID()}@auth.local>`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        text
      ].join('\r\n').replace(/^\./gm, '..');

      try {
        await session.expect(220);
        await session.command('EHLO localhost', 250);
        await session.command(`MAIL FROM:<${smtpAddress(config.mailFrom)}>`, 250);
        await session.command(`RCPT TO:<${smtpAddress(email)}>`, 250);
        await session.command('DATA', 354);
        await session.command(`${message}\r\n.`, 250);
        await session.command('QUIT', 221);
      } finally {
        session.socket.destroy();
      }
    },
    close() {
      for (const socket of sockets) socket.destroy();
    }
  };
}
