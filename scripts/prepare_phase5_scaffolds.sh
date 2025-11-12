#!/bin/bash
# Prepare Phase 5 scaffolds after Phase 3 completes

set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

SPA="spa_for_eng_s0001-0100"
CMN="cmn_for_eng_s0001-0100"

echo "🎯 Preparing Phase 5 Practice Basket Scaffolds..."
echo ""

# Check Phase 3 outputs exist
if [ ! -f "public/vfs/courses/$SPA/phase3_outputs/lego_pairs_deduplicated_final.json" ]; then
    echo "❌ ERROR: Spanish LEGO pairs not found. Run Phase 3 post-processing first."
    exit 1
fi

if [ ! -f "public/vfs/courses/$CMN/phase3_outputs/lego_pairs_deduplicated_final.json" ]; then
    echo "❌ ERROR: Chinese LEGO pairs not found. Run Phase 3 post-processing first."
    exit 1
fi

echo "✅ Found Phase 3 outputs"
echo ""

# Generate Spanish scaffolds
echo "📝 Generating Spanish scaffolds..."
node scripts/phase5_generate_scaffolds.cjs "$SPA"
echo "✅ Spanish scaffolds ready"
echo ""

# Generate Chinese scaffolds
echo "📝 Generating Chinese scaffolds..."
node scripts/phase5_generate_scaffolds.cjs "$CMN"
echo "✅ Chinese scaffolds ready"
echo ""

echo "========================================="
echo "✅ Phase 5 scaffolds generated!"
echo "========================================="
echo ""
echo "📋 NEXT STEP: Run Phase 5 orchestrators"
echo "   Spanish: public/vfs/courses/$SPA/phase5_outputs/"
echo "   Chinese: public/vfs/courses/$CMN/phase5_outputs/"
echo ""
echo "   Each scaffold file needs basket generation via orchestrator"
echo ""
