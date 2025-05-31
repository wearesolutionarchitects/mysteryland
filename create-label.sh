#!/bin/bash

REPO="wearesolutionarchitects/mysteryland"

# Labels: name | color | description
labels=(
  "depeche_mode      | 1d76db | Kategorie für die Band Depeche Mode"
  "die_aerzte        | 1d76db | Kategorie für die Band Die Ärzte"
  "die_toten_hosen   | 6f42c1 | Kategorie für die Band Die Toten Hosen"
  "duran_duran       | 6f42c1 | Kategorie für die Band Duran Duran"
  "event             | f9d0c4 | Inhalte & Metadaten zu Konzerten und Festivals"
  "extrabreit        | 6f42c1 | Kategorie für die Band Extrabreit"
  "fanta_4           | 6f42c1 | Kategorie für die Band Die Fantastischen Vier"
  "foto              | 006b75 | Bildinhalt oder fotografische Besonderheiten"
  "guano_apes        | 6f42c1 | Kategorie für die Band Guano Apes"
  "jahr              | cfd3d7 | Jahr der Veranstaltung für chronologische Filter"
  "memento           | 5319e7 | Erinnerungen oder persönliche Highlights"
  "preis             | ff9f1c | Preisangabe in € als EXIF-Tag"
  "stadt             | 0e8a16 | Veranstaltungsorte nach Stadt sortiert"
  "ticket            | d73a4a | Preis, Eintritt, Ticketkategorie"
  "tour              | b60205 | Tournee oder Festival-Zugehörigkeit"
  "artist            | fbca04 | Künstler:innen und Bands im Fokus der Galerie"
  "venue             | 0366d6 | Detaillierte Informationen zur Event-Location"
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