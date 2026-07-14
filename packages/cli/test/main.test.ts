import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { hashEntryContent } from '@pta/core';

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
  await git(root, ['init', '-q']);
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
  await Promise.all([git(suspicionRoot, ['init', '-q']), git(cleanRoot, ['init', '-q'])]);

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

test('pending 按领域汇总待裁决条目并返回 0', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    'PENDING.md': '- 根问题如何处理？（暂按最保守方式处理）\n',
    'packages/core/TRUTH.md': '- 核心判断\n',
    'packages/core/PENDING.md': '- 核心问题一如何裁决？（暂缓）\n- 核心问题二如何裁决？（暂缓）\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);
  const output = capture();

  assert.equal(await runCli(['pending', root], output.io), 0);
  assert.match(output.stdout(), /领域 \./u);
  assert.match(output.stdout(), /^ {2}[0-9a-f]{8} PENDING\.md:1 根问题如何处理/mu);
  assert.match(output.stdout(), /领域 packages\/core/u);
  assert.match(
    output.stdout(),
    /^ {2}[0-9a-f]{8} packages\/core\/PENDING\.md:2 核心问题二如何裁决/mu,
  );
  assert.match(output.stdout(), /共 3 条待裁决条目，分布于 2 个领域。/u);
  assert.equal(output.stderr(), '');
});

test('pending remove 按 id 处置条目，歧义需领域限定，清空即删', async (context) => {
  const shared = '共同问题如何处理？（暂缓）';
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    'PENDING.md': `- 根问题如何处理？（暂缓）\n- ${shared}\n`,
    'src/TRUTH.md': '- 源判断\n',
    'src/PENDING.md': `- ${shared}\n`,
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);
  const rootId = hashEntryContent('根问题如何处理？（暂缓）').slice(0, 8);
  const sharedId = hashEntryContent(shared).slice(0, 8);

  const ambiguous = capture();
  assert.equal(await runCli(['pending', 'remove', sharedId], ambiguous.io, root), 2);
  assert.match(ambiguous.stderr(), /id 有歧义/u);
  assert.match(ambiguous.stderr(), /src:[0-9a-f]{8}/u);
  assert.match(ambiguous.stderr(), /未做任何改动/u);

  const removed = capture();
  assert.equal(await runCli(['pending', 'remove', rootId, `src:${sharedId}`], removed.io, root), 0);
  assert.match(removed.stdout(), /已处置 2 条待裁决条目：/u);
  assert.match(removed.stdout(), /^ {2}\. [0-9a-f]{8} 根问题如何处理/mu);
  assert.match(removed.stdout(), /src\/PENDING\.md 清空即删。/u);
  assert.equal(await readFile(join(root, 'PENDING.md'), 'utf8'), `- ${shared}\n`);
  assert.equal(existsSync(join(root, 'src/PENDING.md')), false);

  const missing = capture();
  assert.equal(await runCli(['pending', 'remove', 'ffffffff'], missing.io, root), 2);
  assert.match(missing.stderr(), /未匹配任何待裁决条目/u);
});

test('pending 收件箱为空时输出空提示，用法错误返回 2', async (context) => {
  const root = await repository({ 'TRUTH.md': '- 根判断\n' });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);

  const empty = capture();
  assert.equal(await runCli(['pending', root], empty.io), 0);
  assert.equal(empty.stdout(), '收件箱为空：没有待裁决条目。\n');
  assert.equal(empty.stderr(), '');

  const usage = capture();
  assert.equal(await runCli(['pending', root, 'extra'], usage.io), 2);
  assert.match(usage.stderr(), /用法：pta pending/u);
});

test('context 输出领域链与来源标识并返回 0', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    'PENDING.md': '- 根问题如何处理？（暂缓）\n',
    'src/TRUTH.md': '- 源判断\n',
    'src/GLOSSARY.md': '- **术语**：定义\n',
    'src/index.ts': 'export const value = 1;\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);

  const uncommitted = capture();
  assert.equal(await runCli(['context', 'src/index.ts'], uncommitted.io, root), 0);
  assert.match(uncommitted.stdout(), /# 项目真相背景/u);
  assert.match(uncommitted.stdout(), /来源：无提交基线/u);
  assert.match(uncommitted.stdout(), /^ {2}src\/TRUTH\.md [0-9a-f]{64}$/mu);
  assert.match(uncommitted.stdout(), /路径归属：\n {2}src\/index\.ts → 领域 src/u);
  assert.match(uncommitted.stdout(), /## 领域 \.\n\n### 真相记录\n\n- 根判断/u);
  assert.match(uncommitted.stdout(), /### 待裁决背景\n\n- [0-9a-f]{8} 根问题如何处理/u);
  assert.match(uncommitted.stdout(), /## 领域 src[\s\S]*### 术语表\n\n- \*\*术语\*\*：定义/u);
  assert.equal(uncommitted.stderr(), '');

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
  const committed = capture();
  assert.equal(await runCli(['context', 'src/index.ts'], committed.io, root), 0);
  assert.match(committed.stdout(), /来源：[0-9a-f]{40}\n/u);
  assert.doesNotMatch(committed.stdout(), /所涉内容哈希/u);

  const usage = capture();
  assert.equal(await runCli(['context'], usage.io, root), 2);
  assert.match(usage.stderr(), /用法：pta context/u);
});

test('命令用法与 git 错误返回 2', async (context) => {
  const root = await repository({ 'TRUTH.md': '- 根判断\n' });
  context.after(() => rm(root, { recursive: true, force: true }));

  const usage = capture();
  assert.equal(await runCli(['changes', 'HEAD', 'extra'], usage.io, root), 2);
  assert.match(usage.stderr(), /用法：pta changes/u);

  const failure = capture();
  assert.equal(await runCli(['changes'], failure.io, root), 2);
  assert.match(failure.stderr(), /pta changes 失败/u);

  const checkFailure = capture();
  assert.equal(await runCli(['check', root], checkFailure.io), 2);
  assert.match(checkFailure.stderr(), /pta check 失败/u);
});

test('check 使用 Git 清单并排除被忽略路径', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    '.gitignore': 'ignored/\n',
    'ignored/TRUTH.md': '- **不应出现**\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);
  const output = capture();

  assert.equal(await runCli(['check', root], output.io), 0);
  assert.equal(output.stdout(), '通过：未发现核查信号。\n');
});

test('check 从清单扣除工作树中已删除的跟踪文件', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    'PENDING.md': '- 待裁决问题？当前保留。\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);
  await git(root, ['add', '.']);
  await rm(join(root, 'PENDING.md'));
  const output = capture();

  assert.equal(await runCli(['check', root], output.io), 0);
  assert.equal(output.stdout(), '通过：未发现核查信号。\n');
});
