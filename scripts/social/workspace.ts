import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { readEvent, createSocialPack } from '../../src/scripts/event/social.ts';
import { createPost, updatePost, type Post, type PostAction } from './post.ts';

export const platforms = ['facebook', 'instagram', 'whatsapp'] as const;
interface Draft {
  date: string;
  phase: string;
  url: string;
  revision: string;
  posts: Record<string, Post>;
}
type GenerateInput = { lead: string; images: string[]; hashtags?: string[] };
type Mutation = PostAction & { revision: string; platform?: typeof platforms[number] };
export function validateKey(date: string, phase: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !['before', 'after'].includes(phase)) throw new Error('Event oder Phase ungültig.');
}

export function createWorkspace(root: string) {
  const eventsRoot = path.join(root, 'src/content/docs/events');
  const galleryRoot = path.join(root, 'src/content/gallery');
  const local = path.join(root, '.social');
  function file(date: string, phase: string) {
    validateKey(date, phase);
    return path.join(local, date, `${phase}.json`);
  }
  function read(date: string, phase: string): Draft | null {
    const target = file(date, phase);
    return fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : null;
  }
  function write(draft: Draft) {
    const target = file(draft.date, draft.phase);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temporary = `${target}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(draft, null, 2));
    fs.renameSync(temporary, target);
    return draft;
  }
  function mediaPath(media: string) {
    const absolute = path.resolve(local, media);
    if (!absolute.startsWith(`${local}${path.sep}`) || !absolute.endsWith('.jpg')) throw new Error('Ungültiges Medium.');
    return absolute;
  }
  function mediaDigest(media: string) {
    return createHash('sha256').update(fs.readFileSync(mediaPath(media))).digest('hex');
  }
  function list() {
    return fs.readdirSync(eventsRoot, { recursive: true, encoding: 'utf8' }).filter(name => /\d{4}-\d{2}-\d{2}\.mdx$/.test(name)).map(name => {
      const date = path.basename(name, '.mdx');
      const { data } = readEvent(date, eventsRoot);
      return { date, title: data.displayTitle || data.title };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }
  function galleryImages(date: string) {
    const directory = path.join(galleryRoot, ...date.split('-'));
    return fs.existsSync(directory) ? fs.readdirSync(directory).filter(name => /\.(jpg|jpeg|png|webp)$/i.test(name)) : [];
  }
  function detail(date: string, phase: string) {
    validateKey(date, phase);
    const { data } = readEvent(date, eventsRoot);
    const images = galleryImages(date);
    // Retrospectives must receive their own copy and media selection.
    const social = phase === 'before' ? data.social ?? {} : {};
    return { title: data.displayTitle || data.title, images, lead: social.lead || '', hashtags: social.hashtags || [], selected: social.images || [], draft: read(date, phase) };
  }
  async function generate(date: string, phase: string, input: GenerateInput) {
    validateKey(date, phase);
    if (read(date, phase)) throw new Error('Entwurf existiert bereits. Bearbeite ihn oder wähle die andere Phase.');
    if (typeof input.lead !== 'string' || !input.lead.trim()) throw new Error('Bitte einen eigenen Beitragstext eingeben.');
    const images = galleryImages(date);
    if (!Array.isArray(input.images) || !input.images.length || input.images.some(name => !images.includes(name))) throw new Error('Bitte vorhandene Galeriebilder auswählen.');
    const outboxRoot = path.join(local, 'packs', randomUUID());
    const result = await createSocialPack(date, {
      eventsRoot, galleryRoot, outboxRoot, phase,
      social: { enabled: true, lead: input.lead.trim(), hashtags: input.hashtags || [], images: input.images },
    });
    const posts = Object.fromEntries(platforms.map(platform => {
      const text = result.text[platform === 'whatsapp' ? 'whatsappStatus' : platform];
      const media = result.outputs.filter(output => output.platform === platform).map(output => path.relative(local, output.target));
      return [platform, createPost(text, media)];
    }));
    return write({ date, phase, url: result.url, revision: randomUUID(), posts });
  }
  function mutate(date: string, phase: string, input: Mutation) {
    const draft = read(date, phase);
    if (!draft || draft.revision !== input.revision) throw new Error('Entwurf wurde geändert. Bitte neu laden.');
    if (input.action === 'archive') {
      const archive = path.join(local, date, 'history');
      fs.mkdirSync(archive, { recursive: true });
      fs.renameSync(file(date, phase), path.join(archive, `${phase}-${draft.revision}.json`));
      return null;
    }
    if (!input.platform || !platforms.includes(input.platform)) throw new Error('Plattform ungültig.');
    draft.posts[input.platform] = updatePost(draft.posts[input.platform], input, mediaDigest);
    draft.revision = randomUUID();
    return write(draft);
  }
  return { list, detail, generate, mutate, mediaPath, read };
}
