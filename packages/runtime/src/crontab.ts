import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';

import { parseCronSchedule } from './cron.ts';
import type { GlobalPaths } from './paths.ts';

export type CronAction = 'inspect' | 'derive' | 'agent';

export type CronEntry = Readonly<{
  id: string;
  schedule: string;
  action: CronAction;
  repository: string;
  agent?: string;
  prompt?: string;
}>;

export type Crontab = Readonly<{
  path: string;
  entries: readonly CronEntry[];
  problems: readonly string[];
}>;

export function crontabFilePath(paths: GlobalPaths): string {
  return join(paths.configDir, 'crontab.toml');
}

const idPattern = /^[a-z0-9][a-z0-9-]*$/u;

export function validateCronEntry(
  entry: CronEntry,
  existingIds: ReadonlySet<string> = new Set(),
): string[] {
  const problems: string[] = [];
  if (!idPattern.test(entry.id)) problems.push('id 只能使用小写字母、数字与连字符。');
  if (existingIds.has(entry.id)) problems.push(`id「${entry.id}」已存在。`);
  if (parseCronSchedule(entry.schedule) === undefined) {
    problems.push(`schedule「${entry.schedule}」不是合法的五段 cron 表达式。`);
  }
  if (entry.action !== 'inspect' && entry.action !== 'derive' && entry.action !== 'agent') {
    problems.push(`action「${String(entry.action)}」未定义，可用：inspect、derive、agent。`);
  }
  if (entry.repository !== 'all' && !isAbsolute(entry.repository)) {
    problems.push('repository 必须是绝对路径，或 all 表示注册表全部仓库。');
  }
  if (entry.action === 'inspect') {
    if (entry.agent !== undefined) problems.push('inspect 动作是零 LLM 地板，不接受 agent。');
    if (entry.prompt !== undefined) problems.push('inspect 动作不接受 prompt。');
  }
  if (entry.action === 'derive') {
    if (entry.agent === undefined) problems.push('derive 动作必须指定 agent。');
    if (entry.prompt !== undefined) problems.push('derive 动作不接受 prompt。');
  }
  if (entry.action === 'agent') {
    if (entry.agent === undefined) problems.push('agent 动作必须指定 agent。');
    if (entry.prompt === undefined || entry.prompt.trim() === '') {
      problems.push('agent 动作必须提供 prompt。');
    }
    if (entry.repository === 'all') {
      problems.push('agent 动作必须指定单个仓库：输出以任务为单位，不做跨仓库广播。');
    }
  }
  return problems;
}

function entryFrom(raw: unknown, index: number, problems: string[]): CronEntry | undefined {
  if (typeof raw !== 'object' || raw === null) {
    problems.push(`第 ${index + 1} 条 cron 条目必须是表。`);
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const required = ['id', 'schedule', 'action', 'repository'] as const;
  for (const key of required) {
    if (typeof record[key] !== 'string') {
      problems.push(`第 ${index + 1} 条 cron 条目缺少字符串字段 ${key}。`);
      return undefined;
    }
  }
  const entry: CronEntry = {
    id: record['id'] as string,
    schedule: record['schedule'] as string,
    action: record['action'] as CronAction,
    repository: record['repository'] as string,
    ...(typeof record['agent'] === 'string' ? { agent: record['agent'] } : {}),
    ...(typeof record['prompt'] === 'string' ? { prompt: record['prompt'] } : {}),
  };
  const entryProblems = validateCronEntry(entry);
  if (entryProblems.length > 0) {
    problems.push(`条目「${entry.id}」无效：${entryProblems.join('；')}`);
    return undefined;
  }
  return entry;
}

export async function readCrontab(paths: GlobalPaths): Promise<Crontab> {
  const path = crontabFilePath(paths);
  let source: string;
  try {
    source = await readFile(path, 'utf8');
  } catch {
    return { path, entries: [], problems: [] };
  }
  const problems: string[] = [];
  let parsed: unknown;
  try {
    parsed = parseToml(source);
  } catch (error) {
    problems.push(
      `crontab.toml 无法按 TOML 1.0 解析：${error instanceof Error ? error.message : String(error)}`,
    );
    return { path, entries: [], problems };
  }
  const list = (parsed as Record<string, unknown>)['cron'];
  if (list === undefined) return { path, entries: [], problems };
  if (!Array.isArray(list)) {
    problems.push('crontab.toml 的 cron 字段必须是条目数组（[[cron]]）。');
    return { path, entries: [], problems };
  }
  const entries: CronEntry[] = [];
  const seen = new Set<string>();
  for (const [index, raw] of list.entries()) {
    const entry = entryFrom(raw, index, problems);
    if (entry === undefined) continue;
    if (seen.has(entry.id)) {
      problems.push(`条目 id「${entry.id}」重复，后者被忽略。`);
      continue;
    }
    seen.add(entry.id);
    entries.push(entry);
  }
  return { path, entries, problems };
}

export async function writeCrontab(
  paths: GlobalPaths,
  entries: readonly CronEntry[],
): Promise<void> {
  const path = crontabFilePath(paths);
  await mkdir(join(path, '..'), { recursive: true });
  const payload = { cron: entries.map((entry) => ({ ...entry })) };
  await writeFile(path, `${stringifyToml(payload)}\n`);
}
