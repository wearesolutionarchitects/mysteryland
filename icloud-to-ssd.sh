#!/bin/bash
# source "$(dirname "$0")/.icloud.env"
# icloud-to-ssd.sh
# Dieses Skript lädt Bilder von iCloud, benennt sie nach EXIF-Datum um und verschiebt sie auf eine externe SSD.
# Benötigte Tools: icloudpd, exiftool

# 📌 KONFIGURATION

icloudpd \
  --directory "/Volumes/Sandisk/Fotos" \
  --folder-structure "{:%Y/%m/%d}" \
  --set-exif-datetime \
  --xmp-sidecar

# 📁 Zielverzeichnis
DATE_FOLDER=$(date +%Y-%m-%d)
YEAR=$(echo "$DATE_FOLDER" | cut -d- -f1)
DIR="/Volumes/Sandisk/Fotos/$YEAR/$DATE_FOLDER"
echo "📂 Ziel-Verzeichnis: $DIR"

# 🔄 EXIF-basierte Umbenennung der Bilddateien
echo "🧠 Benenne Bilder nach EXIF-Datum ..."
find "$DIR" -type f -iname '*.jpg' -exec exiftool \
  "-FileName<CreateDate" -d "%Y-%m-%d_%H-%M-%S%%-c.%%e" {} \;

echo "✅ Fertig! Bilder jetzt in: $DIR"