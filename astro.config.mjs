// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import path from 'path';

// https://astro.build/config
export default defineConfig({
	site: 'https://mysteryland.biz',
	integrations: [mdx(), sitemap()],
	vite: {
		resolve: {
			alias: {
				'@': path.resolve('./src'),
				'@components': path.resolve('./src/components'),
			},
		},
	},
});
