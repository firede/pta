#!/usr/bin/env node
import { computeFileHash, resolveInputPath } from './lib.mjs';

const [filePath] = process.argv.slice(2);

if (!filePath) {
  console.error('Usage: pnpm --filter www i18n:hash <file>');
  process.exit(1);
}

try {
  console.log(await computeFileHash(await resolveInputPath(filePath)));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
