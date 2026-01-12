#!/bin/bash

# Script to submit S0022 and S0023 baskets to the upload-basket endpoint
# Generated: 2026-01-11
# Seeds: S0022 (4 LEGOs), S0023 (5 LEGOs)

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"

echo "========================================="
echo "Basket Upload Script - S0022 & S0023"
echo "========================================="
echo ""

# Counters
TOTAL=9
SUCCESS=0
FAILED=0

# S0022L01
echo "[1/$TOTAL] Submitting S0022L01..."
RESPONSE=$(curl -k -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -w "\n%{http_code}" \
  -d '{
  "course": "zho_for_eng",
  "seed": "S0022",
  "baskets": {
    "S0022L01": {
      "lego_id": "S0022L01",
      "practice_phrases": [
        {"known": "Because I want to", "target": "因为我想", "syllable_count": 4, "word_count": 4, "lego_count": 3, "position": 1},
        {"known": "Because you speak Chinese", "target": "因为你说中文", "syllable_count": 6, "word_count": 6, "lego_count": 3, "position": 2},
        {"known": "Because I want to, I'\''m learning", "target": "因为我想，我在学", "syllable_count": 7, "word_count": 7, "lego_count": 3, "position": 3},
        {"known": "Because I want to speak Chinese", "target": "因为我想说中文", "syllable_count": 7, "word_count": 7, "lego_count": 5, "position": 4},
        {"known": "Because I want to learn, I'\''m trying", "target": "因为我想学，我在尝试", "syllable_count": 9, "word_count": 9, "lego_count": 3, "position": 5},
        {"known": "Because I want to speak with you", "target": "因为我想跟你说", "syllable_count": 7, "word_count": 7, "lego_count": 4, "position": 6},
        {"known": "Because I want to speak with you, I'\''m learning Chinese", "target": "因为我想跟你说，我在学中文", "syllable_count": 12, "word_count": 12, "lego_count": 5, "position": 7},
        {"known": "Because I want to speak very well, I'\''m trying to learn", "target": "因为我想说得很好，我在尝试学", "syllable_count": 13, "word_count": 13, "lego_count": 4, "position": 8},
        {"known": "Because I want to speak Chinese, I want to practise", "target": "因为我想说中文，我想练习", "syllable_count": 11, "word_count": 11, "lego_count": 5, "position": 9},
        {"known": "Because I'\''m trying to learn Chinese, I want to speak with someone else", "target": "因为我在尝试学中文，我想跟别人说", "syllable_count": 15, "word_count": 15, "lego_count": 6, "position": 10}
      ]
    }
  }
}' 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✓ SUCCESS (HTTP $HTTP_CODE)"
  ((SUCCESS++))
else
  echo "✗ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi
echo ""

# S0022L04
echo "[2/$TOTAL] Submitting S0022L04..."
RESPONSE=$(curl -k -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -w "\n%{http_code}" \
  -d '{
  "course": "zho_for_eng",
  "seed": "S0022",
  "baskets": {
    "S0022L04": {
      "lego_id": "S0022L04",
      "practice_phrases": [
        {"known": "I want to meet you", "target": "我想见你", "syllable_count": 4, "word_count": 4, "lego_count": 3, "position": 1},
        {"known": "To meet someone else", "target": "见别人", "syllable_count": 3, "word_count": 3, "lego_count": 2, "position": 2},
        {"known": "I want to meet you tomorrow", "target": "我想明天见你", "syllable_count": 6, "word_count": 6, "lego_count": 3, "position": 3},
        {"known": "We want to meet you", "target": "我们想见你", "syllable_count": 5, "word_count": 5, "lego_count": 3, "position": 4},
        {"known": "I want to meet at six o'\''clock", "target": "我想在六点见", "syllable_count": 6, "word_count": 6, "lego_count": 3, "position": 5},
        {"known": "Because I want to meet you", "target": "因为我想见你", "syllable_count": 6, "word_count": 6, "lego_count": 4, "position": 6},
        {"known": "Because you speak Chinese, I want to meet you", "target": "因为你说中文，我想见你", "syllable_count": 10, "word_count": 10, "lego_count": 6, "position": 7},
        {"known": "We want to meet at six o'\''clock this evening", "target": "我们想今晚六点见", "syllable_count": 8, "word_count": 8, "lego_count": 3, "position": 8},
        {"known": "I want to meet someone else tomorrow", "target": "我想明天见别人", "syllable_count": 7, "word_count": 7, "lego_count": 4, "position": 9},
        {"known": "Because I'\''m trying to learn Chinese, I want to meet you", "target": "因为我在尝试学中文，我想见你", "syllable_count": 13, "word_count": 13, "lego_count": 5, "position": 10}
      ]
    }
  }
}' 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✓ SUCCESS (HTTP $HTTP_CODE)"
  ((SUCCESS++))
else
  echo "✗ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi
echo ""

# S0022L05
echo "[3/$TOTAL] Submitting S0022L05..."
RESPONSE=$(curl -k -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -w "\n%{http_code}" \
  -d '{
  "course": "zho_for_eng",
  "seed": "S0022",
  "baskets": {
    "S0022L05": {
      "lego_id": "S0022L05",
      "practice_phrases": [
        {"known": "People speak Chinese", "target": "人说中文", "syllable_count": 4, "word_count": 4, "lego_count": 3, "position": 1},
        {"known": "I want to meet people", "target": "我想见人", "syllable_count": 4, "word_count": 4, "lego_count": 4, "position": 2},
        {"known": "People speak very well", "target": "人说得很好", "syllable_count": 5, "word_count": 5, "lego_count": 2, "position": 3},
        {"known": "I want to meet people tomorrow", "target": "我想明天见人", "syllable_count": 6, "word_count": 6, "lego_count": 4, "position": 4},
        {"known": "Because people speak Chinese", "target": "因为人说中文", "syllable_count": 6, "word_count": 6, "lego_count": 4, "position": 5},
        {"known": "I want to meet people who speak", "target": "我想见说话的人", "syllable_count": 7, "word_count": 7, "lego_count": 5, "position": 6},
        {"known": "Because people speak Chinese very well", "target": "因为人说中文说得很好", "syllable_count": 10, "word_count": 10, "lego_count": 4, "position": 7},
        {"known": "Because you speak Chinese, I want to meet people", "target": "因为你说中文，我想见人", "syllable_count": 10, "word_count": 10, "lego_count": 7, "position": 8},
        {"known": "I want to meet people at six o'\''clock", "target": "我想在六点见人", "syllable_count": 7, "word_count": 7, "lego_count": 4, "position": 9},
        {"known": "Because I'\''m trying to learn Chinese, I want to meet people", "target": "因为我在尝试学中文，我想见人", "syllable_count": 13, "word_count": 13, "lego_count": 6, "position": 10}
      ]
    }
  }
}' 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✓ SUCCESS (HTTP $HTTP_CODE)"
  ((SUCCESS++))
else
  echo "✗ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi
echo ""

# S0022L08
echo "[4/$TOTAL] Submitting S0022L08..."
RESPONSE=$(curl -k -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -w "\n%{http_code}" \
  -d '{
  "course": "zho_for_eng",
  "seed": "S0022",
  "baskets": {
    "S0022L08": {
      "lego_id": "S0022L08",
      "practice_phrases": [
        {"known": "People who speak Chinese", "target": "说中文的人", "syllable_count": 5, "word_count": 5, "lego_count": 4, "position": 1},
        {"known": "I want to meet people who speak Chinese", "target": "我想见说中文的人", "syllable_count": 8, "word_count": 8, "lego_count": 7, "position": 2},
        {"known": "People who speak Chinese speak very well", "target": "说中文的人说得很好", "syllable_count": 9, "word_count": 9, "lego_count": 4, "position": 3},
        {"known": "I want to meet people who speak Chinese tomorrow", "target": "我想明天见说中文的人", "syllable_count": 10, "word_count": 10, "lego_count": 7, "position": 4},
        {"known": "I'\''m trying to meet people who speak Chinese", "target": "我在尝试见说中文的人", "syllable_count": 10, "word_count": 10, "lego_count": 6, "position": 5},
        {"known": "We want to meet people who speak Chinese", "target": "我们想见说中文的人", "syllable_count": 9, "word_count": 9, "lego_count": 7, "position": 6},
        {"known": "Because I want to learn, I want to meet people who speak Chinese", "target": "因为我想学，我想见说中文的人", "syllable_count": 13, "word_count": 13, "lego_count": 8, "position": 7},
        {"known": "People who speak Chinese speak with you very well", "target": "说中文的人跟你说得很好", "syllable_count": 11, "word_count": 11, "lego_count": 4, "position": 8},
        {"known": "Because I want to meet people who speak Chinese, I'\''m learning", "target": "因为我想见说中文的人，我在学", "syllable_count": 13, "word_count": 13, "lego_count": 8, "position": 9},
        {"known": "Because I want to meet people who speak Chinese.", "target": "因为我想见说中文的人。", "syllable_count": 10, "word_count": 10, "lego_count": 8, "position": 10}
      ]
    }
  }
}' 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✓ SUCCESS (HTTP $HTTP_CODE)"
  ((SUCCESS++))
else
  echo "✗ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi
echo ""

# S0023L02
echo "[5/$TOTAL] Submitting S0023L02..."
RESPONSE=$(curl -k -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -w "\n%{http_code}" \
  -d '{
  "course": "zho_for_eng",
  "seed": "S0023",
  "baskets": {
    "S0023L02": {
      "lego_id": "S0023L02",
      "practice_phrases": [
        {"known": "I want to speak soon", "target": "我想很快说", "syllable_count": 5, "word_count": 5, "lego_count": 2, "position": 1},
        {"known": "Soon I want to meet", "target": "很快我想见", "syllable_count": 5, "word_count": 5, "lego_count": 2, "position": 2},
        {"known": "I want to meet you soon", "target": "我想很快见你", "syllable_count": 6, "word_count": 6, "lego_count": 2, "position": 3},
        {"known": "I want to learn soon", "target": "我想很快学", "syllable_count": 5, "word_count": 5, "lego_count": 2, "position": 4},
        {"known": "Soon I want to speak Chinese", "target": "很快我想说中文", "syllable_count": 7, "word_count": 7, "lego_count": 2, "position": 5},
        {"known": "Because I want to learn soon", "target": "因为我想很快学", "syllable_count": 7, "word_count": 7, "lego_count": 2, "position": 6},
        {"known": "Soon I want to meet people who speak Chinese", "target": "很快我想见说中文的人", "syllable_count": 10, "word_count": 10, "lego_count": 2, "position": 7},
        {"known": "Because you speak Chinese, I want to speak with you soon", "target": "因为你说中文，我想很快跟你说", "syllable_count": 13, "word_count": 13, "lego_count": 2, "position": 8},
        {"known": "Because I want to meet people, I want to learn Chinese soon", "target": "因为我想见人，我想很快学中文", "syllable_count": 13, "word_count": 13, "lego_count": 2, "position": 9},
        {"known": "I'\''m trying to speak Chinese soon", "target": "我在尝试很快说中文", "syllable_count": 9, "word_count": 9, "lego_count": 2, "position": 10}
      ]
    }
  }
}' 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✓ SUCCESS (HTTP $HTTP_CODE)"
  ((SUCCESS++))
else
  echo "✗ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi
echo ""

# S0023L03
echo "[6/$TOTAL] Submitting S0023L03..."
RESPONSE=$(curl -k -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -w "\n%{http_code}" \
  -d '{
  "course": "zho_for_eng",
  "seed": "S0023",
  "baskets": {
    "S0023L03": {
      "lego_id": "S0023L03",
      "practice_phrases": [
        {"known": "I'\''m going to speak", "target": "我会说", "syllable_count": 3, "word_count": 3, "lego_count": 2, "position": 1},
        {"known": "You are going to learn", "target": "你会学", "syllable_count": 3, "word_count": 3, "lego_count": 1, "position": 2},
        {"known": "I'\''m going to meet you soon", "target": "我会很快见你", "syllable_count": 6, "word_count": 6, "lego_count": 3, "position": 3},
        {"known": "You are going to speak Chinese", "target": "你会说中文", "syllable_count": 5, "word_count": 5, "lego_count": 1, "position": 4},
        {"known": "Because I want to, I'\''m going to learn", "target": "因为我想，我会学", "syllable_count": 7, "word_count": 7, "lego_count": 2, "position": 5},
        {"known": "Soon I'\''m going to speak", "target": "我很快会说", "syllable_count": 5, "word_count": 5, "lego_count": 3, "position": 6},
        {"known": "I'\''m going to meet people who speak Chinese soon", "target": "我很快会见说中文的人", "syllable_count": 10, "word_count": 10, "lego_count": 3, "position": 7},
        {"known": "Because you speak Chinese, I'\''m going to learn", "target": "因为你说中文，我会学", "syllable_count": 9, "word_count": 9, "lego_count": 2, "position": 8},
        {"known": "Because I want to learn, I'\''m going to speak with you soon", "target": "因为我想学，我会很快跟你说", "syllable_count": 12, "word_count": 12, "lego_count": 3, "position": 9},
        {"known": "Soon I'\''m going to meet people and speak Chinese", "target": "我很快会见人和说中文", "syllable_count": 10, "word_count": 10, "lego_count": 3, "position": 10}
      ]
    }
  }
}' 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✓ SUCCESS (HTTP $HTTP_CODE)"
  ((SUCCESS++))
else
  echo "✗ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi
echo ""

# S0023L04
echo "[7/$TOTAL] Submitting S0023L04..."
RESPONSE=$(curl -k -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -w "\n%{http_code}" \
  -d '{
  "course": "zho_for_eng",
  "seed": "S0023",
  "baskets": {
    "S0023L04": {
      "lego_id": "S0023L04",
      "practice_phrases": [
        {"known": "I start to speak", "target": "我开始说", "syllable_count": 4, "word_count": 4, "lego_count": 2, "position": 1},
        {"known": "You start to learn", "target": "你开始学", "syllable_count": 4, "word_count": 4, "lego_count": 1, "position": 2},
        {"known": "I'\''m going to start soon", "target": "我会很快开始", "syllable_count": 6, "word_count": 6, "lego_count": 4, "position": 3},
        {"known": "I want to start learning Chinese", "target": "我想开始学中文", "syllable_count": 7, "word_count": 7, "lego_count": 2, "position": 4},
        {"known": "Soon I'\''m going to start speaking", "target": "我很快会开始说", "syllable_count": 7, "word_count": 7, "lego_count": 4, "position": 5},
        {"known": "Because I want to, I start to learn", "target": "因为我想，我开始学", "syllable_count": 8, "word_count": 8, "lego_count": 2, "position": 6},
        {"known": "I'\''m going to start to meet people who speak Chinese soon", "target": "我很快会开始见说中文的人", "syllable_count": 12, "word_count": 12, "lego_count": 4, "position": 7},
        {"known": "Because you speak Chinese, I want to start learning", "target": "因为你说中文，我想开始学", "syllable_count": 11, "word_count": 11, "lego_count": 2, "position": 8},
        {"known": "Because I want to learn, I start to speak with you", "target": "因为我想学，我开始跟你说", "syllable_count": 11, "word_count": 11, "lego_count": 2, "position": 9},
        {"known": "Soon I'\''m going to start speaking Chinese with people", "target": "我很快会开始跟人说中文", "syllable_count": 11, "word_count": 11, "lego_count": 4, "position": 10}
      ]
    }
  }
}' 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✓ SUCCESS (HTTP $HTTP_CODE)"
  ((SUCCESS++))
else
  echo "✗ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi
echo ""

# S0023L05
echo "[8/$TOTAL] Submitting S0023L05..."
RESPONSE=$(curl -k -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -w "\n%{http_code}" \
  -d '{
  "course": "zho_for_eng",
  "seed": "S0023",
  "baskets": {
    "S0023L05": {
      "lego_id": "S0023L05",
      "practice_phrases": [
        {"known": "I talking", "target": "我在说话", "syllable_count": 4, "word_count": 4, "lego_count": 2, "position": 1},
        {"known": "You talking", "target": "你在说话", "syllable_count": 4, "word_count": 4, "lego_count": 1, "position": 2},
        {"known": "I want talking", "target": "我想说话", "syllable_count": 4, "word_count": 4, "lego_count": 2, "position": 3},
        {"known": "I talking now", "target": "我现在说话", "syllable_count": 5, "word_count": 5, "lego_count": 2, "position": 4},
        {"known": "I want talking more", "target": "我想多说话", "syllable_count": 5, "word_count": 5, "lego_count": 3, "position": 5},
        {"known": "Start talking now", "target": "现在开始说话", "syllable_count": 6, "word_count": 6, "lego_count": 2, "position": 6},
        {"known": "I want start talking soon", "target": "我想很快开始说话", "syllable_count": 8, "word_count": 8, "lego_count": 4, "position": 7},
        {"known": "I want talking with people", "target": "我想跟别人说话", "syllable_count": 7, "word_count": 7, "lego_count": 2, "position": 8},
        {"known": "You want start talking in Chinese", "target": "你想开始用中文说话", "syllable_count": 9, "word_count": 9, "lego_count": 2, "position": 9},
        {"known": "I don'\''t want stop talking with people", "target": "我不想停止跟别人说话", "syllable_count": 10, "word_count": 10, "lego_count": 2, "position": 10}
      ]
    }
  }
}' 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✓ SUCCESS (HTTP $HTTP_CODE)"
  ((SUCCESS++))
else
  echo "✗ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi
echo ""

# S0023L06
echo "[9/$TOTAL] Submitting S0023L06..."
RESPONSE=$(curl -k -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -w "\n%{http_code}" \
  -d '{
  "course": "zho_for_eng",
  "seed": "S0023",
  "baskets": {
    "S0023L06": {
      "lego_id": "S0023L06",
      "practice_phrases": [
        {"known": "I want to speak more", "target": "我想多说", "syllable_count": 4, "word_count": 4, "lego_count": 2, "position": 1},
        {"known": "Learn more Chinese", "target": "多学中文", "syllable_count": 4, "word_count": 4, "lego_count": 1, "position": 2},
        {"known": "I'\''m going to speak more soon", "target": "我会很快多说", "syllable_count": 6, "word_count": 6, "lego_count": 4, "position": 3},
        {"known": "I want to start speaking more", "target": "我想开始多说", "syllable_count": 6, "word_count": 6, "lego_count": 3, "position": 4},
        {"known": "Soon I'\''m going to learn more", "target": "我很快会多学", "syllable_count": 6, "word_count": 6, "lego_count": 4, "position": 5},
        {"known": "Because I want to speak more", "target": "因为我想多说", "syllable_count": 6, "word_count": 6, "lego_count": 2, "position": 6},
        {"known": "I'\''m going to start talking more with people", "target": "我会开始多跟人说话", "syllable_count": 9, "word_count": 9, "lego_count": 5, "position": 7},
        {"known": "Because I want to learn more, I'\''m going to start soon", "target": "因为我想多学，我会很快开始", "syllable_count": 12, "word_count": 12, "lego_count": 5, "position": 8},
        {"known": "I want to speak more with people who speak Chinese", "target": "我想多跟说中文的人说", "syllable_count": 10, "word_count": 10, "lego_count": 2, "position": 9},
        {"known": "I'\''m going to start talking more soon.", "target": "我很快会开始多说话。", "syllable_count": 9, "word_count": 9, "lego_count": 6, "position": 10}
      ]
    }
  }
}' 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✓ SUCCESS (HTTP $HTTP_CODE)"
  ((SUCCESS++))
else
  echo "✗ FAILED (HTTP $HTTP_CODE)"
  ((FAILED++))
fi
echo ""

# Summary
echo "========================================="
echo "UPLOAD SUMMARY"
echo "========================================="
echo "Total payloads: $TOTAL"
echo "Successful:     $SUCCESS"
echo "Failed:         $FAILED"
echo ""
echo "Seeds processed: S0022 (4 LEGOs), S0023 (5 LEGOs)"
echo "========================================="
