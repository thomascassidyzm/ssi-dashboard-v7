#!/bin/bash
echo "=== S0006L01 Phrase Distribution Comparison ==="
echo ""
echo "ORIGINAL:"
jq -r '.S0006L01.phrase_distribution' public/vfs/courses/spa_for_eng/baskets/lego_baskets_s0006.json
echo ""
echo "AGENT:"
jq -r '.S0006L01.phrase_distribution' agent_generated_baskets_s0006_s0030/lego_baskets_s0006.json
echo ""
echo "=== S0006L01 Sample Phrases ==="
echo ""
echo "ORIGINAL phrase count:"
jq '.S0006L01.practice_phrases | length' public/vfs/courses/spa_for_eng/baskets/lego_baskets_s0006.json
echo ""
echo "AGENT phrase count:"
jq '.S0006L01.practice_phrases | length' agent_generated_baskets_s0006_s0030/lego_baskets_s0006.json
