#!/bin/bash
# Worker 7 Upload Commands
# LEGOs: S0110L07 (relax), S0111L01 (learn)

echo "Uploading S0110L07 (relax)..."
curl -X POST "https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @worker7_S0110L07_basket.json

echo ""
echo "Uploading S0111L01 (learn)..."
curl -X POST "https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @worker7_S0111L01_basket.json

echo ""
echo "✅ Upload complete for Worker 7: S0110L07, S0111L01"
