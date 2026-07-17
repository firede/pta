import type { ChangeType } from '@pta/core';

import { plainStyle, stripStyles, type Style } from './style.ts';

// 输出排版词汇表的原子层：每种值类型全 CLI 唯一书写形制，本模块是唯一入口。
// 首个发布版本起输出承担合同职责；预发布期形制可随迭代演化，不背破坏性调整义务。

/** 领域标识的裸值：根领域写作「.」。选择器等需回填输入的场合用它。 */
export function domainValue(identifier: string): string {
  return identifier === '' ? '.' : identifier;
}

/** 领域引用：反引号给值以可见边界（markdown 免费渲染），根领域补注免漏视。 */
export function domainRef(identifier: string): string {
  const value = domainValue(identifier);
  return value === '.' ? '`.` (根)' : `\`${value}\``;
}

/** 引用性 id 一律 8 位短形；完整性哈希（来源基线、内容哈希清单）保留全长，不经此函数。 */
export function shortHash(hash: string): string {
  return hash.slice(0, 8);
}

/** 跨领域条目引用：与 pending resolve 的选择器输入同形，输出可直接回填。 */
export function entryRef(domainIdentifier: string, contentHash: string): string {
  return `${domainValue(domainIdentifier)}:${shortHash(contentHash)}`;
}

/** git 原生标识用 git 的称谓引导，与 git log 同形，肌肉记忆同 M/A/D 字母。 */
export function commitRef(hash: string): string {
  return `commit ${hash}`;
}

/** 完整性内容哈希用 OCI 摘要形制自述类型，前缀兼作标识方案演进的声明位。 */
export function contentHashRef(hash: string): string {
  return `sha256:${hash}`;
}

/** 条目行：`- ` 前缀与真相记录存储形制同构，id 在前便于 grep 与复制，定位（文件:行）随其后。 */
export function entryLine(
  id: string,
  locator: string | undefined,
  content: string,
  s: Style = plainStyle,
): string {
  return locator === undefined
    ? `- ${s.dim(id)} ${content}`
    : `- ${s.dim(id)} ${s.dim(locator)} ${content}`;
}

const changeMarks: Readonly<Record<ChangeType, string>> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  untracked: '?',
  renamed: 'R',
  copied: 'C',
};

const changeMarkPaint: Readonly<Record<ChangeType, keyof Style>> = {
  modified: 'yellow',
  added: 'green',
  deleted: 'red',
  untracked: 'dim',
  renamed: 'cyan',
  copied: 'cyan',
};

/** 文件变更用 git status 字母，不造标签；着色随 git status 惯例。 */
export function changeMark(type: ChangeType, s: Style = plainStyle): string {
  return s[changeMarkPaint[type]](changeMarks[type]);
}

// 核查信号的规范正名：概念术语以汉语表达，core 的英文字面量是实现别名（根域真相）。
// 信号类别是开放清单，未知码原样透出。
const categoryTerms: Readonly<Record<string, string>> = {
  conflict: '冲突',
  violation: '违例',
  'term inconsistency': '术语不一致',
  'drift suspicion': '漂移嫌疑',
  propagation: '传播',
  expiry: '到期',
};

const statusTerms: Readonly<Record<string, string>> = {
  'machine-decidable': '机器可判定',
  suspicion: '嫌疑',
  candidate: '候选',
};

/** 核查信号行：[类别 | 状态] 详情，类别与状态用工作语言的规范用词；标记按严重度着色（冲突与违例红，其余黄）。 */
export function signalLine(
  category: string,
  status: string,
  detail: string,
  s: Style = plainStyle,
): string {
  const marker = `[${categoryTerms[category] ?? category} | ${statusTerms[status] ?? status}]`;
  const paint = category === 'conflict' || category === 'violation' ? s.red : s.yellow;
  return `${paint(marker)} ${detail}`;
}

/** 非自然语言值（路径、标识、命令名）的单行并列：半角逗号加空格，多语言版本形制不变。 */
export function listValues(values: readonly string[]): string {
  return values.join(', ');
}

/** 自然语言短语的并列枚举：顿号。 */
export function enumeratePhrases(phrases: readonly string[]): string {
  return phrases.join('、');
}

function isWideCodePoint(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x20000 && code <= 0x3fffd)
  );
}

/** 终端显示宽度：东亚全角计 2，半角计 1，SGR 转义不占宽。列对齐按它而非字符数。 */
export function displayWidth(styled: string): number {
  const text = stripStyles(styled);
  let width = 0;
  for (const character of text) {
    width += isWideCodePoint(character.codePointAt(0) as number) ? 2 : 1;
  }
  return width;
}

/** 列对齐：按显示宽度补空格，列距两空格；整列皆空则剔除，行尾不留白。 */
export function alignRows(rows: readonly (readonly string[])[]): string[] {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const columns: number[] = [];
  for (let index = 0; index < columnCount; index += 1) {
    if (rows.some((row) => (row[index] ?? '') !== '')) columns.push(index);
  }
  const widths = columns.map((column) =>
    rows.reduce((max, row) => Math.max(max, displayWidth(row[column] ?? '')), 0),
  );
  return rows.map((row) =>
    columns
      .map((column, position) => {
        const cell = row[column] ?? '';
        return cell + ' '.repeat((widths[position] ?? 0) - displayWidth(cell));
      })
      .join('  ')
      .trimEnd(),
  );
}
