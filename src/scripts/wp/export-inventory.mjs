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
].join(',');

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`WordPress request failed: ${response.status} ${response.statusText}`);
  }

  return {
    json: await response.json(),
    total: Number(response.headers.get('x-wp-total') || 0),
    totalPages: Number(response.headers.get('x-wp-totalpages') || 0),
  };
}

async function fetchPage(page) {
  const url = new URL('/wp-json/wp/v2/posts', wpBaseUrl);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));
  url.searchParams.set('_fields', fields);

  const result = await fetchJson(url);
  return { posts: result.json, total: result.total, totalPages: result.totalPages };
}

async function fetchByIds(route, ids, fieldsValue) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const entries = [];

  for (let index = 0; index < uniqueIds.length; index += 100) {
    const chunk = uniqueIds.slice(index, index + 100);
    const url = new URL(`/wp-json/wp/v2/${route}`, wpBaseUrl);
    url.searchParams.set('per_page', String(chunk.length));
    url.searchParams.set('include', chunk.join(','));
    url.searchParams.set('_fields', fieldsValue);
    const result = await fetchJson(url);
    entries.push(...result.json);
  }

  return Object.fromEntries(entries.map((entry) => [String(entry.id), entry]));
}

const firstPage = await fetchPage(1);
const posts = [...firstPage.posts];

for (let page = 2; page <= firstPage.totalPages; page += 1) {
  const result = await fetchPage(page);
  posts.push(...result.posts);
}

const tagMap = await fetchByIds('tags', posts.flatMap((post) => post.tags || []), 'id,name,slug');
const categoryMap = await fetchByIds('categories', posts.flatMap((post) => post.categories || []), 'id,name,slug');
const mediaMap = await fetchByIds(
  'media',
  posts.map((post) => post.featured_media),
  'id,date,slug,source_url,alt_text,caption,media_details'
);

const inventory = {
  source: wpBaseUrl,
  generatedAt: new Date().toISOString(),
  total: firstPage.total,
  totalPages: firstPage.totalPages,
  count: posts.length,
  taxonomies: {
    tags: tagMap,
    categories: categoryMap,
  },
  media: mediaMap,
  posts,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'posts.json'), `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');

console.log(`Exported ${posts.length} WordPress posts to ${path.join(outDir, 'posts.json')}`);
