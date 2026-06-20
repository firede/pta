import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { extname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFrontmatter } from 'astro/markdown';

export const docsDir = fileURLToPath(new URL('../../src/content/docs/', import.meta.url));
export const targetLocales = ['zh-hant', 'en'];
export const markdownExtensions = new Set(['.md', '.mdx']);

const docsDirResolved = resolve(docsDir);

export async function computeFileHash(filePath) {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

export async function resolveInputPath(inputPath) {
  if (isAbsolute(inputPath)) return inputPath;

  const baseDir = process.env.INIT_CWD ?? process.cwd();
  return resolve(baseDir, inputPath);
}

export async function readMarkdownFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  const parsed = parseFrontmatter(content, { frontmatter: 'empty-with-spaces' });
  return {
    content,
    frontmatter: parsed.frontmatter ?? {},
  };
}

export async function listMarkdownFiles(dir = docsDir) {
  const files = [];
  await collectMarkdownFiles(dir, files);
  return files.sort();
}

async function collectMarkdownFiles(dir, files) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await collectMarkdownFiles(entryPath, files);
      continue;
    }

    if (entry.isFile() && markdownExtensions.has(extname(entry.name))) {
      files.push(entryPath);
    }
  }
}

export function toDocsRelativePath(filePath) {
  return relative(docsDirResolved, resolve(filePath)).split(sep).join('/');
}

export function isLocaleRelativePath(relativePath) {
  const [firstSegment] = relativePath.split('/');
  return targetLocales.includes(firstSegment);
}

export function getTranslationPath(sourceRelativePath, locale) {
  return join(docsDir, locale, sourceRelativePath);
}

export function getAlternateExtensionPath(sourceRelativePath, locale) {
  const source = parse(sourceRelativePath);
  const alternateExt = source.ext === '.md' ? '.mdx' : '.md';
  return join(docsDir, locale, source.dir, `${source.name}${alternateExt}`);
}

export function isDraft(frontmatter) {
  return frontmatter.draft === true;
}

export function getSourceHash(frontmatter) {
  return typeof frontmatter.sourceHash === 'string' ? frontmatter.sourceHash.trim() : undefined;
}
