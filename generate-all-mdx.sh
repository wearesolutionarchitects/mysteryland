#!/bin/bash
export LANG=de_DE.UTF-8
export LC_ALL=de_DE.UTF-8

GALLERY_ROOT="./src/content/gallery"
CONTENT_ROOT="./src/content/events"
LOG_FILE="./generation-log.md"

echo "# 📓 Generierungslog – $(date)" > "$LOG_FILE"
echo "" >> "$LOG_FILE"
echo "🔍 Durchsuche $GALLERY_ROOT nach Bildern ..."

find "$GALLERY_ROOT" -mindepth 2 -type d | while read -r img_dir; do
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
    printf "description: \"%s\"\n" "$description"
    printf "pubDate: \"%s\"\n" "$pubDate"
    printf "featuredImage: \"/src/content/gallery/%s/%s/%s\"\n" "$year" "$date" "$fname"
    printf "slug: \"%s/%s\"\n" "$year" "$slug"
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
    printf "  - title: \"%s\"\n" "$event"
    printf "    venue: \"%s\"\n" "$venue"
    printf "    city: \"%s\"\n" "$city"
    printf "    artist: \"%s\"\n\n" "$artist"
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
    printf "![$caption](../../../gallery/%s/%s/%s)\n\n" "$year" "$slug" "$fname"
    printf "# Konzertbericht\n"
  } >> "$mdx_file"

  {
    echo "- ✅ [$caption]($mdx_file)"
    echo "  - 📅 $year"
    echo "  - 📅 $pubDate"
    echo "  - 🖼️ $fname"
    echo "  - 📍 $venue, $city"
    echo ""
  } >> "$LOG_FILE"

done

echo "✅ Alle index.mdx-Dateien wurden erstellt. Siehe $LOG_FILE"