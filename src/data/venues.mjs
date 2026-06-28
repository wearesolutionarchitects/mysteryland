function normalize(value) {
  return String(value || '')
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('de-DE')
    .replace(/\s+/g, ' ');
}

export const canonicalVenueGroups = [
  {
    name: 'Mitsubishi Electric Halle',
    city: 'Düsseldorf',
    country: 'Deutschland',
    aliases: [
      'Philipshalle',
      'Mitsubishi Electric Halle',
    ],
  },
  {
    name: 'Merkur Spiel-Arena',
    city: 'Düsseldorf',
    country: 'Deutschland',
    aliases: [
      'LTU-Arena',
      'Esprit Arena',
      'Merkur Spiel-Arena',
      'MERKUR SPIEL ARENA',
    ],
  },
  {
    name: 'Lanxess-Arena',
    city: 'Köln',
    country: 'Deutschland',
    aliases: [
      'Kölnarena',
      'Lanxess Arena',
      'Lanxess-Arena',
    ],
  },
  {
    name: 'Rudolf Weber-Arena',
    city: 'Oberhausen',
    country: 'Deutschland',
    aliases: [
      'König-Pilsener-Arena',
      'Rudolf Weber-Arena',
    ],
  },
  {
    name: 'VELTINS-Arena',
    city: 'Gelsenkirchen',
    country: 'Deutschland',
    aliases: [
      'Arena AufSchalke',
      'VELTINS-Arena',
    ],
  },
];

const canonicalVenueMap = new Map(
  canonicalVenueGroups.flatMap((group) =>
    group.aliases.map((alias) => [
      [normalize(alias), normalize(group.city), normalize(group.country)].join('|'),
      {
        name: group.name,
        city: group.city,
        country: group.country,
      },
    ])
  )
);

export function canonicalVenue({ name, city, country }) {
  return canonicalVenueMap.get([
    normalize(name),
    normalize(city),
    normalize(country),
  ].join('|')) || { name, city, country };
}
