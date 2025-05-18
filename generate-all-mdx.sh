#!/bin/bash

GALLERY_ROOT="./src/content/gallery"
CONTENT_ROOT="./src/content/concerts"

echo "🔍 Durchsuche $GALLERY_ROOT nach Bildern ..."

find "$GALLERY_ROOT" -mindepth 2 -type d | while read -r img_dir; do
  year=$(basename "$(dirname "$img_dir")")
  date=$(basename "$img_dir")
  slug="$date-event"
  slug_path="$CONTENT_ROOT/$year/$slug"
  mdx_file="$slug_path/index.mdx"

  mkdir -p "$slug_path"

  featured=$(ls "$img_dir"/*.jpg 2>/dev/null | sort | head -n 1)
  if [ -z "$featured" ]; then
    echo "⚠️  Keine Bilder in $img_dir – übersprungen."
    continue
  fi

  first_caption=$(exiftool -s -s -s -IPTC:Caption-Abstract "$featured")
  raw_date=$(echo "$first_caption" | cut -d' ' -f1 | sed 's/\\./-/g')
  date="${raw_date:0:2}.${raw_date:3:2}.20${raw_date:6:2}"
  pubDate="20${raw_date:6:2}-${raw_date:3:2}-${raw_date:0:2}"

  echo "📝 Erstelle: $mdx_file"

  {
    printf "%s\n" "---"
    printf "title: \"Fotobericht vom %s\"\n" "$date"
    printf "\n"
    printf "description: \"Eine mehrteilige Fotostrecke vom Eventtag %s.\"\n" "$date"
    printf "\n"
    printf "pubDate: \"%s\"\n" "$pubDate"
    printf "\n"
    printf "featuredImage: \"/src/content/gallery/%s/%s/%s\"\n" "$year" "$date" "$(basename "$featured")"
    printf "\n"
    printf "slug: \"%s/%s\"\n" "$year" "$slug"
    printf "\n"
    printf "gallery:\n"
    printf "\n"
  } > "$mdx_file"

  all_tags=()

  for img in "$img_dir"/*.jpg; do
    fname=$(basename "$img")
    caption=$(exiftool -s -s -s -IPTC:Caption-Abstract "$img")
    keywords=$(exiftool -s -s -s -IPTC:Keywords "$img")

    artist="Unbekannt"
    city="Unbekannt"
    venue="Unbekannt"
    tour=""

    if [ -n "$caption" ]; then
      artist=$(echo "$caption" | cut -d'-' -f2 | cut -d'@' -f1 | xargs)
      city=$(echo "$caption" | grep -o '@[^/]*' | cut -c2-)
      venue=$(echo "$caption" | grep -o '/[^ ]*' | cut -c2-)
      tour=$(echo "$caption" | cut -d'-' -f3- | sed 's/-w\///' | sed 's/-guest://I' | sed 's/.* - //' | xargs)
    fi

    {
      printf "  - file: \"/src/content/gallery/%s/%s/%s\"\n" "$year" "$date" "$fname"
      printf "    title: \"%s\"\n" "$artist"
      printf "    caption: \"%s – %s @%s/%s\"\n" "$date" "$artist" "$venue" "$city"
      printf "    venue: \"%s\"\n" "$venue"
      printf "    city: \"%s\"\n" "$city"
      printf "    tour: \"%s\"\n\n" "$tour"
    } >> "$mdx_file"

    if [ -n "$keywords" ]; then
      IFS=',' read -ra kwarr <<< "$keywords"
      for kw in "${kwarr[@]}"; do
        clean_tag=$(echo "$kw" | xargs)
        if [ -n "$clean_tag" ]; then
          all_tags+=("$clean_tag")
        fi
      done
    fi
  done

  {
    printf "tags:\n"
    for tag in "${all_tags[@]}"; do
      clean_tag=$(echo "$tag" | xargs)
      if [ -n "$clean_tag" ]; then
        printf "%s\n" "- $clean_tag"
      fi
    done
    printf "%s\n" "---"
    printf "\n"
    printf "Hier folgt der Bericht zum Event am %s …\n" "$date"
  } >> "$mdx_file"

done

echo "✅ Alle index.mdx-Dateien wurden erstellt."