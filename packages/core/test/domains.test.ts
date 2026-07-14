import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { discoverDomains, extractDomainContent } from '../src/index.ts';

async function fixture(): Promise<{ root: string; repositoryFiles: string[] }> {
  const root = await mkdtemp(join(tmpdir(), 'pta-core-'));
  const files: Readonly<Record<string, string>> = {
    'TRUTH.md': '- 项目级判断\n',
    'src/TRUTH.md': '---\npath: wrong\n---\n- 源码判断\n',
    'src/components/TRUTH.md': '- 组件判断\n',
    'src/consumer/TRUTH.md': [
      '---',
      'dependsOn:',
      '  - path: src/components',
      '    reason: 组件口径构成消费背景',
      '---',
      '- 消费判断',
    ].join('\n'),
    'internal/dsl/TRUTH.md': '- DSL 判断\n',
    'internal/dsl/lexer.go': 'package dsl\n',
    'internal/dsl/parser.go': 'package dsl\n',
    'internal/dsl/Case.go': 'package dsl\n',
    '.pta/TRUTH.md': '- 外置声明根自身不构成领域\n',
    '.pta/compiler/TRUTH.md': [
      '---',
      'path: internal/dsl',
      'files:',
      '  - lexer.go',
      '  - parser.go',
      '---',
      '- 编译器判断',
    ].join('\n'),
    '.pta/compiler/GLOSSARY.md': '- **词法器**：把字符流转为 token。\n列表外内容\n',
    '.pta/missing/TRUTH.md': '- 没有 frontmatter 仍需保留\n',
    '.pta/case/TRUTH.md': '---\npath: internal/dsl\nfiles: [case.go]\n---\n- 大小写事实\n',
    'packages/legacy/keep.txt': 'legacy\n',
    '.pta/legacy/TRUTH.md': '---\npath: packages/legacy\n---\n- 遗留包判断\n',
    'packages/web/.pta/components/TRUTH.md': '---\npath: src/components\n---\n- 外置重复主张\n',
    'pta.toml': 'externalRoots = ["packages/web/.pta"]\n',
  };

  await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      const absolute = join(root, ...path.split('/'));
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, content);
    }),
  );
  return { root, repositoryFiles: Object.keys(files) };
}

test('发现目录与默认/配置外置领域，计算标识和层级', async (context) => {
  const { root, repositoryFiles } = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const result = await discoverDomains(root, repositoryFiles);

  assert.deepEqual(result.externalRoots, [
    { path: '.pta', source: 'default', usable: true },
    { path: 'packages/web/.pta', source: 'pta.toml', usable: true },
  ]);
  assert.equal(
    result.domains.some((domain) => domain.declarationPath === '.pta/TRUTH.md'),
    false,
  );

  const byDeclaration = new Map(result.domains.map((domain) => [domain.declarationPath, domain]));
  assert.deepEqual(
    result.domains
      .filter((domain) => domain.kind === 'directory')
      .map((domain) => domain.identifier)
      .sort(),
    ['', 'internal/dsl', 'src', 'src/components', 'src/consumer'],
  );
  assert.equal(byDeclaration.get('src/TRUTH.md')?.parentIdentifier, '');
  assert.deepEqual(byDeclaration.get('src/TRUTH.md')?.problems, [
    { code: 'directory-declares-path', value: 'wrong' },
  ]);
  assert.equal(byDeclaration.get('src/components/TRUTH.md')?.parentIdentifier, 'src');
  assert.deepEqual(byDeclaration.get('src/consumer/TRUTH.md')?.dependsOn, [
    { path: 'src/components', reason: '组件口径构成消费背景' },
  ]);

  const compiler = byDeclaration.get('.pta/compiler/TRUTH.md');
  assert.equal(compiler?.identifier, '.pta/compiler');
  assert.equal(compiler?.claimedPath, 'internal/dsl');
  assert.deepEqual(compiler?.files, ['lexer.go', 'parser.go']);
  assert.equal(compiler?.parentIdentifier, 'internal/dsl');
  assert.deepEqual(compiler?.problems, []);

  assert.deepEqual(byDeclaration.get('.pta/case/TRUTH.md')?.problems, [
    { code: 'file-not-file', value: 'case.go' },
  ]);

  const legacy = byDeclaration.get('.pta/legacy/TRUTH.md');
  assert.equal(legacy?.identifier, 'packages/legacy');
  assert.equal(legacy?.parentIdentifier, '');

  const configured = byDeclaration.get('packages/web/.pta/components/TRUTH.md');
  assert.equal(configured?.identifier, 'src/components');
  assert.equal(configured?.parentIdentifier, 'src');
});

test('缺 path 的外置声明保留原文事实而没有臆造标识', async (context) => {
  const { root, repositoryFiles } = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const result = await discoverDomains(root, repositoryFiles);
  const missing = result.domains.find(
    (domain) => domain.declarationPath === '.pta/missing/TRUTH.md',
  );

  assert.ok(missing);
  assert.equal(missing.identifier, undefined);
  assert.equal(missing.frontmatter.present, false);
  assert.deepEqual(missing.problems, [{ code: 'missing-path' }]);

  const content = await extractDomainContent(root, repositoryFiles, missing);
  assert.equal(content.files['TRUTH.md']?.entries[0]?.content, '没有 frontmatter 仍需保留');
  assert.equal(content.files['TRUTH.md']?.entries[0]?.identifier, undefined);
});

test('从领域容器的四种文件提取内容，外置领域使用声明目录中的伴随文件', async (context) => {
  const { root, repositoryFiles } = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const discovery = await discoverDomains(root, repositoryFiles);
  const domain = discovery.domains.find(
    (item) => item.declarationPath === '.pta/compiler/TRUTH.md',
  );
  assert.ok(domain);

  const content = await extractDomainContent(root, repositoryFiles, domain);
  assert.deepEqual(content.files['TRUTH.md']?.entries[0]?.identifier?.container, {
    domainIdentifier: '.pta/compiler',
    fileKind: 'truth',
  });
  assert.equal(content.files['GLOSSARY.md']?.entries[0]?.term, '词法器');
  assert.deepEqual(content.files['GLOSSARY.md']?.outsideList, [{ line: 2, source: '列表外内容' }]);
  assert.equal(content.files['RESIDUE.md'], undefined);
  assert.equal(content.files['PENDING.md'], undefined);
});

test('清单决定发现和存在性，不扫描清单之外的文件系统内容', async (context) => {
  const { root, repositoryFiles } = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'ignored'), { recursive: true });
  await writeFile(join(root, 'ignored/TRUTH.md'), '- 不应被发现\n');

  const files = repositoryFiles.filter((path) => path !== 'internal/dsl/parser.go');
  const result = await discoverDomains(root, files);
  assert.equal(
    result.domains.some((domain) => domain.declarationPath === 'ignored/TRUTH.md'),
    false,
  );
  assert.deepEqual(
    result.domains.find((domain) => domain.declarationPath === '.pta/compiler/TRUTH.md')?.problems,
    [{ code: 'file-not-file', value: 'parser.go' }],
  );
});

test('TOML 只读取顶层 externalRoots，并暴露语法与字段形态问题', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'pta-core-'));
  context.after(() => rm(root, { recursive: true, force: true }));

  await writeFile(join(root, 'pta.toml'), '[tool.example]\nexternalRoots = ["nested/.pta"]\n');
  const nested = await discoverDomains(root, ['pta.toml']);
  assert.deepEqual(nested.externalRoots, [{ path: '.pta', source: 'default', usable: true }]);
  assert.deepEqual(nested.problems, []);

  await writeFile(join(root, 'pta.toml'), 'externalRoots = "wrong"\n');
  const wrongShape = await discoverDomains(root, ['pta.toml']);
  assert.deepEqual(wrongShape.problems, [{ code: 'invalid-external-roots', path: 'pta.toml' }]);

  await writeFile(join(root, 'pta.toml'), 'externalRoots = [\n');
  const malformed = await discoverDomains(root, ['pta.toml']);
  assert.deepEqual(malformed.problems, [{ code: 'invalid-pta-toml', path: 'pta.toml' }]);
});
