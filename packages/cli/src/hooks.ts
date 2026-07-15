import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runGit } from './inspection.ts';
import { audit, type CliIO } from './management.ts';

const marker = '# pta-remind';
const cliMainPath = fileURLToPath(new URL('./main.ts', import.meta.url));

async function hookFilePath(cwd: string): Promise<string> {
  const gitDir = (await runGit(['rev-parse', '--git-dir'], cwd)).trim();
  const absoluteGitDir = gitDir.startsWith('/') ? gitDir : join(cwd, gitDir);
  return join(absoluteGitDir, 'hooks', 'pre-commit');
}

export function remindHookCommand(): string {
  return `"${process.execPath}" "${cliMainPath}" remind --staged || true`;
}

function renderHookScript(): string {
  return `#!/bin/sh\n${marker}\n${remindHookCommand()}\n`;
}

export type HookState = 'pta' | 'foreign' | 'absent';

export async function hookStatus(cwd: string): Promise<{ state: HookState; path: string }> {
  const path = await hookFilePath(cwd);
  try {
    const content = await readFile(path, 'utf8');
    return {
      state: content.includes(marker) || content.includes('remind') ? 'pta' : 'foreign',
      path,
    };
  } catch {
    return { state: 'absent', path };
  }
}

export async function runHook(args: readonly string[], io: CliIO, cwd: string): Promise<number> {
  const action = args[0];
  if (
    args.length !== 1 ||
    (action !== 'install' && action !== 'uninstall' && action !== 'status')
  ) {
    io.stderr('用法：pta hook <install|uninstall|status>\n');
    return 2;
  }
  let status;
  try {
    status = await hookStatus(cwd);
  } catch (error) {
    io.stderr(`pta hook 失败：${error instanceof Error ? error.message : String(error)}\n`);
    return 2;
  }

  if (action === 'status') {
    if (status.state === 'pta') io.stdout(`已接线：${status.path} 会在提交前运行 PTA 提醒。\n`);
    else if (status.state === 'foreign') {
      io.stdout(
        `存在其他 pre-commit 钩子（${status.path}），未接线。\n合作式接入：在既有钩子链中加入一行\n  ${remindHookCommand()}\n`,
      );
    } else io.stdout(`未接线。运行 pta hook install 安装提交前提醒（不拦截提交）。\n`);
    return 0;
  }

  if (action === 'install') {
    if (status.state === 'pta') {
      io.stdout('已接线，无需重复安装。\n');
      return 0;
    }
    if (status.state === 'foreign') {
      io.stderr(
        `已存在其他 pre-commit 钩子，不代为改写：${status.path}\n请在既有钩子链中加入一行：\n  ${remindHookCommand()}\n`,
      );
      return 2;
    }
    await mkdir(join(status.path, '..'), { recursive: true });
    await writeFile(status.path, renderHookScript());
    await chmod(status.path, 0o755);
    await audit(io, 'hook-install', { path: status.path });
    io.stdout(`已安装提交前提醒：${status.path}（只提醒，不拦截）。\n`);
    return 0;
  }

  if (status.state !== 'pta') {
    io.stdout(
      status.state === 'absent' ? '未接线，无需卸载。\n' : '钩子不是 pta 安装的，不代为删除。\n',
    );
    return status.state === 'absent' ? 0 : 2;
  }
  const content = await readFile(status.path, 'utf8');
  if (!content.includes(marker)) {
    io.stderr('钩子包含 remind 调用但非 pta 生成（缺标记），请手动移除对应行。\n');
    return 2;
  }
  await rm(status.path, { force: true });
  await audit(io, 'hook-uninstall', { path: status.path });
  io.stdout('已卸载提交前提醒。\n');
  return 0;
}
