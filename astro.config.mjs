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
            head: [
                { tag: 'meta', attrs: { name: 'description', content: 'Konzertberichte, Bilder und Setlists' } },
                { tag: 'meta', attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1' } }
            ],
            title: "Mysteryland",
            social: [
                {icon: 'github', label:'github', href: 'https://github.com/wearesolutionarchitects'},
                {icon: 'discord', label:'discord', href: 'https://discord.gg/GEdQ3xg6t6'},
                {icon: 'linkedin', label: 'linkedin', href: 'https://www.linkedin.com/in/hfanieng/'},
                {icon: 'twitch', label: 'twitch', href: 'https://www.twitch.tv/mysteryland1909'},
                {icon: 'youtube', label: 'youtube', href: 'http://www.youtube.com/@mysterylanddotbiz'}
            ],
            logo: {
                src: './src/assets/logo.png'
            },
            sidebar: eventSidebar // <-- Bugfix: eventSidebar ist bereits ein Array, Spread ist nicht nötig
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