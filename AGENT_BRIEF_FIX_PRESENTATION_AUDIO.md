# Agent Brief: Fix Presentation Audio Binding in Pipeline

## Problem Statement

When presentation audio (the "The German for X is Y" introduction audio) is generated for a LEGO, the `presentation_audio_id` is NOT immediately bound to the `course_legos` row. This causes audio/text desync in the learning app.

**Current broken flow:**
```
1. Presentation audio generated → stored in course_audio with role='presentation'
2. LEGO row exists in course_legos with presentation_audio_id = NULL
3. Later, some matching logic tries to connect them by target_text
4. Matching often fails → desync: intro audio plays for WRONG LEGO
```

**Required correct flow:**
```
1. When presentation audio is generated for a LEGO...
2. IMMEDIATELY set course_legos.presentation_audio_id = the new audio's UUID
3. Audio is LOCKED to the LEGO at generation time
4. No after-the-fact matching needed
```

## Core Principle

**Presentation audio must be bound to the LEGO at generation time, not looked up later.**

The `presentation_audio_id` on `course_legos` is the authoritative binding. When the learning app plays a LEGO's introduction, it uses this ID directly - no text matching.

## Investigation Starting Point

**URL:** https://popty.app/production/deu_for_eng/pipeline

This is the audio generation pipeline. Find:
1. Where presentation audio is generated (TTS call)
2. Where the result is stored in `course_audio`
3. Why `course_legos.presentation_audio_id` is not being updated

## Database Schema Context

### course_legos table
```sql
-- Key columns:
id                    UUID PRIMARY KEY
course_code           TEXT
seed_number           INTEGER
lego_index            INTEGER
target_text           TEXT
presentation_audio_id UUID  -- ← THIS MUST BE SET when audio is generated
is_new                BOOLEAN
```

### course_audio table
```sql
-- Key columns:
id                UUID PRIMARY KEY
course_code       TEXT
lego_id           TEXT       -- Format: SXXXXLYY (e.g., S0001L05)
role              TEXT       -- 'presentation', 'target1', 'target2', 'known'
text_normalized   TEXT
s3_key            TEXT
-- etc.
```

### LEGO ID Format
- `SXXXXLYY` where XXXX = seed number (0-padded to 4 digits), YY = lego index (0-padded to 2 digits)
- Example: `S0001L05` = Seed 1, LEGO 5
- Supports 9999 seeds per course and 99 LEGOs per seed

## What to Fix

### Step 1: Find the audio generation code
Look for where presentation audio is generated. It likely:
- Takes LEGO data (target_text, known_text, course_code, seed_number, lego_index)
- Calls TTS to generate "The [known language] for [target_text] is [known_text]"
- Stores the result in `course_audio` with `role='presentation'`

### Step 2: Add the binding
After storing in `course_audio`, immediately update the LEGO:

```sql
-- After INSERT into course_audio returns the new audio ID:
UPDATE course_legos
SET presentation_audio_id = <new_audio_id>
WHERE course_code = <course_code>
  AND seed_number = <seed_number>
  AND lego_index = <lego_index>;
```

Or in JavaScript/TypeScript:
```typescript
// After creating the audio record
const { data: audioData } = await supabase
  .from('course_audio')
  .insert({
    course_code,
    lego_id: `S${seed_number.toString().padStart(4, '0')}L${lego_index.toString().padStart(2, '0')}`,
    role: 'presentation',
    // ... other fields
  })
  .select('id')
  .single();

// IMMEDIATELY bind to the LEGO
await supabase
  .from('course_legos')
  .update({ presentation_audio_id: audioData.id })
  .eq('course_code', course_code)
  .eq('seed_number', seed_number)
  .eq('lego_index', lego_index);
```

### Step 3: Verify the fix
After fixing, verify:
1. Generate presentation audio for a LEGO
2. Check that `course_legos.presentation_audio_id` is set immediately
3. In the learning app, the intro audio should match the displayed LEGO

## Files to Investigate

Look for:
- Audio generation functions (search for "presentation", "TTS", "generateAudio", "audio generation")
- Pipeline page components (the route for `/production/:courseCode/pipeline`)
- Supabase insert/update calls involving `course_audio`
- Any batch processing of LEGOs for audio generation

## Success Criteria

1. When presentation audio is generated, `course_legos.presentation_audio_id` is set in the same transaction/operation
2. No after-the-fact matching or lookup needed
3. The learning app's intro audio always matches the displayed LEGO text
4. Existing LEGOs with missing `presentation_audio_id` can be backfilled via migration if needed

## Non-Goals

- Don't change how the learning app consumes the data (it already uses `presentation_audio_id` correctly)
- Don't change the audio storage format or S3 structure
- Don't change the TTS provider or audio quality

## Context from Learning App

The learning app (ssi-learning-app) already expects `presentation_audio_id` to be set. The `generateLearningScript.ts` uses this ID directly:

```typescript
// For INTRO cycles:
sourceId: presentationAudioId  // The intro "The German for X is Y" audio
```

If `presentationAudioId` is null or points to wrong audio, the intro doesn't match the LEGO being taught.

## Testing

After making the fix:
1. Pick a LEGO that needs presentation audio
2. Generate its presentation audio through the pipeline
3. Query: `SELECT presentation_audio_id FROM course_legos WHERE seed_number=X AND lego_index=Y`
4. Confirm the ID matches the newly created audio
5. Test in learning app: intro audio should say the correct phrase
