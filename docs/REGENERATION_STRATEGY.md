# Regeneration Strategy for Problematic Samples

This document explains how to handle samples that consistently fail or produce poor quality audio, particularly very short words.

**Status**: Strategy documented. Implementation phases 2-5 will be built as needed. For now, ask Claude Code for help with problematic samples.

## The Problem

Very short words (1 character like "a", "I") often have TTS issues:
- Breathing sounds
- Laughter artifacts
- Unnatural elongation
- Background noise

**Why they fail repeatedly:**
- Azure/ElevenLabs APIs are non-deterministic but biased
- If a word produces artifacts once, it's likely to do so again
- Simply retrying the same API call often produces the same bad result
- Eventually (after many attempts) you might get a clean version

## Strategy Overview

### Phase 1: Automatic Retries (Built-in)

The Phase 8 pipeline automatically retries failed generations:
- 3 attempts with exponential backoff
- Handles transient errors (rate limits, timeouts)
- Logged in `logs/phase8-errors.jsonl`

**When to use**: Always runs automatically, no action needed.

### Phase 2: Manual Regeneration (Script)

**Status**: 🚧 To be implemented

For samples flagged in QC report that need regeneration:

```bash
node scripts/phase8-audio-generation.cjs <course_code> --regenerate <uuid1>,<uuid2>,...
```

This will:
1. Extract the specific samples from the manifest
2. Generate fresh audio (new API call, different random seed)
3. Process and upload to S3
4. Update MAR and manifest
5. Verify durations

**When to use**:
- After reviewing QC report
- Identified specific samples that need improvement
- Want to try generation again with different API state

**Limitations**:
- Still using same API, may produce same artifacts
- Can run multiple times but diminishing returns
- Max 5 regeneration attempts tracked per sample

**Current workaround**: Ask Claude Code to help regenerate specific samples

### Phase 3: Alternative Voice (Experimental)

**Status**: 🚧 To be implemented

Try a different voice for problematic words:

```bash
node scripts/regenerate-with-alternative.cjs <course_code> <uuid> --voice <alternative_voice_id>
```

This generates the sample using a different voice from the same language.

**When to use**:
- Sample fails repeatedly with primary voice
- Alternative voice available for same language/gender
- Willing to accept voice inconsistency for edge cases

**Trade-offs**:
- Voice inconsistency (user hears different voice for one word)
- Only viable for very short words where voice recognition is minimal
- Need to document which samples use alternative voices

**Current workaround**: Ask Claude Code to help generate with alternative voice

### Phase 4: Manual Web Interface Generation

**Status**: ✅ Available (manual process)

**Last resort** for samples that won't work via API.

#### Steps:

1. **Identify the problematic sample** from QC report:
   ```
   UUID: abc123-def456
   Text: "a"
   Language: eng
   Voice: azure_en-US-AvaNeural
   ```

2. **Generate via Azure Speech Studio** (https://speech.microsoft.com/portal/audiocontentcreation):
   - Select voice: `en-US-AvaNeural`
   - Enter text: "a"
   - Adjust SSML if needed (speed, pitch)
   - Preview until satisfied
   - Download MP3

3. **Process manually** (🚧 helper scripts to be implemented):
   ```bash
   # Normalize and time-stretch if needed (future script)
   node scripts/process-audio.cjs input.mp3 output.mp3 --speed 0.7 --normalize

   # Rename to UUID
   mv output.mp3 temp/manual/abc123-def456.mp3
   ```

   **Current workaround**: Ask Claude Code to help process the audio file

4. **Import to pipeline** (🚧 to be implemented):
   ```bash
   node scripts/import-manual-samples.cjs <course_code> temp/manual/*.mp3
   ```

   This will:
   - Verify UUID matches samples in manifest
   - Upload to S3
   - Extract duration with sox
   - Update MAR and manifest
   - Mark as manually generated in metadata

   **Current workaround**: Ask Claude Code to help import and upload the processed file

5. **Document in notes**:
   The sample will have a note in MAR:
   ```json
   {
     "notes": "Manually generated via Azure Speech Studio due to API artifacts",
     "manual_generation": true,
     "generation_date": "2025-01-27"
   }
   ```

**When to use**:
- Exhausted all automatic regeneration attempts (5+)
- Sample is critical and artifacts unacceptable
- Time available for manual intervention
- Very small number of samples (<5)

**Trade-offs**:
- Time-consuming
- Doesn't scale
- Manual process prone to errors
- Need to track which samples are manual

### Phase 5: Accept Imperfection

**Status**: ✅ Available (manual process)

For some samples, it may be better to accept minor artifacts:

**Consider acceptance when:**
- Word appears only once in course
- Artifacts are mild (subtle breathing, not laughter)
- Word is not primary learning vocabulary
- Cost/time of regeneration exceeds value

**How to mark as accepted** (🚧 helper script to be implemented):
```bash
node scripts/mark-sample-accepted.cjs <course_code> <uuid> --reason "Minor artifacts acceptable for single occurrence"
```

This removes the sample from QC flagging and adds a note.

**Current workaround**: Simply don't regenerate the sample and document decision in notes

---

## Regeneration Workflow

### Step 1: Review QC Report

After initial generation, review the QC report:

```bash
# Open the Markdown report
open vfs/courses/<course_code>/qc_report.md

# Or view JSON for scripting
cat vfs/courses/<course_code>/qc_report.json | jq '.samples[] | select(.highest_severity=="high")'
```

### Step 2: Categorize Flagged Samples

Sort samples by regeneration strategy:

**Group A: Auto-retry candidates** (Phase 2)
- Failed due to transient errors (rate limit, timeout)
- First-time failures
- Not yet attempted regeneration

**Group B: Alternative voice candidates** (Phase 3)
- Repeatedly failed with primary voice (3+ attempts)
- Alternative voice available
- Very short words only

**Group C: Manual generation candidates** (Phase 4)
- Exhausted auto-retries (5+ attempts)
- Critical learning vocabulary
- Artifacts unacceptable

**Group D: Acceptance candidates** (Phase 5)
- Minor artifacts
- Non-critical vocabulary
- Diminishing returns on regeneration

### Step 3: Execute Regeneration

**For Group A:**
```bash
node scripts/phase8-audio-generation.cjs <course_code> --regenerate <uuid1>,<uuid2>,<uuid3>
```

**For Group B:**
```bash
node scripts/regenerate-with-alternative.cjs <course_code> <uuid> --voice <alt_voice>
```

**For Group C:**
- Follow manual web interface steps above

**For Group D:**
```bash
node scripts/mark-sample-accepted.cjs <course_code> <uuid> --reason "..."
```

### Step 4: Verify Results

After regeneration:

1. **Check new QC report**:
   ```bash
   node scripts/phase8-audio-generation.cjs <course_code> --plan
   ```

2. **Listen to regenerated samples**:
   ```bash
   afplay <s3_url>
   # Or download and play locally
   ```

3. **Update tracking**:
   - Increment regeneration attempt counter
   - Note which strategy was used
   - Document outcomes

---

## Regeneration Tracking

Each sample tracks regeneration history in MAR:

```json
{
  "uuid": "abc123-def456",
  "text": "a",
  "regeneration_history": [
    {
      "attempt": 1,
      "date": "2025-01-27T10:00:00Z",
      "strategy": "automatic_retry",
      "outcome": "failed",
      "reason": "Artifacts detected"
    },
    {
      "attempt": 2,
      "date": "2025-01-27T10:30:00Z",
      "strategy": "automatic_retry",
      "outcome": "failed",
      "reason": "Artifacts detected"
    },
    {
      "attempt": 3,
      "date": "2025-01-27T11:00:00Z",
      "strategy": "alternative_voice",
      "alternative_voice": "azure_en-US-JennyNeural",
      "outcome": "success"
    }
  ],
  "total_regeneration_attempts": 3,
  "current_strategy": "alternative_voice"
}
```

---

## Best Practices

### Do:
- ✓ Start with automatic retries (Phase 2)
- ✓ Review QC report thoroughly before regenerating
- ✓ Try 2-3 automatic attempts before escalating
- ✓ Document all manual interventions
- ✓ Consider accepting minor artifacts for rare words
- ✓ Track regeneration history for analysis

### Don't:
- ✗ Jump straight to manual generation
- ✗ Regenerate without listening to flagged samples first
- ✗ Attempt more than 5 regenerations per sample
- ✗ Use alternative voices unnecessarily (creates inconsistency)
- ✗ Manual generate more than 5 samples per course (doesn't scale)
- ✗ Forget to update tracking metadata

---

## Future Improvements

Potential enhancements to regeneration strategy:

1. **SSML Fine-tuning**: Add prosody controls for problematic words
2. **Voice blending**: Mix multiple generations to reduce artifacts
3. **Pre-generation testing**: Generate multiple variants, auto-select best
4. **ML-based QC**: Train model to detect artifacts automatically
5. **Alternative providers**: Try different TTS providers for failures
6. **Batch regeneration UI**: Web interface for reviewing/regenerating in bulk

---

## Need Help?

Ask Claude Code:
- "Show me all samples that failed QC"
- "Regenerate sample <uuid>"
- "What's the regeneration history for <uuid>?"
- "Help me manually generate sample <uuid>"
- "Which samples should I accept vs regenerate?"
