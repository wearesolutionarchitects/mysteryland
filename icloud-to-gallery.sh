#!/bin/bash
source "$(dirname "$0")/.icloud.env"

# 📌 KONFIGURATION
TARGET_REPO="$HOME/Projekte/mysteryland"
TARGET_DIR="$TARGET_REPO/src/content/gallery"
ALBUM_NAME="$1"

# 🔁 Plausibilitätsprüfung
if [[ -z "$ALBUM_NAME" ]]; then
  echo "❌ Bitte gib das Albumdatum an: ./icloud-to-gallery.sh 22.11.1986"
  exit 1
fi

# 📁 TEMP VERZEICHNIS
TMP_DIR="$HOME/tmp/icloud_download"
mkdir -p "$TMP_DIR"
echo "📂 Temporäres Verzeichnis: $TMP_DIR"

echo "📥 Lade iCloud-Album '$ALBUM_NAME' ..."

icloudpd \
  --username "$ICLOUDPD_USERNAME" \
  --password "$ICLOUDPD_PASSWORD" \
  --directory "$TMP_DIR" \
  --album "$ALBUM_NAME" \
  --folder-structure "{:%Y/%Y-%m-%d}" \
  --skip-videos \
  --set-exif-datetime \
  --auto-delete \
  --no-progress-bar

# 🔄 EXIF-basierte Umbenennung der Bilddateien
echo "🧠 Benenne Bilder nach EXIF-Datum ..."
find "$TMP_DIR/$ALBUM_NAME" -type f -iname '*.jpg' -exec exiftool \
  "-FileName<CreateDate" -d "%Y-%m-%d_%H-%M-%S%%-c.%%e" {} \;

# 📦 Zielstruktur im Git-Repo vorbereiten
DATE_FOLDER=$(echo "$ALBUM_NAME" | awk -F. '{printf "%s-%s-%s", $3, $2, $1}')
YEAR=$(echo "$DATE_FOLDER" | cut -d- -f1)
DEST="$TARGET_DIR/$YEAR/$DATE_FOLDER"
mkdir -p "$DEST"

echo "🚚 Verschiebe nach: $DEST"
mv "$TMP_DIR/$ALBUM_NAME"/*.jpg "$DEST"

# 🧼 Aufräumen
rm -rf "$TMP_DIR"

# 🧪 Leeres Zielverzeichnis prüfen und ggf. .gitkeep setzen
if [ -z "$(ls -A "$DEST")" ]; then
  echo "⚠️ Zielverzeichnis ist leer, füge .gitkeep hinzu."
  touch "$DEST/.gitkeep"
fi

echo "✅ Fertig! Bilder jetzt in: $DEST"