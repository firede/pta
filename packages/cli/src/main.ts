#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ExitCode, run } from '@stricli/core';

import { buildPtaApplication, routeListing, type PtaContext } from './app.ts';
import { listValues } from './format.ts';
import { cliVersion, type CliIO } from './management.ts';
import { stdoutSupportsColor, terminalStyle } from './style.ts';

export type { CliIO };

const processIO: CliIO = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  style: terminalStyle(stdoutSupportsColor()),
};

type PreparedInput =
  | Readonly<{ kind: 'ok'; args: readonly string[]; cwd: string }>
  | Readonly<{ kind: 'error'; message: string }>;

/** 全局旗标 --cwd/-C 在进入命令解析前抽取，语义同 git -C。 */
function prepareInput(args: readonly string[], cwd: string): PreparedInput {
  const rest: string[] = [];
  let directory: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] as string;
    if (arg === '--cwd' || arg === '-C') {
      const value = args[index + 1];
      if (value === undefined) return { kind: 'error', message: `${arg} 需要一个目录参数。` };
      directory = value;
      index += 1;
    } else if (arg.startsWith('--cwd=')) {
      directory = arg.slice('--cwd='.length);
    } else {
      rest.push(arg);
    }
  }
  return {
    kind: 'ok',
    args: rest.length === 0 ? ['--help'] : rest,
    cwd: directory === undefined ? cwd : resolve(cwd, directory),
  };
}

/** 未知子命令时枚举可用动词：编辑距离救不了 add 与 create 这类错猜，枚举才是下一步动作。 */
function unknownCommandHint(args: readonly string[], io: CliIO): void {
  const first = args.find((arg) => !arg.startsWith('-'));
  const group = first !== undefined && first in routeListing ? first : '';
  const available = routeListing[group] as readonly string[];
  if (group === '') {
    io.stderr(`可用命令: ${listValues(available)}；pta --help 看分组说明。\n`);
  } else {
    io.stderr(
      `「pta ${group}」可用子命令: ${listValues(available)}；细节见 pta ${group} --help。\n`,
    );
  }
}

export async function runCli(
  args: readonly string[],
  io: CliIO = processIO,
  cwd = process.cwd(),
): Promise<number> {
  const prepared = prepareInput(args, cwd);
  if (prepared.kind === 'error') {
    io.stderr(`${prepared.message}\n`);
    return 2;
  }
  const app = buildPtaApplication(await cliVersion());
  const context: PtaContext = {
    process: {
      stdout: { write: io.stdout },
      stderr: { write: io.stderr },
      env: process.env as Readonly<Partial<Record<string, string>>>,
    },
    io,
    cwd: prepared.cwd,
  };
  await run(app, prepared.args, context);
  const raw = context.process.exitCode;
  const code = typeof raw === 'number' ? raw : 0;
  if (code >= 0) return code;
  if (code === ExitCode.UnknownCommand) unknownCommandHint(prepared.args, io);
  return 2;
}

async function main(): Promise<void> {
  try {
    process.exitCode = await runCli(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`pta 运行失败: ${message}\n`);
    process.exitCode = 2;
  }
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  await main();
}
