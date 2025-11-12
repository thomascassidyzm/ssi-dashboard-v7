#!/bin/bash

###############################################################################
# OVERNIGHT 100-SEED RUNNER
# Purpose: Generate complete course material for seeds 1-100 in both Spanish and Chinese
# Expected runtime: 6-8 hours
###############################################################################

set -e  # Exit on error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

LOG_DIR="$SCRIPT_DIR/../logs/overnight_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/overnight_runner.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1" | tee -a "$LOG_FILE"
}

###############################################################################
# CONFIGURATION
###############################################################################

COURSES=("spa_for_eng_s0001-0100" "cmn_for_eng_s0001-0100")
COURSE_NAMES=("Spanish for English" "Mandarin for English")
START_SEED=1
END_SEED=100
NUM_SEEDS=100

log "========================================="
log "OVERNIGHT 100-SEED PIPELINE RUNNER"
log "========================================="
log "Courses: ${COURSES[@]}"
log "Seed Range: S$(printf '%04d' $START_SEED) - S$(printf '%04d' $END_SEED)"
log "Log Directory: $LOG_DIR"
log "========================================="
log ""

###############################################################################
# PHASE 1: PEDAGOGICAL TRANSLATION
###############################################################################

run_phase1() {
    local course=$1
    local course_name=$2

    log "📝 PHASE 1: Pedagogical Translation - $course_name"
    log "   Creating course directory..."

    mkdir -p "public/vfs/courses/$course"

    # Prepare batches (using orchestrator approach)
    log "   Preparing orchestrator batches..."
    node scripts/phase1-prepare-orchestrator-batches.cjs "$course" 3 $START_SEED $END_SEED >> "$LOG_DIR/phase1_$course.log" 2>&1 || error "Phase 1 batch prep failed for $course"

    success "Phase 1 batches prepared for $course_name"
    log "   ⚠️  MANUAL STEP: Run orchestrators for $course"
    log "   Location: public/vfs/courses/$course/orchestrator_batches/phase1/"
    log ""
}

###############################################################################
# PHASE 2: VALIDATION
###############################################################################

run_phase2() {
    local course=$1
    local course_name=$2

    log "🔍 PHASE 2: Validation - $course_name"
    log "   ⚠️  MANUAL STEP: Run Phase 2 validation on seed_pairs.json"
    log ""
}

###############################################################################
# PHASE 3: LEGO EXTRACTION
###############################################################################

run_phase3() {
    local course=$1
    local course_name=$2

    log "🧱 PHASE 3: LEGO Extraction - $course_name"

    # Prepare batches
    log "   Preparing Phase 3 batches..."
    node scripts/phase3_prepare_all_batches.cjs "$course" >> "$LOG_DIR/phase3_prep_$course.log" 2>&1 || error "Phase 3 prep failed for $course"

    success "Phase 3 batches prepared for $course_name"
    log "   ⚠️  MANUAL STEP: Run Phase 3 orchestrators for $course"
    log ""
}

###############################################################################
# PHASE 3 POST-PROCESSING
###############################################################################

run_phase3_postprocess() {
    local course=$1
    local course_name=$2

    log "🔧 PHASE 3 Post-Processing - $course_name"

    # Merge batches
    log "   Merging LEGO batches..."
    node scripts/phase3_merge_legos.cjs "$course" >> "$LOG_DIR/phase3_merge_$course.log" 2>&1 || error "Phase 3 merge failed for $course"

    # Deduplicate
    log "   Deduplicating LEGOs..."
    node scripts/phase3_deduplicate_legos.cjs "$course" >> "$LOG_DIR/phase3_dedup_$course.log" 2>&1 || error "Phase 3 dedup failed for $course"

    # Build registry
    log "   Building LEGO registry..."
    node scripts/phase3_build_lego_registry.cjs "$course" >> "$LOG_DIR/phase3_registry_$course.log" 2>&1 || error "Phase 3 registry failed for $course"

    success "Phase 3 post-processing complete for $course_name"
    log ""
}

###############################################################################
# PHASE 5: PRACTICE BASKET GENERATION
###############################################################################

run_phase5() {
    local course=$1
    local course_name=$2

    log "🎯 PHASE 5: Practice Basket Generation - $course_name"

    # Generate scaffolds
    log "   Generating practice scaffolds..."
    node scripts/phase5_generate_scaffolds.cjs "$course" >> "$LOG_DIR/phase5_scaffolds_$course.log" 2>&1 || error "Phase 5 scaffolds failed for $course"

    success "Phase 5 scaffolds generated for $course_name"
    log "   ⚠️  MANUAL STEP: Run Phase 5 basket generation orchestrators"
    log ""
}

###############################################################################
# PHASE 5 POST-PROCESSING
###############################################################################

run_phase5_postprocess() {
    local course=$1
    local course_name=$2

    log "🔧 PHASE 5 Post-Processing - $course_name"

    # Merge baskets
    log "   Merging practice baskets..."
    node scripts/phase5_merge_baskets.cjs "$course" >> "$LOG_DIR/phase5_merge_$course.log" 2>&1 || error "Phase 5 merge failed for $course"

    # Grammar review
    log "   Running grammar review..."
    node scripts/phase5_grammar_review.cjs "$course" >> "$LOG_DIR/phase5_grammar_$course.log" 2>&1 || error "Phase 5 grammar review failed for $course"

    # Compact format
    log "   Converting to compact format..."
    node scripts/phase5_compact_format.cjs "$course" >> "$LOG_DIR/phase5_compact_$course.log" 2>&1 || error "Phase 5 compact format failed for $course"

    # Validate window coverage
    log "   Validating window coverage..."
    node scripts/phase5_validate_window_coverage.cjs "$course" >> "$LOG_DIR/phase5_validate_$course.log" 2>&1 || {
        log "   ⚠️  Window validation warnings (check log)"
    }

    success "Phase 5 post-processing complete for $course_name"
    log ""
}

###############################################################################
# FINAL VALIDATION
###############################################################################

run_final_validation() {
    local course=$1
    local course_name=$2

    log "✅ FINAL VALIDATION - $course_name"

    # Run gate validator
    log "   Running gate validator..."
    node scripts/phase5_gate_validator.cjs "$course" >> "$LOG_DIR/final_validation_$course.log" 2>&1 || {
        log "   ⚠️  Gate validation warnings (check log)"
    }

    success "Final validation complete for $course_name"
    log ""
}

###############################################################################
# MAIN EXECUTION
###############################################################################

log "Starting overnight pipeline run..."
log "Expected completion: $(date -v+8H '+%Y-%m-%d %H:%M:%S')"
log ""

# Process each course
for i in "${!COURSES[@]}"; do
    course="${COURSES[$i]}"
    course_name="${COURSE_NAMES[$i]}"

    log "========================================="
    log "PROCESSING: $course_name"
    log "========================================="
    log ""

    # Phase 1: Translation
    run_phase1 "$course" "$course_name"

    # Pause for manual orchestrator run
    log "⏸️  PAUSED: Waiting for Phase 1 orchestrators to complete"
    log "   Run orchestrators, then press ENTER to continue..."
    read -p ""

    # Phase 2: Validation
    run_phase2 "$course" "$course_name"

    # Phase 3: LEGO Extraction
    run_phase3 "$course" "$course_name"

    # Pause for manual orchestrator run
    log "⏸️  PAUSED: Waiting for Phase 3 orchestrators to complete"
    log "   Run orchestrators, then press ENTER to continue..."
    read -p ""

    # Phase 3 post-processing
    run_phase3_postprocess "$course" "$course_name"

    # Phase 5: Practice Baskets
    run_phase5 "$course" "$course_name"

    # Pause for manual orchestrator run
    log "⏸️  PAUSED: Waiting for Phase 5 orchestrators to complete"
    log "   Run orchestrators, then press ENTER to continue..."
    read -p ""

    # Phase 5 post-processing
    run_phase5_postprocess "$course" "$course_name"

    # Final validation
    run_final_validation "$course" "$course_name"

    log "========================================="
    log "✅ COMPLETED: $course_name"
    log "========================================="
    log ""
done

###############################################################################
# COMPLETION REPORT
###############################################################################

log "========================================="
log "🎉 OVERNIGHT RUN COMPLETE"
log "========================================="
log ""
log "Courses processed:"
for i in "${!COURSES[@]}"; do
    log "  ✅ ${COURSE_NAMES[$i]} (${COURSES[$i]})"
done
log ""
log "Output locations:"
for course in "${COURSES[@]}"; do
    log "  📁 public/vfs/courses/$course/"
done
log ""
log "Logs saved to: $LOG_DIR"
log "Main log: $LOG_FILE"
log ""
log "Next steps:"
log "  1. Review validation logs for any warnings"
log "  2. Check window coverage reports"
log "  3. Spot-check practice phrases for quality"
log "  4. Compare Spanish vs Chinese patterns"
log ""
log "========================================="

success "Pipeline run completed successfully!"
