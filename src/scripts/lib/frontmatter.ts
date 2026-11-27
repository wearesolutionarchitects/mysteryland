import fs from 'node:fs';
import { isNode, parseDocument } from 'yaml';

export function readFrontmatter(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  const header = content.match(/^\uFEFF?---[ \t]*(\r?\n)/);
  if (!header) return null;
  const rest = content.slice(header[0].length);
  const closing = /^---[ \t]*\r?$/m.exec(rest);
  if (!closing) return null;
  const raw = rest.slice(0, closing.index);
  const document = parseDocument(raw);
  if (document.errors.length) throw new Error(`${filePath}: ${document.errors[0].message}`);
  return { data: document.toJS() ?? {}, document, raw, header: header[0], newline: header[1], tail: rest.slice(closing.index) };
}

// Edit only the requested scalar values. Serializing a whole YAML document
// would also reformat unrelated editorial lists, quoting and comments.
export function updateStringFields({ raw, document, header, newline, tail }: NonNullable<ReturnType<typeof readFrontmatter>>, fields: Record<string, string>) {
  const edits: { start: number; end: number; text: string }[] = [];
  for (const [key, value] of Object.entries(fields)) {
    const node = document.get(key, true);
    const range = isNode(node) ? node.range : undefined;
    const quoted = JSON.stringify(value);
    if (!range) {
      edits.push({ start: raw.length, end: raw.length, text: `${key}: ${quoted}${newline}` });
      continue;
    }
    const [start, end] = range;
    const prefix = raw[start - 1] === ':' ? ' ' : '';
    const suffix = raw.slice(start, end).match(/\r?\n$/)?.[0] ?? (raw[end] === '#' ? ' ' : '');
    edits.push({ start, end, text: prefix + quoted + suffix });
  }
  for (const { start, end, text } of edits.sort((a, b) => b.start - a.start)) {
    raw = raw.slice(0, start) + text + raw.slice(end);
  }
  return header + raw + tail;
}
