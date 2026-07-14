import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { GlobalPaths } from './paths.ts';

export type LogSource = 'cli' | 'daemon';

export type LogRecord = Readonly<{
  time: string;
  source: LogSource;
  event: string;
  details?: Readonly<Record<string, unknown>>;
}>;

export function logFilePath(paths: GlobalPaths, source: LogSource): string {
  return join(paths.stateDir, 'logs', `${source}.jsonl`);
}

export async function appendLogRecord(
  paths: GlobalPaths,
  source: LogSource,
  event: string,
  details?: Readonly<Record<string, unknown>>,
): Promise<void> {
  const record: LogRecord = {
    time: new Date().toISOString(),
    source,
    event,
    ...(details === undefined ? {} : { details }),
  };
  await mkdir(join(paths.stateDir, 'logs'), { recursive: true });
  await appendFile(logFilePath(paths, source), `${JSON.stringify(record)}\n`);
}

export async function readLogRecords(paths: GlobalPaths, limit: number): Promise<LogRecord[]> {
  const records: LogRecord[] = [];
  for (const source of ['cli', 'daemon'] as const) {
    let content: string;
    try {
      content = await readFile(logFilePath(paths, source), 'utf8');
    } catch {
      continue;
    }
    for (const line of content.split('\n')) {
      if (line.trim() === '') continue;
      try {
        records.push(JSON.parse(line) as LogRecord);
      } catch {
        records.push({ time: '', source, event: '无法解析的日志行', details: { line } });
      }
    }
  }
  return records.toSorted((left, right) => left.time.localeCompare(right.time)).slice(-limit);
}
