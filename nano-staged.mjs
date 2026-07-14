export default {
  '*.{json,css,js,md,mdx,mjs,toml,ts,tsx,yaml}': 'oxfmt --write',
  '*.{js,mjs,ts,tsx}': 'oxlint --fix',
  // 函数形式避免 nano-staged 自动追加文件参数。
  'www/**/*.{astro,md,mdx,mjs,ts,tsx}': () => 'pnpm --filter www check',
};
