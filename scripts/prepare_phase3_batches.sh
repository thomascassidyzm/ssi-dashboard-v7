#!/bin/bash
# Prepare Phase 3 batches after Phase 1 completes

set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

SPA="spa_for_eng_s0001-0100"
CMN="cmn_for_eng_s0001-0100"

echo "🧱 Preparing Phase 3 LEGO Extraction Batches..."
echo ""

# Check Phase 1 outputs exist
if [ ! -f "public/vfs/courses/$SPA/seed_pairs.json" ]; then
    echo "❌ ERROR: Spanish seed_pairs.json not found. Run Phase 1 first."
    exit 1
fi

if [ ! -f "public/vfs/courses/$CMN/seed_pairs.json" ]; then
    echo "❌ ERROR: Chinese seed_pairs.json not found. Run Phase 1 first."
    exit 1
fi

echo "✅ Found Phase 1 outputs"
echo ""

# Prepare Spanish batches
echo "📦 Preparing Spanish Phase 3 batches..."
node scripts/phase3_prepare_all_batches.cjs "$SPA"
echo "✅ Spanish batches ready"
echo ""

# Prepare Chinese batches
echo "📦 Preparing Chinese Phase 3 batches..."
node scripts/phase3_prepare_all_batches.cjs "$CMN"
echo "✅ Chinese batches ready"
echo ""

echo "========================================="
echo "✅ Phase 3 batches prepared!"
echo "========================================="
echo ""
echo "📋 NEXT STEP: Run Phase 3 orchestrators"
echo "   Spanish: public/vfs/courses/$SPA/orchestrator_batches/phase3/"
echo "   Chinese: public/vfs/courses/$CMN/orchestrator_batches/phase3/"
echo ""
