# Database Schema & JSON File Mappings

**Version**: APML v11.2.0
**Date**: 2025-12-12

This document defines the canonical data structures for SSi course production. It maps JSON file formats (used by phase servers and prompts) to the Supabase database schema.

---

## Overview

### Data Flow

```
Phase 1 (Translation)    → draft_lego_pairs.json → seeds + legos tables
Phase 2 (Conflict Res)   → lego_pairs.json      → is_new flags updated
Phase 3 (Baskets)        → lego_baskets.json    → basket_phrases + lego_components tables
```

### Tables

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `courses` | Course metadata | `course_code` |
| `seeds` | Seed phrases (sentences to learn) | `course_code, seed_number` |
| `legos` | LEGO pairs (teachable chunks) | `seed_id, lego_index` |
| `lego_components` | M-type LEGO components | `lego_id, position` |
| `basket_phrases` | Practice phrases for each LEGO | `lego_id, position` |

---

## Phase 1 Output: `draft_lego_pairs.json`

### JSON Structure

```json
{
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": {
        "known": "I want to speak Spanish with you now",
        "target": "Quiero hablar espa\u00f1ol contigo ahora"
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
            "known": "I'm trying",
            "target": "estoy intentando"
          },
          "components": [
            {"known": "I'm...", "target": "estoy"},
            {"known": "trying", "target": "intentando"}
          ]
        }
      ]
    }
  ]
}
```

### Field Mappings

#### Seed Entry → `seeds` table

| JSON Field | Database Column | Type | Notes |
|------------|-----------------|------|-------|
| `seed_id` | `seed_number` | INTEGER | Parsed from "S0001" → 1 |
| `seed_id` | `seed_id` | TEXT | Lowercase: "s0001" |
| `seed_pair.known` | `known_text` | TEXT | |
| `seed_pair.target` | `target_text` | TEXT | |
| `seed_pair.known` | `canonical` | TEXT | Default to known_text |
| (auto) | `position` | INTEGER | Auto-incremented per course |
| (auto) | `is_active` | BOOLEAN | Default: true |
| (param) | `course_code` | TEXT | From API parameter |

#### LEGO Entry → `legos` table

| JSON Field | Database Column | Type | Notes |
|------------|-----------------|------|-------|
| `id` | `lego_id` | TEXT | Original ID: "S0001L01" |
| (parsed) | `lego_index` | INTEGER | Parsed from "S0001L01" → 1 |
| `type` | `type` | TEXT | "A" or "M" |
| `new` | `is_new` | BOOLEAN | Default: true |
| `lego.known` | `known_text` | TEXT | |
| `lego.target` | `target_text` | TEXT | |
| (auto) | `position` | INTEGER | Same as lego_index |
| (FK) | `seed_id` | UUID | Foreign key to seeds.id |

#### Component Entry → `lego_components` table

| JSON Field | Database Column | Type | Notes |
|------------|-----------------|------|-------|
| `components[n].known` | `known_text` | TEXT | |
| `components[n].target` | `target_text` | TEXT | |
| (array index) | `position` | INTEGER | 1-indexed |
| (FK) | `lego_id` | UUID | Foreign key to legos.id |

---

## Phase 2 Output: `lego_pairs.json`

Same structure as `draft_lego_pairs.json` but with `new` flags updated based on cross-seed conflict resolution.

**Database impact**: Only `legos.is_new` is updated.

---

## Phase 3 Output: `lego_baskets.json`

### JSON Structure

```json
{
  "courseCode": "spa_for_eng",
  "baskets": {
    "S0010L01": {
      "lego": {
        "known": "I'm not sure",
        "target": "no estoy seguro"
      },
      "practice_phrases": [
        {"known": "I'm not sure now", "target": "no estoy seguro ahora"},
        {"known": "I'm not sure how to explain", "target": "no estoy seguro c\u00f3mo explicar"}
      ],
      "is_final_lego": false,
      "phrase_count": 10,
      "components": [
        {"known": "sure", "target": "seguro"}
      ]
    }
  }
}
```

### Field Mappings

#### Basket Entry → `basket_phrases` table

| JSON Field | Database Column | Type | Notes |
|------------|-----------------|------|-------|
| `practice_phrases[n].known` | `known_text` | TEXT | |
| `practice_phrases[n].target` | `target_text` | TEXT | |
| (array index) | `position` | INTEGER | 1-indexed |
| (inferred) | `phrase_type` | TEXT | "practice", "debut", or "component" |
| (inferred) | `is_debut` | BOOLEAN | True if phrase == lego text |
| (inferred) | `is_component` | BOOLEAN | True if from components array |
| (FK) | `lego_id` | UUID | Foreign key to legos.id |

#### Components → `lego_components` table

Components in baskets update the same `lego_components` table (upsert).

---

## Database Schema (Supabase)

### `courses` table

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT UNIQUE NOT NULL,
  known_lang TEXT,
  target_lang TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `seeds` table

```sql
CREATE TABLE seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL REFERENCES courses(course_code),
  seed_number INTEGER NOT NULL,
  seed_id TEXT,  -- "s0001" format
  known_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  canonical TEXT,
  position INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(course_code, seed_number)
);
```

### `legos` table

```sql
CREATE TABLE legos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id UUID NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
  lego_index INTEGER NOT NULL,
  lego_id TEXT,  -- "S0001L01" format
  known_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  type TEXT DEFAULT 'A' CHECK (type IN ('A', 'M')),
  is_new BOOLEAN DEFAULT TRUE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(seed_id, lego_index)
);
```

### `lego_components` table

```sql
CREATE TABLE lego_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lego_id UUID NOT NULL REFERENCES legos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  known_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lego_id, position)
);
```

### `basket_phrases` table

```sql
CREATE TABLE basket_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lego_id UUID NOT NULL REFERENCES legos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  known_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  phrase_type TEXT DEFAULT 'practice' CHECK (phrase_type IN ('component', 'debut', 'practice')),
  is_debut BOOLEAN DEFAULT FALSE,
  is_component BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lego_id, position)
);
```

---

## Import Functions

### `importSeedWithLegos(courseCode, seedData)`

From `course-data-service.cjs`:

```javascript
// Expected input format (from Phase 1 output):
{
  seed_number: 1,  // or seed_id: "S0001"
  seed_pair: { known: "...", target: "..." },
  legos: [
    {
      id: "S0001L01",
      type: "A",
      new: true,
      lego: { known: "...", target: "..." },
      components: [...]  // Optional, for M-types
    }
  ]
}
```

### `importBasket(courseCode, legoId, basketData)`

From `course-data-service.cjs`:

```javascript
// Expected input format (from Phase 3 output):
{
  lego: { known: "...", target: "..." },
  practice_phrases: [
    { known: "...", target: "..." }
  ],
  components: [
    { known: "...", target: "..." }
  ]
}
```

---

## API Endpoints

### Production API (port 3470)

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/api/production/:courseCode/seeds` | GET | Seeds with nested legos and basket_phrases |
| `/api/production/:courseCode/legos` | GET | Flat list of legos |
| `/api/production/:courseCode/progress` | GET | Course statistics |
| `/api/production/:courseCode/lego/:legoId/basket` | GET | Basket for specific LEGO |

### Response Format: `/seeds`

```json
{
  "courseCode": "spa_for_eng_v2",
  "count": 30,
  "seeds": [
    {
      "id": "uuid",
      "course_code": "spa_for_eng_v2",
      "seed_number": 1,
      "seed_id": "s0001",
      "known_text": "I want to speak Spanish with you now",
      "target_text": "Quiero hablar espa\u00f1ol contigo ahora",
      "canonical": "I want to speak Spanish with you now",
      "position": 1,
      "is_active": true,
      "legos": [
        {
          "id": "uuid",
          "lego_id": "S0001L05",
          "type": "A",
          "is_new": true,
          "known_text": "now",
          "target_text": "ahora",
          "position": 5,
          "basket_phrases": [
            {
              "id": "uuid",
              "known_text": "now",
              "target_text": "ahora",
              "phrase_type": "practice",
              "is_debut": false,
              "is_component": false,
              "position": 1
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Field Naming Conventions

### JSON Files (snake_case with objects)

- `seed_id`, `seed_pair`, `lego`, `practice_phrases`
- Nested objects: `{known: "...", target: "..."}`

### Database (snake_case flat)

- `seed_id`, `known_text`, `target_text`
- No nested objects, everything flat

### Dashboard (camelCase where needed)

The `api.js` transforms database format to dashboard format as needed.

---

## Version History

| Version | Changes |
|---------|---------|
| v11.2.0 | Database-first architecture, this schema document |
| v11.0.0 | Initial database integration |
