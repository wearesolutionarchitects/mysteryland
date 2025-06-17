#!/bin/bash
# source "$(dirname "$0")/.icloud.env"

# 📌 KONFIGURATION
TARGET_REPO="$HOME/Projekte/mysteryland"
TARGET_DIR="$TARGET_REPO/src/content/gallery"

echo "📥 Lade neue iCloud-Bilder ..."
icloudpd --directory "/Volumes/Sandisk/Fotos" --folder-structure "{:%Y/%m/%d}" --set-exif-datetime

# 📁 TEMP VERZEICHNIS
DATE_FOLDER=$(date +%Y-%m-%d)
YEAR=$(echo "$DATE_FOLDER" | cut -d- -f1)
TMP_DIR="$HOME/Pictures/iCloud/$YEAR/$DATE_FOLDER"
echo "📂 Temporäres Verzeichnis: $TMP_DIR"

# 🔄 EXIF-basierte Umbenennung der Bilddateien
echo "🧠 Benenne Bilder nach EXIF-Datum ..."
find "$TMP_DIR" -type f -iname '*.jpg' -exec exiftool \
  "-FileName<CreateDate" -d "%Y-%m-%d_%H-%M-%S%%-c.%%e" {} \;

# 📤 Zielverzeichnis auf externer SSD vorbereiten
DEST="/Volumes/Sandisk/Fotos/$YEAR/$DATE_FOLDER"
mkdir -p "$DEST"
echo "🚚 Verschiebe nach: $DEST"
mv "$TMP_DIR"/*.jpg "$DEST"

# 🧼 Aufräumen
rm -rf "$TMP_DIR"

echo "✅ Fertig! Bilder jetzt in: $DEST"