#!/bin/bash
echo "=== AGENT PERFORMANCE ANALYSIS ==="
echo ""
echo "Agent 1 (S0006-S0010):"
for seed in 0006 0007 0008 0009 0010; do
  echo "S${seed}:"
  jq -r 'to_entries[] | select(.key | startswith("S")) | .key + ": " + (.value.phrase_distribution | "short:\(.really_short_1_2) qshort:\(.quite_short_3) longer:\(.longer_4_5) LONG:\(.long_6_plus)")' "agent_generated_baskets_s0006_s0030/lego_baskets_s${seed}.json" 2>/dev/null | head -5
done

echo ""
echo "Agent 2 (S0011-S0015):"
for seed in 0011 0012 0013 0014 0015; do
  echo "S${seed}:"
  jq -r 'to_entries[] | select(.key | startswith("S")) | .key + ": " + (.value.phrase_distribution | "short:\(.really_short_1_2) qshort:\(.quite_short_3) longer:\(.longer_4_5) LONG:\(.long_6_plus)")' "agent_generated_baskets_s0006_s0030/lego_baskets_s${seed}.json" 2>/dev/null | head -5
done

echo ""
echo "Agent 5 (S0026-S0030):"
for seed in 0026 0027 0028 0029 0030; do
  echo "S${seed}:"
  jq -r 'to_entries[] | select(.key | startswith("S")) | .key + ": " + (.value.phrase_distribution | "short:\(.really_short_1_2) qshort:\(.quite_short_3) longer:\(.longer_4_5) LONG:\(.long_6_plus)")' "agent_generated_baskets_s0006_s0030/lego_baskets_s${seed}.json" 2>/dev/null | head -5
done
