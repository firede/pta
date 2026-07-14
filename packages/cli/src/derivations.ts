import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { GlobalPaths } from './paths.ts';

export type ClueDerivation = Readonly<{
  contentHash: string;
  kind: 'review-clue';
  type: 'date' | 'condition';
  due?: string;
  registeredAt: string;
  registeredBy: string;
}>;

export function derivationFilePath(paths: GlobalPaths, contentHash: string): string {
  return join(paths.cacheDir, 'derivations', contentHash.slice(0, 2), `${contentHash}.json`);
}

export async function readDerivation(
  paths: GlobalPaths,
  contentHash: string,
): Promise<ClueDerivation | undefined> {
  try {
    const source = await readFile(derivationFilePath(paths, contentHash), 'utf8');
    const parsed = JSON.parse(source) as ClueDerivation;
    return parsed.contentHash === contentHash && parsed.kind === 'review-clue' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function writeDerivation(
  paths: GlobalPaths,
  derivation: ClueDerivation,
): Promise<void> {
  const file = derivationFilePath(paths, derivation.contentHash);
  await mkdir(join(file, '..'), { recursive: true });
  await writeFile(file, `${JSON.stringify(derivation, null, 2)}\n`);
}
