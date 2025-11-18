#!/bin/bash

# Phase 5 Grammar Violations Cleanup
# Based on agent review findings for S0001-S0150

echo "🧹 Cleaning up grammar violations from agent reviews"
echo "════════════════════════════════════════════════════════════"
echo ""

SCRIPT="scripts/phase5_delete_bad_phrases.cjs"
COURSE="cmn_for_eng"

# ============================================================================
# MAJOR ISSUES - Must fix (12-14 total)
# ============================================================================

echo "🔴 MAJOR ISSUES (wrong grammar, unusable phrases)"
echo ""

# S0023 - Wrong word order: 见面你 → should be 见你
echo "S0023: Fixing 见面 + pronoun word order..."
# Need to review which phrases have this issue

# S0024 - Wrong word order: 见面你 → should be 见你
echo "S0024: Fixing 见面 + pronoun word order..."
# Need to review which phrases have this issue

# S0026 - Missing verb after 必须 (5 instances across multiple LEGOs)
echo "S0026: Fixing missing verbs after 必须..."
# L03, L04, L05, L06 all have "在我必须之前走" missing verb

# S0082 - Nonsensical English "When will you wait for you"
echo "S0082: Fixing nonsensical English..."

# S0101 - Ungrammatical English + wrong Chinese
echo "S0101: Fixing incomplete English and wrong verb choice..."

# S0102 - Wrong verb: 想 instead of 认为 for "think"
echo "S0102: Fixing wrong verb choice (想 vs 认为)..."

# S0103 - Incomplete English "many more about this"
echo "S0103: Fixing incomplete English phrases..."

echo ""
echo "⚠️  To apply these fixes, review each seed first:"
echo ""
echo "    node $SCRIPT $COURSE review S0023"
echo "    node $SCRIPT $COURSE review S0024"
echo "    node $SCRIPT $COURSE review S0026"
echo "    node $SCRIPT $COURSE review S0082"
echo "    node $SCRIPT $COURSE review S0101"
echo "    node $SCRIPT $COURSE review S0102"
echo "    node $SCRIPT $COURSE review S0103"
echo ""
echo "Then delete bad phrases:"
echo ""
echo "    node $SCRIPT $COURSE delete S0023 S0023L01 1,3,5"
echo "    (replace with actual LEGO IDs and phrase indices)"
echo ""

# ============================================================================
# MODERATE ISSUES - Should fix (12-14 total)
# ============================================================================

echo ""
echo "🟡 MODERATE ISSUES (awkward but understandable)"
echo ""

echo "S0024: Double 就 (就要就能)"
echo "S0025: Unnatural negation (不必须)"
echo "S0030: Time phrase word order"
echo "S0073: Missing particles in 'thank you for'"
echo "S0076: Confusing English"
echo "S0077: Awkward adverb placement"
echo "S0082: Particle placement (为什么不呢等)"
echo "S0083: Missing temporal markers"
echo "S0091: Word order (等不很难)"
echo "S0092: Missing preposition in time expression"
echo "S0097: Awkward 走回家"
echo "S0103: 试图听 too formal"

echo ""
echo "💡 These can be fixed in a second pass after majors are done"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo "════════════════════════════════════════════════════════════"
echo "SUMMARY"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Total seeds with issues: 17 out of 102 reviewed"
echo "Issue rate: ~16.7% of seeds (1.1% of phrases)"
echo ""
echo "Priority seeds to fix:"
echo "  🔴 High: S0023, S0024, S0026, S0082, S0101, S0102, S0103"
echo "  🟡 Medium: S0025, S0030, S0073, S0076, S0077, S0083, S0091, S0092, S0097"
echo ""
echo "Philosophy:"
echo "  ✅ Better 8 good phrases than 10 with 2 bad"
echo "  ✅ Learners need confidence in being understood"
echo "  ✅ Natural target language patterns = speaking without thinking"
echo ""
echo "Next step: Review each seed and delete problematic phrases"
echo ""
