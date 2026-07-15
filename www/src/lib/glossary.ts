import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface GlossaryEntry {
  /** 术语原文，与术语表条目一致。 */
  term: string;
  /** 锚点标识，由术语原文小写并以连字符连接得到。 */
  slug: string;
  /** 定义正文，纯文本。 */
  definition: string;
}

/** 术语表文章相对各 locale 内容根的路径，术语表文章是术语数据的唯一来源。 */
export const glossaryDocId = 'argument/glossary';

const glossaryFiles = {
  root: '../content/docs/argument/glossary.md',
  'zh-hant': '../content/docs/zh-hant/argument/glossary.md',
  en: '../content/docs/en/argument/glossary.md',
} as const;

export type GlossaryLocale = keyof typeof glossaryFiles;

const cache = new Map<GlossaryLocale, GlossaryEntry[]>();

/** 解析指定 locale 的术语表条目；格式不符合「加粗术语 + 定义段落」时构建报错。 */
export function getGlossaryEntries(locale: GlossaryLocale): GlossaryEntry[] {
  const cached = cache.get(locale);
  if (cached) return cached;

  const path = fileURLToPath(new URL(glossaryFiles[locale], import.meta.url));
  const entries = parseGlossary(readFileSync(path, 'utf8'), path);
  cache.set(locale, entries);
  return entries;
}

export function getTermSlug(term: string) {
  return term.toLowerCase().replace(/\s+/g, '-');
}

function parseGlossary(source: string, path: string): GlossaryEntry[] {
  const body = stripFrontmatter(source, path);
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const entries: GlossaryEntry[] = [];
  let pendingTerm: string | null = null;

  for (const paragraph of paragraphs) {
    const termMatch = /^\*\*(.+)\*\*$/.exec(paragraph);

    if (termMatch) {
      if (pendingTerm !== null) {
        throw new Error(`术语表条目 "${pendingTerm}" 缺少定义段落：${path}`);
      }
      pendingTerm = termMatch[1].trim();
      continue;
    }

    if (pendingTerm === null) {
      throw new Error(
        `术语表存在不属于任何条目的段落，无法解析："${paragraph.slice(0, 24)}…"（${path}）`,
      );
    }

    entries.push({
      term: pendingTerm,
      slug: getTermSlug(pendingTerm),
      definition: paragraph.replace(/\s*\n\s*/g, ' '),
    });
    pendingTerm = null;
  }

  if (pendingTerm !== null) {
    throw new Error(`术语表条目 "${pendingTerm}" 缺少定义段落：${path}`);
  }
  if (entries.length === 0) {
    throw new Error(`术语表未解析出任何条目：${path}`);
  }

  return entries;
}

function stripFrontmatter(source: string, path: string) {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(source);
  if (!match) {
    throw new Error(`术语表缺少 frontmatter：${path}`);
  }
  return source.slice(match[0].length);
}
