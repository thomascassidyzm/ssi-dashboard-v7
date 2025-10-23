# SSi Course Generation System - Complete Handover to Kai

**Date**: 2025-10-23
**Status**: Phases 1-7 Complete | Phase 8 Ready for Implementation
**Your Role**: Audio generation (Phase 8) using the completed manifest

---

## The Big Picture: What We've Built

We've created a **7-phase assembly line** that transforms 668 carefully designed English sentences into complete, app-ready language courses. Think of it as a factory that takes pedagogical curriculum and produces everything the mobile app needs - except the audio files. That's where you come in.

---

## The 668 Canonical Seeds - The Universal Curriculum

### The Master Lesson Plan

There are **668 canonical English sentences** that form the SSi curriculum. These aren't random sentences - they're a carefully crafted pedagogical sequence designed by Tom over years of teaching experience. They work for ANY language pair.

**Example canonical seeds:**
1. "I want to speak Italian with you now."
2. "I'm trying to learn."
3. "how to speak as often as possible."
...
668. (final culminating sentence)

### Why This Matters

Every SSi course - whether Italian-for-English, Spanish-for-French, or Welsh-for-Mandarin - uses **the same 668 sentences**. Just translated. This means:

- ✅ Proven teaching sequence (battle-tested)
- ✅ Consistent quality across all languages
- ✅ One curriculum to maintain, infinite courses to generate

---

## The 7-Phase Pipeline: Assembly Line

Here's what happens when we generate a course:

### **Phase 1: Translation** 📝
**Input**: 668 canonical English seeds
**Output**: `seed_pairs.json` - Translated sentences

**The smart part**: Only translates what's needed based on direction:
- **Italian-for-English**: Only translate English → Italian (known language already English)
- **English-for-Spanish**: Only translate English → Spanish (target language already English)
- **Italian-for-Spanish**: Two translations:
  1. English → Italian (canonical to target)
  2. Italian → Spanish (target to known - ensures alignment!)

**Why target-to-known**: The Spanish translation is based on the pedagogically-optimized Italian version, not independently from English. This ensures perfect alignment between what the learner sees in Italian and what they see in Spanish.

**Principles**:
- Cognate preference (use similar words when possible)
- Variation reduction ("First Word Wins" - be consistent)
- Progressive heuristic curve (different strategies for seeds 1-100 vs 300-668)

---

### **Phase 2: Corpus Intelligence** 🧠
**Input**: `seed_pairs.json`
**Output**: `corpus_intelligence.json`

**What it does**: Analyzes the entire course to understand:
- Which concepts appear first (FCFS - First-Can-First-Say)
- Which words are most useful (utility scoring)
- Dependencies between concepts

**Why**: This intelligence guides later phases about which words to teach when.

---

### **Phase 3: LEGO Extraction** 🧱
**Input**: `seed_pairs.json`
**Output**: `lego_pairs.json`

**What it does**: Breaks each sentence into reusable "LEGO bricks"

**Example**:
```
Sentence: "Voglio parlare italiano con te adesso"
→ LEGOs:
  - "Voglio" (I want) - BASE LEGO
  - "parlare" (to speak) - BASE LEGO
  - "italiano" (Italian) - BASE LEGO
  - "con te" (with you) - BASE LEGO
  - "adesso" (now) - BASE LEGO
```

**Three types of LEGOs**:
1. **BASE** (B): Brand new words introduced in this seed
2. **FEEDER** (F): Words you learned in an earlier seed, reused here
3. **COMPOSITE** (C): Multiple pieces glued together
   - Example: "Sto provando" (I'm trying) = "Sto" (I'm) + "provando" (trying)

**Why this matters for audio**: Each LEGO gets:
- An introduction (explanation text)
- Practice phrases (expanding windows)
- All of this needs audio

---

### **Phase 3.5: Graph Construction** 📊
**Input**: `lego_pairs.json`
**Output**: `lego_graph.json`

**What it does**: Builds a graph of which LEGOs appear next to each other, with edge weights showing how often and how pedagogically valuable those connections are.

**Why**: Helps optimize teaching order in future versions.

---

### **Phase 4: Basket Generation** 🧺
**Input**: `lego_pairs.json`, `lego_graph.json`
**Output**: `lego_baskets.json`

**What it does**: For each LEGO, creates practice phrases with expanding complexity

**Example for "parlare" (to speak)**:
```
Window 1: "Voglio parlare" (I want to speak)
Window 2: "Voglio parlare italiano" (I want to speak Italian)
Window 3: "Voglio parlare italiano con te" (I want to speak Italian with you)
Window 4: Full sentence
```

**The learning theory**: Like training wheels on a bike - start simple, gradually add complexity.

**Rules**:
- **E-phrases**: 7-10 words, natural, conversational (eternal practice)
- **D-phrases**: 2-5 LEGOs (expanding windows - debut practice)
- **Vocabulary constraint**: LEGO #5 can only use LEGOs #1-4 in practice (progressive availability)

---

### **Phase 5: Deduplication** 🔍
**Input**: `lego_baskets.json`
**Output**: `lego_baskets_deduplicated.json`

**What it does**: Removes ~22% duplicate LEGOs where the same Italian word appears multiple times

**Example**: "Voglio" (I want) appears in seed 1 and seed 7
- Seed 1: Keep it (first occurrence wins)
- Seed 7: Mark as FEEDER (reference to seed 1)

**Why**: Efficiency - don't teach the same word twice, just remind them.

---

### **Phase 6: Introduction Generation** 🎙️
**Input**: `lego_pairs.json`
**Output**: `introductions.json`

**What it does**: Writes the script for what the course SAYS when introducing each LEGO

**Example introductions**:

**BASE LEGO**:
> "Now, the Italian for 'I want' as in 'I want to speak Italian with you now' is 'Voglio', Voglio."

**COMPOSITE LEGO**:
> "The Italian for 'I'm trying' as in 'I'm trying to learn' is 'Sto provando' - where 'Sto' is 'I'm' (which you learned earlier) and 'provando' is 'trying' (which you learned earlier)."

**Why the seed context**: "as in {seed}" tells the learner WHICH usage/meaning is being taught. Critical for understanding.

---

### **Phase 7: Compilation** 📦
**Input**: `seed_pairs.json`, `lego_pairs.json`, `lego_baskets.json`, `introductions.json`
**Output**: `course_manifest.json` - **THIS IS WHAT YOU'LL USE**

**What it does**: Packages everything into the exact format the mobile app expects

**Why legacy format**: The mobile app was built years ago and expects a very specific JSON structure. We can't change the app, so Phase 7 transforms our clean v7.7 format into the old format with:
- Empty tokens/lemmas arrays (legacy waste, but required)
- Single slice architecture (future-proofed for modules)
- All seeds in one slice
- Complete audio sample catalog with deterministic UUIDs

---

## What You're Getting: The Course Manifest

### Location
```
vfs/courses/{course_code}/course_manifest.json
```

**Test course**: `ita_for_eng_10seeds` (10 seeds → 1,681 audio files)
**Full course**: `ita_for_eng_668seeds` (668 seeds → ~110,000 audio files)

### The Key Section: `samples`

This is your "shopping list" of audio to generate:

```json
{
  "slices": [
    {
      "samples": {
        "Voglio": [
          {
            "id": "C6A82DE8-6044-AC07-8F4E-412F54FEF5F7",
            "cadence": "natural",
            "role": "target1"
          },
          {
            "id": "4114E479-6044-E115-8F4E-8B1C4F02C6C8",
            "cadence": "natural",
            "role": "target2"
          }
        ],
        "I want": [
          {
            "id": "489C5783-6044-36CD-31D4-4CB55EF258B5",
            "cadence": "natural",
            "role": "source"
          }
        ],
        "Now, the Italian for \"I want\" as in...": [
          {
            "id": "...",
            "cadence": "natural",
            "role": "source"
          }
        ]
      }
    }
  ]
}
```

### What Each Entry Means

**Text as key**: "Voglio" → This exact text needs audio
**Variants array**: Different voices/speeds for the same text
**UUID**: Filename for the audio (deterministic!)
**Role**: Which voice to use
**Cadence**: How fast to speak (currently only "natural", future: "fast"/"slow")

### The Three Roles

- **target1**: Primary target language voice (e.g., Italian voice 1)
- **target2**: Alternate target language voice (e.g., Italian voice 2)
- **source**: Known language voice (e.g., English voice)

**Note**: It's called "source" not "known" due to legacy naming (back when the system was first designed). Annoying but unchangeable without breaking the app.

---

## The UUID Magic: Deterministic Audio IDs

### Why UUIDs Matter

Every piece of text gets a unique ID code (UUID). But here's the clever part: **they're deterministic**.

### The Format
```
C6A82DE8-6044-AC07-8F4E-412F54FEF5F7
└─┬──┘ └┬┘ └─┬┘ └─┬┘ └──────┬──────┘
  │     │    │    │         └─ Random (from hash)
  │     │    │    └─ Role-specific segment 4
  │     │    └─ Role-specific segment 3
  │     └─ Always "6044"
  └─ Random (from hash)
```

### Role-Specific Middle Segments

You can look at a UUID and know what it is:

- **target1** (Italian voice 1): `????-6044-AC07-8F4E-????`
- **target2** (Italian voice 2): `????-6044-E115-8F4E-????`
- **source** (English voice): `????-6044-36CD-31D4-????`

### How They're Generated

```
UUID = SHA-1(text + language + role + cadence)
```

**Example**:
```
Input:  "Voglio" + "ita" + "target1" + "natural"
Output: C6A82DE8-6044-AC07-8F4E-412F54FEF5F7

Same input again?
Output: C6A82DE8-6044-AC07-8F4E-412F54FEF5F7 (identical!)
```

### Why This Is Brilliant

1. **Regenerable**: If you regenerate the course 100 times, "Voglio" target1 gets the same UUID
2. **Cacheable**: Already have `C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3`? Skip it!
3. **Identifiable**: Lost track of what a file is? The UUID tells you the role from the middle segments
4. **No database needed**: The manifest IS the database

---

## What Phases 1-7 Produce: Complete Example

For a 10-seed Italian course:

### Statistics
- **10 seeds** (complete sentences)
- **63 LEGOs** (word/phrase building blocks)
- **562 practice phrases** (expanding windows)
- **1,141 unique text phrases** (after deduplication)
- **1,681 audio variants** (3 voices × phrases, roughly)

### Breakdown by Type
- Seed sentences: 10 Italian + 10 English = 20 × 3 roles = 60 audio files
- LEGO pairs: 63 Italian + 63 English = 126 × 3 roles = 378 audio files
- Practice phrases: ~560 Italian + ~560 English = 1,120 × 3 roles (ish)
- Presentation text (English only, source role): 63 × 1 = 63 audio files

**Total**: 1,681 MP3 files needed

---

## What You Need to Do (Phase 8)

You already know how to generate audio. Here's what's different about this project:

### 1. Input Source
**Read from**: `course_manifest.json` → `slices[0].samples` object
**NOT from**: Individual phase files (seed_pairs, lego_pairs, etc)

Phase 7 already compiled everything. The manifest is complete.

### 2. Filename Strategy
**Use**: UUID from manifest (e.g., `C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3`)
**NOT**: Generated UUIDs, text-based filenames, or sequential numbering

The app expects these exact UUIDs. No variation allowed.

### 3. Voice Mapping
You'll need to configure:
- Italian: 2 voices (target1, target2)
- English: 1 voice (source)
- [Future: Spanish, French, Welsh, etc.]

Map each language × role combination to your voice IDs.

### 4. Output Structure
```
Local: audio/{UUID}.mp3
S3: s3://ssi-courses/{course_code}/audio/{UUID}.mp3
```

### 5. No Manifest Modification
Don't add duration, file size, or other metadata to the manifest. Phase 7 created it complete. You just generate the audio files it references.

---

## The Strategic Vision

### Course Generation is Now Automated

Once you finish Phase 8, the entire pipeline is automated:

```
Input: 668 English sentences
↓
Phases 1-7: Generate course structure (minutes)
↓
Phase 8: Generate audio (hours)
↓
Output: Complete course ready for app
```

### Scalability

**Current**:
- Italian-for-English: ~110,000 audio files
- Spanish-for-English: ~110,000 audio files
- Welsh-for-English: ~110,000 audio files

**Future** (any direction):
- Italian-for-Spanish
- French-for-Mandarin
- Welsh-for-Japanese
- etc.

Same process. Same 668 seeds. Just different translations.

### Why Deterministic UUIDs Enable This

Imagine we fix a typo in seed #42. We regenerate the course:
- Seeds 1-41: Same UUIDs (no change needed)
- Seed 42: Different UUID (regenerate just this audio)
- Seeds 43-668: Same UUIDs (no change needed)

**Result**: Only regenerate 1% of audio instead of 100%. Huge time/cost savings.

---

## The Test Course: Your Starting Point

### `ita_for_eng_10seeds`

This is a mini-course with just 10 seeds. Perfect for testing because:
- Small enough to generate quickly (~10-20 minutes)
- Large enough to catch edge cases (1,681 files)
- Real data (actual course structure)

**Location**: `vfs/courses/ita_for_eng_10seeds/course_manifest.json`

### What to Verify

1. ✅ Filenames match manifest UUIDs exactly
2. ✅ All three roles generate correctly (target1, target2, source)
3. ✅ Long presentation text works (some are 100+ words)
4. ✅ S3 upload path is correct
5. ✅ Audio quality is good

Once this works, the full 668-seed course is just "run it longer."

---

## The Full Course: Production Scale

### `ita_for_eng_668seeds`

This is the complete SSi Italian curriculum:
- 668 seeds
- ~4,200 LEGOs
- ~37,000 practice phrases
- ~110,000 audio files
- ~3-5 GB total size

**Generation time**: 2-4 hours (depends on TTS API speed)

---

## Key Strategic Decisions (Why Things Are How They Are)

### Why Not Generate Manifest in Phase 8?

**Phase 7 already did it.** The manifest contains all metadata:
- Structure (seeds, LEGOs, practice nodes)
- Presentation text
- UUID catalog

Phase 8 is purely audio generation. Keep it simple.

### Why Deterministic UUIDs?

**Regeneration efficiency.** If we change one seed, we only regenerate ~1% of audio instead of 100%.

### Why Three Roles (target1, target2, source)?

**Learning variety.** Two target voices (different speakers) helps learners:
- Recognize the language from different voices
- Not get dependent on one accent
- Practice listening to variety

One source voice is enough - they already know this language.

### Why Role-Specific UUID Segments?

**Debugging.** If you find a random MP3 file, you can:
1. Look at the middle segments
2. Know immediately if it's target1, target2, or source
3. Find it in the manifest

Without this, lost files are mysteries.

### Why Empty tokens/lemmas in Manifest?

**Legacy app requirement.** The mobile app expects these fields. They're never used (always empty), but removing them breaks the app. So we keep them for backwards compatibility.

### Why Single Slice?

**Current courses are single modules.** The slices array is future-proofing for when we add:
- Module 2 (intermediate)
- Module 3 (advanced)
- Etc.

For now, all 668 seeds go in one slice.

---

## Handover Checklist

### What You Have
- ✅ Complete course manifest with 1,681 (test) or 110,000 (full) sample entries
- ✅ Deterministic UUIDs for every audio file
- ✅ Role-voice mapping strategy
- ✅ Test course for validation
- ✅ Documentation (Phase 8 intelligence in docs/phase_intelligence/)

### What You Need
- Voice IDs configured for Italian + English (test course)
- API keys (ElevenLabs, AWS S3)
- Implementation approach (you already know this part!)

### What You'll Deliver
- MP3 files named exactly as manifest UUIDs
- Uploaded to S3 at correct paths
- Test course validation (1,681 files)
- [Optional] Full course generation (110,000 files)

---

## Questions/Clarifications

**Tom is available for**:
- Voice ID provisioning questions
- API key access
- Course manifest structure questions
- Strategic direction discussions

---

## Documentation References

### Complete Technical Docs
- **Phase 8 Intelligence**: `docs/phase_intelligence/phase_8_audio_generation.md`
- **Phase 7 Intelligence**: `docs/phase_intelligence/phase_7_compilation.md` (explains manifest structure)
- **All Phases**: `docs/phase_intelligence/README.md` (full pipeline overview)

### Architecture Docs
- **APML Specification**: `ssi-course-production.apml` (v7.7.0)
- **Course Manifest Schema**: `schemas/course-manifest-schema.json`

---

## The Bottom Line

You're implementing the final 12% of the pipeline. Phases 1-7 (88% of the work) are complete and tested. Your job is straightforward:

1. Read the `samples` object from the manifest
2. Generate audio for each text × role × cadence combination
3. Save as `{UUID}.mp3` (UUID from manifest, not generated)
4. Upload to S3

You already know how to do this technically. This document just explains the **context** - what those 1,681 UUIDs represent, why they're structured this way, and how they fit into the complete SSi course generation system.

**Welcome to the team. Let's make some audio!** 🎵

---

**Document Version**: 1.0
**Last Updated**: 2025-10-23
**Author**: Claude Code + Tom
**Status**: Ready for Kai's implementation
