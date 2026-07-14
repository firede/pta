import {
  entryIdentifier,
  hashEntryContent,
  normalizeEntryContent,
  type EntryIdentifier,
} from './identity.ts';
import { splitFrontmatter, type Frontmatter } from './frontmatter.ts';

export const contentFileNames = ['TRUTH.md', 'GLOSSARY.md', 'RESIDUE.md', 'PENDING.md'] as const;

export type ContentFileName = (typeof contentFileNames)[number];
export type FileKind = 'truth' | 'glossary' | 'residue' | 'pending';

const kinds: Readonly<Record<ContentFileName, FileKind>> = {
  'TRUTH.md': 'truth',
  'GLOSSARY.md': 'glossary',
  'RESIDUE.md': 'residue',
  'PENDING.md': 'pending',
};

export type ExtractedEntry = Readonly<{
  line: number;
  source: string;
  content: string;
  normalizedContent: string;
  contentHash: string;
  identifier?: EntryIdentifier;
  term?: string;
  normalizedTerm?: string;
}>;

export type OutsideListLine = Readonly<{
  line: number;
  source: string;
}>;

export type ExtractedContent = Readonly<{
  fileName: ContentFileName;
  kind: FileKind;
  frontmatter: Frontmatter;
  entries: readonly ExtractedEntry[];
  outsideList: readonly OutsideListLine[];
}>;

function glossaryTerm(content: string): string | undefined {
  const match = /^\*\*(.+?)\*\*/u.exec(content);
  return match?.[1];
}

export function extractEntries(
  source: string,
  fileName: ContentFileName,
  domainIdentifier?: string,
): ExtractedContent {
  const { frontmatter, lines } = splitFrontmatter(source);
  const kind = kinds[fileName];
  const entries: ExtractedEntry[] = [];
  const outsideList: OutsideListLine[] = [];

  for (const line of lines) {
    if (line.text.startsWith('- ')) {
      const content = line.text.slice(2);
      const normalizedContent = normalizeEntryContent(content);
      const contentHash = hashEntryContent(content);
      const term = kind === 'glossary' ? glossaryTerm(content) : undefined;
      entries.push({
        line: line.number,
        source: line.text,
        content,
        normalizedContent,
        contentHash,
        ...(domainIdentifier === undefined
          ? {}
          : {
              identifier: entryIdentifier(domainIdentifier, kind, contentHash),
            }),
        ...(term === undefined
          ? {}
          : {
              term,
              normalizedTerm: normalizeEntryContent(term),
            }),
      });
    } else if (line.text.trim() !== '') {
      outsideList.push({ line: line.number, source: line.text });
    }
  }

  return { fileName, kind, frontmatter, entries, outsideList };
}
