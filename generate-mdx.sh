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
  mkdir -p "$slug_path"

  featured=$(ls "$img_dir"/*.jpg 2>/dev/null | sort | head -n 1)
  [ -z "$featured" ] && continue

  caption=$(exiftool -s -s -s -IPTC:Caption-Abstract "$featured")
  img=$(exiftool -DateTimeOriginal -T -d "%Y:%m:%d %H:%M:%S" "$img_dir"/*.jpg 2>/dev/null | \
    paste -d'|' - <(printf "%s\n" "$img_dir"/*.jpg) | sort | head -n 1 | cut -d'|' -f2)
  [ -z "$img" ] || [ ! -f "$img" ] && continue

  fname=$(basename "$img")
  description="Eventbericht"

  event_date=$(echo "$caption" | grep -oE '^[0-9]{2}\.[0-9]{2}\.[0-9]{4}' | sed 's/\./-/g')
  event_artist=$(echo "$caption" | cut -d'-' -f2 | cut -d'@' -f1 | xargs | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
  event_location=$(echo "$caption" | grep -o '@[^/]*' | cut -c2- | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
  event_venue=$(echo "$caption" | grep -o '/[^ ]*' | cut -c2- | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
  event_artist=$(replace_umlauts "$event_artist")
  event_location=$(replace_umlauts "$event_location")
  event_venue=$(replace_umlauts "$event_venue")
  slug_url="${event_date}-${event_artist}-${event_location}-${event_venue}"

  # Jahr als Überschrift 2. Ordnung nur einmal pro Jahr
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

  # MDX-Datei erzeugen
  title="title: \"$caption\""
  description_line="description: \"$description\""
  pubdate_line="pubDate: \"$event_date\""
  featured_image="featuredImage: \"/src/content/gallery/$year/$date/$fname\""
  slug_line="slug: \"$year/$slug\""
  gallery="gallery:"
  keywords=$(exiftool -s -s -s -IPTC:Keywords "$img")
  all_tags=()
  if [ -n "$keywords" ]; then
    IFS=',' read -ra kwarr <<< "$keywords"
    for kw in "${kwarr[@]}"; do
      clean_tag=$(echo "$kw" | xargs)
      [ -n "$clean_tag" ] && all_tags+=("\"$clean_tag\"")
    done
  fi
  tags_line="tags: [$(IFS=,; echo "${all_tags[*]}")]"

  event=$(echo "$caption" | cut -d'-' -f2 | cut -d'@' -f1 | xargs)
  city=$(echo "$caption" | grep -o '@[^/]*' | cut -c2-)
  venue=$(echo "$caption" | grep -o '/[^ ]*' | cut -c2-)
  artist=$(echo "$caption" | cut -d'-' -f3- | sed 's/-w\///' | sed 's/-guest://I' | sed 's/.* - //' | xargs)
  event_block=" - title: \"$event\"
 - venue: \"$venue\"
 - city: \"$city\"
 - artist: \"$artist\"
"

  {
    echo "---"
    echo "$title"
    echo ""
    echo "$description_line"
    echo ""
    echo "$pubdate_line"
    echo ""
    echo "$featured_image"
    echo ""
    echo "$slug_line"
    echo ""
    echo "$gallery"
    echo ""
    echo "$event_block"
    echo ""
    echo "$tags_line"
    echo "---"
    echo "## Konzertbericht"
    [ -n "$slug_url" ] && echo "➡️ [Originalbericht auf fanieng.com](https://fanieng.com/$year/$date/$slug_url)"
  } > "$mdx_file"

done

echo "✅ Alle index.mdx-Dateien wurden erstellt. Siehe $LOG_FILE"