import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: {
    cache: true,
  },
  fmt: {
    ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/.astro/**', '**/*.astro'],
    semi: true,
    singleQuote: true,
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/.astro/**', '**/*.astro'],
  },
  staged: {
    '*.{json,jsonc,css,md,mdx}': 'vp fmt --write',
    '*.{js,cjs,mjs,ts,tsx}': ['vp fmt --write', 'vp lint --fix'],
    'www/**/*.{astro,md,mdx,ts}': () => 'vp run www#check',
  },
});
