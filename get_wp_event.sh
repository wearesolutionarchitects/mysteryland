#!/bin/bash

# Eingabe: Slug (z. B. 1994-03-16-die-aerzte-bielefeld-pc-69)
SLUG="$1"
REPO="wearesolutionarchitects/mysteryland"

if [[ -z "$SLUG" ]]; then
  echo "❌ Bitte gib einen Slug an, z. B.:"
  echo "./get_wp_event_by_slug.sh 1994-03-16-die-aerzte-bielefeld-pc-69"
  exit 1
fi

# API-Endpunkt
WP_API="https://fanieng.com/wp-json/wp/v2/posts?slug=$SLUG"

# Beitrag laden
post=$(curl -s "$WP_API" | jq -c '.[0]')

# Felder extrahieren
TITLE=$(echo "$post" | jq -r '.title.rendered')
LINK=$(echo "$post" | jq -r '.link')
DATE=$(echo "$post" | jq -r '.date' | cut -d'T' -f1)
EXCERPT=$(echo "$post" | jq -r '.excerpt.rendered' | sed 's/<[^>]*>//g' | head -c 250)

# GitHub-Issue erzeugen
gh issue create \
  --repo "$REPO" \
  --title "📝 $TITLE ($DATE)" \
  --body "**Auszug:** $EXCERPT

🔗 [Original-Beitrag ansehen]($LINK)

📅 Veröffentlicht am: $DATE  
🔖 Slug: \`$SLUG\`" \
  --label event \
  --assignee hfanieng \
  --type task \
  --project "@mysteryland"