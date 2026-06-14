// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://pta.pub',

  integrations: [
    starlight({
      title: 'PTA',
      customCss: ['./src/styles/global.css', './src/styles/starlight.css'],
      logo: {
        src: './src/assets/pta-logo.svg',
      },
      locales: {
        root: {
          label: '简体中文',
          lang: 'zh-CN',
        },
      },
      sidebar: [
        { label: '标准', slug: 'specification' },
        { label: '指南', slug: 'guide' },
        { label: '立论', slug: 'rationale' },
      ],
    }),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
