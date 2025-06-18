#!/bin/bash
# source "$(dirname "$0")/.icloud.env"
# icloud-to-ssd.sh
# Dieses Skript lädt Bilder von iCloud, benennt sie nach EXIF-Datum um und verschiebt sie auf eine externe SSD.
# Benötigte Tools: icloudpd, exiftool

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

# 📁 Zielverzeichnis
DATE_FOLDER="$ALBUM_DATE"
YEAR=$(echo "$DATE_FOLDER" | cut -d- -f1)
DIR="/Volumes/Sandisk/Fotos/$YEAR/$DATE_FOLDER"
echo "📂 Ziel-Verzeichnis: $DIR"

# 🔄 EXIF-basierte Umbenennung der Bilddateien
echo "🧠 Benenne Bilder nach EXIF-Datum ..."
find "$DIR" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.heic' -o -iname '*.png' \) -exec exiftool \
  "-FileName<CreateDate" -d "%Y-%m-%d_%H-%M-%S%%-c.%%e" {} +

echo "✅ Fertig! Bilder jetzt in: $DIR"