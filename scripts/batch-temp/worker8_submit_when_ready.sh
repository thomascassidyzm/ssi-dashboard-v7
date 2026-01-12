#!/bin/bash

# Worker 8 Submission Script - Run when endpoint is accessible
# Usage: ./worker8_submit_when_ready.sh [ENDPOINT_URL]

ENDPOINT="${1:-https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket}"
BASE_DIR="/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/batch-temp"

echo "=========================================="
echo "Worker 8 Basket Submission"
echo "=========================================="
echo "Endpoint: $ENDPOINT"
echo ""

submit_basket() {
  local file=$1
  local lego=$2

  echo "📦 Submitting $lego..."

  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "ngrok-skip-browser-warning: true" \
    --data @"$file" \
    --max-time 30 \
    "$ENDPOINT")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "✅ $lego: SUCCESS (HTTP $http_code)"
    echo "   Response: ${body:0:100}..."
    return 0
  else
    echo "❌ $lego: FAILED (HTTP $http_code)"
    echo "   Response: $body"
    return 1
  fi
}

# Test endpoint connectivity first
echo "🔍 Testing endpoint connectivity..."
if curl -s -I -H "ngrok-skip-browser-warning: true" --max-time 10 "$ENDPOINT" > /dev/null 2>&1; then
  echo "✅ Endpoint is reachable"
else
  echo "❌ Endpoint not reachable - check URL and network"
  exit 1
fi

echo ""

# Submit baskets
success_count=0

submit_basket "$BASE_DIR/worker8_s0119l04.json" "S0119L04" && ((success_count++))
echo ""

submit_basket "$BASE_DIR/worker8_s0120l01.json" "S0120L01" && ((success_count++))
echo ""

# Summary
echo "=========================================="
echo "SUBMISSION SUMMARY"
echo "=========================================="
echo "Successful: $success_count/2"

if [ $success_count -eq 2 ]; then
  echo "✅ Worker 8 resubmitted: 2 LEGOs"
  exit 0
else
  echo "⚠️  Worker 8 partial completion: $success_count/2 LEGOs"
  exit 1
fi
