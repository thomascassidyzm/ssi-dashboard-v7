# Audio Generation Troubleshooting

> Supplementary guide for handling edge cases and problems during audio generation.

## Common Issues & Solutions

### "No voice assignments found"

**Symptom:** Plan fails with guidance about missing voice assignments.

**Solution:**
1. Check if language pair exists in `voices.json` under `language_pair_assignments`
2. If not, look for precedent (same languages used elsewhere)
3. Add assignment following the [Voice Selection Guide](audio-generation.md#voice-selection-guide)
4. Sync to S3 after updating

### "Exceeds ElevenLabs quota"

**Symptom:** Plan shows quota warning for ElevenLabs voice.

**Options:**
1. Wait for quota reset (monthly)
2. Upgrade ElevenLabs tier
3. Generate only critical samples now, rest later
4. Check if samples already exist in MAR (may be duplicate detection issue)

### "MAR shows 0 samples but manifest has UUIDs"

**Symptom:** Plan says all samples are "new" but they were generated before.

**Cause:** MAR was cleared or not synced from manifest.

**Solution:**
```bash
node scripts/rebuild-mar-from-manifest.cjs <course_code>
```

This rebuilds MAR from manifest (manifest is source of truth for UUIDs).

### "Sample fails repeatedly"

**Symptom:** Same sample errors 3+ times in a row.

**Possible causes:**
1. **Invalid characters in text** - Check for special Unicode, emoji, or control characters
2. **Text too long** - Azure has ~5000 char limit per request
3. **SSML parsing error** - Check for unescaped `<`, `>`, `&` in text
4. **Voice doesn't support language** - Verify voice/language compatibility

**Debug:**
```bash
# Check the specific sample text
node -e "
const fs = require('fs-extra');
const m = fs.readJsonSync('public/vfs/courses/<course>/course_manifest.json');
const samples = m.slices[0].samples;
console.log(samples['<problem_text>']);
"
```

### "QC flagged too many samples"

**Symptom:** 50%+ of samples flagged in QC.

**Possible causes:**
1. **Voice mismatch** - Wrong voice assigned to role
2. **Cadence issue** - Time-stretch settings wrong
3. **Normalization problem** - LUFS target incorrect

**Investigation:**
1. Listen to a few flagged samples manually
2. Compare against approved samples from same voice
3. Check processing settings in `audio-processor.cjs`

### "Encouragement samples not matching"

**Symptom:** System says encouragements need generation but audio exists.

**Cause:** Encouragements match by TEXT, not by UUID. Text must match exactly.

**Check:**
```bash
# Compare canonical text with sample text
node -e "
const fs = require('fs-extra');
const canonical = fs.readJsonSync('public/vfs/canonical/eng_encouragements.json');
const samples = fs.readJsonSync('samples_database/encouragement_samples/eng_samples.json');
console.log('Canonical:', canonical.pooledEncouragements[0].text);
console.log('Sample:', Object.values(samples.samples)[0].text);
"
```

Look for whitespace differences, punctuation differences, Unicode issues.

### "S3 upload fails for specific files"

**Symptom:** Some files upload, others fail consistently.

**Possible causes:**
1. **Filename issues** - Special characters in UUID (shouldn't happen)
2. **File size** - Corrupted/empty audio file
3. **Permissions** - S3 bucket policy issue

**Debug:**
```bash
# Check file exists and has content
ls -la temp/audio/processed/<uuid>.mp3

# Try manual upload
aws s3 cp temp/audio/processed/<uuid>.mp3 s3://popty-bach-lfs/samples/<uuid>.mp3
```

### "Duration extraction fails"

**Symptom:** Samples have `duration: 0` or duration extraction errors.

**Cause:** Audio file corrupted or wrong format.

**Solution:**
1. Check file with `ffprobe`:
   ```bash
   ffprobe temp/audio/processed/<uuid>.mp3
   ```
2. If corrupted, regenerate the sample
3. If format issue, check audio-processor settings

---

## Decision Trees

### Should I regenerate or continue?

```
Sample failed during generation
    │
    ├─ Error is retryable (429, 500, network)?
    │   └─ YES → System will auto-retry (wait)
    │
    ├─ Error is permanent (401, invalid text)?
    │   ├─ Is it a critical sample (common phrase)?
    │   │   └─ YES → Fix issue, regenerate
    │   └─ Is it edge case (rare phrase)?
    │       └─ Log for later, continue
    │
    └─ Multiple samples failing same way?
        └─ STOP → Systemic issue, investigate
```

### QC: Approve or regenerate?

```
QC flagged samples
    │
    ├─ Listen to flagged samples
    │
    ├─ Issue is audio quality (noise, clipping)?
    │   └─ REGENERATE those samples
    │
    ├─ Issue is pronunciation (wrong word stress)?
    │   ├─ Affects meaning?
    │   │   └─ YES → REGENERATE
    │   └─ Minor accent variation?
    │       └─ APPROVE (natural variation OK)
    │
    ├─ Issue is pacing (too fast/slow)?
    │   ├─ Significantly off from target?
    │   │   └─ Check cadence settings, REGENERATE
    │   └─ Within acceptable range?
    │       └─ APPROVE
    │
    └─ No obvious issues in flagged samples?
        └─ APPROVE (QC may be overly sensitive)
```

### Encouragements: Generate or skip?

```
Missing encouragement audio
    │
    ├─ How many missing?
    │   ├─ 1-5 → Low cost, probably generate
    │   ├─ 6-20 → Medium cost, ask user
    │   └─ 20+ → High cost, definitely ask user
    │
    ├─ Are these critical encouragements?
    │   ├─ In "ordered" list (played at specific points)?
    │   │   └─ MUST generate
    │   └─ In "pooled" list (random selection)?
    │       └─ Can skip some if needed
    │
    └─ Budget constraints?
        ├─ ElevenLabs quota tight?
        │   └─ Generate only ordered, skip pooled
        └─ Budget available?
            └─ Generate all
```

---

## Recovery Procedures

### Partial Generation Recovery

If generation stopped mid-way:

1. **Check what completed:**
   ```bash
   # Count files in temp
   ls temp/audio/raw/*.mp3 | wc -l
   ls temp/audio/processed/*.mp3 | wc -l
   ```

2. **Resume:**
   ```bash
   # The script tracks progress - just re-run
   node scripts/phase8-audio-generation.cjs <course> --execute
   ```
   It will skip already-generated samples.

### MAR Corruption Recovery

If MAR data is lost or corrupted:

1. **Manifest is source of truth** - UUIDs are in the manifest
2. **Rebuild MAR:**
   ```bash
   node scripts/rebuild-mar-from-manifest.cjs <course_code>
   ```
3. **Verify S3 has the audio:**
   ```bash
   # Spot check a few UUIDs
   aws s3 ls s3://popty-bach-lfs/samples/<uuid>.mp3
   ```

### Manifest Corruption Recovery

If manifest is corrupted:

1. **Check for backups:**
   ```bash
   ls public/vfs/courses/<course>/course_manifest_backup*.json
   ```

2. **Restore from backup:**
   ```bash
   cp public/vfs/courses/<course>/course_manifest_backup_<date>.json \
      public/vfs/courses/<course>/course_manifest.json
   ```

3. **Or restore from S3:**
   ```bash
   aws s3 cp s3://popty-bach-lfs/courses/<course>/course_manifest.json \
      public/vfs/courses/<course>/course_manifest.json
   ```

### Complete Re-generation

If everything is broken and you need to start fresh:

1. **Keep the manifest** - It has all the content
2. **Clear temp:**
   ```bash
   rm -rf temp/audio/*  # Ask user first!
   ```
3. **Clear MAR for this course's voices:**
   ```bash
   # Be careful - this affects all courses using these voices
   # Usually better to rebuild from manifest instead
   ```
4. **Re-run from plan phase**

---

## Performance Tips

### Speed Up Generation

1. **Azure allows 8 parallel workers** - Default is optimized
2. **ElevenLabs rate-limited by tier** - Can't speed up without upgrade
3. **Processing uses all CPU cores** - Already optimized

### Reduce Costs

1. **Check MAR first** - Many samples may already exist
2. **Deduplicate before generation** - Script does this automatically
3. **Use Azure for volume** - Much cheaper than ElevenLabs
4. **Reserve ElevenLabs for special voices** - Encouragements, premium voices

### Reduce QC Failures

1. **Clean input text** - Remove special characters, normalize whitespace
2. **Test voice compatibility** - Some voices struggle with certain sounds
3. **Appropriate cadence settings** - Don't over-stretch audio

---

## Logs and Debugging

### Where to find logs

- **Console output** - Main progress and errors
- **temp/audio/generation.log** - Detailed generation log (if enabled)
- **QC reports** - `public/vfs/courses/<course>/qc_report_raw.json`

### Enable verbose logging

```bash
DEBUG=* node scripts/phase8-audio-generation.cjs <course> --execute
```

### Check specific sample status

```javascript
// In Node REPL
const mar = require('./services/mar-service.cjs');
const sample = await mar.findExistingSample('azure_es_female_1', 'hola', 'target1', 'spa', 'natural');
console.log(sample);
```
