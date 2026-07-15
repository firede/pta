import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import { argumentIds } from './src/data/arguments';
import { specificationIds } from './src/data/specifications';
import { getRootMessage, getStarlightTranslations, starlightI18n } from './src/lib/i18n';
import { rehypeStrongSubheading } from './src/lib/markdown/strong-subheading';

// https://astro.build/config
export default defineConfig({
  site: 'https://pta.pub',

  markdown: {
    rehypePlugins: [rehypeStrongSubheading],
  },

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
        PageTitle: './src/components/starlight/PageTitle.astro',
        Pagination: './src/components/starlight/Pagination.astro',
        Sidebar: './src/components/starlight/Sidebar.astro',
      },
      routeMiddleware: ['./src/lib/starlight/toc.ts'],
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/firede/pta' }],
      defaultLocale: starlightI18n.defaultLocale,
      locales: starlightI18n.locales,
      sidebar: [
        {
          label: getRootMessage('arguments'),
          translations: getStarlightTranslations('arguments'),
          items: [
            {
              slug: 'argument',
              label: getRootMessage('overview'),
              translations: getStarlightTranslations('overview'),
            },
            ...argumentIds,
            'argument/glossary',
          ],
        },
        {
          label: getRootMessage('specification'),
          translations: getStarlightTranslations('specification'),
          items: [
            {
              slug: 'specification',
              label: getRootMessage('overview'),
              translations: getStarlightTranslations('overview'),
            },
            ...specificationIds,
          ],
        },
        {
          label: getRootMessage('guide'),
          translations: getStarlightTranslations('guide'),
          slug: 'guide',
        },
      ],
    }),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
