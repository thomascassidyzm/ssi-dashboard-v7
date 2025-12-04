# Agent: Consistency Audit ("Have We Thought of Everything?")

## Mission

Perform a comprehensive consistency audit across the entire codebase to find mismatches, outdated references, naming inconsistencies, and potential bugs before they cause runtime issues.

**Branch:** `feature/consistency-audit`

---

## Audit Areas

This is a **read-only investigation** first. Document all findings, then fix systematically.

---

## Audit 1: Backend Service Consistency

### Check all services start correctly
```bash
# List all services in start-automation.cjs
grep -A 5 "script:" start-automation.cjs
```

### Verify each service file exists
```
services/orchestration/orchestrator.cjs      → Port 3456
services/phases/phase1-translation/server.cjs → Port 3457
services/phases/phase1-lego-extraction/server.cjs → Port 3458
services/phases/phase3-basket-generation/server.cjs → Port 3459
services/phases/manifest-compilation/server.cjs → Port 3464 (legacy?)
services/phases/phase8-audio-generator.cjs   → Port 3465
services/phases/phase9-manifest-compiler.cjs → Port 3466
services/production-api.cjs                  → Port 3470
```

### Questions to answer:
- [ ] Do all referenced service files exist?
- [ ] Do ports match between start-automation.cjs and the services themselves?
- [ ] Are there orphaned services not in start-automation.cjs?
- [ ] Is the old `audio-server.cjs` still referenced anywhere? Should it be removed?
- [ ] Is `manifest-compilation/server.cjs` still needed or replaced by Phase 9?

---

## Audit 2: Environment Variable Consistency

### Collect all env vars used across codebase
```bash
grep -r "process.env\." --include="*.cjs" --include="*.js" | grep -v node_modules
```

### Expected env vars (document actual vs expected):
```
# Core
VFS_ROOT
BASE_PORT
CHECKPOINT_MODE
ORCHESTRATOR_URL
NGROK_URL

# AWS/S3
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
S3_BUCKET
S3_AUDIO_BUCKET

# Supabase (NEW)
SUPABASE_URL
SUPABASE_SERVICE_KEY

# TTS
AZURE_SPEECH_KEY
AZURE_SPEECH_REGION
ELEVENLABS_API_KEY

# Service mesh URLs
PHASE1_TRANSLATION_URL
PHASE1_LEGO_URL
PHASE3_URL
MANIFEST_URL
PHASE8_URL
PHASE9_URL
PRODUCTION_API_URL
```

### Questions to answer:
- [ ] Are all env vars documented in CLAUDE.md?
- [ ] Are all env vars in .env.example?
- [ ] Do services fail gracefully if env vars missing?
- [ ] Are there any hardcoded URLs/keys that should be env vars?

---

## Audit 3: Supabase Schema vs Code Consistency

### Compare schema to code usage

#### Schema tables (from supabase-schema.sql):
- `voices`
- `audio_samples`
- `course_audio_usage`
- `sample_flags`
- `recording_provenance`
- `courses`

#### Check supabase-client.cjs matches:
- [ ] All table names match exactly
- [ ] All column names match exactly (snake_case in DB, camelCase in JS?)
- [ ] All foreign keys are respected in code logic

### Column name mapping check:
```
Schema                  | Code (supabase-client.cjs)
------------------------|---------------------------
voice_id                | voiceId (converted?)
text_normalized         | textNormalized
s3_bucket               | s3Bucket
s3_key                  | s3Key
duration_ms             | durationMs
file_size_bytes         | fileSizeBytes
checksum_md5            | checksumMd5
tts_engine              | ttsEngine
tts_voice_variant       | ttsVoiceVariant
hash_input              | hashInput
```

### Questions to answer:
- [ ] Does insertAudioSample() use correct column names?
- [ ] Does the schema have `hash_input` column? (was it added?)
- [ ] Are status values in code matching CHECK constraint in schema?

---

## Audit 4: File Format Consistency

### JSON file schemas - verify structure matches expectations

#### lego_baskets.json
```javascript
// Expected structure
{
  "S0001": {
    "baskets": [
      {
        "lego_id": "S0001L01",
        "cycles": [
          {
            "target": "Spanish phrase",
            "source": "English phrase"
          }
        ]
      }
    ]
  }
}
```
- [ ] Does Phase 8 extractAudioNeeds() match this structure?
- [ ] Does Phase 9 compile() match this structure?

#### course_manifest.json
```javascript
// Expected structure (v10.2)
{
  "version": "10.2",
  "courseCode": "spa_for_eng",
  "targetLang": "spa",
  "knownLang": "eng",
  "voices": { ... },
  "slices": [
    {
      "seedId": "S0001",
      "samples": {
        "Hola": [
          { "id": "uuid", "role": "target1", "cadence": "slow", "text": "Hola" }
        ]
      }
    }
  ]
}
```
- [ ] Does Phase 9 output match this?
- [ ] Does the dashboard expect this format?

#### sample_flags.json (deprecated? now in Supabase)
- [ ] Is this file still used anywhere?
- [ ] Should s3-production-service.cjs flag methods be removed/deprecated?

---

## Audit 5: Naming Consistency

### Role names
Check all code uses same role names:
```
source      - Known language (English)
target1     - Target language, voice 1
target2     - Target language, voice 2
presentation - Combined/narrative
```

Search for variations:
```bash
grep -r "target_1\|target_2\|Target1\|Target2" --include="*.cjs" --include="*.js" --include="*.vue"
```

### Language codes
Check ISO 639-3 consistency:
```
eng - English
spa - Spanish
cmn - Mandarin Chinese
cym - Welsh
fra - French
```

Search for variations:
```bash
grep -r "\"en\"\|\"es\"\|\"zh\"\|'en'\|'es'\|'zh'" --include="*.cjs" --include="*.js"
```

### Cadence names
```
natural - Normal speed (source)
slow    - Learner speed (target)
fast    - (deprecated?)
```

### Status values (sample_flags)
```
pending
flagged_text_edit
flagged_regen_tts
flagged_human_needed
in_pipeline
tts_complete
tts_failed
in_recording
recorded
needs_review
approved
rejected
complete
```
- [ ] Do all these match between schema CHECK and code?
- [ ] Are any statuses used in code but not in schema?

---

## Audit 6: API Endpoint Consistency

### Phase 8 (port 3465)
```
POST /generate
GET  /status/:courseCode
GET  /health
```
- [ ] Do these match what's documented?
- [ ] Do these match what frontend calls?

### Phase 9 (port 3466)
```
POST /compile
GET  /validate/:courseCode
GET  /health
```
- [ ] Verify endpoints exist and work

### Production API (port 3470)
```
GET  /api/production/health
GET  /api/production/:courseCode/manifest
GET  /api/production/:courseCode/flags
POST /api/production/:courseCode/flags/update
POST /api/production/:courseCode/flags/bulk-update
GET  /api/production/:courseCode/audio-metadata
POST /api/production/internal/emit
```
- [ ] Do these match frontend store expectations?
- [ ] Is production-api using Supabase or still S3 for flags?

---

## Audit 7: Frontend-Backend Contract

### Check src/stores/production.js expectations
```javascript
// API calls made by store
fetch(`/api/production/${courseCode}/manifest`)
fetch(`/api/production/${courseCode}/flags`)
fetch(`/api/production/${courseCode}/audio-metadata`)
fetch(`/api/production/${courseCode}/flags/update`)
fetch(`/api/production/${courseCode}/flags/bulk-update`)
```

### Check src/services/websocket.js events
```javascript
// Events expected
'sample_updated'
'pipeline_progress'
'generation_complete'
'recording_completed'
'error'
```
- [ ] Does production-api.cjs emit all these?
- [ ] Does phase8-audio-generator.cjs emit progress correctly?

---

## Audit 8: Deprecated Code Check

### Files that might be deprecated:
- `services/phases/audio-server.cjs` - Old Phase 8?
- `services/phases/manifest-compilation/server.cjs` - Old manifest?
- `services/audio-generation-planner.cjs` - Still used?
- `services/s3-production-service.cjs` - Flags moved to Supabase?
- `scripts/phase8-audio-generation.cjs` - Old script?

### Questions:
- [ ] Are these still imported anywhere?
- [ ] Should they be removed or marked deprecated?
- [ ] Are there duplicate implementations?

---

## Audit 9: Import/Require Consistency

### Check for broken imports
```bash
# Find all requires
grep -r "require\(" --include="*.cjs" services/ | grep -v node_modules

# Check each resolved path exists
```

### Common issues:
- Relative path wrong (`../` vs `./`)
- File renamed but import not updated
- CJS vs ESM mismatch

---

## Audit 10: Error Handling Consistency

### Check all services have:
- [ ] Health endpoint returning proper JSON
- [ ] Error responses with consistent format: `{ error: "message" }`
- [ ] Proper HTTP status codes (400, 404, 500, etc.)
- [ ] Console logging with service name prefix `[Phase 8]`, `[Supabase]`, etc.

---

## Output Format

Create a report file: `CONSISTENCY_AUDIT_REPORT.md`

```markdown
# Consistency Audit Report
Date: YYYY-MM-DD

## Summary
- X issues found
- Y warnings
- Z suggestions

## Critical Issues (Must Fix)
1. ...

## Warnings (Should Fix)
1. ...

## Suggestions (Nice to Have)
1. ...

## Files Changed
- ...
```

---

## Execution Plan

1. **Read-only audit first** - Document all findings
2. **Categorize by severity** - Critical/Warning/Suggestion
3. **Fix critical issues** - Things that would cause runtime errors
4. **Fix warnings** - Inconsistencies that could cause confusion
5. **Create PR** - With full audit report

---

## Branch & PR

1. Create branch: `feature/consistency-audit`
2. Create `CONSISTENCY_AUDIT_REPORT.md` with findings
3. Fix issues in logical commits
4. PR includes report and all fixes
