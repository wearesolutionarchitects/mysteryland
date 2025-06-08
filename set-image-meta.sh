#!/bin/bash

# Parameter: Jahr, Event, Künstler, Eventtitel
YEAR=$1           # z. B. 2023
EVENT=$2          # z. B. 05-19
ARTIST=$3         # z. B. "Herbert Grönemeyer"
TITLE=$4          # z. B. "Tour 2023"

# Zielverzeichnis der Content Collection
TARGET_DIR="./src/content/gallery/$YEAR/$EVENT"

# Erstes Bild zur GPS-Ermittlung auswählen
FIRST_IMG=$(find "$TARGET_DIR" -iname "*.jpg" | head -n 1)
echo "📍 Ermittele GPS aus: $FIRST_IMG"

LAT=$(exiftool -s3 -n -GPSLatitude "$FIRST_IMG")
LON=$(exiftool -s3 -n -GPSLongitude "$FIRST_IMG")

# Reverse Geocoding über Nominatim
RESPONSE=$(curl -s "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=$LAT&lon=$LON")

CITY=$(echo "$RESPONSE" | jq -r '.address.city // .address.town // .address.village // empty')
STATE=$(echo "$RESPONSE" | jq -r '.address.state // empty')
COUNTRY=$(echo "$RESPONSE" | jq -r '.address.country // empty')
COUNTRY_CODE=$(echo "$RESPONSE" | jq -r '.address.country // empty')

echo "📅 Ort automatisch erkannt: $CITY, $STATE, $COUNTRY ($COUNTRY_CODE)"

# Alle Bilder verarbeiten
for FILE in "$TARGET_DIR"/*.jpg; do
  BASENAME=$(basename "$FILE")
  FILENAME="${BASENAME%.*}"
  echo "✏️ Generiere Markdown für: $BASENAME"

  DATETIME=$(exiftool -s3 -DateTimeOriginal "$FILE")

  # Frontmatter schreiben
  cat > "$TARGET_DIR/$FILENAME.md" <<EOF
---
title: "$DATETIME"
datetime: "$DATETIME"
filename: "$BASENAME"
city: "$CITY"
state: "$STATE"
country: "$COUNTRY"
countryCode: "$COUNTRY_CODE"
artist: "$ARTIST"
event: "$TITLE"
tags: ["$YEAR", "$CITY", "$ARTIST", "$TITLE", Konzert, "Deutschland"]
---
EOF

  # IPTC- und XMP-Daten ergänzen
  exiftool -overwrite_original \
    -XMP:Subject="$ARTIST" \
    -XMP:Event="$TITLE" \
    -IPTC:City="$CITY" \
    -IPTC:Province-State="$STATE" \
    -IPTC:Country-PrimaryLocationName="$COUNTRY" \
    -IPTC:Country-PrimaryLocationCode="Deutschland" \
    -IPTC:Keywords="$ARTIST,$YEAR,$CITY,Konzert" \
    "$FILE"
done

echo "✅ Markdown-Dateien mit Geo- & Eventdaten erzeugt unter $TARGET_DIR"