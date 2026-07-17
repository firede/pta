import { readFile, rm, writeFile } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';

import {
  assembleContext,
  classifyChanges,
  collectPendingEntries,
  discoverDomains,
  extractDomainContent,
  hashFileBytes,
  isWorkingLanguage,
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
  type Domain,
  type ExtractedEntry,
  type PendingEntryRef,
} from '@pta/core';

import {
  loadGlobalConfig,
  resolveGlobalPaths,
  writeDerivation,
  type ClueDerivation,
} from '@pta/runtime';

import {
  alignRows,
  changeMark,
  commitRef,
  contentHashRef,
  domainRef,
  domainValue,
  entryLine,
  entryRef,
  enumeratePhrases,
  listValues,
  shortHash,
  signalLine,
} from './format.ts';
import {
  bucketViews,
  collectInspectionViews,
  gitRepositoryFiles,
  repositoryIdentity,
  runDerivationPass,
  runGit,
  shortId,
  touchRepository,
  type InspectionView,
} from './inspection.ts';
import { audit, type CliIO } from './management.ts';
import { plainStyle, type Style } from './style.ts';

/** 仓库根由实现判定：Git 绑定下即 cwd 所在仓库的顶层目录。 */
async function repositoryRootFor(cwd: string): Promise<string> {
  try {
    return (await runGit(['rev-parse', '--show-toplevel'], resolve(cwd))).trim();
  } catch {
    throw new Error('当前目录不在 Git 仓库内');
  }
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

function parseStagedStatus(output: string): ChangedPath[] {
  const fields = output.split('\0');
  const changes: ChangedPath[] = [];
  for (let index = 0; index < fields.length; index += 1) {
    const entry = fields[index];
    if (entry === undefined || entry === '') continue;
    const indexStatus = entry.slice(0, 1);
    const path = entry.slice(3);
    if (indexStatus === 'R' || indexStatus === 'C') {
      const previousPath = fields[index + 1];
      if (previousPath !== undefined && previousPath !== '') {
        if (indexStatus === 'R') changes.push({ path: previousPath, type: 'deleted' });
        index += 1;
      }
    }
    if (indexStatus === ' ' || indexStatus === '?' || indexStatus === '!') continue;
    changes.push({ path, type: changeType(indexStatus) });
  }
  return changes;
}

async function gitChanges(
  repositoryRoot: string,
  base?: string,
  staged = false,
): Promise<ChangedPath[]> {
  if (staged) {
    return parseStagedStatus(
      await runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], repositoryRoot),
    );
  }
  if (base === undefined) {
    return parseStatus(
      await runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], repositoryRoot),
    );
  }
  return parseDiff(
    await runGit(['diff', '--name-status', '-z', `${base}...HEAD`, '--'], repositoryRoot),
  );
}

function domainLabel(signal: CheckSignal): string {
  const { anchor } = signal;
  if (anchor.kind === 'project-configuration') return '.';
  const identifier = anchor.domainIdentifier;
  if (identifier !== undefined) return identifier === '' ? '.' : identifier;
  return anchor.kind === 'domain-declaration' ? anchor.declarationPath : '.';
}

function checkSignalLine(signal: CheckSignal, s: Style = plainStyle): string {
  return signalLine(
    signal.category,
    signal.status,
    `${signal.evidence.file}:${signal.evidence.line} ${signal.evidence.message}`,
    s,
  );
}

function formatSignals(signals: readonly CheckSignal[], s: Style = plainStyle): string {
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
      .map((signal) => `  ${checkSignalLine(signal, s)}`);
    sections.push(`${s.bold(`领域 ${domainRef(domain, s)}`)}\n${lines.join('\n')}`);
  }
  return `${sections.join('\n\n')}\n`;
}

const surfaceLabels: Readonly<Record<string, string>> = {
  'truth-records': '真相记录被触',
  implementation: '实现文件被触',
  both: '真相记录与实现文件皆被触',
  'inbox-only': '仅收件箱活动',
};

function formatChanges(
  result: ChangeClassification,
  containers: ReadonlyMap<string, string>,
  s: Style = plainStyle,
): string {
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
    const lines = [s.bold(`领域 ${domainRef(identifier, s)}`)];
    const domain = touched.get(identifier);
    if (domain !== undefined) {
      lines.push(`  触面: ${surfaceLabels[domain.surface]}`);
      for (const change of domain.changes) {
        lines.push(`  ${changeMark(change.type, s)} ${change.path}`);
      }
      const suspicion = suspicions.get(identifier);
      if (suspicion !== undefined) {
        lines.push(`  ${signalLine('drift suspicion', 'suspicion', suspicion.evidence, s)}`);
      }
      if (domain.inboxChanges.length > 0) {
        lines.push(`  收件箱活动: ${listValues(domain.inboxChanges.map((change) => change.path))}`);
      }
    }
    const candidate = candidates.get(identifier);
    if (candidate !== undefined) {
      for (const reason of candidate.reasons) {
        lines.push(`  ${signalLine('propagation', 'candidate', reason.evidence, s)}`);
      }
    }
    if (domain !== undefined) {
      lines.push('  待裁决背景:');
      if (domain.pendingContext.length === 0) lines.push('    无');
      for (const context of domain.pendingContext) {
        const container = containers.get(context.domainIdentifier) ?? '';
        const file = container === '' ? 'PENDING.md' : `${container}/PENDING.md`;
        for (const entry of context.entries) {
          // 与 pending list 同一形制：id 一律裸形，领域归属由完整路径定位自明。
          lines.push(
            `    ${entryLine(shortHash(entry.contentHash), `${file}:${entry.line}`, entry.content, s)}`,
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
        s.bold('未覆盖'),
        ...uncovered.map((item) => `  ${changeMark(item.change.type, s)} ${item.change.path}`),
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
    lines.push('来源: 无提交基线，所涉内容以哈希标识');
  } else if (source.hashedFiles.length > 0) {
    lines.push(`来源: ${commitRef(source.baseVersion)}，含未入库变更`);
  } else {
    lines.push(`来源: ${commitRef(source.baseVersion)}`);
  }
  if (source.hashedFiles.length > 0) {
    lines.push('所涉内容哈希:');
    for (const file of source.hashedFiles) {
      lines.push(`  ${file.path} ${contentHashRef(file.hash)}`);
    }
  }
  lines.push(
    `范围: ${
      assembly.domains.length === 0
        ? '无'
        : enumeratePhrases(
            assembly.domains.map((domain) => `领域 ${domainRef(domain.domainIdentifier)}`),
          )
    }`,
  );
  lines.push('路径归属:');
  for (const resolution of assembly.resolutions) {
    lines.push(
      `  ${resolution.path === '' ? '.' : resolution.path} → ${
        resolution.domainIdentifier === undefined
          ? '未覆盖'
          : `领域 ${domainRef(resolution.domainIdentifier)}`
      }`,
    );
  }
  if (signals.length > 0) {
    lines.push('核查提示 (读取时叠加，不入产物):');
    for (const signal of signals.toSorted(
      (left, right) =>
        left.evidence.file.localeCompare(right.evidence.file) ||
        left.evidence.line - right.evidence.line,
    )) {
      lines.push(`  ${checkSignalLine(signal)}`);
    }
  }
  for (const domain of assembly.domains) {
    lines.push('', `## 领域 ${domainRef(domain.domainIdentifier)}`);
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
        lines.push(entryLine(shortId(entry), undefined, entry.content));
      }
    }
    if (domain.dependsOn.length > 0) {
      lines.push('', '### 依赖领域 (未展开，可按标识另行查询)', '');
      for (const dependency of domain.dependsOn) {
        lines.push(`- ${domainRef(dependency.domain)}: ${dependency.reason}`);
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

/** 领域的主张范围在版本库树中的代表路径；外置声明的标识本身不落在范围内，需经此展开。 */
function domainScopePaths(domain: Domain): string[] {
  if (domain.claimedPath === undefined) return [];
  if (domain.filesPresent) {
    return (domain.files ?? []).map((file) => posix.join(domain.claimedPath as string, file));
  }
  return [domain.claimedPath];
}

function expandDomainIdentifiers(inputs: readonly string[], domains: readonly Domain[]): string[] {
  const byIdentifier = new Map(
    domains.flatMap((domain) =>
      domain.identifier === undefined ? [] : [[domain.identifier, domain] as const],
    ),
  );
  return inputs.flatMap((input) => {
    const domain = byIdentifier.get(input);
    if (domain === undefined) return [input];
    const scope = domainScopePaths(domain);
    return scope.length === 0 ? [input] : scope;
  });
}

export async function runContext(
  paths: readonly string[],
  io: CliIO,
  cwd: string,
): Promise<number> {
  try {
    const repositoryRoot = await repositoryRootFor(cwd);
    const repositoryFiles = await gitRepositoryFiles(repositoryRoot);
    const discovery = await discoverDomains(repositoryRoot, repositoryFiles);
    const contents = await Promise.all(
      discovery.domains.map((domain) =>
        extractDomainContent(repositoryRoot, repositoryFiles, domain),
      ),
    );
    const assembly = assembleContext(
      discovery,
      contents,
      expandDomainIdentifiers(paths.map(normalizeContextPath), discovery.domains),
    );
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
    io.stderr(`pta context 失败: ${message}\n`);
    return 2;
  }
}

type PendingGroup = Readonly<{
  identifier: string;
  containerPath: string;
  entries: readonly ExtractedEntry[];
}>;

function formatPending(groups: readonly PendingGroup[], s: Style = plainStyle): string {
  if (groups.length === 0) return '收件箱为空：没有待裁决条目。\n';
  const sections = groups.map((group) => {
    const file = group.containerPath === '' ? 'PENDING.md' : `${group.containerPath}/PENDING.md`;
    const lines = group.entries.map(
      (entry) => `  ${entryLine(shortId(entry), `${file}:${entry.line}`, entry.content, s)}`,
    );
    return `${s.bold(`领域 ${domainRef(group.identifier, s)}`)}\n${lines.join('\n')}`;
  });
  const total = groups.reduce((sum, group) => sum + group.entries.length, 0);
  return `${sections.join('\n\n')}\n\n共 ${total} 条待裁决条目，分布于 ${groups.length} 个领域；处置用 pta pending resolve <id>。\n`;
}

function formatInspection(
  views: readonly InspectionView[],
  today: string,
  s: Style = plainStyle,
): string {
  if (views.length === 0) {
    return '巡检集合为空：没有巡检标记条目与残留条目。\n';
  }
  const lines: string[] = [];
  const domains = new Set(views.map((view) => view.member.domainIdentifier));
  lines.push(`巡检集合: ${views.length} 条 (${domains.size} 个领域)`);
  const memberLine = (view: InspectionView, suffix = ''): string =>
    `  ${entryLine(
      shortId(view.member.entry),
      `${view.member.filePath}:${view.member.entry.line}`,
      view.member.entry.content,
      s,
    )}${suffix === '' ? '' : s.dim(suffix)}`;

  const buckets = bucketViews(views, today);
  if (buckets.expired.length > 0) {
    lines.push('', s.bold('到期:'));
    for (const view of buckets.expired) {
      lines.push(
        `  ${signalLine(
          'expiry',
          'machine-decidable',
          `${view.member.filePath}:${view.member.entry.line} 复查线索 ${view.effectiveDue} 已到期。`,
          s,
        )}`,
      );
    }
  }
  if (buckets.conditionTriggered.length > 0) {
    lines.push('', s.bold('条件型 (评估为已触发，待人裁决):'));
    for (const view of buckets.conditionTriggered) {
      lines.push(memberLine(view));
      const rationale = view.derivation?.evaluation?.rationale;
      if (rationale !== undefined && rationale !== '') lines.push(`    评估理由: ${rationale}`);
    }
  }
  if (buckets.upcoming.length > 0) {
    lines.push('', s.bold('日期型 (未到期):'));
    for (const view of buckets.upcoming) {
      lines.push(memberLine(view, ` (${view.effectiveDue} 到期)`));
    }
  }
  const evaluatedPending = buckets.conditionPending.filter(
    (view) => view.derivation?.evaluation !== undefined,
  );
  const unevaluated = buckets.conditionPending.filter(
    (view) => view.derivation?.evaluation === undefined,
  );
  if (evaluatedPending.length > 0) {
    lines.push('', s.bold('条件型 (评估未触发):'));
    for (const view of evaluatedPending) {
      const evaluation = view.derivation?.evaluation;
      const suffix =
        evaluation === undefined
          ? ''
          : ` (${evaluation.result === 'unknown' ? '无法判断' : '未触发'}，${evaluation.evaluatedAt.slice(0, 10)} 由 ${evaluation.evaluatedBy} 评估)`;
      lines.push(memberLine(view, suffix));
    }
  }
  if (unevaluated.length > 0) {
    lines.push('', s.bold('条件型 (待评估):'));
    for (const view of unevaluated) lines.push(memberLine(view));
  }
  if (buckets.noClue.length > 0) {
    lines.push('', s.bold('无线索 (已推导，语义通读兜底):'));
    for (const view of buckets.noClue) lines.push(memberLine(view));
  }
  if (buckets.awaitingDerivation.length > 0) {
    lines.push('', s.bold('待推导 (无线索记录，可 pta inspect derive 或 pta inspect register):'));
    for (const view of buckets.awaitingDerivation) lines.push(memberLine(view));
  }
  if (buckets.residue.length > 0) {
    lines.push('', s.bold('残留 (整类巡检):'));
    for (const view of buckets.residue) lines.push(memberLine(view));
  }
  return `${lines.join('\n')}\n`;
}

export async function runInspectList(io: CliIO, cwd: string): Promise<number> {
  try {
    const repositoryRoot = await repositoryRootFor(cwd);
    const views = await collectInspectionViews(repositoryRoot);
    await touchRepository(repositoryRoot);
    io.stdout(
      formatInspection(views, new Date().toISOString().slice(0, 10), io.style ?? plainStyle),
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta inspect list 失败: ${message}\n`);
    return 2;
  }
}

export async function runInspectDerive(name: string, io: CliIO, cwd: string): Promise<number> {
  const config = await loadGlobalConfig(resolveGlobalPaths());
  const agent = config.agents[name];
  if (agent === undefined) {
    io.stderr(`未找到 agent: ${name} (见 pta agent list)\n`);
    return 2;
  }
  try {
    const repositoryRoot = await repositoryRootFor(cwd);
    const result = await runDerivationPass(repositoryRoot, name, agent);
    await touchRepository(repositoryRoot);
    await audit(io, 'inspect-derive', {
      agent: name,
      derived: result.derived,
      evaluated: result.evaluated,
      failures: result.failures.length,
    });
    io.stdout(
      `推导完成 (agent ${name}): 新推导 ${result.derived} 条、评估 ${result.evaluated} 条。\n`,
    );
    for (const failure of result.failures) io.stderr(`${failure}\n`);
    return result.failures.length > 0 ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta inspect derive 失败: ${message}\n`);
    return 2;
  }
}

export async function runInspectRegister(
  idArg: string,
  valueArg: string,
  io: CliIO,
  cwd: string,
): Promise<number> {
  const isDate = /^\d{4}-\d{2}(-\d{2})?$/u.test(valueArg);
  if (!isDate && valueArg !== '条件') {
    io.stderr('线索值必须是到期日期（YYYY-MM 或 YYYY-MM-DD），或字面量「条件」。\n');
    return 2;
  }
  try {
    const repositoryRoot = await repositoryRootFor(cwd);
    const views = await collectInspectionViews(repositoryRoot);
    const refs = views
      .filter((view) => view.member.kind === 'marked-truth')
      .map((view) => ({
        domainIdentifier: view.member.domainIdentifier,
        filePath: view.member.filePath,
        entry: view.member.entry,
      }));
    const selection = selectPendingEntries(refs, [idArg]);
    const problem = selection.problems[0];
    if (problem !== undefined) {
      if (problem.reason === 'invalid') io.stderr(`无法解析 id: ${problem.selector}\n`);
      else if (problem.reason === 'not-found') {
        io.stderr(`未匹配任何巡检标记条目: ${problem.selector}\n`);
      } else {
        io.stderr(`id 有歧义: ${problem.selector}，候选:\n`);
        for (const candidate of problem.candidates) {
          io.stderr(
            `  ${entryLine(
              entryRef(candidate.domainIdentifier, candidate.entry.contentHash),
              undefined,
              candidate.entry.content,
            )}\n`,
          );
        }
      }
      return 2;
    }
    const match = selection.matches[0] as PendingEntryRef;
    const derivation: ClueDerivation = {
      locator: {
        repository: await repositoryIdentity(repositoryRoot),
        domainIdentifier: match.domainIdentifier,
        fileKind: 'truth',
        contentHash: match.entry.contentHash,
      },
      kind: 'review-clue',
      type: isDate ? 'date' : 'condition',
      ...(isDate ? { due: valueArg } : {}),
      registeredAt: new Date().toISOString(),
      registeredBy: 'cli',
    };
    await writeDerivation(resolveGlobalPaths(), derivation);
    await audit(io, 'derivation-register', {
      id: shortId(match.entry),
      domain: domainValue(match.domainIdentifier),
      type: derivation.type,
      ...(derivation.due === undefined ? {} : { due: derivation.due }),
    });
    io.stdout(
      `已注册推导: 领域 ${domainRef(match.domainIdentifier, io.style ?? plainStyle)} ${shortId(match.entry)} → ${isDate ? `日期型 (${valueArg})` : '条件型'}\n`,
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta inspect register 失败: ${message}\n`);
    return 2;
  }
}

export async function runPendingAdd(
  domainArg: string,
  text: string,
  io: CliIO,
  cwd: string,
): Promise<number> {
  try {
    const repositoryRoot = await repositoryRootFor(cwd);
    const repositoryFiles = await gitRepositoryFiles(repositoryRoot);
    const discovery = await discoverDomains(repositoryRoot, repositoryFiles);
    const identifier = domainArg === '.' ? '' : domainArg;
    const domain = discovery.domains.find((item) => item.identifier === identifier);
    if (domain === undefined) {
      io.stderr(`未找到领域: ${domainArg}\n`);
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
        `已存在同内容条目: 领域 ${domainRef(identifier, io.style ?? plainStyle)} ${shortHash(plan.contentHash)} ${filePath}:${plan.line}\n`,
      );
      return 0;
    }
    if (!/[？?]/u.test(text)) {
      io.stderr('提示: 待裁决条目应当以问句表述。\n');
    }
    await writeFile(absolute, plan.source);
    await audit(io, 'pending-add', {
      domain: domainValue(identifier),
      id: shortHash(plan.contentHash),
      file: filePath,
    });
    io.stdout(
      `已登记待裁决条目: 领域 ${domainRef(identifier, io.style ?? plainStyle)} ${shortHash(plan.contentHash)} ${filePath}:${plan.line}\n`,
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta pending add 失败: ${message}\n`);
    return 2;
  }
}

export async function runPendingResolve(
  selectors: readonly string[],
  io: CliIO,
  cwd: string,
): Promise<number> {
  try {
    const repositoryRoot = await repositoryRootFor(cwd);
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
          io.stderr(`无法解析 id: ${problem.selector}\n`);
        } else if (problem.reason === 'not-found') {
          io.stderr(`未匹配任何待裁决条目: ${problem.selector}\n`);
        } else {
          io.stderr(`id 有歧义: ${problem.selector}，候选:\n`);
          for (const candidate of problem.candidates) {
            io.stderr(
              `  ${entryLine(
                entryRef(candidate.domainIdentifier, candidate.entry.contentHash),
                undefined,
                candidate.entry.content,
              )}\n`,
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

    await audit(io, 'pending-resolve', {
      ids: selection.matches.map((match) =>
        entryRef(match.domainIdentifier, match.entry.contentHash),
      ),
    });
    const s = io.style ?? plainStyle;
    io.stdout(`已处置 ${selection.matches.length} 条待裁决条目:\n`);
    for (const match of selection.matches) {
      const domain = ` (领域 ${domainRef(match.domainIdentifier, s)})`;
      io.stdout(
        `  ${entryLine(shortId(match.entry), undefined, match.entry.content, s)}${s.dim(domain)}\n`,
      );
    }
    for (const filePath of emptied) io.stdout(`${filePath} 清空即删。\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta pending resolve 失败: ${message}\n`);
    return 2;
  }
}

export async function runPendingList(io: CliIO, cwd: string): Promise<number> {
  try {
    const repositoryRoot = await repositoryRootFor(cwd);
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
    io.stdout(formatPending(groups, io.style ?? plainStyle));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta pending list 失败: ${message}\n`);
    return 2;
  }
}

export async function runChanges(
  base: string | undefined,
  staged: boolean,
  io: CliIO,
  cwd: string,
): Promise<number> {
  if (base !== undefined && staged) {
    io.stderr('基线与 --staged 不能同时使用。\n');
    return 2;
  }
  try {
    const repositoryRoot = await repositoryRootFor(cwd);
    const { classification, containers } = await classifyRepository(repositoryRoot, base, staged);
    await touchRepository(repositoryRoot);
    io.stdout(formatChanges(classification, containers, io.style ?? plainStyle));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta changes 失败: ${message}\n`);
    return 2;
  }
}

async function classifyRepository(
  repositoryRoot: string,
  base: string | undefined,
  staged: boolean,
): Promise<{ classification: ChangeClassification; containers: ReadonlyMap<string, string> }> {
  const [changes, repositoryFiles] = await Promise.all([
    gitChanges(repositoryRoot, base, staged),
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
  const containers = new Map(
    discovery.domains.flatMap((domain) =>
      domain.identifier === undefined ? [] : [[domain.identifier, domain.containerPath] as const],
    ),
  );
  return { classification: classifyChanges(discovery, changes, pendingEntries), containers };
}

export async function runCheck(io: CliIO, cwd: string): Promise<number> {
  let repositoryRoot = '';
  let discovery;
  let contents;
  try {
    repositoryRoot = await repositoryRootFor(cwd);
    const repositoryFiles = await gitRepositoryFiles(repositoryRoot);
    discovery = await discoverDomains(repositoryRoot, repositoryFiles);
    contents = await Promise.all(
      discovery.domains.map((domain) =>
        extractDomainContent(repositoryRoot, repositoryFiles, domain),
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta check 失败: ${message}\n`);
    return 2;
  }
  await touchRepository(repositoryRoot);
  const signals = [...lintDiscoveryProblems(discovery), ...lintDomainContents(contents)];
  const s = io.style ?? plainStyle;

  if (signals.length === 0) {
    io.stdout(`${s.green('通过')}: 未发现核查信号。\n`);
    return 0;
  }

  io.stdout(formatSignals(signals, s));
  return signals.some(
    (signal) =>
      signal.status === 'machine-decidable' &&
      (signal.category === 'conflict' || signal.category === 'violation'),
  )
    ? 1
    : 0;
}

export async function runInit(language: string, io: CliIO, cwd: string): Promise<number> {
  if (!isWorkingLanguage(language)) {
    io.stderr('工作语言标签不合形制：取语言子标签，可附书写系统子标签，如 zh-Hans, en。\n');
    return 2;
  }
  try {
    const repositoryRoot = await repositoryRootFor(cwd);
    const configPath = join(repositoryRoot, 'pta.toml');
    const template = [
      '# 项目真相架构的项目级配置，字段定义见集成规范：https://pta.pub/specification/integration/',
      '',
      '# 项目真相的工作语言：BCP 47 语言标签，取语言子标签，可附书写系统子标签。',
      `workingLanguage = "${language}"`,
      '',
      '# 外置领域声明根的完整清单，未声明时默认 [".pta"]，空清单表示不设外置声明根。',
      '# externalRoots = [".pta"]',
      '',
    ].join('\n');
    // wx 原子创建：检查与写入合为一步，并发场景下不截断他人刚写入的配置。
    try {
      await writeFile(configPath, template, { flag: 'wx' });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        io.stderr('pta.toml 已存在，不作改写；直接编辑该文件调整配置。\n');
        return 2;
      }
      throw error;
    }
    await touchRepository(repositoryRoot);
    await audit(io, 'init', { workingLanguage: language });
    io.stdout(`完成: 已创建 pta.toml，工作语言 ${language}。\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta init 失败: ${message}\n`);
    return 2;
  }
}

export async function runDomains(io: CliIO, cwd: string): Promise<number> {
  try {
    const repositoryRoot = await repositoryRootFor(cwd);
    const repositoryFiles = await gitRepositoryFiles(repositoryRoot);
    const discovery = await discoverDomains(repositoryRoot, repositoryFiles);
    const s = io.style ?? plainStyle;
    io.stdout(`工作语言: ${discovery.workingLanguage ?? '未声明'}\n`);
    const roots =
      discovery.externalRoots.length === 0
        ? '无'
        : listValues(
            discovery.externalRoots.map((root) => {
              const note = root.source === 'default' ? ' (默认)' : root.usable ? '' : ' (不可用)';
              return note === '' ? root.path : `${root.path}${s.dim(note)}`;
            }),
          );
    io.stdout(`外置声明根: ${roots}\n\n`);
    const declared = discovery.domains.filter((domain) => domain.identifier !== undefined);
    if (declared.length === 0) {
      io.stdout('没有发现领域：仓库中无领域声明。\n');
      return 0;
    }
    const contents = await Promise.all(
      declared.map((domain) => extractDomainContent(repositoryRoot, repositoryFiles, domain)),
    );
    const rows = contents
      .map(({ domain, files }) => {
        const identifier = domain.identifier as string;
        const counts: readonly [string, number][] = [
          ['真相', files['TRUTH.md']?.entries.length ?? 0],
          ['术语', files['GLOSSARY.md']?.entries.length ?? 0],
          ['残留', files['RESIDUE.md']?.entries.length ?? 0],
          ['待裁决', files['PENDING.md']?.entries.length ?? 0],
        ];
        const records = enumeratePhrases(
          counts
            .filter(([name, count]) => name === '真相' || count > 0)
            .map(([name, count]) => `${name} ${count}`),
        );
        let scope = '';
        if (domain.claimedPath !== undefined && domain.claimedPath !== identifier) {
          scope = domain.filesPresent
            ? `范围 ${domainValue(domain.claimedPath)} 的 ${listValues(domain.files ?? [])}`
            : `范围 ${domainValue(domain.claimedPath)}`;
        }
        const depends =
          domain.dependsOn.length === 0
            ? ''
            : `依赖 → ${listValues(domain.dependsOn.map((item) => domainRef(item.domain, s)))}`;
        return {
          identifier,
          cells: [s.bold(`领域 ${domainRef(identifier, s)}`), records, scope, depends],
        };
      })
      .toSorted((left, right) => left.identifier.localeCompare(right.identifier));
    for (const line of alignRows(rows.map((row) => row.cells))) io.stdout(`${line}\n`);
    io.stdout(`\n共 ${rows.length} 个领域。\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`pta domains 失败: ${message}\n`);
    return 2;
  }
}
