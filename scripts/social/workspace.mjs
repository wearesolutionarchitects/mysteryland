import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { readEvent, createSocialPack } from '../../src/scripts/event/social.mjs';

export const platforms = ['facebook', 'instagram', 'whatsapp'];
export function validateKey(date, phase) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !['before', 'after'].includes(phase)) throw new Error('Event oder Phase ungültig.');
}

export function createWorkspace(root) {
  const eventsRoot = path.join(root, 'src/content/docs/events');
  const galleryRoot = path.join(root, 'src/content/gallery');
  const local = path.join(root, '.social');
  function file(date, phase) {
    validateKey(date, phase);
    return path.join(local, date, `${phase}.json`);
  }
  function read(date, phase) {
    const target = file(date, phase);
    return fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : null;
  }
  function write(draft) {
    const target = file(draft.date, draft.phase);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temporary = `${target}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(draft, null, 2));
    fs.renameSync(temporary, target);
    return draft;
  }
  function mediaPath(media) {
    const absolute = path.resolve(local, media);
    if (!absolute.startsWith(`${local}${path.sep}`) || !absolute.endsWith('.jpg')) throw new Error('Ungültiges Medium.');
    return absolute;
  }
  function fingerprint(post) {
    const images = post.media.map(media => createHash('sha256').update(fs.readFileSync(mediaPath(media))).digest('hex'));
    return createHash('sha256').update(JSON.stringify({ text: post.text, account: post.account, visibility: post.visibility, media: post.media, images })).digest('hex');
  }
  function list() {
    return fs.readdirSync(eventsRoot, { recursive: true }).filter(name => /\d{4}-\d{2}-\d{2}\.mdx$/.test(name)).map(name => {
      const date = path.basename(name, '.mdx');
      const { data } = readEvent(date, eventsRoot);
      return { date, title: data.displayTitle || data.title };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }
  function detail(date, phase) {
    validateKey(date, phase);
    const { data } = readEvent(date, eventsRoot);
    const directory = path.join(galleryRoot, ...date.split('-'));
    const images = fs.existsSync(directory) ? fs.readdirSync(directory).filter(name => /\.(jpg|jpeg|png|webp)$/i.test(name)) : [];
    // Retrospectives must receive their own copy and media selection.
    const social = phase === 'before' ? data.social ?? {} : {};
    return { title: data.displayTitle || data.title, images, lead: social.lead || '', hashtags: social.hashtags || [], selected: social.images || [], draft: read(date, phase) };
  }
  async function generate(date, phase, input) {
    validateKey(date, phase);
    if (read(date, phase)) throw new Error('Entwurf existiert bereits. Bearbeite ihn oder wähle die andere Phase.');
    const info = detail(date, phase);
    if (typeof input.lead !== 'string' || !input.lead.trim()) throw new Error('Bitte einen eigenen Beitragstext eingeben.');
    if (!Array.isArray(input.images) || !input.images.length || input.images.some(name => !info.images.includes(name))) throw new Error('Bitte vorhandene Galeriebilder auswählen.');
    const { data } = readEvent(date, eventsRoot);
    const outboxRoot = path.join(local, 'packs', randomUUID());
    const result = await createSocialPack(date, { eventsRoot, galleryRoot, outboxRoot, phase, data: { ...data, social: { enabled: true, lead: input.lead.trim(), hashtags: input.hashtags || [], images: input.images } } });
    const posts = Object.fromEntries(platforms.map(platform => [platform, {
      text: result.text[platform === 'whatsapp' ? 'whatsappStatus' : platform],
      account: '', visibility: '',
      media: result.outputs.filter(output => output.platform === platform).map(output => path.relative(local, output.target)),
      approval: null, publication: null,
    }]));
    return write({ date, phase, url: result.url, revision: randomUUID(), posts });
  }
  function mutate(date, phase, input) {
    const draft = read(date, phase);
    if (!draft || draft.revision !== input.revision) throw new Error('Entwurf wurde geändert. Bitte neu laden.');
    if (input.action === 'archive') {
      const archive = path.join(local, date, 'history');
      fs.mkdirSync(archive, { recursive: true });
      fs.renameSync(file(date, phase), path.join(archive, `${phase}-${draft.revision}.json`));
      return null;
    }
    if (!platforms.includes(input.platform)) throw new Error('Plattform ungültig.');
    const post = draft.posts[input.platform];
    if (post.publication) throw new Error('Veröffentlichter Stand bleibt unverändert dokumentiert.');
    if (input.action === 'save') {
      for (const key of ['text', 'account', 'visibility']) {
        if (typeof input[key] !== 'string' || input[key].length > 20000) throw new Error('Ungültige Eingabe.');
        post[key] = input[key].trim();
      }
      post.approval = null;
    } else if (input.action === 'approve') {
      if (!post.text || !post.account) throw new Error('Text und Zielprofil vor der Freigabe ausfüllen und speichern.');
      post.approval = { fingerprint: fingerprint(post), at: new Date().toISOString() };
    } else if (input.action === 'record') {
      if (!post.approval || post.approval.fingerprint !== fingerprint(post)) throw new Error('Aktuelle Freigabe erforderlich; Text oder Medien wurden geändert.');
      if (typeof input.receipt !== 'string' || !input.receipt.trim() || input.receipt.length > 2000) throw new Error('Beitragslink oder Bestätigung des veröffentlichten Status eingeben.');
      post.publication = { receipt: input.receipt.trim(), at: new Date().toISOString() };
    } else throw new Error('Aktion ungültig.');
    draft.revision = randomUUID();
    return write(draft);
  }
  return { list, detail, generate, mutate, mediaPath, read };
}
