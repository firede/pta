// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://pta.pub',
  integrations: [
    starlight({
      title: 'PTA',
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
      ],
    }),
  ],
});
