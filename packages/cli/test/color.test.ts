import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { runCli } from '../src/main.ts';
import { plainStyle, stdoutSupportsColor, stripStyles, terminalStyle } from '../src/style.ts';
import type { Style } from '../src/style.ts';

function git(root: string, args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: root }, (error) => {
      if (error === null) resolve();
      else reject(error);
    });
  });
}

async function repository(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'pta-color-'));
  await Promise.all(
    Object.entries(files).map(async ([path, source]) => {
      const absolute = join(root, ...path.split('/'));
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, source);
    }),
  );
  await git(root, ['init', '-q']);
  return root;
}

function capture(style: Style): {
  io: { stdout: (text: string) => void; stderr: (text: string) => void; style: Style };
  stdout: () => string;
} {
  const out: string[] = [];
  return {
    io: { stdout: (text) => out.push(text), stderr: () => {}, style },
    stdout: () => out.join(''),
  };
}

test('剥色后信息无损：着色输出剥除 SGR 与素文逐字节相等', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n- [?] 复查条目。2020-01 核对。\n',
    'PENDING.md': '- 根问题如何处理？（暂缓）\n',
    'src/TRUTH.md': '- **标题** 内容\n',
    'src/index.ts': 'export const value = 1;\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));

  const colored = terminalStyle(true);
  for (const argv of [
    ['check'],
    ['domains'],
    ['pending', 'list'],
    ['inspect', 'list'],
    ['changes'],
  ]) {
    const plain = capture(plainStyle);
    const styled = capture(colored);
    const plainCode = await runCli(argv, plain.io, root);
    const styledCode = await runCli(argv, styled.io, root);
    assert.equal(styledCode, plainCode);
    assert.equal(stripStyles(styled.stdout()), plain.stdout(), argv.join(' '));
  }

  const styledCheck = capture(colored);
  await runCli(['check'], styledCheck.io, root);
  assert.notEqual(stripStyles(styledCheck.stdout()), styledCheck.stdout());
});

test('文档体是工件：context 在任何样式下字节一致', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    'src/TRUTH.md': '- 源判断\n',
    'src/index.ts': 'export const value = 1;\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));

  const plain = capture(plainStyle);
  const styled = capture(terminalStyle(true));
  await runCli(['context', 'src/index.ts'], plain.io, root);
  await runCli(['context', 'src/index.ts'], styled.io, root);
  assert.equal(styled.stdout(), plain.stdout());
});

test('stdoutSupportsColor 遵守 NO_COLOR、FORCE_COLOR 与 TTY', () => {
  assert.equal(stdoutSupportsColor({}, true), true);
  assert.equal(stdoutSupportsColor({}, false), false);
  assert.equal(stdoutSupportsColor({ NO_COLOR: '1' }, true), false);
  assert.equal(stdoutSupportsColor({ NO_COLOR: '1', FORCE_COLOR: '1' }, true), false);
  assert.equal(stdoutSupportsColor({ FORCE_COLOR: '1' }, false), true);
  assert.equal(stdoutSupportsColor({ FORCE_COLOR: '0' }, true), false);
  assert.equal(stdoutSupportsColor({ TERM: 'dumb' }, true), false);
});
