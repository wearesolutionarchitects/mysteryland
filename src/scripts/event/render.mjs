// src/scripts/event/render.mjs
// Central MDX renderer for event scaffold generation.

export function yamlString(value) {
  return JSON.stringify(String(value || ''));
}

export function stringList(...values) {
  return [...new Set(values
    .flat(2)
    .flatMap((value) => Array.isArray(value) ? value : String(value || '').split(','))
    .map((value) => String(value || '').normalize('NFC').trim())
    .filter(Boolean))];
}

export function priceValue(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(2).replace('.', ',')} €`
    : 'TBA';
}

function frontmatterArray(values) {
  return `[${stringList(values).map(yamlString).join(', ')}]`;
}

function frontmatterAsin(value) {
  const asins = stringList(value).map((item) => item.toUpperCase());
  if (!asins.length) return [];
  return [
    asins.length === 1
      ? `asin: ${yamlString(asins[0])}`
      : `asin: ${frontmatterArray(asins)}`,
  ];
}

function frontmatterScalarOrArray(key, value) {
  const values = stringList(value);
  if (!values.length) return [];
  return [
    values.length === 1
      ? `${key}: ${yamlString(values[0])}`
      : `${key}: ${frontmatterArray(values)}`,
  ];
}

function factLinks(value) {
  const links = Array.isArray(value) ? value : [];
  if (!links.length) return '';

  const entries = links
    .filter(({ label, href }) => String(label || '').trim() && String(href || '').trim())
    .map(({ label, href }) => `{ label: ${yamlString(label)}, href: ${yamlString(href)} }`)
    .join(', ');

  return entries ? `, links: [${entries}]` : '';
}

function eventCategory(event) {
  return event.category || event.eventType || 'Konzert';
}

function eventStatus(pubDate) {
  const value = String(pubDate || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'TBA';

  const today = new Date().toISOString().slice(0, 10);
  return value > today ? 'scheduled' : 'completed';
}

function eventCanonicalUrl(pubDate) {
  const value = String(pubDate || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';

  const year = value.slice(0, 4);
  return `/events/${year}/${value}/`;
}

function eventOgImage(event) {
  return event.ogImage || event.fallbackOgImage || '/apple-touch-icon.png';
}

function normalizeEvent(input) {
  return {
    ...input,
    category: eventCategory(input),
    ticketCategory: input.ticketCategory || 'TBA',
    support: input.support || 'TBA',
    status: input.status || eventStatus(input.pubDate),
    canonicalUrl: input.canonicalUrl || eventCanonicalUrl(input.pubDate),
    ogImage: eventOgImage(input),
  };
}

function imageImports(images) {
  return images
    .map(({ variable, importPath }) => `import ${variable} from ${yamlString(importPath)};`)
    .join('\n');
}

function galleryBlock(images) {
  if (!images.length) return 'TBA';

  const entries = images
    .map(({ variable, alt, title }) =>
      `        { src: ${variable}, alt: ${yamlString(alt)}, title: ${yamlString(title)} },`
    )
    .join('\n');

  return `<Gallery
    images={[
${entries}
    ]}
/>`;
}

function videoList(videos) {
  return [...new Set((Array.isArray(videos) ? videos : [])
    .map((video) => typeof video === 'string' ? video : video?.id)
    .map((id) => String(id || '').trim())
    .filter(Boolean))];
}

function videosBlock(videos) {
  const ids = videoList(videos);
  if (!ids.length) return 'TBA';

  const entries = ids
    .map((id) => `        { id: ${yamlString(id)} },`)
    .join('\n');

  return `<YouTubeVideos
    videos={[
${entries}
    ]}
/>`;
}

function frontmatter(event) {
  const artists = stringList(event.artists || event.artist || event.title);
  const tags = stringList(event.tags);
  const category = eventCategory(event);

  return [
    '---',
    `title: ${yamlString(event.title)}`,
    `description: ${yamlString(event.description)}`,
    `tour: ${yamlString(event.tour || 'TBA')}`,
    `artist: ${frontmatterArray(artists)}`,
    `category: ${yamlString(category)}`,
    `ticketCategory: ${yamlString(event.ticketCategory)}`,
    ...frontmatterScalarOrArray('support', event.support),
    ...frontmatterScalarOrArray('guest', event.guest),
    `status: ${yamlString(event.status)}`,
    `pubDate: ${event.pubDate}`,
    `country: ${yamlString(event.country || 'TBA')}`,
    `city: ${yamlString(event.city || 'TBA')}`,
    `venue: ${yamlString(event.venue || 'TBA')}`,
    ...(typeof event.price === 'number' && Number.isFinite(event.price)
      ? [`price: ${event.price.toFixed(2)}`]
      : []),
    ...frontmatterAsin(event.asin),
    `ogImage: ${yamlString(event.ogImage)}`,
    `canonicalUrl: ${yamlString(event.canonicalUrl)}`,
    `tags: ${frontmatterArray(tags)}`,
    '---',
  ].join('\n');
}

function eventFacts(event) {
  const [year, month, day] = String(event.pubDate || '').split('-');
  const displayDate = event.displayDate || `${day}.${month}.${year}`;

  return `<EventFacts
    facts={[
        { icon: 'lucide:calendar-days', label: 'Datum', value: ${yamlString(displayDate)} },
        { icon: 'lucide:route', label: 'Tour', value: ${yamlString(event.tour || 'TBA')} },
        { icon: 'lucide:mic-vocal', label: ${yamlString(event.supportLabel || 'Support')}, value: ${yamlString(event.support)}${factLinks(event.supportLinks)} },
        { icon: 'lucide:globe', label: 'Land', value: ${yamlString(event.country || 'TBA')} },
        { icon: 'lucide:map-pin', label: 'Stadt', value: ${yamlString(event.city || 'TBA')} },
        { icon: 'lucide:landmark', label: 'Venue', value: ${yamlString(event.venue || 'TBA')} },
        { icon: 'lucide:badge-euro', label: 'Preis', value: ${yamlString(priceValue(event.price))} },
        { icon: 'lucide:ticket-check', label: 'Kategorie', value: ${yamlString(event.ticketCategory)} },
        { icon: 'lucide:tag', label: 'Typ', value: ${yamlString(eventCategory(event))} },
    ]}
/>`;
}

export function renderEventMdx(input) {
  const event = normalizeEvent(input);
  const images = Array.isArray(input.images) ? input.images : [];
  const videos = videoList(input.videos);
  const intro = String(event.intro || 'TBA').trim();
  const setlistHeading = stringList(event.artists || event.artist).length > 1
    ? 'Setlists'
    : 'Setlist';
  const imports = [
    "import { Card, LinkCard } from '@astrojs/starlight/components';",
    "import { Image } from 'astro:assets';",
    "import EventFacts from '@components/EventFacts.astro';",
    "import Gallery from '@components/Gallery.astro';",
    videos.length ? "import YouTubeVideos from '@components/YouTubeVideos.astro';" : '',
    imageImports(images),
  ].filter(Boolean).join('\n');
  const externalLink = event.externalUrl
    ? `
<LinkCard
    title="Mehr Informationen"
    href=${yamlString(event.externalUrl)}
/>`
    : '';

  return `${frontmatter(event)}
${imports}

${eventFacts(event)}

${intro}

## Galerie

${galleryBlock(images)}

## Videos

${videosBlock(videos)}

## ${setlistHeading}

<Card title="Songs" icon="list-format">
    TBA
</Card>

## Album

TBA
${externalLink}
`;
}
