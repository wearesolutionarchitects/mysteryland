#!/bin/bash
# Aufruf: ./exif-statistik.sh YYYY-MM-DD
# Beispiel: ./exif-statistik.sh 2025-06-15
export LANG=de_DE.UTF-8
export LC_ALL=de_DE.UTF-8

GALLERY_ROOT="./src/content/gallery"
LOG_FILE="exif-debug.log"
TMP_FILE="$(mktemp)"

# ==== Neue Logik für Bilder-Umbenennung nach EXIF-Datum ====
if [[ -z "$1" || ! "$1" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "❌ Bitte gib ein gültiges Datum im Format JJJJ-MM-TT an, z. B.: 1979-09-29"
  exit 1
fi

ALBUM_DATE="$1"
YEAR=$(echo "$ALBUM_DATE" | cut -d- -f1)
MONTH=$(echo "$ALBUM_DATE" | cut -d- -f2)
DAY=$(echo "$ALBUM_DATE" | cut -d- -f3)
DIR="/Volumes/Sandisk/Fotos/$YEAR/$MONTH/$DAY"
echo "📂 Ziel-Verzeichnis: $DIR"

echo "🧠 Benenne Bilder nach EXIF-Datum ..."
find "$DIR" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.heic' -o -iname '*.png' \) -exec exiftool \
  "-FileName<CreateDate" -d "%Y-%m-%d_%H-%M-%S%%-c.%%e" {} +

echo "✅ Fertig! Bilder jetzt in: $DIR"

echo "# Debug-Log für die EXIF-Auswertung" > "$LOG_FILE"

find "$GALLERY_ROOT" -type f -iname "*.jpg" | while read -r img; do
  caption=$(exiftool -s -s -s -IPTC:Caption-Abstract "$img")
  date=$(echo "$caption" | grep -oE '[0-9]{2}\.[0-9]{2}\.[0-9]{4}' || echo "unbekannt")
  # Artist: nach erstem '-' und vor '@'
  artist=$(echo "$caption" | cut -d'-' -f2 | cut -d'@' -f1 | xargs)
  # City: nach '@' und vor '/'
  city=$(echo "$caption" | grep -o '@[^/]*' | cut -c2- | xargs)
  [ -z "$artist" ] && artist="unbekannt"
  [ -z "$city" ] && city="unbekannt"
  # Venue: nach @ bis zum nächsten - oder Leerzeichen
  venue=$(echo "$caption" | sed -E 's#.*/([^/-][^/-]*)( -.*)?$#\1#' | xargs)

  date=$(echo "$caption" | grep -oE '[0-9]{2}\.[0-9]{2}\.[0-9]{4}' || echo "unbekannt")

  keywords=$(exiftool -s -s -s -IPTC:Keywords "$img")
  [ -z "$keywords" ] && keywords="(keine Tags)"

  # Trenne an Kommas, aber behalte Leerzeichen im Tag!
  IFS=',' read -ra kwarr <<< "$keywords"
  taglist=""
  for kw in "${kwarr[@]}"; do
    taglist="$taglist|$(echo "$kw" | xargs)"
  done

  price="unbekannt"
  for kw in "${kwarr[@]}"; do
    kw_clean=$(echo "$kw" | xargs)
    if [[ "$kw_clean" =~ ^€[0-9]+(\.[0-9]{2})?$ ]]; then
      price="$kw_clean"
      price=$(echo "$kw_clean" | sed 's/\./,/')
      break
    fi
  done

  # Log-Ausgabe für jedes Bild
  echo "Bild: $img" >> "$LOG_FILE"
  echo "Beschreibung: $caption" >> "$LOG_FILE"
  echo "Datum: $date" >> "$LOG_FILE"
  echo "Künstler:in: $artist" >> "$LOG_FILE"
  echo "Stadt: $city" >> "$LOG_FILE"
  echo "Veranstaltungsort: $venue" >> "$LOG_FILE"
  echo "Schlagworte: $taglist" >> "$LOG_FILE"
  echo "Preis: $price" >> "$LOG_FILE"
  echo "---" >> "$LOG_FILE"
done
