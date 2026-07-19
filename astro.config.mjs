// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import icon from 'astro-icon';
import path from 'path';

// https://astro.build/config
export default defineConfig({
    site: 'https://mysteryland.biz',
    image: {
        domains: ['m.media-amazon.com'],
    },
    integrations: [
        preact(),
        sitemap({
            filter: (page) => !new URL(page).pathname.startsWith('/artists/'),
        }),
        starlight({ 
            title: "Mysteryland",
            description: "Persönliches Konzertarchiv mit Tickets, Fotos, Setlists, Alben und Erinnerungen zu Konzerten, Festivals und Live-Musik seit 1979.",
            favicon: '/favicon.png',
            locales: {
                root: {
                    label: 'Deutsch',
                    lang: 'de',
                    },
            },         
            
            head: [
                { tag: 'meta', attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1' } },
                { tag: 'link', attrs: { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' } },
                { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
                { tag: 'script', attrs: { async: true, defer: true, 'data-website-id': '76cfab5c-bdba-4584-a2f7-1c030b088c66', src: 'https://analytics.mysteryland.biz/script.js' } },
            ],
            customCss: [
                './src/styles/token.css',
                './src/styles/custom.css',
            ],
            components: {
                Head: './src/components/Head.astro',
                PageTitle: './src/components/PageTitle.astro',
                SiteTitle: './src/components/SiteTitle.astro',
                SocialIcons: './src/components/SocialIcons.astro',
                ThemeProvider: './src/components/ThemeProvider.astro',
                TableOfContents: './src/components/TableOfContents.astro',
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
            {
                label: '2009',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2009' } },
                ],
            },
            {
                label: '2008',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2008' } },
                ],
            },
            {
                label: '2007',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2007' } },
                ],
            },
            {
                label: '2006',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2006' } },
                ],
            },
            {
                label: '2005',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2005' } },
                ],
            },
        {
                label: '2004',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2004' } },
                ],
            },
            {
                label: '2003',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2003' } },
                ],
            },
            {
                label: '2002',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2002' } },
                ],
            },
        {
                label: '2001',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2001' } },
                ],
            },
        {
                label: '2000',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/2000' } },
                ],
            },
        {
                label: '1999',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1999' } },
                ],
            },
        {
                label: '1998',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1998' } },
                ],
            },
            {
                label: '1997',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1997' } },
                ],
            },
            {
                label: '1996',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1996' } },
                ],
            },
            {
                label: '1995',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1995' } },
                ],
            },
            {
                label: '1994',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1994' } },
                ],
            },
            {
                label: '1993',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1993' } },
                ],
            },
            {
                label: '1992',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1992' } },
                ],
            },
        {
                label: '1990',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1990' } },
                ],
            },
            {
                label: '1989',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1989' } },
                ],
            },
            {
                label: '1988',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1988' } },
                ],
            },
            {
                label: '1987',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1987' } },
                ],
            },
        {
                label: '1986',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1986' } },
                ],
            },
        {
                label: '1979',
                collapsed: true,
                items: [
                    { autogenerate: { directory: 'events/1979' } },
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
