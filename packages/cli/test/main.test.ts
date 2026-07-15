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
  assert.match(added.stdout(), /已登记待裁决条目：src [0-9a-f]{8} src\/PENDING\.md:1/u);
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
  assert.match(duplicate.stdout(), /已存在同内容条目：src [0-9a-f]{8}/u);

  const statement = capture();
  assert.equal(await runCli(['pending', 'add', '.', '这是陈述句'], statement.io, root), 0);
  assert.match(statement.stderr(), /应当以问句表述/u);
  assert.equal(await readFile(join(root, 'PENDING.md'), 'utf8'), '- 这是陈述句\n');

  const unknown = capture();
  assert.equal(await runCli(['pending', 'add', 'nowhere', '问题？'], unknown.io, root), 2);
  assert.match(unknown.stderr(), /未找到领域：nowhere/u);

  const usage = capture();
  assert.equal(await runCli(['pending', 'add', 'src'], usage.io, root), 2);
  assert.match(usage.stderr(), /用法：pta pending add/u);
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
  assert.match(output.stdout(), /核查提示（读取时叠加，不入产物）：/u);
  assert.match(output.stdout(), /\[violation \| machine-decidable\] src\/TRUTH\.md:1/u);
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

test('inspect 圈定巡检集合并报告到期', async (context) => {
  const root = await repository({
    'TRUTH.md':
      '- 普通判断，不入巡检集合。\n- [?] 风险分级与学会指南一致。2020-01 核对指南是否更新。\n- [?] 服务部署在单台服务器上。部署拓扑变化时复查。\n',
    'RESIDUE.md': '- 2024-03 之前的数据无法区分邻面龋。\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);
  const output = capture();

  assert.equal(await runCli(['inspect', root], output.io), 0);
  assert.match(output.stdout(), /巡检集合：3 条（1 个领域）/u);
  assert.match(
    output.stdout(),
    /到期：\n {2}\[expiry \| machine-decidable\] TRUTH\.md:2 复查线索 2020-01 已到期/u,
  );
  assert.match(
    output.stdout(),
    /待推导（无线索记录，可 pta inspect derive 或 pta inspect register）：/u,
  );
  assert.match(output.stdout(), /^ {2}[0-9a-f]{8} TRUTH\.md:3 \[\?\] 服务部署在单台服务器上/mu);
  assert.match(output.stdout(), /残留（整类巡检）：/u);
  assert.match(output.stdout(), /^ {2}[0-9a-f]{8} RESIDUE\.md:1 2024-03 之前的数据/mu);
  assert.equal(output.stderr(), '');

  const usage = capture();
  assert.equal(await runCli(['inspect', root, 'extra'], usage.io), 2);
  assert.match(usage.stderr(), /用法：pta inspect/u);
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

test('inspect register 注册推导叠加进报告，logs 记录关键行为', async (context) => {
  const entry = '[?] 服务仅五名员工使用，权限按人对人授权。人数变化时复查。';
  const root = await repository({ 'TRUTH.md': `- ${entry}\n` });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);
  const id = hashEntryContent(entry).slice(0, 8);

  const before = capture();
  assert.equal(await runCli(['inspect', root], before.io), 0);
  assert.match(
    before.stdout(),
    /待推导（无线索记录，可 pta inspect derive 或 pta inspect register）：/u,
  );

  const condition = capture();
  assert.equal(await runCli(['inspect', 'register', id, '条件'], condition.io, root), 0);
  assert.match(condition.stdout(), /已注册推导：\. [0-9a-f]{8} → 条件型/u);

  const confirmed = capture();
  assert.equal(await runCli(['inspect', root], confirmed.io), 0);
  assert.match(confirmed.stdout(), /条件型（待评估）：/u);

  const dated = capture();
  assert.equal(await runCli(['inspect', 'register', id, '2030-06'], dated.io, root), 0);
  const upcoming = capture();
  assert.equal(await runCli(['inspect', root], upcoming.io), 0);
  assert.match(upcoming.stdout(), /日期型（未到期）：\n {2}2030-06 /u);

  const badValue = capture();
  assert.equal(await runCli(['inspect', 'register', id, '随便'], badValue.io, root), 2);
  assert.match(badValue.stderr(), /用法：pta inspect register/u);

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
  assert.equal(await runCli(['inspect', root], before.io), 0);
  assert.match(
    before.stdout(),
    /待推导（无线索记录，可 pta inspect derive 或 pta inspect register）：/u,
  );

  const derive = capture();
  assert.equal(await runCli(['inspect', 'derive', 'fake'], derive.io, root), 0);
  assert.match(derive.stdout(), /推导完成（agent fake）：新推导 1 条，评估 1 条。/u);

  const after = capture();
  assert.equal(await runCli(['inspect', root], after.io), 0);
  assert.match(after.stdout(), /条件型（评估为已触发，待人裁决）：/u);
  assert.match(after.stdout(), /评估理由：生态已变化/u);

  const missingAgent = capture();
  assert.equal(await runCli(['inspect', 'derive', 'absent'], missingAgent.io, root), 2);
  assert.match(missingAgent.stderr(), /未找到 agent：absent/u);
});

test('sweepRepositories 扫描注册仓库并落巡检报告，doctor 展示仓库健康', async (context) => {
  const root = await repository({
    'TRUTH.md': '- [?] 风险分级与学会指南一致。2020-01 核对指南是否更新。\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);

  const seed = capture();
  assert.equal(await runCli(['inspect', root], seed.io), 0);

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
  assert.match(doctor.stdout(), /核查信号：冲突 0，违例 0，嫌疑 0/u);
  assert.match(doctor.stdout(), /巡检集合：1 条：到期 1/u);
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
  assert.match(list.stdout(), /daily-report：\[30 8 \* \* 1-5\] agent/u);
  assert.match(list.stdout(), /下次唤醒：\d{4}-\d{2}-\d{2} \d{2}:\d{2}/u);

  const run = capture();
  assert.equal(await runCli(['cron', 'run', 'daily-report'], run.io, root), 0);
  assert.match(run.stdout(), /完成/u);
  const output = await readFile(
    join(globalDirs, 'cache', 'pta', 'cron-output', 'daily-report.txt'),
    'utf8',
  );
  assert.match(output, /日报正文/u);

  const update = capture();
  assert.equal(
    await runCli(['cron', 'update', 'daily-report', '--schedule', '0 9 * * *'], update.io, root),
    0,
  );
  const updated = capture();
  assert.equal(await runCli(['cron', 'list'], updated.io, root), 0);
  assert.match(updated.stdout(), /\[0 9 \* \* \*\]/u);

  const remove = capture();
  assert.equal(await runCli(['cron', 'delete', 'daily-report'], remove.io, root), 0);
  const empty = capture();
  assert.equal(await runCli(['cron', 'list'], empty.io, root), 0);
  assert.match(empty.stdout(), /没有 cron 条目/u);
});

test('remind 只在实现漂移时开口，hook 三动词合作式管理', async (context) => {
  const root = await repository({ 'TRUTH.md': '- 根判断\n', 'src.txt': '实现\n' });
  context.after(() => rm(root, { recursive: true, force: true }));
  await git(root, ['init', '-q']);
  await git(root, ['add', '-A']);
  await git(root, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'base']);

  await writeFile(join(root, 'src.txt'), '实现已改\n');
  await git(root, ['add', 'src.txt']);
  const noisy = capture();
  assert.equal(await runCli(['remind', '--staged'], noisy.io, root), 0);
  assert.match(noisy.stdout(), /PTA 提醒（不拦截）/u);
  assert.match(noisy.stdout(), /领域 \.：1 个文件/u);

  await git(root, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'impl']);
  const quiet = capture();
  assert.equal(await runCli(['remind', '--staged'], quiet.io, root), 0);
  assert.equal(quiet.stdout(), '');

  const absent = capture();
  assert.equal(await runCli(['hook', 'status'], absent.io, root), 0);
  assert.match(absent.stdout(), /未接线/u);
  const install = capture();
  assert.equal(await runCli(['hook', 'install'], install.io, root), 0);
  assert.match(install.stdout(), /只提醒，不拦截/u);
  const installed = capture();
  assert.equal(await runCli(['hook', 'status'], installed.io, root), 0);
  assert.match(installed.stdout(), /已接线/u);
  const uninstall = capture();
  assert.equal(await runCli(['hook', 'uninstall'], uninstall.io, root), 0);

  await mkdir(join(root, '.git', 'hooks'), { recursive: true });
  await writeFile(join(root, '.git', 'hooks', 'pre-commit'), '#!/bin/sh\necho other\n');
  const foreign = capture();
  assert.equal(await runCli(['hook', 'install'], foreign.io, root), 2);
  assert.match(foreign.stderr(), /不代为改写/u);
});
