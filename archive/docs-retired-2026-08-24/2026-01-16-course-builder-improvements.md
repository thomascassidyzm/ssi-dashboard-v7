# Course Builder Improvements - 2026-01-16

## Summary

Major improvements to the course builder agent spawning system, remote dashboard access, and agent context management.

## Changes Made

### 1. Remote Access (ngrok/phone monitoring)

- Fixed all API calls to use relative URLs when accessed remotely
- Added orchestrator proxy routes for `/api/stats/*` and `/api/build/*` to course-builder API
- Dashboard now works from phone via ngrok - stats display and audio playback functional
- Files changed: `orchestrator.cjs`, `api.js`, `production.js`, `ProductionOverview.vue`, `TextGeneration.vue`, `PhraseRow.vue`

### 2. Build Manager Auto-Spawn

- **Fixed**: Build manager now auto-spawns next agent when batch completes
- Root cause: `build.agent` wasn't being set to `null` after batch completion
- Now spawns Agent #2, #3, etc. automatically until target reached

### 3. Target Seeds Support

- Build now accepts `targetSeeds` parameter (default: 260)
- Stops at user-specified target, not the 668 seeds in course_seeds table
- API: `POST /api/build/start/:courseCode` with `{ targetSeeds: 260 }` in body

### 4. Batch Size Reduced to 20

- Changed from 30 to 20 seeds per agent
- Reason: Chinese course hit 97% context at 30 seeds - too close
- 20 seeds gives comfortable margin (~65% context usage)

### 5. Window Cleanup

- Before spawning Agent #2+, closes previous agent's terminal window
- Prevents RAM buildup on machines with limited memory (Kai's 8GB)
- Uses osascript to close windows containing course code in title

### 6. Agent Resume Improvements

- `/api/resume` now returns `available_vocabulary` - full list of all LEGOs
- Agent spawn prompt updated to load `ralph-methodology.md` first
- `/course-resume` skill updated to emphasize methodology loading
- Success response now says `status: INSERTED`, `action: PROCEED TO NEXT SEED`
- Warnings clearly marked as "for your NEXT seed - do NOT resubmit"

## Test Results

- Agent #1 completed 30 seeds (51-80) in ~36 minutes
- Hit 97% context - confirming 20 seeds is safer batch size
- Phrase quality good: natural Chinese, proper SHORT/MEDIUM/LONG tiers
- M-LEGO build-up working correctly (components before full phrase)

## Next Steps

- Phrase type system (statements, questions, responses) planned for future
- Can backfill question variants to earlier seeds after question vocab introduced

## Key Files Changed

```
services/course-builder-api.cjs  - Main changes (batch size, auto-spawn, cleanup)
services/orchestration/orchestrator.cjs - Proxy routes for remote access
src/services/api.js - Relative URL for remote access
src/stores/production.js - Remote access detection
src/views/production/*.vue - Remote URL fixes
.claude/commands/course-resume.md - Updated documentation
```
