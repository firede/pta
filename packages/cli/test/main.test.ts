import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { runCli } from '../src/main.ts';

function git(root: string, args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: root }, (error) => {
      if (error === null) resolve();
      else reject(error);
    });
  });
}

async function repository(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'pta-cli-'));
  await Promise.all(
    Object.entries(files).map(async ([path, source]) => {
      const absolute = join(root, ...path.split('/'));
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, source);
    }),
  );
  return root;
}

function capture(): {
  io: { stdout: (text: string) => void; stderr: (text: string) => void };
  stdout: () => string;
  stderr: () => string;
} {
  const out: string[] = [];
  const error: string[] = [];
  return {
    io: {
      stdout: (text) => out.push(text),
      stderr: (text) => error.push(text),
    },
    stdout: () => out.join(''),
    stderr: () => error.join(''),
  };
}

test('check 按领域输出机器违例并返回 1', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    'src/TRUTH.md': '- **标题** 内容\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  const output = capture();

  assert.equal(await runCli(['check', root], output.io), 1);
  assert.match(output.stdout(), /领域 src/u);
  assert.match(output.stdout(), /\[violation \| machine-decidable\] src\/TRUTH\.md:1/u);
  assert.equal(output.stderr(), '');
});

test('check 仅有术语不一致嫌疑时返回 0，无信号时输出通过', async (context) => {
  const suspicionRoot = await repository({
    'TRUTH.md': '- 根判断\n',
    'GLOSSARY.md': '- **术语**：上级定义\n',
    'child/TRUTH.md': '- 下级判断\n',
    'child/GLOSSARY.md': '- **术语**：下级定义\n',
  });
  const cleanRoot = await repository({ 'TRUTH.md': '- 根判断\n' });
  context.after(async () => {
    await Promise.all([
      rm(suspicionRoot, { recursive: true, force: true }),
      rm(cleanRoot, { recursive: true, force: true }),
    ]);
  });

  const suspicion = capture();
  assert.equal(await runCli(['check', suspicionRoot], suspicion.io), 0);
  assert.match(suspicion.stdout(), /\[term inconsistency \| suspicion\]/u);

  const clean = capture();
  assert.equal(await runCli(['check', cleanRoot], clean.io), 0);
  assert.equal(clean.stdout(), '通过：未发现核查信号。\n');
});

test('changes 从工作树收集变更，输出漂移候选与待裁决背景并返回 0', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    'PENDING.md': '- 根问题如何处理？当前按最保守方式处理。\n',
    'src/TRUTH.md': '- 源码判断\n',
    'src/index.ts': 'export const value = 1;\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);
  await git(root, ['add', '.']);
  await git(root, [
    '-c',
    'user.name=PTA Test',
    '-c',
    'user.email=pta@example.invalid',
    'commit',
    '-qm',
    'fixture',
  ]);
  await writeFile(join(root, 'src/index.ts'), 'export const value = 2;\n');
  const output = capture();

  assert.equal(await runCli(['changes'], output.io, root), 0);
  assert.match(output.stdout(), /领域 src/u);
  assert.match(output.stdout(), /触面：实现文件被触/u);
  assert.match(output.stdout(), /\[drift suspicion \| suspicion\]/u);
  assert.match(output.stdout(), /待裁决背景：[\s\S]*根问题如何处理/u);
  assert.equal(output.stderr(), '');

  await git(root, ['add', 'src/index.ts']);
  await git(root, [
    '-c',
    'user.name=PTA Test',
    '-c',
    'user.email=pta@example.invalid',
    'commit',
    '-qm',
    'change',
  ]);
  const based = capture();
  assert.equal(await runCli(['changes', 'HEAD~1'], based.io, root), 0);
  assert.match(based.stdout(), /\[modified\] src\/index\.ts/u);
  assert.equal(based.stderr(), '');
});

test('changes 的用法与 git 错误返回 2', async (context) => {
  const root = await repository({ 'TRUTH.md': '- 根判断\n' });
  context.after(() => rm(root, { recursive: true, force: true }));

  const usage = capture();
  assert.equal(await runCli(['changes', 'HEAD', 'extra'], usage.io, root), 2);
  assert.match(usage.stderr(), /用法：pta changes/u);

  const failure = capture();
  assert.equal(await runCli(['changes'], failure.io, root), 2);
  assert.match(failure.stderr(), /pta changes 失败/u);
});
