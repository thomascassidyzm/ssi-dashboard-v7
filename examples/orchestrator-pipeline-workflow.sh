#!/bin/bash

###############################################################################
# Orchestrator Pipeline Workflow - Example Usage
#
# This script demonstrates the complete workflow for LUT checking and
# basket gap analysis using the orchestrator pipeline endpoints.
#
# Usage: ./orchestrator-pipeline-workflow.sh <courseCode>
# Example: ./orchestrator-pipeline-workflow.sh spa_for_eng
###############################################################################

set -e  # Exit on error

COURSE_CODE="${1:-spa_for_eng}"
BASE_URL="http://localhost:3456"
COURSE_VFS="public/vfs/courses/$COURSE_CODE"

echo "================================================"
echo "Orchestrator Pipeline Workflow"
echo "Course: $COURSE_CODE"
echo "================================================"
echo ""

###############################################################################
# Step 1: Run LUT Check (Phase 3 Validation)
###############################################################################
echo "Step 1: Running LUT check..."
echo "-------------------------------------------"

LUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/courses/$COURSE_CODE/phase/3/validate")
LUT_STATUS=$(echo "$LUT_RESPONSE" | jq -r '.status')

echo "$LUT_RESPONSE" | jq .
echo ""

if [ "$LUT_STATUS" = "pass" ]; then
  echo "✅ LUT check PASSED - no violations detected"
  echo "   Course can proceed to Phase 5"
  echo ""
  exit 0
fi

echo "❌ LUT check FAILED - violations detected"
echo "   Proceeding with automated workflow..."
echo ""

###############################################################################
# Step 2: Review Collision Report
###############################################################################
echo "Step 2: Reviewing collision report..."
echo "-------------------------------------------"

if [ -f "$COURSE_VFS/lego_pairs_fd_report.json" ]; then
  VIOLATION_COUNT=$(jq -r '.violation_count // .violations | length' "$COURSE_VFS/lego_pairs_fd_report.json")
  echo "   Found $VIOLATION_COUNT collision(s)"
  echo "   Report: $COURSE_VFS/lego_pairs_fd_report.json"
  echo ""

  # Show first few violations
  echo "   First collision:"
  jq -r '.violations[0] | "   KNOWN: \"\(.known)\"\n   Targets: \(.mappings | length)"' \
    "$COURSE_VFS/lego_pairs_fd_report.json"
  echo ""
else
  echo "   ⚠️  Collision report not found"
  echo ""
fi

###############################################################################
# Step 3: Run Basket Gap Analysis
###############################################################################
echo "Step 3: Running basket gap analysis..."
echo "-------------------------------------------"

GAP_RESPONSE=$(curl -s "$BASE_URL/api/courses/$COURSE_CODE/baskets/gaps")
echo "$GAP_RESPONSE" | jq .
echo ""

BASKETS_TO_DELETE=$(echo "$GAP_RESPONSE" | jq -r '.analysis.baskets_to_delete')
BASKETS_MISSING=$(echo "$GAP_RESPONSE" | jq -r '.analysis.baskets_missing')
BASKETS_TO_KEEP=$(echo "$GAP_RESPONSE" | jq -r '.analysis.baskets_to_keep')

echo "📊 Gap Analysis Results:"
echo "   Baskets to keep: $BASKETS_TO_KEEP"
echo "   Baskets to delete: $BASKETS_TO_DELETE"
echo "   Baskets missing: $BASKETS_MISSING"
echo ""

###############################################################################
# Step 4: Review Task List
###############################################################################
echo "Step 4: Reviewing re-extraction task list..."
echo "-------------------------------------------"

if [ -f "$COURSE_VFS/reextraction_task_list.json" ]; then
  AFFECTED_SEEDS=$(jq -r '.phase_3_reextraction.seed_count' "$COURSE_VFS/reextraction_task_list.json")
  echo "   Task list: $COURSE_VFS/reextraction_task_list.json"
  echo "   Affected seeds: $AFFECTED_SEEDS"
  echo ""

  echo "   Action items:"
  jq -r '.action_items[] | "   \(.step). \(.action) (\(.automated | if . then "automated" else "manual" end))"' \
    "$COURSE_VFS/reextraction_task_list.json"
  echo ""
else
  echo "   ⚠️  Task list not found"
  echo ""
fi

###############################################################################
# Step 5: Clean Up Baskets (Optional)
###############################################################################
echo "Step 5: Basket cleanup (optional)..."
echo "-------------------------------------------"

if [ "$BASKETS_TO_DELETE" -gt 0 ]; then
  echo "   Found $BASKETS_TO_DELETE basket(s) to delete"
  echo ""

  # Extract basket IDs to delete
  BASKET_IDS=$(echo "$GAP_RESPONSE" | jq -c '.baskets_to_delete')

  echo "   Would you like to delete these baskets? (y/N)"
  read -r CONFIRM

  if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
    echo "   Deleting baskets..."

    CLEANUP_PAYLOAD=$(jq -n --argjson ids "$BASKET_IDS" '{basketIdsToDelete: $ids}')
    CLEANUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/courses/$COURSE_CODE/baskets/cleanup" \
      -H "Content-Type: application/json" \
      -d "$CLEANUP_PAYLOAD")

    echo "$CLEANUP_RESPONSE" | jq .
    echo ""

    DELETED_COUNT=$(echo "$CLEANUP_RESPONSE" | jq -r '.deleted')
    echo "   ✅ Deleted $DELETED_COUNT basket(s)"
    echo "   💾 Backup: $COURSE_VFS/deleted_baskets_backup.json"
    echo ""
  else
    echo "   Skipping basket cleanup"
    echo "   To clean up later, run:"
    echo "   curl -X POST $BASE_URL/api/courses/$COURSE_CODE/baskets/cleanup \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '$CLEANUP_PAYLOAD'"
    echo ""
  fi
else
  echo "   ℹ️  No baskets to delete"
  echo ""
fi

###############################################################################
# Step 6: Next Steps
###############################################################################
echo "================================================"
echo "Next Steps"
echo "================================================"
echo ""
echo "Manual actions required:"
echo ""
echo "1. Re-extract affected seeds in Phase 3"
echo "   - Use collision report for chunking-up instructions"
echo "   - Seeds to re-extract: See reextraction_task_list.json"
echo ""
echo "2. Verify LUT check passes after re-extraction"
echo "   curl -X POST $BASE_URL/api/courses/$COURSE_CODE/phase/3/validate"
echo ""

if [ "$BASKETS_TO_DELETE" -gt 0 ] && [ "$CONFIRM" != "y" ]; then
  echo "3. Clean up deprecated baskets"
  echo "   curl -X POST $BASE_URL/api/courses/$COURSE_CODE/baskets/cleanup \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -d '{\"basketIdsToDelete\": [...]}'"
  echo ""
fi

if [ "$BASKETS_MISSING" -gt 0 ]; then
  echo "4. Generate $BASKETS_MISSING new basket(s) in Phase 5"
  echo "   - Use Phase 5 basket server"
  echo "   - LEGOs needing baskets: See basket_gaps_report.json"
  echo ""
fi

echo "================================================"
echo "Generated Reports:"
echo "================================================"
echo ""
echo "📄 $COURSE_VFS/lego_pairs_fd_report.json"
echo "📄 $COURSE_VFS/lego_pairs_reextraction_manifest.json"
echo "📄 $COURSE_VFS/basket_gaps_report.json"
echo "📄 $COURSE_VFS/reextraction_task_list.json"
if [ -f "$COURSE_VFS/deleted_baskets_backup.json" ]; then
  echo "💾 $COURSE_VFS/deleted_baskets_backup.json"
fi
echo ""
