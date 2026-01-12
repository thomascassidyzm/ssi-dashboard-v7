#!/bin/bash

# Worker 1 Resubmission Upload Script
# Run this when the ngrok tunnel is active

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"

echo "Worker 1 Resubmission - Uploading 2 LEGOs"
echo "=========================================="
echo ""

# Upload S0115L03
echo "Uploading S0115L03..."
response1=$(curl -k -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @worker1_S0115L03_basket.json)

status1=$(echo "$response1" | tail -1)
body1=$(echo "$response1" | head -n -1)

if [ "$status1" -eq 200 ] || [ "$status1" -eq 201 ]; then
  echo "✅ S0115L03 uploaded successfully (HTTP $status1)"
  echo "   Response: $body1"
else
  echo "❌ S0115L03 upload failed (HTTP $status1)"
  echo "   Response: $body1"
  exit 1
fi

echo ""

# Upload S0116L01
echo "Uploading S0116L01..."
response2=$(curl -k -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @worker1_S0116L01_basket.json)

status2=$(echo "$response2" | tail -1)
body2=$(echo "$response2" | head -n -1)

if [ "$status2" -eq 200 ] || [ "$status2" -eq 201 ]; then
  echo "✅ S0116L01 uploaded successfully (HTTP $status2)"
  echo "   Response: $body2"
else
  echo "❌ S0116L01 upload failed (HTTP $status2)"
  echo "   Response: $body2"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ Worker 1 resubmitted: 2 LEGOs"
echo "=========================================="
