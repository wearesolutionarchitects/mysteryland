const $ = (id) => document.getElementById(id);
let draft;
let selection;
let busy = false;
const destinations = { facebook: 'https://www.facebook.com/', instagram: 'https://www.instagram.com/', whatsapp: 'https://web.whatsapp.com/' };
const names = { facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp-Status' };
const endpoint = () => `/__social/draft?date=${encodeURIComponent(selection.date)}&phase=${selection.phase}`;
async function request(url, input) {
  const result = await fetch(url, input ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) } : {});
  const data = await result.json();
  if (!result.ok) throw new Error(data.error);
  return data;
}
async function run(action) {
  if (busy) return;
  busy = true;
  for (const id of ['event', 'phase', 'load', 'generate']) $(id).disabled = true;
  $('notice').textContent = 'Wird verarbeitet …';
  try { await action(); $('notice').textContent = 'Bereit. Bitte Beiträge und Medien sorgfältig prüfen.'; }
  catch (error) { $('notice').textContent = error.message; }
  finally { busy = false; for (const id of ['event', 'phase', 'load', 'generate']) $(id).disabled = false; }
}
function el(tag, text, parent) { const node = document.createElement(tag); if (text) node.textContent = text; parent?.append(node); return node; }
function field(title, value, parent, multiline = false) {
  const label = el('label', title, parent); const input = el(multiline ? 'textarea' : 'input', '', label); input.value = value; if (multiline) input.rows = 7; return input;
}
function render() {
  $('generator').hidden = Boolean(draft);
  $('posts').replaceChildren();
  if (!draft) return;
  const source = el('p', 'Öffentliche Eventseite: ', $('posts'));
  const link = el('a', draft.url, source); link.href = draft.url; link.target = '_blank'; link.rel = 'noreferrer';
  const restart = el('button', 'Neue Beitragsrunde · bisherigen Stand archivieren', $('posts'));
  restart.onclick = () => run(async () => { await request(endpoint(), { action: 'archive', revision: draft.revision }); await load(); });
  for (const [platform, post] of Object.entries(draft.posts)) {
    const section = el('section', '', $('posts')); section.setAttribute('aria-label', names[platform]);
    el('h2', names[platform], section);
    el('p', post.publication ? `Veröffentlicht · ${post.publication.receipt}` : post.approval ? 'Freigegeben · gespeicherter Stand' : 'Entwurf · Freigabe ausstehend', section).className = 'state';
    const text = field('Beitrag inklusive Hashtags und Links', post.text, section, true);
    const account = field('Zielprofil / Konto', post.account, section);
    const visibility = field('Sichtbarkeit / Empfängerkreis', post.visibility, section);
    const media = el('div', '', section); media.className = 'media';
    post.media.forEach((file, index) => { const a = el('a', '', media); a.href = `/__social/media?file=${encodeURIComponent(file)}`; a.download = `${platform}-${index + 1}.jpg`; const img = el('img', '', a); img.src = a.href; img.alt = `${names[platform]} · Medium ${index + 1} herunterladen`; });
    const actions = el('div', '', section); actions.className = 'actions';
    const save = el('button', 'Änderungen speichern', actions);
    const approve = el('button', 'Diesen Stand freigeben', actions);
    const copy = el('button', 'Freigegebenen Text kopieren', actions);
    const open = el('a', 'Plattform in Chrome öffnen', actions); open.className = 'action'; open.href = destinations[platform]; open.target = '_blank'; open.rel = 'noreferrer';
    const receipt = field('Nach Veröffentlichung: Beitragslink oder Status-Bestätigung', '', section);
    const record = el('button', 'Veröffentlichung dokumentieren', section);
    const controls = [approve, copy, record];
    approve.disabled = Boolean(post.publication || post.approval);
    copy.disabled = record.disabled = !post.approval || Boolean(post.publication);
    open.hidden = !post.approval || Boolean(post.publication);
    save.disabled = Boolean(post.publication);
    [text, account, visibility].forEach(input => { input.disabled = Boolean(post.publication); input.addEventListener('input', () => { controls.forEach(button => button.disabled = true); open.hidden = true; }); });
    async function change(action, extra = {}) { draft = await request(endpoint(), { action, platform, revision: draft.revision, ...extra }); render(); }
    save.onclick = () => run(() => change('save', { text: text.value, account: account.value, visibility: visibility.value }));
    approve.onclick = () => run(() => change('approve'));
    copy.onclick = () => run(() => navigator.clipboard.writeText(post.text));
    record.onclick = () => run(() => change('record', { receipt: receipt.value }));
  }
}
async function load() {
  selection = { date: $('event').value, phase: $('phase').value };
  const info = await request(endpoint());
  draft = info.draft;
  $('lead').value = info.lead;
  $('tags').value = info.hashtags.join(', ');
  $('images').replaceChildren();
  info.images.forEach(name => { const label = el('label', '', $('images')); const check = el('input', '', label); check.type = 'checkbox'; check.value = name; check.checked = info.selected.some(id => name.includes(id)); el('span', name, label); });
  if (!info.images.length) el('p', 'Noch keine Galeriebilder vorhanden. Zuerst über event:media importieren.', $('images'));
  render();
}
$('load').onclick = () => run(load);
for (const id of ['event', 'phase']) $(id).onchange = () => run(load);
$('generate').onclick = () => run(async () => {
  draft = await request(endpoint(), { action: 'generate', lead: $('lead').value, hashtags: $('tags').value.split(',').map(s => s.trim()).filter(Boolean), images: [...$('images').querySelectorAll('input:checked')].map(input => input.value) }); render();
});
run(async () => { const events = await request('/__social/events'); events.forEach(event => { const option = el('option', `${event.date} · ${event.title}`, $('event')); option.value = event.date; }); if (events.length) await load(); });
