#!/bin/bash

###############################################################################
# Master conversion script for Phase 5 Batch 1 agent baskets
#
# Converts all agent files from various formats to correct LEGO_LEVEL format
#
# Usage: bash scripts/convert_all_agent_baskets.sh
###############################################################################

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BATCH_DIR="$SCRIPT_DIR/../phase5_batch1_s0101_s0300/batch_output"
REGISTRY_FILE="$SCRIPT_DIR/../phase5_batch1_s0101_s0300/registry/lego_registry_s0001_s0300.json"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Phase 5 Batch 1: Convert All Agent Baskets to LEGO Format  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if batch directory exists
if [ ! -d "$BATCH_DIR" ]; then
  echo "❌ Batch output directory not found: $BATCH_DIR"
  exit 1
fi

cd "$BATCH_DIR"

total_seeds=0
total_legos=0

echo "┌──────────────────────────────────────────────────────────────┐"
echo "│  SEED_GROUPED Format Agents (02, 03, 05, 06, 07, 08, 11, 13, 19) │"
echo "└──────────────────────────────────────────────────────────────┘"
echo ""

for agent in 02 03 05 06 07 08 11 13 19; do
  file="agent_${agent}_baskets.json"

  if [ ! -f "$file" ]; then
    echo "⚠️  Skipping agent $agent: file not found"
    continue
  fi

  echo "Converting Agent $agent ($file)..."
  node "$SCRIPT_DIR/convert_seed_grouped_format.cjs" "$file" "$BATCH_DIR"
  echo ""
done

echo ""
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│  SEEDS_WRAPPER Format Agents (10, 14, 16, 17)               │"
echo "└──────────────────────────────────────────────────────────────┘"
echo ""

for agent in 10 14 16 17; do
  file="agent_${agent}_baskets.json"

  if [ ! -f "$file" ]; then
    echo "⚠️  Skipping agent $agent: file not found"
    continue
  fi

  echo "Converting Agent $agent ($file)..."
  node "$SCRIPT_DIR/convert_seeds_wrapper_format.cjs" "$file" "$BATCH_DIR"
  echo ""
done

echo ""
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│  Agent 20 Special Format (49 LEGO keys)                     │"
echo "└──────────────────────────────────────────────────────────────┘"
echo ""

if [ -f "agent_20_baskets.json" ]; then
  echo "Converting Agent 20 (agent_20_baskets.json)..."
  node "$SCRIPT_DIR/convert_agent20_format.cjs" "agent_20_baskets.json" "$REGISTRY_FILE" "$BATCH_DIR"
  echo ""
else
  echo "⚠️  Agent 20 file not found"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  CONVERSION COMPLETE!                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Count converted files
converted_count=$(ls lego_baskets_s*.json 2>/dev/null | wc -l | tr -d ' ')

echo "📊 Summary:"
echo "  Individual basket files created: $converted_count"
echo ""
echo "Next steps:"
echo "  1. Validate converted files: node scripts/validate_converted_baskets.cjs"
echo "  2. Fix GATE violations: node scripts/fix_gate_violations.cjs"
echo "  3. Merge all files: node scripts/merge_all_baskets.cjs"
echo ""
