#!/bin/bash
echo "=== NEW AGENTS PERFORMANCE ANALYSIS ==="
echo ""

echo "Agent 6 (S0031-S0035) - Claims 100% GATE compliance:"
for seed in 0031 0032 0033 0034 0035; do
  if [ -f "agent_generated_baskets_s0006_s0030/lego_baskets_s${seed}.json" ]; then
    echo "S${seed}:"
    jq -r 'to_entries[] | select(.key | startswith("S")) | .key + ": short:\(.value.phrase_distribution.really_short_1_2) qshort:\(.value.phrase_distribution.quite_short_3) longer:\(.value.phrase_distribution.longer_4_5) LONG:\(.value.phrase_distribution.long_6_plus)' "agent_generated_baskets_s0006_s0030/lego_baskets_s${seed}.json" 2>/dev/null | head -6
  else
    echo "S${seed}: FILE NOT FOUND"
  fi
done

echo ""
echo "Agent 7 (S0036-S0040) - Found 28 GATE violations:"
for seed in 0036 0037 0038 0039 0040; do
  if [ -f "agent_generated_baskets_s0006_s0030/lego_baskets_s${seed}.json" ]; then
    echo "S${seed}:"
    jq -r 'to_entries[] | select(.key | startswith("S")) | .key + ": short:\(.value.phrase_distribution.really_short_1_2) qshort:\(.value.phrase_distribution.quite_short_3) longer:\(.value.phrase_distribution.longer_4_5) LONG:\(.value.phrase_distribution.long_6_plus)' "agent_generated_baskets_s0006_s0030/lego_baskets_s${seed}.json" 2>/dev/null | head -6
  else
    echo "S${seed}: FILE NOT FOUND"
  fi
done

echo ""
echo "Agent 8 (S0041-S0045) - Claims 100% GATE compliance:"
for seed in 0041 0042 0043 0044 0045; do
  if [ -f "agent_generated_baskets_s0006_s0030/lego_baskets_s${seed}.json" ]; then
    echo "S${seed}:"
    jq -r 'to_entries[] | select(.key | startswith("S")) | .key + ": short:\(.value.phrase_distribution.really_short_1_2) qshort:\(.value.phrase_distribution.quite_short_3) longer:\(.value.phrase_distribution.longer_4_5) LONG:\(.value.phrase_distribution.long_6_plus)' "agent_generated_baskets_s0006_s0030/lego_baskets_s${seed}.json" 2>/dev/null | head -6
  else
    echo "S${seed}: FILE NOT FOUND"
  fi
done

echo ""
echo "Agent 9 (S0046-S0050) - Found GATE violations:"
for seed in 0046 0047 0048 0049 0050; do
  if [ -f "agent_generated_baskets_s0006_s0030/lego_baskets_s${seed}.json" ]; then
    echo "S${seed}:"
    jq -r 'to_entries[] | select(.key | startswith("S")) | .key + ": short:\(.value.phrase_distribution.really_short_1_2) qshort:\(.value.phrase_distribution.quite_short_3) longer:\(.value.phrase_distribution.longer_4_5) LONG:\(.value.phrase_distribution.long_6_plus)' "agent_generated_baskets_s0006_s0030/lego_baskets_s${seed}.json" 2>/dev/null | head -6
  else
    echo "S${seed}: FILE NOT FOUND"
  fi
done
