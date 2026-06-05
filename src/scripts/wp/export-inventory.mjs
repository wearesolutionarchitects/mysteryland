import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from '../lib/core.mjs';

loadEnv();

const wpBaseUrl = process.env.WP_BASE_URL || 'https://fanieng.com';
const outDir = process.env.WP_INVENTORY_DIR || './data/wp';
const perPage = Number(process.env.WP_PER_PAGE || 100);

const fields = [
  'id',
  'date',
  'modified',
  'slug',
  'link',
  'title',
  'excerpt',
  'content',
  'categories',
  'tags',
  'featured_media',
  '_embedded',
].join(',');

async function fetchPage(page) {
  const url = new URL('/wp-json/wp/v2/posts', wpBaseUrl);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));
  url.searchParams.set('_embed', 'wp:term,wp:featuredmedia');
  url.searchParams.set('_fields', fields);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`WordPress request failed: ${response.status} ${response.statusText}`);
  }

  return {
    posts: await response.json(),
    total: Number(response.headers.get('x-wp-total') || 0),
    totalPages: Number(response.headers.get('x-wp-totalpages') || 0),
  };
}

const firstPage = await fetchPage(1);
const posts = [...firstPage.posts];

for (let page = 2; page <= firstPage.totalPages; page += 1) {
  const result = await fetchPage(page);
  posts.push(...result.posts);
}

const inventory = {
  source: wpBaseUrl,
  generatedAt: new Date().toISOString(),
  total: firstPage.total,
  totalPages: firstPage.totalPages,
  count: posts.length,
  posts,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'posts.json'), `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');

console.log(`Exported ${posts.length} WordPress posts to ${path.join(outDir, 'posts.json')}`);
