#!/bin/bash
export LANG=de_DE.UTF-8
export LC_ALL=de_DE.UTF-8

GALLERY_ROOT="./src/content/gallery"
LOG_FILE="exif-debug.log"
TMP_FILE="$(mktemp)"

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
