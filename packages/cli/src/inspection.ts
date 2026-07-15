import { execFile } from 'node:child_process';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  discoverDomains,
  extractDomainContent,
  inspectContents,
  lintDiscoveryProblems,
  lintDomainContents,
  sha256,
  type CheckSignal,
  type ExtractedEntry,
  type InspectionMember,
} from '@pta/core';
import {
  readDerivation,
  readRepositories,
  recordRepository,
  resolveGlobalPaths,
  runAgentTask,
  writeDerivation,
  type AgentConfig,
  type ClueDerivation,
  type GlobalPaths,
} from '@pta/runtime';

export function shortId(entry: ExtractedEntry): string {
  return entry.contentHash.slice(0, 8);
}

export function runGit(args: readonly string[], cwd: string): Promise<string> {
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

export function parseRepositoryFiles(output: string): string[] {
  return [...new Set(output.split('\0').filter((path) => path !== ''))].sort();
}

export async function gitRepositoryFiles(repositoryRoot: string): Promise<string[]> {
  const [listed, deleted] = await Promise.all([
    runGit(['ls-files', '--cached', '--others', '--exclude-standard', '-z'], repositoryRoot),
    runGit(['ls-files', '--deleted', '-z'], repositoryRoot),
  ]);
  const deletedPaths = new Set(parseRepositoryFiles(deleted));
  return parseRepositoryFiles(listed).filter((path) => !deletedPaths.has(path));
}

export async function repositoryIdentity(repositoryRoot: string): Promise<string> {
  try {
    const output = await runGit(['rev-list', '--max-parents=0', 'HEAD'], repositoryRoot);
    const root = output.trim().split('\n').toSorted().at(0);
    if (root !== undefined && root !== '') return root;
  } catch {
    // 无提交基线的仓库退回根路径标识
  }
  return repositoryRoot;
}

export async function touchRepository(
  repositoryRoot: string,
  paths: GlobalPaths = resolveGlobalPaths(),
): Promise<void> {
  try {
    await recordRepository(paths, await repositoryIdentity(repositoryRoot), repositoryRoot);
  } catch {
    // 注册表是管理面便利设施，失败不影响命令本身
  }
}

export type InspectionView = Readonly<{
  member: InspectionMember;
  effectiveDue?: string;
  derivation?: ClueDerivation;
}>;

export async function collectInspectionViews(
  repositoryRoot: string,
  paths: GlobalPaths = resolveGlobalPaths(),
): Promise<readonly InspectionView[]> {
  const repositoryFiles = await gitRepositoryFiles(repositoryRoot);
  const discovery = await discoverDomains(repositoryRoot, repositoryFiles);
  const contents = await Promise.all(
    discovery.domains.map((domain) =>
      extractDomainContent(repositoryRoot, repositoryFiles, domain),
    ),
  );
  const today = new Date().toISOString().slice(0, 10);
  const report = inspectContents(contents, today);
  const repository = await repositoryIdentity(repositoryRoot);
  return Promise.all(
    report.members.map(async (member): Promise<InspectionView> => {
      if (member.kind !== 'marked-truth') return { member };
      const derivation = await readDerivation(paths, {
        repository,
        domainIdentifier: member.domainIdentifier,
        fileKind: 'truth',
        contentHash: member.entry.contentHash,
      });
      if (derivation === undefined) {
        return { member, ...(member.due === undefined ? {} : { effectiveDue: member.due }) };
      }
      return {
        member,
        derivation,
        ...(derivation.type === 'date' && derivation.due !== undefined
          ? { effectiveDue: derivation.due }
          : {}),
      };
    }),
  );
}

export function dueStart(due: string): string {
  return due.length === 7 ? `${due}-01` : due;
}

export type ViewBuckets = Readonly<{
  expired: readonly InspectionView[];
  upcoming: readonly InspectionView[];
  conditionTriggered: readonly InspectionView[];
  conditionPending: readonly InspectionView[];
  noClue: readonly InspectionView[];
  awaitingDerivation: readonly InspectionView[];
  residue: readonly InspectionView[];
}>;

export function bucketViews(views: readonly InspectionView[], today: string): ViewBuckets {
  const marked = views.filter((view) => view.member.kind === 'marked-truth');
  const dated = marked.filter((view) => view.effectiveDue !== undefined);
  const condition = marked.filter((view) => view.derivation?.type === 'condition');
  return {
    expired: dated.filter((view) => dueStart(view.effectiveDue as string) <= today),
    upcoming: dated
      .filter((view) => dueStart(view.effectiveDue as string) > today)
      .toSorted((left, right) =>
        (left.effectiveDue as string).localeCompare(right.effectiveDue as string),
      ),
    conditionTriggered: condition.filter(
      (view) => view.derivation?.evaluation?.result === 'triggered',
    ),
    conditionPending: condition.filter(
      (view) => view.derivation?.evaluation?.result !== 'triggered',
    ),
    noClue: marked.filter((view) => view.derivation?.type === 'none'),
    awaitingDerivation: marked.filter(
      (view) => view.effectiveDue === undefined && view.derivation === undefined,
    ),
    residue: views.filter((view) => view.member.kind === 'residue'),
  };
}

function lastJsonObject(output: string): Record<string, unknown> | undefined {
  const lines = output.split('\n');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = (lines[index] as string).trim();
    if (!line.startsWith('{') || !line.endsWith('}')) continue;
    try {
      const parsed = JSON.parse(line) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // 继续向上找最后一个合法 JSON 行
    }
  }
  return undefined;
}

function derivePrompt(content: string): string {
  return [
    '你是项目真相巡检的线索推导器。下面是一条带巡检标记的真相条目，请判断其中的复查线索类型。',
    '条目内容：',
    content,
    '',
    '只输出一行 JSON，不要输出其他文字。三种形态之一：',
    '{"type":"date","due":"YYYY-MM 或 YYYY-MM-DD"}（条目给出了明确的复查时间）',
    '{"type":"condition","condition":"触发复查的外部条件，一句话"}（条目描述了应当触发复查的外部变化）',
    '{"type":"none"}（条目没有可提取的复查线索）',
  ].join('\n');
}

function evaluatePrompt(content: string, condition: string): string {
  return [
    '你是项目真相巡检的条件评估器。请判断以下复查条件当前是否可能已经触发。',
    '条目内容：',
    content,
    `复查条件：${condition}`,
    '',
    '依据你所掌握的知识作答，无法判断就答 unknown。只输出一行 JSON，不要输出其他文字：',
    '{"result":"triggered|not-triggered|unknown","rationale":"一句话理由"}',
  ].join('\n');
}

export type DerivationPassResult = Readonly<{
  derived: number;
  evaluated: number;
  failures: readonly string[];
}>;

const evaluationFreshMs = 24 * 60 * 60 * 1000;

export async function runDerivationPass(
  repositoryRoot: string,
  agentName: string,
  agent: AgentConfig,
  options: Readonly<{ paths?: GlobalPaths; force?: boolean; now?: Date }> = {},
): Promise<DerivationPassResult> {
  const paths = options.paths ?? resolveGlobalPaths();
  const now = options.now ?? new Date();
  const repository = await repositoryIdentity(repositoryRoot);
  const views = await collectInspectionViews(repositoryRoot, paths);
  const registeredBy = `agent:${agentName}`;
  const failures: string[] = [];
  let derived = 0;
  let evaluated = 0;

  const locatorFor = (view: InspectionView): ClueDerivation['locator'] => ({
    repository,
    domainIdentifier: view.member.domainIdentifier,
    fileKind: 'truth',
    contentHash: view.member.entry.contentHash,
  });

  const buckets = bucketViews(views, now.toISOString().slice(0, 10));
  const pendingDerivation = buckets.awaitingDerivation;
  const conditionsToEvaluate: { view: InspectionView; derivation: ClueDerivation }[] = [];

  for (const view of pendingDerivation) {
    const result = await runAgentTask(
      agent,
      derivePrompt(view.member.entry.content),
      repositoryRoot,
    );
    const parsed = result.ok ? lastJsonObject(result.output) : undefined;
    const type = parsed?.['type'];
    if (
      parsed === undefined ||
      (type !== 'date' && type !== 'condition' && type !== 'none') ||
      (type === 'date' && !/^\d{4}-\d{2}(-\d{2})?$/u.test(String(parsed['due'] ?? ''))) ||
      (type === 'condition' && typeof parsed['condition'] !== 'string')
    ) {
      failures.push(
        `${shortId(view.member.entry)} 推导失败：${result.ok ? '输出不是可解析的线索 JSON' : (result.error ?? '未知错误')}`,
      );
      continue;
    }
    const derivation: ClueDerivation = {
      locator: locatorFor(view),
      kind: 'review-clue',
      type,
      ...(type === 'date' ? { due: String(parsed['due']) } : {}),
      ...(type === 'condition' ? { condition: String(parsed['condition']) } : {}),
      registeredAt: now.toISOString(),
      registeredBy,
    };
    await writeDerivation(paths, derivation);
    derived += 1;
    if (type === 'condition') conditionsToEvaluate.push({ view, derivation });
  }

  for (const view of views) {
    const derivation = view.derivation;
    if (derivation === undefined || derivation.type !== 'condition') continue;
    const evaluatedAt = derivation.evaluation?.evaluatedAt;
    const fresh =
      evaluatedAt !== undefined && now.getTime() - Date.parse(evaluatedAt) < evaluationFreshMs;
    if (fresh && options.force !== true) continue;
    conditionsToEvaluate.push({ view, derivation });
  }

  for (const { view, derivation } of conditionsToEvaluate) {
    const condition = derivation.condition ?? view.member.entry.content;
    const result = await runAgentTask(
      agent,
      evaluatePrompt(view.member.entry.content, condition),
      repositoryRoot,
    );
    const parsed = result.ok ? lastJsonObject(result.output) : undefined;
    const verdict = parsed?.['result'];
    if (
      parsed === undefined ||
      (verdict !== 'triggered' && verdict !== 'not-triggered' && verdict !== 'unknown')
    ) {
      failures.push(
        `${shortId(view.member.entry)} 评估失败：${result.ok ? '输出不是可解析的评估 JSON' : (result.error ?? '未知错误')}`,
      );
      continue;
    }
    await writeDerivation(paths, {
      ...derivation,
      evaluation: {
        result: verdict,
        rationale: typeof parsed['rationale'] === 'string' ? parsed['rationale'] : '',
        evaluatedAt: now.toISOString(),
        evaluatedBy: registeredBy,
      },
    });
    evaluated += 1;
  }

  return { derived, evaluated, failures };
}

export type SignalCounts = Readonly<{
  conflicts: number;
  violations: number;
  suspicions: number;
}>;

export async function collectSignalCounts(repositoryRoot: string): Promise<SignalCounts> {
  const repositoryFiles = await gitRepositoryFiles(repositoryRoot);
  const discovery = await discoverDomains(repositoryRoot, repositoryFiles);
  const contents = await Promise.all(
    discovery.domains.map((domain) =>
      extractDomainContent(repositoryRoot, repositoryFiles, domain),
    ),
  );
  const signals: readonly CheckSignal[] = [
    ...lintDiscoveryProblems(discovery),
    ...lintDomainContents(contents),
  ];
  return {
    conflicts: signals.filter((signal) => signal.category === 'conflict').length,
    violations: signals.filter((signal) => signal.category === 'violation').length,
    suspicions: signals.filter((signal) => signal.status === 'suspicion').length,
  };
}

export type InspectionReport = Readonly<{
  identity: string;
  root: string;
  generatedAt: string;
  counts: Readonly<{
    members: number;
    expired: number;
    upcoming: number;
    conditionTriggered: number;
    conditionPending: number;
    noClue: number;
    awaitingDerivation: number;
    residue: number;
    conflicts: number;
    violations: number;
    suspicions: number;
  }>;
  expired: readonly { id: string; location: string; content: string; due: string }[];
  conditionTriggered: readonly {
    id: string;
    location: string;
    content: string;
    rationale: string;
  }[];
  derivation?: DerivationPassResult;
}>;

export function reportFilePath(paths: GlobalPaths, root: string): string {
  // 以工作副本（root）为键：同一仓库的多 worktree/多分支各有自己的报告
  return join(paths.cacheDir, 'reports', `${sha256(root)}.json`);
}

export async function writeInspectionReport(
  paths: GlobalPaths,
  report: InspectionReport,
): Promise<void> {
  const file = reportFilePath(paths, report.root);
  await mkdir(join(file, '..'), { recursive: true });
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`);
}

export async function readInspectionReports(paths: GlobalPaths): Promise<InspectionReport[]> {
  const dir = join(paths.cacheDir, 'reports');
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const reports: InspectionReport[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    try {
      reports.push(JSON.parse(await readFile(join(dir, name), 'utf8')) as InspectionReport);
    } catch {
      // 损坏的报告跳过，下一轮扫描会重写
    }
  }
  return reports.toSorted((left, right) => left.root.localeCompare(right.root));
}

export async function inspectRepositoryOnce(
  repositoryRoot: string,
  options: Readonly<{
    paths?: GlobalPaths;
    agentName?: string;
    agent?: AgentConfig;
    now?: Date;
  }> = {},
): Promise<InspectionReport> {
  const paths = options.paths ?? resolveGlobalPaths();
  const now = options.now ?? new Date();
  let derivation: DerivationPassResult | undefined;
  if (options.agentName !== undefined && options.agent !== undefined) {
    derivation = await runDerivationPass(repositoryRoot, options.agentName, options.agent, {
      paths,
      now,
    });
  }
  const [views, signals, identity] = await Promise.all([
    collectInspectionViews(repositoryRoot, paths),
    collectSignalCounts(repositoryRoot),
    repositoryIdentity(repositoryRoot),
  ]);
  const buckets = bucketViews(views, now.toISOString().slice(0, 10));
  const line = (view: InspectionView): { id: string; location: string; content: string } => ({
    id: shortId(view.member.entry),
    location: `${view.member.filePath}:${view.member.entry.line}`,
    content: view.member.entry.content,
  });
  const report: InspectionReport = {
    identity,
    root: repositoryRoot,
    generatedAt: now.toISOString(),
    counts: {
      members: views.length,
      expired: buckets.expired.length,
      upcoming: buckets.upcoming.length,
      conditionTriggered: buckets.conditionTriggered.length,
      conditionPending: buckets.conditionPending.length,
      noClue: buckets.noClue.length,
      awaitingDerivation: buckets.awaitingDerivation.length,
      residue: buckets.residue.length,
      ...signals,
    },
    expired: buckets.expired.map((view) => ({
      ...line(view),
      due: view.effectiveDue as string,
    })),
    conditionTriggered: buckets.conditionTriggered.map((view) => ({
      ...line(view),
      rationale: view.derivation?.evaluation?.rationale ?? '',
    })),
    ...(derivation === undefined ? {} : { derivation }),
  };
  await writeInspectionReport(paths, report);
  return report;
}

export type SweepResult = Readonly<{
  inspected: number;
  skipped: number;
  reports: readonly InspectionReport[];
  errors: readonly string[];
}>;

export async function sweepRepositories(
  paths: GlobalPaths,
  now: Date = new Date(),
): Promise<SweepResult> {
  const repositories = await readRepositories(paths);
  const reports: InspectionReport[] = [];
  const errors: string[] = [];
  let skipped = 0;
  for (const repository of repositories) {
    try {
      await access(repository.root);
    } catch {
      skipped += 1;
      continue;
    }
    try {
      reports.push(await inspectRepositoryOnce(repository.root, { paths, now }));
    } catch (error) {
      errors.push(`${repository.root}：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { inspected: reports.length, skipped, reports, errors };
}
