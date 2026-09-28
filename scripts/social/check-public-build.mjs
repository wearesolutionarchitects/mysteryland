import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkPublicBuild(root = 'dist') {
  const leaks = fs.readdirSync(root, { recursive: true }).filter(name => {
    if (/(^|[/\\])(__social|\.social|social-outbox)([/\\]|$)/.test(name)) return true;
    if (!/\.(html|js|json|xml|css|txt)$/.test(name)) return false;
    return /data-social-local-console|\/__social(?:\/|\b)|\.social\/packs/.test(fs.readFileSync(path.join(root, name), 'utf8'));
  });
  if (leaks.length) throw new Error(`Lokale Social-Inhalte im öffentlichen Build: ${leaks.join(', ')}`);
  return true;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkPublicBuild();
  console.log('Public build contains no local social workspace.');
}
