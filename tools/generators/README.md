# Course Generators

Tools for generating course content and manifests.

## Phase 7: Course Manifest Generator

**Note:** Phase 7 has been moved to `services/phase7/` to keep it separate from general-purpose tools.

See: [`services/phase7/README.md`](../../services/phase7/README.md)

### Legacy Reference: `phase7_generate_course_manifest.py`

Transforms phase outputs into final APML 3.2.0 course manifest format.

**Input files (from course directory):**
- `seed_pairs.json` (Phase 1)
- `lego_pairs.json` (Phase 3)
- `lego_baskets_deduplicated.json` (Phase 5)
- `introductions.json` (Phase 6)

**Output:**
- `{Target}_for_{Known}_speakers_COURSE_YYYYMMDD_HHMMSS.json`

**Features:**
- ✅ Deterministic UUID generation for all samples
- ✅ Embedded encouragements (language-specific)
- ✅ Complete APML structure with seeds, introduction_items, nodes, samples
- ✅ Tagged phrase extraction from presentations
- ✅ Dual-voice support (target1/target2 for TTS)

**Usage:**

```bash
# Generate Spanish course
python3 tools/generators/phase7_generate_course_manifest.py public/vfs/courses/spa_for_eng

# Generate with custom output file
python3 tools/generators/phase7_generate_course_manifest.py public/vfs/courses/spa_for_eng output.json
```

**Deterministic UUIDs (Legacy SSi Format):**

All sample entries use deterministic UUIDs compatible with Kai's JavaScript implementation.

**Algorithm:**
1. Create key: `text|language|role|cadence`
2. Generate SHA1 hash of key
3. Use fixed role-specific segments for middle portions

**Format:** `XXXXXXXX-SSSS-RRRR-CCCC-XXXXXXXXXXXX`
- Segment 1: First 8 chars of SHA1 hash (bytes 0-3)
- Segment 2: Role-specific fixed value (usually `6044`)
- Segment 3: Role-specific identifier
- Segment 4: Role-specific cadence marker
- Segment 5: Last 12 chars of SHA1 hash (bytes 10-15)

**Role Segments:**
- `target1`: `6044-AC07-8F4E`
- `target2`: `6044-E115-8F4E`
- `source`: `6044-36CD-31D4`
- `presentation`: `9CFE-2486-8F4E`

**Example:**
```
Text: "Quiero hablar español contigo ahora."
Language: es, Role: target1, Cadence: natural

UUID: BF4042D3-6044-AC07-8F4E-A7E1F8200692
      ^^^^^^^^ ^^^^ ^^^^ ^^^^ ^^^^^^^^^^^^
      hash     role role role hash
```

Same text with `target2` role produces different UUID because role is part of the hash key.

**Encouragements:**

Motivational content is embedded for each known language:
- `data/pooled_encouragements_{lang}.json` - Short encouragements (26 for English)
- `data/ordered_encouragements_{lang}.json` - Long encouragements (48 for English)

Encouragements are automatically loaded based on the course's known language.

**Adding New Languages:**

To support a new known language (e.g., French):
1. Add encouragements to `ENCOURAGEMENTS_BY_LANGUAGE` dict in the script
2. Create `data/ordered_encouragements_fr.json` file
3. Script will automatically use them for `fr_for_xx` courses

**Output Structure:**

```json
{
  "id": "en-es",
  "known": "en",
  "target": "es",
  "version": "3.2.0",
  "status": "alpha",
  "introduction": {...},
  "slices": [{
    "id": "...",
    "seeds": [...],
    "pooledEncouragements": [...],
    "orderedEncouragements": [...],
    "samples": {
      "phrase text": [
        {
          "id": "deterministic-uuid",
          "role": "source|target1|target2|presentation",
          "cadence": "natural",
          "duration": null
        }
      ]
    },
    "version": "3.2.0"
  }]
}
```

**Notes:**

- Durations are set to `null` - populated during TTS/audio generation phase
- Gender agreement (masculine/feminine) applied at TTS phase, not in course data
- All teaching text uses masculine forms by default
- Tagged phrases in presentations (e.g., `{target1}'estoy'`) automatically become sample entries
