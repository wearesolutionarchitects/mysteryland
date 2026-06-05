import fs from 'node:fs';
import { loadEnv } from '../lib/core.mjs';

loadEnv();

const outputFile = 'title.md';
const wpBaseUrl = process.env.WP_BASE_URL || 'https://fanieng.com';
const baseUrl = `${wpBaseUrl}/wp-json/wp/v2/posts`;
const perPage = Number(process.env.WP_PER_PAGE || '100');
let page = 1;

const lines = ['# WordPress Beitragstitel', ''];

while (true) {
  const res = await fetch(`${baseUrl}?per_page=${perPage}&page=${page}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) break;

  for (const post of data) {
    lines.push(`- ${post?.title?.rendered || ''}`);
  }

  page += 1;
}

fs.writeFileSync(outputFile, `${lines.join('\n')}\n`, 'utf8');
console.log(`Saved titles in ${outputFile}`);
