#!/bin/bash

# Simple retry script for uploading baskets S0046L03 and S0047L01
# Usage: ./retry_upload_s0046_s0047.sh

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"

echo "========================================"
echo "RETRY UPLOAD: S0046L03 and S0047L01"
echo "========================================"
echo ""

# Test connectivity first
echo "Testing endpoint connectivity..."
if ! curl -s -k -m 5 "$ENDPOINT" -H "ngrok-skip-browser-warning: true" > /dev/null 2>&1; then
  echo "✗ Cannot connect to endpoint. Please check:"
  echo "  1. ngrok tunnel is running"
  echo "  2. Network connectivity is working"
  echo "  3. URL is correct"
  exit 1
fi

echo "✓ Endpoint is reachable"
echo ""

# Upload S0046L03
echo "----------------------------------------"
echo "Uploading S0046L03..."
echo "----------------------------------------"

RESPONSE1=$(curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @scripts/baskets_s0046l03_payload.json \
  -w "\n%{http_code}" \
  -s -k)

HTTP_CODE1=$(echo "$RESPONSE1" | tail -n1)
BODY1=$(echo "$RESPONSE1" | head -n-1)

echo "HTTP Status: $HTTP_CODE1"
echo "Response: $BODY1"

if [ "$HTTP_CODE1" -ge 200 ] && [ "$HTTP_CODE1" -lt 300 ]; then
  echo "✓ S0046L03 uploaded successfully!"
  SUCCESS1=1
else
  echo "✗ S0046L03 upload failed!"
  SUCCESS1=0
fi

echo ""

# Upload S0047L01
echo "----------------------------------------"
echo "Uploading S0047L01..."
echo "----------------------------------------"

RESPONSE2=$(curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @scripts/baskets_s0047l01_payload.json \
  -w "\n%{http_code}" \
  -s -k)

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
BODY2=$(echo "$RESPONSE2" | head -n-1)

echo "HTTP Status: $HTTP_CODE2"
echo "Response: $BODY2"

if [ "$HTTP_CODE2" -ge 200 ] && [ "$HTTP_CODE2" -lt 300 ]; then
  echo "✓ S0047L01 uploaded successfully!"
  SUCCESS2=1
else
  echo "✗ S0047L01 upload failed!"
  SUCCESS2=0
fi

echo ""
echo "========================================"
echo "SUMMARY"
echo "========================================"

TOTAL=$((SUCCESS1 + SUCCESS2))
echo "Successfully uploaded: $TOTAL/2 baskets"

if [ $TOTAL -eq 2 ]; then
  echo "✓ All baskets uploaded successfully!"
  exit 0
else
  echo "✗ Some uploads failed. Please check the errors above."
  exit 1
fi
