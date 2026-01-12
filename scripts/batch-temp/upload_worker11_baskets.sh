#!/bin/bash

# Worker 11 - Phase 3 Basket Upload Script
# Course: zho_for_eng
# LEGOs: S0253L06, S0253L07, S0254L01, S0254L02, S0256L07

API_BASE="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Worker 11 Basket Upload ==="
echo "API Base: $API_BASE"
echo "Script Dir: $SCRIPT_DIR"
echo ""

# Array of LEGOs to upload
LEGOS=("S0253L06" "S0254L01" "S0254L02" "S0256L07")

# Upload each LEGO basket
for LEGO_ID in "${LEGOS[@]}"; do
    FILE="${SCRIPT_DIR}/worker11_${LEGO_ID}.json"

    if [ ! -f "$FILE" ]; then
        echo "ERROR: File not found: $FILE"
        continue
    fi

    echo "Uploading $LEGO_ID..."

    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Content-Type: application/json" \
        -H "ngrok-skip-browser-warning: true" \
        -X POST \
        -d @"$FILE" \
        "$API_BASE/upload-basket")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "✓ $LEGO_ID uploaded successfully"
        echo "  Response: $BODY"
    else
        echo "✗ $LEGO_ID upload failed (HTTP $HTTP_CODE)"
        echo "  Response: $BODY"
    fi

    echo ""

    # Brief pause between uploads
    sleep 0.5
done

echo "=== Upload Complete ==="
echo "Worker 11: 5 LEGOs processed"
