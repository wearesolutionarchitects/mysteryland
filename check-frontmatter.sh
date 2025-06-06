#!/bin/bash

# Basisverzeichnis, z. B. für Starlight Content
BASE_DIR="src/content/docs"

# Farben für Ausgabe
RED=$(tput setaf 1)
GREEN=$(tput setaf 2)
NC=$(tput sgr0)

echo "🔍 Überprüfe .mdx-Dateien unter $BASE_DIR..."

find "$BASE_DIR" -name "*.mdx" | while read -r file; do
  missing_fields=()

  grep -q '^title:' "$file" || missing_fields+=("title")
  grep -q '^description:' "$file" || missing_fields+=("description")
  grep -q '^tags:' "$file" || missing_fields+=("tags")

  pub_date_line=$(grep '^pubDate:' "$file")
  if [[ ! "$pub_date_line" =~ pubDate:\ \"[0-9]{4}-[0-9]{2}-[0-9]{2}\" ]] &&
     [[ ! "$pub_date_line" =~ pubDate:\ [0-9]{4}-[0-9]{2}-[0-9]{2} ]]; then
    missing_fields+=("pubDate (invalid or missing)")
  fi

  if [ ${#missing_fields[@]} -ne 0 ]; then
    echo "${RED}❌ Fehlend in $file: ${missing_fields[*]}${NC}"
  else
    echo "${GREEN}✅ $file vollständig${NC}"
  fi
done