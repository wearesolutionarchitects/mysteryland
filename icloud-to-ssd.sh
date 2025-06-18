#!/bin/bash
# icloud-to-ssd.sh

# 📅 Album-Datum als Parameter
if [ -z "$1" ]; then
  echo "❌ Bitte gib ein Datum im Format YYYY-MM-DD als Argument an, z. B.: 1979-09-29"
  exit 1
fi
ALBUM_DATE="$1"

# 📌 KONFIGURATION

icloudpd \
  --username "heiko@fanieng.com" \
  --directory "/Volumes/Sandisk/Fotos" \
  --folder-structure "{:%Y/%m/%d}" \
  --set-exif-datetime \
  --xmp-sidecar \
  --album "$ALBUM_DATE"