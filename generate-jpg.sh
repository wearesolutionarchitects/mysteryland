#!/bin/bash

GALLERY_DIR="./src/content/gallery"

if [ -z "$1" ]; then echo "❌ Bitte Datum als Argument angeben (z. B. 2026-07-17)"; exit 1; fi
EVENT_DATE="$1"
YEAR=${EVENT_DATE:0:4}
MONTH_DAY=${EVENT_DATE:5:5}
TARGET_DIR="$GALLERY_DIR/$YEAR/$MONTH_DAY"
echo "🧹 Lösche vorhandene Dateien in $TARGET_DIR ..."
rm -f "$TARGET_DIR"/*.jpg 2>/dev/null

echo "🔍 Suche nach .jpeg-Dateien (alle Schreibweisen) unter $GALLERY_DIR ..."

# Finde .jpeg/.JPEG-Dateien rekursiv
find "$GALLERY_DIR" -type f \( -iname "*.jpeg" \) | while read -r file; do
  # Ersetze Endung durch .jpg
  newfile="${file%.*}.jpg"

  # Lese Datum und Uhrzeit aus EXIF aus
  datetime=$(exiftool -d "%Y-%m-%d_%H-%M-%S" -DateTimeOriginal -s -s -s "$file")
  [ -z "$datetime" ] && datetime=$(exiftool -d "%Y-%m-%d_%H-%M-%S" -CreateDate -s -s -s "$file")
  [ -z "$datetime" ] && datetime=$(exiftool -d "%Y-%m-%d_%H-%M-%S" -ModifyDate -s -s -s "$file")

  # Wenn Datum auslesbar, setze neuen Dateinamen
  if [ -n "$datetime" ]; then
    dir=$(dirname "$file")
    newfile="$dir/${datetime}.jpg"
  else
    # Kein EXIF-Datum gefunden → .jpeg einfach in .jpg umbenennen
    newfile="${file%.*}.jpg"
  fi

  # Wenn Ziel noch nicht existiert, umbenennen
  if [ ! -f "$newfile" ]; then
    echo "🔁 $file → $newfile"
    mv "$file" "$newfile"
  else
    echo "⚠️  Datei $newfile existiert bereits – übersprungen."
  fi
done

echo "✅ Vorgang abgeschlossen."