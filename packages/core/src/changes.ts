import { posix } from 'node:path';

import type { DiscoveryResult, Domain } from './domains.ts';
import type { ExtractedEntry } from './entries.ts';

export type ChangeType = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked';

export type ChangedPath = Readonly<{
  path: string;
  type: ChangeType;
}>;

export type PathOwnership = Readonly<{
  change: ChangedPath;
  domainIdentifier?: string;
}>;

export type TouchSurface = 'truth-records' | 'implementation' | 'both' | 'inbox-only';

export type DriftSuspicion = Readonly<{
  category: 'drift suspicion';
  status: 'suspicion';
  domainIdentifier: string;
  evidence: string;
}>;

export type PropagationReason = Readonly<{
  relation: 'dependsOn' | 'hierarchy';
  sourceDomainIdentifier: string;
  evidence: string;
}>;

export type PropagationCandidate = Readonly<{
  category: 'propagation';
  status: 'candidate';
  domainIdentifier: string;
  reasons: readonly PropagationReason[];
}>;

export type PendingEntryContext = Readonly<{
  domainIdentifier: string;
  entries: readonly ExtractedEntry[];
}>;

export type TouchedDomain = Readonly<{
  domainIdentifier: string;
  changes: readonly ChangedPath[];
  surface: TouchSurface;
  truthRecordChanges: readonly ChangedPath[];
  implementationChanges: readonly ChangedPath[];
  inboxChanges: readonly ChangedPath[];
  pendingContext: readonly PendingEntryContext[];
}>;

export type ChangeClassification = Readonly<{
  ownership: readonly PathOwnership[];
  touchedDomains: readonly TouchedDomain[];
  driftSuspicions: readonly DriftSuspicion[];
  propagationCandidates: readonly PropagationCandidate[];
}>;

export type PendingEntriesByDomain = Readonly<Record<string, readonly ExtractedEntry[]>>;

const truthRecordNames = new Set(['TRUTH.md', 'GLOSSARY.md', 'RESIDUE.md']);

function contentOwner(path: string, domains: readonly Domain[]): Domain | undefined {
  return domains.find((domain) => {
    if (domain.identifier === undefined) return false;
    const prefix = domain.containerPath === '' ? '' : `${domain.containerPath}/`;
    return (
      path === `${prefix}TRUTH.md` ||
      path === `${prefix}GLOSSARY.md` ||
      path === `${prefix}RESIDUE.md` ||
      path === `${prefix}PENDING.md`
    );
  });
}

function ownsFile(domain: Domain, path: string): boolean {
  return (
    domain.filesPresent &&
    domain.claimedPath !== undefined &&
    (domain.files ?? []).some((file) => posix.join(domain.claimedPath as string, file) === path)
  );
}

function coversDirectory(domain: Domain, path: string): boolean {
  if (domain.filesPresent || domain.claimedPath === undefined) return false;
  return (
    domain.claimedPath === '' ||
    path === domain.claimedPath ||
    path.startsWith(`${domain.claimedPath}/`)
  );
}

export function ownerFor(path: string, domains: readonly Domain[]): Domain | undefined {
  const recordOwner = contentOwner(path, domains);
  if (recordOwner !== undefined) return recordOwner;

  const fileOwner = domains.find(
    (domain) => domain.identifier !== undefined && ownsFile(domain, path),
  );
  if (fileOwner !== undefined) return fileOwner;

  return domains
    .filter((domain) => domain.identifier !== undefined && coversDirectory(domain, path))
    .toSorted(
      (left, right) => (right.claimedPath?.length ?? 0) - (left.claimedPath?.length ?? 0),
    )[0];
}

function recordKind(domain: Domain, path: string): 'truth' | 'pending' | 'implementation' {
  const prefix = domain.containerPath === '' ? '' : `${domain.containerPath}/`;
  const name = path.startsWith(prefix) ? path.slice(prefix.length) : undefined;
  if (name === 'PENDING.md') return 'pending';
  if (name !== undefined && truthRecordNames.has(name)) return 'truth';
  return 'implementation';
}

export function ancestors(identifier: string, domains: ReadonlyMap<string, Domain>): string[] {
  const result: string[] = [];
  let current: string | undefined = identifier;
  const seen = new Set<string>();
  while (current !== undefined && !seen.has(current)) {
    result.push(current);
    seen.add(current);
    current = domains.get(current)?.parentIdentifier;
  }
  return result;
}

export function classifyChanges(
  discovery: DiscoveryResult,
  changes: readonly ChangedPath[],
  pendingEntries: PendingEntriesByDomain = {},
): ChangeClassification {
  const domainsById = new Map(
    discovery.domains.flatMap((domain) =>
      domain.identifier === undefined ? [] : [[domain.identifier, domain] as const],
    ),
  );
  const ownership = changes.map((change): PathOwnership => {
    const owner = ownerFor(change.path, discovery.domains);
    return owner?.identifier === undefined
      ? { change }
      : { change, domainIdentifier: owner.identifier };
  });

  const changesByDomain = new Map<string, ChangedPath[]>();
  for (const item of ownership) {
    if (item.domainIdentifier === undefined) continue;
    const group = changesByDomain.get(item.domainIdentifier);
    if (group === undefined) changesByDomain.set(item.domainIdentifier, [item.change]);
    else group.push(item.change);
  }

  const touchedDomains = [...changesByDomain]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([domainIdentifier, domainChanges]): TouchedDomain => {
      const domain = domainsById.get(domainIdentifier) as Domain;
      const truthRecordChanges: ChangedPath[] = [];
      const implementationChanges: ChangedPath[] = [];
      const inboxChanges: ChangedPath[] = [];
      for (const change of domainChanges) {
        const kind = recordKind(domain, change.path);
        if (kind === 'truth') truthRecordChanges.push(change);
        else if (kind === 'pending') inboxChanges.push(change);
        else implementationChanges.push(change);
      }
      const surface: TouchSurface =
        truthRecordChanges.length > 0 && implementationChanges.length > 0
          ? 'both'
          : truthRecordChanges.length > 0
            ? 'truth-records'
            : implementationChanges.length > 0
              ? 'implementation'
              : 'inbox-only';
      const pendingContext = ancestors(domainIdentifier, domainsById).flatMap(
        (identifier): PendingEntryContext[] => {
          const entries = pendingEntries[identifier] ?? [];
          return entries.length === 0 ? [] : [{ domainIdentifier: identifier, entries }];
        },
      );
      return {
        domainIdentifier,
        changes: domainChanges,
        surface,
        truthRecordChanges,
        implementationChanges,
        inboxChanges,
        pendingContext,
      };
    });

  const driftSuspicions = touchedDomains.flatMap((domain): DriftSuspicion[] => {
    if (domain.surface === 'implementation') {
      return [
        {
          category: 'drift suspicion',
          status: 'suspicion',
          domainIdentifier: domain.domainIdentifier,
          evidence: `实现被触及（${domain.implementationChanges.map((change) => change.path).join('、')}），真相记录未触及。`,
        },
      ];
    }
    if (domain.surface === 'truth-records') {
      return [
        {
          category: 'drift suspicion',
          status: 'suspicion',
          domainIdentifier: domain.domainIdentifier,
          evidence: `真相记录被触及（${domain.truthRecordChanges.map((change) => change.path).join('、')}），实现未触及。`,
        },
      ];
    }
    return [];
  });

  const reasonsByCandidate = new Map<string, PropagationReason[]>();
  const addReason = (candidate: string, reason: PropagationReason): void => {
    const reasons = reasonsByCandidate.get(candidate);
    if (reasons === undefined) reasonsByCandidate.set(candidate, [reason]);
    else reasons.push(reason);
  };
  for (const source of touchedDomains.filter((domain) => domain.truthRecordChanges.length > 0)) {
    const changedRecords = source.truthRecordChanges.map((change) => change.path).join('、');
    for (const domain of discovery.domains) {
      if (domain.identifier === undefined || domain.identifier === source.domainIdentifier)
        continue;
      for (const dependency of domain.dependsOn) {
        if (dependency.path === source.domainIdentifier) {
          addReason(domain.identifier, {
            relation: 'dependsOn',
            sourceDomainIdentifier: source.domainIdentifier,
            evidence: `${source.domainIdentifier || '.'} 的真相记录被触及（${changedRecords}）；${domain.identifier || '.'} 的 dependsOn 声明依赖该领域：${dependency.reason}`,
          });
        }
      }
      let parent = domain.parentIdentifier;
      while (parent !== undefined) {
        if (parent === source.domainIdentifier) {
          addReason(domain.identifier, {
            relation: 'hierarchy',
            sourceDomainIdentifier: source.domainIdentifier,
            evidence: `${source.domainIdentifier || '.'} 的真相记录被触及（${changedRecords}）；${domain.identifier || '.'} 是该领域的层级下级。`,
          });
          break;
        }
        parent = domainsById.get(parent)?.parentIdentifier;
      }
    }
  }

  const propagationCandidates = [...reasonsByCandidate]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([domainIdentifier, reasons]): PropagationCandidate => ({
        category: 'propagation',
        status: 'candidate',
        domainIdentifier,
        reasons,
      }),
    );

  return { ownership, touchedDomains, driftSuspicions, propagationCandidates };
}
