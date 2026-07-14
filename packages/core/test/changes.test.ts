import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assignDomainParents,
  classifyChanges,
  extractEntries,
  splitFrontmatter,
  type DiscoveryResult,
  type Domain,
} from '../src/index.ts';

function domain(
  identifier: string,
  options: Readonly<{
    containerPath?: string;
    claimedPath?: string;
    files?: readonly string[];
    dependsOn?: readonly { path: string; reason: string }[];
  }> = {},
): Domain {
  const containerPath = options.containerPath ?? identifier;
  const claimedPath = options.claimedPath ?? identifier;
  const dependsOn = options.dependsOn ?? [];
  const frontmatter = splitFrontmatter('- 判断\n').frontmatter;
  return {
    kind: options.files === undefined && containerPath === identifier ? 'directory' : 'external',
    declarationPath: `${containerPath === '' ? '' : `${containerPath}/`}TRUTH.md`,
    containerPath,
    identifier,
    claimedPath,
    filesPresent: options.files !== undefined,
    ...(options.files === undefined ? {} : { files: options.files }),
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

test('路径归入最深目录领域，files 成员匹配优先，根领域兜底', () => {
  const result = classifyChanges(
    discovery([
      domain(''),
      domain('src'),
      domain('src/child'),
      domain('.pta/slice', {
        containerPath: '.pta/slice',
        claimedPath: 'src',
        files: ['special.ts'],
      }),
    ]),
    [
      { path: 'src/child/a.ts', type: 'modified' },
      { path: 'src/special.ts', type: 'modified' },
      { path: 'README.md', type: 'modified' },
    ],
  );

  assert.deepEqual(
    result.ownership.map((item) => item.domainIdentifier),
    ['src/child', '.pta/slice', ''],
  );
});

test('没有根领域时如实标注未覆盖', () => {
  const result = classifyChanges(discovery([domain('src')]), [
    { path: 'README.md', type: 'modified' },
  ]);
  assert.equal(result.ownership[0]?.domainIdentifier, undefined);
});

test('PENDING 只算收件箱活动，双触不产生漂移嫌疑', () => {
  const pendingOnly = classifyChanges(discovery([domain('')]), [
    { path: 'PENDING.md', type: 'modified' },
  ]);
  assert.equal(pendingOnly.touchedDomains[0]?.surface, 'inbox-only');
  assert.equal(pendingOnly.driftSuspicions.length, 0);

  const both = classifyChanges(discovery([domain('src')]), [
    { path: 'src/TRUTH.md', type: 'modified' },
    { path: 'src/index.ts', type: 'modified' },
  ]);
  assert.equal(both.touchedDomains[0]?.surface, 'both');
  assert.equal(both.driftSuspicions.length, 0);
});

test('单触面产生 drift suspicion', () => {
  const implementation = classifyChanges(discovery([domain('src')]), [
    { path: 'src/index.ts', type: 'modified' },
  ]);
  assert.equal(implementation.driftSuspicions[0]?.status, 'suspicion');

  const records = classifyChanges(discovery([domain('src')]), [
    { path: 'src/GLOSSARY.md', type: 'modified' },
  ]);
  assert.equal(records.driftSuspicions[0]?.category, 'drift suspicion');
});

test('真相记录变更沿 dependsOn 反向关系与全部层级下级传播', () => {
  const result = classifyChanges(
    discovery([
      domain(''),
      domain('source'),
      domain('source/child'),
      domain('source/child/grandchild'),
      domain('consumer', {
        dependsOn: [{ path: 'source', reason: '消费来源口径' }],
      }),
    ]),
    [{ path: 'source/TRUTH.md', type: 'modified' }],
  );

  assert.deepEqual(
    result.propagationCandidates.map((candidate) => candidate.domainIdentifier),
    ['consumer', 'source/child', 'source/child/grandchild'],
  );
  assert.equal(result.propagationCandidates[0]?.status, 'candidate');
  assert.match(result.propagationCandidates[0]?.reasons[0]?.evidence ?? '', /消费来源口径/u);
});

test('待裁决背景包含被触领域自身与祖先领域条目', () => {
  const pending = (text: string, identifier: string) =>
    extractEntries(`- ${text}\n`, 'PENDING.md', identifier).entries;
  const result = classifyChanges(
    discovery([domain(''), domain('src'), domain('src/child')]),
    [{ path: 'src/child/index.ts', type: 'modified' }],
    {
      '': pending('根问题？当前保守处理。', ''),
      src: pending('源码问题？当前保守处理。', 'src'),
      'src/child': pending('下级问题？当前保守处理。', 'src/child'),
    },
  );

  assert.deepEqual(
    result.touchedDomains[0]?.pendingContext.map((context) => context.domainIdentifier),
    ['src/child', 'src', ''],
  );
});
