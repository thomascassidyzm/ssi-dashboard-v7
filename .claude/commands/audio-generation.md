# Audio Generation Skill

> **Purpose**: Generate TTS audio for a language course, from manifest validation through final checks.

## Quick Reference

| Phase | Mode | User Input Required |
|-------|------|---------------------|
| Pre-flight | Automatic | No |
| Planning | Automatic | No |
| Plan Review | **STOP** | Yes - approve or ask questions |
| Phase A (Generation) | Automatic | Only on emergency |
| QC Checkpoint | **STOP** | Yes - review and approve |
| Phase B (Presentations) | Automatic | Only on emergency |
| Encouragements | **STOP if generation needed** | Yes - confirm with cost |
| Welcome | **STOP if generation needed** | Yes - confirm with cost |
| Final Checks | Automatic | No |

---

## Phase 0: Pre-Flight (Automatic)

Run these checks automatically before presenting anything to the user.

### 0.1 Manifest Validation

```bash
# Validate manifest structure and format
node scripts/validate-and-fix-samples.cjs public/vfs/courses/<course_code>/course_manifest.json
```

**Check for:**
- Valid JSON structure
- Required fields: `known`, `target`, `slices[0].samples`
- No duplicate UUIDs
- No empty seeds (seeds with no introduction_items)
- Sample format consistency

**If issues found:** Fix automatically if possible, otherwise report to user before proceeding.

### 0.2 S3 Canonical Sync

```bash
# Always sync canonicals first - this is the source of truth
aws s3 sync s3://popty-bach-lfs/canonical/ public/vfs/canonical/
```

**This syncs:**
- `voices.json` - Voice registry with assignments
- `{lang}_encouragements.json` - Encouragement content
- `{lang}_welcome.json` - Welcome audio references

### 0.3 Voice Assignment Check

Verify voice assignments exist for this course's language pair.

**Location:** `public/vfs/canonical/voices.json`

**Check:** `language_pair_assignments["{known}-{target}"]` or `course_assignments["{course_code}"]`

**If missing:** See [Voice Selection Guide](#voice-selection-guide) - this requires user input.

### 0.4 Pre-flight Service Check

```bash
# Verify API credentials and connectivity
node -e "require('./services/preflight-check-service.cjs').runAllChecks().then(r => console.log(JSON.stringify(r, null, 2)))"
```

**Checks:**
- Azure TTS credentials valid
- ElevenLabs API key valid (if needed)
- S3 bucket accessible
- Sufficient disk space in temp/

---

## Phase 1: Planning (Automatic)

### 1.1 Generate Execution Plan

```bash
node scripts/phase8-audio-generation.cjs <course_code> --plan
```

**The plan shows:**
- Total samples needed vs. existing (reusable)
- Breakdown by voice and role
- Character counts per provider
- Cost estimates (Azure, ElevenLabs)
- Time estimates

### 1.2 Understanding the Plan Output

**Key metrics to note:**
- `New to generate` - These cost money
- `Existing (reuse)` - Free, already in MAR
- `Characters to generate` - Basis for cost calculation

**Cost interpretation:**
- Azure S0: ~$4 per 1M characters
- ElevenLabs: Varies by tier, check quota remaining

---

## **STOP: Plan Review (User Decision)**

Present the plan to the user and WAIT for approval.

**Present:**
1. Summary of what will be generated
2. Cost breakdown by provider
3. Time estimate
4. Any warnings (quota limits, missing voices, etc.)

**User options:**
- "Go ahead" / "Proceed" / "Generate" → Continue to Phase A
- Questions about the plan → Answer, then wait for go-ahead
- "Stop" / "Cancel" → Abort

**DO NOT proceed to generation without explicit user approval.**

---

## Phase A: Core Generation (Automatic)

### 2.1 Execute Generation

```bash
node scripts/phase8-audio-generation.cjs <course_code> --execute
```

**This runs:**
1. Generate target1 voice samples (Azure)
2. Generate target2 voice samples (Azure)
3. Generate source voice samples (Azure)
4. Process audio (normalize, apply cadence)
5. Upload to S3
6. Prepare QC checkpoint

### 2.2 Emergency Stops Only

**Interrupt the user ONLY for:**
- API authentication failure (blocked, expired key)
- Rate limit that won't recover (permanent block)
- Infinite retry loop (same error 5+ times)
- Disk space exhausted
- Cost runaway (generating way more than planned)

**DO NOT interrupt for:**
- Individual sample failures (will retry automatically)
- Temporary rate limits (will back off and retry)
- Network blips (will retry)
- Normal progress updates

### 2.3 QC Checkpoint Preparation

After Phase A completes, the system generates:
- `qc_report_raw.json` - Detailed QC analysis
- `qc_report_raw.md` - Human-readable summary
- `qc_review/<role>/*.mp3` - Flagged samples for listening

---

## **STOP: QC Checkpoint (User Decision)**

Present QC results and WAIT for approval.

**Present:**
1. Overall pass/fail status
2. Number of samples flagged for review
3. Categories of issues found
4. Location of review files

**User options:**
- "Looks good" / "Continue" → Proceed to Phase B
- "Regenerate X, Y, Z" → Run with `--regenerate UUID1,UUID2,...`
- "Let me listen first" → Wait for feedback
- "Stop" → Abort

**Command for regeneration:**
```bash
node scripts/phase8-audio-generation.cjs <course_code> --execute --regenerate UUID1,UUID2,UUID3
```

---

## Phase B: Presentations (Automatic)

### 3.1 Continue Processing

```bash
node scripts/phase8-audio-generation.cjs <course_code> --execute --continue-processing
```

**This runs:**
1. Generate presentation voice segments
2. Process and normalize audio
3. Upload to S3
4. Sync samples to MAR (manifest → MAR)
5. Re-expand samples with durations
6. Check encouragements status
7. Check welcome status

### 3.2 Presentation Segment Deduplication

Segments are deduplicated by normalized text. The normalization:
- Lowercases
- Trims whitespace
- Removes leading/trailing commas, periods, spaces
- Normalizes internal whitespace

So `"means I'm,"` and `"means I'm"` are treated as the same segment.

---

## **STOP: Encouragements (User Decision if Generation Needed)**

### 4.1 Check Encouragements

The system checks:
1. Load canonical encouragements from `{source_lang}_encouragements.json`
2. Check `samples_database/encouragement_samples/{lang}_samples.json` for existing audio
3. Match by TEXT (not by ID) to find reusable samples

**Key distinction:**
- Canonical encouragement ID (e.g., `EB874772-...`) = item identifier
- Sample UUID (e.g., `BA3E1005-...`) = audio file identifier
- These are DIFFERENT - match by text content

### 4.2 If All Encouragements Have Audio

Report status and continue automatically.

### 4.3 If Generation Needed

**STOP and present to user:**
1. Number of encouragements missing audio
2. Text of missing encouragements
3. Voice that will be used (ElevenLabs typically)
4. Cost estimate (character count × rate)

**Wait for user approval before generating.**

---

## **STOP: Welcome (User Decision if Generation Needed)**

### 5.1 Check Welcome Audio

The system checks:
1. Load welcome reference from `{source_lang}_welcome.json`
2. Verify audio exists in S3 at expected location

### 5.2 If Welcome Exists

Report status and continue automatically.

### 5.3 If Welcome Needs Generation

**STOP and present to user:**
1. Welcome text content
2. Voice assignment
3. Cost estimate

**Wait for user approval before generating.**

---

## Phase C: Final Checks (Automatic)

### 6.1 Final Validation

Run automatically after all generation complete:

```javascript
// These checks run automatically:
- findDuplicateSeeds(manifest)      // No duplicate seed entries
- findDuplicateIntroItems(manifest) // No duplicate introduction items
- findEmptySeeds(manifest)          // No seeds without content
- verifyAllSamplesInS3(manifest)    // All UUIDs have S3 files
```

### 6.2 Version Prompt

**Ask user:** "What version should this manifest be? (Default: 1.0.0 for new language pairs)"

### 6.3 Final Manifest Save

Save manifest with:
- All sample UUIDs populated
- Durations from S3 verification
- Tokens and lemmas expanded
- Version set
- Timestamp updated

---

## Phase D: Post-Generation Validation

After all audio generation is complete, run these validation steps before deploying to stage.

### 7.1 Structure Validation

Validate manifest structure against reference:

```bash
node tools/validators/manifest-structure-validator.cjs <course_code>
```

**Checks:**
- All required keys at all levels (top, slice, seed, intro_item, sample)
- UUID matching (seed.id = seed.node.id, item.id = item.node.id)
- UUID format (all uppercase)
- No empty seeds (seeds without introduction_items)
- Tokens/lemmas populated
- Encouragements in slices (not top-level)

**Auto-fix mode:**
```bash
node tools/validators/manifest-structure-validator.cjs <course_code> --fix
```

### 7.2 S3 Duration Extraction

Extract actual durations from S3 audio files and update manifest:

```bash
node scripts/extract-s3-durations-parallel.cjs <course_code>
```

**What it does:**
1. Collects all sample UUIDs from manifest (including encouragements)
2. Downloads audio from S3 (`ssi-audio-stage/mastered/`)
3. Extracts duration using `sox`
4. Updates manifest with actual durations
5. Reports missing files (samples with no audio in S3)

**Note:** Run this AFTER audio generation is complete and uploaded to S3.

### 7.3 Final Duration Check

After S3 extraction, verify all samples have durations:

```bash
node tools/validators/manifest-structure-validator.cjs <course_code> --check-durations
```

**Expected results:**
- 0 samples with missing duration
- 0 samples with duration = 0

**If samples have duration = 0:**
- These are samples without audio in S3
- Check if they're encouragements (expected if encouragement audio not generated yet)
- Check if there were upload failures during generation

### 7.4 Complete Validation Workflow

```bash
# 1. Validate structure
node tools/validators/manifest-structure-validator.cjs <course_code>

# 2. Extract S3 durations (run after audio is in S3)
node scripts/extract-s3-durations-parallel.cjs <course_code>

# 3. Verify durations populated
node tools/validators/manifest-structure-validator.cjs <course_code> --check-durations

# 4. If all passes, course is ready for stage deployment
```

---

## Error Handling

### API Errors

| Error | Action |
|-------|--------|
| 401 Unauthorized | Stop - credentials invalid, report to user |
| 429 Rate Limited | Back off exponentially, retry up to 5 times |
| 500 Server Error | Retry with backoff, fail after 3 attempts |
| Network timeout | Retry with longer timeout, fail after 3 attempts |

### Generation Failures

| Situation | Action |
|-----------|--------|
| Single sample fails | Log, continue, report in summary |
| 10%+ samples fail | Stop, report to user, suggest retry |
| Same error repeats 5x | Stop, likely systemic issue |

### Disk/Storage Errors

| Error | Action |
|-------|--------|
| Disk full | Stop immediately, report space needed |
| S3 upload fails | Retry 3x, then report specific files |
| MAR write fails | Stop, report - data integrity issue |

---

## Voice Selection Guide

If no voice assignments exist for a language pair:

### 1. Check Precedent

Look at `voices.json` for existing assignments with same languages:
- What voices are used for this target language in other courses?
- What voices are used for this source language?

### 2. Selection Criteria

- **target1**: Typically female voice for target language
- **target2**: Typically male voice (different from target1)
- **source**: Voice for known/source language
- **presentation**: Usually same as source (teacher voice)

### 3. Update voices.json

Add to `language_pair_assignments`:
```json
"{known}-{target}": {
  "target1": "azure_es_female_1",
  "target2": "azure_es_male_1",
  "source": "azure_en_female_1",
  "presentation": "azure_en_female_1"
}
```

### 4. Sync to S3

After updating locally:
```bash
aws s3 cp public/vfs/canonical/voices.json s3://popty-bach-lfs/canonical/voices.json
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `scripts/phase8-audio-generation.cjs` | Main orchestrator |
| `services/mar-service.cjs` | MAR (sample registry) operations |
| `services/azure-tts-service.cjs` | Azure TTS generation |
| `services/elevenlabs-service.cjs` | ElevenLabs generation |
| `services/encouragement-service.cjs` | Encouragement handling |
| `services/audio-processor.cjs` | Audio normalization/processing |
| `services/s3-service.cjs` | S3 upload/download |
| `services/audio-generation-planner.cjs` | Cost/time estimation |
| `public/vfs/canonical/voices.json` | Voice registry |
| `samples_database/voices/` | MAR voice sample storage |
| `samples_database/encouragement_samples/` | Encouragement audio samples |
| **Validation** | |
| `tools/validators/manifest-structure-validator.cjs` | Structure validation & auto-fix |
| `scripts/extract-s3-durations-parallel.cjs` | S3 duration extraction |
| `scripts/validate-and-fix-samples.cjs` | Sample/orphan validation |

---

## Quick Commands

```bash
# Full workflow
node scripts/phase8-audio-generation.cjs <course> --plan          # Step 1: Plan
node scripts/phase8-audio-generation.cjs <course> --execute       # Step 2: Generate Phase A
node scripts/phase8-audio-generation.cjs <course> --execute --continue-processing  # Step 3: Phase B

# Regenerate specific samples
node scripts/phase8-audio-generation.cjs <course> --execute --regenerate UUID1,UUID2

# Post-generation validation (Phase D)
node tools/validators/manifest-structure-validator.cjs <course>              # Structure check
node scripts/extract-s3-durations-parallel.cjs <course>                       # Extract S3 durations
node tools/validators/manifest-structure-validator.cjs <course> --check-durations  # Verify durations

# Sample/structure validation
node scripts/validate-and-fix-samples.cjs public/vfs/courses/<course>/course_manifest.json

# Rebuild MAR from manifest (recovery)
node scripts/rebuild-mar-from-manifest.cjs <course>
```
