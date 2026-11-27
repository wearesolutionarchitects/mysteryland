import { createHash } from 'node:crypto';

export interface Post {
  text: string;
  account: string;
  visibility: string;
  media: string[];
  approval: { fingerprint: string; at: string } | null;
  publication: { receipt: string; at: string } | null;
}

export interface PostAction {
  action: string;
  text?: unknown;
  account?: unknown;
  visibility?: unknown;
  receipt?: unknown;
}

type MediaDigest = (file: string) => string;

export function createPost(text: string, media: string[]): Post {
  return { text, account: '', visibility: '', media, approval: null, publication: null };
}

function fingerprint({ text, account, visibility, media }: Post, mediaDigest: MediaDigest) {
  // Keep the serialized field order compatible with approvals saved on disk.
  const images = media.map(file => mediaDigest(file));
  return createHash('sha256').update(JSON.stringify({ text, account, visibility, media, images })).digest('hex');
}

function editableText(value: unknown) {
  if (typeof value !== 'string' || value.length > 20000) throw new Error('Ungültige Eingabe.');
  return value.trim();
}

export function updatePost(post: Post, input: PostAction & { action: 'save' }): Post;
export function updatePost(post: Post, input: PostAction, mediaDigest: MediaDigest): Post;
export function updatePost(post: Post, input: PostAction, mediaDigest?: MediaDigest): Post {
  if (post.publication) throw new Error('Veröffentlichter Stand bleibt unverändert dokumentiert.');

  switch (input.action) {
    case 'save':
      return {
        ...post,
        text: editableText(input.text),
        account: editableText(input.account),
        visibility: editableText(input.visibility),
        approval: null,
      };
    case 'approve': {
      if (!post.text || !post.account) throw new Error('Text und Zielprofil vor der Freigabe ausfüllen und speichern.');
      const approval = { fingerprint: fingerprint(post, mediaDigest!), at: new Date().toISOString() };
      return { ...post, approval };
    }
    case 'record': {
      if (!post.approval || post.approval.fingerprint !== fingerprint(post, mediaDigest!)) {
        throw new Error('Aktuelle Freigabe erforderlich; Text oder Medien wurden geändert.');
      }
      if (typeof input.receipt !== 'string' || !input.receipt.trim() || input.receipt.length > 2000) {
        throw new Error('Beitragslink oder Bestätigung des veröffentlichten Status eingeben.');
      }
      const publication = { receipt: input.receipt.trim(), at: new Date().toISOString() };
      return { ...post, publication };
    }
    default:
      throw new Error('Aktion ungültig.');
  }
}
