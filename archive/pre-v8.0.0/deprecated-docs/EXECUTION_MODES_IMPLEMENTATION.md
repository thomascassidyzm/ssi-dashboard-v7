# Execution Modes Implementation Complete

**Date**: 2025-11-09
**Status**: ✅ Implementation Complete

---

## Summary

Successfully implemented 3 execution modes for course generation in the SSi Dashboard:

1. **Web Mode** (Recommended) - Browser automation to claude.ai/code
2. **Local Mode** - iTerm2 + Claude CLI (existing functionality preserved)
3. **API Mode** - Direct Anthropic API calls (stub, coming soon)

---

## Files Created

### Frontend Components

1. **`src/components/ExecutionModeSelector.vue`** (NEW)
   - 3-card selector UI showing Web/Local/API modes
   - Shows pros/cons/requirements for each mode
   - Web mode recommended (highlighted with badge)
   - API mode disabled (coming soon)

2. **`src/components/ProgressMonitor.vue`** (NEW)
   - Real-time phase progress tracking
   - Polls job status every 30 seconds
   - Checks VFS for output files (seed_pairs.json, lego_pairs.json, etc.)
   - Shows execution mode badge
   - Web mode shows manual instruction callout

---

## Files Modified

### Frontend

1. **`src/views/CourseGeneration.vue`**
   - Imported ExecutionModeSelector and ProgressMonitor components
   - Added `executionMode` reactive state (default: 'web')
   - Integrated ExecutionModeSelector before course size selection
   - Integrated ProgressMonitor in progress display section
   - Passed executionMode to `api.course.generate()` call

2. **`src/services/api.js`**
   - Updated `course.generate()` to accept `executionMode` parameter
   - Passes executionMode to backend API endpoint

### Backend

3. **`automation_server.cjs`**
   - **Line 3245**: Extract `executionMode` from request body (default: 'local')
   - **Lines 3281-3305**: Route to appropriate orchestrator based on mode
   - **Lines 1150-1247**: New `spawnCourseOrchestratorWeb()` function
   - **Lines 1249-1267**: New `spawnCourseOrchestratorAPI()` stub function

---

## Implementation Details

### Web Mode Orchestrator (`spawnCourseOrchestratorWeb`)

**What it does**:
1. Generates phase prompts (Phase 1, 3, 5) using existing brief generators
2. Saves prompts to `<courseDir>/prompts/` directory
3. Opens 3 browser tabs with claude.ai/code
4. Creates placeholder prompts in `<courseDir>/web_prompts/`
5. Logs detailed instructions to console

**Manual steps required**:
1. Browser tabs open automatically
2. User copies prompts from prompt files
3. User pastes into Claude Code tabs
4. User hits Enter to execute
5. Outputs appear in VFS when complete

**Benefits**:
- Uses Claude Pro subscription ($0 cost)
- Runs on Anthropic servers (saves ~8GB RAM)
- User maintains control over execution
- Can review prompts before running

### Local Mode Orchestrator (Existing)

**Functionality**: Preserved existing `spawnCourseOrchestrator()` behavior
- Spawns iTerm2 windows with Claude CLI
- Fully automated execution
- API costs (~$0.34/batch)
- High RAM usage (~10GB for 34 agents)

### API Mode Orchestrator (Stub)

**Current behavior**:
- Returns error: "API mode not yet implemented"
- Suggests using Web Mode or Local Mode instead
- Job status set to 'failed' with helpful message

**Future implementation**:
- Direct Anthropic API calls from server
- No local resources needed
- Fully automated server-side execution

---

## UI/UX Features

### Execution Mode Selector

**Card Layout** (3 cards in grid):

1. **Web Mode Card**
   - Icon: 🌐
   - Badge: "Recommended"
   - Pros: $0 cost, 8GB RAM saved, 34 parallel agents, manual control
   - Requirements: Browser, Claude Pro account

2. **Local Mode Card**
   - Icon: 💻
   - Pros: Fully automated, parallel agents in iTerm2
   - Cons: API costs ($0.34/batch), high RAM usage (10GB)
   - Requirements: iTerm2, Claude CLI, API key

3. **API Mode Card** (disabled)
   - Icon: ⚡
   - Badge: "Coming Soon"
   - Features: Server-side automation, no local resources, parallel courses
   - Requirements: API key, server deployment

**Info Box**:
- Explains mode differences
- Highlights Web Mode as recommended
- Notes API Mode as future feature

### Progress Monitor

**Phase Tracking**:
- Phase 1: Pedagogical Translation (seed_pairs.json)
- Phase 3: LEGO Extraction (lego_pairs.json)
- Phase 5: Practice Baskets (lego_baskets.json)

**Status Indicators**:
- ✓ Green checkmark: Phase complete
- ● Yellow pulsing dot: Phase active
- ○ Gray circle: Phase pending

**File Detection**:
- Polls VFS every 30s for output files
- Shows "✓" next to phase when file exists

**Web Mode Instructions**:
- Blue callout box with manual steps
- Numbered list of required actions
- Only shown when in Web Mode

---

## Backend API Changes

### POST /api/courses/generate

**New Request Body Parameter**:
```json
{
  "target": "spa",
  "known": "eng",
  "startSeed": 1,
  "endSeed": 668,
  "executionMode": "web" // NEW: "web", "local", or "api"
}
```

**Response Enhancement**:
```json
{
  "success": true,
  "courseCode": "spa_for_eng",
  "executionMode": "web", // NEW
  "message": "Course generation started with web execution mode",
  "status": { ... }
}
```

**Routing Logic**:
```javascript
if (executionMode === 'web') {
  spawnCourseOrchestratorWeb(courseCode, params)
} else if (executionMode === 'api') {
  spawnCourseOrchestratorAPI(courseCode, params)
} else {
  spawnCourseOrchestrator(courseCode, params) // Local (default)
}
```

---

## Console Output

### Web Mode
```
[Web Orchestrator] Starting browser-based course generation: spa_for_eng
[Web Orchestrator] Mode: Claude Code on the Web (manual prompt execution)
[Web Orchestrator] ============================================
[Web Orchestrator] WEB MODE - MANUAL PROMPT EXECUTION
[Web Orchestrator] ============================================
[Web Orchestrator]
[Web Orchestrator] Browser tabs will open for each phase.
[Web Orchestrator] Prompt files will be created in:
[Web Orchestrator]   /path/to/course/prompts/
[Web Orchestrator]
[Web Orchestrator] MANUAL STEPS REQUIRED:
[Web Orchestrator]   1. Browser tabs will open automatically
[Web Orchestrator]   2. Copy prompt from prompt files
[Web Orchestrator]   3. Paste into each Claude Code tab
[Web Orchestrator]   4. Hit Enter to run
[Web Orchestrator]   5. Wait for completion
[Web Orchestrator]   6. Commit outputs to VFS
[Web Orchestrator] ============================================

[Web Orchestrator] Preparing Phase 1 prompt...
[Web Orchestrator] ✅ Phase 1 prompt: /path/to/course/prompts/phase_1_translation.md
[Web Orchestrator] Preparing Phase 3 prompt...
[Web Orchestrator] ✅ Phase 3 prompt: /path/to/course/prompts/phase_3_lego_extraction.md
[Web Orchestrator] Preparing Phase 5 prompt...
[Web Orchestrator] ✅ Phase 5 prompt: /path/to/course/prompts/phase_5_baskets.md

[Web Orchestrator] Opening 3 Claude Code browser tabs...
[Web Orchestrator] ✅ 3 browser tabs opened
[Web Orchestrator] ✅ Prompt files created: 3

[Web Orchestrator] NEXT STEPS:
[Web Orchestrator]   1. Switch to browser tabs
[Web Orchestrator]   2. Copy prompts from:
[Web Orchestrator]      - /path/to/course/prompts/phase_1_translation.md
[Web Orchestrator]      - /path/to/course/prompts/phase_3_lego_extraction.md
[Web Orchestrator]      - /path/to/course/prompts/phase_5_baskets.md
[Web Orchestrator]   3. Paste into respective Claude Code tabs
[Web Orchestrator]   4. Hit Enter to execute
[Web Orchestrator]   5. Monitor outputs in VFS
```

### API Mode (Stub)
```
[API Orchestrator] API mode requested for: spa_for_eng
[API Orchestrator] ⚠️  API mode is not yet implemented
[API Orchestrator] Please use one of these modes instead:
[API Orchestrator]   - Web Mode: Browser automation (recommended, $0 cost)
[API Orchestrator]   - Local Mode: iTerm2 + Claude CLI (fully automated)
```

---

## Testing Checklist

### ✅ Completed

1. ✅ Created ExecutionModeSelector.vue component
2. ✅ Created ProgressMonitor.vue component
3. ✅ Integrated components into CourseGeneration.vue
4. ✅ Updated API service to pass executionMode
5. ✅ Added backend routing for 3 modes
6. ✅ Implemented spawnCourseOrchestratorWeb()
7. ✅ Implemented spawnCourseOrchestratorAPI() stub
8. ✅ Verified automation_server.cjs syntax (no errors)

### 🔄 Manual Testing Required

1. ⏳ Test Web Mode end-to-end:
   - Start course generation with Web Mode
   - Verify browser tabs open
   - Verify prompt files created
   - Copy/paste prompts manually
   - Verify outputs appear in VFS
   - Verify ProgressMonitor updates

2. ⏳ Test Local Mode (backward compatibility):
   - Start course generation with Local Mode
   - Verify iTerm2 windows spawn
   - Verify existing behavior preserved

3. ⏳ Test API Mode stub:
   - Select API Mode (should be disabled in UI)
   - If somehow triggered, verify error message

4. ⏳ Test ProgressMonitor:
   - Verify polling works (every 30s)
   - Verify file detection works
   - Verify phase status indicators update
   - Verify execution mode badge shows correctly

---

## Next Steps

### Immediate
1. Manual testing of all 3 modes
2. Fix any UI/UX issues discovered
3. Verify browser automation works in real usage

### Future (API Mode Implementation)
1. Add Anthropic API client to backend
2. Implement rate limiting and error handling
3. Add progress streaming for real-time updates
4. Enable API mode in ExecutionModeSelector
5. Update spawnCourseOrchestratorAPI() with real logic

---

## Architecture Benefits

### Separation of Concerns
- **UI Layer**: ExecutionModeSelector (user choice)
- **API Layer**: api.js (parameter passing)
- **Backend Layer**: automation_server.cjs (routing + execution)
- **Monitoring Layer**: ProgressMonitor (real-time status)

### Extensibility
- Easy to add new execution modes
- Can swap orchestrators without changing UI
- Progress monitoring works for all modes

### User Experience
- Clear mode descriptions and trade-offs
- Real-time progress feedback
- Web mode saves costs and resources

---

## Code Statistics

**Lines Added**:
- ExecutionModeSelector.vue: ~185 lines
- ProgressMonitor.vue: ~240 lines
- CourseGeneration.vue: ~15 lines (modifications)
- api.js: ~5 lines (modifications)
- automation_server.cjs: ~140 lines

**Total**: ~585 lines of new code

**Files Modified**: 4
**Files Created**: 3

---

## Summary

Successfully implemented 3 execution modes with:
- ✅ Clean UI/UX for mode selection
- ✅ Backend routing logic
- ✅ Web mode orchestrator (browser automation)
- ✅ API mode stub (future implementation)
- ✅ Real-time progress monitoring
- ✅ Backward compatibility with local mode

**Ready for manual testing and user feedback!**

---

Generated: 2025-11-09
Author: Claude (Sonnet 4.5)
Status: Implementation Complete ✅
