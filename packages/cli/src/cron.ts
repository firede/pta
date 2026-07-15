import {
  loadGlobalConfig,
  nextCronOccurrence,
  parseCronSchedule,
  readCrontab,
  resolveGlobalPaths,
  validateCronEntry,
  writeCrontab,
  type CronAction,
  type CronEntry,
} from '@pta/runtime';

import { runGit } from './inspection.ts';
import { audit, type CliIO } from './management.ts';
import { executeCronEntry } from './schedule.ts';

const usage = [
  '用法：pta cron list',
  '       pta cron create <id> <cron表达式> <inspect|derive|agent> [--repo <路径|all>] [--agent <名称>] [--prompt <文本>]',
  '       pta cron update <id> [--schedule <cron表达式>] [--repo <路径|all>] [--agent <名称>] [--prompt <文本>]',
  '       pta cron delete <id>',
  '       pta cron run <id>',
  '',
].join('\n');

type Flags = Readonly<{
  schedule?: string;
  repo?: string;
  agent?: string;
  prompt?: string;
}>;

function parseFlags(args: readonly string[]): Flags | undefined {
  const flags: Record<string, string> = {};
  const names: Readonly<Record<string, string>> = {
    '--schedule': 'schedule',
    '--repo': 'repo',
    '--agent': 'agent',
    '--prompt': 'prompt',
  };
  for (let index = 0; index < args.length; index += 2) {
    const name = names[args[index] as string];
    const value = args[index + 1];
    if (name === undefined || value === undefined || flags[name] !== undefined) return undefined;
    flags[name] = value;
  }
  return flags;
}

function formatLocalMinute(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function defaultRepository(cwd: string): Promise<string | undefined> {
  try {
    return (await runGit(['rev-parse', '--show-toplevel'], cwd)).trim();
  } catch {
    return undefined;
  }
}

function refuseOnProblems(
  crontab: { problems: readonly string[]; path: string },
  io: CliIO,
): boolean {
  if (crontab.problems.length === 0) return false;
  io.stderr(
    `crontab.toml 存在无法解析或无效的条目，写操作会将其永久丢弃，已拒绝执行。先修复 ${crontab.path}：\n`,
  );
  for (const problem of crontab.problems) io.stderr(`  ${problem}\n`);
  return true;
}

export async function runCron(args: readonly string[], io: CliIO, cwd: string): Promise<number> {
  const paths = resolveGlobalPaths();
  const action = args[0];

  if (action === 'list') {
    if (args.length !== 1) {
      io.stderr(usage);
      return 2;
    }
    const crontab = await readCrontab(paths);
    for (const problem of crontab.problems) io.stderr(`提示：${problem}\n`);
    if (crontab.entries.length === 0) {
      io.stdout(`没有 cron 条目。用 pta cron create 创建，存于 ${crontab.path}\n`);
      return 0;
    }
    for (const entry of crontab.entries) {
      const schedule = parseCronSchedule(entry.schedule);
      const next = schedule === undefined ? undefined : nextCronOccurrence(schedule, new Date());
      const extras = [
        entry.agent === undefined ? [] : [`agent ${entry.agent}`],
        entry.prompt === undefined ? [] : ['prompt 已设'],
      ].flat();
      io.stdout(
        `${entry.id}：[${entry.schedule}] ${entry.action} ${entry.repository}${extras.length > 0 ? `（${extras.join('，')}）` : ''}\n  下次唤醒：${next === undefined ? '不可达' : formatLocalMinute(next)}\n`,
      );
    }
    return 0;
  }

  if (action === 'create') {
    const id = args[1];
    const schedule = args[2];
    const entryAction = args[3];
    const flags = parseFlags(args.slice(4));
    if (
      id === undefined ||
      schedule === undefined ||
      entryAction === undefined ||
      flags === undefined
    ) {
      io.stderr(usage);
      return 2;
    }
    const repository = flags.repo ?? (await defaultRepository(cwd));
    if (repository === undefined) {
      io.stderr('当前目录不在 Git 仓库内，请用 --repo 指定仓库路径或 all。\n');
      return 2;
    }
    const crontab = await readCrontab(paths);
    if (refuseOnProblems(crontab, io)) return 2;
    const entry: CronEntry = {
      id,
      schedule,
      action: entryAction as CronAction,
      repository,
      ...(flags.agent === undefined ? {} : { agent: flags.agent }),
      ...(flags.prompt === undefined ? {} : { prompt: flags.prompt }),
    };
    const problems = validateCronEntry(
      entry,
      new Set(crontab.entries.map((existing) => existing.id)),
    );
    if (problems.length > 0) {
      for (const problem of problems) io.stderr(`${problem}\n`);
      return 2;
    }
    await writeCrontab(paths, [...crontab.entries, entry]);
    await audit(io, 'cron-create', { id, schedule, action: entry.action });
    io.stdout(`已创建 cron 条目 ${id}。\n`);
    return 0;
  }

  if (action === 'update') {
    const id = args[1];
    const flags = parseFlags(args.slice(2));
    if (id === undefined || flags === undefined || Object.keys(flags).length === 0) {
      io.stderr(usage);
      return 2;
    }
    const crontab = await readCrontab(paths);
    if (refuseOnProblems(crontab, io)) return 2;
    const existing = crontab.entries.find((entry) => entry.id === id);
    if (existing === undefined) {
      io.stderr(`未找到 cron 条目：${id}\n`);
      return 2;
    }
    const updated: CronEntry = {
      ...existing,
      ...(flags.schedule === undefined ? {} : { schedule: flags.schedule }),
      ...(flags.repo === undefined ? {} : { repository: flags.repo }),
      ...(flags.agent === undefined ? {} : { agent: flags.agent }),
      ...(flags.prompt === undefined ? {} : { prompt: flags.prompt }),
    };
    const problems = validateCronEntry(updated);
    if (problems.length > 0) {
      for (const problem of problems) io.stderr(`${problem}\n`);
      return 2;
    }
    await writeCrontab(
      paths,
      crontab.entries.map((entry) => (entry.id === id ? updated : entry)),
    );
    await audit(io, 'cron-update', { id });
    io.stdout(`已更新 cron 条目 ${id}。\n`);
    return 0;
  }

  if (action === 'delete') {
    const id = args[1];
    if (id === undefined || args.length !== 2) {
      io.stderr(usage);
      return 2;
    }
    const crontab = await readCrontab(paths);
    if (refuseOnProblems(crontab, io)) return 2;
    if (!crontab.entries.some((entry) => entry.id === id)) {
      io.stderr(`未找到 cron 条目：${id}\n`);
      return 2;
    }
    await writeCrontab(
      paths,
      crontab.entries.filter((entry) => entry.id !== id),
    );
    await audit(io, 'cron-delete', { id });
    io.stdout(`已删除 cron 条目 ${id}。\n`);
    return 0;
  }

  if (action === 'run') {
    const id = args[1];
    if (id === undefined || args.length !== 2) {
      io.stderr(usage);
      return 2;
    }
    const crontab = await readCrontab(paths);
    const entry = crontab.entries.find((item) => item.id === id);
    if (entry === undefined) {
      io.stderr(`未找到 cron 条目：${id}\n`);
      return 2;
    }
    const config = await loadGlobalConfig(paths);
    const outcome = await executeCronEntry(entry, paths, config);
    await audit(io, 'cron-run', {
      id: outcome.id,
      action: outcome.action,
      trigger: 'manual',
      ok: outcome.ok,
    });
    io.stdout(`${outcome.ok ? '完成' : '失败'}：${outcome.detail}\n`);
    return outcome.ok ? 0 : 1;
  }

  io.stderr(usage);
  return 2;
}
