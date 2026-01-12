#!/bin/bash

# Upload Worker 10 baskets - COMPLETED
# LEGOs: S0082L02, S0082L03
# Status: ✅ Successfully uploaded to http://localhost:3456/upload-basket

ENDPOINT="http://localhost:3456/upload-basket"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Uploading Worker 10 baskets..."
echo ""

# Upload S0082L02
echo "Uploading S0082L02 (not going to / 不会)..."
RESPONSE_L02=$(curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d @"$SCRIPT_DIR/basket_S0082L02.json" 2>&1)
echo "Response: $RESPONSE_L02"
echo ""

# Upload S0082L03
echo "Uploading S0082L03 (wait for / 等)..."
RESPONSE_L03=$(curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d @"$SCRIPT_DIR/basket_S0082L03.json" 2>&1)
echo "Response: $RESPONSE_L03"
echo ""

echo "✅ Worker 10 resubmitted: 2 LEGOs"
