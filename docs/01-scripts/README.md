# Event-Workflow

Der normale Workflow verarbeitet zuerst die Bilder aus der Inbox und erzeugt danach schrittweise die Event-MDX. Die Skripte ändern jeweils nur ihren eigenen Bereich.

Das gemeinsame MDX-Gerüst wird zentral in `src/scripts/event/render.mjs` erzeugt. `event:mdx` und `event:wp` verwenden denselben Renderer, damit neue Events immer dieselben Imports, `EventFacts`, Galerie-, Video-, Setlist-, Album- und SEO-Felder erhalten.

Event-Seiten sollen strukturiertes Frontmatter besitzen, damit `src/components/EventSeo.astro` daraus JSON-LD, Open-Graph- und Twitter-Metadaten erzeugen kann.

## Voraussetzungen

- Node.js und npm
- `exiftool` für Medien- und MDX-Schritt (`brew install exiftool` unter macOS)
- `.env` mit `SETLIST_API_KEY` für den Setlist-Schritt

Optionale Konfiguration:

```dotenv
WP_BASE_URL=https://fanieng.com
GALLERY_ROOT=./src/content/gallery
GALLERY_INBOX=./src/content/gallery/inbox
GALLERY_OUTBOX=./src/content/gallery/outbox
EVENTS_ROOT=./src/content/docs/events
EXIFTOOL_PATH=/opt/homebrew/bin/exiftool
SETLIST_USER_AGENT=heiko@fanieng.com
AMAZON_HOST=www.amazon.de
AMAZON_AFFILIATE_TAG=mysteryland-21
```

## Event-Frontmatter

Neue oder nachgezogene Event-MDX-Dateien sollen mindestens diese Felder verwenden:

```yaml
title: "Sondaschule"
description: "Eventbericht über das Konzert von Sondaschule in der Westfalenhalle Dortmund am 11.12.2027."
tour: "25 Jahre - Mega Circle Pott"
artist: ["Sondaschule"]
category: "Konzert"
ticketCategory: "Stehplatz Innenraum"
support: "TBA"
status: "scheduled"
pubDate: 2027-12-11
country: "Deutschland"
city: "Dortmund"
venue: "Westfalenhalle"
price: 66.40
asin: "B0F48VP6V8"
ogImage: "/og/events/2027/2027-12-11.jpg"
canonicalUrl: "/events/2027/2027-12-11/"
tags: ["Ticket", "€66.40", "Deutschland", "Westfalenhalle", "Konzert", "25 Jahre - Mega Circle Pott", "Dortmund", "Sondaschule", "2027"]
```

Konventionen:

- `category`: `Konzert`, `Festival`, `Lesung` oder `TBA`
- `status`: `scheduled`, `postponed`, `cancelled`, `completed` oder `TBA`
- `ticketCategory`: z.B. `Stehplatz Innenraum`, `Sitzplatz`, `Front of Stage`, `TBA`
- `support` und `guest`: String oder Array, unbekannt als `TBA`
- `canonicalUrl`: `/events/YYYY/YYYY-MM-DD/`
- `ogImage`: öffentlicher Pfad unter `/og/events/YYYY/YYYY-MM-DD.jpg`

`TBA` ist bewusst erlaubt. Fehlende Informationen sollen nicht geraten werden.

## 1. Bilder importieren

Modul: `src/scripts/event/media.mjs`

```bash
npm run event:media
```

Die aus Apple Photos exportierten Bilder müssen vorher in dieser Inbox liegen:

```text
src/content/gallery/inbox/
```

Das Skript:

- liest Datum und Uhrzeit bevorzugt aus einem bereits passenden Dateinamen,
- verwendet danach EXIF-Erstellungsdaten und ersatzweise das Datum aus dem Bildtitel,
- benennt die Datei als `YYYY-MM-DD_HH-MM-SS.ext`,
- verschiebt sie nach `src/content/gallery/YYYY/MM/DD/`,
- erzeugt keine Sidecar-Dateien,
- überschreibt keine vorhandenen Dateien.

Beispiel:

```text
IMG_1234.JPG -> 2014/10/11/2014-10-11_19-00-01.jpg
```

Dateien ohne verwertbares Datum bleiben in der Inbox. Das Skript beendet den Lauf dann mit einem Fehler.

## 2. Event-MDX erzeugen

Modul: `src/scripts/event/mdx.mjs`

```bash
npm run event:mdx -- <YYYY-MM-DD>
```

Beispiel:

```bash
npm run event:mdx -- 2014-10-11
```

Das Skript:

- liest alle Bilder aus `src/content/gallery/YYYY/MM/DD/`,
- ermittelt Artist, Stadt und Venue aus der `Image Description`,
- erwartet den Titel im Format `DD.MM.YYYY - Artist@City/Venue`,
- übernimmt unter anderem Schlagwörter, Tour, Land und Preis aus den Metadaten,
- erstellt `src/content/docs/events/YYYY/YYYY-MM-DD.mdx`,
- bindet alle gefundenen Bilder über die `Gallery`-Komponente ein,
- erzeugt automatisch ein öffentliches OG-Bild unter `public/og/events/YYYY/YYYY-MM-DD.jpg`,
- setzt `ogImage` und `canonicalUrl` im Frontmatter,
- setzt SEO-relevante Felder wie `category`, `ticketCategory`, `support` und `status`,
- setzt noch unbekannte Inhalte auf `TBA`,
- bricht ab, wenn die Event-MDX bereits existiert.

## 3. Open-Graph-Bild erzeugen

Modul: `src/scripts/event/og.mjs`

```bash
npm run event:og -- <YYYY-MM-DD>
```

Beispiel:

```bash
npm run event:og -- 2027-12-11
```

Das Skript:

- nimmt standardmäßig das erste Bild aus `src/content/gallery/YYYY/MM/DD/`,
- erzeugt ein 1200x630-JPG mit schwarzem Hintergrund,
- speichert es unter `public/og/events/YYYY/YYYY-MM-DD.jpg`,
- kann optional mit einem expliziten Quellbild aufgerufen werden:

```bash
npm run event:og -- 2027-12-11 src/content/gallery/2027/12/11/2027-12-11_19-30-00.jpg
```

Die Galerie bleibt bewusst in `src/content/gallery`. Nur das abgeleitete OG-Bild liegt öffentlich in `public/og/events`.

## 4. Event-SEO prüfen und nachziehen

Modul: `src/scripts/event/seo.mjs`

```bash
npm run event:seo
```

Das Skript läuft standardmäßig im Audit-Modus und zeigt nur an, welche Event-Dateien angepasst würden.

```bash
npm run event:seo -- --write
```

Das Skript:

- prüft alle Event-MDX-Dateien unter `src/content/docs/events`,
- erzeugt fehlende OG-Bilder aus vorhandenen Gallery-Bildern,
- setzt `ogImage` auf `/og/events/YYYY/YYYY-MM-DD.jpg`,
- setzt als bewussten Fallback `/apple-touch-icon.png`, wenn es keine Gallery-Quelle gibt,
- ersetzt nur eindeutig schwache Import-Descriptions wie `Artist am YYYY-MM-DD in Stadt, Venue.`,
- überschreibt keine bereits individuell gepflegten Event-Descriptions.

## 5. Social-Outbox erzeugen

Modul: `src/scripts/event/outbox.mjs`

```bash
npm run event:outbox
```

Beispiel:

```bash
npm run event:outbox
```

Das Skript:

- sucht alle noch bevorstehenden Events anhand des Event-Frontmatters,
- verarbeitet alle Bilder aus `src/content/gallery/YYYY/MM/DD/`,
- erzeugt pro Quellbild kanaloptimierte JPGs für Facebook, Instagram und WhatsApp Status,
- speichert sie gebündelt unter `src/content/gallery/outbox/<kanal>/`,
- löscht bei einem Komplettlauf die Outbox und baut die Kanalordner neu auf,
- löscht bei einem Einzel-Event nur die Dateien dieses Datums in den Kanalordnern,
- verwendet schwarze Balken statt Beschnitt, damit Ticket-Scans, Plakate und 4:3-Fotos vollständig bleiben.

Ausgabeformate:

```text
facebook/        1200x630
instagram/       1080x1350
whatsapp-status/ 1080x1920
```

Optional kann ein einzelnes Event gezielt neu erzeugt werden:

```bash
npm run event:outbox -- 2027-12-11
```

Die Outbox ist bewusst nicht öffentliches Site-Output-Verzeichnis, sondern ein Arbeitsbereich für Uploads zu Facebook, Instagram und WhatsApp.

## 6. Album ergänzen

Modul: `src/scripts/event/album.mjs`

```bash
npm run event:album -- <YYYY-MM-DD> <ASIN>
```

Beispiel:

```bash
npm run event:album -- 2014-10-11 B00MU78CTM
```

Das Skript:

- liest Titel und Cover des Albums anhand der ASIN von Amazon,
- ergänzt die ASIN im Frontmatter, falls sie dort noch fehlt,
- fügt eine Album-Card mit Astro-`Image` ein,
- unterstützt mehrere Alben durch wiederholte Aufrufe,
- verhindert doppelte ASINs.

## 7. Setlists ergänzen

Modul: `src/scripts/event/setlist.mjs`

```bash
npm run event:setlist -- <YYYY-MM-DD>
```

Beispiel:

```bash
npm run event:setlist -- 2025-07-26
```

Das Skript liest Datum, Stadt, Venue und das vollständige `artist`-Array aus der vorhandenen Event-MDX. Es sucht die Setlists bei setlist.fm und schreibt sie direkt in den Abschnitt `## Setlist`, `## Setlists` oder `## Setlisten`.

Bei einem Einzelkonzert wird eine Card mit dem Titel `Songs` erzeugt. Bei einem Festival wird für jeden Artist mit gefundener Setlist eine eigene Card angelegt und die Überschrift auf `## Setlists` vereinheitlicht.

Für Festivals gilt:

- Jeder auftretende Künstler muss als eigener Eintrag im Frontmatter-Array `artist` stehen.
- Bereits vorhandene Künstler-Cards bleiben erhalten.
- Das Skript ergänzt nur noch fehlende Setlists und kann erneut ausgeführt werden.
- Künstler ohne gefundene Setlist werden am Ende gemeldet und verhindern nicht, dass andere Treffer gespeichert werden.
- Die Suche erfolgt zunächst gemeinsam nach Datum und Stadt. Weitere API-Seiten und gezielte Artist-Abfragen werden nur abgerufen, wenn noch Künstler fehlen.

Beispiel:

```yaml
artist: ["Alice Cooper", "Danko Jones", "H-BLOCKX", "The New Roses", "Thundermother", "Ugly Kid Joe"]
```

## Optional: WordPress importieren

Modul: `src/scripts/event/wp.mjs`

```bash
npm run event:wp -- <post-id>
```

Der WordPress-Import ist ein alternativer Einstieg für ältere Events und gehört nicht zum normalen Inbox-Workflow. Er verwendet dasselbe MDX-Gerüst wie `event:mdx`, aber ohne Galerie-Bilder. Mit `--force` kann eine vorhandene Eventdatei nach einem automatischen Backup neu erzeugt werden.

## Artist-Profile synchronisieren

Modul: `src/scripts/artist/sync.mjs`

```bash
npm run artist:sync
```

Das Skript:

- liest `artist`, `support` und `guest` aus allen Event-MDX-Dateien,
- erzeugt fehlende Artist-Profile unter `src/content/docs/artists/<slug>.mdx`,
- nutzt deutsch lesbare Slugs wie `die-aerzte` oder `herbert-groenemeyer`,
- überschreibt keine manuell gepflegten Artist-Seiten,
- repariert nur unveränderte automatisch erzeugte Platzhalterprofile, wenn sich deren Slug oder Canonical ändern muss,
- schreibt erste Archiv-Zähler für Headliner-, Support- und Gast-Rollen in die Seite.

Artist-Profile verwenden mindestens dieses Frontmatter:

```yaml
title: "Donots"
description: "Artist-Profil zu Donots im Mysteryland Konzertarchiv."
artistName: "Donots"
artistPage: "/artists/donots/"
artistType: "TBA"
aliases: []
origin: "TBA"
country: "TBA"
artistStatus: "TBA"
website: "TBA"
musicbrainzId: "TBA"
wikidataId: "TBA"
canonicalUrl: "/artists/donots/"
tags: ["Artist", "TBA"]
```

`website` ist die offizielle externe Artist-URL. Unbekannte Websites bleiben `TBA`.

Support-Links in `EventFacts` zeigen auf diese offiziellen externen URLs, nicht auf interne Artist-Seiten. In manuell gepflegten Event-MDX-Dateien werden sie direkt am Support-Fact gesetzt:

```mdx
{ icon: 'lucide:mic-vocal', label: 'Support', value: 'Donots, Agnostic Front', links: [{ label: 'Donots', href: 'https://www.donots.com/' }, { label: 'Agnostic Front', href: 'https://www.agnosticfront.com/' }] },
```

Bei generierten Events kann der zentrale Renderer dafür `supportLinks` verwenden:

```js
supportLinks: [
  { label: 'Donots', href: 'https://www.donots.com/' },
  { label: 'Agnostic Front', href: 'https://www.agnosticfront.com/' },
]
```

Die Artist-Seiten werden bewusst noch nicht in der Sidebar eingebunden. Menüs, Artist-Übersichten und Statistikseiten werden später auf dieser Struktur aufgebaut.

## Prüfung

Nach jedem Event:

```bash
npm exec astro check
npm run build
```

## Wartungsskripte

Diese Skripte gehören nicht zum normalen Event-Workflow:

```bash
npm run script:content:generate-readme
npm run script:github:create-labels
```
