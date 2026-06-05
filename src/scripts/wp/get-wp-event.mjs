import { loadEnv, runCapture, runOrThrow, sanitizeSlug, stripHtml } from '../lib/core.mjs';

loadEnv();

const slug = process.argv[2];
const repo = process.env.REPO || 'wearesolutionarchitects/mysteryland';
const wpBaseUrl = process.env.WP_BASE_URL || 'https://fanieng.com';

if (!slug) {
  console.error('Usage: npm run script:wp:get-event -- <slug>');
  process.exit(1);
}

const res = await fetch(`${wpBaseUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}`);
const posts = await res.json();
const post = posts?.[0];

if (!post) {
  console.error(`No post found for slug ${slug}`);
  process.exit(1);
}

const title = post?.title?.rendered || slug;
const link = post?.link || '';
const date = (post?.date || '').split('T')[0];
const excerpt = stripHtml(post?.excerpt?.rendered || '').slice(0, 250);
const sanitizedSlug = sanitizeSlug(title);

const body = `**Auszug:** ${excerpt}\n\n🔗 [Original-Beitrag ansehen](${link})\n\n📅 Veröffentlicht am: ${date}  \n🔖 Slug: \`${sanitizedSlug}\``;

const result = runOrThrow('gh', [
  'issue',
  'create',
  '--repo',
  repo,
  '--title',
  sanitizedSlug,
  '--body',
  body,
  '--label',
  'event',
  '--assignee',
  'hfanieng',
], { capture: true });

const issueUrl = (result.stdout || '').trim();
if (!issueUrl) {
  console.error('Failed to create issue');
  process.exit(1);
}

const issueNumber = issueUrl.split('/').pop();
const issueIdJson = runCapture('gh', ['issue', 'view', issueNumber, '--repo', repo, '--json', 'id']);
const issueId = JSON.parse(issueIdJson).id;
console.log(`Issue created: ${issueUrl}`);
console.log(`Issue ID: ${issueId}`);
