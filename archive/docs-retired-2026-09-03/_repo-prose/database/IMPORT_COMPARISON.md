# Import Script Comparison Guide

Quick reference for choosing between legacy and registry-aligned import scripts.

## Which Script Should I Use?

### Use `import-course-registry.cjs` (NEW) when:
- ✅ Starting fresh with new database schema (migration 002)
- ✅ Need delta sync support (version tracking)
- ✅ Want staged rollout (release_batch)
- ✅ Building for database-first architecture
- ✅ Need JSONB components (simpler schema)
- ✅ Runtime phrase_type classification preferred

### Use `import-course-v2.cjs` (LEGACY) when:
- ⚠️ Working with existing legacy database
- ⚠️ Need backward compatibility
- ⚠️ Separate lego_components table required
- ⚠️ Stored phrase_type column required

## Side-by-Side Comparison

| Feature | Legacy (`import-course-v2.cjs`) | Registry (`import-course-registry.cjs`) |
|---------|--------------------------------|----------------------------------------|
| **Target Schema** | Migration 001 | Migration 002 (registry-aligned) |
| **Primary Keys** | Integer IDs | UUIDs (gen_random_uuid) |
| **Table Names** | `seeds`, `legos`, `basket_phrases`, `lego_components` | `course_seeds`, `course_legos`, `course_practice_phrases` |
| **Components** | Separate table `lego_components` | JSONB field `components` in `course_legos` |
| **Phrase Type** | Stored in `phrase_type` column | Computed at runtime (view) |
| **Versioning** | None | `version` + `updated_at` fields |
| **Delta Sync** | Not supported | Supported via `updated_at` |
| **Release Management** | None | `release_batch` for staged rollout |
| **Status Tracking** | None | `status` enum (draft/released/deprecated) |
| **Foreign Keys** | `seed_id` → `seeds.id` | Denormalized `course_code`, `seed_number` |
| **Generated Columns** | Manual `lego_id` field | Auto-generated `seed_id`, `lego_id` |

## Input Files (Same for Both)

Both scripts read from `public/vfs/courses/{course_code}/`:
- ✅ `lego_pairs.json` - LEGO definitions
- ✅ `lego_baskets.json` - Practice phrases

## Command Line Usage

### Legacy
```bash
node database/import-course-v2.cjs spa_for_eng_v2 [--dry-run]
```

### Registry
```bash
node database/import-course-registry.cjs spa_for_eng_v2 [--dry-run]
```

## Output Schema Comparison

### Legacy Schema (Migration 001)

```sql
-- seeds table
CREATE TABLE seeds (
    id INTEGER PRIMARY KEY,
    course_code TEXT,
    seed_number INTEGER,
    known_text TEXT,
    target_text TEXT,
    canonical TEXT,
    position INTEGER
);

-- legos table
CREATE TABLE legos (
    id INTEGER PRIMARY KEY,
    seed_id INTEGER REFERENCES seeds(id),
    lego_index INTEGER,
    lego_id TEXT,
    known_text TEXT,
    target_text TEXT,
    type TEXT,
    is_new BOOLEAN,
    position INTEGER
);

-- lego_components table (SEPARATE)
CREATE TABLE lego_components (
    id INTEGER PRIMARY KEY,
    lego_id INTEGER REFERENCES legos(id),
    position INTEGER,
    known_text TEXT,
    target_text TEXT
);

-- basket_phrases table
CREATE TABLE basket_phrases (
    id INTEGER PRIMARY KEY,
    lego_id INTEGER REFERENCES legos(id),
    known_text TEXT,
    target_text TEXT,
    phrase_type TEXT,  -- STORED: 'component', 'lego', 'debut', 'eternal'
    position INTEGER,
    is_debut BOOLEAN,
    is_component BOOLEAN
);
```

### Registry Schema (Migration 002)

```sql
-- courses table
CREATE TABLE courses (
    course_code TEXT PRIMARY KEY,
    known_lang TEXT,
    target_lang TEXT,
    display_name TEXT,
    known_voice TEXT,
    target_voice_1 TEXT,
    target_voice_2 TEXT,
    status content_status DEFAULT 'draft',
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- course_seeds table
CREATE TABLE course_seeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code TEXT REFERENCES courses(course_code),
    seed_number INTEGER,
    seed_id TEXT GENERATED,  -- 'S0001'
    known_text TEXT,
    target_text TEXT,
    status content_status DEFAULT 'draft',
    release_batch INTEGER,
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ,
    UNIQUE(course_code, seed_number)
);

-- course_legos table
CREATE TABLE course_legos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code TEXT REFERENCES courses(course_code),
    seed_number INTEGER,
    lego_index INTEGER,
    lego_id TEXT GENERATED,  -- 'S0001L01'
    type lego_type,  -- 'A' | 'M'
    is_new BOOLEAN,
    known_text TEXT,
    target_text TEXT,
    components JSONB,  -- M-type components (JSONB instead of separate table)
    status content_status DEFAULT 'draft',
    release_batch INTEGER,
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ,
    UNIQUE(course_code, seed_number, lego_index)
);

-- course_practice_phrases table
CREATE TABLE course_practice_phrases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code TEXT REFERENCES courses(course_code),
    seed_number INTEGER,
    lego_index INTEGER,
    position INTEGER,
    known_text TEXT,
    target_text TEXT,
    word_count INTEGER,  -- For runtime phrase_type
    lego_count INTEGER,  -- For runtime phrase_type
    -- NO phrase_type column (computed at runtime)
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    register TEXT CHECK (register IN ('casual', 'formal')),
    metadata JSONB DEFAULT '{}',
    status content_status DEFAULT 'draft',
    release_batch INTEGER,
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ,
    UNIQUE(course_code, seed_number, lego_index, position)
);
```

## Key Architectural Differences

### 1. Components Storage

**Legacy:** Separate `lego_components` table
```sql
-- Insert component
INSERT INTO lego_components (lego_id, position, known_text, target_text)
VALUES (123, 1, 'I', 'yo');

-- Query components
SELECT * FROM lego_components WHERE lego_id = 123;
```

**Registry:** JSONB field
```sql
-- Insert LEGO with components
INSERT INTO course_legos (course_code, seed_number, lego_index, ..., components)
VALUES ('spa_for_eng_v2', 1, 1, ..., '[{"known": "I", "target": "yo"}]'::jsonb);

-- Query components
SELECT components FROM course_legos WHERE lego_id = 'S0001L01';
```

### 2. Phrase Type Classification

**Legacy:** Stored column
```sql
INSERT INTO basket_phrases (..., phrase_type)
VALUES (..., 'debut');

SELECT * FROM basket_phrases WHERE phrase_type = 'debut';
```

**Registry:** Computed at runtime
```sql
-- Computed via view
SELECT *,
  CASE
    WHEN position = 0 THEN 'component'
    WHEN position = 1 THEN 'lego'
    WHEN position BETWEEN 2 AND 7 THEN 'debut'
    ELSE 'eternal'
  END AS phrase_type
FROM course_practice_phrases;

-- Use the view
SELECT * FROM course_practice_phrases_with_type
WHERE phrase_type = 'debut';
```

### 3. Versioning & Delta Sync

**Legacy:** Not supported
```sql
-- No version tracking
-- Full re-sync required
```

**Registry:** Built-in version tracking
```sql
-- Initial sync
SELECT * FROM course_seeds
WHERE course_code = 'spa_for_eng_v2'
AND status = 'released';

-- Delta sync (changes since last sync)
SELECT * FROM course_seeds
WHERE course_code = 'spa_for_eng_v2'
AND status = 'released'
AND updated_at > '2025-12-13 10:00:00';

-- Version increments automatically on UPDATE
UPDATE course_seeds SET known_text = 'Updated text'
WHERE course_code = 'spa_for_eng_v2' AND seed_number = 1;
-- version auto-increments from 1 to 2
```

### 4. Release Management

**Legacy:** All-or-nothing
```sql
-- No staged rollout
-- All content released at once
```

**Registry:** Batch-based rollout
```sql
-- Set release batches
UPDATE course_seeds
SET release_batch = 1
WHERE course_code = 'spa_for_eng_v2'
AND seed_number BETWEEN 1 AND 100;

UPDATE course_seeds
SET release_batch = 2
WHERE course_code = 'spa_for_eng_v2'
AND seed_number BETWEEN 101 AND 200;

-- Release batch 1
UPDATE course_seeds
SET status = 'released'
WHERE release_batch = 1;

-- Later: Release batch 2
UPDATE course_seeds
SET status = 'released'
WHERE release_batch = 2;
```

## Migration Path

If you have data in the legacy schema and want to migrate:

### Option 1: Re-import from JSON
```bash
# Import to registry schema
node database/import-course-registry.cjs spa_for_eng_v2
```

### Option 2: SQL Migration (TODO)
```sql
-- Create migration script to transform:
-- seeds → course_seeds
-- legos → course_legos (merge lego_components into JSONB)
-- basket_phrases → course_practice_phrases (compute word_count/lego_count)
```

## Validation Output Comparison

Both scripts validate counts, but registry script validates different metrics:

### Legacy Validation
```
VALIDATION
  seeds: expected 10, got 10 ✓
  legos: expected 25, got 25 ✓
  lego_components: expected 12, got 12 ✓
  basket_phrases: expected 180, got 180 ✓
```

### Registry Validation
```
VALIDATION
  seeds: expected 10, got 10 ✓
  legos: expected 25, got 25 ✓
  lego_components: expected 12, got 12 ✓
  practice_phrases: expected 180, got 180 ✓
```

Same validation logic, different table names.

## Performance Considerations

### Legacy Schema
- ✅ Simple queries (normalized tables)
- ❌ Joins required for components
- ❌ Integer IDs (less scalable)
- ❌ No indexes for sync

### Registry Schema
- ✅ JSONB components (fewer joins)
- ✅ UUIDs (globally unique, distributed-friendly)
- ✅ Indexes for delta sync (`updated_at`)
- ✅ Denormalized for performance
- ⚠️ JSONB queries need proper indexing

## Recommended Migration Timeline

1. **Phase 1 (Current)**: Dual-track
   - Keep legacy import for existing data
   - Use registry import for new courses
   - Test registry schema in parallel

2. **Phase 2**: Transition
   - Migrate existing courses to registry
   - Update learning app to read from registry
   - Keep legacy for rollback

3. **Phase 3**: Deprecate
   - Remove legacy import script
   - Remove legacy schema
   - Full registry-first architecture

## Quick Decision Tree

```
Do you have existing data in legacy schema?
├─ Yes → Use import-course-v2.cjs (or migrate)
└─ No → Use import-course-registry.cjs ✅

Do you need delta sync?
├─ Yes → Use import-course-registry.cjs ✅
└─ No → Either works

Do you need staged rollout?
├─ Yes → Use import-course-registry.cjs ✅
└─ No → Either works

Do you prefer normalized schema?
├─ Yes → Use import-course-v2.cjs
└─ No → Use import-course-registry.cjs ✅

Do you need version tracking?
├─ Yes → Use import-course-registry.cjs ✅
└─ No → Either works
```

## Related Documentation

- `database/README_IMPORT_REGISTRY.md` - Registry import detailed guide
- `database/migrations/001_legacy_schema.sql` - Legacy schema
- `database/migrations/002_registry_schema.sql` - Registry schema
- `apml/core/ssi-variable-registry.apml` - Registry specification

---

**Recommendation:** Use `import-course-registry.cjs` for all new work. It's the future-proof choice with better versioning, sync, and release management.

**Last Updated:** 2025-12-13
