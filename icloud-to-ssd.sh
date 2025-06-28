#!/bin/bash
# icloud-to-ssd.sh

# 📌 KONFIGURATION

icloudpd \
  --username "heiko@fanieng.com" \
  --directory "/Volumes/Sandisk/Fotos" \
  --folder-structure "{:%Y/%m/%d}" \
  --recent "5" \
  --set-exif-datetime