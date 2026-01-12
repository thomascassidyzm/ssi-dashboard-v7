#!/bin/bash

# Upload Worker 7 baskets to new endpoint
# LEGOs: S0079L01, S0079L04

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Uploading Worker 7 baskets..."
echo

echo "1. Uploading S0079L01 (when / 什么时候)..."
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @"$SCRIPT_DIR/basket_S0079L01.json"
echo
echo

echo "2. Uploading S0079L04 (when did you start / 你什么时候开始)..."
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @"$SCRIPT_DIR/basket_S0079L04.json"
echo
echo

echo "✅ Worker 7 upload complete: 2 LEGOs"
