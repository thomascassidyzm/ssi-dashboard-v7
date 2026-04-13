# Audio Fix Skill

> **Purpose**: Fix individual audio records — regenerate TTS with corrected text, normalize, upload to S3, and update the database. Use this when specific audio samples have pronunciation issues, wrong text, or need regeneration with different parameters.

## When to Use

- TTS mispronounces a word (e.g. "y" read as letter name instead of "and")
- Audio needs regenerating with modified text (adding ellipsis, punctuation tricks)
- Replacing a specific audio sample after a text correction
- Deborah or QA flags audio for regen

## Prerequisites

- `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` in `.env`
- Course must have `voice_config` set in the `courses` table
- The `audio-processor.cjs` service must be available (ffmpeg installed)

## Step-by-Step Flow

### 1. Identify the Audio Records

Find the affected `course_audio` records. Common sources:

```javascript
// From flags
const { data: flags } = await supabase.from('audio_flags')
  .select('audio_uuid')
  .eq('course_code', courseCode)
  .eq('status', 'flagged');

// Or by text content
const { data: audio } = await supabase.from('course_audio')
  .select('id, text, role, s3_key, voice_id, language')
  .eq('course_code', courseCode)
  .eq('text', 'the problematic text');
```

Show the user what you found and confirm before proceeding.

### 2. Get Voice Config

Load the course's voice settings to match the original generation:

```javascript
const { data: course } = await supabase.from('courses')
  .select('voice_config')
  .eq('course_code', courseCode)
  .single();

// Voice config has voices.target1, voices.target2, voices.known, voices.presentation
// Each has: voiceId (with azure_ prefix), language, provider, settings.speed
```

Map role to voice:
- `target1` → `voice_config.voices.target1`
- `target2` → `voice_config.voices.target2`
- `known` → `voice_config.voices.known`
- `presentation` → `voice_config.voices.presentation`

### 3. Test Variants (if pronunciation fix)

If the issue is pronunciation, generate test variants first and let the user listen:

```javascript
const ttsService = require('./services/tts-service.cjs');

const variants = ['y', 'y.', 'y...', 'Y'];
for (const text of variants) {
  const result = await ttsService.generate(text, 'azure', {
    voiceName: 'es-ES-ElviraNeural',  // Strip azure_ prefix from voice_id!
    language: 'es-ES',
    speed: 0.9,
    subscriptionKey: process.env.AZURE_SPEECH_KEY,
    region: process.env.AZURE_SPEECH_REGION
  });
  fs.writeFileSync(`/tmp/test-${safeName}.mp3`, result.audioBuffer);
}
```

Save to `/tmp/` and tell the user to `open /tmp/test-dir/` to listen.

**IMPORTANT**: The `voice_id` in the database has an `azure_` prefix (e.g. `azure_es-ES-ElviraNeural`). Strip it with `.replace(/^azure_/, '')` before passing to `ttsService.generate()` as `voiceName`.

### 4. Generate Final Audio

Once the user confirms the text variant:

```javascript
const result = await ttsService.generate(fixedText, 'azure', {
  voiceName: record.voice_id.replace(/^azure_/, ''),
  language: 'es-ES',
  speed: voiceConfig.settings.speed,
  subscriptionKey: process.env.AZURE_SPEECH_KEY,
  region: process.env.AZURE_SPEECH_REGION
});

// Result has: { audioBuffer: Buffer, wordBoundaries: Array }
fs.writeFileSync(rawPath, result.audioBuffer);
```

### 5. Normalize

Standard normalization: 44100Hz mono 128kbps -16 LUFS

```javascript
const audioProcessor = require('./services/audio-processor.cjs');
await audioProcessor.normalizeAudio(rawPath, normalizedPath);
```

### 6. Get Duration

```javascript
const duration = await audioProcessor.getAudioDuration(normalizedPath);
// Returns seconds (e.g. 1.584), multiply by 1000 for ms if needed
```

### 7. Upload to S3

Overwrite the existing S3 file. Extract UUID from the existing `s3_key`:

```javascript
const s3Service = require('./services/s3-service.cjs');
const s3Uuid = record.s3_key.replace('mastered/', '').replace('.mp3', '');
await s3Service.uploadAudioFile(s3Uuid, normalizedPath);
```

`uploadAudioFile(uuid, localPath)` builds the key as `mastered/{uuid}.mp3` and uploads to the stage bucket.

### 8. Update Database

```javascript
await supabase.from('course_audio')
  .update({
    duration_ms: Math.round(duration * 1000),
    word_boundaries: result.wordBoundaries || null
  })
  .eq('id', record.id);
```

**Note**: Do NOT update `text` or `text_normalized` in `course_audio` — the original text is what the learner sees. The TTS text variant (e.g. "y...") is only for pronunciation, not display.

### 9. Resolve Flags

If the audio was flagged:

```javascript
await supabase.from('audio_flags')
  .update({ status: 'resolved', resolved_at: new Date().toISOString() })
  .eq('audio_uuid', record.id)
  .eq('course_code', courseCode)
  .eq('status', 'flagged');
```

## Key Gotchas

- **`voice_id` prefix**: DB stores `azure_es-ES-ElviraNeural`, TTS service needs `es-ES-ElviraNeural`. Always strip `azure_` prefix.
- **`ttsService.generate()` returns `audioBuffer`** not `audio`. The result object has `{ audioBuffer, wordBoundaries }`.
- **`s3Service.uploadAudio(uuid, buffer)`** takes a UUID, not an s3_key. It builds the path itself.
- **`audioProcessor.getAudioDuration()`** not `getDuration()`.
- **Duration units**: `getAudioDuration` returns seconds. DB `duration_ms` is milliseconds. Multiply accordingly.
- **Don't change display text**: If the fix is a pronunciation trick (e.g. "y..."), only use that for TTS generation. The `course_audio.text` field should stay as the original ("y").
- **Requires user approval**: TTS generation costs money. Always show the plan and get confirmation before generating.

## Common Pronunciation Fixes

| Problem | Language | Fix |
|---------|----------|-----|
| "y" read as letter name | Spanish | Use `y...` |
| Single letter read as letter | Various | Add ellipsis or context |
| Wrong stress/intonation | Various | Try SSML or punctuation tricks |

## Speed Reference (from voice_config)

| Role | Typical Speed |
|------|--------------|
| known | 0.95 |
| target1 | 0.9 |
| target2 | 0.85 |
| presentation | 0.95 |

These vary per course — always read from `voice_config.voices.{role}.settings.speed`.
