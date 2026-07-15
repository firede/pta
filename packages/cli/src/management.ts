import { execFile, spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { startServer } from '@pta/server';

import {
  appendLogRecord,
  clearDaemonState,
  daemonStateFilePath,
  installedServiceManager,
  isProcessAlive,
  isServiceNotLoadedError,
  launchdPlistPath,
  loadGlobalConfig,
  newInstanceToken,
  readDaemonState,
  readLogRecords,
  renderLaunchdPlist,
  renderSystemdUnit,
  resolveGlobalPaths,
  runAgentTask,
  systemdUnitPath,
  verifiedDaemonState,
  verifyDaemonToken,
  writeDaemonState,
} from '@pta/runtime';

export type CliIO = Readonly<{
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}>;

const cliMainPath = fileURLToPath(new URL('./main.ts', import.meta.url));

export async function cliVersion(): Promise<string> {
  try {
    const source = await readFile(new URL('../package.json', import.meta.url), 'utf8');
    const parsed = JSON.parse(source) as { version?: string };
    return parsed.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export async function audit(
  io: CliIO,
  event: string,
  details?: Readonly<Record<string, unknown>>,
): Promise<void> {
  try {
    await appendLogRecord(resolveGlobalPaths(), 'cli', event, details);
  } catch {
    io.stderr('提示：行为日志写入失败。\n');
  }
}

function run(
  command: string,
  args: readonly string[],
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(command, [...args], { encoding: 'utf8' }, (error, stdout, stderr) => {
      resolve({ ok: error === null, stdout, stderr });
    });
  });
}

function openUrl(url: string): void {
  if (process.platform === 'darwin') execFile('open', [url], () => {});
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function daemonRun(io: CliIO): Promise<number> {
  const paths = resolveGlobalPaths();
  const config = await loadGlobalConfig(paths);
  const version = await cliVersion();
  const token = newInstanceToken();
  let server;
  try {
    server = await startServer({ version, instanceToken: token }, config.daemonPort);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`守护进程启动失败：${message}\n`);
    return 2;
  }
  await writeDaemonState(paths, {
    pid: process.pid,
    port: server.port,
    token,
    startedAt: new Date().toISOString(),
  });
  await appendLogRecord(paths, 'daemon', 'daemon-start', { pid: process.pid, port: server.port });
  const shutdown = (): void => {
    void (async () => {
      await server.close();
      await appendLogRecord(paths, 'daemon', 'daemon-stop', { pid: process.pid });
      await clearDaemonState(paths);
      process.exit(0);
    })();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  io.stdout(`守护进程运行中：http://127.0.0.1:${server.port}/（pid ${process.pid}）\n`);
  return 0;
}

async function daemonStart(io: CliIO): Promise<number> {
  const paths = resolveGlobalPaths();
  const existing = await verifiedDaemonState(paths);
  if (existing !== undefined) {
    io.stdout(`守护进程已在运行：http://127.0.0.1:${existing.port}/（pid ${existing.pid}）\n`);
    return 0;
  }
  await clearDaemonState(paths);
  const manager = await installedServiceManager(process.env['HOME'] ?? '');
  if (manager === 'launchd') {
    await run('launchctl', ['load', '-w', launchdPlistPath(process.env['HOME'] ?? '')]);
  } else if (manager === 'systemd') {
    await run('systemctl', ['--user', 'start', 'pta-daemon']);
  } else {
    const child = spawn(process.execPath, [cliMainPath, 'daemon', 'run'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await sleep(100);
    const state = await verifiedDaemonState(paths);
    if (state !== undefined) {
      const via = manager === undefined ? '' : `（经 ${manager}）`;
      io.stdout(`守护进程已启动${via}：http://127.0.0.1:${state.port}/（pid ${state.pid}）\n`);
      return 0;
    }
  }
  io.stderr('守护进程未能在预期时间内启动，可运行 pta daemon run 前台排查。\n');
  return 2;
}

async function daemonStop(io: CliIO): Promise<number> {
  const paths = resolveGlobalPaths();
  const state = await readDaemonState(paths);
  const home = process.env['HOME'] ?? '';
  const manager = await installedServiceManager(home);
  if (manager !== undefined) {
    const result =
      manager === 'launchd'
        ? await run('launchctl', ['unload', launchdPlistPath(home)])
        : await run('systemctl', ['--user', 'stop', 'pta-daemon']);
    if (!result.ok) {
      const detail = result.stderr.trim();
      if (isServiceNotLoadedError(manager, detail)) {
        await clearDaemonState(paths);
        io.stdout('守护进程未在运行。\n');
        return 0;
      }
      let diagnostic = '';
      if (state !== undefined && (await verifyDaemonToken(state))) {
        diagnostic = `，守护进程仍在响应（端口 ${state.port}）`;
      }
      io.stderr(`${manager} 停止命令失败：${detail}${diagnostic}\n`);
      return 2;
    }
    // legacy launchctl unload 失败时也可能退出 0，停没停以令牌端点消失为准
    if (state !== undefined) {
      let responding = await verifyDaemonToken(state);
      for (let attempt = 0; attempt < 20 && responding; attempt += 1) {
        await sleep(100);
        responding = await verifyDaemonToken(state);
      }
      if (responding) {
        io.stderr(`已通知 ${manager} 停止，但守护进程仍在响应（端口 ${state.port}）。\n`);
        return 2;
      }
      await clearDaemonState(paths);
      io.stdout(`守护进程已停止（经 ${manager}）。\n`);
      return 0;
    }
    await clearDaemonState(paths);
    io.stdout(`已通知 ${manager} 停止。\n`);
    return 0;
  }
  if (state === undefined || !isProcessAlive(state.pid)) {
    await clearDaemonState(paths);
    io.stdout('守护进程未在运行。\n');
    return 0;
  }
  if (!(await verifyDaemonToken(state))) {
    io.stderr(
      `pid ${state.pid} 未通过身份核验（进程存活但健康端点未返回匹配令牌，可能是 PID 被系统复用或守护进程无响应），未发送信号。\n确认无守护进程在运行后，可删除状态文件：${daemonStateFilePath(paths)}\n`,
    );
    return 2;
  }
  process.kill(state.pid, 'SIGTERM');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await sleep(100);
    if (!isProcessAlive(state.pid)) {
      await clearDaemonState(paths);
      io.stdout(`守护进程已停止（pid ${state.pid}）。\n`);
      return 0;
    }
  }
  io.stderr(`守护进程未响应终止信号（pid ${state.pid}）。\n`);
  return 2;
}

async function daemonStatus(io: CliIO): Promise<number> {
  const paths = resolveGlobalPaths();
  const manager = await installedServiceManager(process.env['HOME'] ?? '');
  const managed = manager === undefined ? '' : `（由 ${manager} 管理）`;
  const state = await verifiedDaemonState(paths);
  if (state !== undefined) {
    io.stdout(
      `运行中${managed}：pid ${state.pid}，端口 ${state.port}，启动于 ${state.startedAt}\n地址：http://127.0.0.1:${state.port}/\n`,
    );
    return 0;
  }
  io.stdout(`未运行${managed}。\n`);
  return 1;
}

async function daemonInstall(io: CliIO): Promise<number> {
  const paths = resolveGlobalPaths();
  const home = process.env['HOME'] ?? '';
  const logDir = join(paths.stateDir, 'logs');
  await mkdir(logDir, { recursive: true });
  if (process.platform === 'darwin') {
    const plist = launchdPlistPath(home);
    await mkdir(join(plist, '..'), { recursive: true });
    await writeFile(plist, renderLaunchdPlist(process.execPath, cliMainPath, logDir));
    const result = await run('launchctl', ['load', '-w', plist]);
    if (!result.ok) {
      io.stderr(`launchctl 加载失败：${result.stderr.trim()}\n`);
      return 2;
    }
    await audit(io, 'daemon-install', { platform: 'darwin', plist });
    io.stdout(`已安装为登录守护进程：${plist}\n`);
    return 0;
  }
  if (process.platform === 'linux') {
    const unit = systemdUnitPath(home);
    await mkdir(join(unit, '..'), { recursive: true });
    await writeFile(unit, renderSystemdUnit(process.execPath, cliMainPath));
    const reload = await run('systemctl', ['--user', 'daemon-reload']);
    const enable = await run('systemctl', ['--user', 'enable', '--now', 'pta-daemon']);
    if (!reload.ok || !enable.ok) {
      io.stderr(`systemctl 配置失败：${(reload.stderr + enable.stderr).trim()}\n`);
      return 2;
    }
    await audit(io, 'daemon-install', { platform: 'linux', unit });
    io.stdout(`已安装为用户级 systemd 服务：${unit}\n`);
    return 0;
  }
  io.stderr(`暂不支持在 ${process.platform} 上安装守护进程。\n`);
  return 2;
}

async function daemonUninstall(io: CliIO): Promise<number> {
  const home = process.env['HOME'] ?? '';
  if (process.platform === 'darwin') {
    const plist = launchdPlistPath(home);
    await run('launchctl', ['unload', '-w', plist]);
    await rm(plist, { force: true });
    await audit(io, 'daemon-uninstall', { platform: 'darwin' });
    io.stdout('已卸载登录守护进程。\n');
    return 0;
  }
  if (process.platform === 'linux') {
    await run('systemctl', ['--user', 'disable', '--now', 'pta-daemon']);
    await rm(systemdUnitPath(home), { force: true });
    await run('systemctl', ['--user', 'daemon-reload']);
    await audit(io, 'daemon-uninstall', { platform: 'linux' });
    io.stdout('已卸载用户级 systemd 服务。\n');
    return 0;
  }
  io.stderr(`暂不支持在 ${process.platform} 上卸载守护进程。\n`);
  return 2;
}

export async function runDaemon(args: readonly string[], io: CliIO): Promise<number> {
  const action = args[0];
  if (args.length !== 1) {
    io.stderr('用法：pta daemon <install|uninstall|status|start|stop|restart|run>\n');
    return 2;
  }
  switch (action) {
    case 'run':
      return daemonRun(io);
    case 'start':
      return daemonStart(io);
    case 'stop':
      return daemonStop(io);
    case 'status':
      return daemonStatus(io);
    case 'restart': {
      const stopped = await daemonStop(io);
      if (stopped !== 0) return stopped;
      return daemonStart(io);
    }
    case 'install':
      return daemonInstall(io);
    case 'uninstall':
      return daemonUninstall(io);
    default:
      io.stderr('用法：pta daemon <install|uninstall|status|start|stop|restart|run>\n');
      return 2;
  }
}

export async function runDashboard(io: CliIO): Promise<number> {
  const paths = resolveGlobalPaths();
  const state = await verifiedDaemonState(paths);
  if (state !== undefined) {
    const url = `http://127.0.0.1:${state.port}/`;
    io.stdout(`管理界面：${url}\n`);
    openUrl(url);
    return 0;
  }
  const config = await loadGlobalConfig(paths);
  const version = await cliVersion();
  let server;
  try {
    server = await startServer({ version }, config.daemonPort);
  } catch {
    server = await startServer({ version }, 0);
  }
  const url = `http://127.0.0.1:${server.port}/`;
  io.stdout(
    `守护进程未运行，已启动临时服务：${url}（按 Ctrl-C 结束；长期使用见 pta daemon install）\n`,
  );
  openUrl(url);
  return 0;
}

export async function runLogs(args: readonly string[], io: CliIO): Promise<number> {
  if (args.length > 1) {
    io.stderr('用法：pta logs [数量]\n');
    return 2;
  }
  let limit = 20;
  if (args[0] !== undefined) {
    limit = Number(args[0]);
    if (!Number.isInteger(limit) || limit <= 0) {
      io.stderr('用法：pta logs [数量]\n');
      return 2;
    }
  }
  const records = await readLogRecords(resolveGlobalPaths(), limit);
  if (records.length === 0) {
    io.stdout('暂无日志。\n');
    return 0;
  }
  for (const record of records) {
    const details = record.details === undefined ? '' : ` ${JSON.stringify(record.details)}`;
    io.stdout(`${record.time} [${record.source}] ${record.event}${details}\n`);
  }
  return 0;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

export async function runAgent(args: readonly string[], io: CliIO, cwd: string): Promise<number> {
  const paths = resolveGlobalPaths();
  const config = await loadGlobalConfig(paths);
  if (args[0] === 'list') {
    if (args.length !== 1) {
      io.stderr('用法：pta agent list\n');
      return 2;
    }
    const names = Object.keys(config.agents);
    if (names.length === 0) {
      io.stdout(
        `未配置 agent。在 ${config.path} 中声明，例如：\n\n[agents.default]\ncommand = ["codex", "exec", "{prompt}"]\n`,
      );
      return 0;
    }
    for (const name of names.toSorted((left, right) => left.localeCompare(right))) {
      const agent = config.agents[name];
      if (agent === undefined) continue;
      io.stdout(`${name}：${agent.command.join(' ')}（超时 ${agent.timeoutSeconds}s）\n`);
    }
    return 0;
  }
  if (args[0] === 'run') {
    const name = args[1];
    if (name === undefined || args.length > 3) {
      io.stderr('用法：pta agent run <名称> [提示词]（缺省时从标准输入读取）\n');
      return 2;
    }
    const agent = config.agents[name];
    if (agent === undefined) {
      io.stderr(`未找到 agent：${name}（见 pta agent list）\n`);
      return 2;
    }
    const prompt = args[2] ?? (process.stdin.isTTY === true ? undefined : await readStdin());
    if (prompt === undefined || prompt.trim() === '') {
      io.stderr('提示词为空：以参数传入，或经标准输入提供。\n');
      return 2;
    }
    const result = await runAgentTask(agent, prompt, cwd);
    await audit(io, 'agent-run', { name, ok: result.ok, durationMs: result.durationMs });
    io.stdout(result.output);
    if (!result.ok) {
      io.stderr(`agent 任务失败：${result.error ?? '未知错误'}\n`);
      return 1;
    }
    return 0;
  }
  io.stderr('用法：pta agent list\n       pta agent run <名称> [提示词]\n');
  return 2;
}

export async function runDoctor(io: CliIO, cwd: string): Promise<number> {
  type Check = Readonly<{ mark: '✓' | '⚠' | '✗'; name: string; detail: string }>;
  const checks: Check[] = [];

  const nodeMajor = Number(process.version.slice(1).split('.')[0]);
  checks.push({
    mark: nodeMajor >= 24 ? '✓' : '✗',
    name: 'Node.js',
    detail: `${process.version}（要求 >=24）`,
  });

  const git = await run('git', ['--version']);
  checks.push({
    mark: git.ok ? '✓' : '✗',
    name: 'Git',
    detail: git.ok ? git.stdout.trim() : '不可用',
  });

  const paths = resolveGlobalPaths();
  try {
    await mkdir(paths.cacheDir, { recursive: true });
    await mkdir(paths.stateDir, { recursive: true });
    checks.push({ mark: '✓', name: '全局目录', detail: `${paths.cacheDir}｜${paths.stateDir}` });
  } catch (error) {
    checks.push({
      mark: '✗',
      name: '全局目录',
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  const config = await loadGlobalConfig(paths);
  checks.push({
    mark: config.problems.length === 0 ? '✓' : '✗',
    name: '全局配置',
    detail: config.exists
      ? config.problems.length === 0
        ? config.path
        : config.problems.join('；')
      : `${config.path}（未创建，使用默认值）`,
  });

  const agentCount = Object.keys(config.agents).length;
  checks.push({
    mark: agentCount > 0 ? '✓' : '⚠',
    name: 'agent 接入',
    detail: agentCount > 0 ? `已配置 ${agentCount} 个` : '未配置，语义推导只能手动注册',
  });

  const daemon = await verifiedDaemonState(paths);
  checks.push({
    mark: daemon !== undefined ? '✓' : '⚠',
    name: '守护进程',
    detail: daemon !== undefined ? `运行中（pid ${daemon.pid}，端口 ${daemon.port}）` : '未运行',
  });

  const toplevel = await run('git', ['-C', cwd, 'rev-parse', '--show-toplevel']);
  if (toplevel.ok) {
    const roots = await run('git', ['-C', cwd, 'rev-list', '--max-parents=0', 'HEAD']);
    const root = roots.ok
      ? roots.stdout.trim().split('\n').toSorted().at(0)?.slice(0, 12)
      : undefined;
    checks.push({
      mark: '✓',
      name: '当前仓库',
      detail: `${toplevel.stdout.trim()}${root === undefined ? '（无提交基线）' : `（身份 ${root}）`}`,
    });
  } else {
    checks.push({ mark: '⚠', name: '当前仓库', detail: '当前目录不在 Git 仓库内' });
  }

  for (const check of checks) io.stdout(`${check.mark} ${check.name}：${check.detail}\n`);
  const failed = checks.filter((check) => check.mark === '✗').length;
  io.stdout(
    `\n${failed === 0 ? '健康' : `发现 ${failed} 项故障`}（✓ ${checks.filter((c) => c.mark === '✓').length}，⚠ ${checks.filter((c) => c.mark === '⚠').length}，✗ ${failed}）\n`,
  );
  return failed === 0 ? 0 : 1;
}
