#!/bin/bash

# Root-Verzeichnisse
GALLERY_ROOT="./src/content/gallery"
CONTENT_ROOT="./src/content/concerts"

echo "🔍 Durchsuche $GALLERY_ROOT nach Bildern ..."

# Alle Unterordner im Format YYYY/MM-DD
find "$GALLERY_ROOT" -mindepth 2 -type d | while read -r img_dir; do
  # Jahreszahl und Datum aus Pfad extrahieren
  year=$(echo "$img_dir" | cut -d'/' -f4)
  date=$(echo "$img_dir" | cut -d'/' -f5)

  # Erstelle einen einfachen Slug aus dem Datum
  slug="$date-unknown-artist"
  slug_path="$CONTENT_ROOT/$year/$slug"

  # Zielpfad und Datei
  mdx_file="$slug_path/index.mdx"
  mkdir -p "$slug_path"

  echo "📝 Erstelle: $mdx_file"

  # Ältestes Bild als featuredImage
  featured=$(ls "$img_dir"/*.jpg 2>/dev/null | sort | head -n 1)

  # Falls keine Bilder: überspringen
  if [ -z "$featured" ]; then
    echo "⚠️  Keine Bilder in $img_dir – übersprungen."
    continue
  fi

  # Schreibe Frontmatter
  echo "---" > "$mdx_file"
  echo "title: \"Konzertbericht vom $date\"" >> "$mdx_file"
  echo "description: \"Ein Konzertabend am $date.\"" >> "$mdx_file"
  echo "date: \"$year-$date\"" >> "$mdx_file"
  echo "location: \"Ort folgt...\"" >> "$mdx_file"
  echo "tags: [\"konzert\", \"fotografie\"]" >> "$mdx_file"
  echo "featuredImage: \"/src/gallery/$year/$date/$(basename "$featured")\"" >> "$mdx_file"
  echo "slug: \"$year/$slug\"" >> "$mdx_file"
  echo "gallery:" >> "$mdx_file"

  for img in "$img_dir"/*.jpg; do
    fname=$(basename "$img")
    echo "  - file: \"/src/gallery/$year/$date/$fname\"" >> "$mdx_file"
    echo "    title: \"$(basename "$fname" .jpg)\"" >> "$mdx_file"
    echo "    caption: \"Beschreibung folgt…\"" >> "$mdx_file"
  done

  echo "---" >> "$mdx_file"
  echo "" >> "$mdx_file"
  echo "Hier folgt der Konzertbericht in Markdown oder MDX-Syntax..." >> "$mdx_file"

done

echo "✅ Alle index.mdx-Dateien erstellt."