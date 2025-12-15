# Quick Start: Registry Import

Fast track to importing course content to the new registry-aligned database.

## Prerequisites

1. **Supabase setup** with migration 002 applied
2. **Environment variables** configured
3. **Input files** ready

## 3-Step Import

### Step 1: Configure Environment

Add to `.env`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_your_key_here
```

### Step 2: Dry Run

```bash
node database/import-course-registry.cjs spa_for_eng_v2 --dry-run
```

Expected output:
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

### Step 3: Live Import

```bash
node database/import-course-registry.cjs spa_for_eng_v2
```

Expected output:
```
======================================================================
Import Course to Registry-Aligned Database
======================================================================
Course: spa_for_eng_v2
Mode: LIVE

[... loading and analysis ...]

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

## Verify Import

### In Supabase Dashboard

Navigate to: **Table Editor** → `courses`

You should see:
- `spa_for_eng_v2` course record
- Seeds in `course_seeds` table
- LEGOs in `course_legos` table
- Practice phrases in `course_practice_phrases` table

### Via SQL

```sql
-- Get course summary
SELECT * FROM course_summary
WHERE course_code = 'spa_for_eng_v2';

-- Get first seed with LEGOs
SELECT * FROM seed_with_legos
WHERE course_code = 'spa_for_eng_v2'
AND seed_number = 1;

-- Get practice phrases with types
SELECT position, known_text, phrase_type
FROM course_practice_phrases_with_type
WHERE course_code = 'spa_for_eng_v2'
AND seed_number = 1
AND lego_index = 1
ORDER BY position;
```

## Troubleshooting

### Error: "SUPABASE_URL not set"
→ Add credentials to `.env` file

### Error: "lego_pairs.json not found"
→ Check files exist in `public/vfs/courses/spa_for_eng_v2/`

### Error: "Count mismatch"
→ JSON files may be incomplete. Check validation output.

### Re-import (Safe)
The script is idempotent - just re-run:
```bash
node database/import-course-registry.cjs spa_for_eng_v2
```

## What Gets Imported?

### From `lego_pairs.json`
✅ Seeds → `course_seeds`
✅ LEGOs → `course_legos`
✅ M-type components → `course_legos.components` (JSONB)

### From `lego_baskets.json`
✅ Practice phrases → `course_practice_phrases` (new LEGOs only)

### Calculated Fields
✅ `word_count` - Whitespace split of known_text
✅ `lego_count` - From `lego_count_used` field (default: 1)
✅ `position` - Array index (0, 1, 2, ...)

### Default Values
✅ `status` - 'draft'
✅ `version` - 1
✅ `release_batch` - null

## Post-Import Tasks

### 1. Update Voice Configuration

```sql
UPDATE courses
SET
  known_voice = 'en-US-AriaNeural',
  target_voice_1 = 'es-MX-DaliaNeural',
  target_voice_2 = 'es-MX-JorgeNeural'
WHERE course_code = 'spa_for_eng_v2';
```

### 2. Set Release Batches (Optional)

```sql
-- Batch 1: Seeds 1-100
UPDATE course_seeds
SET release_batch = 1
WHERE course_code = 'spa_for_eng_v2'
AND seed_number BETWEEN 1 AND 100;

-- Batch 2: Seeds 101-200
UPDATE course_seeds
SET release_batch = 2
WHERE course_code = 'spa_for_eng_v2'
AND seed_number BETWEEN 101 AND 200;
```

### 3. Release Content

```sql
-- Release all
UPDATE courses SET status = 'released'
WHERE course_code = 'spa_for_eng_v2';

UPDATE course_seeds SET status = 'released'
WHERE course_code = 'spa_for_eng_v2';

UPDATE course_legos SET status = 'released'
WHERE course_code = 'spa_for_eng_v2';

UPDATE course_practice_phrases SET status = 'released'
WHERE course_code = 'spa_for_eng_v2';
```

Or release by batch:
```sql
-- Release batch 1 only
UPDATE course_seeds SET status = 'released'
WHERE course_code = 'spa_for_eng_v2'
AND release_batch = 1;

UPDATE course_legos SET status = 'released'
WHERE course_code = 'spa_for_eng_v2'
AND seed_number IN (
    SELECT seed_number FROM course_seeds
    WHERE release_batch = 1
);
```

## Next Steps

### For Development
- Review data structure in Supabase
- Test delta sync queries
- Build manifest compilation from database

### For Production
- Update voice configuration
- Set release batches
- Change status to 'released'
- Enable delta sync in learning app

## Key Differences from Legacy

| Legacy | Registry |
|--------|----------|
| Integer IDs | UUIDs |
| `seeds` table | `course_seeds` table |
| `legos` table | `course_legos` table |
| `basket_phrases` table | `course_practice_phrases` table |
| `lego_components` table | JSONB `components` field |
| `phrase_type` column | Computed at runtime |
| No versioning | `version` + `updated_at` |
| No release batches | `release_batch` column |

## Learn More

- **Detailed Guide:** `database/README_IMPORT_REGISTRY.md`
- **Script Comparison:** `database/IMPORT_COMPARISON.md`
- **Example Queries:** `database/EXAMPLE_QUERIES.sql`
- **Schema:** `database/migrations/002_registry_schema.sql`

---

**You're ready!** Run the dry run, check the output, then run live import. ✅
