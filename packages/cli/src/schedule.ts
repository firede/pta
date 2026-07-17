import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  readRepositories,
  runAgentTask,
  type CronEntry,
  type GlobalConfig,
  type GlobalPaths,
} from '@pta/runtime';

import { listValues } from './format.ts';
import { inspectRepositoryOnce } from './inspection.ts';

export type CronRunOutcome = Readonly<{
  id: string;
  action: CronEntry['action'];
  ok: boolean;
  detail: string;
}>;

export function cronOutputFilePath(paths: GlobalPaths, id: string): string {
  return join(paths.cacheDir, 'cron-output', `${id}.txt`);
}

async function resolveTargets(
  entry: CronEntry,
  paths: GlobalPaths,
): Promise<{ roots: string[]; missing: string[] }> {
  const candidates =
    entry.repository === 'all'
      ? (await readRepositories(paths)).map((repository) => repository.root)
      : [entry.repository];
  const roots: string[] = [];
  const missing: string[] = [];
  for (const root of candidates) {
    try {
      await access(root);
      roots.push(root);
    } catch {
      missing.push(root);
    }
  }
  return { roots, missing };
}

export async function executeCronEntry(
  entry: CronEntry,
  paths: GlobalPaths,
  config: GlobalConfig,
  now: Date = new Date(),
): Promise<CronRunOutcome> {
  const agent = entry.agent === undefined ? undefined : config.agents[entry.agent];
  if (entry.agent !== undefined && agent === undefined) {
    return {
      id: entry.id,
      action: entry.action,
      ok: false,
      detail: `agent「${entry.agent}」未在 config.toml 配置`,
    };
  }

  const { roots, missing } = await resolveTargets(entry, paths);
  if (roots.length === 0) {
    return {
      id: entry.id,
      action: entry.action,
      ok: false,
      detail:
        missing.length > 0 ? `仓库不可达: ${listValues(missing)}` : '注册表为空，没有可巡检的仓库',
    };
  }

  if (entry.action === 'inspect' || entry.action === 'derive') {
    const parts: string[] = [];
    let ok = true;
    for (const root of roots) {
      try {
        const report = await inspectRepositoryOnce(root, {
          paths,
          now,
          ...(entry.action === 'derive' && entry.agent !== undefined && agent !== undefined
            ? { agentName: entry.agent, agent }
            : {}),
        });
        const derivation =
          report.derivation === undefined
            ? ''
            : `，推导 ${report.derivation.derived}/评估 ${report.derivation.evaluated}${report.derivation.failures.length > 0 ? `/失败 ${report.derivation.failures.length}` : ''}`;
        parts.push(
          `${root}: 到期 ${report.counts.expired}、条件触发 ${report.counts.conditionTriggered}${derivation}`,
        );
        if ((report.derivation?.failures.length ?? 0) > 0) ok = false;
      } catch (error) {
        ok = false;
        parts.push(`${root}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (missing.length > 0) parts.push(`不可达: ${listValues(missing)}`);
    return { id: entry.id, action: entry.action, ok, detail: parts.join('；') };
  }

  const root = roots[0] as string;
  const result = await runAgentTask(
    agent as NonNullable<typeof agent>,
    entry.prompt as string,
    root,
  );
  const outputFile = cronOutputFilePath(paths, entry.id);
  await mkdir(join(outputFile, '..'), { recursive: true });
  await writeFile(outputFile, result.output);
  return {
    id: entry.id,
    action: entry.action,
    ok: result.ok,
    detail: result.ok
      ? `完成 (${Math.round(result.durationMs / 1000)}s)，输出存于 ${outputFile}`
      : `失败: ${result.error ?? '未知错误'}`,
  };
}
