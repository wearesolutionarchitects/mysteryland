# Event-Workflow

Der normale Workflow verarbeitet zuerst die Bilder aus der Inbox und erzeugt danach schrittweise die Event-MDX. Die Skripte ändern jeweils nur ihren eigenen Bereich.

## Voraussetzungen

- Node.js und npm
- `exiftool` für Medien- und MDX-Schritt (`brew install exiftool` unter macOS)
- `.env` mit `SETLIST_API_KEY` für den Setlist-Schritt

Optionale Konfiguration:

```dotenv
WP_BASE_URL=https://fanieng.com
GALLERY_ROOT=./src/content/gallery
GALLERY_INBOX=./src/content/gallery/inbox
EVENTS_ROOT=./src/content/docs/events
EXIFTOOL_PATH=/opt/homebrew/bin/exiftool
SETLIST_USER_AGENT=heiko@fanieng.com
AMAZON_HOST=www.amazon.de
AMAZON_AFFILIATE_TAG=mysteryland-21
```

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
- setzt noch unbekannte Inhalte auf `TBA`,
- bricht ab, wenn die Event-MDX bereits existiert.

## 3. Album ergänzen

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
- ergänzt die ASIN im Frontmatter,
- fügt eine Album-Card mit Astro-`Image` ein,
- unterstützt mehrere Alben durch wiederholte Aufrufe,
- verhindert doppelte ASINs.

## 4. Setlists ergänzen

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

Der WordPress-Import ist ein alternativer Einstieg für ältere Events und gehört nicht zum normalen Inbox-Workflow. Mit `--force` kann eine vorhandene Eventdatei nach einem automatischen Backup neu erzeugt werden.

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
