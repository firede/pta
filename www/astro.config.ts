import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import starlightLinksValidator from 'starlight-links-validator';

import { argumentIds } from './src/data/arguments';

// https://astro.build/config
export default defineConfig({
  site: 'https://pta.pub',

  integrations: [
    starlight({
      title: {
        'zh-Hans': '项目真相架构',
        'zh-Hant': '項目真相架構',
        en: 'Project Truth Architecture',
      },
      customCss: ['./src/styles/global.css'],
      logo: {
        src: './src/assets/pta-logo.svg',
        replacesTitle: true,
      },
      components: {
        MarkdownContent: './src/components/starlight/MarkdownContent.astro',
        Pagination: './src/components/starlight/Pagination.astro',
      },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/firede/pta' }],
      defaultLocale: 'root',
      locales: {
        root: { label: '简体中文', lang: 'zh-Hans' },
        'zh-hant': { label: '繁體中文', lang: 'zh-Hant' },
        en: { label: 'English' },
      },
      sidebar: [
        {
          label: '规范',
          translations: { 'zh-Hant': '規範', en: 'Specification' },
          slug: 'specification',
        },
        { label: '指南', translations: { 'zh-Hant': '指南', en: 'Guide' }, slug: 'guide' },
        {
          label: '立论',
          translations: { 'zh-Hant': '立論', en: 'Arguments' },
          items: [...argumentIds],
        },
      ],
      plugins: [starlightLinksValidator()],
    }),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
