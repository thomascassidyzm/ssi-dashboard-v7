#!/bin/bash

# Worker 6 Basket Submission Script
# LEGOs: S0118L04, S0119L01
# Endpoint: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"
COURSE_DIR="/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/zho_for_eng"
MAX_RETRIES=3
RETRY_DELAY=2

# Function to submit with retry logic
submit_basket() {
    local file_path="$1"
    local lego_id="$2"
    local attempt=1

    echo "Reading basket from: $file_path"

    if [ ! -f "$file_path" ]; then
        echo "❌ File not found: $file_path"
        return 1
    fi

    while [ $attempt -le $MAX_RETRIES ]; do
        echo "Submitting $lego_id (attempt $attempt/$MAX_RETRIES)..."

        http_code=$(curl -k -s -o /tmp/response.txt -w "%{http_code}" \
            -X POST "$ENDPOINT" \
            -H "Content-Type: application/json" \
            -d @"$file_path")

        if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
            echo "✅ Successfully submitted $lego_id"
            cat /tmp/response.txt
            echo ""
            return 0
        else
            echo "❌ Failed (HTTP $http_code)"
            cat /tmp/response.txt
            echo ""
            if [ $attempt -lt $MAX_RETRIES ]; then
                echo "Retrying in ${RETRY_DELAY}s..."
                sleep $RETRY_DELAY
            fi
        fi

        attempt=$((attempt + 1))
    done

    echo "❌ Failed to submit $lego_id after $MAX_RETRIES attempts"
    return 1
}

echo "======================================"
echo "Worker 6 Basket Submission"
echo "======================================"
echo "Endpoint: $ENDPOINT"
echo ""

# Test connectivity first
echo "Testing endpoint connectivity..."
test_response=$(curl -k -s -o /dev/null -w "%{http_code}" -X GET "$ENDPOINT/../health" 2>&1)
if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Endpoint may not be reachable"
    echo "Proceeding anyway..."
else
    echo "Endpoint responded with HTTP $test_response"
fi
echo ""

success_count=0

# Submit S0118L04
if submit_basket "$COURSE_DIR/worker6_s0118l04_basket.json" "S0118L04"; then
    success_count=$((success_count + 1))
fi

echo ""

# Submit S0119L01
if submit_basket "$COURSE_DIR/worker6_s0119l01_basket.json" "S0119L01"; then
    success_count=$((success_count + 1))
fi

echo ""
echo "======================================"
echo "Submission complete: $success_count/2 LEGOs submitted successfully"
echo "======================================"

if [ $success_count -eq 2 ]; then
    echo "✅ Worker 6 resubmitted: 2 LEGOs"
    exit 0
else
    echo "⚠️  Some submissions failed ($success_count/2 successful)"
    exit 1
fi
