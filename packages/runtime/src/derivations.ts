import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { sha256 } from '@pta/core';

import type { GlobalPaths } from './paths.ts';

export type EntryLocator = Readonly<{
  repository: string;
  domainIdentifier: string;
  fileKind: string;
  contentHash: string;
}>;

export type ClueDerivation = Readonly<{
  locator: EntryLocator;
  kind: 'review-clue';
  type: 'date' | 'condition';
  due?: string;
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
