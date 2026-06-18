// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import icon from 'astro-icon';
import path from 'path';
import remarkToc from 'remark-toc';

// https://astro.build/config
export default defineConfig({
    site: 'https://mysteryland.biz',
    image: {
        domains: ['m.media-amazon.com'],
    },
    markdown: {
        processor: unified({
            remarkPlugins: [remarkToc],
        }),
    },
    integrations: [
        starlight({ 
            title: "Mysteryland",
            favicon: '/favicon.png',
            locales: {
                root: {
                    label: 'Deutsch',
                    lang: 'de',
                    },
            },         
            
            head: [
                { tag: 'meta', attrs: { name: 'description', content: 'Konzertberichte, Bilder und Setlists' } },
                { tag: 'meta', attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1' } },
                { tag: 'link', attrs: { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' } },
                { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
                { tag: 'script', attrs: { async: true, defer: true, 'data-website-id': '76cfab5c-bdba-4584-a2f7-1c030b088c66', src: 'https://analytics.mysteryland.biz/script.js' } },
            ],
            customCss: [
                // Relative path to your custom CSS file
                './src/styles/custom.css',
            ],
            components: {
                Head: './src/components/Head.astro',
                ThemeProvider: './src/components/ThemeProvider.astro',
            },
            social: [
                {icon: 'github', label:'github', href: 'https://github.com/wearesolutionarchitects'},
                {icon: 'discord', label:'discord', href: 'https://discord.gg/GEdQ3xg6t6'},
                {icon: 'linkedin', label: 'linkedin', href: 'https://www.linkedin.com/in/hfanieng/'},
                {icon: 'twitch', label: 'twitch', href: 'https://www.twitch.tv/mysteryland1909'},
                {icon: 'youtube', label: 'youtube', href: 'http://www.youtube.com/@mysterylanddotbiz'},
                {icon: 'instagram', label: 'instagram', href: 'https://www.instagram.com/heikofanieng/'},
                {icon: 'facebook', label: 'facebook', href: 'https://www.facebook.com/Mysteryland1909'},
            ],
            logo: {
                src: './src/assets/mysteryland.png',
                replacesTitle: true,
            },
            sidebar: [
            {
                label: '2027',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2027' } },
                ],
            },
            {
                label: '2026',
                collapsed: false,
                items: [
                    { autogenerate: { directory: 'events/2026' } },
                ],
            },
            {
                label: '2025',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2025' } },
                ],
            },
            {
                label: '2024',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2024' } },
                ],
            },
            {
                label: '2023',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2023' } },
                ],
            },
            {
                label: '2022',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2022' } },
                ],
            },
            {
                label: '2021',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2021' } },
                ],
            },
            {
                label: '2019',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2019' } },
                ],
            },
            {
                label: '2018',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2018' } },
                ],
            },
            {
                label: '2017',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2017' } },
                ],
            },
            {
                label: '2015',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2015' } },
                ],
            },
            {
                label: '2014',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2014' } },
                ],
            },
            {
                label: '2013',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2013' } },
                ],
            },
            {
                label: '2012',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2012' } },
                ],
            },
        {
                label: '2011',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2011' } },
                ],
            },
        {
                label: '2010',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2010' } },
                ],
            },
    ],
        }),
        icon({
            include: {
                lucide: ['*'],
            },
        }),
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
