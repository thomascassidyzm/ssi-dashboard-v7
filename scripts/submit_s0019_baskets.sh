#!/bin/bash

# Submit S0019 basket payloads to the new endpoint using curl
# This is an alternative to the Python script for systems where curl works better

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOADS_FILE="$SCRIPT_DIR/S0019_basket_payloads.json"

echo "Loading payloads from S0019_basket_payloads.json..."

# Extract individual payloads and submit them
for LEGO_ID in S0019L01 S0019L03 S0019L04 S0019L05; do
    echo ""
    echo "Submitting $LEGO_ID..."

    # Extract the specific payload for this LEGO
    PAYLOAD=$(jq -c ".payloads.\"$LEGO_ID\"" "$PAYLOADS_FILE")

    # Submit with curl
    RESPONSE=$(curl -4 -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✓ $LEGO_ID - SUCCESS (200)"
        echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    else
        echo "✗ $LEGO_ID - FAILED ($HTTP_CODE)"
        echo "Response: $BODY"
    fi
done

echo ""
echo "========================================"
echo "Submission complete"
echo "========================================"
