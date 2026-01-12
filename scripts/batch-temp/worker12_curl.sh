#!/bin/bash

# Worker 12 Resubmission - Using curl
# LEGOs: S0121L05, S0121L06

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"
COURSE="zho_for_eng"
SEED="S0121"

echo "🚀 Worker 12 Resubmission (curl)"
echo "   Endpoint: $ENDPOINT"
echo ""

# S0121L05 payload
S0121L05_JSON=$(cat <<'EOF'
{
  "course": "zho_for_eng",
  "seed": "S0121",
  "baskets": {
    "S0121L05": {
      "lego_id": "S0121L05",
      "practice_phrases": [
        {"known": "I use it", "target": "我用它"},
        {"known": "you use it", "target": "你用它"},
        {"known": "I want to use it", "target": "我想用它"},
        {"known": "I don't want to use that", "target": "我不想用那个"},
        {"known": "I like to use this", "target": "我喜欢用这个"},
        {"known": "you don't like to use it", "target": "你不喜欢用它"},
        {"known": "I want to use your car", "target": "我想用你的车"},
        {"known": "I don't like to use it", "target": "我不喜欢用它"},
        {"known": "do you want to use this?", "target": "你想用这个吗?"},
        {"known": "I like to use it", "target": "我喜欢用它"}
      ]
    }
  }
}
EOF
)

# S0121L06 payload
S0121L06_JSON=$(cat <<'EOF'
{
  "course": "zho_for_eng",
  "seed": "S0121",
  "baskets": {
    "S0121L06": {
      "lego_id": "S0121L06",
      "practice_phrases": [
        {"known": "I don't like to use your car", "target": "我不喜欢用你的车"},
        {"known": "you don't like to use your car", "target": "你不喜欢用你的车"},
        {"known": "I don't like to use your car today", "target": "我今天不喜欢用你的车"},
        {"known": "do you like to use your car?", "target": "你喜欢用你的车吗?"},
        {"known": "I don't like to use your car at work", "target": "我不喜欢在工作时用你的车"},
        {"known": "you don't like to use your car here", "target": "你不喜欢在这里用你的车"},
        {"known": "I don't want to use your car", "target": "我不想用你的车"},
        {"known": "why don't you like to use your car?", "target": "你为什么不喜欢用你的车?"},
        {"known": "I really don't like to use your car", "target": "我真的不喜欢用你的车"},
        {"known": "I don't like to use your car much", "target": "我不太喜欢用你的车"}
      ]
    }
  }
}
EOF
)

# Upload S0121L05
echo "============================================================"
echo "Uploading S0121L05 (A-type: use / 用)"
echo "============================================================"

RESPONSE=$(curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d "$S0121L05_JSON" \
  --max-time 30 \
  --retry 3 \
  --retry-delay 2 \
  -s -w "\n%{http_code}" \
  2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✅ S0121L05 uploaded successfully (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
else
  echo "❌ S0121L05 failed (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
fi

echo ""
sleep 2

# Upload S0121L06
echo "============================================================"
echo "Uploading S0121L06 (M-type: don't like to use your car)"
echo "============================================================"

RESPONSE=$(curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d "$S0121L06_JSON" \
  --max-time 30 \
  --retry 3 \
  --retry-delay 2 \
  -s -w "\n%{http_code}" \
  2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✅ S0121L06 uploaded successfully (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
else
  echo "❌ S0121L06 failed (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
fi

echo ""
echo "============================================================"
echo "✅ Worker 12 resubmitted: 2 LEGOs"
echo "============================================================"
