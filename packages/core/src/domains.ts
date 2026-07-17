import { readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';

import { parse as parseToml } from 'smol-toml';

import {
  contentFileNames,
  extractEntries,
  type ContentFileName,
  type ExtractedContent,
} from './entries.ts';
import { splitFrontmatter, type DomainDependency, type Frontmatter } from './frontmatter.ts';
import { isDomainPath } from './identity.ts';

export type DomainProblemCode =
  | 'unclosed-frontmatter'
  | 'invalid-frontmatter'
  | 'invalid-path-field'
  | 'invalid-files-field'
  | 'invalid-depends-on-field'
  | 'directory-declares-path'
  | 'missing-path'
  | 'invalid-path'
  | 'path-not-directory'
  | 'invalid-file-path'
  | 'duplicate-file'
  | 'file-not-file';

export type DomainProblem = Readonly<{
  code: DomainProblemCode;
  value?: string;
}>;

export type DiscoveryProblemCode =
  | 'invalid-pta-toml'
  | 'invalid-external-roots'
  | 'invalid-working-language';

export type DiscoveryProblem = Readonly<{
  code: DiscoveryProblemCode;
  path: 'pta.toml';
}>;

export type Domain = Readonly<{
  kind: 'directory' | 'external';
  declarationPath: string;
  containerPath: string;
  externalRoot?: string;
  name?: string;
  identifier?: string;
  claimedPath?: string;
  filesPresent: boolean;
  files?: readonly string[];
  dependsOn: readonly DomainDependency[];
  parentIdentifier?: string;
  frontmatter: Frontmatter;
  problems: readonly DomainProblem[];
}>;

export type ExternalRoot = Readonly<{
  path: string;
  source: 'default' | 'pta.toml';
  usable: boolean;
}>;

export type DiscoveryResult = Readonly<{
  repositoryRoot: string;
  externalRoots: readonly ExternalRoot[];
  workingLanguage?: string;
  domains: readonly Domain[];
  problems?: readonly DiscoveryProblem[];
}>;

export type DomainContent = Readonly<{
  domain: Domain;
  files: Readonly<Partial<Record<ContentFileName, ExtractedContent>>>;
}>;

function repositoryPath(root: string, path: string): string {
  return join(root, ...path.split('/'));
}

function repositoryPathKind(
  files: ReadonlySet<string>,
  path: string,
): 'directory' | 'file' | 'missing' {
  if (path === '') return 'directory';
  if (files.has(path)) return 'file';
  return [...files].some((file) => file.startsWith(`${path}/`)) ? 'directory' : 'missing';
}

/** 工作语言标签的书写形态：语言子标签，可附书写系统子标签；地区等其余子标签不入形制。 */
const workingLanguagePattern = /^[a-z]{2,3}(-[A-Z][a-z]{3})?$/;

export function isWorkingLanguage(value: string): boolean {
  return workingLanguagePattern.test(value);
}

async function projectConfiguration(
  repositoryRoot: string,
  files: ReadonlySet<string>,
): Promise<{ roots: ExternalRoot[]; workingLanguage?: string; problems: DiscoveryProblem[] }> {
  let configured: string[] | undefined;
  let workingLanguage: string | undefined;
  const problems: DiscoveryProblem[] = [];
  if (files.has('pta.toml')) {
    const source = await readFile(join(repositoryRoot, 'pta.toml'), 'utf8');
    try {
      const parsed = parseToml(source);
      if (Object.prototype.hasOwnProperty.call(parsed, 'externalRoots')) {
        const value: unknown = parsed.externalRoots;
        if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
          configured = value;
        } else {
          problems.push({ code: 'invalid-external-roots', path: 'pta.toml' });
        }
      }
      if (Object.prototype.hasOwnProperty.call(parsed, 'workingLanguage')) {
        const value: unknown = parsed.workingLanguage;
        if (typeof value === 'string' && isWorkingLanguage(value)) {
          workingLanguage = value;
        } else {
          problems.push({ code: 'invalid-working-language', path: 'pta.toml' });
        }
      }
    } catch {
      problems.push({ code: 'invalid-pta-toml', path: 'pta.toml' });
    }
  }

  // 声明的值整体替代默认，不与默认合并；空清单表示不设外置声明根。
  const roots: ExternalRoot[] =
    configured === undefined
      ? [{ path: '.pta', source: 'default', usable: true }]
      : configured.map((path) => ({
          path,
          source: 'pta.toml',
          usable: isDomainPath(path, false),
        }));
  return { roots, ...(workingLanguage === undefined ? {} : { workingLanguage }), problems };
}

function insideExternalRoot(path: string, roots: readonly ExternalRoot[]): boolean {
  return roots.some(
    (root) => root.usable && (path === root.path || path.startsWith(`${root.path}/`)),
  );
}

function frontmatterProblems(frontmatter: Frontmatter): DomainProblem[] {
  const problems: DomainProblem[] = [];
  if (frontmatter.present && !frontmatter.closed) problems.push({ code: 'unclosed-frontmatter' });
  for (const problem of frontmatter.problems ?? []) {
    if (problem.code === 'invalid-yaml' || problem.code === 'invalid-document') {
      problems.push({ code: 'invalid-frontmatter' });
    } else {
      problems.push({ code: problem.code });
    }
  }
  return problems;
}

async function directoryDeclarations(
  repositoryRoot: string,
  files: ReadonlySet<string>,
  roots: readonly ExternalRoot[],
): Promise<Domain[]> {
  const declarationPaths = [...files]
    .filter(
      (path) =>
        (path === 'TRUTH.md' || path.endsWith('/TRUTH.md')) && !insideExternalRoot(path, roots),
    )
    .sort();

  return Promise.all(
    declarationPaths.map(async (declarationPath): Promise<Domain> => {
      const slash = declarationPath.lastIndexOf('/');
      const directory = slash === -1 ? '' : declarationPath.slice(0, slash);
      const frontmatter = splitFrontmatter(
        await readFile(repositoryPath(repositoryRoot, declarationPath), 'utf8'),
      ).frontmatter;
      const problems = frontmatterProblems(frontmatter);
      if (frontmatter.pathPresent)
        problems.push({
          code: 'directory-declares-path',
          ...(frontmatter.path === undefined ? {} : { value: frontmatter.path }),
        });
      return {
        kind: 'directory',
        declarationPath,
        containerPath: directory,
        identifier: directory,
        claimedPath: directory,
        filesPresent: false,
        dependsOn: frontmatter.dependsOn ?? [],
        frontmatter,
        problems,
      };
    }),
  );
}

async function externalDeclarations(
  repositoryRoot: string,
  files: ReadonlySet<string>,
  roots: readonly ExternalRoot[],
): Promise<Domain[]> {
  const domains: Domain[] = [];
  const scannedRoots = new Set<string>();
  for (const root of roots) {
    if (!root.usable || scannedRoots.has(root.path)) continue;
    scannedRoots.add(root.path);
    const prefix = `${root.path}/`;
    const declarationPaths = [...files]
      .filter((path) => {
        if (!path.startsWith(prefix) || !path.endsWith('/TRUTH.md')) return false;
        const rest = path.slice(prefix.length);
        return rest.split('/').length === 2;
      })
      .sort();

    for (const declarationPath of declarationPaths) {
      const containerPath = declarationPath.slice(0, -'/TRUTH.md'.length);
      const name = containerPath.slice(prefix.length);
      const frontmatter = splitFrontmatter(
        await readFile(repositoryPath(repositoryRoot, declarationPath), 'utf8'),
      ).frontmatter;
      const problems = frontmatterProblems(frontmatter);
      if (!frontmatter.pathPresent) problems.push({ code: 'missing-path' });
      const claimedPath = frontmatter.path;
      const validPath = claimedPath !== undefined && isDomainPath(claimedPath);
      if (claimedPath !== undefined && !validPath)
        problems.push({ code: 'invalid-path', value: claimedPath });
      if (validPath && repositoryPathKind(files, claimedPath) !== 'directory') {
        problems.push({ code: 'path-not-directory', value: claimedPath });
      }

      const seen = new Set<string>();
      for (const file of frontmatter.files ?? []) {
        if (!isDomainPath(file, false)) {
          problems.push({ code: 'invalid-file-path', value: file });
        } else if (seen.has(file)) {
          problems.push({ code: 'duplicate-file', value: file });
        } else if (
          validPath &&
          repositoryPathKind(files, posix.join(claimedPath, file)) !== 'file'
        ) {
          problems.push({ code: 'file-not-file', value: file });
        }
        seen.add(file);
      }

      domains.push({
        kind: 'external',
        declarationPath,
        containerPath,
        externalRoot: root.path,
        name,
        identifier: containerPath,
        ...(claimedPath === undefined ? {} : { claimedPath }),
        filesPresent: frontmatter.filesPresent,
        ...(frontmatter.files === undefined ? {} : { files: frontmatter.files }),
        dependsOn: frontmatter.dependsOn ?? [],
        frontmatter,
        problems,
      });
    }
  }
  return domains;
}

function parentFor(domain: Domain, domains: readonly Domain[]): string | undefined {
  const path = domain.claimedPath;
  if (path === undefined || domain.identifier === undefined) return undefined;
  const wholeDirectoryByClaim = new Map<string, string>();
  for (const candidate of domains) {
    if (
      candidate.filesPresent ||
      candidate.identifier === undefined ||
      candidate.claimedPath === undefined ||
      wholeDirectoryByClaim.has(candidate.claimedPath)
    )
      continue;
    wholeDirectoryByClaim.set(candidate.claimedPath, candidate.identifier);
  }

  if (domain.filesPresent) {
    const claimant = wholeDirectoryByClaim.get(path);
    if (claimant !== undefined) return claimant;
  }
  let ancestor = path;
  while (ancestor !== '') {
    const slash = ancestor.lastIndexOf('/');
    ancestor = slash === -1 ? '' : ancestor.slice(0, slash);
    const claimant = wholeDirectoryByClaim.get(ancestor);
    if (claimant !== undefined && claimant !== domain.identifier) return claimant;
  }
  return undefined;
}

export function assignDomainParents(domains: readonly Domain[]): Domain[] {
  return domains.map((domain) => {
    const parentIdentifier = parentFor(domain, domains);
    return parentIdentifier === undefined ? domain : { ...domain, parentIdentifier };
  });
}

export async function discoverDomains(
  repositoryRoot: string,
  repositoryFiles: readonly string[],
): Promise<DiscoveryResult> {
  const normalizedFiles = [...new Set(repositoryFiles)].sort();
  const files = new Set(normalizedFiles);
  const { roots, workingLanguage, problems } = await projectConfiguration(repositoryRoot, files);
  const domains = [
    ...(await directoryDeclarations(repositoryRoot, files, roots)),
    ...(await externalDeclarations(repositoryRoot, files, roots)),
  ].sort((left, right) => left.declarationPath.localeCompare(right.declarationPath));

  return {
    repositoryRoot,
    externalRoots: roots,
    ...(workingLanguage === undefined ? {} : { workingLanguage }),
    domains: assignDomainParents(domains),
    problems,
  };
}

export async function extractDomainContent(
  repositoryRoot: string,
  repositoryFiles: readonly string[],
  domain: Domain,
): Promise<DomainContent> {
  const repositoryFileSet = new Set(repositoryFiles);
  const files: Partial<Record<ContentFileName, ExtractedContent>> = {};
  for (const fileName of contentFileNames) {
    const relativePath = `${domain.containerPath === '' ? '' : `${domain.containerPath}/`}${fileName}`;
    if (!repositoryFileSet.has(relativePath)) continue;
    files[fileName] = extractEntries(
      await readFile(repositoryPath(repositoryRoot, relativePath), 'utf8'),
      fileName,
      domain.identifier,
    );
  }
  return { domain, files };
}

export async function extractRepository(
  repositoryRoot: string,
  repositoryFiles: readonly string[],
): Promise<readonly DomainContent[]> {
  const discovery = await discoverDomains(repositoryRoot, repositoryFiles);
  return Promise.all(
    discovery.domains.map((domain) =>
      extractDomainContent(repositoryRoot, repositoryFiles, domain),
    ),
  );
}
