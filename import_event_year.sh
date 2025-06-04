#!/bin/bash

YEAR="$1"
REPO="wearesolutionarchitects/mysteryland"
CATEGORY_ID=1
PER_PAGE=100
PAGE=1

if [[ -z "$YEAR" ]]; then
  echo "❌ Bitte gib ein Jahr an, z. B.: ./import_konzerte_by_year.sh 1994"
  exit 1
fi

while :; do
  echo "📥 Lade WP-Posts der Kategorie Konzerte, Seite $PAGE..."
  RESPONSE=$(curl -s "https://fanieng.com/wp-json/wp/v2/posts?categories=$CATEGORY_ID&per_page=$PER_PAGE&page=$PAGE" | jq -c "[.[] | select(.date | startswith(\"$YEAR\"))]")

  COUNT=$(echo "$RESPONSE" | jq 'length')
  [[ "$COUNT" -eq 0 ]] && break

  echo "$RESPONSE" | jq -c '.[]' | while read -r post; do
    DATE=$(echo "$post" | jq -r '.date' | cut -d'T' -f1)

    TITLE=$(echo "$post" | jq -r '.title.rendered')
    LINK=$(echo "$post" | jq -r '.link')
    SLUG=$(echo "$post" | jq -r '.slug')
    EXCERPT=$(echo "$post" | jq -r '.excerpt.rendered' | sed 's/<[^>]*>//g' | head -c 250)

    # Galeriepfad vorbereiten
    MONTHDAY=$(echo "$DATE" | cut -d'-' -f2-)
    GALLERY_PATH="src/content/gallery/$YEAR/$MONTHDAY"

    # Duplikate überspringen
    if gh issue list --repo "$REPO" --search "$SLUG" | grep -q "$SLUG"; then
      echo "⏩ $SLUG existiert bereits."
      continue
    fi

    # GitHub-Issue erzeugen
    ISSUE_URL=$(gh issue create \
      --repo "$REPO" \
      --title "📝 $TITLE ($DATE)" \
      --body "**Auszug:** $EXCERPT

🔗 [Original-Beitrag ansehen]($LINK)

📅 Veröffentlicht am: $DATE  
🖼️ Galeriepfad: \`$GALLERY_PATH\`  
🔖 Slug: \`$SLUG\`" \
      --label event \
      --assignee hfanieng | grep -Eo 'https://github.com/[^ ]+')

    echo "✅ Issue erstellt: $ISSUE_URL"
  done

  ((PAGE++))
done