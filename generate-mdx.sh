#!/bin/bash
export LANG=de_DE.UTF-8
export LC_ALL=de_DE.UTF-8

if [[ -z "$1" || ! "$1" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "❌ Bitte gib ein gültiges Datum im Format JJJJ-MM-TT an, z. B.: 1979-09-29"
  exit 1
fi

FILTER_DATE="$1"

year=$(echo "$FILTER_DATE" | cut -d'-' -f1)
daymonth=$(echo "$FILTER_DATE" | cut -d'-' -f2-)
GALLERY_ROOT="./src/content/gallery"
img_dir="$GALLERY_ROOT/$year/$daymonth"
CONTENT_ROOT="./src/content/events"

replace_umlauts() {
  echo "$1" | sed \
    -e 's/ä/ae/g' -e 's/ö/oe/g' -e 's/ü/ue/g' \
    -e 's/Ä/Ae/g' -e 's/Ö/Oe/g' -e 's/Ü/Ue/g' \
    -e 's/ß/ss/g'
}

if [ ! -d "$img_dir" ]; then
  echo "❌ Kein Verzeichnis gefunden für $img_dir"
  exit 1
fi

last_year="$year"
  year=$(basename "$(dirname "$img_dir")")
  date=$(basename "$img_dir")
  slug="$date"
  slug_path="$CONTENT_ROOT/$year/$slug"
  mdx_file="$slug_path/index.mdx"
  mkdir -p "$slug_path"

  featured=$(ls "$img_dir"/*.jpg 2>/dev/null | sort | head -n 1)
  [ -z "$featured" ] && continue

  caption=$(exiftool -s -s -s -IPTC:Caption-Abstract "$featured")
  [ -z "$caption" ] && caption="Unbenanntes Event"
  img=$(exiftool -DateTimeOriginal -T -d "%Y:%m:%d %H:%M:%S" "$img_dir"/*.jpg 2>/dev/null | \
    paste -d'|' - <(printf "%s\n" "$img_dir"/*.jpg) | sort | head -n 1 | cut -d'|' -f2)
  if [ -z "$img" ] || [ ! -f "$img" ]; then
    echo "⚠️  Kein gültiges Bild für Event am $FILTER_DATE gefunden"
    continue
  fi

  fname=$(basename "$img")
  description="Eventbericht"

  event_date=$(echo "$caption" | grep -oE '^[0-9]{2}\.[0-9]{2}\.[0-9]{4}' | sed 's/\./-/g')
  event_artist=$(echo "$caption" | cut -d'-' -f2 | cut -d'@' -f1 | xargs | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
  event_location=$(echo "$caption" | grep -o '@[^/]*' | cut -c2- | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
  event_venue=$(echo "$caption" | grep -o '/[^ ]*' | cut -c2- | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
  event_artist=$(replace_umlauts "$event_artist")
  event_location=$(replace_umlauts "$event_location")
  event_venue=$(replace_umlauts "$event_venue")
  slug_parts=("$event_date" "$event_artist" "$event_location" "$event_venue")
  slug_url=$(IFS=-; echo "${slug_parts[*]}" | sed 's/--*/-/g' | sed 's/-$//')

  # Jahr als Überschrift 2. Ordnung nur einmal pro Jahr
  if [ "$year" != "$last_year" ]; then
    last_year="$year"
  fi

  # MDX-Datei erzeugen
  title="title: \"$caption\""
  description_line="description: \"$description\""
  pubdate_line="pubDate: \"$event_date\""
  featured_image="featuredImage: \"/src/content/gallery/$year/$date/$fname\""
  slug_line="slug: \"$year/$slug\""
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
  gallery="gallery:
    - title: \"$event\"
      venue: \"$venue\"
      city: \"$city\"
      artist: \"$artist\""

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
    echo "$tags_line"
    echo "---"
    echo ""
    echo "## Konzertbericht"
    [ -n "$slug_url" ] && echo "➡️ [Originalbericht auf fanieng.com](https://fanieng.com/$year/$date/$slug_url)"
  } > "$mdx_file"

  echo "✅ Datei erstellt: $mdx_file"
