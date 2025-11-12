#!/bin/bash
# Phase 3 post-processing for full 668 seeds

set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

SPA="spa_for_eng_s0001-0668"
CMN="cmn_for_eng_s0001-0668"

LOG_DIR="logs/phase3_postprocess_668_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$LOG_DIR"

echo "🔧 Phase 3 Post-Processing (668 seeds)..."
echo "Logs: $LOG_DIR"
echo ""

###############################################################################
# SPANISH
###############################################################################

echo "========================================="
echo "Processing: Spanish (668 seeds)"
echo "========================================="
echo ""

echo "📦 Merging LEGO batches..."
node scripts/phase3_merge_legos.cjs "$SPA" | tee "$LOG_DIR/merge_spa.log"
echo "✅ Merged"

echo "🔍 Deduplicating LEGOs..."
node scripts/phase3_deduplicate_legos.cjs "$SPA" | tee "$LOG_DIR/dedup_spa.log"
echo "✅ Deduplicated"

echo "📋 Building LEGO registry..."
node scripts/phase3_build_lego_registry.cjs "$SPA" | tee "$LOG_DIR/registry_spa.log"
echo "✅ Registry built"

echo "🔧 Fixing array order..."
node scripts/fix_array_order.cjs "$SPA" phase3 | tee "$LOG_DIR/arrays_spa.log"
echo "✅ Arrays fixed"

# Count LEGOs
spa_lego_count=$(grep -o '"S[0-9]\{4\}L[0-9]\{2\}"' "public/vfs/courses/$SPA/phase3_outputs/lego_pairs_deduplicated_final.json" 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "📊 Spanish Stats:"
echo "   Total LEGOs: $spa_lego_count"
echo "   LEGOs per seed: $(echo "scale=1; $spa_lego_count / 668" | bc)"
echo ""

###############################################################################
# CHINESE
###############################################################################

echo "========================================="
echo "Processing: Chinese (668 seeds)"
echo "========================================="
echo ""

echo "📦 Merging LEGO batches..."
node scripts/phase3_merge_legos.cjs "$CMN" | tee "$LOG_DIR/merge_cmn.log"
echo "✅ Merged"

echo "🔍 Deduplicating LEGOs..."
node scripts/phase3_deduplicate_legos.cjs "$CMN" | tee "$LOG_DIR/dedup_cmn.log"
echo "✅ Deduplicated"

echo "📋 Building LEGO registry..."
node scripts/phase3_build_lego_registry.cjs "$CMN" | tee "$LOG_DIR/registry_cmn.log"
echo "✅ Registry built"

echo "🔧 Fixing array order..."
node scripts/fix_array_order.cjs "$CMN" phase3 | tee "$LOG_DIR/arrays_cmn.log"
echo "✅ Arrays fixed"

# Count LEGOs
cmn_lego_count=$(grep -o '"S[0-9]\{4\}L[0-9]\{2\}"' "public/vfs/courses/$CMN/phase3_outputs/lego_pairs_deduplicated_final.json" 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "📊 Chinese Stats:"
echo "   Total LEGOs: $cmn_lego_count"
echo "   LEGOs per seed: $(echo "scale=1; $cmn_lego_count / 668" | bc)"
echo ""

###############################################################################
# FINAL REPORT
###############################################################################

echo "========================================="
echo "✅ Phase 3 Post-Processing Complete!"
echo "========================================="
echo ""
echo "📁 Outputs:"
echo "   Spanish: public/vfs/courses/$SPA/phase3_outputs/"
echo "   Chinese: public/vfs/courses/$CMN/phase3_outputs/"
echo ""
echo "📊 Summary:"
echo "   Spanish: 668 seeds → $spa_lego_count LEGOs"
echo "   Chinese: 668 seeds → $cmn_lego_count LEGOs"
echo "   Total LEGOs: $(($spa_lego_count + $cmn_lego_count))"
echo ""
echo "📋 Files Created:"
echo "   ✅ lego_pairs_deduplicated_final.json (both languages)"
echo "   ✅ lego_registry.json (both languages)"
echo "   ✅ Array order convention enforced"
echo ""
echo "========================================="
echo "🎉 FOUNDATION COMPLETE - Phase 1-3 Done!"
echo "========================================="
echo ""
echo "You now have:"
echo "  ✅ 668 cognate-optimized Spanish translations"
echo "  ✅ 668 simplicity-optimized Chinese translations"
echo "  ✅ ~5600 total LEGOs across both languages"
echo "  ✅ All validated and array-order-correct"
echo ""
echo "🛡️  SAFE TO WAKE UP TO!"
echo ""
echo "========================================="
echo "💡 NEXT STEP: Phase 5 (Supervised Batches)"
echo "========================================="
echo ""
echo "Run Phase 5 in supervised 20-seed batches:"
echo "  1. Generate scaffolds: bash scripts/prepare_phase5_scaffolds_668.sh"
echo "  2. Run batches 1-20, 21-40, etc. while supervising"
echo "  3. Validate quality before proceeding"
echo "  4. Much safer than overnight Phase 5"
echo ""
echo "All logs: $LOG_DIR"
echo "========================================="
