import { parseDocument } from 'yaml';

export type FrontmatterProblemCode =
  | 'invalid-yaml'
  | 'invalid-document'
  | 'invalid-path-field'
  | 'invalid-files-field'
  | 'invalid-depends-on-field';

export type FrontmatterProblem = Readonly<{
  code: FrontmatterProblemCode;
}>;

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
  problems?: readonly FrontmatterProblem[];
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function parseFrontmatter(raw: string): Omit<Frontmatter, 'present' | 'closed' | 'raw'> {
  const problems: FrontmatterProblem[] = [];
  let value: unknown;
  try {
    const document = parseDocument(raw);
    if (document.errors.length > 0) throw new Error('invalid YAML');
    value = document.toJS();
  } catch {
    return {
      pathPresent: false,
      filesPresent: false,
      dependsOnPresent: false,
      problems: [{ code: 'invalid-yaml' }],
    };
  }

  if (value !== null && !isRecord(value)) {
    return {
      pathPresent: false,
      filesPresent: false,
      dependsOnPresent: false,
      problems: [{ code: 'invalid-document' }],
    };
  }
  const fields = value ?? {};
  const pathPresent = hasOwn(fields, 'path');
  const filesPresent = hasOwn(fields, 'files');
  const dependsOnPresent = hasOwn(fields, 'dependsOn');

  const pathValue = fields.path;
  const path = typeof pathValue === 'string' ? pathValue : undefined;
  if (pathPresent && path === undefined) problems.push({ code: 'invalid-path-field' });

  const filesValue = fields.files;
  const files =
    Array.isArray(filesValue) && filesValue.every((item) => typeof item === 'string')
      ? filesValue
      : undefined;
  if (filesPresent && files === undefined) problems.push({ code: 'invalid-files-field' });

  const dependsOnValue = fields.dependsOn;
  const dependsOn =
    Array.isArray(dependsOnValue) &&
    dependsOnValue.every(
      (item) => isRecord(item) && typeof item.path === 'string' && typeof item.reason === 'string',
    )
      ? dependsOnValue.map((item) => {
          const dependency = item as Record<string, unknown>;
          return { path: dependency.path as string, reason: dependency.reason as string };
        })
      : undefined;
  if (dependsOnPresent && dependsOn === undefined)
    problems.push({ code: 'invalid-depends-on-field' });

  return {
    pathPresent,
    ...(path === undefined ? {} : { path }),
    filesPresent,
    ...(files === undefined ? {} : { files }),
    dependsOnPresent,
    ...(dependsOn === undefined ? {} : { dependsOn }),
    problems,
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
        problems: [],
      },
      lines,
    };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.text === '---');
  const end = closingIndex === -1 ? lines.length : closingIndex;
  const rawLines = lines.slice(1, end).map((line) => line.text);
  const raw = rawLines.join('\n');
  const parsed = parseFrontmatter(raw);

  return {
    frontmatter: {
      present: true,
      closed: closingIndex !== -1,
      raw,
      ...parsed,
    },
    lines: closingIndex === -1 ? [] : lines.slice(closingIndex + 1),
  };
}
