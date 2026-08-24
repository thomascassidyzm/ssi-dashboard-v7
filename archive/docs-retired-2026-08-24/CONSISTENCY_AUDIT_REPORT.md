# Consistency Audit Report

**Date:** 2025-12-04
**Branch:** `claude/agent-consistency-audit-01G7cMU1XcGSfCEjoFCzU81i`
**Auditor:** Claude Agent

---

## Summary

| Category | Count |
|----------|-------|
| Critical Issues | 5 |
| Warnings | 8 |
| Suggestions | 4 |

---

## Critical Issues (Must Fix)

### 1. Duplicate `start-automation.cjs` with Conflicting Service Definitions

**Location:**
- `/start-automation.cjs` (current, correct)
- `/scripts/automation/start-automation.cjs` (legacy, broken)

**Problem:** The `scripts/automation/start-automation.cjs` references services that don't exist:
```
services/phases/phase1-translation-server.cjs  → DOES NOT EXIST
services/phases/phase3-lego-extraction-server.cjs → DOES NOT EXIST
services/phases/phase5-basket-server.cjs → DOES NOT EXIST
services/phases/phase6-introduction-server.cjs → DOES NOT EXIST
services/phases/phase8-audio-server.cjs → DOES NOT EXIST
```

**Impact:** Running the wrong start-automation.cjs will fail to start services.

**Fix:** Delete `/scripts/automation/start-automation.cjs` or update it to match root version.

---

### 2. Port 3465 Conflict - Duplicate Audio Servers

**Location:**
- `services/phases/audio-server.cjs` → Port 3465
- `services/phases/phase8-audio-generator.cjs` → Port 3465

**Problem:** Two different audio server implementations claim the same port.

**Impact:** Only one can run at a time. Unclear which is canonical.

**Differences:**
| Aspect | audio-server.cjs | phase8-audio-generator.cjs |
|--------|------------------|---------------------------|
| Endpoints | /plan, /start, /continue, /regenerate, /voices | /generate, /plan |
| Supabase | No | Yes (`db = require('../supabase-client.cjs')`) |
| Status | Likely legacy | Current (uses Supabase) |

**Fix:** Deprecate `audio-server.cjs` in favor of `phase8-audio-generator.cjs`.

---

### 3. Port 3457 Conflict - Translation vs Pipeline Server

**Location:**
- `services/phases/phase1-translation/server.cjs` → Port 3457
- `services/pipeline/pipeline-server.cjs` → Port 3457

**Problem:** Both services default to port 3457.

**Impact:** Cannot run both services simultaneously.

**Fix:** Change `pipeline-server.cjs` to a different port (e.g., 3462) or remove if deprecated.

---

### 4. production-api.cjs Uses S3 for Flags, Not Supabase

**Location:** `services/production-api.cjs:7`
```javascript
const s3Service = require('./s3-production-service.cjs')
```

**Problem:** The production API still uses S3 (`s3-production-service.cjs`) for sample flags, while `supabase-client.cjs` has flag management functions that are used by Phase 8/9.

**Impact:** Dual source of truth for sample flags:
- S3: `courses/{courseCode}/sample_flags.json`
- Supabase: `sample_flags` table

**Fix:** Update `production-api.cjs` to use Supabase via `supabase-client.cjs` for flag operations.

---

### 5. Outdated .env.example Port Mappings

**Location:** `.env.example:28-34`

**Current (incorrect):**
```
# Phase 1:      3457
# Phase 3:      3458
# Phase 5:      3459
# Phase 6:      3460
# Phase 8:      3461
```

**Actual ports (from start-automation.cjs):**
```
Phase 1 Translation:  3457
Phase 1 LEGO:         3458
Phase 3:              3459
Manifest:             3464
Phase 8:              3465
Phase 9:              3466
Production API:       3470
```

**Fix:** Update `.env.example` to reflect actual port mappings.

---

## Warnings (Should Fix)

### 6. WebSocket Events Mismatch

**Frontend expects (src/services/websocket.js):**
- `sample_updated` ✅ (emitted by production-api)
- `pipeline_progress` ❌ (NOT emitted anywhere)
- `generation_complete` ❌ (NOT emitted anywhere)
- `recording_completed` ✅ (emitted by production-api)
- `error` (not explicitly emitted)

**Backend emits (production-api.cjs):**
- `sample_updated` ✅
- `bulk_update` (not listened by frontend)
- `recording_completed` ✅

**Fix:** Either emit `pipeline_progress` and `generation_complete` from Phase 8, or remove listeners from frontend.

---

### 7. Status Value Inconsistency: 'complete' vs 'completed'

**Problem:** Code uses both 'complete' and 'completed' for job status:
- `services/phases/phase8-audio-generator.cjs:359`: `status = 'complete'`
- `scripts/automation/orchestrator-workflow.cjs:489`: `status = 'completed'`

**Supabase Schema (sample_flags.status):**
```sql
CONSTRAINT valid_status CHECK (status IN (
  'pending', 'flagged_text_edit', 'flagged_regen_tts',
  'flagged_human_needed', 'in_pipeline', 'tts_complete',
  'tts_failed', 'in_recording', 'recorded', 'needs_review',
  'approved', 'rejected', 'complete'
))
```

Schema uses `complete`, not `completed`.

**Fix:** Standardize on `complete` to match schema.

---

### 8. audio-server.cjs Still Referenced in 19+ Files

**Files referencing deprecated audio-server.cjs:**
- `CLAUDE.md`
- `docs/APML_V9_MIGRATION_LOG.md`
- `docs/ARCHITECTURE_LAYERED_AUTOMATION.md`
- `docs/AUDIT_API_SERVERS.md`
- `docs/COURSE_GENERATION_ARCHITECTURE.md`
- `docs/PHASE_SERVER_ARCHITECTURE.md`
- `docs/workflows/LINEAR_PIPELINE_STATUS.md`
- `ecosystem.config.cjs`
- Multiple other docs

**Fix:** Update all references to point to `phase8-audio-generator.cjs`, or clarify the deprecation status.

---

### 9. Missing Environment Variables in .env.example

**Not documented:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET`
- `S3_AUDIO_BUCKET`
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`
- `ELEVENLABS_API_KEY`
- `ANTHROPIC_API_KEY`

**Fix:** Add all required environment variables to `.env.example` with descriptions.

---

### 10. Language Code Inconsistency ✅ FIXED

**Problem:** Mix of ISO 639-3 (3-letter) and ISO 639-1 (2-letter) codes throughout codebase:

| Standard | Examples | Files Using |
|----------|----------|-------------|
| ISO 639-3 | `eng`, `spa`, `cmn`, `cym` | Supabase schema, course configs |
| ISO 639-1 | `en`, `es`, `zh` | Azure TTS locales, some manifests |

**Locations with mappings (BEFORE):**
- `services/audio-generation-planner.cjs:587-596` - Had inline `normalizeLanguageCode()` mapping
- `services/voice-discovery-service.cjs:24-25` - Used `langService.legacyToStandard()` ✅
- `scripts/phase7-compile-manifest-v3.cjs:60` - Had inline `shortCodeMap` and `langNames`
- `services/mar-service.cjs:105-107` - Had inline `langCodeMap`
- `services/uuid-service.cjs:16-38` - Had inline `LANG_CODE_MAP`

**Fix Applied:**
1. ✅ Created comprehensive documentation: `/docs/architecture/LANGUAGE_CODE_STRATEGY.md`
2. ✅ Updated `audio-generation-planner.cjs` to use `langService.legacyToStandard()`
3. ✅ Updated `uuid-service.cjs` to use `langService.standardToLegacy()`
4. ✅ Updated `phase7-compile-manifest-v3.cjs` to use language-code-service for all mappings
5. ✅ Updated `mar-service.cjs` to use language-code-service for conversions

**Canonical Standard:** ISO 639-3 (3-letter codes) for internal use, converted at TTS boundaries.
**Source of Truth:** `/tools/sync/reference/language_codes.csv` via `/services/language-code-service.cjs`

---

### 11. Orphaned Services Not in start-automation.cjs ✅ FIXED

**Services that exist but aren't started by automation:**
- ~~`services/pipeline/pipeline-server.cjs` (Port 3457)~~ - **DEPRECATED** (Fixed in Critical #3)
- `services/api/progress-tracker.cjs` (Port 3462) - **DEPRECATED** ✅
- `services/api/ngrok-proxy.cjs` (Port 3463) - **DOCUMENTED** ✅

**Status:** ✅ RESOLVED

**Actions Taken:**

1. **progress-tracker.cjs (Port 3462)** - ⚠️ DEPRECATED
   - Added deprecation notice in file header
   - Dashboard uses orchestrator WebSocket (3456) instead
   - Kept in PM2 config for manual testing only
   - Documented why it's not in start-automation.cjs

2. **ngrok-proxy.cjs (Port 3463)** - ✅ ACTIVE IN PRODUCTION
   - Documented as critical production service
   - Used by dashboard EnvironmentSwitcher and external agents
   - NOT in start-automation.cjs by design:
     - Requires ngrok tunnel (separate process)
     - Only needed for external agent access
     - Local development uses direct localhost
   - Added comprehensive documentation to file header

3. **ecosystem.config.cjs** - Updated with inline comments:
   - Progress API marked as deprecated with explanation
   - Ngrok services marked as active with usage details
   - Documented why they're in PM2 but not start-automation

4. **Created comprehensive guide:**
   - `/docs/setup/SERVICE_STARTUP_GUIDE.md`
   - Explains all service startup methods
   - Documents which services are in which config
   - Provides troubleshooting guide

**See:** `/docs/setup/SERVICE_STARTUP_GUIDE.md`

---

### 12. Phase 8 Endpoint Mismatch with Documentation

**CLAUDE.md documents (line ~258):**
```
POST /generate
GET  /status/:courseCode
GET  /health
```

**audio-server.cjs actually has:**
```
POST /plan
POST /start
POST /continue
POST /continue-phase-a
POST /regenerate
GET  /status/:courseCode
GET  /progress/:courseCode
GET  /voices
GET  /voices/:courseCode
POST /voices/discover
GET  /health
```

**phase8-audio-generator.cjs has:**
```
POST /generate
POST /plan
GET  /status/:courseCode
GET  /health
```

**Fix:** Update documentation to match the canonical Phase 8 service.

---

### 13. Supabase Schema Column Names vs Code

**Schema uses snake_case, code should map correctly:**

| Schema Column | Code Usage (supabase-client.cjs) | Status |
|--------------|----------------------------------|--------|
| `voice_id` | `voice_id: voiceId` | ✅ Correct |
| `text_normalized` | `text_normalized: normalizeText(text)` | ✅ Correct |
| `s3_bucket` | `s3_bucket: s3Bucket` | ✅ Correct |
| `s3_key` | `s3_key: s3Key` | ✅ Correct |
| `duration_ms` | `duration_ms: durationMs` | ✅ Correct |
| `file_size_bytes` | `file_size_bytes: fileSizeBytes` | ✅ Correct |
| `checksum_md5` | `checksum_md5: checksumMd5` | ✅ Correct |
| `tts_engine` | `tts_engine: ttsEngine` | ✅ Correct |
| `tts_voice_variant` | `tts_voice_variant: ttsVoiceVariant` | ✅ Correct |
| `hash_input` | `hash_input: hashInput` | ✅ Correct |

**Finding:** Column mapping is consistent. No issues found.

---

## Suggestions (Nice to Have)

### 14. Consider Removing Duplicate config-loader.cjs

**Status:** RESOLVED
**Files:**
- `services/config-loader.cjs` (DELETED)
- `services/shared/config-loader.cjs` (KEPT)

**Suggestion:** Consolidate to single location.

---

### 15. Standardize Service Logging Prefixes

**Current inconsistency:**
- `[Phase 8]` - audio-server.cjs
- `[Supabase]` - supabase-client.cjs
- `[WS]` - production-api.cjs websocket logs

**Suggestion:** Create logging utility with consistent format: `[ServiceName]`.

---

### 16. Add Health Check Response Consistency

**Current responses vary:**
```javascript
// Some services:
{ status: 'ok' }

// Others:
{ status: 'ok', timestamp: '...' }

// Others:
{ status: 'healthy', service: '...', port: ... }
```

**Suggestion:** Standardize health check response format.

---

### 17. Document Service Mesh URLs

The following service mesh URLs are configured in `start-automation.cjs` but not documented:
- `PHASE1_TRANSLATION_URL`
- `PHASE1_LEGO_URL`
- `PHASE3_URL`
- `MANIFEST_URL`
- `PHASE8_URL`
- `PHASE9_URL`
- `AUDIO_URL`
- `PRODUCTION_API_URL`

**Suggestion:** Add to `docs/setup/` or `CLAUDE.md`.

---

## Files Changed

This audit is **read-only investigation**. No files were changed.

---

## Recommended Fix Order

1. **Delete/update** `scripts/automation/start-automation.cjs` (Critical #1)
2. **Deprecate** `services/phases/audio-server.cjs` and update references (Critical #2)
3. **Fix port conflict** for `pipeline-server.cjs` (Critical #3)
4. **Update** `production-api.cjs` to use Supabase for flags (Critical #4)
5. **Update** `.env.example` with correct ports and all env vars (Critical #5, Warning #9)
6. **Add WebSocket events** to Phase 8 or remove frontend listeners (Warning #6)
7. **Standardize** status values to `complete` (Warning #7)
8. **Update** all documentation references to `audio-server.cjs` (Warning #8)

---

## Next Steps

1. Review this report with project owner
2. Create issue tickets for each critical item
3. Address critical issues first
4. Address warnings in subsequent PRs
5. Update CLAUDE.md with any architectural decisions

---

*Generated by Consistency Audit Agent*
