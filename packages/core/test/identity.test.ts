import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  entryIdentifier,
  hashEntryContent,
  hashFileBytes,
  isDomainPath,
  normalizeEntryContent,
} from '../src/index.ts';

test('条目去除首尾空白、按 NFC 规范化，内部空白保持不变', () => {
  const decomposed = '  e\u0301  ';
  assert.equal(normalizeEntryContent(decomposed), 'é');
  assert.equal(
    hashEntryContent(decomposed),
    '4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c',
  );
  assert.notEqual(hashEntryContent('a  b'), hashEntryContent('a b'));
});

test('Markdown 源字符属于内容且加粗术语名变化会改变身份', () => {
  const source = '**恒牙**：替换乳牙后长期使用的牙齿，图中以实色渲染。';
  assert.equal(
    hashEntryContent(source),
    'e20c8c3fd1394047e53c3347105da9f1d30c74b3aa839464a2da09e6dc4bc4af',
  );
  assert.notEqual(hashEntryContent(source), hashEntryContent(source.replaceAll('**', '')));
});

test('文件身份使用原始字节，不做换行或 Unicode 规范化', () => {
  assert.notEqual(hashFileBytes(Buffer.from('a\n')), hashFileBytes(Buffer.from('a\r\n')));
  assert.notEqual(hashFileBytes(Buffer.from('é')), hashFileBytes(Buffer.from('e\u0301')));
});

test('完整条目标识包括领域、文件种类与完整内容哈希', () => {
  const hash = hashEntryContent('同一条目');
  assert.deepEqual(entryIdentifier('src/web', 'truth', hash), {
    container: { domainIdentifier: 'src/web', fileKind: 'truth' },
    contentHash: hash,
  });
  assert.notDeepEqual(
    entryIdentifier('src/web', 'truth', hash),
    entryIdentifier('src/api', 'truth', hash),
  );
  assert.notDeepEqual(
    entryIdentifier('src/web', 'truth', hash),
    entryIdentifier('src/web', 'pending', hash),
  );
});

test('领域路径规则允许仓库根并拒绝非规范路径段', () => {
  assert.equal(isDomainPath(''), true);
  assert.equal(isDomainPath('src/components/screening-form'), true);
  for (const path of ['./src', '/src', 'src/', 'src//web', 'src/./web', 'src/../web']) {
    assert.equal(isDomainPath(path), false, path);
  }
  assert.equal(isDomainPath('Src/组件'), true);
});
