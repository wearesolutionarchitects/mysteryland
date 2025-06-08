// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

const docsCollection = defineCollection({
    schema: docsSchema({
        extend: z.object({
            // Add a new fields to the schema.
            title: z.string(),
            tags: z.array(z.string()).optional(),
            city: z.string().optional(),
            venue: z.string().optional(),
            conuntry: z.string().optional(),
            description: z.string().optional(),
            price: z.number().optional(),
            pubDate: z.date().optional(),
            updatedDate: z.date().optional(),
        }),
    }),
});

const galleryCollection = defineCollection({
  type: 'content',
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