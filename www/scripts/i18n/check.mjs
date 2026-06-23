#!/usr/bin/env node
import { access } from 'node:fs/promises';

import {
  computeFileHash,
  getAlternateExtensionPath,
  getAlternateExtensionRelativePath,
  getLocaleRelativePathInfo,
  getSourceHash,
  getTranslationPath,
  isDraft,
  isLocaleRelativePath,
  listMarkdownFiles,
  readMarkdownFile,
  targetLocales,
  toDocsRelativePath,
} from './lib.mjs';

const issues = [];
const markdownFiles = await listMarkdownFiles();
const sourceFiles = getSourceFiles(markdownFiles);
const translationFiles = getTranslationFiles(markdownFiles);
const sourceRelativePaths = new Set(
  sourceFiles.map((sourcePath) => toDocsRelativePath(sourcePath)),
);

for (const sourcePath of sourceFiles) {
  const sourceRelativePath = toDocsRelativePath(sourcePath);
  const source = await readMarkdownFile(sourcePath);

  if (isDraft(source.frontmatter)) continue;

  const expectedHash = await computeFileHash(sourcePath);

  for (const locale of targetLocales) {
    await checkTranslation({
      expectedHash,
      locale,
      sourceRelativePath,
    });
  }
}

checkOrphanTranslations({ sourceRelativePaths, translationFiles });

if (issues.length > 0) {
  printIssues(issues);
  process.exit(1);
}

console.log(`i18n check passed for ${sourceFiles.length} source document(s).`);

function getSourceFiles(files) {
  return files.filter((filePath) => !isLocaleRelativePath(toDocsRelativePath(filePath)));
}

function getTranslationFiles(files) {
  return files.filter((filePath) => isLocaleRelativePath(toDocsRelativePath(filePath)));
}

async function checkTranslation({ expectedHash, locale, sourceRelativePath }) {
  const translationPath = getTranslationPath(sourceRelativePath, locale);
  const alternatePath = getAlternateExtensionPath(sourceRelativePath, locale);
  const translationExists = await exists(translationPath);
  const alternateExists = await exists(alternatePath);

  if (alternateExists) {
    issues.push({
      type: 'extension-mismatch',
      locale,
      source: sourceRelativePath,
      expected: toDocsRelativePath(translationPath),
      actual: toDocsRelativePath(alternatePath),
    });
  }

  if (!translationExists) {
    if (!alternateExists) {
      issues.push({
        type: 'missing',
        locale,
        source: sourceRelativePath,
        expected: toDocsRelativePath(translationPath),
      });
    }
    return;
  }

  let translation;
  try {
    translation = await readMarkdownFile(translationPath);
  } catch (error) {
    issues.push({
      type: 'invalid',
      locale,
      source: sourceRelativePath,
      file: toDocsRelativePath(translationPath),
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const sourceHash = getSourceHash(translation.frontmatter);

  if (!sourceHash) {
    issues.push({
      type: 'invalid',
      locale,
      source: sourceRelativePath,
      file: toDocsRelativePath(translationPath),
      message: 'missing sourceHash frontmatter',
    });
    return;
  }

  if (sourceHash !== expectedHash) {
    issues.push({
      type: 'stale',
      locale,
      source: sourceRelativePath,
      file: toDocsRelativePath(translationPath),
      expectedHash,
      actualHash: sourceHash,
    });
  }
}

function checkOrphanTranslations({ sourceRelativePaths, translationFiles }) {
  for (const translationPath of translationFiles) {
    const translationRelativePath = toDocsRelativePath(translationPath);
    const localePathInfo = getLocaleRelativePathInfo(translationRelativePath);

    if (!localePathInfo) continue;

    const alternateSourceRelativePath = getAlternateExtensionRelativePath(
      localePathInfo.sourceRelativePath,
    );

    if (
      sourceRelativePaths.has(localePathInfo.sourceRelativePath) ||
      sourceRelativePaths.has(alternateSourceRelativePath)
    ) {
      continue;
    }

    issues.push({
      type: 'orphan',
      locale: localePathInfo.locale,
      file: translationRelativePath,
      source: localePathInfo.sourceRelativePath,
    });
  }
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function printIssues(items) {
  console.error(`i18n check failed with ${items.length} issue(s).`);

  for (const type of ['missing', 'extension-mismatch', 'invalid', 'stale', 'orphan']) {
    const typedIssues = items.filter((issue) => issue.type === type);
    if (typedIssues.length === 0) continue;

    console.error(`\n${type}:`);

    for (const issue of typedIssues) {
      if (issue.type === 'missing') {
        console.error(`  - ${issue.expected} (source: ${issue.source})`);
      } else if (issue.type === 'extension-mismatch') {
        console.error(`  - ${issue.actual} should be ${issue.expected} (source: ${issue.source})`);
      } else if (issue.type === 'invalid') {
        console.error(`  - ${issue.file}: ${issue.message} (source: ${issue.source})`);
      } else if (issue.type === 'stale') {
        console.error(`  - ${issue.file} (source: ${issue.source})`);
        console.error(`    expected: ${issue.expectedHash}`);
        console.error(`    actual:   ${issue.actualHash}`);
      } else if (issue.type === 'orphan') {
        console.error(`  - ${issue.file} (missing source: ${issue.source})`);
      }
    }
  }
}
