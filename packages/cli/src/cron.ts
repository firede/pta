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

export async function cronList(io: CliIO): Promise<number> {
  const paths = resolveGlobalPaths();
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
      `${entry.id}：[${entry.schedule}] ${entry.action} ${entry.repository}${extras.length > 0 ? `（${extras.join('、')}）` : ''}\n  下次唤醒：${next === undefined ? '不可达' : formatLocalMinute(next)}\n`,
    );
  }
  return 0;
}

export type CronFields = Readonly<{
  repo?: string;
  agent?: string;
  prompt?: string;
}>;

export async function cronCreate(
  id: string,
  schedule: string,
  action: CronAction,
  fields: CronFields,
  io: CliIO,
  cwd: string,
): Promise<number> {
  const paths = resolveGlobalPaths();
  const repository = fields.repo ?? (await defaultRepository(cwd));
  if (repository === undefined) {
    io.stderr('当前目录不在 Git 仓库内，请用 --repo 指定仓库路径或 all。\n');
    return 2;
  }
  const crontab = await readCrontab(paths);
  if (refuseOnProblems(crontab, io)) return 2;
  const entry: CronEntry = {
    id,
    schedule,
    action,
    repository,
    ...(fields.agent === undefined ? {} : { agent: fields.agent }),
    ...(fields.prompt === undefined ? {} : { prompt: fields.prompt }),
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

export async function cronEdit(
  id: string,
  fields: CronFields & Readonly<{ schedule?: string }>,
  io: CliIO,
): Promise<number> {
  if (
    fields.schedule === undefined &&
    fields.repo === undefined &&
    fields.agent === undefined &&
    fields.prompt === undefined
  ) {
    io.stderr('至少提供一个要修改的旗标：--schedule、--repo、--agent 或 --prompt。\n');
    return 2;
  }
  const paths = resolveGlobalPaths();
  const crontab = await readCrontab(paths);
  if (refuseOnProblems(crontab, io)) return 2;
  const existing = crontab.entries.find((entry) => entry.id === id);
  if (existing === undefined) {
    io.stderr(`未找到 cron 条目：${id}\n`);
    return 2;
  }
  const updated: CronEntry = {
    ...existing,
    ...(fields.schedule === undefined ? {} : { schedule: fields.schedule }),
    ...(fields.repo === undefined ? {} : { repository: fields.repo }),
    ...(fields.agent === undefined ? {} : { agent: fields.agent }),
    ...(fields.prompt === undefined ? {} : { prompt: fields.prompt }),
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
  await audit(io, 'cron-edit', { id });
  io.stdout(`已更新 cron 条目 ${id}。\n`);
  return 0;
}

export async function cronDelete(id: string, io: CliIO): Promise<number> {
  const paths = resolveGlobalPaths();
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

export async function cronRun(id: string, io: CliIO): Promise<number> {
  const paths = resolveGlobalPaths();
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
