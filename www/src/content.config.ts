import { defineCollection } from 'astro:content';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { z } from 'astro/zod';

const argumentId = z.string().regex(/^argument\/[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        dependsOn: z.array(argumentId).default([]),
      }),
    }),
  }),
  i18n: defineCollection({
    loader: i18nLoader(),
    schema: i18nSchema({
      extend: z.object({
        'argumentDependencies.title': z.string(),
        'sectionNav.accessibleLabel': z.string(),
      }),
    }),
  }),
};
