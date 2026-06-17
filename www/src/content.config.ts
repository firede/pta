import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
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
};
