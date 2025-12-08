# Phase 9: Manifest Compilation

**Port**: 3466
**Version**: 11.0.0
**Status**: Active
**Type**: Script (deterministic transformation)
**Input**: `lego_pairs.json`, `lego_baskets.json`, Supabase `audio_samples` table
**Output**: `course_manifest.json`

---

## Overview

The Manifest Compilation service transforms SSoT files into the app-ready course manifest format. In APML v11.0, this happens **AFTER** audio generation (audio-first approach).

**Key Change in v11.0**: Manifest queries Supabase for audio UUIDs rather than generating them. Audio must exist before manifest compilation.

---

## Key Distinction: Script vs Phase

- **Phase**: Triggers Claude Code agents (takes time, requires orchestration)
- **Script**: Runs instantly, deterministic transformation

**Manifest is a script** - it transforms existing data into the fixed format required by the mobile app.

---

## Input Files

### 1. lego_pairs.json (SSoT - from Phase 2)

Contains seeds with LEGOs, types (A/M), and components:
```json
{
  "version": "11.0",
  "known_language": "eng",
  "target_language": "spa",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": { "known": "I want to speak Spanish...", "target": "Quiero hablar español..." },
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",
          "new": true,
          "lego": { "known": "I want", "target": "quiero" }
        }
      ]
    }
  ]
}
```

### 2. lego_baskets.json (from Phase 3)

Practice phrases for each LEGO:
```json
{
  "version": "11.0",
  "baskets": {
    "S0001L01": {
      "lego_id": "S0001L01",
      "practice_phrases": [
        { "known": "I want to speak", "target": "Quiero hablar" }
      ]
    }
  }
}
```

### 3. Supabase audio_samples Table (from Phase 8)

Audio metadata queried by text + role:
```sql
SELECT uuid, duration FROM audio_samples
WHERE text = 'Quiero hablar' AND role = 'target1';
```

### 4. Canonical Files

- `welcomes.json` - Course welcome messages
- `eng_encouragements.json` - Pooled and ordered encouragements

---

## Output Format: course_manifest.json

### Top-Level Structure
```json
{
  "id": "en-spa",
  "known": "en",
  "target": "spa",
  "version": "11.0.0",
  "status": "alpha",
  "introduction": {
    "id": "UUID",
    "cadence": "natural",
    "role": "presentation",
    "duration": 45.83
  },
  "slices": [...]
}
```

### Language Codes
- **Known (English)**: Uses 2-letter code `en`
- **Target languages**: Use 3-letter codes (`spa`, `cmn`, `ita`, etc.)
- **ID format**: `{known}-{target}` (e.g., `en-spa`, `en-cmn`)

---

## Audio Roles (CRITICAL - Only 5 Valid Roles)

| Role | Description | Entries Per Text | Voice |
|------|-------------|------------------|-------|
| `source` | English/known language text | 1 | English |
| `target1` | Target language - female | 1 | Female target voice |
| `target2` | Target language - male | 1 | Male target voice |
| `presentation` | LEGO introduction text | 1 | English |
| `presentation_encouragement` | Encouragement messages | 1 | English |

### Critical Rules
- Every **target language text** MUST have TWO entries: `target1` AND `target2`
- Every **known/English text** has ONE entry: `source`
- Presentations have ONE entry: `presentation`
- Encouragements have ONE entry: `presentation_encouragement`

---

## Samples Dictionary Structure

The samples dictionary maps text content to audio file references. The app looks up audio by TEXT CONTENT, not by LEGO ID.

```json
{
  "samples": {
    "I want to speak Spanish with you now.": [
      { "duration": 1.5, "id": "UUID1", "cadence": "natural", "role": "source" }
    ],
    "Quiero hablar español contigo ahora.": [
      { "duration": 2.1, "id": "UUID2", "cadence": "slow", "role": "target1" },
      { "duration": 2.3, "id": "UUID3", "cadence": "slow", "role": "target2" }
    ]
  }
}
```

---

## Manifest Pruning (APML v11.0)

**LEGOs with `new: false` do NOT get introduction_items.**

Why? They were already introduced as part of a larger LEGO (embedded). Re-introducing them would be redundant.

```javascript
for (const seed of seeds) {
  for (const lego of seed.legos) {
    if (lego.new === true) {
      // Create introduction_item with presentation, nodes, etc.
      createIntroductionItem(lego);
    }
    // LEGOs with new: false are skipped - no introduction needed
  }
}
```

---

## Practice Phrase Ordering (nodes array)

The `nodes` array in each introduction_item follows pedagogical principles:

### For A-type (Atomic) LEGOs
1. **LEGO debut** - The LEGO itself
2. **Practice phrases** - Sorted by length (shortest first)

### For M-type (Molecular) LEGOs
1. **Components** - Building blocks first (active practice before combining)
2. **LEGO debut** - The complete LEGO
3. **Practice phrases** - Sorted by length (shortest first)

**Pedagogical rationale**: Component drills come BEFORE the LEGO debut so learners actively practice the building blocks before combining them.

---

## Audio UUID Lookup (APML v11.0)

Instead of generating UUIDs, manifest compilation queries Supabase:

```javascript
async function getAudioUUID(text, role, cadence) {
  const { data } = await supabase
    .from('audio_samples')
    .select('uuid, duration')
    .eq('text', text)
    .eq('role', role)
    .eq('cadence', cadence)
    .single();

  if (!data) {
    throw new Error(`Missing audio: "${text}" (${role})`);
  }

  return { id: data.uuid, duration: data.duration };
}
```

### Validation: 100% Audio Coverage

Before outputting manifest, verify ALL required audio exists:

```javascript
const missingAudio = [];

for (const [text, roles] of Object.entries(requiredSamples)) {
  for (const role of roles) {
    const exists = await audioExists(text, role);
    if (!exists) {
      missingAudio.push({ text, role });
    }
  }
}

if (missingAudio.length > 0) {
  throw new Error(`Missing ${missingAudio.length} audio samples`);
}
```

---

## API Endpoints

```
POST /compile               Compile manifest for course
GET  /validate/:courseCode  Validate audio coverage (dry-run)
GET  /status/:courseCode    Get manifest status
GET  /health               Health check
```

---

## Running the Script

```bash
# Via API
curl -X POST http://localhost:3466/compile \
  -H "Content-Type: application/json" \
  -d '{"courseCode": "spa_for_eng"}'

# Validation only (check audio coverage)
curl http://localhost:3466/validate/spa_for_eng
```

### Output
- **Primary**: `course_manifest.json`
- **Backup**: `{Target}_for_{Known}_speakers_COURSE_{timestamp}.json`

---

## Validation Gates

**Pre-Manifest**:
- ✅ lego_pairs.json exists (conflict-free, from Phase 2)
- ✅ lego_baskets.json exists (from Phase 3)
- ✅ **100% audio coverage in Supabase** (from Phase 8)
- ✅ welcomes.json exists (canonical)
- ✅ eng_encouragements.json exists (canonical)

**Post-Manifest**:
- ✅ course_manifest.json exists
- ✅ Valid structure (matches app expectations)
- ✅ All UUIDs reference existing audio in Supabase
- ✅ Target texts have both target1 AND target2 entries
- ✅ All 5 roles present and correct
- ✅ LEGOs with `new: false` are NOT in introduction_items

---

## Statistics (Production Courses)

### Spanish (spa_for_eng)
- Seeds: 630
- Introduction items: ~1,900 (only `new: true` LEGOs)
- Practice nodes: ~18,000
- Unique sample texts: ~30,000
- Total sample entries: ~44,000
- File size: ~14.5 MB

### Chinese (cmn_for_eng)
- Seeds: 659
- Introduction items: ~2,200
- Practice nodes: ~35,000
- Unique sample texts: ~48,000
- Total sample entries: ~70,000
- File size: ~23.7 MB

---

## Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_xxxxx

# Course paths
VFS_ROOT=/path/to/public/vfs/courses
```

---

## Version History

- v7.0: Initial manifest compilation
- v8.0: Duration field support
- v10.0: Script designation, deterministic UUIDs
- v11.0: Audio-first approach, Supabase lookup, manifest pruning (skip `new: false`)

**Last Updated**: Dec 8, 2025
