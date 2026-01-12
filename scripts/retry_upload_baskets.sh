#!/bin/bash

# Retry upload script for S0049L02 and S0050L02 baskets
# Run this when the ngrok endpoint is available

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"
MAX_RETRIES=5
RETRY_DELAY=3

echo "============================================================"
echo "BASKET UPLOAD RETRY - S0049L02 and S0050L02"
echo "============================================================"
echo "Endpoint: $ENDPOINT"
echo "Max retries: $MAX_RETRIES"
echo "Retry delay: ${RETRY_DELAY}s"
echo "============================================================"
echo ""

# Function to upload with retry
upload_with_retry() {
  local lego_id=$1
  local payload=$2
  local attempt=1

  while [ $attempt -le $MAX_RETRIES ]; do
    echo "[$lego_id] Attempt $attempt/$MAX_RETRIES..."

    response=$(curl -k -X POST "$ENDPOINT" \
      -H "Content-Type: application/json" \
      -H "ngrok-skip-browser-warning: true" \
      -d "$payload" \
      -w "\n%{http_code}" \
      -s)

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
      echo "[$lego_id] ✅ SUCCESS (HTTP $http_code)"
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
      return 0
    else
      echo "[$lego_id] ❌ Failed (HTTP $http_code)"
      if [ $attempt -lt $MAX_RETRIES ]; then
        echo "[$lego_id] Waiting ${RETRY_DELAY}s before retry..."
        sleep $RETRY_DELAY
      fi
    fi

    attempt=$((attempt + 1))
  done

  echo "[$lego_id] ❌ All $MAX_RETRIES attempts failed"
  return 1
}

# S0049L02 Payload
S0049L02_PAYLOAD='{"course":"zho_for_eng","seed":"S0049","baskets":{"S0049L02":{"lego_id":"S0049L02","practice_phrases":[{"known":"I want to learn Chinese, if you know what I mean.","target":"我想学中文，你懂我的意思吧。"},{"known":"I'\''m trying to speak better, if you know what I mean.","target":"我在尝试说得更好，你懂我的意思吧。"},{"known":"I like speaking with people, if you know what I mean.","target":"我喜欢和人说话，你懂我的意思吧。"},{"known":"I don'\''t want to make mistakes, if you know what I mean.","target":"我不想犯错，你懂我的意思吧。"},{"known":"I'\''m not sure how to explain, if you know what I mean.","target":"我不确定怎么解释，你懂我的意思吧。"},{"known":"I want to practise as often as possible, if you know what I mean.","target":"我想尽可能常练习，你懂我的意思吧。"},{"known":"I'\''m trying to improve quickly, if you know what I mean.","target":"我在尝试很快提高，你懂我的意思吧。"},{"known":"I think learning Chinese is useful, if you know what I mean.","target":"我认为学中文很有用，你懂我的意思吧。"},{"known":"I want to remember the whole sentence, if you know what I mean.","target":"我想记住整句话，你懂我的意思吧。"},{"known":"I'\''m looking forward to speaking with you tomorrow, if you know what I mean.","target":"我期待明天和你说话，你懂我的意思吧。"}]}}}'

# S0050L02 Payload
S0050L02_PAYLOAD='{"course":"zho_for_eng","seed":"S0050","baskets":{"S0050L02":{"lego_id":"S0050L02","practice_phrases":[{"known":"I am not trying to finish now.","target":"我不是在试图现在完成。"},{"known":"I am not trying to learn everything.","target":"我不是在试图学一切。"},{"known":"I am not trying to speak very well.","target":"我不是在试图说得很好。"},{"known":"I am not trying to answer quickly.","target":"我不是在试图很快回答。"},{"known":"I am not trying to remember the whole sentence.","target":"我不是在试图记住整句话。"},{"known":"I am not trying to improve as quickly as possible.","target":"我不是在试图尽快提高。"},{"known":"I am not trying to guess what the answer is.","target":"我不是在试图猜测答案是什么。"},{"known":"I am not trying to interrupt when you are speaking.","target":"我不是在试图在你说话时打断。"},{"known":"I am not trying to start before you finish.","target":"我不是在试图在你完成之前开始。"},{"known":"I am not trying to explain everything this morning.","target":"我不是在试图今天早上解释一切。"}]}}}'

# Upload S0049L02
upload_with_retry "S0049L02" "$S0049L02_PAYLOAD"
S0049_STATUS=$?

echo ""
echo "------------------------------------------------------------"
echo ""

# Upload S0050L02
upload_with_retry "S0050L02" "$S0050L02_PAYLOAD"
S0050_STATUS=$?

echo ""
echo "============================================================"
echo "UPLOAD SUMMARY"
echo "============================================================"

if [ $S0049_STATUS -eq 0 ]; then
  echo "✅ S0049L02: SUCCESS"
else
  echo "❌ S0049L02: FAILED"
fi

if [ $S0050_STATUS -eq 0 ]; then
  echo "✅ S0050L02: SUCCESS"
else
  echo "❌ S0050L02: FAILED"
fi

echo "============================================================"

if [ $S0049_STATUS -ne 0 ] || [ $S0050_STATUS -ne 0 ]; then
  exit 1
fi
