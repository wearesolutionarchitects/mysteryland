#!/bin/bash

GALLERY_DIR="./src/content/gallery"

echo "🔍 Suche nach .jpeg-Dateien (alle Schreibweisen) unter $GALLERY_DIR ..."

# Finde .jpeg/.JPEG-Dateien rekursiv
find "$GALLERY_DIR" -type f \( -iname "*.jpeg" \) | while read -r file; do
  # Ersetze Endung durch .jpg
  newfile="${file%.*}.jpg"

  # Wenn Ziel noch nicht existiert, umbenennen
  if [ ! -f "$newfile" ]; then
    echo "🔁 $file → $newfile"
    mv "$file" "$newfile"
  else
    echo "⚠️  Datei $newfile existiert bereits – übersprungen."
  fi
done

echo "✅ Vorgang abgeschlossen."