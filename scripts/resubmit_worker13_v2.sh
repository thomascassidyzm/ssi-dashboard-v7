#!/bin/bash

# Worker 13 Basket Resubmission Script (v2)
# LEGOs: S0121L07, S0122L01
# Endpoint: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket

ENDPOINT="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"
COURSE="zho_for_eng"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Test endpoint availability
echo -e "${BLUE}Testing endpoint connectivity...${NC}"
if ! curl -s --max-time 5 -H "ngrok-skip-browser-warning: true" "${ENDPOINT%/*}/health" > /dev/null 2>&1; then
    echo -e "${RED}✗ Endpoint is not accessible${NC}"
    echo -e "${YELLOW}Please ensure the ngrok tunnel is active and the endpoint is correct${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Endpoint is accessible${NC}"
echo ""

# Function to upload basket with retry logic
upload_basket() {
    local seed_id=$1
    local lego_id=$2
    local json_file=$3

    echo -e "${BLUE}Uploading ${lego_id} (${seed_id})...${NC}"

    # Retry up to 3 times
    for i in {1..3}; do
        # Use temporary files for response
        response_file=$(mktemp)
        http_code=$(curl -s -o "$response_file" -w "%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -H "ngrok-skip-browser-warning: true" \
            --max-time 30 \
            -d @"${json_file}" \
            "${ENDPOINT}")

        body=$(cat "$response_file")
        rm -f "$response_file"

        if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
            echo -e "${GREEN}✓ ${lego_id} uploaded successfully (HTTP $http_code)${NC}"
            echo "  Response: $body"
            return 0
        else
            echo -e "${RED}✗ Attempt $i failed (HTTP $http_code)${NC}"
            if [ -n "$body" ]; then
                echo "  Response: $body"
            else
                echo "  Response: (empty)"
            fi
            if [ $i -lt 3 ]; then
                echo "  Retrying in 2 seconds..."
                sleep 2
            fi
        fi
    done

    echo -e "${RED}✗ Failed to upload ${lego_id} after 3 attempts${NC}"
    return 1
}

# Create temporary directory for JSON payloads
TMP_DIR=$(mktemp -d)
echo "Using temporary directory: $TMP_DIR"

# S0121L07 - "It's unusual" / "很不寻常"
cat > "$TMP_DIR/S0121L07.json" << 'EOF'
{
  "course": "zho_for_eng",
  "seed": "S0121",
  "baskets": {
    "S0121L07": {
      "lego_id": "S0121L07",
      "practice_phrases": [
        {
          "known": "It's unusual.",
          "target": "很不寻常。"
        },
        {
          "known": "It's unusual now.",
          "target": "现在很不寻常。"
        },
        {
          "known": "It's unusual you said that.",
          "target": "你说那个很不寻常。"
        },
        {
          "known": "It's unusual when you speak Chinese.",
          "target": "你说中文的时候很不寻常。"
        },
        {
          "known": "It's unusual you want to learn.",
          "target": "你想学很不寻常。"
        },
        {
          "known": "It's unusual you don't like to go by bus.",
          "target": "你不喜欢坐公交车很不寻常。"
        },
        {
          "known": "It's unusual you feel better today than yesterday.",
          "target": "你今天觉得比昨天好很不寻常。"
        },
        {
          "known": "It's unusual you don't want to speak with me tomorrow.",
          "target": "你不想明天和我说话很不寻常。"
        },
        {
          "known": "It's unusual when we meet people who don't like to use your car.",
          "target": "我们见不喜欢用你的车的人很不寻常。"
        },
        {
          "known": "It's unusual that you don't like to use your car.",
          "target": "你不喜欢用你的车很不寻常。"
        }
      ]
    }
  }
}
EOF

# S0122L01 - "easier" / "容易"
cat > "$TMP_DIR/S0122L01.json" << 'EOF'
{
  "course": "zho_for_eng",
  "seed": "S0122",
  "baskets": {
    "S0122L01": {
      "lego_id": "S0122L01",
      "practice_phrases": [
        {
          "known": "It's easier.",
          "target": "更容易。"
        },
        {
          "known": "Learning is easier now.",
          "target": "现在学习更容易。"
        },
        {
          "known": "I think it's easier.",
          "target": "我认为更容易。"
        },
        {
          "known": "Speaking Chinese is easier.",
          "target": "说中文更容易。"
        },
        {
          "known": "I feel learning is easier today.",
          "target": "我觉得今天学习更容易。"
        },
        {
          "known": "Speaking is easier than before.",
          "target": "说话比以前更容易。"
        },
        {
          "known": "I feel as if learning is easier now than yesterday.",
          "target": "我觉得现在学习比昨天更容易。"
        },
        {
          "known": "Speaking Chinese is definitely easier than last time.",
          "target": "说中文肯定比上次更容易。"
        },
        {
          "known": "I'm starting to feel learning is easier than before.",
          "target": "我开始觉得学习比以前更容易。"
        },
        {
          "known": "I think speaking Chinese is easier now than when we were in the pub.",
          "target": "我认为现在说中文比我们在酒吧的时候更容易。"
        }
      ]
    }
  }
}
EOF

# Upload both LEGOs
echo -e "${BLUE}Starting Worker 13 basket uploads...${NC}"
echo ""

success_count=0
upload_basket "S0121" "S0121L07" "$TMP_DIR/S0121L07.json" && ((success_count++))
echo ""
upload_basket "S0122" "S0122L01" "$TMP_DIR/S0122L01.json" && ((success_count++))

# Clean up
rm -rf "$TMP_DIR"

# Final report
echo ""
echo "========================================="
if [ $success_count -eq 2 ]; then
    echo -e "${GREEN}✅ Worker 13 resubmitted: 2 LEGOs${NC}"
    exit 0
else
    echo -e "${RED}⚠ Worker 13 completed with errors: $success_count/2 LEGOs uploaded${NC}"
    exit 1
fi
