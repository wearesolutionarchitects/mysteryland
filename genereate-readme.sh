#!/bin/bash
export LANG=de_DE.UTF-8
export LC_ALL=de_DE.UTF-8

GALLERY_ROOT="./src/content/gallery"
CONTENT_ROOT="./src/content/events"
LOG_FILE="./README.md"

replace_umlauts() {
  echo "$1" | sed \
    -e 's/ä/ae/g' -e 's/ö/oe/g' -e 's/ü/ue/g' \
    -e 's/Ä/Ae/g' -e 's/Ö/Oe/g' -e 's/Ü/Ue/g' \
    -e 's/ß/ss/g'
}

echo "#![Mysterland](/public/mysteryland.svg)" > "$LOG_FILE"
echo "" >> "$LOG_FILE"
echo "📆 Event-Übersicht – $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

last_year=""
find "$GALLERY_ROOT" -mindepth 2 -type d | sort -r | while read -r img_dir; do
  year=$(basename "$(dirname "$img_dir")")
  date=$(basename "$img_dir")
  slug="$date"
  slug_path="$CONTENT_ROOT/$year/$slug"
  mdx_file="$slug_path/index.mdx"

  featured=$(ls "$img_dir"/*.jpg 2>/dev/null | sort | head -n 1)
  [ -z "$featured" ] && continue

  caption=$(exiftool -s -s -s -IPTC:Caption-Abstract "$featured")
  event_date=$(echo "$caption" | grep -oE '^[0-9]{2}\.[0-9]{2}\.[0-9]{4}' | sed 's/\./-/g')
  event_artist=$(echo "$caption" | cut -d'-' -f2 | cut -d'@' -f1 | xargs | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
  event_location=$(echo "$caption" | grep -o '@[^/]*' | cut -c2- | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
  event_venue=$(echo "$caption" | grep -o '/[^ ]*' | cut -c2- | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
  event_artist=$(replace_umlauts "$event_artist")
  event_location=$(replace_umlauts "$event_location")
  event_venue=$(replace_umlauts "$event_venue")
  slug_url="${event_date}-${event_artist}-${event_location}-${event_venue}"

  if [ "$year" != "$last_year" ]; then
    echo "## $year" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    last_year="$year"
  fi

  mdx_link="### 🎸 [$caption]($mdx_file)"
  external_link="[Externer Link 🔗](https://fanieng.com/$year/$date/$slug_url)"
  separator="---"

  echo "$mdx_link" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
  echo "$external_link" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
  echo "$separator" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
done

echo "✅ README.md wurde aktualisiert."