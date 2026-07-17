import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { hashEntryContent } from '@pta/core';

import { runCli } from '../src/main.ts';
import { readInspectionReports, sweepRepositories } from '../src/inspection.ts';
import { resolveGlobalPaths } from '@pta/runtime';

const globalDirs = await mkdtemp(join(tmpdir(), 'pta-global-'));
process.env['XDG_STATE_HOME'] = join(globalDirs, 'state');
process.env['XDG_CACHE_HOME'] = join(globalDirs, 'cache');
process.env['XDG_CONFIG_HOME'] = join(globalDirs, 'config');

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

test('裸 pta 输出动线叙事帮助并返回 0', async () => {
  const output = capture();
  assert.equal(await runCli([], output.io), 0);
  assert.match(output.stdout(), /用法/u);
  assert.match(output.stdout(), /- 开工之前：/u);
  assert.match(output.stdout(), /全局旗标 `--cwd <目录>`/u);
  assert.match(output.stdout(), /domains {2,}/u);
  assert.match(output.stdout(), /登记与处置待裁决问题/u);
  assert.equal(output.stderr(), '');
});

test('裸组名输出组帮助，命令帮助含示例与完整说明', async () => {
  const group = capture();
  assert.equal(await runCli(['pending'], group.io), 0);
  assert.match(group.stdout(), /登记待裁决条目/u);
  assert.match(group.stdout(), /处置完成后移除条目/u);

  const command = capture();
  assert.equal(await runCli(['changes', '--help'], command.io), 0);
  assert.match(command.stdout(), /受托任务收尾时用它自察未解释漂移/u);
  assert.match(command.stdout(), /pta changes \[--staged\] \[<基线>\]/u);
  assert.match(command.stdout(), /--staged/u);

  const hidden = capture();
  assert.equal(await runCli(['daemon'], hidden.io), 0);
  assert.doesNotMatch(hidden.stdout(), /前台运行守护进程/u);

  const revealed = capture();
  assert.equal(await runCli(['daemon', '--help-all'], revealed.io), 0);
  assert.match(revealed.stdout(), /在前台运行守护进程，供服务管理器调用/u);
});

test('未知命令与未知子命令枚举可用动词并返回 2', async () => {
  const rootLevel = capture();
  assert.equal(await runCli(['nonexistent'], rootLevel.io), 2);
  assert.match(rootLevel.stderr(), /未知命令 nonexistent/u);
  assert.match(rootLevel.stderr(), /可用命令: domains, context, check, changes/u);

  const groupLevel = capture();
  assert.equal(await runCli(['cron', 'add', 'x'], groupLevel.io), 2);
  assert.match(groupLevel.stderr(), /「pta cron」可用子命令: list, create, edit, delete, run/u);
});

test('--version 输出版本号', async () => {
  const output = capture();
  assert.equal(await runCli(['--version'], output.io), 0);
  assert.match(output.stdout(), /\d+\.\d+\.\d+/u);
});

test('check 按领域输出机器违例并返回 1，--cwd 与 -C 等价', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    'src/TRUTH.md': '- **标题** 内容\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);

  const viaCwd = capture();
  assert.equal(await runCli(['check'], viaCwd.io, root), 1);
  assert.match(viaCwd.stdout(), /领域 `src`/u);
  assert.match(viaCwd.stdout(), /\[违例 \| 机器可判定\] src\/TRUTH\.md:1/u);
  assert.equal(viaCwd.stderr(), '');

  const viaFlag = capture();
  assert.equal(await runCli(['--cwd', root, 'check'], viaFlag.io), 1);
  assert.equal(viaFlag.stdout(), viaCwd.stdout());

  const viaAlias = capture();
  assert.equal(await runCli(['-C', root, 'check'], viaAlias.io), 1);
  assert.equal(viaAlias.stdout(), viaCwd.stdout());
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
  assert.equal(await runCli(['check'], suspicion.io, suspicionRoot), 0);
  assert.match(suspicion.stdout(), /\[术语不一致 \| 嫌疑\]/u);

  const clean = capture();
  assert.equal(await runCli(['check'], clean.io, cleanRoot), 0);
  assert.equal(clean.stdout(), '通过: 未发现核查信号。\n');
});

test('domains 列出领域、条目计数、依赖与外置范围', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    'PENDING.md': '- 根问题如何处理？（暂缓）\n',
    'src/TRUTH.md': '- 源判断一\n- 源判断二\n',
    'src/GLOSSARY.md': '- **术语**：定义\n',
    'lib/index.ts': 'export const value = 1;\n',
    'lib/extra.ts': 'export const extra = 2;\n',
    '.pta/ext/TRUTH.md': '---\npath: lib\n---\n\n- 外置判断\n',
    '.pta/onefile/TRUTH.md': '---\npath: lib\nfiles:\n  - index.ts\n---\n\n- 单文件判断\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);
  const output = capture();

  assert.equal(await runCli(['domains'], output.io, root), 0);
  assert.match(output.stdout(), /^领域 `\.` \(根\) +真相 1、待裁决 1$/mu);
  assert.match(output.stdout(), /^领域 `src` +真相 2、术语 1$/mu);
  assert.match(output.stdout(), /^领域 `\.pta\/ext` +真相 1 +范围 lib$/mu);
  assert.match(output.stdout(), /^领域 `\.pta\/onefile` +真相 1 +范围 lib 的 index\.ts$/mu);
  assert.match(output.stdout(), /共 4 个领域。/u);
  assert.equal(output.stderr(), '');
});

test('context 接受领域标识，外置领域经标识定位', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    'lib/index.ts': 'export const value = 1;\n',
    'lib/extra.ts': 'export const extra = 2;\n',
    '.pta/ext/TRUTH.md': '---\npath: lib\n---\n\n- 外置判断\n',
    '.pta/onefile/TRUTH.md': '---\npath: lib\nfiles:\n  - index.ts\n---\n\n- 单文件判断\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);

  const wholeDirectory = capture();
  assert.equal(await runCli(['context', '.pta/ext'], wholeDirectory.io, root), 0);
  assert.match(wholeDirectory.stdout(), /范围: [^\n]*领域 `\.pta\/ext`/u);
  assert.match(wholeDirectory.stdout(), /- 外置判断/u);

  const fileScoped = capture();
  assert.equal(await runCli(['context', '.pta/onefile'], fileScoped.io, root), 0);
  assert.match(fileScoped.stdout(), /范围: [^\n]*领域 `\.pta\/onefile`/u);
  assert.match(fileScoped.stdout(), /- 单文件判断/u);
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
  assert.match(output.stdout(), /领域 `src`/u);
  assert.match(output.stdout(), /触面: 实现文件被触/u);
  assert.match(output.stdout(), /\[漂移嫌疑 \| 嫌疑\]/u);
  assert.match(output.stdout(), /待裁决背景:[\s\S]*根问题如何处理/u);
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
  assert.match(based.stdout(), /^ {2}M src\/index\.ts$/mu);
  assert.equal(based.stderr(), '');

  const conflict = capture();
  assert.equal(await runCli(['changes', 'HEAD~1', '--staged'], conflict.io, root), 2);
  assert.match(conflict.stderr(), /基线与 --staged 不能同时使用/u);
});

test('pending list 按领域汇总待裁决条目并返回 0', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    'PENDING.md': '- 根问题如何处理？（暂按最保守方式处理）\n',
    'packages/core/TRUTH.md': '- 核心判断\n',
    'packages/core/PENDING.md': '- 核心问题一如何裁决？（暂缓）\n- 核心问题二如何裁决？（暂缓）\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);
  const output = capture();

  assert.equal(await runCli(['pending', 'list'], output.io, root), 0);
  assert.match(output.stdout(), /领域 `\.` \(根\)/u);
  assert.match(output.stdout(), /^ {2}- [0-9a-f]{8} PENDING\.md:1 根问题如何处理/mu);
  assert.match(output.stdout(), /领域 `packages\/core`/u);
  assert.match(
    output.stdout(),
    /^ {2}- [0-9a-f]{8} packages\/core\/PENDING\.md:2 核心问题二如何裁决/mu,
  );
  assert.match(
    output.stdout(),
    /共 3 条待裁决条目，分布于 2 个领域；处置用 pta pending resolve <id>。/u,
  );
  assert.equal(output.stderr(), '');
});

test('pending resolve 按 id 处置条目，歧义需领域限定，清空即删', async (context) => {
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
  assert.equal(await runCli(['pending', 'resolve', sharedId], ambiguous.io, root), 2);
  assert.match(ambiguous.stderr(), /id 有歧义/u);
  assert.match(ambiguous.stderr(), /src:[0-9a-f]{8}/u);
  assert.match(ambiguous.stderr(), /未做任何改动/u);

  const resolved = capture();
  assert.equal(
    await runCli(['pending', 'resolve', rootId, `src:${sharedId}`], resolved.io, root),
    0,
  );
  assert.match(resolved.stdout(), /已处置 2 条待裁决条目:/u);
  assert.match(resolved.stdout(), /^ {2}- \.:[0-9a-f]{8} 根问题如何处理/mu);
  assert.match(resolved.stdout(), /src\/PENDING\.md 清空即删。/u);
  assert.equal(await readFile(join(root, 'PENDING.md'), 'utf8'), `- ${shared}\n`);
  assert.equal(existsSync(join(root, 'src/PENDING.md')), false);

  const missing = capture();
  assert.equal(await runCli(['pending', 'resolve', 'ffffffff'], missing.io, root), 2);
  assert.match(missing.stderr(), /未匹配任何待裁决条目/u);
});

test('pending add 登记条目、幂等判重并惰性创建文件', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    'src/TRUTH.md': '- 源判断\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);

  const added = capture();
  assert.equal(
    await runCli(['pending', 'add', 'src', '新问题如何处理？（暂缓）'], added.io, root),
    0,
  );
  assert.match(added.stdout(), /已登记待裁决条目: 领域 `src` [0-9a-f]{8} src\/PENDING\.md:1/u);
  assert.equal(added.stderr(), '');
  assert.equal(
    await readFile(join(root, 'src/PENDING.md'), 'utf8'),
    '- 新问题如何处理？（暂缓）\n',
  );

  const duplicate = capture();
  assert.equal(
    await runCli(['pending', 'add', 'src', '新问题如何处理？（暂缓）'], duplicate.io, root),
    0,
  );
  assert.match(duplicate.stdout(), /已存在同内容条目: 领域 `src` [0-9a-f]{8}/u);

  const statement = capture();
  assert.equal(await runCli(['pending', 'add', '.', '这是陈述句'], statement.io, root), 0);
  assert.match(statement.stderr(), /应当以问句表述/u);
  assert.equal(await readFile(join(root, 'PENDING.md'), 'utf8'), '- 这是陈述句\n');

  const unknown = capture();
  assert.equal(await runCli(['pending', 'add', 'nowhere', '问题？'], unknown.io, root), 2);
  assert.match(unknown.stderr(), /未找到领域: nowhere/u);

  const missingArgument = capture();
  assert.equal(await runCli(['pending', 'add', 'src'], missingArgument.io, root), 2);
  assert.match(missingArgument.stderr(), /参数错误: 缺少位置参数 <问题>/u);
});

test('context 透出涉及领域的核查提示且不阻断', async (context) => {
  const root = await repository({
    'TRUTH.md': '- 根判断\n',
    'src/TRUTH.md': '- **加粗领起** 判断\n',
    'src/index.ts': 'export const value = 1;\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);
  const output = capture();

  assert.equal(await runCli(['context', 'src/index.ts'], output.io, root), 0);
  assert.match(output.stdout(), /核查提示 \(读取时叠加，不入产物\):/u);
  assert.match(output.stdout(), /\[违例 \| 机器可判定\] src\/TRUTH\.md:1/u);
});

test('pending list 收件箱为空时输出空提示，多余参数返回 2', async (context) => {
  const root = await repository({ 'TRUTH.md': '- 根判断\n' });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);

  const empty = capture();
  assert.equal(await runCli(['pending', 'list'], empty.io, root), 0);
  assert.equal(empty.stdout(), '收件箱为空：没有待裁决条目。\n');
  assert.equal(empty.stderr(), '');

  const extra = capture();
  assert.equal(await runCli(['pending', 'list', 'extra'], extra.io, root), 2);
  assert.match(extra.stderr(), /参数错误: 多余的位置参数 "extra"/u);
});

test('inspect list 圈定巡检集合并报告到期', async (context) => {
  const root = await repository({
    'TRUTH.md':
      '- 普通判断，不入巡检集合。\n- [?] 风险分级与学会指南一致。2020-01 核对指南是否更新。\n- [?] 服务部署在单台服务器上。部署拓扑变化时复查。\n',
    'RESIDUE.md': '- 2024-03 之前的数据无法区分邻面龋。\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);
  const output = capture();

  assert.equal(await runCli(['inspect', 'list'], output.io, root), 0);
  assert.match(output.stdout(), /巡检集合: 3 条 \(1 个领域\)/u);
  assert.match(
    output.stdout(),
    /到期:\n {2}\[到期 \| 机器可判定\] TRUTH\.md:2 复查线索 2020-01 已到期/u,
  );
  assert.match(
    output.stdout(),
    /待推导 \(无线索记录，可 pta inspect derive 或 pta inspect register\):/u,
  );
  assert.match(output.stdout(), /^ {2}- [0-9a-f]{8} TRUTH\.md:3 \[\?\] 服务部署在单台服务器上/mu);
  assert.match(output.stdout(), /残留 \(整类巡检\):/u);
  assert.match(output.stdout(), /^ {2}- [0-9a-f]{8} RESIDUE\.md:1 2024-03 之前的数据/mu);
  assert.equal(output.stderr(), '');
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
  assert.match(uncommitted.stdout(), /来源: 无提交基线/u);
  assert.match(uncommitted.stdout(), /^ {2}src\/TRUTH\.md sha256:[0-9a-f]{64}$/mu);
  assert.match(uncommitted.stdout(), /路径归属:\n {2}src\/index\.ts → 领域 `src`/u);
  assert.match(uncommitted.stdout(), /## 领域 `\.` \(根\)\n\n### 真相记录\n\n- 根判断/u);
  assert.match(uncommitted.stdout(), /### 待裁决背景\n\n- [0-9a-f]{8} 根问题如何处理/u);
  assert.match(uncommitted.stdout(), /## 领域 `src`[\s\S]*### 术语表\n\n- \*\*术语\*\*：定义/u);
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
  assert.match(committed.stdout(), /来源: commit [0-9a-f]{40}\n/u);
  assert.doesNotMatch(committed.stdout(), /所涉内容哈希/u);

  const usage = capture();
  assert.equal(await runCli(['context'], usage.io, root), 2);
  assert.match(usage.stderr(), /参数错误: 缺少位置参数 <路径>/u);
});

test('参数错误与 git 错误返回 2', async (context) => {
  const root = await repository({ 'TRUTH.md': '- 根判断\n' });
  context.after(() => rm(root, { recursive: true, force: true }));

  const extra = capture();
  assert.equal(await runCli(['changes', 'HEAD', 'extra'], extra.io, root), 2);
  assert.match(extra.stderr(), /参数错误: 多余的位置参数 "extra"/u);

  const failure = capture();
  assert.equal(await runCli(['changes'], failure.io, root), 2);
  assert.match(failure.stderr(), /pta changes 失败/u);

  const checkFailure = capture();
  assert.equal(await runCli(['check'], checkFailure.io, root), 2);
  assert.match(checkFailure.stderr(), /pta check 失败/u);

  const missingDirectory = capture();
  assert.equal(await runCli(['--cwd'], missingDirectory.io), 2);
  assert.match(missingDirectory.stderr(), /--cwd 需要一个目录参数/u);
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

  assert.equal(await runCli(['check'], output.io, root), 0);
  assert.equal(output.stdout(), '通过: 未发现核查信号。\n');
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

  assert.equal(await runCli(['check'], output.io, root), 0);
  assert.equal(output.stdout(), '通过: 未发现核查信号。\n');
});

test('inspect register 注册推导叠加进报告，logs 记录关键行为', async (context) => {
  const entry = '[?] 服务仅五名员工使用，权限按人对人授权。人数变化时复查。';
  const root = await repository({ 'TRUTH.md': `- ${entry}\n` });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);
  const id = hashEntryContent(entry).slice(0, 8);

  const before = capture();
  assert.equal(await runCli(['inspect', 'list'], before.io, root), 0);
  assert.match(
    before.stdout(),
    /待推导 \(无线索记录，可 pta inspect derive 或 pta inspect register\):/u,
  );

  const condition = capture();
  assert.equal(await runCli(['inspect', 'register', id, '条件'], condition.io, root), 0);
  assert.match(condition.stdout(), /已注册推导: 领域 `\.` \(根\) [0-9a-f]{8} → 条件型/u);

  const confirmed = capture();
  assert.equal(await runCli(['inspect', 'list'], confirmed.io, root), 0);
  assert.match(confirmed.stdout(), /条件型 \(待评估\):/u);

  const dated = capture();
  assert.equal(await runCli(['inspect', 'register', id, '2030-06'], dated.io, root), 0);
  const upcoming = capture();
  assert.equal(await runCli(['inspect', 'list'], upcoming.io, root), 0);
  assert.match(
    upcoming.stdout(),
    /日期型 \(未到期\):\n {2}- [0-9a-f]{8} TRUTH\.md:1 .*\(2030-06 到期\)$/mu,
  );

  const badValue = capture();
  assert.equal(await runCli(['inspect', 'register', id, '随便'], badValue.io, root), 2);
  assert.match(badValue.stderr(), /线索值必须是到期日期/u);

  const logs = capture();
  assert.equal(await runCli(['logs', '10'], logs.io, root), 0);
  assert.match(logs.stdout(), /\[cli\] derivation-register/u);
});

test('inspect derive 经 agent 推导条件线索并评估，报告随之升级', async (context) => {
  const root = await repository({
    'TRUTH.md': '- [?] 服务部署在单台服务器上。部署拓扑变化时复查。\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);

  const scriptPath = join(globalDirs, 'fake-agent.mjs');
  await writeFile(
    scriptPath,
    [
      "let data = '';",
      "process.stdin.on('data', (chunk) => { data += chunk; });",
      "process.stdin.on('end', () => {",
      "  if (data.includes('复查条件')) {",
      '    console.log(\'{"result":"triggered","rationale":"生态已变化"}\');',
      '  } else {',
      '    console.log(\'{"type":"condition","condition":"部署拓扑发生变化"}\');',
      '  }',
      '});',
    ].join('\n'),
  );
  const configDir = join(globalDirs, 'config', 'pta');
  await mkdir(configDir, { recursive: true });
  await writeFile(
    join(configDir, 'config.toml'),
    `[agents.fake]\ncommand = ["${process.execPath}", "${scriptPath}"]\n`,
  );
  context.after(() => rm(join(configDir, 'config.toml'), { force: true }));

  const before = capture();
  assert.equal(await runCli(['inspect', 'list'], before.io, root), 0);
  assert.match(
    before.stdout(),
    /待推导 \(无线索记录，可 pta inspect derive 或 pta inspect register\):/u,
  );

  const derive = capture();
  assert.equal(await runCli(['inspect', 'derive', 'fake'], derive.io, root), 0);
  assert.match(derive.stdout(), /推导完成 \(agent fake\): 新推导 1 条、评估 1 条。/u);

  const after = capture();
  assert.equal(await runCli(['inspect', 'list'], after.io, root), 0);
  assert.match(after.stdout(), /条件型 \(评估为已触发，待人裁决\):/u);
  assert.match(after.stdout(), /评估理由: 生态已变化/u);

  const missingAgent = capture();
  assert.equal(await runCli(['inspect', 'derive', 'absent'], missingAgent.io, root), 2);
  assert.match(missingAgent.stderr(), /未找到 agent: absent/u);
});

test('sweepRepositories 扫描注册仓库并落巡检报告，doctor 展示仓库健康', async (context) => {
  const root = await repository({
    'TRUTH.md': '- [?] 风险分级与学会指南一致。2020-01 核对指南是否更新。\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);

  const seed = capture();
  assert.equal(await runCli(['inspect', 'list'], seed.io, root), 0);

  const paths = resolveGlobalPaths();
  const sweep = await sweepRepositories(paths);
  assert.equal(sweep.errors.length, 0);
  const report = sweep.reports.find((item) => item.root === root);
  assert.ok(report);
  assert.equal(report.counts.expired, 1);

  const listed = await readInspectionReports(paths);
  assert.equal(
    listed.some((item) => item.root === root && item.counts.expired === 1),
    true,
  );

  const doctor = capture();
  assert.equal(await runCli(['doctor'], doctor.io, root), 0);
  assert.match(doctor.stdout(), /仓库注册表/u);
  assert.match(doctor.stdout(), /核查信号: 冲突 0、违例 0、嫌疑 0/u);
  assert.match(doctor.stdout(), /巡检集合: 1 条: 到期 1/u);
});

test('cron 条目 CRUD、校验与手动执行', async (context) => {
  const root = await repository({ 'TRUTH.md': '- 根判断\n' });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);

  const scriptPath = join(globalDirs, 'report-agent.mjs');
  await writeFile(scriptPath, "console.log('日报正文');");
  const configDir = join(globalDirs, 'config', 'pta');
  await mkdir(configDir, { recursive: true });
  await writeFile(
    join(configDir, 'config.toml'),
    `[agents.reporter]\ncommand = ["${process.execPath}", "${scriptPath}"]\n`,
  );
  context.after(() => rm(join(configDir, 'config.toml'), { force: true }));
  context.after(() => rm(join(configDir, 'crontab.toml'), { force: true }));

  const bad = capture();
  assert.equal(
    await runCli(['cron', 'create', 'bad-entry', '0 3 * * *', 'derive'], bad.io, root),
    2,
  );
  assert.match(bad.stderr(), /derive 动作必须指定 agent/u);

  const create = capture();
  assert.equal(
    await runCli(
      [
        'cron',
        'create',
        'daily-report',
        '30 8 * * 1-5',
        'agent',
        '--agent',
        'reporter',
        '--prompt',
        '编译日报',
      ],
      create.io,
      root,
    ),
    0,
  );
  assert.match(create.stdout(), /已创建 cron 条目 daily-report/u);

  const list = capture();
  assert.equal(await runCli(['cron', 'list'], list.io, root), 0);
  assert.match(list.stdout(), /daily-report: \[30 8 \* \* 1-5\] agent/u);
  assert.match(list.stdout(), /下次唤醒: \d{4}-\d{2}-\d{2} \d{2}:\d{2}/u);

  const run = capture();
  assert.equal(await runCli(['cron', 'run', 'daily-report'], run.io, root), 0);
  assert.match(run.stdout(), /完成/u);
  const output = await readFile(
    join(globalDirs, 'cache', 'pta', 'cron-output', 'daily-report.txt'),
    'utf8',
  );
  assert.match(output, /日报正文/u);

  const editNothing = capture();
  assert.equal(await runCli(['cron', 'edit', 'daily-report'], editNothing.io, root), 2);
  assert.match(editNothing.stderr(), /至少提供一个要修改的旗标/u);

  const edit = capture();
  assert.equal(
    await runCli(['cron', 'edit', 'daily-report', '--schedule', '0 9 * * *'], edit.io, root),
    0,
  );
  const edited = capture();
  assert.equal(await runCli(['cron', 'list'], edited.io, root), 0);
  assert.match(edited.stdout(), /\[0 9 \* \* \*\]/u);

  const remove = capture();
  assert.equal(await runCli(['cron', 'delete', 'daily-report'], remove.io, root), 0);
  const empty = capture();
  assert.equal(await runCli(['cron', 'list'], empty.io, root), 0);
  assert.match(empty.stdout(), /没有 cron 条目/u);
});

test('crontab 含无效条目时拒绝写操作', async (context) => {
  const root = await repository({ 'TRUTH.md': '- 根判断\n' });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);

  const configDir = join(globalDirs, 'config', 'pta');
  await mkdir(configDir, { recursive: true });
  await writeFile(
    join(configDir, 'crontab.toml'),
    '[[cron]]\nid = "half"\nschedule = "0 3 * * *"\naction = "derive"\nrepository = "/repo/a"\n\n[[cron]]\nid = "ok-entry"\nschedule = "0 4 * * *"\naction = "inspect"\nrepository = "/repo/a"\n',
  );
  context.after(() => rm(join(configDir, 'crontab.toml'), { force: true }));

  const refused = capture();
  assert.equal(
    await runCli(['cron', 'create', 'new-entry', '0 5 * * *', 'inspect'], refused.io, root),
    2,
  );
  assert.match(refused.stderr(), /写操作会将其永久丢弃，已拒绝执行/u);
  const preserved = await readFile(join(configDir, 'crontab.toml'), 'utf8');
  assert.match(preserved, /id = "half"/u);
});
