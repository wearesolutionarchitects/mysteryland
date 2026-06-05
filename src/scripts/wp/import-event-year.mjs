import { loadEnv, runCapture, runOrThrow, stripHtml } from '../lib/core.mjs';

loadEnv();

const year = process.argv[2];
const repo = process.env.REPO || 'wearesolutionarchitects/mysteryland';
const categoryId = process.env.WP_CATEGORY_ID || '1';
const perPage = process.env.WP_PER_PAGE || '100';
const wpBaseUrl = process.env.WP_BASE_URL || 'https://fanieng.com';

if (!year || !/^\d{4}$/.test(year)) {
  console.error('Usage: npm run script:wp:import-year -- <YYYY>');
  process.exit(1);
}

let page = 1;
while (true) {
  console.log(`Loading WP posts page ${page}`);
  const res = await fetch(`${wpBaseUrl}/wp-json/wp/v2/posts?categories=${categoryId}&per_page=${perPage}&page=${page}`);
  const posts = await res.json();
  const filtered = posts.filter((p) => (p.date || '').startsWith(year));

  console.log(`Found ${filtered.length} matching posts on page ${page}`);
  if (!filtered.length) break;

  for (const post of filtered) {
    const date = (post.date || '').split('T')[0];
    const title = post?.title?.rendered || '';
    const link = post?.link || '';
    const postSlug = post?.slug || '';
    const excerpt = stripHtml(post?.excerpt?.rendered || '').slice(0, 250);
    const galleryPath = `src/content/gallery/${year}/${date.slice(5)}`;

    const existingRaw = runCapture('gh', ['issue', 'list', '--repo', repo, '--search', postSlug, '--json', 'title']);
    const existing = JSON.parse(existingRaw);
    if (existing.some((item) => String(item.title || '').includes(postSlug))) {
      console.log(`Skip existing slug ${postSlug}`);
      continue;
    }

    const body = `**Auszug:** ${excerpt}\n\n🔗 [Original-Beitrag ansehen](${link})\n\n📅 Veröffentlicht am: ${date}  \n🖼️ Galeriepfad: \`${galleryPath}\`  \n🔖 Slug: \`${postSlug}\``;

    const result = runOrThrow('gh', [
      'issue', 'create',
      '--repo', repo,
      '--title', postSlug,
      '--body', body,
      '--label', 'event',
      '--assignee', 'hfanieng',
    ], { capture: true });

    console.log(`Issue created: ${(result.stdout || '').trim()}`);
    console.log(`Processed: ${title} (${date})`);
  }

  page += 1;
}

console.log('Import finished.');
