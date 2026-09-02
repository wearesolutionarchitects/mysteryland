const DEFAULT_REQUEST_DELAY_MS = 1000;
const DEFAULT_MAX_RETRIES = 3;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function artistKey(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']s\b/giu, '')
    .toLocaleLowerCase('de-DE')
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter((token) => token && !['and', 'the', 'und'].includes(token))
    .join('');
}

export function sameArtist(left, right) {
  const canonical = (value) => {
    const key = artistKey(value);
    return key === 'omd' ? artistKey('Orchestral Manoeuvres in the Dark') : key;
  };
  return canonical(left) === canonical(right);
}

export function setlistIdFromUrl(value) {
  const url = new URL(value);
  const id = url.pathname.match(/^\/setlist\/.+\/\d{4}\/.+-([a-f0-9]{8})\.html$/i)?.[1];
  if (url.protocol !== 'https:' || !['www.setlist.fm', 'setlist.fm'].includes(url.hostname)
    || url.username || url.password || url.port || !id) {
    throw new Error('Expected an HTTPS setlist.fm setlist URL.');
  }
  return id.toLowerCase();
}

export function directSetlistArtist(setlist, eventDate, artists) {
  const [year, month, day] = eventDate.split('-');
  if (setlist.eventDate !== `${day}-${month}-${year}`) {
    throw new Error(`Setlist date does not match event ${eventDate}.`);
  }
  const artist = artists.find((name) => sameArtist(setlist.artist?.name, name));
  if (!artist) throw new Error('Setlist artist does not match the event artists.');
  return artist;
}

export function orderArtists(artists = [], runningOrder = []) {
  const ordered = runningOrder
    .map((slot) => artists.find((artist) => sameArtist(artist, slot?.artist)))
    .filter(Boolean);
  return [...new Set([...ordered, ...artists])];
}

export function sortSetlistCards(content, artists = []) {
  if (artists.length < 2) return content.trim();

  const cardPattern = /<Card title="([^"]+)" icon="list-format">[\s\S]*?<\/Card>/g;
  const cards = [...content.matchAll(cardPattern)].map((match) => ({
    artist: match[1],
    content: match[0],
  }));
  if (!cards.length) return content.trim();

  const remaining = [...cards];
  const sorted = artists.flatMap((artist) => {
    const index = remaining.findIndex((card) => sameArtist(card.artist, artist));
    return index < 0 ? [] : remaining.splice(index, 1);
  });
  const otherContent = content.replace(cardPattern, '').trim();
  return [otherContent, ...sorted, ...remaining]
    .map((entry) => typeof entry === 'string' ? entry : entry.content)
    .filter(Boolean)
    .join('\n\n');
}

export function retryDelay(response, attempt, baseDelayMs = DEFAULT_REQUEST_DELAY_MS) {
  const header = response.headers?.get?.('retry-after')?.trim();
  if (header && /^\d+(?:\.\d+)?$/.test(header)) return Math.ceil(Number(header) * 1000);

  if (header) {
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }

  return baseDelayMs * (2 ** attempt);
}

export function createSetlistClient({
  apiKey,
  userAgent,
  fetchImpl = fetch,
  sleep = wait,
  requestDelayMs = DEFAULT_REQUEST_DELAY_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
  onRetry = (message) => console.warn(message),
} = {}) {
  let lastRequestAt = 0;

  return async function fetchSetlists(url, context = '') {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const throttleDelay = Math.max(0, lastRequestAt + requestDelayMs - Date.now());
      if (throttleDelay) await sleep(throttleDelay);

      lastRequestAt = Date.now();
      const response = await fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          'x-api-key': apiKey,
          'User-Agent': userAgent,
        },
      });

      if (response.ok) return response.json();

      const suffix = context ? ` für ${context}` : '';
      if (response.status !== 429 || attempt === maxRetries) {
        throw new Error(`Setlist.fm-Anfrage fehlgeschlagen${suffix}: ${response.status} ${response.statusText}`);
      }

      const delay = retryDelay(response, attempt, requestDelayMs);
      onRetry(`Setlist.fm-Limit erreicht${suffix}; neuer Versuch in ${Math.ceil(delay / 1000)} s (${attempt + 1}/${maxRetries}).`);
      await sleep(delay);
    }

    throw new Error('Setlist.fm-Anfrage unerwartet beendet.');
  };
}
