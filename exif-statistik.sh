#!/bin/bash
export LANG=de_DE.UTF-8
export LC_ALL=de_DE.UTF-8

GALLERY_ROOT="./src/content/gallery"
OUTPUT_FILE="exif.md"
LOG_FILE="exif-debug.log"
TMP_FILE="$(mktemp)"

echo "# Debug-Log für EXIF-Auswertung" > "$LOG_FILE"

find "$GALLERY_ROOT" -type f -iname "*.jpg" | while read -r img; do
  caption=$(exiftool -s -s -s -IPTC:Caption-Abstract "$img")
  # Artist: nach erstem '-' und vor '@'
  artist=$(echo "$caption" | cut -d'-' -f2 | cut -d'@' -f1 | xargs)
  # City: nach '@' und vor '/'
  city=$(echo "$caption" | grep -o '@[^/]*' | cut -c2- | xargs)
  [ -z "$artist" ] && artist="unbekannt"
  [ -z "$city" ] && city="unbekannt"
  # Venue: nach @ bis zum nächsten - oder Leerzeichen
  venue=$(echo "$caption" | sed -E 's#.*/([^/-][^/-]*)( -.*)?$#\1#' | xargs)

  keywords=$(exiftool -s -s -s -IPTC:Keywords "$img")
  [ -z "$keywords" ] && keywords="(keine Tags)"

  # Trenne an Kommas, aber behalte Leerzeichen im Tag!
  IFS=',' read -ra kwarr <<< "$keywords"
  taglist=""
  for kw in "${kwarr[@]}"; do
    taglist="$taglist|$(echo "$kw" | xargs)"
  done

  # Log-Ausgabe für jedes Bild
  echo "Bild: $img" >> "$LOG_FILE"
  echo "  Caption: $caption" >> "$LOG_FILE"
  echo "  Artist:  $artist" >> "$LOG_FILE"
  echo "  City:    $city" >> "$LOG_FILE"
  echo "  Venue:   $venue" >> "$LOG_FILE"
  echo "  Tags:    $taglist" >> "$LOG_FILE"
  echo "-----------------------------" >> "$LOG_FILE"

  # Beispiel: Zähle Ticket pro Artist (wie vorher)
  has_ticket=0
  has_artist=0
  for kw in "${kwarr[@]}"; do
    kw_clean=$(echo "$kw" | xargs)
    [ "$kw_clean" = "Ticket" ] && has_ticket=1
    [ "$kw_clean" = "$artist" ] && has_artist=1
  done
  if [ $has_ticket -eq 1 ] && [ $has_artist -eq 1 ]; then
    echo "$artist" >> "$TMP_FILE"
  fi
done

ticket_artist_stats=$(sort "$TMP_FILE" | uniq -c | sort -nr | awk '{print "- "substr($0, index($0,$2))}')

{
  echo "# EXIF-Tag Statistik"
  echo ""
  echo "## Statistik: Ticket pro Artist"
  echo "$ticket_artist_stats"
  echo ""
  echo "✅ EXIF-Statistik wurde in $OUTPUT_FILE geschrieben."
} > "$OUTPUT_FILE"

rm "$TMP_FILE"