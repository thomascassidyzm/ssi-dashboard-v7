# Voice Selection Guide for Phase 8

This guide explains how to discover and select voices for new language courses.

## Overview

When you encounter an error that says "No voice assignments found", you need to:
1. Discover available voices for your target language
2. Choose the best voices based on selection criteria
3. Add your choices to the voice registry (`public/vfs/canonical/voices.json`)

Claude Code can help you with this process.

---

## Voice Selection Criteria

### Primary Criteria

1. **Language-specific voices** (strongly preferred)
   - Use voices specifically designed for the target language
   - Avoid multilingual voices unless no language-specific options exist
   - Example: For German, prefer `de-DE-KatjaNeural` over a multilingual voice

2. **Gender diversity**
   - Select 2 voices: one male, one female (for variety)
   - If only one gender available, that's acceptable
   - Users appreciate hearing different voice characteristics

3. **Accent variation** (if data available)
   - If multiple regional variants exist, consider diversity
   - Example: For Spanish, you might choose one from Spain (`es-ES`) and one from Latin America (`es-MX`)
   - This helps learners recognize accent variations

4. **Voice quality characteristics**
   - **Pleasant and natural**: Avoid overly synthetic or robotic voices
   - **Calm and mature**: Prefer steady, clear delivery over energetic or young-sounding voices
   - **Clear articulation**: Essential for language learning
   - **Neural voices**: Always prefer Neural voices over Standard voices (much higher quality)

### When to Ask the User

If there are many good options that meet the criteria equally well:
- Present top 3-5 options with quality scores
- Explain the trade-offs (e.g., accent differences, voice characteristics)
- Generate sample clips for the user to preview
- Let the user make the final choice

---

## Discovery Process

### Step 1: Discover Available Voices

Ask Claude Code: "Help me select voices for [course_code]"

Claude Code will run the discovery function and show:
- **Top Recommended Voices**: Auto-selected based on quality scores
- **All Available Voices**: Complete list with quality ratings

Example output:
```
TOP RECOMMENDED VOICES:
----------------------------------------
1. Katja (de-DE-KatjaNeural)
   Gender: Female
   Locale: de-DE
   Priority Score: 102
   Reason: Neural voice (better technology), Female voice, gender diversity

2. Conrad (de-DE-ConradNeural)
   Gender: Male
   Locale: de-DE
   Priority Score: 102
   Reason: Neural voice (better technology), Male voice

ALL AVAILABLE VOICES:
1. Katja (de-DE-KatjaNeural) - Female - Priority: 102
2. Conrad (de-DE-ConradNeural) - Male - Priority: 102
3. Amala (de-DE-AmalaNeural) - Female - Priority: 102
4. Bernd (de-DE-BerndNeural) - Male - Priority: 100
...
```

### Step 2: Generate Sample Clips (Optional)

If you want to preview voices before committing, ask Claude Code:

"Generate sample clips for Katja and Conrad"

Claude Code will create 5 sample audio files for each voice in `temp/voice_samples/`.

Listen to them:
```bash
afplay temp/voice_samples/de-DE-KatjaNeural_sample1.mp3
afplay temp/voice_samples/de-DE-ConradNeural_sample1.mp3
```

### Step 3: Make Your Selection

Tell Claude Code which voices to use:
- "Use Katja and Conrad" (accept recommendations)
- "Use Amala instead of Katja" (modify recommendations)
- "Show me samples for Bernd first" (preview alternatives)

### Step 4: Configure Source/Presentation Voices

For English courses (known language = English):
- **Default to Aran** (ElevenLabs cloned voice) for source and presentation
- Aran is a mature, calm, clear voice ideal for teaching

For other known languages:
- Claude Code will suggest an appropriate Azure voice
- Usually: `azure_en-US-AvaNeural` (female) or `azure_en-US-AndrewNeural` (male)

---

## Priority Scoring (Not Quality!)

**Important**: Claude Code cannot judge if a voice sounds natural or robotic. The "quality score" is actually a **priority score** for sorting voices, based on objective technical features:

- **Neural voice**: +100 points (objectively better technology than Standard)
- **Style options**: +1 point per style
- **Multilingual support**: +1 point per secondary locale

**Neural voices have priority** because they use better synthesis technology. However, even Neural voices can sound robotic or unnatural. **You MUST generate and listen to sample clips** before committing to voices.

The score helps narrow down options, but your ears make the final decision.

---

## Configuration Format

Claude Code will update `public/vfs/canonical/voices.json` with this structure:

### Course Assignment

```json
{
  "course_assignments": {
    "deu_for_eng_30seeds": {
      "target1": "azure_de-DE-KatjaNeural",
      "target2": "azure_de-DE-ConradNeural",
      "source": "elevenlabs_aran",
      "presentation": "elevenlabs_aran"
    }
  }
}
```

**Roles explained:**
- `target1`: Primary target language voice (first vocabulary introduction)
- `target2`: Secondary target language voice (variation, examples)
- `source`: Known language voice for translations/context
- `presentation`: Known language voice for instructions/encouragement

### Voice Entry

For each new voice, Claude Code adds a voice entry:

```json
{
  "voices": {
    "azure_de-DE-KatjaNeural": {
      "provider": "azure",
      "provider_id": "de-DE-KatjaNeural",
      "language": "deu",
      "display_name": "Katja",
      "gender": "female",
      "locale": "de-DE",
      "voice_type": "Neural",
      "typical_roles": [],
      "sample_count": 0,
      "created_at": "2025-01-27T10:30:00.000Z",
      "notes": "Auto-discovered Neural voice, quality score: 85",
      "processing": {
        "cadences": {
          "slow": {
            "azure_speed": 0.7,
            "time_stretch": 1.0,
            "normalize": true,
            "target_lufs": -16.0
          },
          "natural": {
            "azure_speed": 1.0,
            "time_stretch": 1.0,
            "normalize": true,
            "target_lufs": -16.0
          }
        }
      }
    }
  }
}
```

**Processing settings explained:**
- `azure_speed`: SSML speed attribute (0.7 = 30% slower)
- `time_stretch`: Post-processing time-stretch factor (1.0 = none)
- `normalize`: Apply loudness normalization
- `target_lufs`: Target loudness in LUFS (-16.0 is broadcast standard)

---

## API Reference

### Azure Speech API

**Endpoint**: `https://{region}.tts.speech.microsoft.com/cognitiveservices/voices/list`

**Authentication**: `Ocp-Apim-Subscription-Key` header

**Language filtering**: Filter results by `Locale` field starting with language code

**Voice types**:
- `Neural`: High quality, natural-sounding (preferred)
- `Standard`: Lower quality, more robotic (avoid)

**Example voice object**:
```json
{
  "ShortName": "de-DE-KatjaNeural",
  "Gender": "Female",
  "Locale": "de-DE",
  "LocaleName": "German (Germany)",
  "VoiceType": "Neural",
  "StyleList": ["cheerful", "sad"],
  "SecondaryLocaleList": []
}
```

### ElevenLabs API (for cloned voices only)

**Endpoint**: `https://api.elevenlabs.io/v1/voices`

**Authentication**: `xi-api-key` header

**Usage**: Only for known language (English) using Aran's cloned voice

---

## Common Scenarios

### Scenario 1: Clear Choice (German)

```
Available: Katja (F, Neural), Conrad (M, Neural), Amala (F, Neural), Bernd (M, Neural)

Decision: Recommend Katja + Conrad, but generate samples
Reasoning:
  - All Neural voices (good technology)
  - Katja + Conrad provide gender diversity
  - Generate samples for user to verify natural sound
  - User makes final decision after listening
```

### Scenario 2: Regional Variants (Spanish)

```
Available:
  - Elena (es-ES, F, Neural) - Spain
  - Abril (es-MX, F, Neural) - Mexico
  - Alvaro (es-ES, M, Neural) - Spain
  - Jorge (es-MX, M, Neural) - Mexico

Decision: Ask user for accent preference
Question: "Would you prefer European Spanish (Elena + Alvaro) or
          Latin American Spanish (Abril + Jorge)?"

Then generate samples for chosen accent pair before committing
```

### Scenario 3: Limited Options (Icelandic)

```
Available: Gudrun (is-IS, F, Neural), Gunnar (is-IS, M, Neural)

Decision: Recommend Gudrun + Gunnar
Generate samples to verify they sound acceptable
Only two Neural options, but still need to listen first
```

### Scenario 4: Many Good Options

```
Available: 6+ Neural voices with similar features

Action:
1. Narrow to top 4 based on priority score
2. Generate sample clips for all 4
3. Let user listen and choose the 2 that sound most natural
4. Technical features don't tell us about naturalness
```

---

## Checklist

Before finalizing voice selection:

- [ ] Both voices are Neural type (not Standard)
- [ ] Gender diversity achieved (or only one gender available)
- [ ] Both voices are language-specific (not multilingual fallbacks)
- [ ] **Sample clips generated and LISTENED TO** (required - can't judge without hearing)
- [ ] Voices sound natural and pleasant (not robotic or harsh)
- [ ] Clear articulation suitable for language learning
- [ ] Source/presentation voices configured (Aran for English)
- [ ] Voice entries added to `voices.json`
- [ ] Course assignment added to `voices.json`
- [ ] Configuration tested with `--plan` mode

**Critical**: Never commit to voices without listening to samples first. Priority scores don't tell you if a voice sounds good.

---

## Troubleshooting

### No Neural voices available

If only Standard voices exist for a language:
1. Check Azure's voice gallery: https://speech.microsoft.com/portal/voicegallery
2. Verify language code mapping in `voice-discovery-service.cjs`
3. Consider using multilingual Neural voices as fallback
4. Document the limitation in voice notes

### Voice sounds robotic/unnatural

Even Neural voices can vary in quality:
1. Generate sample clips for all available voices
2. Listen carefully to articulation and naturalness
3. Try different regional variants (e.g., `de-DE` vs `de-AT`)
4. Check if voice has style options (may affect base quality)

### Can't decide between similar voices

When multiple voices seem equally good:
1. Generate 5+ sample clips for each
2. Test with actual course content (phrases from manifest)
3. Ask for second opinion from team member
4. Choose based on subjective preference - there's no "wrong" choice

---

## Need Help?

Ask Claude Code:
- "Help me select voices for [course_code]"
- "Show me all German voices with quality scores"
- "Generate sample clips for [voice_id]"
- "What's the quality score breakdown for [voice_id]?"
- "Add [voice_id] to [course_code] as target1"

Claude Code will guide you through the entire process.
