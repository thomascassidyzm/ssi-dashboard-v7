#!/bin/bash

# Worker 9 Basket Upload Script
# LEGOs: S0081L02, S0081L04

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Worker 9 Basket Upload ==="
echo "Endpoint: $ENDPOINT"
echo "Baskets to upload: 2"
echo ""

# Upload S0081L02
echo "Uploading S0081L02..."
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @"$SCRIPT_DIR/basket_S0081L02.json" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "---"
echo ""

# Upload S0081L04
echo "Uploading S0081L04..."
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @"$SCRIPT_DIR/basket_S0081L04.json" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "=== Upload Complete ==="
