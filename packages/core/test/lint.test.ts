import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  extractEntries,
  lintDiscoveryProblems,
  lintDomainContents,
  splitFrontmatter,
  type CheckSignal,
  type ContentFileName,
  type Domain,
  type DomainContent,
} from '../src/index.ts';

function directoryDomain(
  identifier: string,
  truth = '- 判断',
  containerPath = identifier,
): DomainContent {
  const declarationPath = containerPath === '' ? 'TRUTH.md' : `${containerPath}/TRUTH.md`;
  const frontmatter = splitFrontmatter(truth).frontmatter;
  return {
    domain: {
      kind: 'directory',
      declarationPath,
      containerPath,
      identifier,
      claimedPath: identifier,
      filesPresent: false,
      dependsOn: frontmatter.dependsOn ?? [],
      frontmatter,
      problems: [],
    },
    files: { 'TRUTH.md': extractEntries(truth, 'TRUTH.md', identifier) },
  };
}

function externalDomain(
  name: string,
  claimedPath: string,
  files?: readonly string[],
): DomainContent {
  const containerPath = `.pta/${name}`;
  const frontmatterSource = [
    '---',
    `path: ${claimedPath}`,
    ...(files === undefined ? [] : ['files:', ...files.map((file) => `  - ${file}`)]),
    '---',
    '- 判断',
  ].join('\n');
  const frontmatter = splitFrontmatter(frontmatterSource).frontmatter;
  const domain: Domain = {
    kind: 'external',
    declarationPath: `${containerPath}/TRUTH.md`,
    containerPath,
    externalRoot: '.pta',
    name,
    identifier: containerPath,
    claimedPath,
    filesPresent: files !== undefined,
    ...(files === undefined ? {} : { files }),
    dependsOn: frontmatter.dependsOn ?? [],
    frontmatter,
    problems: [],
  };
  return {
    domain,
    files: {
      'TRUTH.md': extractEntries(frontmatterSource, 'TRUTH.md', domain.identifier),
    },
  };
}

function withFile(
  content: DomainContent,
  fileName: ContentFileName,
  source: string,
): DomainContent {
  return {
    ...content,
    files: {
      ...content.files,
      [fileName]: extractEntries(source, fileName, content.domain.identifier),
    },
  };
}

function hasMessage(signals: readonly CheckSignal[], fragment: string): boolean {
  return signals.some((signal) => signal.evidence.message.includes(fragment));
}

test('正文列表之外内容产生违例，空行不产生', () => {
  const bad = directoryDomain('src', '- 判断\n列表外内容');
  const good = directoryDomain('src', '- 判断\n\n');
  assert.equal(hasMessage(lintDomainContents([bad]), '列表之外'), true);
  assert.equal(hasMessage(lintDomainContents([good]), '列表之外'), false);
});

test('TRUTH、RESIDUE、PENDING 的加粗领起产生违例，普通条目不产生', () => {
  for (const fileName of ['TRUTH.md', 'RESIDUE.md', 'PENDING.md'] as const) {
    const bad = withFile(directoryDomain('src'), fileName, '- **标题** 内容');
    const good = withFile(directoryDomain('src'), fileName, '- 普通内容');
    assert.equal(hasMessage(lintDomainContents([bad]), '不得以加粗内容领起'), true, fileName);
    assert.equal(hasMessage(lintDomainContents([good]), '不得以加粗内容领起'), false, fileName);
  }
});

test('GLOSSARY 缺少起头加粗术语名产生违例，合法术语条目不产生', () => {
  const bad = withFile(directoryDomain('src'), 'GLOSSARY.md', '- 术语：定义');
  const good = withFile(directoryDomain('src'), 'GLOSSARY.md', '- **术语**：定义');
  assert.equal(hasMessage(lintDomainContents([bad]), '缺少起头加粗'), true);
  assert.equal(hasMessage(lintDomainContents([good]), '缺少起头加粗'), false);
});

test('目录领域声明 path 产生违例，无 path 不产生', () => {
  const bad = directoryDomain('src', '---\npath: elsewhere\n---\n- 判断');
  const good = directoryDomain('src', '---\ndependsOn: []\n---\n- 判断');
  assert.equal(hasMessage(lintDomainContents([bad]), '不得在 frontmatter 中声明 path'), true);
  assert.equal(hasMessage(lintDomainContents([good]), '不得在 frontmatter 中声明 path'), false);
});

test('未闭合 frontmatter 产生违例，闭合 frontmatter 不产生', () => {
  const bad = withFile(directoryDomain('src'), 'GLOSSARY.md', '---\ntitle: 术语\n- **词**：定义');
  const good = withFile(
    directoryDomain('src'),
    'GLOSSARY.md',
    '---\ntitle: 术语\n---\n- **词**：定义',
  );
  assert.equal(hasMessage(lintDomainContents([bad]), 'frontmatter 未闭合'), true);
  assert.equal(hasMessage(lintDomainContents([good]), 'frontmatter 未闭合'), false);
});

test('无法解析的 YAML frontmatter 与 TOML 配置问题产生违例', () => {
  const malformedFrontmatter = directoryDomain('src', '---\npath: [\n---\n- 判断');
  assert.equal(
    hasMessage(lintDomainContents([malformedFrontmatter]), '无法按 YAML 1.2 解析'),
    true,
  );

  const signals = lintDiscoveryProblems({
    repositoryRoot: '/repo',
    externalRoots: [],
    domains: [],
    problems: [{ code: 'invalid-pta-toml', path: 'pta.toml' }],
  });
  assert.equal(hasMessage(signals, '无法按 TOML 1.0 解析'), true);
});

test('同一目录的整目录声明重复产生冲突，不同目录不产生', () => {
  const directory = directoryDomain('src');
  const duplicate = externalDomain('src-copy', 'src');
  const distinct = externalDomain('lib', 'lib');
  assert.equal(hasMessage(lintDomainContents([directory, duplicate]), '重复主张目录'), true);
  assert.equal(hasMessage(lintDomainContents([directory, distinct]), '重复主张目录'), false);
});

test('files 声明成员重叠产生冲突，不重叠不产生', () => {
  const first = externalDomain('first', 'src', ['a.ts']);
  const overlap = externalDomain('second', 'src', ['a.ts']);
  const distinct = externalDomain('third', 'src', ['b.ts']);
  assert.equal(hasMessage(lintDomainContents([first, overlap]), '声明重叠'), true);
  assert.equal(hasMessage(lintDomainContents([first, distinct]), '声明重叠'), false);
});

test('files 成员越过更具体领域边界产生冲突，边界外成员不产生', () => {
  const boundary = directoryDomain('src/child');
  const bad = externalDomain('bad', 'src', ['child/a.ts']);
  const good = externalDomain('good', 'src', ['peer/a.ts']);
  assert.equal(hasMessage(lintDomainContents([boundary, bad]), '越过更具体领域'), true);
  assert.equal(hasMessage(lintDomainContents([boundary, good]), '越过更具体领域'), false);
});

test('同文件规范化后完全相同的条目产生冲突，不同条目不产生', () => {
  const bad = directoryDomain('src', '- 相同\n- 相同  ');
  const good = directoryDomain('src', '- 第一条\n- 第二条');
  assert.equal(hasMessage(lintDomainContents([bad]), '内容完全相同'), true);
  assert.equal(hasMessage(lintDomainContents([good]), '内容完全相同'), false);
});

test('同一 GLOSSARY 规范化后同名术语产生冲突，大小写不同不产生', () => {
  const bad = withFile(directoryDomain('src'), 'GLOSSARY.md', '- **é**：第一义\n- **é**：第二义');
  const good = withFile(
    directoryDomain('src'),
    'GLOSSARY.md',
    '- **Term**：第一义\n- **term**：第二义',
  );
  assert.equal(hasMessage(lintDomainContents([bad]), '术语名'), true);
  assert.equal(hasMessage(lintDomainContents([good]), '术语名'), false);
});

test('下级同名术语定义不同只产生嫌疑，相同定义不产生', () => {
  const parent = withFile(directoryDomain('src'), 'GLOSSARY.md', '- **术语**：上级定义');
  const bad = withFile(directoryDomain('src/child'), 'GLOSSARY.md', '- **术语**：下级定义');
  const good = withFile(directoryDomain('src/child'), 'GLOSSARY.md', '- **术语**：上级定义');
  const signals = lintDomainContents([parent, bad]);
  const inconsistency = signals.find((item) => item.category === 'term inconsistency');
  assert.equal(inconsistency?.status, 'suspicion');
  assert.equal(inconsistency?.source, 'structural-check');
  assert.equal(
    lintDomainContents([parent, good]).some((item) => item.category === 'term inconsistency'),
    false,
  );
});

test('dependsOn 指向存在领域不产生信号，悬空目标构成违例', () => {
  const provider = directoryDomain('provider');
  const valid = directoryDomain(
    'consumer',
    '---\ndependsOn:\n  - domain: provider\n    reason: 引用对方口径\n---\n- 判断',
  );
  assert.deepEqual(
    lintDomainContents([valid, provider]).filter((item) => item.category === 'violation'),
    [],
  );

  const dangling = directoryDomain(
    'consumer',
    '---\ndependsOn:\n  - domain: ghost\n    reason: 目标已不存在\n---\n- 判断',
  );
  const signals = lintDomainContents([dangling, provider]).filter(
    (item) => item.category === 'violation',
  );
  assert.equal(signals.length, 1);
  const found = signals[0] as CheckSignal;
  assert.equal(found.status, 'machine-decidable');
  assert.match(found.evidence.message, /「ghost」不是任何领域的标识/u);
  assert.equal(found.evidence.file, 'consumer/TRUTH.md');
  assert.equal(found.evidence.line, 2);
});

test('未定义的状态字符构成违例，巡检标记不构成', () => {
  const undefinedMarker = directoryDomain('src', '- [x] 判断');
  const bad = lintDomainContents([undefinedMarker]).filter((item) => item.category === 'violation');
  assert.equal(bad.length, 1);
  assert.match(bad[0]?.evidence.message ?? '', /「x」未被内容结构规范定义/u);
  assert.equal(bad[0]?.evidence.file, 'src/TRUTH.md');

  const marked = directoryDomain('src', '- [?] 判断。2027-01 复查。');
  assert.deepEqual(
    lintDomainContents([marked]).filter((item) => item.category === 'violation'),
    [],
  );
});
