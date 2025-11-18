#!/bin/bash
# Phase 5 Pre-Flight Check
# Verifies EVERY component, dependency, and handoff before testing
# Run this BEFORE launching any Phase 5 test

set -e

echo "🔍 Phase 5 Pre-Flight Check"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ERRORS=$((ERRORS + 1))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

check_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ==============================================================================
# STEP 1: LOCAL FILESYSTEM DEPENDENCIES
# ==============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "STEP 1: Local Filesystem Dependencies"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1.1 Server script exists
echo "1.1 Phase 5 Server Script"
if [ -f "services/phases/phase5-basket-server.cjs" ]; then
    check_pass "Server script exists"
else
    check_fail "Server script missing: services/phases/phase5-basket-server.cjs"
fi
echo ""

# 1.2 Course data exists
echo "1.2 Course Data Files"
COURSE_DIR="public/vfs/courses/spa_for_eng"

if [ -f "$COURSE_DIR/seed_pairs.json" ]; then
    SEED_COUNT=$(jq 'length' "$COURSE_DIR/seed_pairs.json")
    check_pass "seed_pairs.json exists ($SEED_COUNT seeds)"
else
    check_fail "Missing: $COURSE_DIR/seed_pairs.json"
fi

if [ -f "$COURSE_DIR/lego_pairs.json" ]; then
    LEGO_COUNT=$(jq 'length' "$COURSE_DIR/lego_pairs.json")
    check_pass "lego_pairs.json exists ($LEGO_COUNT LEGOs)"
else
    check_fail "Missing: $COURSE_DIR/lego_pairs.json"
fi

if [ -f "$COURSE_DIR/lego_baskets.json" ]; then
    BASKET_COUNT=$(jq '.baskets | length' "$COURSE_DIR/lego_baskets.json")
    check_info "lego_baskets.json exists ($BASKET_COUNT baskets) - will add to this"
else
    check_info "lego_baskets.json doesn't exist - will create new"
fi
echo ""

# 1.3 Staging directory
echo "1.3 Staging Directory"
STAGING_DIR="$COURSE_DIR/phase5_baskets_staging"

if [ -d "$STAGING_DIR" ]; then
    check_pass "Staging directory exists: $STAGING_DIR"

    # Check if empty
    FILE_COUNT=$(ls -1 "$STAGING_DIR" 2>/dev/null | wc -l)
    if [ "$FILE_COUNT" -gt 0 ]; then
        check_warn "Staging directory has $FILE_COUNT files from previous runs"
        check_info "You may want to: rm $STAGING_DIR/*.json"
    else
        check_pass "Staging directory is clean"
    fi
else
    check_warn "Staging directory doesn't exist - will be created on first upload"
fi
echo ""

# 1.4 Scaffolds (optional)
echo "1.4 Phase 5 Scaffolds (Optional)"
SCAFFOLD_DIR="$COURSE_DIR/phase5_scaffolds"

if [ -d "$SCAFFOLD_DIR" ]; then
    SCAFFOLD_COUNT=$(ls -1 "$SCAFFOLD_DIR"/*.json 2>/dev/null | wc -l)
    check_info "Scaffolds exist: $SCAFFOLD_COUNT files (optional - agents can work without)"
else
    check_info "No scaffolds directory (OK - agents can work without scaffolds)"
fi
echo ""

# ==============================================================================
# STEP 2: WEB-ACCESSIBLE PROMPTS
# ==============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "STEP 2: Web-Accessible Prompts (Vercel)"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

BASE_URL="https://ssi-dashboard-v7.vercel.app"

# 2.1 Worker prompt
echo "2.1 Worker Prompt"
WORKER_URL="$BASE_URL/prompts/phase5_worker.md"
WORKER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL")

if [ "$WORKER_STATUS" = "200" ]; then
    # Check content
    WORKER_CONTENT=$(curl -s "$WORKER_URL")

    if echo "$WORKER_CONTENT" | grep -q "THIS IS LINGUISTIC WORK, NOT CODING"; then
        check_pass "Worker prompt accessible and contains NO SCRIPTS warning"
    else
        check_fail "Worker prompt accessible but missing critical warnings"
    fi

    # Check size
    WORKER_SIZE=$(echo "$WORKER_CONTENT" | wc -c)
    if [ "$WORKER_SIZE" -gt 10000 ]; then
        check_pass "Worker prompt is substantial ($WORKER_SIZE bytes)"
    else
        check_warn "Worker prompt seems small ($WORKER_SIZE bytes) - might be incomplete"
    fi
else
    check_fail "Worker prompt NOT accessible (HTTP $WORKER_STATUS): $WORKER_URL"
fi
echo ""

# 2.2 Master prompt
echo "2.2 Master Prompt"
MASTER_URL="$BASE_URL/prompts/phase5_master.md"
MASTER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$MASTER_URL")

if [ "$MASTER_STATUS" = "200" ]; then
    check_pass "Master prompt accessible: $MASTER_URL"
else
    check_fail "Master prompt NOT accessible (HTTP $MASTER_STATUS): $MASTER_URL"
fi
echo ""

# 2.3 Phase 5 Intelligence
echo "2.3 Phase 5 Intelligence"
INTEL_URL="$BASE_URL/docs/phase_intelligence/phase_5_lego_baskets.md"
INTEL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$INTEL_URL")

if [ "$INTEL_STATUS" = "200" ]; then
    # Check content
    INTEL_CONTENT=$(curl -s "$INTEL_URL")

    if echo "$INTEL_CONTENT" | grep -q "Think → Express → Validate"; then
        check_pass "Phase 5 intelligence accessible and contains methodology"
    else
        check_warn "Phase 5 intelligence accessible but might be incomplete"
    fi
else
    check_fail "Phase 5 intelligence NOT accessible (HTTP $INTEL_STATUS): $INTEL_URL"
fi
echo ""

# 2.4 Check local copies match
echo "2.4 Local vs Web Prompt Consistency"
if [ -f "public/prompts/phase5_worker.md" ]; then
    LOCAL_WORKER=$(cat public/prompts/phase5_worker.md | md5)
    WEB_WORKER=$(curl -s "$WORKER_URL" | md5)

    if [ "$LOCAL_WORKER" = "$WEB_WORKER" ]; then
        check_pass "Local and web worker prompts match (deployed correctly)"
    else
        check_warn "Local and web worker prompts DIFFER - Vercel deployment may be stale"
        check_info "Local MD5: $LOCAL_WORKER"
        check_info "Web MD5: $WEB_WORKER"
    fi
else
    check_fail "Local worker prompt missing: public/prompts/phase5_worker.md"
fi
echo ""

# ==============================================================================
# STEP 3: LOCAL SERVICES RUNNING
# ==============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "STEP 3: Local Services Running"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 3.1 Phase 5 Server
echo "3.1 Phase 5 Server (localhost:3459)"
HEALTH_RESPONSE=$(curl -s http://localhost:3459/health 2>/dev/null || echo "")

if [ -n "$HEALTH_RESPONSE" ]; then
    STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status' 2>/dev/null || echo "unknown")

    if [ "$STATUS" = "healthy" ]; then
        check_pass "Phase 5 server is healthy"

        # Check details
        PORT=$(echo "$HEALTH_RESPONSE" | jq -r '.port' 2>/dev/null)
        VFS_ROOT=$(echo "$HEALTH_RESPONSE" | jq -r '.vfsRoot' 2>/dev/null)

        check_info "Port: $PORT"
        check_info "VFS Root: $VFS_ROOT"

        # Verify VFS root is correct
        if [[ "$VFS_ROOT" == *"ssi-dashboard-v7-clean"* ]]; then
            check_pass "VFS root points to dashboard project"
        else
            check_warn "VFS root might be incorrect: $VFS_ROOT"
        fi
    else
        check_fail "Phase 5 server returned status: $STATUS"
    fi
else
    check_fail "Phase 5 server NOT running on localhost:3459"
    check_info "Start with: pm2 start services/phases/phase5-basket-server.cjs --name phase5-baskets"
fi
echo ""

# 3.2 Ngrok Tunnel
echo "3.2 Ngrok Tunnel"
NGROK_URL="https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev"
NGROK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$NGROK_URL" 2>/dev/null || echo "000")

if [ "$NGROK_STATUS" = "200" ] || [ "$NGROK_STATUS" = "404" ]; then
    check_pass "Ngrok tunnel is accessible: $NGROK_URL"

    # Test upload endpoint
    UPLOAD_TEST=$(curl -s -X POST "$NGROK_URL/phase5/upload-basket" \
        -H "Content-Type: application/json" \
        -d '{"test": true}' 2>/dev/null || echo "")

    if echo "$UPLOAD_TEST" | grep -q "course"; then
        check_pass "Upload endpoint is responding"
    else
        check_info "Upload endpoint response: $UPLOAD_TEST"
    fi
else
    check_fail "Ngrok tunnel NOT accessible (HTTP $NGROK_STATUS): $NGROK_URL"
    check_info "Check: pm2 status ngrok-tunnel"
fi
echo ""

# ==============================================================================
# STEP 4: SERVER CONFIGURATION
# ==============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "STEP 4: Server Configuration"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 4.1 Check server references correct URLs
echo "4.1 Server Prompt URL Configuration"
if grep -q "https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md" services/phases/phase5-basket-server.cjs; then
    check_pass "Server references web worker prompt (not local file)"
else
    check_fail "Server might be referencing local worker prompt instead of web URL"
fi

if grep -q "https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_5_lego_baskets.md" services/phases/phase5-basket-server.cjs; then
    check_pass "Server references web Phase 5 intelligence (not local file)"
else
    check_fail "Server might be referencing local Phase 5 intelligence instead of web URL"
fi
echo ""

# 4.2 Check stagingOnly parameter
echo "4.2 Staging Workflow Configuration"
if grep -q "params.stagingOnly" services/phases/phase5-basket-server.cjs; then
    check_pass "Server uses params.stagingOnly (bug fixed)"
else
    check_fail "Server might still reference job.stagingOnly (bug not fixed)"
fi
echo ""

# 4.3 Check no git references in prompts
echo "4.3 Git Reference Removal"
if grep -q "git push\|git commit\|git branch" public/prompts/phase5_worker.md; then
    check_warn "Worker prompt still contains git references"
else
    check_pass "Worker prompt has no git references (HTTP staging workflow)"
fi

if grep -q "git push\|git commit\|git branch" public/prompts/phase5_master.md; then
    check_warn "Master prompt still contains git references"
else
    check_pass "Master prompt has no git references (HTTP staging workflow)"
fi
echo ""

# ==============================================================================
# STEP 5: ORCHESTRATOR PROMPT GENERATION
# ==============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "STEP 5: Orchestrator Prompt Generation (Dry Run)"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 5.1 Test prompt generation function exists
echo "5.1 Prompt Generation Function"
if grep -q "function generatePhase5OrchestratorPrompt" services/phases/phase5-basket-server.cjs; then
    check_pass "generatePhase5OrchestratorPrompt function exists"
else
    check_fail "generatePhase5OrchestratorPrompt function not found"
fi
echo ""

# 5.2 Check prompt template structure
echo "5.2 Prompt Template Validation"
PROMPT_CHECKS=(
    "YOUR MISSION"
    "LEGO LIST"
    "Upload URL:"
    "CRITICAL: SUB-AGENTS MUST NOT WRITE SCRIPTS"
)

for CHECK in "${PROMPT_CHECKS[@]}"; do
    if grep -q "$CHECK" services/phases/phase5-basket-server.cjs; then
        check_pass "Template contains: $CHECK"
    else
        check_warn "Template might be missing: $CHECK"
    fi
done
echo ""

# ==============================================================================
# STEP 6: MISSING LEGO DETECTION
# ==============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "STEP 6: Missing LEGO Detection Logic"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 6.1 Test with real data
echo "6.1 Test Missing LEGO Detection (Seeds 101-105)"

if [ -f "$COURSE_DIR/lego_pairs.json" ] && [ -f "$COURSE_DIR/lego_baskets.json" ]; then
    # Get LEGOs in range S0101-S0105
    LEGOS_IN_RANGE=$(jq -r 'to_entries[] | select(.key | test("^S010[1-5]")) | .key' "$COURSE_DIR/lego_pairs.json" | wc -l)
    check_info "LEGOs in seeds S0101-S0105: $LEGOS_IN_RANGE"

    # Get existing baskets in that range
    EXISTING_BASKETS=$(jq -r '.baskets | to_entries[] | select(.key | test("^S010[1-5]")) | .key' "$COURSE_DIR/lego_baskets.json" 2>/dev/null | wc -l || echo "0")
    check_info "Existing baskets in S0101-S0105: $EXISTING_BASKETS"

    MISSING=$((LEGOS_IN_RANGE - EXISTING_BASKETS))

    if [ "$MISSING" -gt 0 ]; then
        check_pass "Can detect $MISSING missing LEGOs in S0101-S0105 (good for testing)"
    else
        check_warn "No missing LEGOs in S0101-S0105 - test range might be fully complete"
        check_info "Try a different seed range or delete some baskets for testing"
    fi
else
    check_fail "Cannot test missing LEGO detection - files missing"
fi
echo ""

# ==============================================================================
# STEP 7: UPLOAD ENDPOINT
# ==============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "STEP 7: Upload Endpoint Logic"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 7.1 Check endpoint exists
echo "7.1 Upload Endpoint Definition"
if grep -q "app.post('/phase5/upload-basket'" services/phases/phase5-basket-server.cjs; then
    check_pass "Upload endpoint defined: POST /phase5/upload-basket"
else
    check_fail "Upload endpoint not found in server"
fi
echo ""

# 7.2 Check staging save logic
echo "7.2 Staging Save Logic"
if grep -q "phase5_baskets_staging" services/phases/phase5-basket-server.cjs; then
    check_pass "Server saves to staging directory"
else
    check_fail "Server might not use staging directory"
fi
echo ""

# 7.3 Test upload with mock data
echo "7.3 Test Upload (Mock Data)"
MOCK_UPLOAD=$(curl -s -X POST http://localhost:3459/phase5/upload-basket \
    -H "Content-Type: application/json" \
    -d '{
        "course": "spa_for_eng",
        "seed": "TEST",
        "baskets": {
            "TEST001": {
                "lego": ["test", "test"],
                "practice_phrases": []
            }
        },
        "agentId": "preflight-test",
        "stagingOnly": true
    }' 2>/dev/null || echo '{"success": false}')

if echo "$MOCK_UPLOAD" | jq -e '.success' > /dev/null 2>&1; then
    check_pass "Mock upload successful"

    # Check file was created
    if [ -f "$STAGING_DIR/seed_TEST_preflight-test"* ]; then
        check_pass "Staging file created"
        # Clean up
        rm "$STAGING_DIR/seed_TEST_preflight-test"*
        check_info "Cleaned up test file"
    else
        check_warn "Staging file not found (might use different naming)"
    fi
else
    check_fail "Mock upload failed: $MOCK_UPLOAD"
fi
echo ""

# ==============================================================================
# STEP 8: AGENT SPAWNING
# ==============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "STEP 8: Agent Spawning Capability"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 8.1 Check osascript available (macOS only)
echo "8.1 osascript Availability"
if command -v osascript &> /dev/null; then
    check_pass "osascript command available"
else
    check_fail "osascript not available - cannot spawn web agents"
    check_info "Are you on macOS?"
fi
echo ""

# 8.2 Check Safari (or browser) is available
echo "8.2 Safari Browser"
if [ -d "/Applications/Safari.app" ]; then
    check_pass "Safari.app found"
else
    check_warn "Safari.app not found - might use different browser"
fi
echo ""

# ==============================================================================
# STEP 9: DATA FLOW VERIFICATION
# ==============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "STEP 9: Data Flow Verification"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "9.1 Complete Pipeline Flow"
check_info "Dashboard → API → Phase5 Server (localhost:3459)"
check_info "Server → osascript → Safari (web agent)"
check_info "Agent → WebFetch → Vercel prompts (HTTPS)"
check_info "Agent → Generate → Baskets (linguistic work)"
check_info "Agent → POST → Ngrok tunnel → Server (localhost:3459)"
check_info "Server → Save → Staging directory (git-ignored)"
check_info "Server → Validate → Track progress"
check_info "Human → Review → Merge to canon → Git commit"
echo ""

# ==============================================================================
# STEP 10: INTELLIGENCE DOCUMENTS
# ==============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "STEP 10: Intelligence Document Content Check"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "10.1 Worker Prompt Critical Sections"
WORKER_LOCAL="public/prompts/phase5_worker.md"

if [ -f "$WORKER_LOCAL" ]; then
    CRITICAL_SECTIONS=(
        "THIS IS LINGUISTIC WORK, NOT CODING"
        "Think → Express → Validate"
        "GATE COMPLIANCE"
        "2-2-2-4 DISTRIBUTION"
        "QUALITY EXAMPLE"
        "TERRIBLE EXAMPLE"
        "FINAL GRAMMAR CHECK"
    )

    for SECTION in "${CRITICAL_SECTIONS[@]}"; do
        if grep -q "$SECTION" "$WORKER_LOCAL"; then
            check_pass "Contains: $SECTION"
        else
            check_fail "Missing critical section: $SECTION"
        fi
    done
else
    check_fail "Worker prompt not found locally"
fi
echo ""

echo "10.2 Phase 5 Intelligence Document"
INTEL_LOCAL="public/docs/phase_intelligence/phase_5_lego_baskets.md"

if [ -f "$INTEL_LOCAL" ]; then
    INTEL_SECTIONS=(
        "Think → Express → Validate"
        "GATE compliance"
        "2-2-2-4 distribution"
    )

    for SECTION in "${INTEL_SECTIONS[@]}"; do
        if grep -iq "$SECTION" "$INTEL_LOCAL"; then
            check_pass "Contains: $SECTION"
        else
            check_warn "Might be missing: $SECTION"
        fi
    done
else
    check_fail "Phase 5 intelligence not found locally"
fi
echo ""

# ==============================================================================
# SUMMARY
# ==============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "SUMMARY"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅✅✅ ALL CHECKS PASSED! ✅✅✅${NC}"
    echo ""
    echo "System is ready for Phase 5 testing."
    echo ""
    echo "Next steps:"
    echo "  1. Open https://ssi-dashboard-v7.vercel.app"
    echo "  2. Click 'Generate New Course'"
    echo "  3. Select 'Phase 5 Only'"
    echo "  4. Choose 'Quick Test (10 seeds)'"
    echo "  5. Click 'Generate'"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  PASSED WITH WARNINGS ⚠️${NC}"
    echo ""
    echo "Warnings: $WARNINGS"
    echo ""
    echo "System should work, but review warnings above."
    echo "You can proceed with testing if warnings are acceptable."
    echo ""
    exit 0
else
    echo -e "${RED}❌ FAILED PRE-FLIGHT CHECK ❌${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "⛔ DO NOT TEST until all errors are resolved."
    echo ""
    echo "Fix the errors above and re-run this script:"
    echo "  ./scripts/phase5-pre-flight-check.sh"
    echo ""
    exit 1
fi
