#!/bin/bash

###############################################################################
# FULLY AUTOMATED OVERNIGHT 100-SEED RUNNER
# Purpose: Prepare ALL batch files for seeds 1-100 in Spanish and Chinese
# Then you run the orchestrators and post-processing separately
###############################################################################

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

LOG_DIR="$SCRIPT_DIR/../logs/overnight_prep_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/preparation.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1" | tee -a "$LOG_FILE"
    exit 1
}

###############################################################################
# CONFIGURATION
###############################################################################

SPA_COURSE="spa_for_eng_s0001-0100"
CMN_COURSE="cmn_for_eng_s0001-0100"

log "========================================="
log "OVERNIGHT 100-SEED PREPARATION"
log "========================================="
log "Spanish Course: $SPA_COURSE"
log "Chinese Course: $CMN_COURSE"
log "Seed Range: S0001-S0100"
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
node scripts/phase1-prepare-orchestrator-batches.cjs "$SPA_COURSE" 3 1 100 >> "$LOG_DIR/phase1_spa.log" 2>&1
log "   ✅ Spanish Phase 1 batches ready"

# Chinese
log "   Chinese: Creating course directory and batches..."
mkdir -p "public/vfs/courses/$CMN_COURSE"
node scripts/phase1-prepare-orchestrator-batches.cjs "$CMN_COURSE" 3 1 100 >> "$LOG_DIR/phase1_cmn.log" 2>&1
log "   ✅ Chinese Phase 1 batches ready"

log ""
log "========================================="
log "✅ PREPARATION COMPLETE"
log "========================================="
log ""
log "📋 NEXT STEPS:"
log ""
log "1️⃣  RUN PHASE 1 ORCHESTRATORS (Translation)"
log "   Spanish batches: public/vfs/courses/$SPA_COURSE/orchestrator_batches/phase1/"
log "   Chinese batches: public/vfs/courses/$CMN_COURSE/orchestrator_batches/phase1/"
log "   → This will create seed_pairs.json for each course"
log ""
log "2️⃣  PREPARE PHASE 3 BATCHES (after Phase 1 completes)"
log "   bash scripts/prepare_phase3_batches.sh"
log ""
log "3️⃣  RUN PHASE 3 ORCHESTRATORS (LEGO Extraction)"
log "   → This will create LEGO pairs"
log ""
log "4️⃣  RUN PHASE 3 POST-PROCESSING"
log "   bash scripts/phase3_postprocess.sh"
log ""
log "5️⃣  PREPARE PHASE 5 SCAFFOLDS"
log "   bash scripts/prepare_phase5_scaffolds.sh"
log ""
log "6️⃣  RUN PHASE 5 ORCHESTRATORS (Practice Baskets)"
log "   → This will create practice phrase baskets"
log ""
log "7️⃣  RUN PHASE 5 POST-PROCESSING & VALIDATION"
log "   bash scripts/phase5_postprocess.sh"
log ""
log "========================================="
log "All logs saved to: $LOG_DIR"
log "========================================="
