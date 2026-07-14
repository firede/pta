import type { DomainContent } from './domains.ts';
import type { ExtractedEntry } from './entries.ts';
import type { CheckSignal } from './lint.ts';

export type InspectionMemberKind = 'marked-truth' | 'residue';

export type InspectionMember = Readonly<{
  domainIdentifier: string;
  filePath: string;
  kind: InspectionMemberKind;
  entry: ExtractedEntry;
  due?: string;
}>;

export type InspectionReport = Readonly<{
  members: readonly InspectionMember[];
  expiries: readonly CheckSignal[];
}>;

const datePattern = /\b(\d{4})-(\d{2})(?:-(\d{2}))?\b/gu;

function extractDue(content: string): string | undefined {
  let due: string | undefined;
  for (const match of content.matchAll(datePattern)) {
    const month = Number(match[2]);
    if (month < 1 || month > 12) continue;
    if (match[3] !== undefined) {
      const day = Number(match[3]);
      if (day < 1 || day > 31) continue;
    }
    const value = match[0];
    if (due === undefined || value > due) due = value;
  }
  return due;
}

export function inspectContents(
  contents: readonly DomainContent[],
  today: string,
): InspectionReport {
  const members: InspectionMember[] = [];
  for (const { domain, files } of contents) {
    const identifier = domain.identifier;
    if (identifier === undefined) continue;
    const prefix = domain.containerPath === '' ? '' : `${domain.containerPath}/`;
    for (const entry of files['TRUTH.md']?.entries ?? []) {
      if (entry.marker !== '?') continue;
      const due = extractDue(entry.content);
      members.push({
        domainIdentifier: identifier,
        filePath: `${prefix}TRUTH.md`,
        kind: 'marked-truth',
        entry,
        ...(due === undefined ? {} : { due }),
      });
    }
    for (const entry of files['RESIDUE.md']?.entries ?? []) {
      members.push({
        domainIdentifier: identifier,
        filePath: `${prefix}RESIDUE.md`,
        kind: 'residue',
        entry,
      });
    }
  }

  const expiries = members.flatMap((member): CheckSignal[] => {
    if (member.kind !== 'marked-truth' || member.due === undefined) return [];
    const dueStart = member.due.length === 7 ? `${member.due}-01` : member.due;
    if (dueStart > today) return [];
    return [
      {
        category: 'expiry',
        status: 'machine-decidable',
        anchor: {
          kind: 'entry',
          domainIdentifier: member.domainIdentifier,
          fileKind: 'truth',
          contentHash: member.entry.contentHash,
        },
        evidence: {
          message: `复查线索 ${member.due} 已到期。`,
          file: member.filePath,
          line: member.entry.line,
        },
        source: 'structural-check',
      },
    ];
  });

  return { members, expiries };
}
