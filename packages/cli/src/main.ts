#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  discoverDomains,
  extractDomainContent,
  lintDomainContents,
  type CheckSignal,
} from '@pta/core';

export type CliIO = Readonly<{
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}>;

const processIO: CliIO = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

function domainLabel(signal: CheckSignal): string {
  const { anchor } = signal;
  const identifier = anchor.domainIdentifier;
  if (identifier !== undefined) return identifier === '' ? '.' : identifier;
  return anchor.kind === 'domain-declaration' ? anchor.declarationPath : '.';
}

function formatSignals(signals: readonly CheckSignal[]): string {
  const byDomain = new Map<string, CheckSignal[]>();
  for (const signal of signals) {
    const label = domainLabel(signal);
    const group = byDomain.get(label);
    if (group === undefined) byDomain.set(label, [signal]);
    else group.push(signal);
  }

  const sections: string[] = [];
  for (const [domain, group] of [...byDomain].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const lines = group
      .toSorted(
        (left, right) =>
          left.evidence.file.localeCompare(right.evidence.file) ||
          left.evidence.line - right.evidence.line ||
          left.category.localeCompare(right.category),
      )
      .map(
        (signal) =>
          `  [${signal.category} | ${signal.status}] ${signal.evidence.file}:${signal.evidence.line} ${signal.evidence.message}`,
      );
    sections.push(`领域 ${domain}\n${lines.join('\n')}`);
  }
  return `${sections.join('\n\n')}\n`;
}

export async function runCli(
  args: readonly string[],
  io: CliIO = processIO,
  cwd = process.cwd(),
): Promise<number> {
  if (args[0] !== 'check' || args.length > 2) {
    io.stderr('用法：pta check [仓库根]\n');
    return 2;
  }

  const repositoryRoot = resolve(cwd, args[1] ?? '.');
  const discovery = await discoverDomains(repositoryRoot);
  const contents = await Promise.all(
    discovery.domains.map((domain) => extractDomainContent(repositoryRoot, domain)),
  );
  const signals = lintDomainContents(contents);

  if (signals.length === 0) {
    io.stdout('通过：未发现核查信号。\n');
    return 0;
  }

  io.stdout(formatSignals(signals));
  return signals.some(
    (signal) =>
      signal.status === 'machine-decidable' &&
      (signal.category === 'conflict' || signal.category === 'violation'),
  )
    ? 1
    : 0;
}

async function main(): Promise<void> {
  try {
    process.exitCode = await runCli(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`pta check 失败：${message}\n`);
    process.exitCode = 2;
  }
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  await main();
}
