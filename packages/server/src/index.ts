import { createServer, type Server } from 'node:http';

import { renderIndexHtml } from '@pta/web';

export type ServerOptions = Readonly<{
  version: string;
  instanceToken?: string;
}>;

export type RunningServer = Readonly<{
  port: number;
  close: () => Promise<void>;
}>;

export function startServer(
  options: ServerOptions,
  port: number,
  host = '127.0.0.1',
): Promise<RunningServer> {
  const startedAt = Date.now();
  const server: Server = createServer((request, response) => {
    if (request.url === '/api/health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(
        JSON.stringify({
          status: 'ok',
          version: options.version,
          pid: process.pid,
          uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
          ...(options.instanceToken === undefined ? {} : { instanceToken: options.instanceToken }),
        }),
      );
      return;
    }
    if (request.url === '/' || request.url === '/index.html') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(renderIndexHtml({ version: options.version }));
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'not found' }));
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
