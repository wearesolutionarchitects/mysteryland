# Event-Workflow

Der normale Workflow besteht aus drei kleinen Skripten. Jedes Skript hat genau einen Parameter und eine klar abgegrenzte Aufgabe.

## Voraussetzungen

- Node.js und npm
- `exiftool` für den Medien-Schritt
- `.env` mit `SETLIST_API_KEY`

Optionale Konfiguration:

```dotenv
WP_BASE_URL=https://fanieng.com
GALLERY_ROOT=./src/content/gallery
SETLIST_USER_AGENT=heiko@fanieng.com
```

## 1. WordPress-Post importieren

Modul: `src/scripts/event/wp.mjs`

```bash
npm run event:wp -- <post-id>
```

Beispiel:

```bash
npm run event:wp -- 611
```

Das Skript:

- liest genau einen Konzert-Post aus WordPress,
- übernimmt Eventdatum, Artist, Tour, Ort, Venue, Preis, ASIN und Tags,
- erstellt `src/content/docs/events/YYYY/YYYY-MM-DD.mdx`,
- bindet noch keine Bilder und keine Setlist ein,
- bricht ab, wenn die Eventdatei bereits existiert.

Eine bestehende Eventdatei kann bewusst neu erzeugt werden:

```bash
npm run event:wp -- 611 --force
```

Vor dem Überschreiben wird die bisherige Datei mit Zeitstempel unter `.backups/events/YYYY/` gesichert. Der Backup-Ordner liegt außerhalb des Astro-Contents und wird von Git ignoriert.

## 2. Setlist holen

Modul: `src/scripts/event/setlist.mjs`

```bash
npm run event:setlist -- <YYYY-MM-DD>
```

Beispiel:

```bash
npm run event:setlist -- 2021-08-04
```

Das Skript liest Artist, Stadt und Venue aus der vorhandenen Event-MDX, sucht die passende Setlist bei setlist.fm und gibt einen kopierbaren Markdown-Block im Terminal aus. Die MDX-Datei wird bewusst nicht automatisch geändert.

## 3. Bilder vorbereiten

Modul: `src/scripts/event/media.mjs`

Zuerst die Bilder aus Apple Photos nach folgendem Ordner exportieren:

```text
src/content/gallery/YYYY/MM/DD/
```

Danach:

```bash
npm run event:media -- <YYYY-MM-DD>
```

Beispiel:

```bash
npm run event:media -- 2021-08-04
```

Das Skript:

- benennt JPG/JPEG-Dateien anhand des EXIF-Aufnahmedatums um,
- prüft Eventdatum und vorhandene Schlagwörter,
- meldet fehlende zentrale Event-Schlagwörter,
- erzeugt die zur Galerie gehörenden Markdown-Sidecars.

Fehlende EXIF-Daten oder komplett fehlende Schlagwörter führen zu einem Fehler. Bestehende Bilddateien werden nicht überschrieben.

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
