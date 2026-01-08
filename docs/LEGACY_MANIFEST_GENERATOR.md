# Legacy Manifest Generator

## Purpose

Generate backwards-compatible JSON manifests for **new database-first courses** so they work with the **old learning app** that expects the legacy manifest format.

This bridges the gap between:
- **New system**: Supabase `course_audio` table + `lego_baskets.json`
- **Old system**: Single JSON manifest with embedded `samples` dictionary

---

## Quick Start

### CLI Usage
```bash
# Generate manifest to stdout
node services/phases/generate-legacy-manifest.cjs spa_for_eng

# Generate manifest to file
node services/phases/generate-legacy-manifest.cjs spa_for_eng output.json
```

### API Usage
```bash
curl http://localhost:3470/api/production/spa_for_eng/export-legacy
```

---

## How It Works

### Data Flow (Database-First)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE DATABASE (Primary)                         │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│  course_seeds   │  course_legos   │ course_practice │    course_audio     │
│   (250 rows)    │   (808 rows)    │    _phrases     │   (17137 rows)      │
│                 │                 │  (4688 rows)    │                     │
└────────┬────────┴────────┬────────┴────────┬────────┴──────────┬──────────┘
         │                 │                 │                   │
         └─────────────────┴─────────────────┴───────────────────┘
                                    │
                                    ▼
                          ┌─────────────────────┐
                          │  Legacy Manifest    │
                          │  Generator Script   │
                          └─────────┬───────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────────┐     ┌─────────────────────┐
│ lego_pairs.json │      │eng_encouragements   │     │   en-es.json        │
│   (fallback)    │      │      .json          │     │ (output manifest)   │
└─────────────────┘      └─────────────────────┘     └─────────────────────┘
```

### Data Sources (Priority Order)

1. **Primary: Supabase Database**
   - `course_seeds` - Seed sentences (known + target text)
   - `course_legos` - LEGO pairs with `is_new` flag
   - `course_practice_phrases` - Practice phrases by word count
   - `course_audio` - Audio metadata (UUID, duration, role)

2. **Fallback: Local JSON Files**
   - `lego_pairs.json` - Used when DB seeds are incomplete (250 vs 668)
   - `eng_encouragements.json` - Encouragement texts (always from file)

### Key Transformations

| New System | Old Manifest | Transformation |
|------------|--------------|----------------|
| `course_audio.role = 'known'` | `samples[].role = 'source'` | Rename role |
| `eng`, `spa` (3-letter) | `en`, `es` (2-letter) | Map language codes |
| `course_audio.duration_ms` | `samples[].duration` (seconds) | Convert ms → seconds |
| `course_audio.id` | `samples[].id` | Use DB UUID directly |

---

## Output Structure

```json
{
  "id": "en-es",
  "known": "en",
  "target": "es",
  "version": "5.0.0",
  "status": "published",
  "introduction": {
    "id": "placeholder-uuid",
    "cadence": "natural",
    "role": "presentation",
    "duration": 45.0
  },
  "slices": [{
    "id": "slice-uuid",
    "version": "1.0.0",
    "seeds": [
      {
        "id": "seed-uuid",
        "seed_sentence": { "canonical": "I want to speak Spanish..." },
        "node": {
          "id": "node-uuid",
          "known": { "text": "...", "tokens": [], "lemmas": [] },
          "target": { "text": "...", "tokens": [], "lemmas": [] }
        },
        "introduction_items": [...]
      }
    ],
    "samples": {
      "I want to speak Spanish.": [
        { "id": "audio-uuid", "role": "source", "cadence": "natural", "duration": 2.856 }
      ],
      "Quiero hablar español.": [
        { "id": "audio-uuid-1", "role": "target1", "cadence": "slow", "duration": 3.2 },
        { "id": "audio-uuid-2", "role": "target2", "cadence": "slow", "duration": 3.1 }
      ]
    },
    "orderedEncouragements": [...],
    "pooledEncouragements": [...]
  }]
}
```

---

## The `samples` Dictionary

This is the critical part for audio playback. The old app looks up audio by **text**:

```json
"samples": {
  "text string": [
    {
      "id": "UUID-for-audio-file",
      "role": "source|target1|target2",
      "cadence": "natural|slow",
      "duration": 2.5
    }
  ]
}
```

### Role Mapping
- `source` = known language audio (English) - cadence: natural
- `target1` = target language voice 1 (Spanish) - cadence: slow
- `target2` = target language voice 2 (Spanish) - cadence: slow

### How Audio is Looked Up

1. Generator collects all unique texts from seeds/LEGOs/baskets
2. For each text, queries `course_audio` table by:
   - `course_code`
   - `text_normalized` (lowercase, trimmed)
   - `language` (eng/spa)
   - `role` (known/target1/target2)
3. Maps DB record to legacy format:
   - `id` → uppercase UUID
   - `role` → "known" becomes "source"
   - `duration_ms` → seconds

---

## File Size Optimization

Old manifests were 11-28MB because they included full `tokens` and `lemmas` arrays.

New generator uses empty arrays:
```json
"known": { "text": "I want", "tokens": [], "lemmas": [] }
```

Result: ~1.5MB vs ~15MB (90% smaller)

---

## What's Included

| Content | Primary Source | Fallback | Notes |
|---------|---------------|----------|-------|
| Seeds | `course_seeds` table | `lego_pairs.json` | Combined: 668 seeds |
| LEGOs | `course_legos` table | - | Only `is_new: true` LEGOs |
| Practice phrases | `course_practice_phrases` table | - | By word count (2, 3, 4, 5+) |
| Audio mappings | `course_audio` table | - | 17137 records, ~96% coverage |
| Encouragements | `eng_encouragements.json` | - | 48 ordered, 26 pooled |

---

## What's NOT Included (Placeholder)

| Content | Status | Notes |
|---------|--------|-------|
| Introduction audio | Placeholder UUID | Kai has the actual files |
| Belt assessor | Not included | Optional gamification |
| Full tokens/lemmas | Empty arrays | Not used by app |

---

## Requirements

### For CLI Usage
- Node.js
- `.env` file with:
  ```
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_SERVICE_KEY=xxx
  ```
- Database tables populated (primary):
  - `course_seeds`, `course_legos`, `course_practice_phrases`, `course_audio`
- Fallback files (optional, for incomplete DB data):
  - `lego_pairs.json` in `tools/vfs/courses/{courseCode}/` or `public/vfs/courses/{courseCode}/`

### For API Usage
- Production API running (port 3470)
- Same Supabase access

---

## Current Coverage (spa_for_eng)

```
Database records:
  - course_seeds: 250 rows
  - course_legos: 808 rows
  - course_practice_phrases: 4688 rows
  - course_audio: 17137 rows

Generator output:
  - Seeds: 668 (250 from DB + 418 from lego_pairs.json fallback)
  - Unique texts collected: 12066
  - Samples with audio matches: 11642 (~96%)
```

High coverage achieved by combining:
1. Database tables (primary source)
2. lego_pairs.json fallback for remaining seeds

---

## Files

| File | Purpose |
|------|---------|
| `services/phases/generate-legacy-manifest.cjs` | Main generator script |
| `services/production-api.cjs` | API endpoint (`/export-legacy`) |
| `tools/vfs/courses/{code}/lego_pairs.json` | Seed/LEGO structure |
| `tools/vfs/courses/{code}/lego_baskets.json` | Practice phrases |
| `public/vfs/canonical/eng_encouragements.json` | Encouragement texts |

---

## Next Steps

1. **Generate full lego_baskets.json** for all seeds (not just S0030)
2. **Ensure 100% audio coverage** in `course_audio` table
3. **Add real introduction audio** UUID (from Kai's files)
4. **Test in old learning app**
