import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { sha256 } from '@pta/core';

import type { GlobalPaths } from './paths.ts';

export type EntryLocator = Readonly<{
  repository: string;
  domainIdentifier: string;
  fileKind: string;
  contentHash: string;
}>;

export type ConditionEvaluation = Readonly<{
  result: 'triggered' | 'not-triggered' | 'unknown';
  rationale: string;
  evaluatedAt: string;
  evaluatedBy: string;
}>;

export type ClueDerivation = Readonly<{
  locator: EntryLocator;
  kind: 'review-clue';
  type: 'date' | 'condition' | 'none';
  due?: string;
  condition?: string;
  evaluation?: ConditionEvaluation;
  registeredAt: string;
  registeredBy: string;
}>;

function locatorKey(locator: EntryLocator): string {
  return sha256(
    [locator.repository, locator.domainIdentifier, locator.fileKind, locator.contentHash].join(
      '\n',
    ),
  );
}

function sameLocator(left: EntryLocator, right: EntryLocator): boolean {
  return (
    left.repository === right.repository &&
    left.domainIdentifier === right.domainIdentifier &&
    left.fileKind === right.fileKind &&
    left.contentHash === right.contentHash
  );
}

export function derivationFilePath(paths: GlobalPaths, locator: EntryLocator): string {
  const key = locatorKey(locator);
  return join(paths.cacheDir, 'derivations', key.slice(0, 2), `${key}.json`);
}

export async function readDerivation(
  paths: GlobalPaths,
  locator: EntryLocator,
): Promise<ClueDerivation | undefined> {
  try {
    const source = await readFile(derivationFilePath(paths, locator), 'utf8');
    const parsed = JSON.parse(source) as ClueDerivation;
    return parsed.kind === 'review-clue' && sameLocator(parsed.locator, locator)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

export async function writeDerivation(
  paths: GlobalPaths,
  derivation: ClueDerivation,
): Promise<void> {
  const file = derivationFilePath(paths, derivation.locator);
  await mkdir(join(file, '..'), { recursive: true });
  await writeFile(file, `${JSON.stringify(derivation, null, 2)}\n`);
}

export type DerivationCacheStats = Readonly<{
  entries: number;
  bytes: number;
}>;

async function derivationFiles(paths: GlobalPaths): Promise<string[]> {
  const root = join(paths.cacheDir, 'derivations');
  let prefixes: string[];
  try {
    prefixes = await readdir(root);
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const prefix of prefixes) {
    try {
      for (const name of await readdir(join(root, prefix))) {
        if (name.endsWith('.json')) files.push(join(root, prefix, name));
      }
    } catch {
      // 前缀目录消失或不可读时跳过：缓存是可丢弃语义
    }
  }
  return files;
}

export async function derivationCacheStats(paths: GlobalPaths): Promise<DerivationCacheStats> {
  let entries = 0;
  let bytes = 0;
  for (const file of await derivationFiles(paths)) {
    try {
      const info = await stat(file);
      entries += 1;
      bytes += info.size;
    } catch {
      // 统计间隙被删除的文件不计入
    }
  }
  return { entries, bytes };
}

export type DerivationGcResult = Readonly<{
  removed: number;
  kept: number;
}>;

export async function gcDerivations(
  paths: GlobalPaths,
  olderThanDays: number,
  now: number = Date.now(),
): Promise<DerivationGcResult> {
  const threshold = now - olderThanDays * 24 * 60 * 60 * 1000;
  let removed = 0;
  let kept = 0;
  for (const file of await derivationFiles(paths)) {
    try {
      const info = await stat(file);
      if (info.mtimeMs < threshold) {
        await rm(file, { force: true });
        removed += 1;
      } else {
        kept += 1;
      }
    } catch {
      // 处理间隙被删除的文件视作已回收
    }
  }
  return { removed, kept };
}
