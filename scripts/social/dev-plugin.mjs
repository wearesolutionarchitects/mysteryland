import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWorkspace } from './workspace.mjs';

const prefix = '/__social';
export function isLocalRequest(req) {
  const localAddresses = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
  if (!localAddresses.includes(req.socket.remoteAddress)) return false;
  const host = req.headers.host || '';
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) return false;
  if (req.headers.origin && req.headers.origin !== `http://${host}`) return false;
  return req.method === 'GET' || req.headers.origin === `http://${host}`;
}

export default function socialDevPlugin(root) {
  let busy = false;
  const workspace = createWorkspace(root);
  return {
    name: 'mysteryland-local-social',
    apply: 'serve',
    // No routes, injected scripts, middleware or assets in the production build.
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) return next();
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'");
        const json = (value, status = 200) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
        if (!isLocalRequest(req)) return json({ error: 'Nur lokal und mit gleicher Herkunft verfügbar.' }, 403);
        const date = url.searchParams.get('date');
        const phase = url.searchParams.get('phase');
        try {
          if (req.method === 'GET') {
            const assets = { '/__social': ['console.html', 'text/html'], '/__social/': ['console.html', 'text/html'], '/__social/console.js': ['console.js', 'text/javascript'], '/__social/console.css': ['console.css', 'text/css'] };
            const asset = assets[url.pathname];
            if (asset) { res.setHeader('Content-Type', `${asset[1]}; charset=utf-8`); return res.end(fs.readFileSync(fileURLToPath(new URL(asset[0], import.meta.url)))); }
            if (url.pathname === `${prefix}/events`) return json(workspace.list());
            if (url.pathname === `${prefix}/draft`) return json(workspace.detail(date, phase));
            if (url.pathname === `${prefix}/media`) { res.setHeader('Content-Type', 'image/jpeg'); return res.end(fs.readFileSync(workspace.mediaPath(url.searchParams.get('file') || ''))); }
            return json({ error: 'Nicht gefunden.' }, 404);
          }
          if (req.method !== 'POST' || url.pathname !== `${prefix}/draft`) return json({ error: 'Nicht erlaubt.' }, 405);
          if (busy) return json({ error: 'Eine Aktion läuft bereits. Bitte kurz warten.' }, 409);
          busy = true;
          try {
            let body = '';
            for await (const chunk of req) { body += chunk; if (body.length > 100000) throw new Error('Eingabe zu groß.'); }
            const input = JSON.parse(body);
            return json(input.action === 'generate' ? await workspace.generate(date, phase, input) : workspace.mutate(date, phase, input));
          } finally { busy = false; }
        } catch (error) { return json({ error: error.message }, 400); }
      });
    },
  };
}
