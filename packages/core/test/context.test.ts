import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assembleContext,
  assignDomainParents,
  extractEntries,
  splitFrontmatter,
  type ContentFileName,
  type DiscoveryResult,
  type Domain,
  type DomainContent,
  type ExtractedContent,
} from '../src/index.ts';

function domain(
  identifier: string,
  options: Readonly<{
    dependsOn?: readonly { path: string; reason: string }[];
  }> = {},
): Domain {
  const dependsOn = options.dependsOn ?? [];
  const frontmatter = splitFrontmatter('- 判断\n').frontmatter;
  return {
    kind: 'directory',
    declarationPath: `${identifier === '' ? '' : `${identifier}/`}TRUTH.md`,
    containerPath: identifier,
    identifier,
    claimedPath: identifier,
    filesPresent: false,
    dependsOn,
    frontmatter: { ...frontmatter, dependsOnPresent: dependsOn.length > 0, dependsOn },
    problems: [],
  };
}

function discovery(domains: readonly Domain[]): DiscoveryResult {
  return {
    repositoryRoot: '/repo',
    externalRoots: [],
    domains: assignDomainParents(domains),
  };
}

function content(owner: Domain, files: Readonly<Record<string, string>>): DomainContent {
  const extracted: Partial<Record<ContentFileName, ExtractedContent>> = {};
  for (const [name, source] of Object.entries(files)) {
    extracted[name as ContentFileName] = extractEntries(
      source,
      name as ContentFileName,
      owner.identifier,
    );
  }
  return { domain: owner, files: extracted };
}

test('assembleContext 归属最深领域，携带祖先链并按文件种类归组', () => {
  const result = discovery([domain(''), domain('src'), domain('src/child'), domain('docs')]);
  const byId = new Map(result.domains.map((item) => [item.identifier, item]));
  const contents = [
    content(byId.get('') as Domain, {
      'TRUTH.md': '- 根判断\n',
      'PENDING.md': '- 根问题如何处理？（暂缓）\n',
    }),
    content(byId.get('src') as Domain, {
      'TRUTH.md': '- 源判断\n',
      'GLOSSARY.md': '- **术语**：定义\n',
    }),
    content(byId.get('src/child') as Domain, { 'TRUTH.md': '- 子判断\n' }),
    content(byId.get('docs') as Domain, { 'TRUTH.md': '- 文档判断\n' }),
  ];

  const assembly = assembleContext(result, contents, ['src/child/lib/a.ts', 'outside.md']);

  assert.deepEqual(
    assembly.resolutions.map((item) => [item.path, item.domainIdentifier]),
    [
      ['src/child/lib/a.ts', 'src/child'],
      ['outside.md', ''],
    ],
  );
  assert.deepEqual(
    assembly.domains.map((item) => item.domainIdentifier),
    ['', 'src', 'src/child'],
  );
  const root = assembly.domains[0];
  assert.equal(root?.truthEntries[0]?.content, '根判断');
  assert.equal(root?.pendingEntries[0]?.content, '根问题如何处理？（暂缓）');
  assert.deepEqual(root?.consumedFiles, ['TRUTH.md', 'PENDING.md']);
  const src = assembly.domains[1];
  assert.equal(src?.glossaryEntries[0]?.term, '术语');
  assert.deepEqual(src?.consumedFiles, ['src/TRUTH.md', 'src/GLOSSARY.md']);
});

test('assembleContext 未覆盖路径无归属，dependsOn 原样携带', () => {
  const dependsOn = [{ path: 'shared', reason: '引用共享术语' }];
  const result = discovery([domain('src', { dependsOn }), domain('shared')]);
  const byId = new Map(result.domains.map((item) => [item.identifier, item]));
  const contents = [
    content(byId.get('src') as Domain, { 'TRUTH.md': '- 源判断\n' }),
    content(byId.get('shared') as Domain, { 'TRUTH.md': '- 共享判断\n' }),
  ];

  const assembly = assembleContext(result, contents, ['elsewhere/file.ts', 'src/main.ts']);

  assert.deepEqual(
    assembly.resolutions.map((item) => [item.path, item.domainIdentifier]),
    [
      ['elsewhere/file.ts', undefined],
      ['src/main.ts', 'src'],
    ],
  );
  assert.deepEqual(
    assembly.domains.map((item) => item.domainIdentifier),
    ['src'],
  );
  assert.deepEqual(assembly.domains[0]?.dependsOn, dependsOn);
});
