#!/bin/bash

# Eingabe: Slug (z. B. 1994-03-16-die-aerzte-bielefeld-pc-69)
SLUG="$1"
REPO="wearesolutionarchitects/mysteryland"

if [[ -z "$SLUG" ]]; then
  echo "❌ Bitte gib einen Slug an, z. B.:"
  echo "./get_wp_event.sh 1994-03-16-die-aerzte-bielefeld-pc-69"
  exit 1
fi

# WordPress REST API
WP_API="https://fanieng.com/wp-json/wp/v2/posts?slug=$SLUG"

# Beitrag laden
post=$(curl -s "$WP_API" | jq -c '.[0]')

# Felder extrahieren
TITLE=$(echo "$post" | jq -r '.title.rendered')
LINK=$(echo "$post" | jq -r '.link')
DATE=$(echo "$post" | jq -r '.date' | cut -d'T' -f1)
EXCERPT=$(echo "$post" | jq -r '.excerpt.rendered' | sed 's/<[^>]*>//g' | head -c 250)

# Slug aus Titel bereinigen (für Dateinamen/Anzeige)
SANITIZED_SLUG=$(echo "$TITLE" | \
  sed 's/–/-/g' | \
  sed 's/&#8211;/-/g' | \
  sed 's/@/-/g' | \
  sed 's/\//-/g' | \
  sed 's/ä/ae/g; s/ö/oe/g; s/ü/ue/g; s/ß/ss/g' | \
  iconv -c -f utf-8 -t ascii//TRANSLIT | \
  tr '[:upper:]' '[:lower:]' | \
  sed -E 's/[^a-z0-9]+/-/g' | \
  sed -E 's/^-+|-+$//g')

# GitHub-Issue erstellen und URL erfassen
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "$SANITIZED_SLUG" \
  --body "**Auszug:** $EXCERPT

🔗 [Original-Beitrag ansehen]($LINK)

📅 Veröffentlicht am: $DATE  
🔖 Slug: \`$SANITIZED_SLUG\`" \
  --label event \
  --assignee hfanieng | grep -Eo 'https://github.com/[^ ]+')

ISSUE_NUMBER=$(basename "$ISSUE_URL")
ISSUE_ID=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json id | jq -r '.id')

echo "✅ Issue erstellt: $ISSUE_URL"

# Projekt-ID für V2-Projekt `mysteryland` holen
# PROJECT_ID=$(gh project list --owner wearesolutionarchitects --format json | jq -r '.[] | select(.title == "@mysteryland") | .id')

# if [[ -z "$PROJECT_ID" ]]; then
#   echo "❌ Projekt 'mysteryland' nicht gefunden."
#   exit 1
# fi

# Issue dem Projekt hinzufügen
# echo "➕ Füge Issue zu Projekt hinzu..."
# gh project item-add --project "$PROJECT_ID" --content-id "$ISSUE_ID"