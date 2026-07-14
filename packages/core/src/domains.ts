import { readdir, readFile } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';

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
  domains: readonly Domain[];
}>;

export type DomainContent = Readonly<{
  domain: Domain;
  files: Readonly<Partial<Record<ContentFileName, ExtractedContent>>>;
}>;

function repositoryPath(root: string, path: string): string {
  return join(root, ...path.split('/'));
}

function relativePath(root: string, path: string): string {
  const value = relative(root, path);
  return sep === '/' ? value : value.split(sep).join('/');
}

async function repositoryPathKind(
  repositoryRoot: string,
  path: string,
): Promise<'directory' | 'file' | 'other' | 'missing'> {
  if (path === '') return 'directory';
  let directory = repositoryRoot;
  const segments = path.split('/');
  for (let index = 0; index < segments.length; index += 1) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'missing';
      throw error;
    }
    const segment = segments[index];
    const entry = entries.find((candidate) => candidate.name === segment);
    if (entry === undefined) return 'missing';
    const last = index === segments.length - 1;
    if (last) {
      if (entry.isDirectory()) return 'directory';
      if (entry.isFile()) return 'file';
      return 'other';
    }
    if (!entry.isDirectory()) return 'missing';
    directory = join(directory, entry.name);
  }
  return 'missing';
}

function parseTomlStringArray(source: string, key: string): string[] {
  const assignment = new RegExp(`(?:^|\\n)\\s*${key}\\s*=`, 'u').exec(source);
  if (assignment === null) return [];
  const start = source.indexOf('[', assignment.index + assignment[0].length);
  if (start === -1) return [];

  const values: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (character === undefined) break;
    if (escaped) {
      current += character;
      escaped = false;
    } else if (quote === '"' && character === '\\') {
      escaped = true;
    } else if (quote !== undefined && character === quote) {
      values.push(current);
      current = '';
      quote = undefined;
    } else if (quote !== undefined) {
      current += character;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ']') {
      break;
    }
  }
  return values;
}

async function externalRoots(repositoryRoot: string): Promise<ExternalRoot[]> {
  const configured: string[] = [];
  try {
    configured.push(
      ...parseTomlStringArray(
        await readFile(join(repositoryRoot, 'pta.toml'), 'utf8'),
        'externalRoots',
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const roots: ExternalRoot[] = [{ path: '.pta', source: 'default', usable: true }];
  for (const path of configured) {
    roots.push({ path, source: 'pta.toml', usable: isDomainPath(path, false) });
  }
  return roots;
}

function insideExternalRoot(path: string, roots: readonly ExternalRoot[]): boolean {
  return roots.some(
    (root) => root.usable && (path === root.path || path.startsWith(`${root.path}/`)),
  );
}

async function directoryDeclarations(
  repositoryRoot: string,
  roots: readonly ExternalRoot[],
): Promise<Domain[]> {
  const domains: Domain[] = [];

  async function visit(absoluteDirectory: string): Promise<void> {
    const directory = relativePath(repositoryRoot, absoluteDirectory);
    if (directory !== '' && insideExternalRoot(directory, roots)) return;

    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    const truth = entries.find((entry) => entry.isFile() && entry.name === 'TRUTH.md');
    if (truth !== undefined) {
      const declarationPath = directory === '' ? 'TRUTH.md' : `${directory}/TRUTH.md`;
      const frontmatter = splitFrontmatter(
        await readFile(join(absoluteDirectory, truth.name), 'utf8'),
      ).frontmatter;
      const problems: DomainProblem[] = [];
      if (frontmatter.present && !frontmatter.closed)
        problems.push({ code: 'unclosed-frontmatter' });
      if (frontmatter.pathPresent)
        problems.push({
          code: 'directory-declares-path',
          ...(frontmatter.path === undefined ? {} : { value: frontmatter.path }),
        });
      domains.push({
        kind: 'directory',
        declarationPath,
        containerPath: directory,
        identifier: directory,
        claimedPath: directory,
        filesPresent: false,
        dependsOn: frontmatter.dependsOn ?? [],
        frontmatter,
        problems,
      });
    }

    await Promise.all(
      entries
        .filter(
          (entry) => entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules',
        )
        .map((entry) => visit(join(absoluteDirectory, entry.name))),
    );
  }

  await visit(repositoryRoot);
  return domains;
}

async function externalDeclarations(
  repositoryRoot: string,
  roots: readonly ExternalRoot[],
): Promise<Domain[]> {
  const domains: Domain[] = [];
  const scannedRoots = new Set<string>();
  for (const root of roots) {
    if (!root.usable || scannedRoots.has(root.path)) continue;
    scannedRoots.add(root.path);
    if ((await repositoryPathKind(repositoryRoot, root.path)) !== 'directory') continue;
    const absoluteRoot = repositoryPath(repositoryRoot, root.path);
    let entries;
    try {
      entries = await readdir(absoluteRoot, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const containerPath = `${root.path}/${entry.name}`;
      const declarationPath = `${containerPath}/TRUTH.md`;
      if ((await repositoryPathKind(repositoryRoot, declarationPath)) !== 'file') continue;

      const frontmatter = splitFrontmatter(
        await readFile(repositoryPath(repositoryRoot, declarationPath), 'utf8'),
      ).frontmatter;
      const problems: DomainProblem[] = [];
      if (frontmatter.present && !frontmatter.closed)
        problems.push({ code: 'unclosed-frontmatter' });
      if (!frontmatter.pathPresent) problems.push({ code: 'missing-path' });
      const claimedPath = frontmatter.path;
      const validPath = claimedPath !== undefined && isDomainPath(claimedPath);
      if (claimedPath !== undefined && !validPath)
        problems.push({ code: 'invalid-path', value: claimedPath });
      if (validPath && (await repositoryPathKind(repositoryRoot, claimedPath)) !== 'directory') {
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
          (await repositoryPathKind(repositoryRoot, posix.join(claimedPath, file))) !== 'file'
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
        name: entry.name,
        ...(frontmatter.filesPresent
          ? { identifier: containerPath }
          : validPath
            ? { identifier: claimedPath }
            : {}),
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
  const wholeDirectoryIds = new Set(
    domains
      .filter((candidate) => !candidate.filesPresent && candidate.identifier !== undefined)
      .map((candidate) => candidate.identifier as string),
  );

  if (domain.filesPresent && wholeDirectoryIds.has(path)) return path;
  let ancestor = path;
  while (ancestor !== '') {
    const slash = ancestor.lastIndexOf('/');
    ancestor = slash === -1 ? '' : ancestor.slice(0, slash);
    if (wholeDirectoryIds.has(ancestor)) return ancestor;
  }
  return undefined;
}

export function assignDomainParents(domains: readonly Domain[]): Domain[] {
  return domains.map((domain) => {
    const parentIdentifier = parentFor(domain, domains);
    return parentIdentifier === undefined ? domain : { ...domain, parentIdentifier };
  });
}

export async function discoverDomains(repositoryRoot: string): Promise<DiscoveryResult> {
  const roots = await externalRoots(repositoryRoot);
  const domains = [
    ...(await directoryDeclarations(repositoryRoot, roots)),
    ...(await externalDeclarations(repositoryRoot, roots)),
  ].sort((left, right) => left.declarationPath.localeCompare(right.declarationPath));

  return { repositoryRoot, externalRoots: roots, domains: assignDomainParents(domains) };
}

export async function extractDomainContent(
  repositoryRoot: string,
  domain: Domain,
): Promise<DomainContent> {
  const files: Partial<Record<ContentFileName, ExtractedContent>> = {};
  for (const fileName of contentFileNames) {
    const path = repositoryPath(
      repositoryRoot,
      `${domain.containerPath === '' ? '' : `${domain.containerPath}/`}${fileName}`,
    );
    try {
      files[fileName] = extractEntries(await readFile(path, 'utf8'), fileName, domain.identifier);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return { domain, files };
}

export async function extractRepository(repositoryRoot: string): Promise<readonly DomainContent[]> {
  const discovery = await discoverDomains(repositoryRoot);
  return Promise.all(
    discovery.domains.map((domain) => extractDomainContent(repositoryRoot, domain)),
  );
}
