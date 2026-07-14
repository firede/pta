export type Frontmatter = Readonly<{
  present: boolean;
  closed: boolean;
  raw: string;
  pathPresent: boolean;
  path?: string;
  filesPresent: boolean;
  files?: readonly string[];
  dependsOnPresent: boolean;
  dependsOn?: readonly DomainDependency[];
}>;

export type DomainDependency = Readonly<{
  path: string;
  reason: string;
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
  let dependsOnPresent = false;
  let dependsOn: DomainDependency[] | undefined;
  let activeList: 'files' | 'dependsOn' | undefined;
  let dependency: { path?: string; reason?: string } | undefined;

  const finishDependency = (): void => {
    if (dependency?.path !== undefined && dependency.reason !== undefined) {
      dependsOn?.push({ path: dependency.path, reason: dependency.reason });
    }
    dependency = undefined;
  };

  for (const line of rawLines) {
    const key = /^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/u.exec(line);
    if (key !== null) {
      finishDependency();
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
      } else if (name === 'dependsOn') {
        dependsOnPresent = true;
        dependsOn = [];
        if (value.trim() === '') activeList = 'dependsOn';
      }
      continue;
    }

    if (activeList === 'files') {
      const item = /^\s+-\s+(.*)$/u.exec(line);
      if (item !== null) files?.push(unquote(item[1] ?? ''));
    } else if (activeList === 'dependsOn') {
      const item = /^\s+-\s+path:\s*(.*)$/u.exec(line);
      if (item !== null) {
        finishDependency();
        dependency = { path: unquote(item[1] ?? '') };
        continue;
      }
      const field = /^\s+(path|reason):\s*(.*)$/u.exec(line);
      if (field !== null) {
        dependency ??= {};
        const value = unquote(field[2] ?? '');
        if (field[1] === 'path') dependency.path = value;
        else dependency.reason = value;
      }
    }
  }
  finishDependency();

  return {
    pathPresent,
    ...(path === undefined ? {} : { path }),
    filesPresent,
    ...(files === undefined ? {} : { files }),
    dependsOnPresent,
    ...(dependsOn === undefined ? {} : { dependsOn }),
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
        dependsOnPresent: false,
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
