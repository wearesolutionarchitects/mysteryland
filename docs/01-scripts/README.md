# Skript-Dokumentation

Diese Datei dokumentiert alle Node-Skripte unter `src/scripts`.

## Voraussetzungen

- Node.js (ESM, Ausfuehrung via `node`/`npm run`)
- Optional je nach Script:
    - `exiftool` (Metadata lesen/schreiben)
    - ImageMagick `convert` (JPEG-Konvertierung)
	- GitHub CLI `gh` (Issues/Labels)
- Konfiguration ueber `.env` (wird von den Skripten via `loadEnv()` geladen)

## Uebersicht npm Scripts

Alle folgenden Kommandos sind in `package.json` hinterlegt:

- `npm run script:media:exif-rename -- <YYYY-MM-DD>`
- `npm run script:media:exif-statistik -- <YYYY-MM-DD>`
- `npm run script:media:generate-jpg -- <YYYY-MM-DD>`
- `npm run script:media:set-image-meta -- <YYYY-MM-DD> <artist> <eventtitel>`
- `npm run script:content:generate-mdx -- <YYYY-MM-DD> [--force]`
- `npm run script:content:generate-readme`
- `npm run script:wp:get-event -- <slug>`
- `npm run script:wp:export-inventory`
- `npm run script:wp:map-inventory`
- `npm run script:wp:import-year -- <YYYY>`
- `npm run script:wp:titel`
- `npm run script:github:create-labels`
- `npm run script:external:setlist -- <setlist-id>`

## Gemeinsame Hilfsfunktionen

### `src/scripts/lib/core.mjs`

Kein direktes CLI-Skript, sondern gemeinsame Utilities fuer alle anderen Skripte:

- `.env` laden (`loadEnv`)
- Externe Prozesse ausfuehren (`runOrThrow`, `runCapture`)
- Datum-Argument validieren (`ensureDateArg`)
- Slug/HTML-Bereinigung (`sanitizeSlug`, `stripHtml`, `replaceUmlauts`)
- Dateisystem-Walk (`walkDirs`, `walkFiles`)
- Caption-Parsing fuer Event-Metadaten (`parseCaption`)

## Content-Skripte

### `src/scripts/content/generate-mdx.mjs`

Erzeugt fuer ein Event-Datum eine MDX-Datei unter `src/content/docs/events/<year>/<date>.mdx` auf Basis von Bilddaten aus der Galerie.

- Input:
	- Datum `YYYY-MM-DD` (Pflicht)
	- `--force` optional, um bestehende Datei zu ueberschreiben
- Erwartete Quelle:
	- `GALLERY_ROOT/<year>/<month>/<day>` mit JPG-Dateien
- Output:
	- MDX-Frontmatter (Titel, Datum, Ort, Artist, Tour, Tags)
	- Import des ersten JPG als Featured Image
	- Link auf den Originalbericht
- Wichtige Env-Variable:
	- `GALLERY_ROOT` (Default: `./src/content/gallery`)

Beispiel:

```bash
npm run script:content:generate-mdx -- 2024-10-12
```

### `src/scripts/content/generate-readme.mjs`

Generiert die Root-`README.md` des Repositories aus den Galerie-Ordnern und vorhandenen Event-MDX-Dateien.

- Liest Verzeichnisse unter `GALLERY_ROOT`
- Prueft, ob zu einem Galerie-Event eine MDX-Datei existiert
- Schreibt Jahresabschnitte und Event-Links in `./README.md`
- Ueberspringt Galerieeintraege ohne vorhandene MDX-Datei

Wichtige Env-Variable:

- `GALLERY_ROOT` (Default: `./src/content/gallery`)

## Media-Skripte

### `src/scripts/media/exif-rename.mjs`

Bereitet Bilddateien fuer ein konkretes Event-Datum auf.

- Input: Datum `YYYY-MM-DD`
- Schritte:
	- arbeitet in `GALLERY_ROOT/<year>/<month>/<day>`
	- konvertiert `.jpeg` nach `.jpg` via `convert`
	- benennt Bilddateien anhand EXIF `CreateDate`
	- erzeugt `exif-debug.log` mit Caption/Keywords/abgeleiteten Metadaten
- Unterstuetzte Bildtypen in der Verarbeitung: JPG/HEIC/PNG

Wichtige Env-Variable:

- `GALLERY_ROOT` (Default: `./src/content/gallery`)

### `src/scripts/media/exif-statistik.mjs`

Wie `exif-rename`, aber fuer ein externes Medien-Quellverzeichnis (Statistik/Debug-Lauf), nicht fuer die Repo-Galerie.

- Input: Datum `YYYY-MM-DD`
- Arbeitet in `MEDIA_SOURCE_ROOT/<year>/<month>/<day>`
- Schreibt ebenfalls `exif-debug.log`

Wichtige Env-Variable:

- `MEDIA_SOURCE_ROOT` (Default: `/Volumes/Sandisk/Fotos`)

### `src/scripts/media/generate-jpg.mjs`

Sucht rekursiv nach `.jpeg` unter `GALLERY_ROOT`, liest EXIF-Datum und benennt in `.jpg` um.

- Input: Datum `YYYY-MM-DD` (wird zur Zielstrukturermittlung genutzt)
- Loescht zuerst vorhandene `.jpg` im Zielordner `GALLERY_ROOT/<year>/<month-day>`
- Ermittelt Zeitstempel aus `DateTimeOriginal`, fallback `CreateDate`/`ModifyDate`

Wichtige Env-Variable:

- `GALLERY_ROOT` (Default: `./src/content/gallery`)

### `src/scripts/media/set-image-meta.mjs`

Setzt fuer ein Event Bild-Metadaten und erzeugt pro Bild eine begleitende Markdown-Datei.

- Input:
	- Datum `YYYY-MM-DD`
	- `artist`
	- `title`
- Schritte:
	- liest GPS-Koordinaten aus erstem JPG
	- Reverse-Geocoding via OpenStreetMap Nominatim
	- schreibt pro JPG eine `*.md` mit Frontmatter
	- schreibt IPTC/XMP-Felder per `exiftool`

Wichtige Env-Variablen:

- `GALLERY_ROOT` (Default: `./src/content/gallery`)
- `SCRIPT_USER_AGENT` (Default: `mysteryland-script`)

## WordPress-Skripte

### `src/scripts/wp/export-inventory.mjs`

Exportiert WordPress-Posts (inkl. Taxonomien/Media-Referenzen) in eine lokale Inventardatei.

- Liest paginiert aus `/wp-json/wp/v2/posts`
- Zieht zusaetzlich Tags, Kategorien und Media-Objekte nach
- Schreibt Ergebnis nach `data/wp/posts.json`

Wichtige Env-Variablen:

- `WP_BASE_URL` (Default: `https://fanieng.com`)
- `WP_INVENTORY_DIR` (Default: `./data/wp`)
- `WP_PER_PAGE` (Default: `100`)

### `src/scripts/wp/map-inventory.mjs`

Transformiert `posts.json` in ein Event-orientiertes Mapping (`events.json`) und prueft Repository-Matches.

- Input-Datei: `WP_INVENTORY_FILE` (Default: `./data/wp/posts.json`)
- Output-Datei: `WP_EVENTS_FILE` (Default: `./data/wp/events.json`)
- Enthaltene Ableitungen:
	- Event-Datum, Artist/Tour/Ort, Preis aus Tags
	- Featured-Media-Metadaten
	- erwarteter Repo-Pfad (`src/content/docs/events/<year>/<date>.mdx`) und Existenz-Flag

### `src/scripts/wp/get-wp-event.mjs`

Liest einen WordPress-Post per Slug und erstellt daraus ein GitHub Issue.

- Input: `<slug>`
- Issue-Inhalt:
	- Excerpt
	- Original-Link
	- Publikationsdatum
	- sanitizter Slug
- Label: `event`, Assignee: `hfanieng`

Wichtige Env-Variablen:

- `WP_BASE_URL` (Default: `https://fanieng.com`)
- `REPO` (Default: `wearesolutionarchitects/mysteryland`)

Beispiel:

```bash
npm run script:wp:get-event -- 2024-10-12-example
```

### `src/scripts/wp/import-event-year.mjs`

Importiert alle WordPress-Posts eines Jahres und erstellt je Post ein GitHub Issue (falls noch nicht vorhanden).

- Input: `<YYYY>`
- Filtert nach `WP_CATEGORY_ID` und Datumsprefix
- Prueft Duplikate ueber `gh issue list --search <slug>`
- Erstellt Issues mit Label `event` und Assignee `hfanieng`

Wichtige Env-Variablen:

- `WP_BASE_URL` (Default: `https://fanieng.com`)
- `WP_CATEGORY_ID` (Default: `1`)
- `WP_PER_PAGE` (Default: `100`)
- `REPO` (Default: `wearesolutionarchitects/mysteryland`)

### `src/scripts/wp/titel-wp.mjs`

Exportiert alle WordPress-Posttitel in eine lokale Markdown-Datei.

- Liest paginiert aus WordPress
- Schreibt `title.md` im Projektroot

Wichtige Env-Variablen:

- `WP_BASE_URL` (Default: `https://fanieng.com`)
- `WP_PER_PAGE` (Default: `100`)

## GitHub-Skripte

### `src/scripts/github/create-label.mjs`

Legt GitHub Labels anhand der Datenquelle `src/scripts/github/labels-data.json` an.

- Liest Name/Farbe/Beschreibung je Label aus JSON
- Fuehrt fuer jedes Label `gh label create` aus

Wichtige Env-Variable:

- `REPO` (Default: `wearesolutionarchitects/mysteryland`)

Hinweis:

- Das Skript erstellt Labels. Bei bereits existierenden Labels kann `gh` mit Fehler beenden.

## Externe API-Skripte

### `src/scripts/external/setlist-api.mjs`

Fragt die setlist.fm API fuer eine Setlist-ID ab und gibt die Songs als nummerierte Liste im Terminal aus.

- Input: `<setlist-id>`
- Verwendet Header `x-api-key` und `User-Agent`
- Gibt bei Erfolg `## Setlist` plus Songliste aus

Wichtige Env-Variablen:

- `SETLIST_API_KEY` (Pflicht)
- `SETLIST_USER_AGENT` (Default: `heiko@fanieng.com`)

Beispiel:

```bash
npm run script:external:setlist -- 63ad2eb7
```

## Relevante Umgebungsvariablen (Sammelliste)

- `GALLERY_ROOT`
- `MEDIA_SOURCE_ROOT`
- `SCRIPT_USER_AGENT`
- `WP_BASE_URL`
- `WP_PER_PAGE`
- `WP_CATEGORY_ID`
- `WP_INVENTORY_DIR`
- `WP_INVENTORY_FILE`
- `WP_EVENTS_FILE`
- `REPO`
- `SETLIST_API_KEY`
- `SETLIST_USER_AGENT`

## Typische Workflows

### Galerie-Event vorbereiten

1. `npm run script:media:exif-rename -- <YYYY-MM-DD>`
2. `npm run script:media:set-image-meta -- <YYYY-MM-DD> <artist> <eventtitel>`
3. `npm run script:content:generate-mdx -- <YYYY-MM-DD>`

### WordPress-Daten aktualisieren

1. `npm run script:wp:export-inventory`
2. `npm run script:wp:map-inventory`

### GitHub-Label Sync

1. `npm run script:github:create-labels`
