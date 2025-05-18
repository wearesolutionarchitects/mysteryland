import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const concerts = defineCollection({
	// Load Markdown and MDX files in the `src/content/concerts/` directory.
	loader: glob({ base: './src/content/concerts', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: z.object({
	title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    location: z.string(), // z. B. "RuhrCongress Bochum"
    tags: z.array(z.string()).optional(),
    heroImage: z.string().optional(),
    featuredImage: z.string().optional(),
    gallery: z.array(
        z.object({
            file: z.string(),
            title: z.string().optional(),
            caption: z.string().optional()
        })
	).optional()
}),
});

export const collections = { concerts };
