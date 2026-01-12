#!/bin/bash

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"
COURSE="zho_for_eng"

# S0115L03 basket
echo "Uploading S0115L03..."
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  --retry 3 \
  --retry-delay 2 \
  -d '{
  "course": "zho_for_eng",
  "seed": "S0115",
  "baskets": {
    "S0115L03": {
      "lego_id": "S0115L03",
      "practice_phrases": [
        {"known": "I don'\''t feel as if I'\''m ready to have a conversation with them.", "target": "我不觉得我已经准备好和他们进行一次对话。"},
        {"known": "I don'\''t feel as if I'\''m ready to have a conversation right now.", "target": "我不觉得我现在已经准备好进行一次对话。"},
        {"known": "I don'\''t feel as if I'\''m ready to have a serious conversation.", "target": "我不觉得我已经准备好进行一次严肃的对话。"},
        {"known": "I don'\''t feel as if I'\''m ready to have a long conversation.", "target": "我不觉得我已经准备好进行一次长对话。"},
        {"known": "I don'\''t feel as if I'\''m ready to have a conversation about this topic.", "target": "我不觉得我已经准备好就这个话题进行一次对话。"},
        {"known": "I don'\''t feel as if I'\''m ready to have a conversation in Chinese yet.", "target": "我不觉得我已经准备好用中文进行一次对话了。"},
        {"known": "I don'\''t feel as if I'\''m ready to have a conversation with my teacher.", "target": "我不觉得我已经准备好和我的老师进行一次对话。"},
        {"known": "I don'\''t feel as if I'\''m ready to have a conversation about my future.", "target": "我不觉得我已经准备好谈论我的未来进行一次对话。"},
        {"known": "I don'\''t feel as if I'\''m ready to have a difficult conversation today.", "target": "我不觉得我今天已经准备好进行一次困难的对话。"},
        {"known": "I don'\''t feel as if I'\''m ready to have a conversation without help.", "target": "我不觉得我已经准备好在没有帮助的情况下进行一次对话。"}
      ]
    }
  }
}'

if [ $? -eq 0 ]; then
  echo -e "\n✅ S0115L03 uploaded successfully"
else
  echo -e "\n❌ S0115L03 upload failed"
  exit 1
fi

echo -e "\n---\n"

# S0116L01 basket
echo "Uploading S0116L01..."
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  --retry 3 \
  --retry-delay 2 \
  -d '{
  "course": "zho_for_eng",
  "seed": "S0116",
  "baskets": {
    "S0116L01": {
      "lego_id": "S0116L01",
      "practice_phrases": [
        {"known": "This isn'\''t my book.", "target": "这不是我的书。"},
        {"known": "This isn'\''t right.", "target": "这不是对的。"},
        {"known": "This isn'\''t what I wanted.", "target": "这不是我想要的。"},
        {"known": "This isn'\''t easy.", "target": "这不是容易的。"},
        {"known": "This isn'\''t my first time.", "target": "这不是我第一次。"},
        {"known": "This isn'\''t fair.", "target": "这不是公平的。"},
        {"known": "This isn'\''t the answer I was looking for.", "target": "这不是我在寻找的答案。"},
        {"known": "This isn'\''t going to work.", "target": "这不是会奏效的。"},
        {"known": "This isn'\''t what we discussed yesterday.", "target": "这不是我们昨天讨论的。"},
        {"known": "This isn'\''t the best solution.", "target": "这不是最好的解决方案。"}
      ]
    }
  }
}'

if [ $? -eq 0 ]; then
  echo -e "\n✅ S0116L01 uploaded successfully"
else
  echo -e "\n❌ S0116L01 upload failed"
  exit 1
fi

echo -e "\n=========================================="
echo "✅ Worker 1 resubmitted: 2 LEGOs"
echo "=========================================="
