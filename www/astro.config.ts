import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import starlightLinksValidator from 'starlight-links-validator';

import { argumentIds } from './src/data/arguments';
import { getRootMessage, getStarlightTranslations, starlightI18n } from './src/lib/i18n';

// https://astro.build/config
export default defineConfig({
  site: 'https://pta.pub',

  integrations: [
    starlight({
      title: starlightI18n.title,
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
      defaultLocale: starlightI18n.defaultLocale,
      locales: starlightI18n.locales,
      sidebar: [
        {
          label: getRootMessage('specification'),
          translations: getStarlightTranslations('specification'),
          slug: 'specification',
        },
        {
          label: getRootMessage('guide'),
          translations: getStarlightTranslations('guide'),
          slug: 'guide',
        },
        {
          label: getRootMessage('arguments'),
          translations: getStarlightTranslations('arguments'),
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
