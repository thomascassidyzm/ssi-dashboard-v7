#!/bin/bash

###############################################################################
# OVERNIGHT FULL 668 SEEDS → PHASE 3 COMPLETE
# Purpose: Generate complete foundation (translations + LEGOs) for both courses
# Stop BEFORE Phase 5 (the risky creative generation)
###############################################################################

set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

LOG_DIR="$SCRIPT_DIR/../logs/overnight_668_phase3_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/preparation.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

SPA_COURSE="spa_for_eng_s0001-0668"
CMN_COURSE="cmn_for_eng_s0001-0668"

log "========================================="
log "OVERNIGHT 668-SEED FOUNDATION BUILD"
log "========================================="
log "Spanish Course: $SPA_COURSE"
log "Chinese Course: $CMN_COURSE"
log "Seed Range: S0001-S0668"
log "Stop After: Phase 3 (LEGO Extraction)"
log "========================================="
log ""

###############################################################################
# STEP 1: PREPARE PHASE 1 BATCHES
###############################################################################

log "📝 STEP 1: Preparing Phase 1 Translation Batches"
log ""

# Spanish
log "   Spanish: Creating course directory and batches..."
mkdir -p "public/vfs/courses/$SPA_COURSE"
node scripts/phase1-prepare-orchestrator-batches.cjs "$SPA_COURSE" 3 1 668 >> "$LOG_DIR/phase1_spa.log" 2>&1
log "   ✅ Spanish Phase 1 batches ready (3 orchestrators × ~223 seeds each)"

# Chinese
log "   Chinese: Creating course directory and batches..."
mkdir -p "public/vfs/courses/$CMN_COURSE"
node scripts/phase1-prepare-orchestrator-batches.cjs "$CMN_COURSE" 3 1 668 >> "$LOG_DIR/phase1_cmn.log" 2>&1
log "   ✅ Chinese Phase 1 batches ready (3 orchestrators × ~223 seeds each)"

log ""
log "========================================="
log "✅ PHASE 1 PREPARATION COMPLETE"
log "========================================="
log ""
log "📋 NEXT STEPS:"
log ""
log "1️⃣  RUN PHASE 1 ORCHESTRATORS (Translation)"
log ""
log "   Spanish batches:"
log "   - public/vfs/courses/$SPA_COURSE/orchestrator_batches/phase1/orchestrator_batch_01.json"
log "   - public/vfs/courses/$SPA_COURSE/orchestrator_batches/phase1/orchestrator_batch_02.json"
log "   - public/vfs/courses/$SPA_COURSE/orchestrator_batches/phase1/orchestrator_batch_03.json"
log ""
log "   Chinese batches:"
log "   - public/vfs/courses/$CMN_COURSE/orchestrator_batches/phase1/orchestrator_batch_01.json"
log "   - public/vfs/courses/$CMN_COURSE/orchestrator_batches/phase1/orchestrator_batch_02.json"
log "   - public/vfs/courses/$CMN_COURSE/orchestrator_batches/phase1/orchestrator_batch_03.json"
log ""
log "   Total: 6 orchestrators (can run in parallel if you have capacity)"
log "   Each orchestrator spawns 10 sub-agents = 60 concurrent agents max"
log ""
log "   Expected time: 2-3 hours for all 6 orchestrators"
log ""
log "2️⃣  AFTER PHASE 1 COMPLETES:"
log "   bash scripts/prepare_phase3_batches_668.sh"
log ""
log "3️⃣  RUN PHASE 3 ORCHESTRATORS (LEGO Extraction)"
log "   Similar setup: 6 orchestrators total"
log ""
log "4️⃣  AFTER PHASE 3 COMPLETES:"
log "   bash scripts/phase3_postprocess_668.sh"
log ""
log "========================================="
log "🎯 EXPECTED DELIVERABLES (Phase 1-3 Only)"
log "========================================="
log ""
log "Spanish Course ($SPA_COURSE):"
log "  ✅ seed_pairs.json (668 cognate-optimized translations)"
log "  ✅ lego_pairs_deduplicated_final.json (~2800 LEGOs)"
log "  ✅ lego_registry.json (vocabulary tracking)"
log ""
log "Chinese Course ($CMN_COURSE):"
log "  ✅ seed_pairs.json (668 simplicity-optimized translations)"
log "  ✅ lego_pairs_deduplicated_final.json (~2800 LEGOs)"
log "  ✅ lego_registry.json (vocabulary tracking)"
log ""
log "========================================="
log "🛡️  WHY STOP AT PHASE 3?"
log "========================================="
log ""
log "Phase 1-3: Deterministic, mechanical, low-risk"
log "  - Translation: Clear rules (cognates, zero-variation)"
log "  - LEGO extraction: TILING FIRST (mechanical)"
log "  - Post-processing: Scripts only"
log ""
log "Phase 5: Creative, interpretive, HIGH-RISK"
log "  - Agents might paraphrase prompts"
log "  - 'Meaningful utterances' = subjective"
log "  - Window constraints = complex"
log "  - Better done supervised in batches"
log ""
log "========================================="
log "💡 RECOMMENDED: Phase 5 Tomorrow (Supervised)"
log "========================================="
log ""
log "After Phase 3 completes successfully:"
log "  1. Validate the foundation (spot-check translations & LEGOs)"
log "  2. Run Phase 5 in supervised 20-seed batches"
log "  3. Catch quality issues immediately"
log "  4. Much safer than overnight Phase 5"
log ""
log "All logs saved to: $LOG_DIR"
log "========================================="
