# Legacy Manifest Generator

## Purpose

Generate backwards-compatible JSON manifests for **new database-first courses** so they work with the **old learning app** that expects the legacy manifest format.

This bridges the gap between:
- **New system**: Supabase `course_audio` table + `lego_baskets.json`
- **Old system**: Single JSON manifest with embedded `samples` dictionary

---

## Quick Start

### Dashboard (Recommended)
1. Go to **Mission Control** for your course
2. Click **"Export Legacy"** in Quick Actions
3. The manifest will download automatically

### CLI Usage
```bash
# Generate manifest to stdout
node services/phases/generate-legacy-manifest.cjs spa_for_eng

# Generate manifest to file
node services/phases/generate-legacy-manifest.cjs spa_for_eng output.json
```

### API Usage
```bash
# Local
curl http://localhost:3470/api/production/spa_for_eng/export-legacy

# Via ngrok (if tunnel is active)
curl https://<ngrok-url>/api/production/spa_for_eng/export-legacy
```

---

## For Kai

If you're on your own machine and need to access the export:

1. **Dashboard**: Go to `http://localhost:5173/production/spa_for_eng` → "Export Legacy"
2. **Direct API**: `http://localhost:3470/api/production/spa_for_eng/export-legacy`
3. **CLI**: `node services/phases/generate-legacy-manifest.cjs spa_for_eng output.json`

All methods require the Production API (`node services/production-api.cjs`) to be running.

---

## How It Works

### Data Flow (Database-Only)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE DATABASE                                    │
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
                   ┌────────────────┴────────────────┐
                   │                                 │
                   ▼                                 ▼
        ┌─────────────────────┐           ┌─────────────────────┐
        │eng_encouragements   │           │   en-es.json        │
        │      .json          │           │ (output manifest)   │
        └─────────────────────┘           └─────────────────────┘
```

### Data Sources

1. **Supabase Database (required)**
   - `course_seeds` - Seed sentences (known + target text)
   - `course_legos` - LEGO pairs with `is_new` flag
   - `course_practice_phrases` - Practice phrases by word count
   - `course_audio` - Audio metadata (UUID, duration, role)

2. **Local Files**
   - `eng_encouragements.json` - Encouragement texts (canonical file)

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

| Content | Source | Notes |
|---------|--------|-------|
| Seeds | `course_seeds` table | Database only (250 for spa_for_eng) |
| LEGOs | `course_legos` table | Only `is_new: true` LEGOs |
| Practice phrases | `course_practice_phrases` table | By word count (2, 3, 4, 5+) |
| Audio mappings | `course_audio` table | 17137 records |
| Encouragements | `eng_encouragements.json` | 48 ordered, 26 pooled |

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
- Database tables populated:
  - `course_seeds`, `course_legos`, `course_practice_phrases`, `course_audio`

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
  - Seeds: 250 (database only - no fallback)
  - Unique texts collected: 11232
  - Samples with audio matches: 11642
```

The generator only includes seeds that exist in the database.
No fallback to JSON files - ensures data consistency.

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
