#!/bin/bash
echo "=== WHAT DOES THE COUNT MEAN? ==="
echo ""
echo "S0030L02 phrases with actual word counts:"
jq -r '.S0030L02.practice_phrases[] | "\nEnglish: \(.[0]) (count in file: \(.[3]))\nSpanish: \(.[1])\nActual EN words: \(.[0] | split(" ") | length)\nActual ES words: \(.[1] | split(" ") | length)"' agent_generated_baskets_s0006_s0030/lego_baskets_s0030.json | head -40
