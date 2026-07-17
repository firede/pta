import {
  getGlossaryEntries,
  getTermSlug,
  type GlossaryEntry,
  type GlossaryLocale,
} from '../glossary';

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

interface VFileLike {
  path?: string;
  history?: string[];
}

interface TermMatch {
  length: number;
  entry: GlossaryEntry;
}

/** 命中后整体跳过的元素：链接与代码有自身语义，标题与加粗承担强调，不再叠加术语标注。 */
const skippedTags = new Set([
  'a',
  'button',
  'code',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'pre',
  'script',
  'strong',
  'style',
]);

/**
 * 在正文中标注术语表术语，供术语弹层使用；术语表页面本身只补充条目锚点。
 * 标注按小节去重：每个 h2 小节内同一术语只标注首次出现。
 */
export function rehypeGlossaryTerms() {
  return (tree: unknown, file: VFileLike) => {
    const path = normalizePath(file.path ?? file.history?.[0]);
    if (!path) return;

    const docPath = extractDocPath(path);
    if (!docPath) return;

    const locale = extractLocale(docPath);
    const entries = getGlossaryEntries(locale);

    if (isGlossaryPage(docPath)) {
      addGlossaryAnchors(tree as HastNode);
      return;
    }

    const used = new Map<string, GlossaryEntry>();
    annotate(tree as HastNode, { entries, latin: locale === 'en', seen: new Set(), used });

    if (used.size > 0) {
      appendTermData(tree as HastNode, [...used.values()]);
    }
  };
}

function normalizePath(path: string | undefined) {
  return path?.split('\\').join('/');
}

function extractDocPath(path: string) {
  const marker = '/src/content/docs/';
  const index = path.indexOf(marker);
  return index === -1 ? undefined : path.slice(index + marker.length);
}

function extractLocale(docPath: string): GlossaryLocale {
  if (docPath.startsWith('en/')) return 'en';
  if (docPath.startsWith('zh-hant/')) return 'zh-hant';
  return 'root';
}

function isGlossaryPage(docPath: string) {
  return /^(?:en\/|zh-hant\/)?argument\/glossary\.mdx?$/.test(docPath);
}

/**
 * 术语表页的结构加工：加粗术语段与其定义段配成对，包进辞典条目容器；
 * 条目锚点落在容器上，作为弹层「查看术语表」链接的落点。
 */
function addGlossaryAnchors(node: HastNode) {
  if (!node.children) return;

  const grouped: HastNode[] = [];
  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    const term = glossaryTermText(child);

    if (term) {
      const siblings: HastNode[] = [child];
      while (
        index + 1 < node.children.length &&
        glossaryTermText(node.children[index + 1]) === null &&
        node.children[index + 1].type === 'element'
      ) {
        siblings.push(node.children[index + 1]);
        index += 1;
      }
      grouped.push({
        type: 'element',
        tagName: 'div',
        properties: { className: ['glossary-entry'], id: getTermSlug(term) },
        children: siblings,
      });
      continue;
    }

    grouped.push(child);
    addGlossaryAnchors(child);
  }

  node.children = grouped;
}

/** 加粗独占段落的术语原文；非术语段落返回 null。 */
function glossaryTermText(node: HastNode): string | null {
  if (node.type !== 'element' || node.tagName !== 'p') return null;
  const [only] = (node.children ?? []).filter(
    (child) => !(child.type === 'text' && (child.value ?? '').trim() === ''),
  );
  if (only?.type !== 'element' || only.tagName !== 'strong') return null;
  const term = textContent(only).trim();
  return term || null;
}

function textContent(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textContent).join('');
}

interface AnnotateContext {
  entries: GlossaryEntry[];
  latin: boolean;
  /** 当前小节内已标注的术语，遇到 h2 重置。 */
  seen: Set<string>;
  /** 全页实际标注过的术语，决定随页数据包含哪些定义。 */
  used: Map<string, GlossaryEntry>;
}

function annotate(node: HastNode, context: AnnotateContext) {
  const children = node.children;
  if (!children) return;

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];

    if (child.type === 'element') {
      if (child.tagName === 'h2') context.seen.clear();
      if (skippedTags.has(child.tagName ?? '')) continue;
      annotate(child, context);
      continue;
    }

    if (child.type !== 'text' || !child.value) continue;

    const replaced = annotateText(child.value, context);
    if (replaced) {
      children.splice(index, 1, ...replaced);
      index += replaced.length - 1;
    }
  }
}

function annotateText(value: string, context: AnnotateContext): HastNode[] | undefined {
  const lower = context.latin ? value.toLowerCase() : value;
  const nodes: HastNode[] = [];
  let plainStart = 0;
  let index = 0;

  while (index < lower.length) {
    const match = matchAt(lower, index, context);
    if (!match) {
      index += 1;
      continue;
    }

    const overlapEnd = findOverlapEnd(lower, index, index + match.length, context);
    if (overlapEnd !== undefined) {
      // 复合词同时命中多个术语（如「项目真相记录」），指向不明，整体不标注。
      index = overlapEnd;
      continue;
    }

    if (context.seen.has(match.entry.slug)) {
      index += match.length;
      continue;
    }

    context.seen.add(match.entry.slug);
    context.used.set(match.entry.slug, match.entry);

    if (index > plainStart) {
      nodes.push({ type: 'text', value: value.slice(plainStart, index) });
    }
    nodes.push({
      type: 'element',
      tagName: 'button',
      properties: { type: 'button', className: ['glossary-term'], dataTerm: match.entry.slug },
      children: [{ type: 'text', value: value.slice(index, index + match.length) }],
    });

    index += match.length;
    plainStart = index;
  }

  if (nodes.length === 0) return undefined;

  if (plainStart < value.length) {
    nodes.push({ type: 'text', value: value.slice(plainStart) });
  }
  return nodes;
}

/** 返回从 index 开始能命中的最长术语。 */
function matchAt(lower: string, index: number, context: AnnotateContext): TermMatch | undefined {
  let best: TermMatch | undefined;

  for (const entry of context.entries) {
    const term = context.latin ? entry.term.toLowerCase() : entry.term;
    if (!lower.startsWith(term, index)) continue;

    let length = term.length;

    if (context.latin) {
      if (!isWordBoundary(lower, index - 1)) continue;
      // 英文允许词尾复数：truth record 同样命中 truth records。
      if (lower[index + length] === 's') length += 1;
      if (!isWordBoundary(lower, index + length)) continue;
    }

    if (!best || length > best.length) {
      best = { length, entry };
    }
  }

  return best;
}

/** 检查 [start, end) 命中区间内是否有其他术语越过区间边界；有则返回整个重叠簇的末尾。 */
function findOverlapEnd(lower: string, start: number, end: number, context: AnnotateContext) {
  let clusterEnd = end;
  let scan = start + 1;
  let overlapped = false;

  while (scan < clusterEnd) {
    const match = matchAt(lower, scan, context);
    if (match && scan + match.length > clusterEnd) {
      clusterEnd = scan + match.length;
      overlapped = true;
    }
    scan += 1;
  }

  return overlapped ? clusterEnd : undefined;
}

function isWordBoundary(lower: string, index: number) {
  if (index < 0 || index >= lower.length) return true;
  return !/[0-9a-z]/.test(lower[index]);
}

/** 随页嵌入被标注术语的定义数据，供弹层脚本读取。 */
function appendTermData(tree: HastNode, entries: GlossaryEntry[]) {
  const payload = entries.map(({ slug, term, definition }) => ({ slug, term, definition }));
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');

  tree.children ??= [];
  tree.children.push({
    type: 'element',
    tagName: 'script',
    properties: { type: 'application/json', dataGlossaryTerms: '' },
    children: [{ type: 'text', value: json }],
  });
}
