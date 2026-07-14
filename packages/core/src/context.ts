import { ancestors, ownerFor } from './changes.ts';
import type { DiscoveryResult, Domain, DomainContent } from './domains.ts';
import { contentFileNames, type ExtractedEntry } from './entries.ts';
import type { DomainDependency } from './frontmatter.ts';

export type PathResolution = Readonly<{
  path: string;
  domainIdentifier?: string;
}>;

export type ContextDomain = Readonly<{
  domainIdentifier: string;
  containerPath: string;
  truthEntries: readonly ExtractedEntry[];
  glossaryEntries: readonly ExtractedEntry[];
  residueEntries: readonly ExtractedEntry[];
  pendingEntries: readonly ExtractedEntry[];
  dependsOn: readonly DomainDependency[];
  consumedFiles: readonly string[];
}>;

export type ContextAssembly = Readonly<{
  resolutions: readonly PathResolution[];
  domains: readonly ContextDomain[];
}>;

function domainDepth(identifier: string): number {
  return identifier === '' ? 0 : identifier.split('/').length;
}

export function assembleContext(
  discovery: DiscoveryResult,
  contents: readonly DomainContent[],
  paths: readonly string[],
): ContextAssembly {
  const domainsById = new Map(
    discovery.domains.flatMap((domain) =>
      domain.identifier === undefined ? [] : [[domain.identifier, domain] as const],
    ),
  );
  const contentById = new Map(
    contents.flatMap((content) =>
      content.domain.identifier === undefined
        ? []
        : [[content.domain.identifier, content] as const],
    ),
  );

  const resolutions = paths.map((path): PathResolution => {
    const owner = ownerFor(path, discovery.domains);
    return owner?.identifier === undefined
      ? { path }
      : { path, domainIdentifier: owner.identifier };
  });

  const involved = new Set<string>();
  for (const resolution of resolutions) {
    if (resolution.domainIdentifier === undefined) continue;
    for (const identifier of ancestors(resolution.domainIdentifier, domainsById)) {
      involved.add(identifier);
    }
  }

  const domains = [...involved]
    .sort((left, right) => domainDepth(left) - domainDepth(right) || left.localeCompare(right))
    .map((identifier): ContextDomain => {
      const domain = domainsById.get(identifier) as Domain;
      const files = contentById.get(identifier)?.files ?? {};
      const prefix = domain.containerPath === '' ? '' : `${domain.containerPath}/`;
      const consumedFiles = contentFileNames
        .filter((name) => files[name] !== undefined)
        .map((name) => `${prefix}${name}`);
      return {
        domainIdentifier: identifier,
        containerPath: domain.containerPath,
        truthEntries: files['TRUTH.md']?.entries ?? [],
        glossaryEntries: files['GLOSSARY.md']?.entries ?? [],
        residueEntries: files['RESIDUE.md']?.entries ?? [],
        pendingEntries: files['PENDING.md']?.entries ?? [],
        dependsOn: domain.dependsOn,
        consumedFiles,
      };
    });

  return { resolutions, domains };
}
