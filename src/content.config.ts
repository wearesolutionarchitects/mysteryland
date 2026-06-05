// src/content.config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import * as z from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const docsCollection = defineCollection({
  loader: docsLoader(),
  schema: docsSchema({
    extend: z.object({
      tags: z.array(z.string()).optional(),
      city: z.string().optional(),
      venue: z.string().optional(),
      country: z.string().optional(),
      tour: z.string().optional(),
      artist: z.array(z.string()).optional(),
      asin: z.union([z.string(), z.array(z.string())]).optional(),
      price: z.coerce.number().optional(),
      pubDate: z.coerce.date().optional(),
      updatedDate: z.coerce.date().optional(),
    }),
  }),
});

const galleryCollection = defineCollection({
  loader: glob({ base: './src/content/gallery', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    datetime: z.string(),
    filename: z.string(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    countryCode: z.string().optional(),
    artist: z.string().optional(),
    event: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
});

export const collections = {
  docs: docsCollection,
  gallery: galleryCollection
};
