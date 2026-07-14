import assert from 'node:assert/strict';
import { test } from 'node:test';

import { startServer } from '../src/index.ts';

test('startServer 提供首页、健康检查与 404', async () => {
  const server = await startServer({ version: '9.9.9' }, 0);
  try {
    const health = (await (await fetch(`http://127.0.0.1:${server.port}/api/health`)).json()) as {
      status: string;
      version: string;
    };
    assert.equal(health.status, 'ok');
    assert.equal(health.version, '9.9.9');

    const index = await (await fetch(`http://127.0.0.1:${server.port}/`)).text();
    assert.match(index, /PTA Dashboard/u);
    assert.match(index, /9\.9\.9/u);

    const missing = await fetch(`http://127.0.0.1:${server.port}/nope`);
    assert.equal(missing.status, 404);
  } finally {
    await server.close();
  }
});
