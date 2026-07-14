import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assignDomainParents,
  collectPendingEntries,
  extractEntries,
  hashEntryContent,
  planPendingAddition,
  removeEntryLines,
  selectPendingEntries,
  splitFrontmatter,
  type Domain,
  type DomainContent,
} from '../src/index.ts';

function domain(identifier: string): Domain {
  const frontmatter = splitFrontmatter('- 判断\n').frontmatter;
  return {
    kind: 'directory',
    declarationPath: `${identifier === '' ? '' : `${identifier}/`}TRUTH.md`,
    containerPath: identifier,
    identifier,
    claimedPath: identifier,
    filesPresent: false,
    dependsOn: [],
    frontmatter,
    problems: [],
  };
}

function pendingContent(owner: Domain, source: string): DomainContent {
  return {
    domain: owner,
    files: { 'PENDING.md': extractEntries(source, 'PENDING.md', owner.identifier) },
  };
}

const rootQuestion = '根问题如何处理？（暂缓）';
const sharedQuestion = '共同问题如何处理？（暂缓）';

function contents(): readonly DomainContent[] {
  const domains = assignDomainParents([domain(''), domain('src')]);
  return [
    pendingContent(domains[0] as Domain, `- ${rootQuestion}\n- ${sharedQuestion}\n`),
    pendingContent(domains[1] as Domain, `- ${sharedQuestion}\n`),
  ];
}

test('collectPendingEntries 携带领域标识与文件路径', () => {
  const refs = collectPendingEntries(contents());
  assert.deepEqual(
    refs.map((ref) => [ref.domainIdentifier, ref.filePath, ref.entry.content]),
    [
      ['', 'PENDING.md', rootQuestion],
      ['', 'PENDING.md', sharedQuestion],
      ['src', 'src/PENDING.md', sharedQuestion],
    ],
  );
});

test('selectPendingEntries 支持前缀匹配、领域限定与歧义报告', () => {
  const refs = collectPendingEntries(contents());
  const rootId = hashEntryContent(rootQuestion).slice(0, 8);
  const sharedId = hashEntryContent(sharedQuestion).slice(0, 8);

  const unique = selectPendingEntries(refs, [rootId]);
  assert.equal(unique.problems.length, 0);
  assert.deepEqual(
    unique.matches.map((match) => match.entry.content),
    [rootQuestion],
  );

  const ambiguous = selectPendingEntries(refs, [sharedId]);
  assert.equal(ambiguous.matches.length, 0);
  assert.equal(ambiguous.problems[0]?.reason, 'ambiguous');
  assert.equal(ambiguous.problems[0]?.candidates.length, 2);

  const qualified = selectPendingEntries(refs, [`src:${sharedId}`, `.:${sharedId}`]);
  assert.equal(qualified.problems.length, 0);
  assert.deepEqual(
    qualified.matches.map((match) => match.domainIdentifier),
    ['src', ''],
  );

  const failed = selectPendingEntries(refs, ['ffffffff', '不是id', rootId, rootId]);
  assert.deepEqual(
    failed.problems.map((problem) => [problem.selector, problem.reason]),
    [
      ['ffffffff', 'not-found'],
      ['不是id', 'invalid'],
    ],
  );
  assert.equal(failed.matches.length, 1);
});

test('planPendingAddition 追加单行条目，同内容判重，多行与空拒绝', () => {
  const created = planPendingAddition(undefined, ' 新问题？（暂缓） ');
  assert.equal(created.kind, 'added');
  if (created.kind === 'added') {
    assert.equal(created.source, '- 新问题？（暂缓）\n');
    assert.equal(created.line, 1);
    assert.equal(created.contentHash, hashEntryContent('新问题？（暂缓）'));
  }

  const appended = planPendingAddition('- 旧问题？（暂缓）', '新问题？（暂缓）');
  assert.equal(appended.kind, 'added');
  if (appended.kind === 'added') {
    assert.equal(appended.source, '- 旧问题？（暂缓）\n- 新问题？（暂缓）\n');
    assert.equal(appended.line, 2);
  }

  const duplicate = planPendingAddition('- 旧问题？（暂缓）\n', '旧问题？（暂缓）');
  assert.equal(duplicate.kind, 'duplicate');
  if (duplicate.kind === 'duplicate') assert.equal(duplicate.line, 1);

  assert.deepEqual(planPendingAddition(undefined, '甲\n乙'), {
    kind: 'invalid',
    reason: 'multiline',
  });
  assert.deepEqual(planPendingAddition(undefined, '   '), { kind: 'invalid', reason: 'empty' });
});

test('removeEntryLines 按行号移除，移除全部后剩空串', () => {
  const source = '- 甲\n- 乙\n- 丙\n';
  assert.equal(removeEntryLines(source, new Set([2])), '- 甲\n- 丙\n');
  assert.equal(removeEntryLines('- 甲\n', new Set([1])).trim(), '');
});
