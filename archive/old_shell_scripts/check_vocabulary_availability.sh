#!/bin/bash
echo "=== VOCABULARY AVAILABILITY ANALYSIS ==="
echo ""
echo "S0006 (early seed) - 18 cumulative LEGOs:"
jq -r '.cumulative_legos' agent_generated_baskets_s0006_s0030/lego_baskets_s0006.json
jq -r '.S0006L01.available_legos' agent_generated_baskets_s0006_s0030/lego_baskets_s0006.json
echo ""
echo "S0030 (late seed) - 91 cumulative LEGOs:"
jq -r '.cumulative_legos' agent_generated_baskets_s0006_s0030/lego_baskets_s0030.json
jq -r '.S0030L01.available_legos' agent_generated_baskets_s0006_s0030/lego_baskets_s0030.json
echo ""
echo "=== CHECKING S0030L02 (the one with 7 short phrases) ==="
echo "Sample phrases from S0030L02:"
jq -r '.S0030L02.practice_phrases[] | "[\(.[3])] \(.[0])"' agent_generated_baskets_s0006_s0030/lego_baskets_s0030.json
