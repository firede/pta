import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { buildAgentInvocation, runAgentTask } from '../src/agents.ts';
import { defaultDaemonPort, loadGlobalConfig } from '../src/config.ts';
import { isServiceNotLoadedError, readDaemonState, writeDaemonState } from '../src/daemon.ts';
import {
  derivationCacheStats,
  derivationFilePath,
  gcDerivations,
  readDerivation,
  writeDerivation,
  type EntryLocator,
} from '../src/derivations.ts';
import { readRepositories, recordRepository } from '../src/repositories.ts';
import { appendLogRecord, readLogRecords } from '../src/log.ts';
import { cronMatches, nextCronOccurrence, parseCronSchedule } from '../src/cron.ts';
import { readCrontab, validateCronEntry, writeCrontab } from '../src/crontab.ts';
import { resolveGlobalPaths, type GlobalPaths } from '../src/paths.ts';

async function temporaryPaths(): Promise<{ paths: GlobalPaths; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(join(tmpdir(), 'pta-mgmt-'));
  return {
    paths: {
      configDir: join(root, 'config', 'pta'),
      cacheDir: join(root, 'cache', 'pta'),
      stateDir: join(root, 'state', 'pta'),
    },
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

test('resolveGlobalPaths 按 XDG 变量解析并回退 HOME 约定', () => {
  const fallback = resolveGlobalPaths({ HOME: '/home/u' });
  assert.equal(fallback.configDir, '/home/u/.config/pta');
  assert.equal(fallback.cacheDir, '/home/u/.cache/pta');
  assert.equal(fallback.stateDir, '/home/u/.local/state/pta');

  const explicit = resolveGlobalPaths({ HOME: '/home/u', XDG_CACHE_HOME: '/tmp/xdg-cache' });
  assert.equal(explicit.cacheDir, '/tmp/xdg-cache/pta');
});

test('loadGlobalConfig 缺省回退、解析 agents 并报告问题', async (context) => {
  const { paths, cleanup } = await temporaryPaths();
  context.after(cleanup);

  const missing = await loadGlobalConfig(paths);
  assert.equal(missing.exists, false);
  assert.equal(missing.daemonPort, defaultDaemonPort);

  await mkdir(paths.configDir, { recursive: true });
  await writeFile(
    join(paths.configDir, 'config.toml'),
    '[daemon]\nport = 8899\n\n[agents.default]\ncommand = ["node", "-e", "{prompt}"]\n\n[agents.bad]\ncommand = "not-array"\n',
  );
  const loaded = await loadGlobalConfig(paths);
  assert.equal(loaded.daemonPort, 8899);
  assert.deepEqual(loaded.agents['default']?.command, ['node', '-e', '{prompt}']);
  assert.equal(loaded.agents['default']?.timeoutSeconds, 300);
  assert.equal(loaded.agents['bad'], undefined);
  assert.match(loaded.problems.join(''), /agents\.bad\.command/u);

  await writeFile(join(paths.configDir, 'config.toml'), '[broken\n');
  const broken = await loadGlobalConfig(paths);
  assert.match(broken.problems.join(''), /无法按 TOML 1\.0 解析/u);
});

test('appendLogRecord 与 readLogRecords 往返并按时间合并', async (context) => {
  const { paths, cleanup } = await temporaryPaths();
  context.after(cleanup);

  await appendLogRecord(paths, 'cli', 'pending-add', { id: 'abc' });
  await appendLogRecord(paths, 'daemon', 'daemon-start', { port: 1 });
  await appendLogRecord(paths, 'cli', 'pending-remove');

  const records = await readLogRecords(paths, 10);
  assert.equal(records.length, 3);
  assert.deepEqual(records.map((record) => record.event).toSorted(), [
    'daemon-start',
    'pending-add',
    'pending-remove',
  ]);
  const limited = await readLogRecords(paths, 2);
  assert.equal(limited.length, 2);
});

test('buildAgentInvocation 有占位则替换，无占位走标准输入', () => {
  const substituted = buildAgentInvocation(
    { command: ['codex', 'exec', '{prompt}'], timeoutSeconds: 300 },
    '问题',
  );
  assert.deepEqual(substituted.args, ['exec', '问题']);
  assert.equal(substituted.stdin, undefined);

  const piped = buildAgentInvocation({ command: ['some-agent'], timeoutSeconds: 300 }, '问题');
  assert.deepEqual(piped.args, []);
  assert.equal(piped.stdin, '问题');
});

test('runAgentTask 捕获标准输出与失败', async () => {
  const echo = await runAgentTask(
    {
      command: ['node', '-e', 'process.stdin.pipe(process.stdout)'],
      timeoutSeconds: 30,
    },
    '你好',
    process.cwd(),
  );
  assert.equal(echo.ok, true);
  assert.equal(echo.output, '你好');

  const failed = await runAgentTask(
    { command: ['node', '-e', 'console.error("坏了"); process.exit(3)'], timeoutSeconds: 30 },
    '无',
    process.cwd(),
  );
  assert.equal(failed.ok, false);
  assert.match(failed.error ?? '', /坏了/u);
});

test('writeDerivation 与 readDerivation 按完整条目定位往返', async (context) => {
  const { paths, cleanup } = await temporaryPaths();
  context.after(cleanup);
  const locator: EntryLocator = {
    repository: 'r'.repeat(40),
    domainIdentifier: 'docs',
    fileKind: 'truth',
    contentHash: 'a'.repeat(64),
  };

  assert.equal(await readDerivation(paths, locator), undefined);
  await writeDerivation(paths, {
    locator,
    kind: 'review-clue',
    type: 'date',
    due: '2030-01',
    registeredAt: '2026-07-15T00:00:00.000Z',
    registeredBy: 'cli',
  });
  const loaded = await readDerivation(paths, locator);
  assert.equal(loaded?.type, 'date');
  assert.equal(loaded?.due, '2030-01');
});

test('推导状态不跨领域、跨仓库串用', async (context) => {
  const { paths, cleanup } = await temporaryPaths();
  context.after(cleanup);
  const locator: EntryLocator = {
    repository: 'r'.repeat(40),
    domainIdentifier: 'docs',
    fileKind: 'truth',
    contentHash: 'a'.repeat(64),
  };
  await writeDerivation(paths, {
    locator,
    kind: 'review-clue',
    type: 'condition',
    registeredAt: '2026-07-15T00:00:00.000Z',
    registeredBy: 'cli',
  });

  assert.notEqual(await readDerivation(paths, locator), undefined);
  assert.equal(await readDerivation(paths, { ...locator, domainIdentifier: 'ops' }), undefined);
  assert.equal(await readDerivation(paths, { ...locator, repository: 's'.repeat(40) }), undefined);
});

test('isServiceNotLoadedError 只把未加载类错误视为幂等成功', () => {
  assert.equal(
    isServiceNotLoadedError('launchd', 'Unload failed: 113: Could not find specified service'),
    true,
  );
  assert.equal(isServiceNotLoadedError('launchd', 'Unload failed: 5: Input/output error'), false);
  assert.equal(
    isServiceNotLoadedError(
      'systemd',
      'Failed to stop pta-daemon.service: Unit pta-daemon.service not loaded.',
    ),
    true,
  );
  assert.equal(
    isServiceNotLoadedError('systemd', 'Unit pta-daemon.service could not be found.'),
    true,
  );
  assert.equal(
    isServiceNotLoadedError('systemd', 'Failed to connect to bus: No medium found'),
    false,
  );
});

test('readDaemonState 往返并拒绝缺少令牌的旧状态', async (context) => {
  const { paths, cleanup } = await temporaryPaths();
  context.after(cleanup);
  const state = {
    pid: 4321,
    port: 7823,
    token: 't'.repeat(32),
    startedAt: '2026-07-15T00:00:00.000Z',
  };

  await writeDaemonState(paths, state);
  assert.deepEqual(await readDaemonState(paths), state);

  await writeDaemonState(paths, { ...state, token: undefined as unknown as string });
  assert.equal(await readDaemonState(paths), undefined);
});

test('recordRepository 按身份与路径去重，readRepositories 容忍缺失', async (context) => {
  const { paths, cleanup } = await temporaryPaths();
  context.after(cleanup);
  assert.deepEqual(await readRepositories(paths), []);
  await recordRepository(paths, 'aaa', '/repo/a', '2026-07-15T00:00:00Z');
  await recordRepository(paths, 'bbb', '/repo/b', '2026-07-15T00:00:01Z');
  await recordRepository(paths, 'aaa', '/repo/a-moved', '2026-07-15T00:00:02Z');
  await recordRepository(paths, 'ccc', '/repo/b', '2026-07-15T00:00:03Z');
  const records = await readRepositories(paths);
  assert.deepEqual(
    records.map((record) => [record.identity, record.root]),
    [
      ['aaa', '/repo/a-moved'],
      ['ccc', '/repo/b'],
    ],
  );
});

test('derivationCacheStats 统计条目，gcDerivations 按 mtime 回收', async (context) => {
  const { paths, cleanup } = await temporaryPaths();
  context.after(cleanup);
  const locator = (hash: string): EntryLocator => ({
    repository: 'repo',
    domainIdentifier: 'src',
    fileKind: 'truth',
    contentHash: hash,
  });
  const record = (hash: string) => ({
    locator: locator(hash),
    kind: 'review-clue' as const,
    type: 'condition' as const,
    condition: '外部条件',
    registeredAt: '2026-07-15T00:00:00Z',
    registeredBy: 'cli',
  });
  await writeDerivation(paths, record('a'.repeat(64)));
  await writeDerivation(paths, record('b'.repeat(64)));
  const stats = await derivationCacheStats(paths);
  assert.equal(stats.entries, 2);
  assert.equal(stats.bytes > 0, true);

  const old = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await utimes(derivationFilePath(paths, locator('a'.repeat(64))), old, old);
  const result = await gcDerivations(paths, 30);
  assert.deepEqual(result, { removed: 1, kept: 1 });
  assert.equal((await derivationCacheStats(paths)).entries, 1);
  assert.equal((await readDerivation(paths, locator('b'.repeat(64)))) !== undefined, true);
});

test('parseCronSchedule 解析五段表达式，cronMatches 遵循日/星期取或规则', () => {
  assert.equal(parseCronSchedule('0 3 * *'), undefined);
  assert.equal(parseCronSchedule('60 * * * *'), undefined);
  assert.equal(parseCronSchedule('a * * * *'), undefined);

  const nightly = parseCronSchedule('0 3 * * *');
  assert.ok(nightly);
  assert.equal(cronMatches(nightly, new Date(2026, 6, 15, 3, 0)), true);
  assert.equal(cronMatches(nightly, new Date(2026, 6, 15, 3, 1)), false);

  const weekdays = parseCronSchedule('*/15 9-17 * * 1-5');
  assert.ok(weekdays);
  assert.equal(cronMatches(weekdays, new Date(2026, 6, 15, 9, 30)), true);
  assert.equal(cronMatches(weekdays, new Date(2026, 6, 15, 9, 20)), false);
  assert.equal(cronMatches(weekdays, new Date(2026, 6, 19, 9, 30)), false);

  // 日与星期都受限时取或：15 号或周一皆触发
  const orRule = parseCronSchedule('0 0 15 * 1');
  assert.ok(orRule);
  assert.equal(cronMatches(orRule, new Date(2026, 6, 15, 0, 0)), true);
  assert.equal(cronMatches(orRule, new Date(2026, 6, 13, 0, 0)), true);
  assert.equal(cronMatches(orRule, new Date(2026, 6, 14, 0, 0)), false);

  const sunday = parseCronSchedule('0 0 * * 7');
  assert.ok(sunday);
  assert.equal(cronMatches(sunday, new Date(2026, 6, 19, 0, 0)), true);

  const next = nextCronOccurrence(nightly, new Date(2026, 6, 15, 3, 30));
  assert.deepEqual(next, new Date(2026, 6, 16, 3, 0));
});

test('crontab 读写往返、校验动作字段并容忍坏条目', async (context) => {
  const { paths, cleanup } = await temporaryPaths();
  context.after(cleanup);

  assert.deepEqual((await readCrontab(paths)).entries, []);
  const entries = [
    {
      id: 'nightly-derive',
      schedule: '0 3 * * *',
      action: 'derive' as const,
      repository: '/repo/a',
      agent: 'codex',
    },
    {
      id: 'daily-report',
      schedule: '30 8 * * 1-5',
      action: 'agent' as const,
      repository: '/repo/a',
      agent: 'codex',
      prompt: '编译日报',
    },
  ];
  await writeCrontab(paths, entries);
  const loaded = await readCrontab(paths);
  assert.deepEqual(loaded.entries, entries);
  assert.deepEqual(loaded.problems, []);

  assert.deepEqual(
    validateCronEntry({
      id: 'ok-floor',
      schedule: '0 * * * *',
      action: 'inspect',
      repository: 'all',
    }),
    [],
  );
  const invalid = validateCronEntry({
    id: 'Bad_Id',
    schedule: '99 * * * *',
    action: 'agent',
    repository: 'all',
  });
  assert.equal(invalid.length >= 4, true);

  await writeFile(
    join(paths.configDir, 'crontab.toml'),
    '[[cron]]\nid = "half"\nschedule = "0 3 * * *"\naction = "derive"\nrepository = "/repo/a"\n',
  );
  const tolerated = await readCrontab(paths);
  assert.deepEqual(tolerated.entries, []);
  assert.match(tolerated.problems.join(''), /derive 动作必须指定 agent/u);
});
