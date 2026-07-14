export type Frontmatter = Readonly<{
  present: boolean;
  closed: boolean;
  raw: string;
  pathPresent: boolean;
  path?: string;
  filesPresent: boolean;
  files?: readonly string[];
}>;

export type MarkdownBody = Readonly<{
  frontmatter: Frontmatter;
  lines: readonly SourceLine[];
}>;

export type SourceLine = Readonly<{
  number: number;
  text: string;
}>;

function sourceLines(source: string): SourceLine[] {
  return source.split(/\r\n|\n|\r/).map((text, index) => ({
    number: index + 1,
    text,
  }));
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === 'string') return parsed;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }

  return trimmed.replace(/\s+#.*$/u, '');
}

function parseInlineList(value: string): string[] | undefined {
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return undefined;

  const body = trimmed.slice(1, -1);
  const values: string[] = [];
  let quote: '"' | "'" | undefined;
  let escaped = false;
  let current = '';

  for (const character of body) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (quote === '"' && character === '\\') {
      current += character;
      escaped = true;
      continue;
    }
    if (quote !== undefined) {
      current += character;
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }
    if (character === ',') {
      values.push(unquote(current));
      current = '';
      continue;
    }
    current += character;
  }
  if (current.trim() !== '' || body.trim() !== '') values.push(unquote(current));
  return values;
}

function parseFrontmatter(
  rawLines: readonly string[],
): Omit<Frontmatter, 'present' | 'closed' | 'raw'> {
  let pathPresent = false;
  let path: string | undefined;
  let filesPresent = false;
  let files: string[] | undefined;
  let activeList: 'files' | undefined;

  for (const line of rawLines) {
    const key = /^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/u.exec(line);
    if (key !== null) {
      activeList = undefined;
      const name = key[1];
      const value = key[2] ?? '';
      if (name === 'path') {
        pathPresent = true;
        path = unquote(value);
      } else if (name === 'files') {
        filesPresent = true;
        files = parseInlineList(value) ?? [];
        if (value.trim() === '') activeList = 'files';
      }
      continue;
    }

    if (activeList === 'files') {
      const item = /^\s+-\s+(.*)$/u.exec(line);
      if (item !== null) files?.push(unquote(item[1] ?? ''));
    }
  }

  return {
    pathPresent,
    ...(path === undefined ? {} : { path }),
    filesPresent,
    ...(files === undefined ? {} : { files }),
  };
}

export function splitFrontmatter(source: string): MarkdownBody {
  const lines = sourceLines(source);
  if (lines[0]?.text !== '---') {
    return {
      frontmatter: {
        present: false,
        closed: false,
        raw: '',
        pathPresent: false,
        filesPresent: false,
      },
      lines,
    };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.text === '---');
  const end = closingIndex === -1 ? lines.length : closingIndex;
  const rawLines = lines.slice(1, end).map((line) => line.text);
  const parsed = parseFrontmatter(rawLines);

  return {
    frontmatter: {
      present: true,
      closed: closingIndex !== -1,
      raw: rawLines.join('\n'),
      ...parsed,
    },
    lines: closingIndex === -1 ? [] : lines.slice(closingIndex + 1),
  };
}
