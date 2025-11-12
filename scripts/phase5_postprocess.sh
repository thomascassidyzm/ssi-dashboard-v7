#!/bin/bash
# Phase 5 post-processing and validation after orchestrators complete

set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

SPA="spa_for_eng_s0001-0100"
CMN="cmn_for_eng_s0001-0100"

LOG_DIR="logs/phase5_postprocess_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$LOG_DIR"

echo "🔧 Phase 5 Post-Processing & Validation..."
echo "Logs will be saved to: $LOG_DIR"
echo ""

###############################################################################
# SPANISH
###############################################################################

echo "========================================="
echo "Processing: Spanish"
echo "========================================="
echo ""

echo "📦 Merging practice baskets..."
node scripts/phase5_merge_baskets.cjs "$SPA" >> "$LOG_DIR/merge_spa.log" 2>&1
echo "✅ Merged"

echo "📝 Running grammar review..."
node scripts/phase5_grammar_review.cjs "$SPA" >> "$LOG_DIR/grammar_spa.log" 2>&1
echo "✅ Grammar reviewed"

echo "🔧 Converting to compact format..."
node scripts/phase5_compact_format.cjs "$SPA" >> "$LOG_DIR/compact_spa.log" 2>&1
echo "✅ Compacted"

echo "🔧 Fixing array order..."
node scripts/fix_array_order.cjs "$SPA" phase5 >> "$LOG_DIR/arrays_spa.log" 2>&1
echo "✅ Arrays fixed"

echo "🔍 Validating window coverage..."
node scripts/phase5_validate_window_coverage.cjs "$SPA" | tee "$LOG_DIR/window_spa.log"

echo "✅ Running gate validator..."
node scripts/phase5_gate_validator.cjs "$SPA" | tee "$LOG_DIR/gates_spa.log"

echo ""

###############################################################################
# CHINESE
###############################################################################

echo "========================================="
echo "Processing: Chinese"
echo "========================================="
echo ""

echo "📦 Merging practice baskets..."
node scripts/phase5_merge_baskets.cjs "$CMN" >> "$LOG_DIR/merge_cmn.log" 2>&1
echo "✅ Merged"

echo "📝 Running grammar review..."
node scripts/phase5_grammar_review.cjs "$CMN" >> "$LOG_DIR/grammar_cmn.log" 2>&1
echo "✅ Grammar reviewed"

echo "🔧 Converting to compact format..."
node scripts/phase5_compact_format.cjs "$CMN" >> "$LOG_DIR/compact_cmn.log" 2>&1
echo "✅ Compacted"

echo "🔧 Fixing array order..."
node scripts/fix_array_order.cjs "$CMN" phase5 >> "$LOG_DIR/arrays_cmn.log" 2>&1
echo "✅ Arrays fixed"

echo "🔍 Validating window coverage..."
node scripts/phase5_validate_window_coverage.cjs "$CMN" | tee "$LOG_DIR/window_cmn.log"

echo "✅ Running gate validator..."
node scripts/phase5_gate_validator.cjs "$CMN" | tee "$LOG_DIR/gates_cmn.log"

echo ""

###############################################################################
# FINAL REPORT
###############################################################################

echo "========================================="
echo "✅ Phase 5 Post-Processing Complete!"
echo "========================================="
echo ""
echo "📁 Outputs:"
echo "   Spanish: public/vfs/courses/$SPA/phase5_outputs/"
echo "   Chinese: public/vfs/courses/$CMN/phase5_outputs/"
echo ""
echo "📊 Validation Reports:"
echo "   All logs: $LOG_DIR/"
echo "   Window coverage: $LOG_DIR/window_*.log"
echo "   Gate validation: $LOG_DIR/gates_*.log"
echo ""
echo "🎉 100-SEED COURSE GENERATION COMPLETE!"
echo ""
echo "📋 Next Steps:"
echo "   1. Review validation logs for warnings"
echo "   2. Spot-check practice phrases for quality"
echo "   3. Compare Spanish vs Chinese patterns"
echo "   4. Test integration with frontend"
echo ""
