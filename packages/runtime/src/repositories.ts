import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { GlobalPaths } from './paths.ts';

export type RepositoryRecord = Readonly<{
  identity: string;
  root: string;
  lastSeenAt: string;
}>;

export function repositoriesFilePath(paths: GlobalPaths): string {
  return join(paths.stateDir, 'repositories.json');
}

function isRepositoryRecord(value: unknown): value is RepositoryRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['identity'] === 'string' &&
    typeof record['root'] === 'string' &&
    typeof record['lastSeenAt'] === 'string'
  );
}

export async function readRepositories(paths: GlobalPaths): Promise<RepositoryRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(repositoriesFilePath(paths), 'utf8')) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isRepositoryRecord) : [];
  } catch {
    return [];
  }
}

export async function recordRepository(
  paths: GlobalPaths,
  identity: string,
  root: string,
  now: string = new Date().toISOString(),
): Promise<void> {
  const existing = await readRepositories(paths);
  // 以 root 为主键：同一仓库的多个 worktree 共享首提交身份，是并存的工作副本
  const rest = existing.filter((item) => item.root !== root);
  const records = [...rest, { identity, root, lastSeenAt: now }].toSorted((left, right) =>
    left.root.localeCompare(right.root),
  );
  const file = repositoriesFilePath(paths);
  await mkdir(join(file, '..'), { recursive: true });
  await writeFile(file, `${JSON.stringify(records, null, 2)}\n`);
}
