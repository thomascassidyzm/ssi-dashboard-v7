#!/bin/bash
# Phase 3 post-processing after orchestrators complete

set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

SPA="spa_for_eng_s0001-0100"
CMN="cmn_for_eng_s0001-0100"

echo "🔧 Phase 3 Post-Processing..."
echo ""

###############################################################################
# SPANISH
###############################################################################

echo "========================================="
echo "Processing: Spanish"
echo "========================================="
echo ""

echo "📦 Merging LEGO batches..."
node scripts/phase3_merge_legos.cjs "$SPA"
echo "✅ Merged"

echo "🔍 Deduplicating LEGOs..."
node scripts/phase3_deduplicate_legos.cjs "$SPA"
echo "✅ Deduplicated"

echo "🔄 Re-ordering LEGOs for optimal pedagogy..."
node scripts/phase3_reorder_legos.cjs "$SPA"
echo "✅ Re-ordered"

echo "📋 Building LEGO registry..."
node scripts/phase3_build_lego_registry.cjs "$SPA"
echo "✅ Registry built"

echo "🔧 Fixing array order..."
node scripts/fix_array_order.cjs "$SPA" phase3
echo "✅ Arrays fixed"

echo ""

###############################################################################
# CHINESE
###############################################################################

echo "========================================="
echo "Processing: Chinese"
echo "========================================="
echo ""

echo "📦 Merging LEGO batches..."
node scripts/phase3_merge_legos.cjs "$CMN"
echo "✅ Merged"

echo "🔍 Deduplicating LEGOs..."
node scripts/phase3_deduplicate_legos.cjs "$CMN"
echo "✅ Deduplicated"

echo "🔄 Re-ordering LEGOs for optimal pedagogy..."
node scripts/phase3_reorder_legos.cjs "$CMN"
echo "✅ Re-ordered"

echo "📋 Building LEGO registry..."
node scripts/phase3_build_lego_registry.cjs "$CMN"
echo "✅ Registry built"

echo "🔧 Fixing array order..."
node scripts/fix_array_order.cjs "$CMN" phase3
echo "✅ Arrays fixed"

echo ""

echo "========================================="
echo "✅ Phase 3 Post-Processing Complete!"
echo "========================================="
echo ""
echo "📁 Outputs:"
echo "   Spanish: public/vfs/courses/$SPA/phase3_outputs/"
echo "   Chinese: public/vfs/courses/$CMN/phase3_outputs/"
echo ""
echo "📋 NEXT STEP: Prepare Phase 5 scaffolds"
echo "   bash scripts/prepare_phase5_scaffolds.sh"
echo ""
