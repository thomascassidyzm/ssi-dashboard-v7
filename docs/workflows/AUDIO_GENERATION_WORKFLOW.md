# Audio Generation Workflow

## Overview

Audio generation creates TTS samples for language courses using Azure Speech and ElevenLabs APIs. This document describes the complete workflow from pre-generation to post-generation validation.

## Architecture Summary

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Main script | `scripts/phase8-audio-generation.cjs` | Orchestrates generation |
| Pre-flight checks | `services/preflight-check-service.cjs` | Validates credentials/tools with auto-fix |
| MAR Service | `services/mar-service.cjs` | Master Audio Registry for cross-course reuse |
| Encouragement Service | `services/encouragement-service.cjs` | Manages encouragement audio |
| Welcome Service | `services/welcome-service.cjs` | Manages course welcome audio |
| S3 Service | `services/s3-service.cjs` | Audio upload/download |
| Deduplication | `scripts/manifest-deduplication.cjs` | Pre-generation sample cleanup |
| Repopulation | `scripts/manifest-repopulation.cjs` | Post-generation variant restoration + MAR matching |
| Duration Extraction | `scripts/extract-s3-durations-parallel.cjs` | S3 existence + duration check |
| Format Validation | `tools/validators/manifest-structure-validator.cjs` | Final structure validation |

### Sample Roles and Types

Audio generation produces four types of samples, organized by **role**:

| Role | Language | Voice | Cadence | Purpose |
|------|----------|-------|---------|---------|
| `target1` | Target (e.g., Spanish) | Azure Female | slow | Primary target vocabulary |
| `target2` | Target (e.g., Spanish) | Azure Male | slow | Alternate target voice |
| `source` | Source (e.g., English) | ElevenLabs | natural | Translations/prompts |
| `presentation` | Source (e.g., English) | ElevenLabs | natural | Introductory narration |

**Phase A** generates target1, target2, and source samples (simple TTS).

**Phase B** generates presentation samples (composite audio combining narration + target clips).

**Cadence** controls playback speed:
- `slow` - Slowed down for learner comprehension (applied via time-stretch)
- `natural` - Normal speaking pace

### S3 Buckets

| Bucket | Purpose |
|--------|---------|
| `ssi-audio-stage` | Development/testing audio |
| `ssiborg-assets` | Production audio |
| `popty-bach-lfs` | Canonical resources (voices.json, encouragements, welcomes) |

### MAR (Master Audio Registry)

The MAR tracks audio samples by voice, enabling cross-course reuse:
- If "hello" was generated for `spa_for_eng`, it can be reused in `cmn_for_eng`
- Samples are matched by **normalized text** (lowercase, trimmed, no trailing periods)
- Location: `samples_database/voices/{voiceId}/samples.json`

There's also a **temporary MAR** (`temp/mar/`) used for crash-safety during generation.

---

## Complete Workflow

### Phase 1: Pre-Generation

#### Step 1.1: S3 Sync Canonical Resources

```bash
aws s3 sync s3://popty-bach-lfs/canonical/ public/vfs/canonical/ --exclude ".DS_Store"
```

This syncs:
- `voices.json` - Voice configuration and assignments
- `welcomes.json` - Course welcome message metadata
- `eng_encouragements.json` - English encouragement text + UUIDs
- `welcomes/*.wav` - Welcome audio files

#### Step 1.2: Manifest Deduplication (Pre-Generation Cleanup)

```bash
node scripts/manifest-deduplication.cjs <course_code>
```

**What it does:**
1. Creates a backup of the manifest
2. Removes encouragements (will be re-added post-generation)
3. Finds and removes duplicate seeds/intro_items/nodes
4. Validates expected vs actual samples
5. Adds missing sample placeholders (empty ID, duration=0)
6. Checks orphaned samples exist in MAR before removing
7. **Normalizes and deduplicates** - "Hablo" and "hablo." become one sample "hablo"
8. Saves cleaned manifest

**Why deduplication matters:**
- Reduces TTS API calls and costs
- "Hablo", "hablo", "hablo." all need the same audio

### Phase 2: Planning

#### Step 2.1: Show Plan

```bash
node scripts/phase8-audio-generation.cjs <course_code> --plan
```

**Output includes:**
- Total samples to generate
- Samples already in MAR (will be skipped)
- Cost breakdown (Azure = free tier, ElevenLabs = paid)
- Time estimates
- Voice assignments per role

**CRITICAL**: Agent must wait for user approval before proceeding.

### Phase 3: Generation

#### Step 3.1: Pre-flight Checks (Automatic)

Pre-flight checks run automatically at the start of `--execute` and include:

**Core Service Checks:**
- Node dependencies installed
- Azure Speech API connection
- ElevenLabs API connection
- S3 configuration and access
- SoX audio processor available
- Disk space (minimum 5GB)

**Course-Specific Manifest Checks (with auto-fix):**
- S3 bucket access verification
- Voice assignments for all roles
- Empty seeds removal (auto-fixed)
- Manifest structure validation (auto-fixed)
- Welcome state validation (auto-fixed)
- Encouragements empty (auto-fixed)
- Slashes in presentations (auto-fixed)
- Presentation/target text matching

Issues are either:
- **Auto-fixed** by the script
- **Agent actions** provided for manual fixes
- **Blocking issues** that prevent generation

#### Step 3.2: Phase A - Core Vocabulary

```bash
node scripts/phase8-audio-generation.cjs <course_code> --execute
```

Generates audio for:
- `target1` - Target language, female voice (Azure)
- `target2` - Target language, male voice (Azure)
- `source` - Source language (ElevenLabs)

**Parallel generation**: Azure and ElevenLabs workers run simultaneously (~50% faster).

#### Step 3.3: Phase A QC Checkpoint

Script pauses and generates:
- `qc_report_raw.json` - Machine-readable QC data
- `qc_report_raw.md` - Human-readable summary
- `qc_review/` directory with flagged samples organized by role

**QC is optional** - User can:
1. Listen to flagged samples (especially shortest phrases)
2. Note any that sound wrong
3. Request regeneration with `"..."` suffix for different TTS output
4. Or just approve and continue

```bash
# If regeneration needed
node scripts/phase8-audio-generation.cjs <course_code> --execute --regenerate UUID1,UUID2

# To continue after QC
node scripts/phase8-audio-generation.cjs <course_code> --execute --continue-processing
```

#### Step 3.4: Phase A Post-Processing

`--continue-processing` does:
1. Normalizes audio (target LUFS: -16)
2. Applies time-stretch based on voice config (for slow cadence)
3. Uploads to S3
4. Writes to temporary MAR

#### Step 3.5: Phase B - Presentations

Runs automatically after Phase A (or manually with `--phase=presentations`).

**What are presentations?**

Presentations are composite audio files that introduce new vocabulary. They combine:
- **Source narration** (TTS): "The Spanish for 'I want', is:"
- **Target audio clips** (from Phase A): The actual pronunciation of the word
- **Optional explanation**: Additional context with embedded target clips

**Example presentation text in manifest:**
```
The Spanish for 'I want', is: ... 'quiero' ... 'quiero'
```

The `...` markers indicate where target audio clips are inserted. The quoted word `'quiero'` is played using the pre-recorded target1/target2 audio from Phase A.

**More complex presentations with explanations:**
```
The Spanish for 'I want', is: ... 'quiero' ... 'quiero' - {target1}'Quiero' means I want something.
```

The `{target1}` tag indicates an embedded clip using target1 voice.

**Generation process:**

1. Downloads target audio files from S3 (needed for presentation assembly)
2. Extracts unique text segments from all presentations
3. Generates narration segments via TTS (ElevenLabs presentation voice)
4. Assembles final audio by concatenating: narration + silence + target clip + silence + target clip
5. Normalizes and uploads to S3

**No QC checkpoint for presentations** - they use already-QC'd target audio.

#### Step 3.6: Encouragements (Automatic)

After Phase B, the script automatically:
1. Checks `popty-bach-lfs` for existing encouragement audio
2. If missing for this language, generates via ElevenLabs
3. Adds encouragements to manifest (`slices[0].orderedEncouragements`, `slices[0].pooledEncouragements`)

#### Step 3.7: Welcome (Automatic)

After encouragements, the script automatically:
1. Checks if welcome exists for this course in `welcomes.json`
2. If configured but audio missing, generates via presentation voice
3. Updates manifest introduction (id, duration)

If no welcome is configured, helpful instructions are shown:
```
To add a welcome message:
1. Edit: public/vfs/canonical/welcomes.json
2. Add: "cmn_for_eng": { "text": "Welcome to..." }
3. Re-run audio generation
```

### Phase 4: Post-Generation

#### Step 4.1: Sync Manifest to Permanent MAR

```javascript
// Called at end of generateAudioForCourse()
marService.syncManifestToMAR(manifest, voiceAssignments, targetLang, sourceLang)
```

This backs up all generated samples to permanent MAR for future course reuse.

#### Step 4.2: Manifest Repopulation

```bash
node scripts/manifest-repopulation.cjs <course_code>
```

**What it does:**
1. Re-extracts ALL text variants from course structure (exact text, NOT normalized)
2. "hablo" becomes "Hablo" and "hablo." again as separate samples
3. Queries MAR by normalized text to get UUIDs
4. Assigns matched UUIDs to all variants
5. Reports errors for any samples without MAR matches
6. Adds encouragements back to manifest

**When to run:**
- After audio generation completes
- If you need to restore variants that were deduplicated

#### Step 4.3: S3 Existence + Duration Check

```bash
node scripts/extract-s3-durations-parallel.cjs <course_code>
```

For each sample UUID in manifest:
1. Downloads file from S3
2. Extracts duration with sox
3. Deletes local copy
4. Updates manifest with duration

Reports missing files and case mismatches.

#### Step 4.4: Format Validation

```bash
node tools/validators/manifest-structure-validator.cjs <course_code> --check-durations
```

Validates:
- Expected keys at each level (top-level, slices, seeds, samples)
- No empty seeds (seeds with no introduction_items)
- No missing durations
- No zero durations (suggests missing S3 audio)
- Sample structure (id, cadence, role, duration)

---

## Quick Reference

### Commands

```bash
# Pre-generation
aws s3 sync s3://popty-bach-lfs/canonical/ public/vfs/canonical/
node scripts/manifest-deduplication.cjs <code>

# Planning
node scripts/phase8-audio-generation.cjs <code> --plan

# Generation (after user approval)
node scripts/phase8-audio-generation.cjs <code> --execute

# After QC
node scripts/phase8-audio-generation.cjs <code> --execute --continue-processing

# Regeneration (if needed)
node scripts/phase8-audio-generation.cjs <code> --execute --regenerate UUID1,UUID2

# Post-generation
node scripts/manifest-repopulation.cjs <code>
node scripts/extract-s3-durations-parallel.cjs <code>
node tools/validators/manifest-structure-validator.cjs <code> --check-durations
```

### Flags

| Flag | Purpose |
|------|---------|
| `--plan` | Show generation plan without executing |
| `--execute` | Run audio generation |
| `--continue-processing` | Continue Phase A after QC |
| `--regenerate=UUIDs` | Regenerate specific samples |
| `--phase=targets` | Phase A only |
| `--phase=presentations` | Phase B only |
| `--skip-qc` | Skip QC checkpoint |
| `--skip-upload` | Don't upload to S3 (testing) |
| `--prod` | Upload to production bucket |
| `--sequential` | Disable parallel generation |
| `--keep-temp` | Don't delete temp files |

### Key Directories

| Path | Contents |
|------|----------|
| `temp/audio/` | Raw generated audio (expensive - don't delete!) |
| `temp/audio/processed/` | Normalized/processed audio |
| `temp/mar/` | Temporary MAR (crash-safety) |
| `samples_database/voices/` | Permanent MAR |
| `public/vfs/canonical/` | Canonical resources (synced from S3) |
| `public/vfs/courses/<code>/` | Course manifest and QC reports |
| `public/vfs/courses/<code>/qc_review/` | Flagged samples for review |

---

**Last Updated**: 2025-11-28
