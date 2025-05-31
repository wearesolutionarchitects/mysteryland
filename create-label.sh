#!/bin/bash

REPO="wearesolutionarchitects/mysteryland"

# Labels: name | color | description
labels=(
  "event             | f9d0c4 | Inhalte & Metadaten zu Konzerten und Festivals"
  "artist            | fbca04 | Künstler:innen und Bands im Fokus der Galerie"
  "stadt             | 0e8a16 | Veranstaltungsorte nach Stadt sortiert"
  "venue             | 0366d6 | Detaillierte Informationen zur Event-Location"
  "jahr              | cfd3d7 | Jahr der Veranstaltung für chronologische Filter"
  "ticket            | d73a4a | Preis, Eintritt, Ticketkategorie"
  "tour              | b60205 | Tournee oder Festival-Zugehörigkeit"
  "foto              | 006b75 | Bildinhalt oder fotografische Besonderheiten"
  "preis             | ff9f1c | Preisangabe in € als EXIF-Tag"
  "memento           | 5319e7 | Erinnerungen oder persönliche Highlights"
)

# Erstelle Labels via GitHub CLI
for label in "${labels[@]}"; do
  IFS='|' read -r name color desc <<< "$label"
  color=$(echo "$color" | tr -d '[:space:]')
  name=$(echo "$name" | xargs)
  desc=$(echo "$desc" | xargs)
  echo "▶️ Erstelle Label: $name"
  echo "➡️  Name: '$name' | Color: '$color' | Desc: '$desc'"
  gh label create "$name" --repo "$REPO" --color "$color" --description "$desc"
done