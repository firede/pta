import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { renderIndexHtml } from '@pta/web';

export type ServerApi = Readonly<{
  repositories: () => Promise<unknown>;
  logs: (limit: number) => Promise<unknown>;
  cacheStats: () => Promise<unknown>;
  cacheGc: (olderThanDays: number) => Promise<unknown>;
}>;

export type ServerOptions = Readonly<{
  version: string;
  instanceToken?: string;
  api?: ServerApi;
}>;

export type RunningServer = Readonly<{
  port: number;
  close: () => Promise<void>;
}>;

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function handle(
  options: ServerOptions,
  startedAt: number,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const method = request.method ?? 'GET';

  if (url.pathname === '/api/health' && method === 'GET') {
    sendJson(response, 200, {
      status: 'ok',
      version: options.version,
      pid: process.pid,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      ...(options.instanceToken === undefined ? {} : { instanceToken: options.instanceToken }),
    });
    return;
  }

  const api = options.api;
  if (api !== undefined) {
    if (url.pathname === '/api/repositories' && method === 'GET') {
      sendJson(response, 200, await api.repositories());
      return;
    }
    if (url.pathname === '/api/logs' && method === 'GET') {
      const limit = Number(url.searchParams.get('limit') ?? '20');
      if (!Number.isInteger(limit) || limit <= 0 || limit > 1000) {
        sendJson(response, 400, { error: 'limit 必须是 1–1000 的整数' });
        return;
      }
      sendJson(response, 200, await api.logs(limit));
      return;
    }
    if (url.pathname === '/api/cache' && method === 'GET') {
      sendJson(response, 200, await api.cacheStats());
      return;
    }
    if (url.pathname === '/api/cache/gc' && method === 'POST') {
      let olderThanDays = 30;
      const body = await readBody(request);
      if (body.trim() !== '') {
        try {
          const parsed = JSON.parse(body) as { olderThanDays?: unknown };
          if (parsed.olderThanDays !== undefined) {
            if (
              typeof parsed.olderThanDays !== 'number' ||
              !Number.isInteger(parsed.olderThanDays) ||
              parsed.olderThanDays < 0
            ) {
              sendJson(response, 400, { error: 'olderThanDays 必须是 ≥0 的整数' });
              return;
            }
            olderThanDays = parsed.olderThanDays;
          }
        } catch {
          sendJson(response, 400, { error: '请求体必须是 JSON' });
          return;
        }
      }
      sendJson(response, 200, await api.cacheGc(olderThanDays));
      return;
    }
  }

  if ((url.pathname === '/' || url.pathname === '/index.html') && method === 'GET') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(renderIndexHtml({ version: options.version, apiAvailable: api !== undefined }));
    return;
  }
  sendJson(response, 404, { error: 'not found' });
}

export function startServer(
  options: ServerOptions,
  port: number,
  host = '127.0.0.1',
): Promise<RunningServer> {
  const startedAt = Date.now();
  const server: Server = createServer((request, response) => {
    handle(options, startedAt, request, response).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (!response.headersSent) sendJson(response, 500, { error: message });
      else response.end();
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address !== null ? address.port : port;
      resolve({
        port: actualPort,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}
