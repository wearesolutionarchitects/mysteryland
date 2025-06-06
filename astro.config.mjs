// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
// import eventSidebar from './src/generated/event-sidebar.json' assert { type: 'json' };
import path from 'path';
import astroExpressiveCode from 'astro-expressive-code';
import { ion } from "starlight-ion-theme";

// https://astro.build/config
export default defineConfig({
    site: 'https://mysteryland.biz',
    integrations: [
        astroExpressiveCode(),
        mdx(),
        sitemap(),
        starlight({
            plugins: [
                ion()             
            ],
            head: [
                { tag: 'meta', attrs: { name: 'description', content: 'Konzertberichte, Bilder und Setlists' } },
                { tag: 'meta', attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1' } }
            ],
            title: "Mysteryland",
            customCss: [
                // Relative path to your custom CSS file
                './src/styles/custom.css',
            ],
            social: [
                {icon: 'github', label:'github', href: 'https://github.com/wearesolutionarchitects'},
                {icon: 'discord', label:'discord', href: 'https://discord.gg/GEdQ3xg6t6'},
                {icon: 'linkedin', label: 'linkedin', href: 'https://www.linkedin.com/in/hfanieng/'},
                {icon: 'twitch', label: 'twitch', href: 'https://www.twitch.tv/mysteryland1909'},
                {icon: 'youtube', label: 'youtube', href: 'http://www.youtube.com/@mysterylanddotbiz'}
            ],
            logo: {
                src: './src/assets/mysteryland.png',
                replacesTitle: true,
            },
            sidebar: [
            {
                label: '2026',
                collapsed: true,
            // Autogenerate a group of links for the 'constellations' directory.
            autogenerate: { directory: 'events/2026' },
            },
            {
                label: '2025',
                collapsed: true,
            autogenerate: { directory: 'events/2025' },
            },
            {
                label: '2024',
                collapsed: false,
            autogenerate: { directory: 'events/2024' },
            },
            {
                label: '2023',
                collapsed: false,
            autogenerate: { directory: 'events/2023' },
            },
            {
                label: '2022',
                collapsed: false,
            autogenerate: { directory: 'events/2022' },
            }
    ],
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