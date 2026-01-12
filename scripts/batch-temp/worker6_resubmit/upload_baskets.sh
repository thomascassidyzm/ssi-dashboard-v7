#!/bin/bash
# Upload Worker 6 baskets (S0110L05, S0110L06) to production API

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"

echo "Uploading S0110L05 (we finish / 我们完成)..."
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @basket_s0110l05.json \
  | jq .

echo ""
echo "Uploading S0110L06 (I'd like to / 我想)..."
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @basket_s0110l06.json \
  | jq .

echo ""
echo "Done!"
