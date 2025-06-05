// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import eventSidebar from './src/generated/event-sidebar.json' assert { type: 'json' };
import path from 'path';
import astroExpressiveCode from 'astro-expressive-code';

// https://astro.build/config
export default defineConfig({
	site: 'https://mysteryland.biz',
	integrations: [
		astroExpressiveCode(),
		mdx(),
		sitemap(),
		starlight({
			title: "Mysteryland",
			sidebar: [
				...eventSidebar
			]
		})
	],
	vite: {
		resolve: {
			alias: {
				'@': path.resolve('./src'),
				'@components': path.resolve('./src/components'),
			},
		},
	},
});
