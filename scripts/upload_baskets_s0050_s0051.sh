#!/bin/bash

# Upload baskets for S0050L04 and S0051L02 to the new /upload-basket endpoint

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"

echo "========================================"
echo "Uploading baskets for S0050L04 and S0051L02"
echo "========================================"

# Basket data for S0050L04
S0050L04_JSON='{
  "course": "zho_for_eng",
  "seed": "S0050",
  "baskets": {
    "S0050L04": {
      "lego_id": "S0050L04",
      "practice_phrases": [
        {"known": "As quickly as possible.", "target": "尽快。"},
        {"known": "I need to finish as quickly as possible.", "target": "我需要尽快完成。"},
        {"known": "Can you come as quickly as possible?", "target": "你能尽快来吗？"},
        {"known": "I want to learn as quickly as possible.", "target": "我想尽快学。"},
        {"known": "I need to answer as quickly as possible.", "target": "我需要尽快回答。"},
        {"known": "I'\''m trying to improve as quickly as possible.", "target": "我在试图尽快提高。"},
        {"known": "I want to go back and finish as quickly as possible.", "target": "我想回去尽快完成。"},
        {"known": "I don'\''t need to finish as quickly as possible, if you know what I mean.", "target": "我不需要尽快完成，你懂我的意思吧。"},
        {"known": "I'\''m not trying to finish as quickly as possible, it'\''s like this.", "target": "我不是在试图尽快完成，就是这样。"},
        {"known": "I'\''m not trying to finish as quickly as possible.", "target": "我不是在试图尽快地完成。"}
      ]
    }
  }
}'

# Basket data for S0051L02
S0051L02_JSON='{
  "course": "zho_for_eng",
  "seed": "S0051",
  "baskets": {
    "S0051L02": {
      "lego_id": "S0051L02",
      "practice_phrases": [
        {"known": "I enjoy this.", "target": "我喜欢这个。"},
        {"known": "I enjoy Chinese.", "target": "我喜欢中文。"},
        {"known": "I enjoy speaking.", "target": "我喜欢说话。"},
        {"known": "I enjoy learning.", "target": "我喜欢学习。"},
        {"known": "We enjoy speaking Chinese.", "target": "我们喜欢说中文。"},
        {"known": "I enjoy speaking now.", "target": "我现在喜欢说。"},
        {"known": "I enjoy learning Chinese.", "target": "我喜欢学中文。"},
        {"known": "We enjoy speaking this morning.", "target": "我们今天早上喜欢说。"},
        {"known": "I enjoy speaking Chinese now.", "target": "我现在喜欢说中文。"},
        {"known": "I enjoy learning now.", "target": "我现在喜欢学。"}
      ]
    }
  }
}'

upload_basket() {
  local lego_id="$1"
  local json_data="$2"
  local max_retries=3

  echo ""
  echo "--- Uploading $lego_id ---"

  for attempt in $(seq 1 $max_retries); do
    echo "[$lego_id] Attempt $attempt/$max_retries..."

    response=$(curl -k -s -w "\n%{http_code}" \
      -X POST \
      -H "Content-Type: application/json" \
      -H "ngrok-skip-browser-warning: true" \
      -d "$json_data" \
      "$ENDPOINT" 2>&1)

    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n 1)
    # Extract body (everything except last line)
    body=$(echo "$response" | sed '$d')

    echo "[$lego_id] Response status: $status_code"

    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
      echo "[$lego_id] ✓ SUCCESS"
      echo "[$lego_id] Response: $body"
      return 0
    else
      echo "[$lego_id] ✗ FAILED - Status $status_code"
      echo "[$lego_id] Response: $body"

      if [ $attempt -lt $max_retries ]; then
        delay=$((attempt * 2))
        echo "[$lego_id] Retrying in ${delay}s..."
        sleep $delay
      fi
    fi
  done

  return 1
}

# Upload S0050L04
upload_basket "S0050L04" "$S0050L04_JSON"
result1=$?

# Wait a bit between uploads
sleep 1

# Upload S0051L02
upload_basket "S0051L02" "$S0051L02_JSON"
result2=$?

# Summary
echo ""
echo "========================================"
echo "UPLOAD SUMMARY"
echo "========================================"

if [ $result1 -eq 0 ]; then
  echo "S0050L04: ✓ SUCCESS"
else
  echo "S0050L04: ✗ FAILED"
fi

if [ $result2 -eq 0 ]; then
  echo "S0051L02: ✓ SUCCESS"
else
  echo "S0051L02: ✗ FAILED"
fi

echo ""
if [ $result1 -eq 0 ] && [ $result2 -eq 0 ]; then
  echo "Overall: ✓ ALL UPLOADS SUCCESSFUL"
  exit 0
else
  echo "Overall: ✗ SOME UPLOADS FAILED"
  exit 1
fi
