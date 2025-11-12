#!/bin/bash
# Prepare Phase 3 batches for full 668 seeds

set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

SPA="spa_for_eng_s0001-0668"
CMN="cmn_for_eng_s0001-0668"

echo "🧱 Preparing Phase 3 LEGO Extraction Batches (668 seeds)..."
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

# Check seed counts
spa_count=$(grep -o '"S[0-9]\{4\}"' "public/vfs/courses/$SPA/seed_pairs.json" | wc -l | tr -d ' ')
cmn_count=$(grep -o '"S[0-9]\{4\}"' "public/vfs/courses/$CMN/seed_pairs.json" | wc -l | tr -d ' ')

echo "✅ Found Phase 1 outputs"
echo "   Spanish: $spa_count seeds"
echo "   Chinese: $cmn_count seeds"
echo ""

if [ "$spa_count" -ne 668 ]; then
    echo "⚠️  WARNING: Spanish has $spa_count seeds (expected 668)"
fi

if [ "$cmn_count" -ne 668 ]; then
    echo "⚠️  WARNING: Chinese has $cmn_count seeds (expected 668)"
fi

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
echo "Expected: 6 orchestrators total (3 per language)"
echo "Each orchestrator: ~223 seeds → ~950 LEGOs"
echo ""
