import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';

const sourceDir = new URL('../src/', import.meta.url);

// 禁形制清单：输出词汇表之外不得出现的书写模式（输出即合同，原语唯一入口在 format.ts）。
const forbidden: readonly Readonly<{
  pattern: RegExp;
  reason: string;
  allowIn?: readonly string[];
}>[] = [
  {
    pattern: /｜/u,
    reason: '全角竖线分隔已废除：值并列用 listValues，短语枚举用 enumeratePhrases',
  },
  { pattern: /join\('、'\)/u, reason: '短语枚举须经 enumeratePhrases', allowIn: ['format.ts'] },
  {
    pattern: /join\('，'\)/u,
    reason: '并列不得以逗号连缀：值用 listValues，短语用 enumeratePhrases',
  },
  { pattern: /join\(', '\)/u, reason: '值并列须经 listValues', allowIn: ['format.ts'] },
  { pattern: /slice\(0, 8\)/u, reason: '引用性 id 须经 shortHash', allowIn: ['format.ts'] },
  { pattern: /slice\(0, 12\)/u, reason: '引用性 id 一律 8 位短形，须经 shortHash' },
  { pattern: /\\x1b|/u, reason: 'SGR 转义须经 style 层，不得散落各处', allowIn: ['style.ts'] },
];

test('词汇表禁形制不在原语层之外出现', async () => {
  const files = (await readdir(sourceDir)).filter((name) => name.endsWith('.ts'));
  const violations: string[] = [];
  for (const name of files) {
    const source = await readFile(new URL(name, sourceDir), 'utf8');
    const lines = source.split('\n');
    for (const rule of forbidden) {
      if (rule.allowIn?.includes(name) === true) continue;
      lines.forEach((line, index) => {
        if (rule.pattern.test(line)) violations.push(`${name}:${index + 1} ${rule.reason}`);
      });
    }
  }
  assert.deepEqual(violations, []);
});
