#!/bin/bash

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"
BASKETS_FILE="scripts/practice_phrases_s0046_s0047.json"

echo "========================================"
echo "UPLOADING BASKETS TO ENDPOINT"
echo "========================================"
echo "Endpoint: $ENDPOINT"
echo "Course: zho_for_eng"
echo ""

# Read the baskets file
BASKETS=$(cat "$BASKETS_FILE")

# Extract S0046L03 basket
S0046L03_BASKET=$(echo "$BASKETS" | jq '.S0046L03')

# Extract S0047L01 basket
S0047L01_BASKET=$(echo "$BASKETS" | jq '.S0047L01')

# Upload S0046L03
echo "----------------------------------------"
echo "Uploading S0046L03..."
echo "----------------------------------------"

PAYLOAD_S0046L03=$(jq -n \
  --arg course "zho_for_eng" \
  --arg seed "S0046" \
  --argjson basket "$S0046L03_BASKET" \
  '{course: $course, seed: $seed, baskets: {S0046L03: $basket}}')

echo "Payload:"
echo "$PAYLOAD_S0046L03" | jq '.'

echo ""
echo "Sending request..."
RESPONSE_S0046L03=$(curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d "$PAYLOAD_S0046L03" \
  -w "\nHTTP_STATUS:%{http_code}" \
  -s -k)

HTTP_CODE_S0046L03=$(echo "$RESPONSE_S0046L03" | grep "HTTP_STATUS" | cut -d: -f2)
BODY_S0046L03=$(echo "$RESPONSE_S0046L03" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_CODE_S0046L03"
echo "Response: $BODY_S0046L03"

if [ "$HTTP_CODE_S0046L03" -ge 200 ] && [ "$HTTP_CODE_S0046L03" -lt 300 ]; then
  echo "✓ S0046L03 uploaded successfully!"
else
  echo "✗ S0046L03 upload failed!"
fi

echo ""
echo "----------------------------------------"
echo "Uploading S0047L01..."
echo "----------------------------------------"

PAYLOAD_S0047L01=$(jq -n \
  --arg course "zho_for_eng" \
  --arg seed "S0047" \
  --argjson basket "$S0047L01_BASKET" \
  '{course: $course, seed: $seed, baskets: {S0047L01: $basket}}')

echo "Payload:"
echo "$PAYLOAD_S0047L01" | jq '.'

echo ""
echo "Sending request..."
RESPONSE_S0047L01=$(curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d "$PAYLOAD_S0047L01" \
  -w "\nHTTP_STATUS:%{http_code}" \
  -s -k)

HTTP_CODE_S0047L01=$(echo "$RESPONSE_S0047L01" | grep "HTTP_STATUS" | cut -d: -f2)
BODY_S0047L01=$(echo "$RESPONSE_S0047L01" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_CODE_S0047L01"
echo "Response: $BODY_S0047L01"

if [ "$HTTP_CODE_S0047L01" -ge 200 ] && [ "$HTTP_CODE_S0047L01" -lt 300 ]; then
  echo "✓ S0047L01 uploaded successfully!"
else
  echo "✗ S0047L01 upload failed!"
fi

echo ""
echo "========================================"
echo "UPLOAD COMPLETE"
echo "========================================"
