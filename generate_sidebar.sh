#!/bin/bash

EVENT_DIR="src/content/events"
OUTPUT_FILE="src/generated/event-sidebar.json"

echo "[" > "$OUTPUT_FILE"
first_year=true

for year in $(ls "$EVENT_DIR" | sort); do
  year_path="$EVENT_DIR/$year"
  [ -d "$year_path" ] || continue

  if [ "$first_year" = false ]; then echo "," >> "$OUTPUT_FILE"; fi
  first_year=false

  echo "  {" >> "$OUTPUT_FILE"
  echo "    \"label\": \"$year\"," >> "$OUTPUT_FILE"
  echo "    \"items\": [" >> "$OUTPUT_FILE"

  first_item=true
  for day in $(ls "$year_path" | sort); do
    [ -d "$year_path/$day" ] || continue

    if [ "$first_item" = false ]; then echo "," >> "$OUTPUT_FILE"; fi
    first_item=false

    echo "      { \"label\": \"$year-$day\", \"link\": \"/events/$year/$day/\" }" >> "$OUTPUT_FILE"
  done

  echo "    ]" >> "$OUTPUT_FILE"
  echo -n "  }" >> "$OUTPUT_FILE"
done

echo "" >> "$OUTPUT_FILE"
echo "]" >> "$OUTPUT_FILE"

echo "✅ event-sidebar.json wurde generiert unter $OUTPUT_FILE"