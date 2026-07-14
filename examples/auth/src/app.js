import http from 'node:http';
import { createAuthService } from './auth-service.js';
import { loadConfig } from './config.js';
import { openDatabase } from './database.js';
import { createMailer } from './mailer.js';

function bearerToken(request) {
  const authorization = request.headers.authorization;
  if (typeof authorization !== 'string') return null;
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  return match?.[1] ?? null;
}

export function buildApp(options = {}) {
  const config = options.config ?? loadConfig();
  const db = options.db ?? openDatabase(config.databasePath);
  const mailer = options.mailer ?? createMailer(config);
  const service = createAuthService({ db, mailer, config, now: options.now });
  let server;

  async function dispatch({ method, url, headers = {}, body }) {
    const request = { headers, body };
    const remoteSessionMatch = /^\/auth\/sessions\/([^/]+)$/.exec(url);

    if (method === 'GET' && url === '/health') {
      return response(200, { status: 'ok' });
    }
    if (method === 'POST' && url === '/auth/code') {
      const result = await service.requestCode(body?.email);
      if (result.kind === 'invalid-email') {
        return response(400, { error: 'invalid_request', message: 'A valid email is required.' });
      }
      if (result.kind === 'rate-limited') {
        return response(
          429,
          { error: 'rate_limited', message: 'Too many login codes have been requested.' },
          { 'retry-after': String(Math.ceil(result.retryAfterMs / 1000)) }
        );
      }
      return response(202, { challengeId: result.challengeId });
    }
    if (method === 'POST' && url === '/auth/session') {
      const result = service.verifyCode(body?.challengeId, body?.code);
      if (result.kind !== 'authenticated') {
        return response(401, { error: 'invalid_code', message: 'The login code is invalid or expired.' });
      }
      return response(201, {
        token: result.token,
        tokenType: 'Bearer',
        expiresAt: new Date(result.session.expiresAt).toISOString(),
        account: result.account,
        session: { id: result.session.id }
      });
    }
    if (method === 'GET' && url === '/auth/session') {
      const authenticated = service.authenticate(bearerToken(request));
      if (!authenticated) {
        return response(401, { error: 'unauthorized', message: 'A valid session is required.' });
      }
      return response(200, {
        account: authenticated.account,
        session: {
          id: authenticated.session.id,
          createdAt: new Date(authenticated.session.createdAt).toISOString(),
          expiresAt: new Date(authenticated.session.expiresAt).toISOString()
        }
      });
    }
    if (method === 'GET' && url === '/auth/sessions') {
      const sessions = service.listSessions(bearerToken(request));
      if (!sessions) {
        return response(401, { error: 'unauthorized', message: 'A valid session is required.' });
      }
      return response(200, {
        sessions: sessions.map((session) => ({
          id: session.id,
          createdAt: new Date(session.createdAt).toISOString(),
          expiresAt: new Date(session.expiresAt).toISOString(),
          current: session.current
        }))
      });
    }
    if (method === 'DELETE' && remoteSessionMatch) {
      const result = service.revokeSessionById(
        bearerToken(request),
        remoteSessionMatch[1]
      );
      if (result.kind === 'unauthorized') {
        return response(401, { error: 'unauthorized', message: 'A valid session is required.' });
      }
      if (result.kind === 'not-found') {
        return response(404, { error: 'session_not_found', message: 'Active session not found.' });
      }
      return response(204);
    }
    if (method === 'DELETE' && url === '/auth/session') {
      const token = bearerToken(request);
      if (!service.authenticate(token)) {
        return response(401, { error: 'unauthorized', message: 'A valid session is required.' });
      }
      service.logout(token);
      return response(204);
    }
    return response(404, { error: 'not_found', message: 'Route not found.' });
  }

  function response(statusCode, payload, extraHeaders = {}) {
    const body = payload === undefined ? '' : JSON.stringify(payload);
    return {
      statusCode,
      body,
      headers: payload === undefined
        ? extraHeaders
        : { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
      json() { return JSON.parse(body); }
    };
  }

  async function nodeHandler(request, reply) {
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 64 * 1024) {
          reply.writeHead(413, { 'content-type': 'application/json; charset=utf-8' });
          reply.end(JSON.stringify({ error: 'payload_too_large' }));
          return;
        }
        chunks.push(chunk);
      }
      let body;
      if (chunks.length) body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const result = await dispatch({
        method: request.method,
        url: new URL(request.url, 'http://localhost').pathname,
        headers: request.headers,
        body
      });
      reply.writeHead(result.statusCode, result.headers);
      reply.end(result.body);
    } catch (error) {
      const invalidJson = error instanceof SyntaxError;
      const status = invalidJson ? 400 : 500;
      if (!invalidJson && options.logger) console.error(error);
      reply.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
      reply.end(JSON.stringify({
        error: invalidJson ? 'invalid_json' : 'internal_error',
        message: invalidJson ? 'Request body must be valid JSON.' : 'An internal error occurred.'
      }));
    }
  }

  return {
    async inject({ method = 'GET', url, headers = {}, payload }) {
      const normalizedHeaders = Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
      );
      return dispatch({ method, url, headers: normalizedHeaders, body: payload });
    },
    async listen({ host, port }) {
      server = http.createServer(nodeHandler);
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, resolve);
      });
      if (options.logger) {
        const address = server.address();
        console.log(`Auth server listening on http://${host}:${address.port}`);
      }
      return server.address();
    },
    handle: nodeHandler,
    address() { return server?.address(); },
    async close() {
      if (server?.listening) {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      }
      mailer.close?.();
      db.close();
    }
  };
}
