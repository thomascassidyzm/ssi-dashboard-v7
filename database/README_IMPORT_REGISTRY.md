# Import Course to Registry-Aligned Database

## Overview

The `import-course-registry.cjs` script imports course content from VFS JSON files into the new registry-aligned Supabase schema (migration 002).

## Key Differences from Legacy Import

| Aspect | Legacy (`import-course-v2.cjs`) | Registry (`import-course-registry.cjs`) |
|--------|--------------------------------|----------------------------------------|
| **Primary Keys** | Sequential IDs | UUIDs (auto-generated) |
| **Schema** | `seeds`, `legos`, `basket_phrases`, `lego_components` | `course_seeds`, `course_legos`, `course_practice_phrases` |
| **Phrase Type** | Stored in `phrase_type` column | Computed at runtime from `word_count`, `lego_count`, `position` |
| **Components** | Separate `lego_components` table | JSONB `components` field in `course_legos` |
| **Versioning** | None | `version` + `updated_at` for delta sync |
| **Release Management** | None | `release_batch` for staged rollout |

## Schema Tables

### `courses`
Course configuration with language and voice settings.

**Fields:**
- `course_code` (PK): e.g., "spa_for_eng_v2"
- `known_lang`, `target_lang`: ISO 639-3 codes
- `known_voice`, `target_voice_1`, `target_voice_2`: TTS voice IDs
- `status`: 'draft' | 'released' | 'deprecated'

### `course_seeds`
Seed sentences (complete teaching units).

**Fields:**
- `id` (UUID PK): Auto-generated
- `course_code`, `seed_number`: Unique constraint
- `seed_id`: Generated column (e.g., "S0001")
- `known_text`, `target_text`: Seed pair
- `status`, `release_batch`, `version`, `updated_at`: Lifecycle

### `course_legos`
LEGO building blocks extracted from seeds.

**Fields:**
- `id` (UUID PK): Auto-generated
- `course_code`, `seed_number`, `lego_index`: Unique constraint
- `lego_id`: Generated column (e.g., "S0001L01")
- `type`: 'A' (Atomic) | 'M' (Molecular)
- `is_new`: true = first appearance, false = revisit
- `known_text`, `target_text`: LEGO pair
- `components`: JSONB array for M-type (e.g., `[{"known": "I", "target": "yo"}]`)
- `status`, `release_batch`, `version`, `updated_at`: Lifecycle

### `course_practice_phrases`
Practice phrases for LEGOs (only new LEGOs get baskets).

**Fields:**
- `id` (UUID PK): Auto-generated
- `course_code`, `seed_number`, `lego_index`, `position`: Unique constraint
- `known_text`, `target_text`: Practice phrase
- `word_count`: Number of words (for phrase_type classification)
- `lego_count`: Number of LEGOs used (for phrase_type classification)
- `position`: Order in practice sequence
  - `0` → component phrase
  - `1` → lego phrase
  - `2-7` → debut phrases
  - `8+` → eternal phrases
- `status`, `release_batch`, `version`, `updated_at`: Lifecycle

## Input Files

Located in `public/vfs/courses/{course_code}/`:

### `lego_pairs.json`
LEGO definitions with seed pairs and LEGO breakdown.

```json
{
  "version": "11.0",
  "format": "expanded",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": {
        "known": "I want to speak Spanish",
        "target": "Quiero hablar español"
      },
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",
          "new": true,
          "lego": {
            "known": "I want",
            "target": "quiero"
          }
        },
        {
          "id": "S0001L02",
          "type": "M",
          "new": true,
          "lego": {
            "known": "to speak",
            "target": "hablar"
          },
          "components": [
            {"known": "to", "target": "a"},
            {"known": "speak", "target": "hablar"}
          ]
        }
      ]
    }
  ]
}
```

**Key fields:**
- `seed_id`: Format "S0001" (parsed to seed_number = 1)
- `lego.id`: Format "S0001L01" (parsed to lego_index = 1)
- `lego.new`: true = first appearance (gets practice basket), false = revisit
- `lego.type`: 'A' (Atomic) or 'M' (Molecular)
- `lego.components`: Array of component pairs (M-type only)

### `lego_baskets.json`
Practice phrases for new LEGOs.

```json
{
  "baskets": {
    "S0001L01": {
      "lego": {
        "known": "I want",
        "target": "quiero"
      },
      "practice_phrases": [
        {
          "known": "I want now",
          "target": "quiero ahora",
          "lego_count_used": 2
        },
        {
          "known": "I want to learn",
          "target": "quiero aprender",
          "lego_count_used": 3
        }
      ]
    }
  }
}
```

**Key fields:**
- Basket key: LEGO ID (e.g., "S0001L01")
- `practice_phrases`: Array of practice sentences
- `lego_count_used`: Number of LEGOs in phrase (optional, defaults to 1)

**Note:** Only LEGOs with `new: true` have baskets. Revisit LEGOs don't get practice phrases.

## Usage

### Dry Run (recommended first)
```bash
node database/import-course-registry.cjs spa_for_eng_v2 --dry-run
```

Output:
```
======================================================================
Import Course to Registry-Aligned Database
======================================================================
Course: spa_for_eng_v2
Mode: DRY RUN

Loading input files...
  ✓ Loaded lego_pairs.json
  ✓ Loaded lego_baskets.json

Source file analysis:
  Seeds: 10
  LEGOs: 25 (18 new, 7 revisits)
    A-type: 20
    M-type: 5
  LEGO Components: 12
  Practice Phrases: 180

DRY RUN - would insert these counts to database
Run without --dry-run to execute
```

### Live Import
```bash
node database/import-course-registry.cjs spa_for_eng_v2
```

Output:
```
======================================================================
Import Course to Registry-Aligned Database
======================================================================
Course: spa_for_eng_v2
Mode: LIVE

Loading input files...
  ✓ Loaded lego_pairs.json
  ✓ Loaded lego_baskets.json

Source file analysis:
  Seeds: 10
  LEGOs: 25 (18 new, 7 revisits)
    A-type: 20
    M-type: 5
  LEGO Components: 12
  Practice Phrases: 180

Checking course record...
  Creating course: spa_for_eng_v2 (eng → spa)
  ✓ Course created

Importing course content...
  Processed 10/10 seeds...

======================================================================
VALIDATION
======================================================================
  seeds: expected 10, got 10 ✓
  legos: expected 25, got 25 ✓
  lego_components: expected 12, got 12 ✓
  practice_phrases: expected 180, got 180 ✓

✓ IMPORT SUCCESSFUL - all counts match

Next steps:
  1. Review data in Supabase dashboard
  2. Update course voice configuration if needed
  3. Update status to "released" when ready
======================================================================
```

## Environment Setup

Add to `.env`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_your_key_here
```

Get these from:
1. Supabase Dashboard → Project Settings → API
2. Use the `service_role` key (has full access)

## Key Features

### 1. Idempotent Upserts
Uses `ON CONFLICT` to safely re-run imports:
- `course_seeds`: conflict on `(course_code, seed_number)`
- `course_legos`: conflict on `(course_code, seed_number, lego_index)`
- `course_practice_phrases`: conflict on `(course_code, seed_number, lego_index, position)`

### 2. Automatic Calculations
- **word_count**: Calculated from phrase text (whitespace split)
- **lego_count**: Read from `lego_count_used` field (defaults to 1)
- **position**: Array index in practice_phrases (0, 1, 2, ...)

### 3. Validation Gates
Compares expected vs actual insert counts:
- Seeds from lego_pairs.json
- LEGOs from lego_pairs.json
- Components from lego.components arrays
- Practice phrases from lego_baskets.json (new LEGOs only)

Exits with code 1 if counts don't match.

### 4. JSONB Components
M-type LEGOs store components as JSONB:
```sql
SELECT components FROM course_legos WHERE lego_id = 'S0001L02';
-- [{"known": "I", "target": "yo"}, {"known": "want", "target": "quiero"}]
```

No separate `lego_components` table needed.

## Runtime Phrase Type Classification

The schema does NOT store `phrase_type` - it's computed at runtime using a view:

```sql
SELECT * FROM course_practice_phrases_with_type
WHERE course_code = 'spa_for_eng_v2'
AND seed_number = 1
AND lego_index = 1;
```

View logic:
```sql
CASE
  WHEN position = 0 THEN 'component'
  WHEN position = 1 THEN 'lego'
  WHEN position BETWEEN 2 AND 7 THEN 'debut'
  ELSE 'eternal'
END AS phrase_type
```

## Querying Imported Data

### Get all seeds for a course
```sql
SELECT seed_id, known_text, target_text, status
FROM course_seeds
WHERE course_code = 'spa_for_eng_v2'
ORDER BY seed_number;
```

### Get LEGOs for a seed
```sql
SELECT lego_id, type, is_new, known_text, target_text, components
FROM course_legos
WHERE course_code = 'spa_for_eng_v2'
AND seed_number = 1
ORDER BY lego_index;
```

### Get practice phrases with runtime type
```sql
SELECT position, known_text, target_text, word_count, lego_count, phrase_type
FROM course_practice_phrases_with_type
WHERE course_code = 'spa_for_eng_v2'
AND seed_number = 1
AND lego_index = 1
ORDER BY position;
```

### Get course summary
```sql
SELECT * FROM course_summary
WHERE course_code = 'spa_for_eng_v2';
```

## Troubleshooting

### "SUPABASE_URL not set"
Add credentials to `.env` file (see Environment Setup above).

### "lego_pairs.json not found"
Check course directory exists: `public/vfs/courses/{course_code}/`

### "Count mismatch"
Validation failed - data may be incomplete. Check:
1. JSON files are valid and complete
2. No duplicate seed_id or lego_id values
3. All new LEGOs have baskets in lego_baskets.json

Re-import (script is idempotent):
```bash
node database/import-course-registry.cjs spa_for_eng_v2
```

### "Invalid seed_id format"
Seed IDs must match pattern: `S0001`, `S0002`, etc.

### "Invalid lego_id format"
LEGO IDs must match pattern: `S0001L01`, `S0001L02`, etc.

## Default Voice Configuration

The script creates courses with default Azure TTS voices:
- `known_voice`: en-US-JennyNeural
- `target_voice_1`: es-ES-AlvaroNeural
- `target_voice_2`: es-ES-ElviraNeural

Update via Supabase dashboard or SQL:
```sql
UPDATE courses
SET
  known_voice = 'en-US-AriaNeural',
  target_voice_1 = 'es-MX-DaliaNeural',
  target_voice_2 = 'es-MX-JorgeNeural'
WHERE course_code = 'spa_for_eng_v2';
```

## Comparison with Legacy Import

If migrating from the old schema, use this mapping:

| Legacy Table | Registry Table | Changes |
|-------------|----------------|---------|
| `seeds` | `course_seeds` | + `release_batch`, `version`, `updated_at` |
| `legos` | `course_legos` | + `components` JSONB (replaces `lego_components` table) |
| `basket_phrases` | `course_practice_phrases` | - `phrase_type` column, + `word_count`, `lego_count` |
| `lego_components` | N/A | Merged into `course_legos.components` JSONB |

## Next Steps After Import

1. **Review in Supabase Dashboard**
   - Check seed count, LEGO count, phrase count
   - Verify components stored correctly as JSONB

2. **Update Voice Configuration**
   - Use admin UI or SQL to set course-specific voices

3. **Set Release Status**
   ```sql
   UPDATE courses SET status = 'released'
   WHERE course_code = 'spa_for_eng_v2';

   UPDATE course_seeds SET status = 'released'
   WHERE course_code = 'spa_for_eng_v2';

   UPDATE course_legos SET status = 'released'
   WHERE course_code = 'spa_for_eng_v2';

   UPDATE course_practice_phrases SET status = 'released'
   WHERE course_code = 'spa_for_eng_v2';
   ```

4. **Configure Release Batches** (optional)
   ```sql
   UPDATE course_seeds
   SET release_batch = 1
   WHERE course_code = 'spa_for_eng_v2'
   AND seed_number BETWEEN 1 AND 100;
   ```

5. **Test Delta Sync**
   ```sql
   -- Get changes since last sync
   SELECT * FROM course_seeds
   WHERE course_code = 'spa_for_eng_v2'
   AND updated_at > '2025-12-13 10:00:00'
   ORDER BY updated_at;
   ```

## Related Files

- `database/migrations/002_registry_schema.sql` - Schema definition
- `database/import-course-v2.cjs` - Legacy import script
- `docs/setup/DATABASE_SETUP.md` - Database setup guide
- `apml/core/ssi-variable-registry.apml` - Registry specification

---

**Last Updated:** 2025-12-13
**Schema Version:** 002 (Registry-aligned)
**APML Version:** v11.0
