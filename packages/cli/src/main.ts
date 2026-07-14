#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  assembleContext,
  classifyChanges,
  collectPendingEntries,
  discoverDomains,
  extractDomainContent,
  hashFileBytes,
  lintDiscoveryProblems,
  lintDomainContents,
  planPendingAddition,
  removeEntryLines,
  selectPendingEntries,
  type ChangedPath,
  type ChangeType,
  type ChangeClassification,
  type CheckSignal,
  type ContextAssembly,
  type ExtractedEntry,
  type PendingEntryRef,
} from '@pta/core';

function shortId(entry: ExtractedEntry): string {
  return entry.contentHash.slice(0, 8);
}

export type CliIO = Readonly<{
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}>;

const processIO: CliIO = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

function runGit(args: readonly string[], cwd: string): Promise<string> {
  return new Promise((resolveOutput, reject) => {
    execFile(
      'git',
      args,
      { cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error === null) resolveOutput(stdout);
        else reject(new Error(stderr.trim() || stdout.trim() || error.message));
      },
    );
  });
}

function changeType(status: string): ChangeType {
  if (status.includes('?')) return 'untracked';
  if (status.includes('R')) return 'renamed';
  if (status.includes('C')) return 'copied';
  if (status.includes('A')) return 'added';
  if (status.includes('D')) return 'deleted';
  return 'modified';
}

function parseStatus(output: string): ChangedPath[] {
  const fields = output.split('\0');
  const changes: ChangedPath[] = [];
  for (let index = 0; index < fields.length; index += 1) {
    const entry = fields[index];
    if (entry === undefined || entry === '') continue;
    const status = entry.slice(0, 2);
    const path = entry.slice(3);
    const type = changeType(status);
    if (type === 'renamed' || type === 'copied') {
      const previousPath = fields[index + 1];
      if (previousPath !== undefined && previousPath !== '') {
        if (type === 'renamed') changes.push({ path: previousPath, type: 'deleted' });
        index += 1;
      }
    }
    changes.push({ path, type });
  }
  return changes;
}

function parseDiff(output: string): ChangedPath[] {
  const fields = output.split('\0');
  const changes: ChangedPath[] = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index];
    if (status === undefined || status === '') break;
    const type = changeType(status);
    const firstPath = fields[index + 1];
    if (firstPath === undefined) break;
    if (type === 'renamed' || type === 'copied') {
      const secondPath = fields[index + 2];
      if (secondPath === undefined) break;
      if (type === 'renamed') changes.push({ path: firstPath, type: 'deleted' });
      changes.push({ path: secondPath, type });
      index += 3;
    } else {
      changes.push({ path: firstPath, type });
      index += 2;
    }
  }
  return changes;
}

async function gitChanges(repositoryRoot: string, base?: string): Promise<ChangedPath[]> {
  if (base === undefined) {
    return parseStatus(
      await runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], repositoryRoot),
    );
  }
  return parseDiff(
    await runGit(['diff', '--name-status', '-z', `${base}...HEAD`, '--'], repositoryRoot),
  );
}

function parseRepositoryFiles(output: string): string[] {
  return [...new Set(output.split('\0').filter((path) => path !== ''))].sort();
}

async function gitRepositoryFiles(repositoryRoot: string): Promise<string[]> {
  const [listed, deleted] = await Promise.all([
    runGit(['ls-files', '--cached', '--others', '--exclude-standard', '-z'], repositoryRoot),
    runGit(['ls-files', '--deleted', '-z'], repositoryRoot),
  ]);
  const deletedPaths = new Set(parseRepositoryFiles(deleted));
  return parseRepositoryFiles(listed).filter((path) => !deletedPaths.has(path));
}

function domainLabel(signal: CheckSignal): string {
  const { anchor } = signal;
  if (anchor.kind === 'project-configuration') return '.';
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

function label(identifier: string): string {
  return identifier === '' ? '.' : identifier;
}

const surfaceLabels: Readonly<Record<string, string>> = {
  'truth-records': '真相记录被触',
  implementation: '实现文件被触',
  both: '真相记录与实现文件皆被触',
  'inbox-only': '仅收件箱活动',
};

function formatChanges(result: ChangeClassification): string {
  if (result.ownership.length === 0) return '未发现变更。\n';
  const touched = new Map(result.touchedDomains.map((domain) => [domain.domainIdentifier, domain]));
  const suspicions = new Map(
    result.driftSuspicions.map((suspicion) => [suspicion.domainIdentifier, suspicion]),
  );
  const candidates = new Map(
    result.propagationCandidates.map((candidate) => [candidate.domainIdentifier, candidate]),
  );
  const identifiers = new Set([...touched.keys(), ...candidates.keys()]);
  const sections: string[] = [];
  for (const identifier of [...identifiers].sort((left, right) => left.localeCompare(right))) {
    const lines = [`领域 ${label(identifier)}`];
    const domain = touched.get(identifier);
    if (domain !== undefined) {
      lines.push(`  触面：${surfaceLabels[domain.surface]}`);
      for (const change of domain.changes) lines.push(`  变更：[${change.type}] ${change.path}`);
      const suspicion = suspicions.get(identifier);
      if (suspicion !== undefined) {
        lines.push(`  [drift suspicion | suspicion] ${suspicion.evidence}`);
      }
      if (domain.inboxChanges.length > 0) {
        lines.push(`  收件箱活动：${domain.inboxChanges.map((change) => change.path).join('、')}`);
      }
    }
    const candidate = candidates.get(identifier);
    if (candidate !== undefined) {
      for (const reason of candidate.reasons) {
        lines.push(`  [propagation | candidate] ${reason.evidence}`);
      }
    }
    if (domain !== undefined) {
      lines.push('  待裁决背景：');
      if (domain.pendingContext.length === 0) lines.push('    无');
      for (const context of domain.pendingContext) {
        for (const entry of context.entries) {
          lines.push(
            `    ${shortId(entry)} ${label(context.domainIdentifier)} PENDING.md:${entry.line} ${entry.content}`,
          );
        }
      }
    }
    sections.push(lines.join('\n'));
  }
  const uncovered = result.ownership.filter((item) => item.domainIdentifier === undefined);
  if (uncovered.length > 0) {
    sections.push(
      [
        '未覆盖',
        ...uncovered.map((item) => `  变更：[${item.change.type}] ${item.change.path}`),
      ].join('\n'),
    );
  }
  return `${sections.join('\n\n')}\n`;
}

type SourceIdentification = Readonly<{
  baseVersion?: string;
  hashedFiles: readonly Readonly<{ path: string; hash: string }>[];
}>;

function formatContext(
  assembly: ContextAssembly,
  source: SourceIdentification,
  signals: readonly CheckSignal[],
): string {
  const lines: string[] = ['# 项目真相背景', ''];
  if (source.baseVersion === undefined) {
    lines.push('来源：无提交基线，所涉内容以哈希标识');
  } else if (source.hashedFiles.length > 0) {
    lines.push(`来源：${source.baseVersion}，含未入库变更`);
  } else {
    lines.push(`来源：${source.baseVersion}`);
  }
  if (source.hashedFiles.length > 0) {
    lines.push('所涉内容哈希：');
    for (const file of source.hashedFiles) lines.push(`  ${file.path} ${file.hash}`);
  }
  lines.push(
    `范围：${
      assembly.domains.length === 0
        ? '无'
        : assembly.domains.map((domain) => `领域 ${label(domain.domainIdentifier)}`).join('、')
    }`,
  );
  lines.push('路径归属：');
  for (const resolution of assembly.resolutions) {
    lines.push(
      `  ${resolution.path === '' ? '.' : resolution.path} → ${
        resolution.domainIdentifier === undefined
          ? '未覆盖'
          : `领域 ${label(resolution.domainIdentifier)}`
      }`,
    );
  }
  if (signals.length > 0) {
    lines.push('核查提示（读取时叠加，不入产物）：');
    for (const signal of signals.toSorted(
      (left, right) =>
        left.evidence.file.localeCompare(right.evidence.file) ||
        left.evidence.line - right.evidence.line,
    )) {
      lines.push(
        `  [${signal.category} | ${signal.status}] ${signal.evidence.file}:${signal.evidence.line} ${signal.evidence.message}`,
      );
    }
  }
  for (const domain of assembly.domains) {
    lines.push('', `## 领域 ${label(domain.domainIdentifier)}`);
    const sections: readonly [string, readonly ExtractedEntry[]][] = [
      ['真相记录', domain.truthEntries],
      ['术语表', domain.glossaryEntries],
      ['残留', domain.residueEntries],
    ];
    for (const [title, entries] of sections) {
      if (entries.length === 0) continue;
      lines.push('', `### ${title}`, '');
      for (const entry of entries) lines.push(`- ${entry.content}`);
    }
    if (domain.pendingEntries.length > 0) {
      lines.push('', '### 待裁决背景', '');
      for (const entry of domain.pendingEntries) {
        lines.push(`- ${shortId(entry)} ${entry.content}`);
      }
    }
    if (domain.dependsOn.length > 0) {
      lines.push('', '### 依赖领域（未展开，可按标识另行查询）', '');
      for (const dependency of domain.dependsOn) {
        lines.push(`- ${dependency.path}：${dependency.reason}`);
      }
    }
  }
  return `${lines.join('\n')}\n`;
}

function normalizeContextPath(input: string): string {
  const normalized = posix.normalize(input.replaceAll('\\', '/'));
  const trimmed = normalized.replace(/\/+$/u, '');
  return trimmed === '.' ? '' : trimmed;
}

async function runContext(paths: readonly string[], io: CliIO, cwd: string): Promise<number> {
  const repositoryRoot = resolve(cwd);
  try {
    const repositoryFiles = await gitRepositoryFiles(repositoryRoot);
    const discovery = await discoverDomains(repositoryRoot, repositoryFiles);
    const contents = await Promise.all(
      discovery.domains.map((domain) =>
        extractDomainContent(repositoryRoot, repositoryFiles, domain),
      ),
    );
    const assembly = assembleContext(discovery, contents, paths.map(normalizeContextPath));
    const consumed = assembly.domains.flatMap((domain) => domain.consumedFiles);
    const baseVersion = await runGit(['rev-parse', 'HEAD'], repositoryRoot)
      .then((output) => output.trim())
      .catch(() => undefined);
    let targets: readonly string[] = [];
    if (consumed.length > 0) {
      if (baseVersion === undefined) {
        targets = consumed;
      } else {
        const status = await runGit(
          ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...consumed],
          repositoryRoot,
        );
        const dirty = new Set(parseStatus(status).map((change) => change.path));
        targets = consumed.filter((path) => dirty.has(path));
      }
    }
    const hashedFiles = await Promise.all(
      targets.map(async (path) => ({
        path,
        hash: hashFileBytes(await readFile(join(repositoryRoot, ...path.split('/')))),
      })),
    );
    const involved = new Set(assembly.domains.map((domain) => domain.domainIdentifier));
    const signals = lintDomainContents(
      contents.filter(
        (content) =>
          content.domain.identifier !== undefined && involved.has(content.domain.identifier),
      ),
    );
    io.stdout(
      formatContext(
        assembly,
        {
          hashedFiles,
          ...(baseVersion === undefined ? {} : { baseVersion }),
        },
        signals,
      ),
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta context 失败：${message}\n`);
    return 2;
  }
}

type PendingGroup = Readonly<{
  identifier: string;
  containerPath: string;
  entries: readonly ExtractedEntry[];
}>;

function formatPending(groups: readonly PendingGroup[]): string {
  if (groups.length === 0) return '收件箱为空：没有待裁决条目。\n';
  const sections = groups.map((group) => {
    const file = group.containerPath === '' ? 'PENDING.md' : `${group.containerPath}/PENDING.md`;
    const lines = group.entries.map(
      (entry) => `  ${shortId(entry)} ${file}:${entry.line} ${entry.content}`,
    );
    return `领域 ${label(group.identifier)}\n${lines.join('\n')}`;
  });
  const total = groups.reduce((sum, group) => sum + group.entries.length, 0);
  return `${sections.join('\n\n')}\n\n共 ${total} 条待裁决条目，分布于 ${groups.length} 个领域。\n`;
}

async function runPendingAdd(
  domainArg: string,
  text: string,
  io: CliIO,
  cwd: string,
): Promise<number> {
  const repositoryRoot = resolve(cwd);
  try {
    const repositoryFiles = await gitRepositoryFiles(repositoryRoot);
    const discovery = await discoverDomains(repositoryRoot, repositoryFiles);
    const identifier = domainArg === '.' ? '' : domainArg;
    const domain = discovery.domains.find((item) => item.identifier === identifier);
    if (domain === undefined) {
      io.stderr(`未找到领域：${domainArg}\n`);
      return 2;
    }
    const prefix = domain.containerPath === '' ? '' : `${domain.containerPath}/`;
    const filePath = `${prefix}PENDING.md`;
    const absolute = join(repositoryRoot, ...filePath.split('/'));
    const existing: string | undefined = await readFile(absolute, 'utf8').catch(() => undefined);
    const plan = planPendingAddition(existing, text);
    if (plan.kind === 'invalid') {
      io.stderr(plan.reason === 'empty' ? '条目内容为空。\n' : '条目必须是单行。\n');
      return 2;
    }
    if (plan.kind === 'duplicate') {
      io.stdout(
        `已存在同内容条目：${label(identifier)} ${plan.contentHash.slice(0, 8)} ${filePath}:${plan.line}\n`,
      );
      return 0;
    }
    if (!/[？?]/u.test(text)) {
      io.stderr('提示：待裁决条目应当以问句表述。\n');
    }
    await writeFile(absolute, plan.source);
    io.stdout(
      `已登记待裁决条目：${label(identifier)} ${plan.contentHash.slice(0, 8)} ${filePath}:${plan.line}\n`,
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta pending add 失败：${message}\n`);
    return 2;
  }
}

async function runPendingRemove(
  selectors: readonly string[],
  io: CliIO,
  cwd: string,
): Promise<number> {
  const repositoryRoot = resolve(cwd);
  try {
    const repositoryFiles = await gitRepositoryFiles(repositoryRoot);
    const discovery = await discoverDomains(repositoryRoot, repositoryFiles);
    const contents = await Promise.all(
      discovery.domains.map((domain) =>
        extractDomainContent(repositoryRoot, repositoryFiles, domain),
      ),
    );
    const selection = selectPendingEntries(collectPendingEntries(contents), selectors);
    if (selection.problems.length > 0) {
      for (const problem of selection.problems) {
        if (problem.reason === 'invalid') {
          io.stderr(`无法解析 id：${problem.selector}\n`);
        } else if (problem.reason === 'not-found') {
          io.stderr(`未匹配任何待裁决条目：${problem.selector}\n`);
        } else {
          io.stderr(`id 有歧义：${problem.selector}，候选：\n`);
          for (const candidate of problem.candidates) {
            io.stderr(
              `  ${label(candidate.domainIdentifier)}:${shortId(candidate.entry)} ${candidate.entry.content}\n`,
            );
          }
        }
      }
      io.stderr('未做任何改动。\n');
      return 2;
    }

    const byFile = new Map<string, PendingEntryRef[]>();
    for (const match of selection.matches) {
      const group = byFile.get(match.filePath);
      if (group === undefined) byFile.set(match.filePath, [match]);
      else group.push(match);
    }
    const plans: { absolute: string; filePath: string; remaining: string }[] = [];
    for (const [filePath, group] of byFile) {
      const absolute = join(repositoryRoot, ...filePath.split('/'));
      const source = await readFile(absolute, 'utf8');
      const lines = source.split('\n');
      for (const match of group) {
        if (lines[match.entry.line - 1] !== match.entry.source) {
          io.stderr(`${filePath} 的内容已与解析结果不一致，未做任何改动。\n`);
          return 2;
        }
      }
      plans.push({
        absolute,
        filePath,
        remaining: removeEntryLines(source, new Set(group.map((match) => match.entry.line))),
      });
    }

    const emptied: string[] = [];
    for (const plan of plans) {
      if (plan.remaining.trim() === '') {
        await rm(plan.absolute);
        emptied.push(plan.filePath);
      } else {
        await writeFile(plan.absolute, plan.remaining);
      }
    }

    io.stdout(`已处置 ${selection.matches.length} 条待裁决条目：\n`);
    for (const match of selection.matches) {
      io.stdout(
        `  ${label(match.domainIdentifier)} ${shortId(match.entry)} ${match.entry.content}\n`,
      );
    }
    for (const filePath of emptied) io.stdout(`${filePath} 清空即删。\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta pending remove 失败：${message}\n`);
    return 2;
  }
}

async function runPending(rootArg: string | undefined, io: CliIO, cwd: string): Promise<number> {
  const repositoryRoot = resolve(cwd, rootArg ?? '.');
  try {
    const repositoryFiles = await gitRepositoryFiles(repositoryRoot);
    const discovery = await discoverDomains(repositoryRoot, repositoryFiles);
    const contents = await Promise.all(
      discovery.domains.map((domain) =>
        extractDomainContent(repositoryRoot, repositoryFiles, domain),
      ),
    );
    const groups = contents
      .flatMap(({ domain, files }) => {
        const entries = files['PENDING.md']?.entries ?? [];
        if (domain.identifier === undefined || entries.length === 0) return [];
        return [{ identifier: domain.identifier, containerPath: domain.containerPath, entries }];
      })
      .sort((left, right) => left.identifier.localeCompare(right.identifier));
    io.stdout(formatPending(groups));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta pending 失败：${message}\n`);
    return 2;
  }
}

async function runChanges(base: string | undefined, io: CliIO, cwd: string): Promise<number> {
  const repositoryRoot = resolve(cwd);
  try {
    const [changes, repositoryFiles] = await Promise.all([
      gitChanges(repositoryRoot, base),
      gitRepositoryFiles(repositoryRoot),
    ]);
    const discovery = await discoverDomains(repositoryRoot, repositoryFiles);
    const contents = await Promise.all(
      discovery.domains.map((domain) =>
        extractDomainContent(repositoryRoot, repositoryFiles, domain),
      ),
    );
    const pendingEntries = Object.fromEntries(
      contents.flatMap(({ domain, files }) =>
        domain.identifier === undefined
          ? []
          : [[domain.identifier, files['PENDING.md']?.entries ?? []] as const],
      ),
    );
    io.stdout(formatChanges(classifyChanges(discovery, changes, pendingEntries)));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta changes 失败：${message}\n`);
    return 2;
  }
}

export async function runCli(
  args: readonly string[],
  io: CliIO = processIO,
  cwd = process.cwd(),
): Promise<number> {
  if (args[0] === 'changes') {
    if (args.length > 2 || args[1]?.startsWith('-') === true) {
      io.stderr('用法：pta changes [base]\n');
      return 2;
    }
    return runChanges(args[1], io, cwd);
  }

  if (args[0] === 'pending') {
    if (args[1] === 'remove') {
      const selectors = args.slice(2);
      if (selectors.length === 0 || selectors.some((selector) => selector.startsWith('-'))) {
        io.stderr('用法：pta pending remove <id>...\n');
        return 2;
      }
      return runPendingRemove(selectors, io, cwd);
    }
    if (args[1] === 'add') {
      const domainArg = args[2];
      const text = args[3];
      if (domainArg === undefined || text === undefined || args.length > 4) {
        io.stderr('用法：pta pending add <领域> <问题>\n');
        return 2;
      }
      return runPendingAdd(domainArg, text, io, cwd);
    }
    if (args.length > 2 || args[1]?.startsWith('-') === true) {
      io.stderr(
        '用法：pta pending [仓库根]\n       pta pending add <领域> <问题>\n       pta pending remove <id>...\n',
      );
      return 2;
    }
    return runPending(args[1], io, cwd);
  }

  if (args[0] === 'context') {
    const paths = args.slice(1);
    if (paths.length === 0 || paths.some((path) => path.startsWith('-'))) {
      io.stderr('用法：pta context <路径>...\n');
      return 2;
    }
    return runContext(paths, io, cwd);
  }

  if (args[0] !== 'check' || args.length > 2) {
    io.stderr(
      '用法：pta check [仓库根]\n       pta changes [base]\n       pta pending [仓库根]\n       pta context <路径>...\n',
    );
    return 2;
  }

  const repositoryRoot = resolve(cwd, args[1] ?? '.');
  let discovery;
  let contents;
  try {
    const repositoryFiles = await gitRepositoryFiles(repositoryRoot);
    discovery = await discoverDomains(repositoryRoot, repositoryFiles);
    contents = await Promise.all(
      discovery.domains.map((domain) =>
        extractDomainContent(repositoryRoot, repositoryFiles, domain),
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta check 失败：${message}\n`);
    return 2;
  }
  const signals = [...lintDiscoveryProblems(discovery), ...lintDomainContents(contents)];

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
