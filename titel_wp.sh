#!/bin/bash

# Ziel-Datei
OUTPUT_FILE="title.md"
> "$OUTPUT_FILE"

# WordPress REST API Basis-URL
BASE_URL="https://fanieng.com/wp-json/wp/v2/posts"

# Anzahl der Beiträge pro Seite (max. 100)
PER_PAGE=100
PAGE=1

echo "# WordPress Beitragstitel" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

while true; do
  RESPONSE=$(curl -s "${BASE_URL}?per_page=${PER_PAGE}&page=${PAGE}")

  # Prüfen, ob keine weiteren Beiträge vorhanden sind
  if [[ "$RESPONSE" == "[]" ]]; then
    break
  fi

  # Titel extrahieren und zur Datei hinzufügen
  echo "$RESPONSE" | jq -r '.[] | "- " + .title.rendered' >> "$OUTPUT_FILE"

  ((PAGE++))
done

echo "✅ Titel wurden in $OUTPUT_FILE gespeichert."