# Phase 8: Audio Generation - Claude Code Workflow

## Overview

Phase 8 generates TTS audio samples for language courses using Azure Speech and ElevenLabs APIs. This document describes the recommended workflow for Claude Code agents to manage the audio generation process with proper QC review integration.

## Current Issues (As of 2025-11-20)

1. **Auto-execution problem**: Multiple `--execute` processes launch in background without user confirmation after showing `--plan`
2. **QC report generation**: QC reports claimed to be generated but files don't exist
3. **File access**: Claude Code cannot easily access QC review files for analysis
4. **Workflow gaps**: No clear handoff from "show plan" → "user approves" → "generate" → "QC review"

## Recommended Workflow

### Step 1: S3 Sync (Always First)

**ALWAYS sync canonical resources before starting Phase 8:**

```bash
aws s3 sync s3://popty-bach-lfs/canonical/ public/vfs/canonical/ --exclude ".DS_Store"
```

This ensures:
- `voices.json` is up to date
- `welcomes.json` is available
- Encouragement audio files exist

### Step 2: Manifest Hygiene (Critical)

**Before generating audio, validate and clean the course manifest:**

```bash
# Run hygiene script to validate and fix manifest samples
node scripts/validate-and-fix-samples.cjs public/vfs/courses/<course_code>/course_manifest.json
```

**What it does:**
- Validates all required samples are in the manifest (source, target1, target2, presentation)
- Identifies missing samples (referenced in course but not in samples section)
- Identifies orphaned samples (exist in samples but not referenced in course)
- Automatically adds missing samples with default metadata
- Automatically removes orphaned samples to prevent unnecessary audio generation

**Why this matters:**
- **Prevents missing audio**: Ensures every phrase in the course has corresponding sample entries
- **Saves costs**: Removes orphaned samples so you don't generate audio for unused phrases
- **Catches data errors**: Identifies structural issues in the manifest before expensive API calls
- **Clean manifest**: Ensures manifest structure is valid before Phase 8 processing

**Expected output:**
```
✨ Manifest is perfect! No changes needed.
```

Or if issues found:
```
❌ Missing 12 samples
⚠️  Orphaned 5 samples
✅ Added missing samples: target1: 6, target2: 6
✅ Removed orphaned samples: source: 3, presentation: 2
```

### Step 3: Show Plan and Wait for Approval

**Show the plan WITHOUT executing:**

```bash
node scripts/phase8-audio-generation.cjs <course_code> --plan
```

**Output includes:**
- Total samples to generate
- Cost breakdown (Azure FREE, ElevenLabs paid)
- Time estimates
- Voice assignments per role

**Claude Code should:**
1. Run the plan command
2. Parse and present the output to the user
3. **WAIT for explicit user approval** before proceeding
4. Ask: "Do you want to proceed with this audio generation plan?"

**DO NOT:**
- Auto-launch `--execute` in the background
- Proceed without user confirmation
- Run multiple execution attempts simultaneously

### Step 4: Execute Audio Generation (User Approved)

**After user approves, run execution:**

```bash
node scripts/phase8-audio-generation.cjs <course_code> --execute 2>&1 | tee /tmp/phase8-<course_code>.log
```

**Flags available:**
- `--skip-upload` - Generate locally without S3 upload (testing)
- `--keep-temp` - Don't delete temp audio files
- `--skip-qc` - Skip QC checkpoint and continue to processing
- `--prod` - Upload to production bucket (default is stage)
- `--sequential` - Use sequential generation (default is parallel - ~50% faster)

**Execution flow:**
1. Pre-flight checks (Azure, ElevenLabs, S3, SoX)
2. Load course manifest
3. Analyze what needs generation
4. **Phase A: Core Vocabulary** (targets + source)
   - Generate audio for all roles
   - Run quality control checks
   - **PAUSE for QC review** (unless `--skip-qc`)
5. **Phase B: Presentations** (if any)
   - Generate presentation audio
   - Run quality control checks
   - **PAUSE for QC review** (unless `--skip-qc`)
6. Process audio (normalize, time stretch)
7. Upload to S3
8. Update course manifest with sample metadata

### Step 5: QC Review (Critical Checkpoint)

**When execution pauses for QC:**

The script generates:
1. **QC Report JSON**: `vfs/courses/<course_code>/qc_report_raw.json`
2. **QC Report Markdown**: `vfs/courses/<course_code>/qc_report_raw.md`
3. **QC Review Directory**: `vfs/courses/<course_code>/qc_review/`
   - `target1/` - Spanish (slow) - Female voice
   - `target2/` - Spanish (slow) - Male voice
   - `source/` - English (natural) - Aran voice
   - `presentation/` - English (natural) - Aran voice
   - `README.txt` - Review instructions

**QC Review Directory Structure:**

```
qc_review/
├── README.txt
├── target1/
│   ├── high_quiero_<UUID>.mp3
│   ├── high_hablar_<UUID>.mp3
│   └── ...
├── target2/
│   └── ...
├── source/
│   └── ...
└── presentation/
    └── ...
```

**Filename format:** `[priority]_[text]_[UUID].mp3`
- Priority: `high`, `medium`, or `low`
- Text: Sanitized version of the phrase
- UUID: Sample identifier for regeneration

**Claude Code Review Workflow:**

1. **Read the QC report:**
   ```javascript
   // Read vfs/courses/<course_code>/qc_report_raw.json
   ```

2. **Present summary to user:**
   - Total flagged samples
   - Severity breakdown (high/medium/low)
   - Flag types (too_short, too_long, speed_mismatch, etc.)

3. **Offer options:**
   - "Review QC directory at `vfs/courses/<course_code>/qc_review/`"
   - "Listen to flagged samples and note UUIDs of bad audio"
   - "Regenerate specific UUIDs"
   - "Approve all and continue processing"
   - "Skip flagged samples and proceed"

4. **If user wants to regenerate:**
   ```bash
   node scripts/phase8-audio-generation.cjs <course_code> --execute --regenerate UUID1,UUID2,UUID3
   ```

5. **If user approves all:**
   ```bash
   node scripts/phase8-audio-generation.cjs <course_code> --execute --continue-processing
   ```

### Step 6: Continue Processing (After QC Approval)

**After QC review, continue with:**

```bash
node scripts/phase8-audio-generation.cjs <course_code> --execute --continue-processing
```

This will:
1. Process all generated audio (normalize, time stretch)
2. Upload mastered files to S3
3. Extract durations
4. Update course manifest with sample metadata
5. Save manifest back to disk

## Common QC Flags

### Too Short / Too Long
- **Cause**: Text length doesn't match expected duration
- **Fix**: Usually safe to accept for short words
- **Regenerate**: If duration is extremely off

### Speed Mismatch
- **Cause**: Cadence doesn't match role expectations
- **Fix**: Regenerate with correct cadence setting

### AI Artifacts
- **Manual detection**: Listen for breathing, laughter, stutters
- **Fix**: Regenerate 2-3 times; if persistent, use manual generation

## Error Handling

### QC Report Not Generated

**Symptom:** Script says "QC reports generated" but files don't exist

**Diagnosis:**
```bash
# Check if report exists
ls -la vfs/courses/<course_code>/qc_report_raw.*

# Check for errors in log
tail -100 /tmp/phase8-<course_code>.log | grep -i error
```

**Fix:**
1. Check that `qcService.generateQCReport()` is being called
2. Verify write permissions on `vfs/courses/<course_code>/`
3. Check for errors in quality-control-service.cjs

### QC Review Directory Not Created

**Symptom:** Script says "creating QC review directory" but directory is empty

**Diagnosis:**
```bash
# Check if directory exists
ls -la vfs/courses/<course_code>/qc_review/

# Check temp audio directory
ls -la temp/audio/ | head -20
```

**Fix:**
1. Verify QC report JSON was created first
2. Check that temp audio files exist (UUIDs matching report)
3. Run manually: `node scripts/create-qc-review.cjs <course_code> vfs/courses/<course_code>/qc_report_raw.json temp/audio`

### Multiple Background Processes

**Symptom:** Multiple `--execute` processes running simultaneously

**Diagnosis:**
```bash
ps aux | grep phase8-audio-generation
```

**Fix:**
```bash
# Kill all Phase 8 processes
pkill -f "phase8-audio-generation.cjs"

# Verify stopped
ps aux | grep phase8-audio-generation
```

## Recovery Procedure (If Generation Fails)

**When to use**: Phase 8 crashed/stopped during processing or upload, leaving unprocessed MP3s in `temp/audio/`

### What the Recovery Script Does

1. ✅ **Finds unprocessed samples** - Scans `temp/audio/` for MP3s not yet in temp MAR
2. ✅ **Processes audio** - Applies normalization + time-stretch (voice-specific settings)
3. ✅ **Imports to temp MAR** - Adds samples to temporary Master Audio Registry
4. ✅ **Uploads to S3** - Publishes processed samples to S3 bucket

### Usage

```bash
# Basic recovery (processes + imports + uploads to default bucket)
node scripts/phase8-recovery.cjs <course_code>

# Example
node scripts/phase8-recovery.cjs spa_for_eng_TEST

# Custom S3 bucket
node scripts/phase8-recovery.cjs spa_for_eng_TEST --bucket ssi-audio-stage

# Skip S3 upload (only process + import to MAR)
node scripts/phase8-recovery.cjs spa_for_eng_TEST --skip-upload
```

### When You Need Recovery

**Scenario 1: Script crashed during processing**
```
✅ Generated: 428 Azure + 200 ElevenLabs samples
❌ Script crashed before processing
📁 Result: 628 raw MP3s in temp/audio/, not processed
```

**Solution**: Run recovery script → processes all → imports to MAR → uploads to S3

**Scenario 2: S3 upload failed**
```
✅ Generated: 628 samples
✅ Processed: 628 samples
❌ S3 upload failed (network/credentials issue)
📁 Result: Processed files in temp/audio/processed/, not uploaded
```

**Solution**: Run recovery script → imports to MAR → uploads to S3

**Scenario 3: Worker killed mid-generation**
```
✅ Generated: 243 ElevenLabs samples
❌ Azure worker killed (rate limit/timeout)
📁 Result: 243 MP3s in temp/audio/, not processed
```

**Solution**: Run recovery script → processes existing → then continue Phase 8

### Standard Recovery Workflow

1. **Check what's in temp/audio/**
   ```bash
   ls temp/audio/*.mp3 | wc -l   # Count raw MP3s
   ```

2. **Run recovery**
   ```bash
   node scripts/phase8-recovery.cjs spa_for_eng_TEST
   ```

3. **Continue Phase 8**
   ```bash
   # Recovery imports to temp MAR, so Phase 8 will skip those samples
   node scripts/phase8-audio-generation.cjs spa_for_eng_TEST --execute
   ```

### What Gets Protected

- ✅ **Existing temp MAR entries** - Recovery skips samples already imported
- ✅ **Course manifest metadata** - Recovery reads sample details from manifest
- ✅ **Voice-specific settings** - Processing uses correct normalization/stretch per voice
- ✅ **Expensive TTS samples** - Never regenerate, always process existing files

### Important Notes

**DO NOT delete `temp/audio/` before recovery!**
- Raw MP3s = expensive API calls (Azure TTS, ElevenLabs)
- Recovery script processes existing files without regeneration
- Only delete after confirming all samples imported to MAR

**Recovery is idempotent**
- Safe to run multiple times
- Skips samples already in temp MAR
- Won't double-upload to S3 (S3 overwrites duplicates)

## Parallel Provider Generation (New!)

**Status**: ✅ Implemented (2025-11-20)

Phase 8 now generates Azure and ElevenLabs audio **in parallel** by default, reducing generation time by ~50%.

### How It Works

1. **Provider Workers**: Separate Node.js processes for each provider
   - `scripts/phase8-worker-azure.cjs` - Azure TTS generation
   - `scripts/phase8-worker-elevenlabs.cjs` - ElevenLabs generation

2. **Parallel Execution**: Workers spawn simultaneously
   - Azure: Generates Spanish target1 + target2 samples
   - ElevenLabs: Generates English source + presentation samples
   - Both run concurrently instead of sequentially

3. **Result Merging**: Coordinator waits for all workers and merges results

### Performance Impact

**Example (spa_for_eng_TEST - 26 samples):**
- Sequential: ~8 minutes (2 + 2 + 4)
- Parallel: ~4 minutes (max(4, 4))
- **Speedup: 50%**

**Full Course (668 seeds - ~850 samples):**
- Sequential: ~2 hours
- Parallel: ~1 hour
- **Speedup: 50%**

### Usage

**Default (parallel):**
```bash
node scripts/phase8-audio-generation.cjs spa_for_eng_TEST --execute
```

**Sequential mode (if needed for debugging):**
```bash
node scripts/phase8-audio-generation.cjs spa_for_eng_TEST --execute --sequential
```

### Architecture

```
Main Process (phase8-audio-generation.cjs)
    ↓
    ├─→ Azure Worker Process (phase8-worker-azure.cjs)
    │   └─→ Generates: target1, target2
    │
    └─→ ElevenLabs Worker Process (phase8-worker-elevenlabs.cjs)
        └─→ Generates: source, presentation

    [Both run simultaneously]

    ↓
Merge Results → QC → Processing → Upload
```

### Benefits

- **Faster generation**: ~50% time reduction for courses with multiple providers
- **Better resource utilization**: Leverages multiple API connections simultaneously
- **Isolated error handling**: Provider failures don't affect other providers
- **Scalable**: Easy to add more provider workers in future

## Future Enhancement: Phase 8 Skill

**Proposal**: Create a Claude Code Skill to encapsulate the Phase 8 workflow

**Skill Responsibilities:**
1. S3 sync canonical resources
2. Show plan and parse output
3. Wait for user approval (interactive)
4. Execute generation with progress tracking
5. Present QC review interactively
6. Offer regeneration options
7. Continue processing after approval

**Skill Interface:**
```javascript
// Proposed usage
skill: "phase8"
// Or with parameters
skill: "phase8 --course spa_for_eng_TEST --mode plan"
```

**Benefits:**
- Encapsulates complex workflow
- Built-in user interaction points
- Prevents auto-execution issues
- Better error handling
- Reusable across courses

**Implementation:**
- Create `.claude/skills/phase8/` directory
- Define skill metadata and prompts
- Integrate with existing scripts
- Add interactive checkpoints

## Checklist for Claude Code Agents

Before starting Phase 8:
- [ ] Sync S3 canonical resources
- [ ] Run manifest hygiene script (validate-and-fix-samples.cjs)
- [ ] Verify manifest is clean (no missing/orphaned samples)
- [ ] Run `--plan` and show to user
- [ ] **WAIT for explicit user approval**
- [ ] Run `--execute` with appropriate flags
- [ ] Monitor for QC checkpoint
- [ ] Present QC report to user
- [ ] Offer regeneration or approval options
- [ ] Continue processing after approval
- [ ] Verify manifest updated with sample metadata

**DO NOT:**
- [ ] Auto-execute without user approval
- [ ] Run multiple executions simultaneously
- [ ] Skip QC review checkpoints
- [ ] Proceed if QC reports are missing
- [ ] Delete `temp/audio/` without running recovery first

**If generation fails mid-process:**
- [ ] Check for unprocessed MP3s: `ls temp/audio/*.mp3 | wc -l`
- [ ] Run recovery script: `node scripts/phase8-recovery.cjs <course_code>`
- [ ] Then continue Phase 8 normally

## See Also

- `scripts/phase8-audio-generation.cjs` - Main script
- `scripts/phase8-recovery.cjs` - **Recovery tool for failed generation**
- `services/quality-control-service.cjs` - QC logic
- `scripts/create-qc-review.cjs` - QC review directory generator
- `docs/REGENERATION_STRATEGY.md` - Detailed regeneration strategies
- `docs/PHASE8_CONNECTION_POOL.md` - Azure TTS connection pool implementation
- `CLAUDE.md` - General agent guidelines

---

**Last Updated**: 2025-11-20
**Status**: Phase 8 workflow needs refinement - see "Current Issues" section
