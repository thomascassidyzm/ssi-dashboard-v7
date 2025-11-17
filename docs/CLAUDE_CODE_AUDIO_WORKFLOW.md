# Claude Code Audio Generation Workflow

This guide explains how to use Claude Code to orchestrate the Phase 8 audio generation process with interactive quality control.

## Overview

The Phase 8 audio generation pipeline uses a **two-phase approach with QC gates**. Claude Code helps you through each step, reviewing quality issues and regenerating samples as needed.

**Key Principles:**
- Scripts pause at QC checkpoints (don't run everything at once)
- Claude Code reviews QC reports and highlights issues
- You listen to flagged samples and decide what needs regeneration
- Claude Code handles regeneration and continues the workflow
- Conversation-based approval (not interactive prompts in scripts)

---

## Typical Workflow

### Step 1: Plan (Optional but Recommended)

Ask Claude Code to generate a cost/time estimate:

```
"Help me plan audio generation for fin_for_ita_10seeds"
```

Claude Code will run:
```bash
node scripts/phase8-audio-generation.cjs fin_for_ita_10seeds --plan
```

Review the plan and proceed when ready.

---

### Step 2: Run Phase A (Core Vocabulary)

Ask Claude Code to start Phase A:

```
"Run Phase A audio generation for fin_for_ita_10seeds"
```

Claude Code will execute:
```bash
node scripts/phase8-audio-generation.cjs fin_for_ita_10seeds --execute --phase=targets
```

**What happens:**
1. Generates audio for target1, target2, source roles
2. Runs QC checkpoint on raw generated files
3. **Script pauses** - QC report generated
4. Claude Code reads the QC report

---

### Step 3: Review QC Report with Claude Code

After Phase A pauses, ask Claude Code to review:

```
"Review the Phase A QC report and show me what needs attention"
```

Claude Code will:
- Read `vfs/courses/fin_for_ita_10seeds/qc_report_raw.md`
- Highlight flagged samples (especially shortest words)
- Show S3 URLs for you to listen to
- Recommend which samples to regenerate

**Example output from Claude Code:**

> I've reviewed the Phase A QC report. Here's what needs attention:
>
> **High Priority (5 samples):**
> - "a" (UUID: abc123...) - 1 character, likely has artifacts
>   Listen: https://ssi-audio-stage.s3.amazonaws.com/mastered/abc123.mp3
> - "I" (UUID: def456...) - 1 character
>   Listen: https://ssi-audio-stage.s3.amazonaws.com/mastered/def456.mp3
> ...
>
> **Recommendation:** Listen to these 5 shortest samples. They're most likely to have breathing/laughter artifacts.

---

### Step 4: Listen and Decide

You listen to the flagged samples:

```bash
# macOS
afplay ~/Downloads/abc123.mp3

# Or click S3 URLs in browser
```

You tell Claude Code what you found:

```
"The first three have weird breathing sounds. The other two are fine."
```

---

### Step 5: Regenerate Problem Samples

Claude Code regenerates the specific UUIDs:

```bash
node scripts/phase8-audio-generation.cjs fin_for_ita_10seeds --execute --regenerate=abc123,def456,ghi789
```

**What happens:**
1. Looks up sample details by UUID
2. Regenerates fresh audio (new random seed)
3. Runs QC checkpoint on regenerated samples
4. Shows results

Claude Code reviews the new QC report and asks if you want to listen again.

---

### Step 6: Approve and Continue Processing

Once you're satisfied:

```
"These look good now. Continue with Phase A processing."
```

Claude Code runs:
```bash
node scripts/phase8-audio-generation.cjs fin_for_ita_10seeds --execute --continue-processing
```

**What happens:**
1. Processes raw audio files (normalize + time-stretch)
2. Uploads to S3
3. Updates MAR (Master Audio Registry)
4. Ready for Phase B

---

### Step 7: Run Phase B (Presentations)

Now that target samples are on S3, ask Claude Code:

```
"Run Phase B to generate presentations"
```

Claude Code executes:
```bash
node scripts/phase8-audio-generation.cjs fin_for_ita_10seeds --execute --phase=presentations
```

**What happens:**
1. Downloads required target files from S3
2. Generates presentation audio
3. Runs QC checkpoint
4. **Script pauses** for review

---

### Step 8: Review Phase B QC

Same process as Phase A:

```
"Review the Phase B QC report"
```

Claude Code shows flagged presentations. Listen, regenerate if needed, approve when ready.

---

### Step 9: Finalize

Once Phase B is approved:

```
"Continue Phase B processing and finalize"
```

Claude Code completes the pipeline:
- Processes presentations
- Uploads to S3
- Updates manifest with all durations
- Marks course complete

---

## Common Scenarios

### Scenario: No QC Issues

If QC finds no issues, the script auto-continues (no pause):

```
✓ No quality issues detected

NEXT STEP:
Ready for Phase B. Ask Claude Code to launch presentation generation.
```

You can proceed directly to Phase B.

---

### Scenario: Multiple Regeneration Rounds

Sometimes a sample needs multiple attempts:

```
"Regenerate abc123 again - it still has artifacts"
```

Claude Code can regenerate the same UUID multiple times. After 3-5 attempts, consider:
- Using an alternative voice (see `REGENERATION_STRATEGY.md`)
- Accepting minor artifacts for rare words
- Manual generation via Azure Speech Studio

---

### Scenario: Skip QC for Testing

For development/testing, skip the QC pause:

```bash
node scripts/phase8-audio-generation.cjs fin_for_ita_10seeds --execute --skip-qc
```

The pipeline runs end-to-end without pausing.

---

## File Locations

**QC Reports:**
- Phase A: `vfs/courses/<course_code>/qc_report_raw.json` (and `.md`)
- Phase B: `vfs/courses/<course_code>/qc_report.json` (and `.md`)

**Temp Files (for regeneration):**
- Raw audio: `temp/audio/*.mp3`
- Processed audio: `temp/audio/processed/*.mp3`

**Final Manifest:**
- `vfs/courses/<course_code>/course_manifest.json`

---

## CLI Reference

### Phase A Only
```bash
node scripts/phase8-audio-generation.cjs <course_code> --execute --phase=targets
```

### Phase B Only
```bash
node scripts/phase8-audio-generation.cjs <course_code> --execute --phase=presentations
```

### Continue Processing After QC
```bash
node scripts/phase8-audio-generation.cjs <course_code> --execute --continue-processing
```

### Regenerate Specific Samples
```bash
node scripts/phase8-audio-generation.cjs <course_code> --execute --regenerate=uuid1,uuid2,uuid3
```

### Skip QC Pause (Testing)
```bash
node scripts/phase8-audio-generation.cjs <course_code> --execute --skip-qc
```

### Auto Mode (Both Phases, Interactive)
```bash
node scripts/phase8-audio-generation.cjs <course_code> --execute
```

---

## Claude Code Integration

**How Claude Code helps:**

1. **Runs commands** - You ask in natural language, Claude Code translates to correct CLI
2. **Reads reports** - Claude Code parses JSON/Markdown QC reports
3. **Highlights issues** - Shows you only what matters (shortest words first)
4. **Provides S3 URLs** - Easy click-to-listen links
5. **Tracks state** - Remembers which phase you're on, what needs regeneration
6. **Handles errors** - If something fails, Claude Code suggests fixes

**Example conversation:**

> **You:** "Help me generate audio for German for Italians"
>
> **Claude Code:** "I'll start by running Phase A for deu_for_ita_10seeds. This will generate target and source vocabulary."
>
> *[Runs Phase A script]*
>
> **Claude Code:** "Phase A generation complete. I've reviewed the QC report and found 8 samples flagged for review. The shortest words are most likely to have issues. Here are the top 3..."
>
> **You:** "The first one sounds fine, but the second has breathing artifacts"
>
> **Claude Code:** "I'll regenerate that one. UUID: def456..."
>
> *[Runs regeneration]*
>
> **Claude Code:** "Regenerated successfully. The new version has no QC flags. Would you like to listen again or approve for processing?"
>
> **You:** "Sounds good, continue"
>
> **Claude Code:** "Processing and uploading Phase A samples now..."

---

## Tips

### Efficient QC Review

- **Start with shortest words** - QC report sorts by character count
- **Stop when quality improves** - If 10+ character words are clean, you're likely done
- **Accept minor artifacts for rare words** - Don't spend hours on a word that appears once
- **Use alternative voices sparingly** - Creates voice inconsistency (see `REGENERATION_STRATEGY.md`)

### Workflow Optimization

- **Run plan mode first** - Know costs before committing
- **Don't delete temp files** - Keep `--keep-temp` during QC review in case you need to regenerate
- **Test with small courses** - Validate workflow with `10seeds` before running `30seeds`
- **Use stage bucket** - Only upload to prod after full QC approval

### Regeneration Strategy

- **Attempt 1-2 automatic retries** - Often works
- **After 3 failures** - Consider alternative strategies (see `REGENERATION_STRATEGY.md`)
- **Track regeneration attempts** - Avoid infinite loops on problematic samples

---

## Troubleshooting

### "No raw audio files found"

You tried to run `--continue-processing` before Phase A generation completed.

**Fix:** Run Phase A first: `--phase=targets`

---

### "Missing target files from S3"

You tried to run Phase B before Phase A was processed and uploaded.

**Fix:**
1. Check Phase A QC report - did you approve?
2. Run `--continue-processing` to finish Phase A
3. Verify S3 upload succeeded
4. Then run Phase B

---

### Regeneration doesn't improve quality

Some samples are persistently problematic due to API biases.

**Options:**
1. Try 2-3 more times (sometimes helps)
2. Use alternative voice (see `VOICE_SELECTION_GUIDE.md`)
3. Manual generation via Azure Speech Studio (see `REGENERATION_STRATEGY.md`)
4. Accept minor artifacts if word is rare

---

## Advanced: Manual Workflow (Without Claude Code)

You can run the workflow manually if needed:

```bash
# 1. Phase A
node scripts/phase8-audio-generation.cjs fin_for_ita_10seeds --execute --phase=targets

# 2. Review QC report
open vfs/courses/fin_for_ita_10seeds/qc_report_raw.md

# 3. Regenerate if needed
node scripts/phase8-audio-generation.cjs fin_for_ita_10seeds --execute --regenerate=uuid1,uuid2

# 4. Continue processing
node scripts/phase8-audio-generation.cjs fin_for_ita_10seeds --execute --continue-processing

# 5. Phase B
node scripts/phase8-audio-generation.cjs fin_for_ita_10seeds --execute --phase=presentations

# 6. Review Phase B QC
open vfs/courses/fin_for_ita_10seeds/qc_report.md

# 7. Regenerate if needed (repeat step 3)

# 8. Finalize (manifest updates automatically)
```

But using Claude Code is **much easier** - it handles all the steps and error checking for you.

---

## See Also

- `VOICE_SELECTION_GUIDE.md` - Choosing voices for new courses
- `REGENERATION_STRATEGY.md` - Detailed strategies for problematic samples
- `PHASE8_ARCHITECTURE.md` - Technical implementation details
