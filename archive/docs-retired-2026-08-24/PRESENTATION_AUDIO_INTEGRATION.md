# Presentation Audio Integration Guide

## Summary

Presentation audio now uses a **simplified format** where the presentation clip contains only the known-language introduction, ending with "is:". The target words are played separately by the app.

## Old vs New Format

### Old Format (single audio file)
```
"The Spanish for 'I want', is: ... 'quiero' ... 'quiero'"
```
- Single audio file with everything
- English voice trying to say Spanish words (sounds wrong)
- Used for Welsh courses (human-recorded, precious)

### New Format (separated clips)
```
Presentation: "The Spanish for 'I want', as in 'I want to speak Spanish', is:"
Target1: "quiero"
Target2: "quiero"
```
- Presentation = known language only (ends with "is:")
- Target words = native target language voices
- Better quality, proper pronunciation

## Learning App Changes

### Detection Logic

The app should check the `origin` field on the presentation audio record:

```javascript
const presentationAudio = await supabase
  .from('course_audio')
  .select('*')
  .eq('course_code', courseCode)
  .eq('text_normalized', presentationText.toLowerCase().trim())
  .eq('role', 'presentation')
  .single();

if (presentationAudio.origin === 'human') {
  // Old format: Play single presentation file (Welsh courses)
  await playAudio(presentationAudio.s3_key);
} else {
  // New format: Sequence presentation + target clips
  await playAudio(presentationAudio.s3_key);
  await pause(1000);
  await playAudio(target1Audio.s3_key);
  await pause(1000);
  await playAudio(target2Audio.s3_key);
}
```

### Audio Lookup

For the new format, the app needs to look up:

1. **Presentation audio**: `role='presentation'`, text = the intro text ending with "is:"
2. **Target1 audio**: `role='target1'`, text = the target LEGO (e.g., "quiero")
3. **Target2 audio**: `role='target2'`, text = the target LEGO (e.g., "quiero")

```javascript
// Get target audio for a LEGO
const targetText = lego.target; // e.g., "quiero"

const target1Audio = await supabase
  .from('course_audio')
  .select('*')
  .eq('course_code', courseCode)
  .eq('text_normalized', targetText.toLowerCase().trim())
  .eq('role', 'target1')
  .single();

const target2Audio = await supabase
  .from('course_audio')
  .select('*')
  .eq('course_code', courseCode)
  .eq('text_normalized', targetText.toLowerCase().trim())
  .eq('role', 'target2')
  .single();
```

## Playback Sequence

For each LEGO introduction:

```
1. Play presentation audio (known language intro)
   "The Spanish for 'I want', as in 'I want to speak Spanish', is:"

2. Pause 1000ms

3. Play target1 audio (Spanish voice)
   "quiero"

4. Pause 1000ms

5. Play target2 audio (Spanish voice, possibly different speaker)
   "quiero"
```

## Database Schema Reference

### course_audio table

| Column | Description |
|--------|-------------|
| `course_code` | Course identifier |
| `text` | The spoken text (original case) |
| `text_normalized` | Lowercased, trimmed for matching |
| `language` | ISO 639-3 language code |
| `role` | `known`, `target1`, `target2`, `presentation` |
| `voice_id` | Voice identifier |
| `origin` | `tts` (regenerable) or `human` (precious) |
| `s3_key` | S3 object key (UUID.mp3) |

### origin field values

| Value | Meaning | App Behavior |
|-------|---------|--------------|
| `human` | Human-recorded (Welsh) | Play single presentation file |
| `tts` | TTS-generated | Sequence: presentation + target1 + target2 |

## Template Format

Templates are stored in `presentation_templates` table:

```sql
-- English (known language)
"The {target_lang_name} for '{known}', as in '{seed}', is:"

-- Spanish (known language)
"El {target_lang_name} de '{known}', como en '{seed}', es:"

-- Chinese (known language)
"{target_lang_name}"{known}"，如"{seed}"，是："

-- Welsh (known language)
"Y {target_lang_name} am '{known}', fel yn '{seed}', yw:"
```

Placeholders:
- `{target_lang_name}` - Human-readable target language name (e.g., "Spanish")
- `{known}` - Known LEGO text (e.g., "I want")
- `{seed}` - Full seed sentence (e.g., "I want to speak Spanish with you now")

## Dashboard Workflow

To update presentation text for a course:

1. Go to Audio Pipeline page for the course
2. Use "Regenerate Presentation Text" section
3. Click "Preview" to see what will change
4. Click "Update Presentation Text" to apply
5. Use "Regenerate by Role" with role=presentation to generate new audio

## Migration Notes

- Welsh courses (`cym_north_for_eng`, `cym_south_for_eng`) have `origin='human'` - leave unchanged
- Spanish course (`spa_for_eng`) has `origin='tts'` - can use new format
- Future TTS courses will use new format by default
