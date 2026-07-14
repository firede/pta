import { createHash } from 'node:crypto';

export function sha256(bytes: string | NodeJS.ArrayBufferView): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function normalizeEntryContent(content: string): string {
  return content.trim().normalize('NFC');
}

export function hashEntryContent(content: string): string {
  return sha256(Buffer.from(normalizeEntryContent(content), 'utf8'));
}

export function hashFileBytes(bytes: NodeJS.ArrayBufferView): string {
  return sha256(bytes);
}

export function isDomainPath(path: string, allowRoot = true): boolean {
  if (path === '') return allowRoot;
  if (path.startsWith('./') || path.startsWith('/') || path.endsWith('/')) {
    return false;
  }

  return path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

export type EntryContainer = Readonly<{
  domainIdentifier: string;
  fileKind: string;
}>;

export type EntryIdentifier = Readonly<{
  container: EntryContainer;
  contentHash: string;
}>;

export function entryIdentifier(
  domainIdentifier: string,
  fileKind: string,
  contentHash: string,
): EntryIdentifier {
  return {
    container: { domainIdentifier, fileKind },
    contentHash,
  };
}
