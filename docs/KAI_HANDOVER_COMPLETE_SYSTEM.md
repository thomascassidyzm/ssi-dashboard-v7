# SSi v7.7 Course Production - Technical Handover

**Date**: 2025-10-23  
**Status**: Phases 1-7 Complete | Phase 8 Ready  
**Assignee**: Kai

---

## Executive Summary

v7.7 rebuild complete. Dashboard-centric architecture, phases 1-7 tested. Phase 8 (audio) ready for your implementation.

**Key Changes from Previous**:
- Ultra-compact v7.7.0 JSON format
- Deterministic UUIDs with role-specific segments  
- Single manifest compilation (no multi-file reads)
- PM2 process management
- Modular phase intelligence docs

---

## System Architecture

### Translation Strategy

**New**: Target-to-known translation for non-English pairs.

**Italian-for-Spanish**:
1. eng → ita (canonical to target)
2. ita → spa (target to known - ensures alignment)

### Phase Pipeline

| Phase | Output | Notes |
|-------|--------|-------|
| 1 | seed_pairs.json | Target-to-known translation |
| 2 | corpus_intelligence.json | FCFS analysis |
| 3 | lego_pairs.json | Component arrays added |
| 3.5 | lego_graph.json | Adjacency patterns |
| 4 | lego_baskets.json | Expanding windows |
| 5 | deduplicated.json | ~22% dedup |
| 6 | introductions.json | Presentation text |
| 7 | **course_manifest.json** | **Single compiled manifest** |
| 8 | audio/*.mp3 | **Your implementation** |

---

## Course Manifest Structure

### Location
```
vfs/courses/{course_code}/course_manifest.json
```

**Test**: `ita_for_eng_10seeds` (1,681 files)  
**Full**: `ita_for_eng_668seeds` (~110k files)

### Key Section: `samples`

This is your audio generation catalog:

```json
{
  "slices": [{
    "samples": {
      "Voglio": [
        { "id": "C6A82DE8-6044-AC07-8F4E-412F54FEF5F7", "cadence": "natural", "role": "target1" },
        { "id": "4114E479-6044-E115-8F4E-8B1C4F02C6C8", "cadence": "natural", "role": "target2" }
      ],
      "I want": [
        { "id": "489C5783-6044-36CD-31D4-4CB55EF258B5", "cadence": "natural", "role": "source" }
      ]
    }
  }]
}
```

**Structure**:
- **Key**: Text to speak
- **Array**: Variants (role × cadence combinations)
- **UUID**: Deterministic filename
- **Role**: target1, target2, source
- **Cadence**: natural (fast/slow reserved for future)

### What's Included

- Seed sentences (target + source)
- LEGO pairs (target + source)
- Practice phrases from expanding windows
- Presentation text (source only)

**Total for test course**: 1,141 unique phrases → 1,681 audio files (3 roles)

---

## UUID Specification

### Format

```
C6A82DE8-6044-AC07-8F4E-412F54FEF5F7
└─┬──┘ └┬┘ └─┬┘ └─┬┘ └──────┬──────┘
  SHA1  6044 Role Role  SHA1
```

### Role-Specific Segments

| Role | Segment 3 | Segment 4 |
|------|-----------|-----------|
| target1 | AC07 | 8F4E |
| target2 | E115 | 8F4E |
| source | 36CD | 31D4 |

### Generation Algorithm

```javascript
hash = SHA-1(text + "|" + language + "|" + role + "|" + cadence)
uuid = hash[0:8] + "-6044-" + ROLE_SEG3 + "-" + ROLE_SEG4 + "-" + hash[20:32]
```

**Deterministic**: Same inputs = same UUID (always)

### Why This Matters

1. **Regeneration**: Fix one seed → only regenerate ~1% of audio
2. **Caching**: Already have the UUID? Skip it
3. **Debugging**: Middle segments identify role at a glance
4. **No database**: Manifest is the source of truth

---

## Your Implementation (Phase 8)

### Requirements

```javascript
// Read manifest
const manifest = await fs.readJson(`vfs/courses/${courseCode}/course_manifest.json`);
const samples = manifest.slices[0].samples;

// Iterate samples
for (const [text, variants] of Object.entries(samples)) {
  for (const {id, role, cadence} of variants) {
    // Generate TTS
    const audio = await generateTTS(text, voiceConfig[role], cadence);
    
    // Save with UUID filename
    await fs.writeFile(`audio/${id}.mp3`, audio);
    
    // Upload to S3
    await uploadToS3(`courses/${courseCode}/audio/${id}.mp3`, audio);
  }
}
```

### Voice Configuration

Map language × role → voice ID:

```javascript
const voices = {
  ita: { target1: 'voice-id-1', target2: 'voice-id-2' },
  eng: { source: 'voice-id-3' }
};
```

### Output Structure

**Local**: `audio/{UUID}.mp3`  
**S3**: `s3://popty-bach-lfs/courses/{course_code}/audio/{UUID}.mp3`

---

## Key Implementation Rules

### ✅ DO

- Read from `course_manifest.json` samples object
- Use UUID from manifest as filename
- Generate all role variants (target1, target2, source)
- Upload to S3 with `courses/{course_code}/audio/` prefix

### ❌ DON'T

- Read from individual phase files (seed_pairs, lego_pairs, etc)
- Generate new UUIDs (use manifest UUIDs)
- Use text as filename
- Modify the manifest (duration, metadata, etc)

---

## Testing Approach

### Start Small
```bash
# Test with first 10 samples
node phase8.js --course ita_for_eng_10seeds --limit 10
```

### Verify Filenames
```bash
# Your audio files
ls audio/ | head -5

# Manifest UUIDs
jq '.slices[0].samples | to_entries[0:2]' course_manifest.json
```

### Full Test Course
```bash
# 1,681 files (~10-20 min)
node phase8.js --course ita_for_eng_10seeds
```

---

## Statistics

### Test Course (`ita_for_eng_10seeds`)
- Seeds: 10
- LEGOs: 63
- Practice nodes: 562
- Unique phrases: 1,141
- **Total audio files: 1,681**
- Size: ~50-100 MB
- Time: ~10-20 min

### Full Course (`ita_for_eng_668seeds`)
- Seeds: 668
- LEGOs: ~4,200
- Practice nodes: ~37,000
- Unique phrases: ~76,000
- **Total audio files: ~110,000**
- Size: ~3-5 GB
- Time: ~2-4 hours

---

## Environment Setup

```bash
ELEVENLABS_API_KEY=...
AWS_ACCESS_KEY_ID=AKIAYOZ5W4WS34FFVFOJ
AWS_SECRET_ACCESS_KEY=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
AWS_REGION=eu-west-1
S3_BUCKET=popty-bach-lfs
```

---

## Documentation

- **Phase 8 Intelligence**: `docs/phase_intelligence/phase_8_audio_generation.md` (full spec)
- **Phase 7 Intelligence**: `docs/phase_intelligence/phase_7_compilation.md` (manifest structure)
- **Schema**: `schemas/course-manifest-schema.json`
- **APML**: `ssi-course-production.apml` (v7.7.0)

---

## Deliverables

1. Script: `scripts/phase8-audio-generation.cjs` (or .js)
2. Local audio: `vfs/courses/{course_code}/audio/*.mp3`
3. S3 uploads: All files in correct paths
4. Test validation: Filenames match manifest UUIDs
5. [Optional] Progress tracking for resumability

---

## Branch Strategy

```bash
git checkout main
git pull
git checkout -b feature/phase8-audio-generation

# Your work here

git push origin feature/phase8-audio-generation
# Create PR to main
```

---

**Questions**: Tom available for voice config, API keys, manifest structure clarifications.

---

**Document Version**: 2.0  
**Status**: Ready for implementation
