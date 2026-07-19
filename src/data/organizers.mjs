export const knownOrganizers = [
  '1LIVE',
  'RADIO BOB GmbH & Co. KG',
  'Concertbüro Zahlmann GmbH',
  'Concert Team Düsseldorf',
  'concert team Düsseldorf GmbH',
  'Contra Promotion GmbH',
  'DBE Köln',
  'Dirk Becker Entertainment GmbH',
  'emschertainment GmbH',
  'Karsten Jahnke Konzertdirektion',
  'Kingstar GmbH',
  'KKT',
  'Koopmann Concerts & Promotion GbR',
  'Konzertbüro Schoneberg',
  'Lars Berndt EVENTS',
  'Live Nation',
  'Loft Concerts',
  'Marek Lieberberg',
  'MCT Konzertagentur',
  'Peter Rieger Konzertagentur',
  'Prime Entertainment GmbH',
  'Semmel Concerts GmbH',
  'Skalar Entertainment GmbH',
  'Westfalen Events GmbH',
  'Westfalen Concerts GmbH',
  'HockeyPark Betriebs GmbH & Co. KG',
  'WM-Stadt Gelsenkirchen',
  'WWRY Musical GmbH',
  'Zeltfestival Ruhr',
  'ZFR Event GmbH & Co. KG',
];

const organizerUrls = new Map([
  ['RADIO BOB GmbH & Co. KG', 'https://www.radiobob.de/'],
  ['HockeyPark Betriebs GmbH & Co. KG', 'https://sparkassenpark.de/'],
  ['ZFR Event GmbH & Co. KG', 'https://www.zeltfestivalruhr.de/'],
  ['concert team Düsseldorf GmbH', 'https://www.concertteam.de/'],
  ['Kingstar GmbH', 'https://www.kingstar-music.com/'],
].map(([name, url]) => [normalize(name), url]));

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('de-DE');
}

export function organizersFromTags(tags) {
  const tagSet = new Set((Array.isArray(tags) ? tags : [tags])
    .flatMap((item) => Array.isArray(item) ? item : String(item || '').split(','))
    .map(normalize)
    .filter(Boolean));

  return knownOrganizers.filter((organizer) => tagSet.has(normalize(organizer)));
}

export function organizerUrl(organizer) {
  return organizerUrls.get(normalize(organizer)) ?? '';
}
