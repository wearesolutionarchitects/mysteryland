#!/bin/bash
export LANG=de_DE.UTF-8
export LC_ALL=de_DE.UTF-8

GALLERY_ROOT="./src/content/gallery"
CONTENT_ROOT="./src/content/events"
LOG_FILE="./README.md"

echo "# 📓 Event-Übersicht – $(date)" > "$LOG_FILE"
echo "" >> "$LOG_FILE"
echo "🔍 Durchsuche $GALLERY_ROOT nach Bildern ..."


find "$GALLERY_ROOT" -mindepth 2 -type d | sort | while read -r img_dir; do
  year=$(basename "$(dirname "$img_dir")")
  date=$(basename "$img_dir")
  slug="$date"
  slug_path="$CONTENT_ROOT/$year/$slug"
  mdx_file="$slug_path/index.mdx"

  mkdir -p "$slug_path"

  featured=$(ls "$img_dir"/*.jpg 2>/dev/null | sort | head -n 1)
  if [ -z "$featured" ]; then
    echo "⚠️  Keine Bilder in $img_dir – übersprungen."
    continue
  fi

  first_caption=$(exiftool -s -s -s -IPTC:Caption-Abstract "$featured")
  raw_date=$(echo "$first_caption" | grep -oE '^[0-9]{2}\.[0-9]{2}\.[0-9]{2}')
  if [ -n "$raw_date" ]; then
    day="${raw_date:0:2}"
    month="${raw_date:3:2}"
    pubDate="${year}-${month}-${day}"
  else
    pubDate=""
  fi

  img=$(exiftool -DateTimeOriginal -T -d "%Y:%m:%d %H:%M:%S" "$img_dir"/*.jpg 2>/dev/null | \
    paste -d'|' - <(printf "%s\n" "$img_dir"/*.jpg) | \
    sort | head -n 1 | cut -d'|' -f2)

  if [ -z "$img" ] || [ ! -f "$img" ]; then
    echo "⚠️  Kein Bild mit gültigem EXIF-Zeitstempel in $img_dir – übersprungen."
    continue
  fi

  fname=$(basename "$img")
  caption=$(exiftool -s -s -s -IPTC:Caption-Abstract "$img")
  description="Eventbericht"

  echo "📝 Erstelle: $mdx_file"

  {
    echo "---"
    printf "title: \"%s\"\n" "$caption"
    printf "\n"
    printf "description: \"%s\"\n" "$description"
    printf "\n"
    printf "pubDate: \"%s\"\n" "$pubDate"
    printf "\n"
    printf "featuredImage: \"/src/content/gallery/%s/%s/%s\"\n" "$year" "$date" "$fname"
    printf "\n"
    printf "slug: \"%s/%s\"\n" "$year" "$slug"
    printf "\n"
    printf "gallery:\n\n"
  } > "$mdx_file"

  event=""
  city=""
  venue=""
  artist=""
  keywords=$(exiftool -s -s -s -IPTC:Keywords "$img")
  all_tags=()

  if [ -n "$caption" ]; then
    event=$(echo "$caption" | cut -d'-' -f2 | cut -d'@' -f1 | xargs)
    city=$(echo "$caption" | grep -o '@[^/]*' | cut -c2-)
    venue=$(echo "$caption" | grep -o '/[^ ]*' | cut -c2-)
    artist=$(echo "$caption" | cut -d'-' -f3- | sed 's/-w\///' | sed 's/-guest://I' | sed 's/.* - //' | xargs)
  fi

  {
    printf " - title: \"%s\"\n" "$event"
    printf " - venue: \"%s\"\n" "$venue"
    printf " - city: \"%s\"\n" "$city"
    printf " - artist: \"%s\"\n\n" "$artist"
  } >> "$mdx_file"

  if [ -n "$keywords" ]; then
    IFS=',' read -ra kwarr <<< "$keywords"
    for kw in "${kwarr[@]}"; do
      clean_tag=$(echo "$kw" | xargs)
      if [ -n "$clean_tag" ]; then
        all_tags+=("\"$clean_tag\"")
      fi
    done
  fi

  {
    printf "tags: [%s]\n" "$(IFS=,; echo "${all_tags[*]}")"
    echo "---"
    # printf "![$caption](../../../gallery/%s/%s/%s)\n\n" "$year" "$slug" "$fname"
    printf "## Konzertbericht\n"
    # Link zu fanieng.com, sofern Slug ableitbar
    # raw_date wurde oben gesetzt, jetzt year, month, day sicherstellen
    if [ -n "$raw_date" ]; then
      day="${raw_date:0:2}"
      month="${raw_date:3:2}"
      # year ist bereits gesetzt
    fi
    # Extrahiere Datum, Künstler, Stadt und Venue
    event_date=$(echo "$caption" | grep -oE '^[0-9]{2}\.[0-9]{2}\.[0-9]{4}' | sed 's/\./-/g')
    event_artist=$(echo "$caption" | cut -d'-' -f2 | cut -d'@' -f1 | xargs | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
    event_location=$(echo "$caption" | grep -o '@[^/]*' | cut -c2- | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
    event_venue=$(echo "$caption" | grep -o '/[^ ]*' | cut -c2- | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')

    slug_url="${event_date}-${event_artist}-${event_location}-${event_venue}"
    if [ -n "$slug_url" ]; then
      printf "\n➡️ [Originalbericht auf fanieng.com](https://fanieng.com/%s/%s/%s/%s)\n" "$year" "$month" "$day" "$slug_url"
    fi
  } >> "$mdx_file"

  {
    # echo "### 📅 $pubDate"
    # echo ""
    # echo "### 📍 $venue, $city"
    # echo ""
    echo "### ✅ [$caption]($mdx_file)"
    echo ""
    # echo "- 🖼️ $fname"
    
    # Link zum Originalbericht auf fanieng.com im Logfile ergänzen
    if [ -n "$slug_url" ]; then
      printf "Externer Link 🔗 https://fanieng.com/%s/%s/%s/%s\n" "$year" "$month" "$day" "$slug_url"
    fi
    echo ""
    echo "---"
    echo ""
  } >> "temp_log_$year.md"


done

# Gruppiere Logs pro Jahr, neueste zuerst, vor der alten Logik
if ls temp_log_*.md 1> /dev/null 2>&1; then
  for yfile in $(ls temp_log_*.md | sort -r); do
    y=$(echo "$yfile" | grep -oE '[0-9]{4}')
    echo "## 📆 $y" >> "$LOG_FILE"
    tac "$yfile" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    rm "$yfile"
  done
else
  echo "_Keine Events gefunden._" >> "$LOG_FILE"
fi

echo "✅ Alle index.mdx-Dateien wurden erstellt. Siehe $LOG_FILE"