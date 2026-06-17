// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import starlightLinksValidator from 'starlight-links-validator';

// https://astro.build/config
export default defineConfig({
  site: 'https://pta.pub',

  integrations: [
    starlight({
      title: {
        'zh-CN': '项目真相架构',
        en: 'Project Truth Architecture',
      },
      customCss: ['./src/styles/global.css'],
      logo: {
        src: './src/assets/pta-logo.svg',
        replacesTitle: true,
      },
      components: {
        Pagination: './src/components/starlight/Pagination.astro',
      },
      defaultLocale: 'root',
      locales: {
        root: {
          label: '简体中文',
          lang: 'zh-CN',
        },
      },
      sidebar: [
        { label: '规范', slug: 'specification' },
        { label: '指南', slug: 'guide' },
        { label: '立论', items: ['argument/project-truth-in-codebase'] },
      ],
      plugins: [starlightLinksValidator()],
    }),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
