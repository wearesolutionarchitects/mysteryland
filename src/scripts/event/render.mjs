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

  return [
    '---',
    `title: ${yamlString(event.title)}`,
    `description: ${yamlString(event.description)}`,
    `tour: ${yamlString(event.tour || 'TBA')}`,
    `artist: ${frontmatterArray(artists)}`,
    `pubDate: ${event.pubDate}`,
    `country: ${yamlString(event.country || 'TBA')}`,
    `city: ${yamlString(event.city || 'TBA')}`,
    `venue: ${yamlString(event.venue || 'TBA')}`,
    ...(typeof event.price === 'number' && Number.isFinite(event.price)
      ? [`price: ${event.price.toFixed(2)}`]
      : []),
    ...frontmatterAsin(event.asin),
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
        { icon: 'lucide:mic-vocal', label: ${yamlString(event.supportLabel || 'Support')}, value: ${yamlString(event.support || 'TBA')} },
        { icon: 'lucide:globe', label: 'Land', value: ${yamlString(event.country || 'TBA')} },
        { icon: 'lucide:map-pin', label: 'Stadt', value: ${yamlString(event.city || 'TBA')} },
        { icon: 'lucide:landmark', label: 'Venue', value: ${yamlString(event.venue || 'TBA')} },
        { icon: 'lucide:badge-euro', label: 'Preis', value: ${yamlString(priceValue(event.price))} },
        { icon: 'lucide:ticket-check', label: 'Kategorie', value: ${yamlString(event.ticketCategory || 'TBA')} },
    ]}
/>`;
}

export function renderEventMdx(input) {
  const images = Array.isArray(input.images) ? input.images : [];
  const videos = videoList(input.videos);
  const intro = String(input.intro || 'TBA').trim();
  const setlistHeading = stringList(input.artists || input.artist).length > 1
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
  const externalLink = input.externalUrl
    ? `
<LinkCard
    title="Mehr Informationen"
    href=${yamlString(input.externalUrl)}
/>`
    : '';

  return `${frontmatter(input)}
${imports}

${eventFacts(input)}

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
