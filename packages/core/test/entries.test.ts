import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractEntries, hashEntryContent } from '../src/index.ts';

test('跳过 frontmatter，按无缩进单行规则提取并暴露列表外内容', () => {
  const source = [
    '---',
    'dependsOn:',
    '  - path: src/forms',
    '---',
    '',
    '- 牙位编号采用 FDI 记法，界面展示与内部数据保持一致。  ',
    '  - 缩进列表不是条目',
    '正文也不是条目',
    '',
  ].join('\r\n');

  const result = extractEntries(source, 'TRUTH.md', 'dentition');
  assert.equal(result.entries.length, 1);
  assert.deepEqual(result.entries[0], {
    line: 6,
    source: '- 牙位编号采用 FDI 记法，界面展示与内部数据保持一致。  ',
    content: '牙位编号采用 FDI 记法，界面展示与内部数据保持一致。  ',
    normalizedContent: '牙位编号采用 FDI 记法，界面展示与内部数据保持一致。',
    contentHash: '44ee0940cd7342c728d188f8b05cd8788052b8df6c1ef9a82ab8581a87e7e718',
    identifier: {
      container: { domainIdentifier: 'dentition', fileKind: 'truth' },
      contentHash: '44ee0940cd7342c728d188f8b05cd8788052b8df6c1ef9a82ab8581a87e7e718',
    },
  });
  assert.deepEqual(result.outsideList, [
    { line: 7, source: '  - 缩进列表不是条目' },
    { line: 8, source: '正文也不是条目' },
  ]);
});

test('重复条目保持为两项并共享内容哈希', () => {
  const result = extractEntries('- 相同\n- 相同\n', 'RESIDUE.md', '');
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0]?.contentHash, result.entries[1]?.contentHash);
  assert.deepEqual(result.entries[0]?.identifier, result.entries[1]?.identifier);
});

test('GLOSSARY 提取起头加粗术语名，并保留完整 Markdown 内容', () => {
  const source = [
    '- **恒牙**：替换乳牙后长期使用的牙齿，图中以实色渲染。',
    '- 前言 **乳牙**：不在条目起头',
  ].join('\n');
  const result = extractEntries(source, 'GLOSSARY.md', 'oral');

  assert.equal(result.entries[0]?.term, '恒牙');
  assert.equal(result.entries[0]?.normalizedTerm, '恒牙');
  assert.equal(
    result.entries[0]?.contentHash,
    hashEntryContent(source.split('\n')[0]?.slice(2) ?? ''),
  );
  assert.equal(result.entries[1]?.term, undefined);
});

test('未闭合 frontmatter 被暴露且不误提取为正文', () => {
  const result = extractEntries('---\npath: src\n- 看似条目', 'TRUTH.md', 'src');
  assert.equal(result.frontmatter.present, true);
  assert.equal(result.frontmatter.closed, false);
  assert.deepEqual(result.entries, []);
});

test('YAML 1.2 解析合法形态、忽略未知字段并暴露非法形态与语法', () => {
  const valid = extractEntries(
    [
      '---',
      'path: internal/dsl',
      'files: [lexer.go, parser.go]',
      'dependsOn:',
      '  - { path: src/compiler, reason: "共享编译口径" }',
      'unknown: true',
      '---',
      '- 判断',
    ].join('\n'),
    'TRUTH.md',
  ).frontmatter;
  assert.equal(valid.path, 'internal/dsl');
  assert.deepEqual(valid.files, ['lexer.go', 'parser.go']);
  assert.deepEqual(valid.dependsOn, [{ path: 'src/compiler', reason: '共享编译口径' }]);
  assert.deepEqual(valid.problems, []);

  const invalidShape = extractEntries(
    '---\npath: 1\nfiles: [ok.ts, 2]\ndependsOn: [wrong]\n---\n- 判断',
    'TRUTH.md',
  ).frontmatter;
  assert.deepEqual(invalidShape.problems, [
    { code: 'invalid-path-field' },
    { code: 'invalid-files-field' },
    { code: 'invalid-depends-on-field' },
  ]);

  const malformed = extractEntries('---\npath: [\n---\n- 判断', 'TRUTH.md').frontmatter;
  assert.deepEqual(malformed.problems, [{ code: 'invalid-yaml' }]);
});
