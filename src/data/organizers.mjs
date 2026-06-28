export const knownOrganizers = [
  '1LIVE',
  'Concertbüro Zahlmann GmbH',
  'Concert Team Düsseldorf',
  'Contra Promotion GmbH',
  'DBE Köln',
  'Karsten Jahnke Konzertdirektion',
  'Kingstar GmbH',
  'KKT',
  'Lars Berndt EVENTS',
  'Live Nation',
  'Loft Concerts',
  'Marek Lieberberg',
  'MCT Konzertagentur',
  'Prime Entertainment GmbH',
  'Zeltfestival Ruhr',
];

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
