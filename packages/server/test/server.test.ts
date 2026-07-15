import assert from 'node:assert/strict';
import { test } from 'node:test';

import { startServer } from '../src/index.ts';

test('startServer 提供首页、健康检查与 404', async () => {
  const server = await startServer({ version: '9.9.9', instanceToken: 'tok-1' }, 0);
  try {
    const health = (await (await fetch(`http://127.0.0.1:${server.port}/api/health`)).json()) as {
      status: string;
      version: string;
      instanceToken?: string;
    };
    assert.equal(health.status, 'ok');
    assert.equal(health.version, '9.9.9');
    assert.equal(health.instanceToken, 'tok-1');

    const index = await (await fetch(`http://127.0.0.1:${server.port}/`)).text();
    assert.match(index, /PTA Dashboard/u);
    assert.match(index, /9\.9\.9/u);

    const missing = await fetch(`http://127.0.0.1:${server.port}/nope`);
    assert.equal(missing.status, 404);
  } finally {
    await server.close();
  }
});

test('startServer 暴露管理 API 并校验入参', async () => {
  const calls: unknown[] = [];
  const server = await startServer(
    {
      version: '9.9.9',
      api: {
        repositories: async () => [{ root: '/repo/a', identity: 'aaa', report: null }],
        logs: async (limit) => [{ time: 't', source: 'cli', event: `limit-${limit}` }],
        cron: async () => [{ id: 'nightly', schedule: '0 3 * * *', nextWakeAt: null }],
        cacheStats: async () => ({ entries: 2, bytes: 128 }),
        cacheGc: async (olderThanDays) => {
          calls.push(olderThanDays);
          return { removed: 1, kept: 1 };
        },
      },
    },
    0,
  );
  try {
    const base = `http://127.0.0.1:${server.port}`;
    const repositories = (await (await fetch(`${base}/api/repositories`)).json()) as unknown[];
    assert.equal(repositories.length, 1);

    const logs = (await (await fetch(`${base}/api/logs?limit=5`)).json()) as {
      event: string;
    }[];
    assert.equal(logs[0]?.event, 'limit-5');
    assert.equal((await fetch(`${base}/api/logs?limit=abc`)).status, 400);

    const cache = (await (await fetch(`${base}/api/cache`)).json()) as { entries: number };
    assert.equal(cache.entries, 2);

    const cron = (await (await fetch(`${base}/api/cron`)).json()) as { id: string }[];
    assert.equal(cron[0]?.id, 'nightly');

    const gc = await fetch(`${base}/api/cache/gc`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ olderThanDays: 7 }),
    });
    assert.equal(gc.status, 200);
    assert.deepEqual(await gc.json(), { removed: 1, kept: 1 });
    assert.deepEqual(calls, [7]);

    const invalidGc = await fetch(`${base}/api/cache/gc`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ olderThanDays: -1 }),
    });
    assert.equal(invalidGc.status, 400);

    const index = await (await fetch(`${base}/`)).text();
    assert.match(index, /仓库/u);
  } finally {
    await server.close();
  }
});

test('未接入 API 时管理端点返回 404，首页提示降级', async () => {
  const server = await startServer({ version: '9.9.9' }, 0);
  try {
    const base = `http://127.0.0.1:${server.port}`;
    assert.equal((await fetch(`${base}/api/repositories`)).status, 404);
    const index = await (await fetch(`${base}/`)).text();
    assert.match(index, /未接入管理数据/u);
  } finally {
    await server.close();
  }
});

test('缓存 GC 校验实例令牌与跨站来源', async () => {
  const server = await startServer(
    {
      version: '9.9.9',
      instanceToken: 'tok-3',
      api: {
        repositories: async () => [],
        logs: async () => [],
        cron: async () => [],
        cacheStats: async () => ({ entries: 0, bytes: 0 }),
        cacheGc: async () => ({ removed: 0, kept: 0 }),
      },
    },
    0,
  );
  try {
    const base = `http://127.0.0.1:${server.port}`;
    const missingToken = await fetch(`${base}/api/cache/gc`, { method: 'POST' });
    assert.equal(missingToken.status, 403);

    const crossOrigin = await fetch(`${base}/api/cache/gc`, {
      method: 'POST',
      headers: { origin: 'http://evil.example', 'x-pta-token': 'tok-3' },
    });
    assert.equal(crossOrigin.status, 403);

    const authorized = await fetch(`${base}/api/cache/gc`, {
      method: 'POST',
      headers: { origin: `http://127.0.0.1:${server.port}`, 'x-pta-token': 'tok-3' },
    });
    assert.equal(authorized.status, 200);
  } finally {
    await server.close();
  }
});
