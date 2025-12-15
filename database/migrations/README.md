# SSi Database Migrations

**Source of Truth**: `/Users/tomcassidy/SSi/ssi-learning-app/apml/core/ssi-variable-registry.apml`

## Migration Files

### 001_clean_slate.sql
**Purpose**: Drop old course content tables and prepare for registry-based schema

**Drops**:
- `basket_phrases`, `lego_components`, `legos`, `seeds`, `courses`
- Supporting tables: `course_encouragements`, `encouragements`, `presentation_templates`
- Views: `course_summary`, `seed_with_legos`
- Functions: `generate_node_id()`, `update_updated_at()`

**Preserves** (course-agnostic, reusable):
- `audio_samples` - Reusable audio registry
- `voices` - TTS and human voice registry
- `sample_flags` - QA workflow flags
- `recording_provenance` - Human recording metadata
- `course_audio_usage` - Audio usage tracking

### 002_registry_schema.sql
**Purpose**: Create new database schema based on Variable Registry v1.0.0

**Creates**:
- **Enums**: `content_status` (draft|released|deprecated), `lego_type` (A|M)
- **Tables**: `courses`, `course_seeds`, `course_legos`, `course_practice_phrases`
- **Triggers**: Auto-increment `version` on UPDATE
- **Views**: `course_practice_phrases_with_type`, `course_summary`, `seed_with_legos`

## Key Architectural Decisions

### 1. NO phrase_type Column
**Old Schema**: Stored `phrase_type` enum (component|debut|practice)
**New Schema**: Stores `word_count` + `lego_count` + `position` instead

**Runtime Classification**:
```sql
CASE
  WHEN position = 0 THEN 'component'
  WHEN position = 1 THEN 'lego'
  WHEN position BETWEEN 2 AND 7 THEN 'debut'
  ELSE 'eternal'
END AS phrase_type
```

### 2. Version Tracking
Every UPDATE automatically increments `version` and updates `updated_at`:
```sql
-- Before update: version = 1, updated_at = '2025-12-13 10:00:00'
UPDATE course_seeds SET known_text = 'New text' WHERE id = '...';
-- After update: version = 2, updated_at = '2025-12-13 10:05:00'
```

Enables delta sync:
```sql
-- Client tracks last_sync_time
SELECT * FROM course_seeds
WHERE course_code = 'spa_for_eng'
AND updated_at > :last_sync_time;
```

### 3. Staged Rollout
`release_batch` field allows gradual content releases:
```sql
-- Release batch 1 (seeds 1-100)
UPDATE course_seeds SET release_batch = 1, status = 'released'
WHERE seed_number BETWEEN 1 AND 100;

-- Users can access up to their batch level
SELECT * FROM course_seeds
WHERE release_batch <= :user_access_level;
```

### 4. Denormalization for Performance
Child tables store `course_code`, `seed_number`, `lego_index`:
```sql
-- Fast filtering without joins
SELECT * FROM course_practice_phrases
WHERE course_code = 'spa_for_eng'
AND seed_number = 42;
```

## Schema Comparison

| Aspect | Old Schema | New Schema |
|--------|-----------|------------|
| **Table Names** | `seeds`, `legos`, `basket_phrases` | `course_seeds`, `course_legos`, `course_practice_phrases` |
| **Phrase Classification** | `phrase_type TEXT` stored | `word_count INT`, `lego_count INT` stored → `phrase_type` computed |
| **Unique Keys** | `(course_code, seed_number)` | Same pattern |
| **Version Tracking** | `updated_at` only | `version INT` + `updated_at` with auto-increment |
| **Release Management** | Not present | `release_batch INT` for staged rollout |
| **Position Tracking** | Various `position` fields | Consistent `position INT` |
| **LEGO Components** | Separate `lego_components` table | `components JSONB` in `course_legos` |
| **Status Enum** | Not standardized | `content_status` enum (draft|released|deprecated) |

## Usage Examples

### Initial Course Load
```sql
SELECT * FROM course_seeds
WHERE course_code = 'spa_for_eng'
AND status = 'released'
ORDER BY seed_number;
```

### Delta Sync (Get Changes Since Last Sync)
```sql
SELECT * FROM course_seeds
WHERE course_code = 'spa_for_eng'
AND status = 'released'
AND updated_at > '2025-12-13 10:00:00'
ORDER BY updated_at;
```

### Get Practice Phrases with Runtime phrase_type
```sql
-- Option 1: Use the view
SELECT * FROM course_practice_phrases_with_type
WHERE course_code = 'spa_for_eng'
AND seed_number = 1
AND lego_index = 1;

-- Option 2: Compute inline
SELECT *,
  CASE
    WHEN position = 0 THEN 'component'
    WHEN position = 1 THEN 'lego'
    WHEN position BETWEEN 2 AND 7 THEN 'debut'
    ELSE 'eternal'
  END AS phrase_type
FROM course_practice_phrases
WHERE course_code = 'spa_for_eng'
AND seed_number = 1
AND lego_index = 1;
```

### Get M-type LEGO Components
```sql
-- Components stored as JSONB array
SELECT
  lego_id,
  known_text,
  target_text,
  components
FROM course_legos
WHERE type = 'M'
AND course_code = 'spa_for_eng'
AND seed_number = 1;

-- Example result:
-- lego_id: "S0001L01"
-- known_text: "I want"
-- target_text: "quiero"
-- components: [{"known": "I", "target": "yo"}, {"known": "want", "target": "quiero"}]
```

### Course Summary Statistics
```sql
SELECT * FROM course_summary
WHERE course_code = 'spa_for_eng';

-- Returns:
-- course_code, known_lang, target_lang, display_name, status
-- seed_count, lego_count, new_lego_count, phrase_count
-- last_seed_update, last_lego_update, last_phrase_update
```

## Execution Instructions

### Running Migrations (Supabase CLI)
```bash
# 1. Ensure you're in the project directory
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean

# 2. Run migrations in order
supabase db reset  # If starting fresh
# OR
psql -h <host> -U postgres -d postgres -f database/migrations/001_clean_slate.sql
psql -h <host> -U postgres -d postgres -f database/migrations/002_registry_schema.sql
```

### Running Migrations (Supabase Dashboard)
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `001_clean_slate.sql` and run
3. Verify tables are dropped (check Tables section)
4. Copy contents of `002_registry_schema.sql` and run
5. Verify new tables are created
6. Check that triggers are active (Database → Triggers)

## Validation Checklist

After running migrations, verify:

- [ ] Enums created: `content_status`, `lego_type`
- [ ] `phrase_type` enum NOT created (runtime only)
- [ ] Tables created: `courses`, `course_seeds`, `course_legos`, `course_practice_phrases`
- [ ] All tables have `version` and `updated_at` columns
- [ ] All content tables have `release_batch` column
- [ ] Triggers active: `increment_version()` on all content tables
- [ ] Indexes exist for delta sync: `(course_code, updated_at)`
- [ ] Foreign keys cascade on DELETE
- [ ] Unique constraints match Variable Registry
- [ ] `course_practice_phrases` has NO `phrase_type` column
- [ ] `course_practice_phrases` has `word_count` and `lego_count` columns
- [ ] Views created: `course_practice_phrases_with_type`, `course_summary`, `seed_with_legos`

## Next Steps

1. **Import Course Data**: Use import scripts to populate tables from existing JSON/manifest
2. **Test Delta Sync**: Make changes and verify version increments
3. **Test Runtime Classification**: Query `course_practice_phrases_with_type` view
4. **Update App Code**: Adapt queries to new table names and computed `phrase_type`

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| 001 | 2025-12-13 | Clean slate - drop old tables |
| 002 | 2025-12-13 | Registry-based schema with version tracking |

---

**Generated**: 2025-12-13
**Variable Registry Version**: 1.0.0
