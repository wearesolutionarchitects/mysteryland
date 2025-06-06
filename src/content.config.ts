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

export const collections = { docs: docsCollection };