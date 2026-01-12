#!/bin/bash

# Worker 7 Basket Resubmission Script
# Uploads S0015L07 and S0015L08 baskets to the new endpoint

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"

echo "Worker 7 Resubmission Script"
echo "============================="
echo ""

# Create S0015L07 basket
cat > /tmp/s0015l07_basket.json << 'JSONEOF'
{
  "course": "zho_for_eng",
  "seed": "S0015",
  "baskets": {
    "S0015L07": {
      "lego_id": "S0015L07",
      "practice_phrases": [
        {"known": "I want to speak with me.", "target": "我想和我说。"},
        {"known": "You speak with me.", "target": "你和我说。"},
        {"known": "I want you to speak with me.", "target": "我想让你和我说。"},
        {"known": "Speak with me tomorrow.", "target": "明天和我说。"},
        {"known": "Do you want to speak with me?", "target": "你想和我说吗？"},
        {"known": "I want to speak with you today.", "target": "我想今天和你说。"},
        {"known": "Speak with me in the coffee shop.", "target": "在咖啡馆和我说。"},
        {"known": "I want you to speak with me in Chinese.", "target": "我想让你用中文和我说。"},
        {"known": "Can you speak with me tomorrow in the coffee shop?", "target": "你能明天在咖啡馆和我说吗？"},
        {"known": "I want to speak with you, but I don't have time today.", "target": "我想和你说，但我今天没有时间。"}
      ]
    }
  }
}
JSONEOF

# Create S0015L08 basket
cat > /tmp/s0015l08_basket.json << 'JSONEOF'
{
  "course": "zho_for_eng",
  "seed": "S0015",
  "baskets": {
    "S0015L08": {
      "lego_id": "S0015L08",
      "practice_phrases": [
        {"known": "I want you to speak with me tomorrow.", "target": "我想让你明天和我说。"},
        {"known": "I want you to speak with me today.", "target": "我想让你今天和我说。"},
        {"known": "Do you want me to speak with you tomorrow?", "target": "你想让我明天和你说吗？"},
        {"known": "I want you to speak with me tomorrow in Chinese.", "target": "我想让你明天用中文和我说。"},
        {"known": "I want you to speak with me tomorrow in the coffee shop.", "target": "我想让你明天在咖啡馆和我说。"},
        {"known": "Can you speak with me tomorrow?", "target": "你能明天和我说吗？"},
        {"known": "I want you to speak with me tomorrow, but I have work.", "target": "我想让你明天和我说，但我有工作。"},
        {"known": "I want you to speak with me tomorrow in the coffee shop in Chinese.", "target": "我想让你明天在咖啡馆用中文和我说。"},
        {"known": "I want you to speak with me tomorrow, but do you have time?", "target": "我想让你明天和我说，但你有时间吗？"},
        {"known": "I really want you to speak with me tomorrow in the coffee shop about this.", "target": "我真的想让你明天在咖啡馆和我说这个。"}
      ]
    }
  }
}
JSONEOF

echo "Uploading S0015L07 basket..."
RESPONSE1=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d @/tmp/s0015l07_basket.json)

HTTP_CODE1=$(echo "$RESPONSE1" | tail -n 1)
BODY1=$(echo "$RESPONSE1" | head -n -1)

if [ "$HTTP_CODE1" = "200" ] || [ "$HTTP_CODE1" = "201" ]; then
  echo "✅ S0015L07 uploaded successfully (HTTP $HTTP_CODE1)"
  echo "   Response: $BODY1"
else
  echo "❌ S0015L07 upload failed (HTTP $HTTP_CODE1)"
  echo "   Response: $BODY1"
fi

echo ""
echo "Uploading S0015L08 basket..."
RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d @/tmp/s0015l08_basket.json)

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n 1)
BODY2=$(echo "$RESPONSE2" | head -n -1)

if [ "$HTTP_CODE2" = "200" ] || [ "$HTTP_CODE2" = "201" ]; then
  echo "✅ S0015L08 uploaded successfully (HTTP $HTTP_CODE2)"
  echo "   Response: $BODY2"
else
  echo "❌ S0015L08 upload failed (HTTP $HTTP_CODE2)"
  echo "   Response: $BODY2"
fi

echo ""
echo "============================="
echo "Worker 7 Resubmission Complete"
echo "Total LEGOs attempted: 2"

# Cleanup
rm -f /tmp/s0015l07_basket.json /tmp/s0015l08_basket.json
