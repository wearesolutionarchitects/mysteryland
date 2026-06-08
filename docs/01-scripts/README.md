# Event-Workflow

Der normale Workflow besteht aus drei kleinen Skripten. Jedes Skript hat genau einen Parameter und eine klar abgegrenzte Aufgabe.

## Voraussetzungen

- Node.js und npm
- `exiftool` für den Medien-Schritt (`brew install exiftool` unter macOS)
- `.env` mit `SETLIST_API_KEY`

Optionale Konfiguration:

```dotenv
WP_BASE_URL=https://fanieng.com
GALLERY_ROOT=./src/content/gallery
EXIFTOOL_PATH=/opt/homebrew/bin/exiftool
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
- übernimmt Apple-Photos-Schlagwörter und Beschreibungen aus XMP nach IPTC, falls IPTC-Felder fehlen,
- ergänzt Titel, Überschrift, Eventkategorie und Ort aus der Event-MDX,
- ergänzt bei Bildern mit dem Schlagwort `Foto` Ersteller, Beruf, Kontakt und Urheberrechtsvermerk,
- prüft Eventdatum und vorhandene Schlagwörter,
- meldet fehlende zentrale Event-Schlagwörter,
- erzeugt die zur Galerie gehörenden Markdown-Sidecars.

Das alte IPTC-Feld `Category` erlaubt nur drei Zeichen. Das Skript verwendet deshalb `KON` oder `FES` und schreibt `Konzert` beziehungsweise `Festival` zusätzlich vollständig nach `SupplementalCategories`.
Auch `By-lineTitle` ist im alten IPTC-Standard auf 32 Bytes begrenzt. Dort steht deshalb `Fachinformatiker:in Entwicklung`; der vollständige Beruf wird parallel im modernen XMP-Feld `AuthorsPosition` gespeichert.

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
