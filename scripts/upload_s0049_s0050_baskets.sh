#!/bin/bash

# Upload baskets for S0049L02 and S0050L02 using curl

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"

echo "============================================================"
echo "BASKET UPLOAD - S0049L02 and S0050L02"
echo "============================================================"
echo "Endpoint: $ENDPOINT"
echo "Course: zho_for_eng"
echo "LEGOs: S0049L02, S0050L02"
echo "============================================================"
echo ""

# S0049L02 Basket
echo "[S0049L02] Uploading basket..."
S0049L02_PAYLOAD='{
  "course": "zho_for_eng",
  "seed": "S0049",
  "baskets": {
    "S0049L02": {
      "lego_id": "S0049L02",
      "practice_phrases": [
        { "known": "I want to learn Chinese, if you know what I mean.", "target": "我想学中文，你懂我的意思吧。" },
        { "known": "I'\''m trying to speak better, if you know what I mean.", "target": "我在尝试说得更好，你懂我的意思吧。" },
        { "known": "I like speaking with people, if you know what I mean.", "target": "我喜欢和人说话，你懂我的意思吧。" },
        { "known": "I don'\''t want to make mistakes, if you know what I mean.", "target": "我不想犯错，你懂我的意思吧。" },
        { "known": "I'\''m not sure how to explain, if you know what I mean.", "target": "我不确定怎么解释，你懂我的意思吧。" },
        { "known": "I want to practise as often as possible, if you know what I mean.", "target": "我想尽可能常练习，你懂我的意思吧。" },
        { "known": "I'\''m trying to improve quickly, if you know what I mean.", "target": "我在尝试很快提高，你懂我的意思吧。" },
        { "known": "I think learning Chinese is useful, if you know what I mean.", "target": "我认为学中文很有用，你懂我的意思吧。" },
        { "known": "I want to remember the whole sentence, if you know what I mean.", "target": "我想记住整句话，你懂我的意思吧。" },
        { "known": "I'\''m looking forward to speaking with you tomorrow, if you know what I mean.", "target": "我期待明天和你说话，你懂我的意思吧。" }
      ]
    }
  }
}'

curl -k -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d "$S0049L02_PAYLOAD" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

if [ $? -eq 0 ]; then
  echo "[S0049L02] ✅ Upload complete"
else
  echo "[S0049L02] ❌ Upload failed"
fi

echo ""
echo "------------------------------------------------------------"
echo ""

# S0050L02 Basket
echo "[S0050L02] Uploading basket..."
S0050L02_PAYLOAD='{
  "course": "zho_for_eng",
  "seed": "S0050",
  "baskets": {
    "S0050L02": {
      "lego_id": "S0050L02",
      "practice_phrases": [
        { "known": "I am not trying to finish now.", "target": "我不是在试图现在完成。" },
        { "known": "I am not trying to learn everything.", "target": "我不是在试图学一切。" },
        { "known": "I am not trying to speak very well.", "target": "我不是在试图说得很好。" },
        { "known": "I am not trying to answer quickly.", "target": "我不是在试图很快回答。" },
        { "known": "I am not trying to remember the whole sentence.", "target": "我不是在试图记住整句话。" },
        { "known": "I am not trying to improve as quickly as possible.", "target": "我不是在试图尽快提高。" },
        { "known": "I am not trying to guess what the answer is.", "target": "我不是在试图猜测答案是什么。" },
        { "known": "I am not trying to interrupt when you are speaking.", "target": "我不是在试图在你说话时打断。" },
        { "known": "I am not trying to start before you finish.", "target": "我不是在试图在你完成之前开始。" },
        { "known": "I am not trying to explain everything this morning.", "target": "我不是在试图今天早上解释一切。" }
      ]
    }
  }
}'

curl -k -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d "$S0050L02_PAYLOAD" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

if [ $? -eq 0 ]; then
  echo "[S0050L02] ✅ Upload complete"
else
  echo "[S0050L02] ❌ Upload failed"
fi

echo ""
echo "============================================================"
echo "UPLOAD COMPLETE"
echo "============================================================"
