import { posix } from 'node:path';

import type { DiscoveryResult, Domain, DomainContent } from './domains.ts';
import type { ExtractedContent, ExtractedEntry, FileKind } from './entries.ts';
import { normalizeEntryContent } from './identity.ts';

export type CheckSignalCategory = 'conflict' | 'violation' | 'term inconsistency' | 'expiry';
export type CheckSignalStatus = 'machine-decidable' | 'suspicion';
export type CheckSignalSource = 'structural-check';

export type EntryAnchor = Readonly<{
  kind: 'entry';
  domainIdentifier: string;
  fileKind: FileKind;
  contentHash: string;
}>;

export type DomainDeclarationAnchor = Readonly<{
  kind: 'domain-declaration';
  declarationPath: string;
  domainIdentifier?: string;
}>;

export type ProjectConfigurationAnchor = Readonly<{
  kind: 'project-configuration';
  path: 'pta.toml';
}>;

export type CheckSignalAnchor = EntryAnchor | DomainDeclarationAnchor | ProjectConfigurationAnchor;

export type CheckSignalEvidence = Readonly<{
  message: string;
  file: string;
  line: number;
}>;

export type CheckSignal = Readonly<{
  category: CheckSignalCategory;
  status: CheckSignalStatus;
  anchor: CheckSignalAnchor;
  evidence: CheckSignalEvidence;
  source: CheckSignalSource;
}>;

type SignalInput = Readonly<{
  category: CheckSignalCategory;
  status?: CheckSignalStatus;
  anchor: CheckSignalAnchor;
  message: string;
  file: string;
  line: number;
}>;

function signal(input: SignalInput): CheckSignal {
  return {
    category: input.category,
    status: input.status ?? 'machine-decidable',
    anchor: input.anchor,
    evidence: { message: input.message, file: input.file, line: input.line },
    source: 'structural-check',
  };
}

function declarationAnchor(domain: Domain): DomainDeclarationAnchor {
  return {
    kind: 'domain-declaration',
    declarationPath: domain.declarationPath,
    ...(domain.identifier === undefined ? {} : { domainIdentifier: domain.identifier }),
  };
}

function entryAnchor(domain: Domain, content: ExtractedContent, entry: ExtractedEntry) {
  if (domain.identifier === undefined) return declarationAnchor(domain);
  return {
    kind: 'entry' as const,
    domainIdentifier: domain.identifier,
    fileKind: content.kind,
    contentHash: entry.contentHash,
  };
}

function contentPath(domain: Domain, fileName: string): string {
  return domain.containerPath === '' ? fileName : `${domain.containerPath}/${fileName}`;
}

function frontmatterKeyLine(domain: Domain, key: string): number {
  const lines = domain.frontmatter.raw.split('\n');
  const index = lines.findIndex((line) => new RegExp(`^${key}:`, 'u').test(line));
  return index === -1 ? 1 : index + 2;
}

function contentViolations(contents: readonly DomainContent[]): CheckSignal[] {
  const signals: CheckSignal[] = [];
  for (const { domain, files } of contents) {
    for (const content of Object.values(files)) {
      if (content === undefined) continue;
      const file = contentPath(domain, content.fileName);

      if (content.frontmatter.present && !content.frontmatter.closed) {
        signals.push(
          signal({
            category: 'violation',
            anchor: declarationAnchor(domain),
            message: `${content.fileName} 的 frontmatter 未闭合。`,
            file,
            line: 1,
          }),
        );
      }

      for (const problem of content.frontmatter.problems ?? []) {
        const messages = {
          'invalid-yaml': `${content.fileName} 的 frontmatter 无法按 YAML 1.2 解析。`,
          'invalid-document': `${content.fileName} 的 frontmatter 必须是映射。`,
          'invalid-path-field': `${content.fileName} 的 frontmatter 字段 path 必须是字符串。`,
          'invalid-files-field': `${content.fileName} 的 frontmatter 字段 files 必须是字符串序列。`,
          'invalid-depends-on-field': `${content.fileName} 的 frontmatter 字段 dependsOn 必须是含字符串 path 与 reason 的映射序列。`,
        } as const;
        signals.push(
          signal({
            category: 'violation',
            anchor: declarationAnchor(domain),
            message: messages[problem.code],
            file,
            line: 1,
          }),
        );
      }

      for (const outside of content.outsideList) {
        signals.push(
          signal({
            category: 'violation',
            anchor: declarationAnchor(domain),
            message: `${content.fileName} 正文包含列表之外的非空内容：${outside.source}`,
            file,
            line: outside.line,
          }),
        );
      }

      for (const entry of content.entries) {
        if (content.kind !== 'glossary' && /^\*\*.+?\*\*/u.test(entry.content)) {
          signals.push(
            signal({
              category: 'violation',
              anchor: entryAnchor(domain, content, entry),
              message: `${content.fileName} 条目不得以加粗内容领起。`,
              file,
              line: entry.line,
            }),
          );
        }
        if (content.kind === 'glossary' && entry.term === undefined) {
          signals.push(
            signal({
              category: 'violation',
              anchor: entryAnchor(domain, content, entry),
              message: 'GLOSSARY.md 条目缺少起头加粗的术语名。',
              file,
              line: entry.line,
            }),
          );
        }
      }
    }

    if (domain.kind === 'directory' && domain.frontmatter.pathPresent) {
      signals.push(
        signal({
          category: 'violation',
          anchor: declarationAnchor(domain),
          message: '目录领域不得在 frontmatter 中声明 path。',
          file: domain.declarationPath,
          line: frontmatterKeyLine(domain, 'path'),
        }),
      );
    }
  }
  return signals;
}

function duplicateWholeDirectoryDeclarations(contents: readonly DomainContent[]): CheckSignal[] {
  const signals: CheckSignal[] = [];
  const firstByPath = new Map<string, Domain>();
  for (const { domain } of contents) {
    if (domain.filesPresent || domain.identifier === undefined) continue;
    const first = firstByPath.get(domain.identifier);
    if (first === undefined) {
      firstByPath.set(domain.identifier, domain);
      continue;
    }
    signals.push(
      signal({
        category: 'conflict',
        anchor: declarationAnchor(domain),
        message: `该整目录声明与 ${first.declarationPath}:1 重复主张目录「${domain.identifier}」。`,
        file: domain.declarationPath,
        line: 1,
      }),
    );
  }
  return signals;
}

function overlappingFileDeclarations(contents: readonly DomainContent[]): CheckSignal[] {
  const signals: CheckSignal[] = [];
  const ownerByFile = new Map<string, Domain>();
  for (const { domain } of contents) {
    if (!domain.filesPresent || domain.claimedPath === undefined) continue;
    for (const member of domain.files ?? []) {
      const claimedFile = posix.join(domain.claimedPath, member);
      const owner = ownerByFile.get(claimedFile);
      if (owner === undefined) {
        ownerByFile.set(claimedFile, domain);
        continue;
      }
      if (owner.declarationPath === domain.declarationPath) continue;
      signals.push(
        signal({
          category: 'conflict',
          anchor: declarationAnchor(domain),
          message: `files 成员「${claimedFile}」与 ${owner.declarationPath} 的声明重叠。`,
          file: domain.declarationPath,
          line: frontmatterKeyLine(domain, 'files'),
        }),
      );
    }
  }
  return signals;
}

function fileBoundaryConflicts(contents: readonly DomainContent[]): CheckSignal[] {
  const signals: CheckSignal[] = [];
  const boundaries = contents
    .map(({ domain }) => domain)
    .filter(
      (domain): domain is Domain & { identifier: string } =>
        !domain.filesPresent && domain.identifier !== undefined,
    );

  for (const { domain } of contents) {
    if (!domain.filesPresent || domain.claimedPath === undefined) continue;
    for (const member of domain.files ?? []) {
      const claimedFile = posix.join(domain.claimedPath, member);
      const boundary = boundaries.find(
        (candidate) =>
          candidate.identifier !== domain.claimedPath &&
          candidate.identifier.startsWith(`${domain.claimedPath}/`) &&
          (claimedFile === candidate.identifier ||
            claimedFile.startsWith(`${candidate.identifier}/`)),
      );
      if (boundary === undefined) continue;
      signals.push(
        signal({
          category: 'conflict',
          anchor: declarationAnchor(domain),
          message: `files 成员「${claimedFile}」越过更具体领域「${boundary.identifier}」的边界（${boundary.declarationPath}:1）。`,
          file: domain.declarationPath,
          line: frontmatterKeyLine(domain, 'files'),
        }),
      );
    }
  }
  return signals;
}

function entryConflicts(contents: readonly DomainContent[]): CheckSignal[] {
  const signals: CheckSignal[] = [];
  for (const { domain, files } of contents) {
    for (const content of Object.values(files)) {
      if (content === undefined) continue;
      const firstByContent = new Map<string, ExtractedEntry>();
      const firstByTerm = new Map<string, ExtractedEntry>();
      const file = contentPath(domain, content.fileName);
      for (const entry of content.entries) {
        const duplicate = firstByContent.get(entry.normalizedContent);
        if (duplicate === undefined) {
          firstByContent.set(entry.normalizedContent, entry);
        } else {
          signals.push(
            signal({
              category: 'conflict',
              anchor: entryAnchor(domain, content, entry),
              message: `条目与同文件第 ${duplicate.line} 行的条目内容完全相同。`,
              file,
              line: entry.line,
            }),
          );
        }

        if (content.kind !== 'glossary' || entry.normalizedTerm === undefined) continue;
        const sameTerm = firstByTerm.get(entry.normalizedTerm);
        if (sameTerm === undefined) {
          firstByTerm.set(entry.normalizedTerm, entry);
        } else {
          signals.push(
            signal({
              category: 'conflict',
              anchor: entryAnchor(domain, content, entry),
              message: `术语名「${entry.term ?? entry.normalizedTerm}」与同一 GLOSSARY.md 第 ${sameTerm.line} 行重复。`,
              file,
              line: entry.line,
            }),
          );
        }
      }
    }
  }
  return signals;
}

function definition(entry: ExtractedEntry): string | undefined {
  if (entry.term === undefined) return undefined;
  const prefix = `**${entry.term}**`;
  if (!entry.content.startsWith(prefix)) return undefined;
  return normalizeEntryContent(entry.content.slice(prefix.length));
}

function isAncestor(ancestor: Domain, descendant: Domain): boolean {
  if (
    ancestor.filesPresent ||
    ancestor.identifier === undefined ||
    descendant.claimedPath === undefined
  )
    return false;
  if (descendant.filesPresent && ancestor.identifier === descendant.claimedPath) return true;
  return (
    ancestor.identifier !== descendant.claimedPath &&
    (ancestor.identifier === '' || descendant.claimedPath.startsWith(`${ancestor.identifier}/`))
  );
}

function termInconsistencies(contents: readonly DomainContent[]): CheckSignal[] {
  const signals: CheckSignal[] = [];
  for (const descendant of contents) {
    const glossary = descendant.files['GLOSSARY.md'];
    if (glossary === undefined) continue;
    const ancestors = contents.filter((candidate) =>
      isAncestor(candidate.domain, descendant.domain),
    );
    for (const entry of glossary.entries) {
      if (entry.normalizedTerm === undefined) continue;
      const childDefinition = definition(entry);
      if (childDefinition === undefined) continue;
      for (const ancestor of ancestors) {
        const ancestorGlossary = ancestor.files['GLOSSARY.md'];
        const inherited = ancestorGlossary?.entries.find(
          (candidate) => candidate.normalizedTerm === entry.normalizedTerm,
        );
        if (inherited === undefined || definition(inherited) === childDefinition) continue;
        signals.push(
          signal({
            category: 'term inconsistency',
            status: 'suspicion',
            anchor: entryAnchor(descendant.domain, glossary, entry),
            message: `下级术语「${entry.term ?? entry.normalizedTerm}」的定义文本与上级 ${contentPath(ancestor.domain, 'GLOSSARY.md')}:${inherited.line} 不同，需由人裁决是否构成冲突性重定义。`,
            file: contentPath(descendant.domain, 'GLOSSARY.md'),
            line: entry.line,
          }),
        );
      }
    }
  }
  return signals;
}

const definedStatusCharacters = new Set(['?']);

function undefinedStatusCharacters(contents: readonly DomainContent[]): CheckSignal[] {
  const signals: CheckSignal[] = [];
  for (const content of contents) {
    const { domain } = content;
    const truth = content.files['TRUTH.md'];
    if (truth === undefined) continue;
    for (const entry of truth.entries) {
      if (entry.marker === undefined || definedStatusCharacters.has(entry.marker)) continue;
      signals.push(
        signal({
          category: 'violation',
          anchor: entryAnchor(domain, truth, entry),
          message: `状态字符「${entry.marker}」未被内容结构规范定义。`,
          file: domain.containerPath === '' ? 'TRUTH.md' : `${domain.containerPath}/TRUTH.md`,
          line: entry.line,
        }),
      );
    }
  }
  return signals;
}

function missingDependencyTargets(contents: readonly DomainContent[]): CheckSignal[] {
  const identifiers = new Set(
    contents.flatMap(({ domain }) => (domain.identifier === undefined ? [] : [domain.identifier])),
  );
  const signals: CheckSignal[] = [];
  for (const { domain } of contents) {
    if (domain.identifier === undefined) continue;
    for (const dependency of domain.dependsOn) {
      if (identifiers.has(dependency.path)) continue;
      signals.push(
        signal({
          category: 'violation',
          anchor: declarationAnchor(domain),
          message: `dependsOn 指向的「${dependency.path}」不是任何领域的标识；目标可能已迁移、更名或声明有误。`,
          file: domain.declarationPath,
          line: frontmatterKeyLine(domain, 'dependsOn'),
        }),
      );
    }
  }
  return signals;
}

export function lintDomainContents(contents: readonly DomainContent[]): readonly CheckSignal[] {
  return [
    ...contentViolations(contents),
    ...duplicateWholeDirectoryDeclarations(contents),
    ...overlappingFileDeclarations(contents),
    ...fileBoundaryConflicts(contents),
    ...entryConflicts(contents),
    ...termInconsistencies(contents),
    ...missingDependencyTargets(contents),
    ...undefinedStatusCharacters(contents),
  ];
}

export function lintDiscoveryProblems(discovery: DiscoveryResult): readonly CheckSignal[] {
  return (discovery.problems ?? []).map((problem) =>
    signal({
      category: 'violation',
      anchor: { kind: 'project-configuration', path: problem.path },
      message:
        problem.code === 'invalid-pta-toml'
          ? 'pta.toml 无法按 TOML 1.0 解析，未产生任何配置。'
          : 'pta.toml 顶层字段 externalRoots 必须是字符串数组，未采用该字段。',
      file: problem.path,
      line: 1,
    }),
  );
}
