# Complete SSi Pipeline Reference (Phases 1-7)

## Pipeline Overview

| Phase | Purpose | Input | Output | File Size | Agent Intelligence Doc |
|-------|---------|-------|--------|-----------|------------------------|
| **1** | Translation | `canonical_seeds.txt` | `seed_pairs.json` | ~500KB | [phase_1_seed_pairs.md](public/docs/phase_intelligence/phase_1_seed_pairs.md) |
| **2** | FD Collision Check | `seed_pairs.json` | `*_phase2_report.json` | ~10KB | [phase_2_collision_check.cjs](public/docs/phase_intelligence/phase_2_collision_check.cjs) |
| **3** | LEGO Extraction | `seed_pairs.json` | `lego_pairs.json` | ~2MB | [phase_3_lego_pairs_v7.md](public/docs/phase_intelligence/phase_3_lego_pairs_v7.md) |
| **4** | LEGO FD Check | `lego_pairs.json` | `*_fd_report.json` | ~50KB | Validation scripts |
| **5** | Basket Generation | `lego_pairs.json` | `lego_baskets.json` | ~5MB | [phase_5_lego_baskets.md](public/docs/phase_intelligence/phase_5_lego_baskets.md) |
| **6** | Introductions | `lego_baskets.json` | `introductions.json` | ~500KB | [phase_6_introductions.md](public/docs/phase_intelligence/phase_6_introductions.md) |
| **7** | Compilation | All phase outputs | `compiled.json` | ~8MB | [phase_7_compilation.md](public/docs/phase_intelligence/phase_7_compilation.md) |
| **8** | Audio/TTS | `lego_baskets.json` | Audio files + manifest | Variable | [phase_8_audio_generation.md](public/docs/phase_intelligence/phase_8_audio_generation.md) |

## Phase Intelligence Documents

The **Phase Intelligence** documents are the core instructions that guide Claude Code agents through each phase. These are living documents that define the methodology, rules, and quality standards for each phase.

**Location:** `public/docs/phase_intelligence/`

**Dashboard Access:** https://ssi-dashboard-v7.vercel.app/phase-intelligence/{phase_number}

| Document | Purpose | Agent Type | URL |
|----------|---------|------------|-----|
| `phase_1_orchestrator.md` | Orchestrator for Phase 1 | Master agent | Spawns translation workers |
| `phase_1_seed_pairs.md` | Translation methodology | Sub-agent | Translates English → Spanish |
| `phase_3_orchestrator.md` | Orchestrator for Phase 3 | Master agent | Spawns LEGO extraction workers |
| `phase_3_lego_pairs_v7.md` | LEGO extraction rules | Sub-agent | Extracts atomic (A) and molecular (M) LEGOs |
| `phase_5_orchestrator.md` | Orchestrator for Phase 5 | Master agent | Spawns basket generation workers |
| `phase_5_lego_baskets.md` | Basket generation methodology | Sub-agent | Generates 10 practice phrases per LEGO |
| `phase_5.5_basket_deduplication.md` | Deduplication rules | Post-processing | Removes duplicate phrases |
| `phase_5.5_grammar_review.md` | Grammar validation | Post-processing | Reviews phrase quality |
| `phase_6_introductions.md` | Introduction content generation | Agent | Creates teaching content |
| `phase_7_compilation.md` | App compilation rules | Agent | Assembles final format |
| `phase_8_audio_generation.md` | TTS generation | Agent | Produces audio files |

---

## Phase 1: Translation

**Agent Intelligence:** [phase_1_seed_pairs.md](public/docs/phase_intelligence/phase_1_seed_pairs.md)
**Orchestrator Prompt:** [phase_1_orchestrator.md](public/docs/phase_intelligence/phase_1_orchestrator.md)
**Dashboard Guide:** https://ssi-dashboard-v7.vercel.app/phase-intelligence/1

### What Agents Actually Do

**Orchestrator (Master Agent):**
- Reads orchestrator intelligence from `phase_1_orchestrator.md`
- Spawns N sub-agents in parallel (e.g., 10 agents)
- Each sub-agent gets assigned a seed range (e.g., S0001-S0010)
- Monitors completion and reports status

**Sub-Agent (Translation Worker):**
- Reads agent intelligence from `phase_1_seed_pairs.md`
- Follows translation methodology:
  - Natural, conversational Spanish
  - Equivalent meaning to English
  - Appropriate register (formal/informal)
  - Cultural adaptation where needed
- Self-validates translation quality
- Creates git branch and pushes result

### Step-by-Step Process

| Step | Function | Input | Output | Description |
|------|----------|-------|--------|-------------|
| 1.1 | User triggers | Dashboard UI | POST `/phase/1/start` | User clicks "Start Phase 1" |
| 1.2 | Orchestrator receives | `courseCode`, `totalSeeds` | Job state created | Initializes course state |
| 1.3 | Orchestrator forwards | Course params | POST `http://localhost:3457/start` | Triggers Phase 1 server |
| 1.4 | Phase 1 reads canonical | `canonical_seeds.txt` | Array of English seeds | Loads source sentences |
| 1.5 | Phase 1 spawns browsers | Config: `browsers`, `agents_per_browser` | N browser windows | Opens Claude Code sessions |
| 1.6 | **Master agent reads prompt** | `phase_1_orchestrator.md` | Understanding of task | **Agent receives orchestrator intelligence** |
| 1.7 | Master agent spawns workers | Seed range (e.g., S0001-S0010) | Task tool × 10 | Parallel sub-agents |
| 1.8 | **Sub-agent reads prompt** | `phase_1_seed_pairs.md` | Translation methodology | **Agent receives phase intelligence** |
| 1.9 | Sub-agent translates | English seed | Spanish translation | Follows intelligence doc rules |
| 1.10 | Sub-agent pushes | Translation JSON | Branch: `claude/translation-*` | Git branch per agent |
| 1.11 | Branch watcher detects | Pattern: `claude/translation-*` | Merge triggered | Waits for all branches |
| 1.12 | Watcher merges | All translation branches | `seed_pairs.json` | Combines all seeds |
| 1.13 | Watcher pushes to main | `seed_pairs.json` | Committed to `main` | Single file on main |
| 1.14 | Watcher deletes branches | All `claude/translation-*` | Branches removed | Cleanup |
| 1.15 | Phase 1 notifies orchestrator | Status: `complete` | POST `/phase-complete` | Phase done |

### File Structure

**Input:**
```
public/vfs/courses/spa_for_eng/
└── canonical_seeds.txt           (50KB, 668 seeds)
```

**Output:**
```json
{
  "version": "curated_v7_spanish",
  "course_id": "spa_for_eng",
  "total_seeds": 668,
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": ["Hello", "Hola"]
    },
    {
      "seed_id": "S0002",
      "seed_pair": ["How are you?", "¿Cómo estás?"]
    }
  ]
}
```

---

## Phase 2: FD Collision Check (Validation)

### Step-by-Step Process

| Step | Function | Input | Output | Description |
|------|----------|-------|--------|-------------|
| 2.1 | Orchestrator triggers | Phase 1 complete | Validation check | Auto-runs after Phase 1 |
| 2.2 | Run collision validator | `seed_pairs.json` | Exit code 0/1 | `scripts/phase2_collision_check.cjs` |
| 2.3 | Check for violations | All Spanish translations | FD violation list | Detects ambiguous phrases |
| 2.4 | Generate report | Violations found | `*_phase2_report.json` | Collision details |
| 2.5 | Orchestrator evaluates | Validation result | Pass/Fail decision | Threshold check |
| 2.6a | **If PASS** | No collisions | Continue to Phase 3 | Auto-progression |
| 2.6b | **If FAIL (manual mode)** | Collisions found | Pause, wait for user | User must fix |
| 2.6c | **If FAIL (gated mode)** | Violations < threshold | Continue to Phase 3 | Auto-progression with warning |

### Validation Output

**Report structure:**
```json
{
  "course": "spa_for_eng",
  "total_seeds": 668,
  "total_violations": 0,
  "violations": [],
  "passed": true
}
```

**If violations found:**
```json
{
  "violations": [
    {
      "known": "hola",
      "seeds": [
        { "seed_id": "S0001", "target": "hello" },
        { "seed_id": "S0015", "target": "hi" }
      ],
      "severity": "high"
    }
  ],
  "passed": false
}
```

---

## Phase 3: LEGO Extraction

**Agent Intelligence:** [phase_3_lego_pairs_v7.md](public/docs/phase_intelligence/phase_3_lego_pairs_v7.md)
**Orchestrator Prompt:** [phase_3_orchestrator.md](public/docs/phase_intelligence/phase_3_orchestrator.md)
**Dashboard Guide:** https://ssi-dashboard-v7.vercel.app/phase-intelligence/3

### What Agents Actually Do

**Orchestrator (Master Agent):**
- Reads orchestrator intelligence from `phase_3_orchestrator.md`
- Checks for collision manifest (re-extraction seeds)
- Spawns N sub-agents in parallel
- Each sub-agent gets seed range + collision avoidance rules
- Monitors completion

**Sub-Agent (LEGO Extraction Worker):**
- Reads agent intelligence from `phase_3_lego_pairs_v7.md`
- Follows LEGO extraction methodology:
  - **Atomic LEGOs (A):** Single words or indivisible phrases
  - **Molecular LEGOs (M):** Multi-word phrases built from atoms
  - Marks new vs. previously-seen LEGOs
  - Identifies M-type components (which A-types make up this M)
  - **Collision avoidance:** If manifest says "AVOID phrase X", chunks differently
- Self-validates extraction quality
- Creates git branch and pushes result

**Example LEGO Extraction:**

Seed: "¿Cómo estás?" → "How are you?"

```json
[
  { "id": "S0002L01", "known": "cómo", "target": "how", "type": "A", "new": true },
  { "id": "S0002L02", "known": "estás", "target": "you are", "type": "A", "new": true },
  { "id": "S0002L03", "known": "cómo estás", "target": "how are you", "type": "M", "new": true, "components": ["S0002L01", "S0002L02"] }
]
```

### Step-by-Step Process

| Step | Function | Input | Output | Description |
|------|----------|-------|--------|-------------|
| 3.1 | Orchestrator triggers | Phase 2 passed | POST `http://localhost:3458/start` | Starts Phase 3 server |
| 3.2 | Phase 3 loads seeds | `seed_pairs.json` | Array of 668 seed pairs | Reads translations |
| 3.3 | Check collision manifest | `phase3_collision_reextraction_manifest.json` | Collision avoidance rules | Optional re-extraction |
| 3.4 | Spawn browser windows | Config: `browsers`, `agents_per_browser` | N browsers | Opens Claude sessions |
| 3.5 | **Master agent reads prompt** | `phase_3_orchestrator.md` | Understanding + collision rules | **Agent receives orchestrator intelligence** |
| 3.6 | Master agent spawns workers | Seed range + collision rules | Task tool × 10 | Parallel LEGO extraction |
| 3.7 | **Sub-agent reads prompt** | `phase_3_lego_pairs_v7.md` | LEGO extraction methodology | **Agent receives phase intelligence** |
| 3.8 | Sub-agent extracts LEGOs | Spanish/English pair | LEGOs with types (A/M) | Follows intelligence doc rules |
| 3.9 | Sub-agent validates LEGOs | Extracted LEGOs | Self-check for quality | Agent validates own work |
| 3.10 | Sub-agent pushes | LEGOs JSON | Branch: `claude/legos-*` | Git branch per agent |
| 3.11 | Branch watcher detects | Pattern: `claude/legos-*` | Merge triggered | Waits for all branches |
| 3.12 | Watcher merges | All LEGO branches | Raw merged file | Combines all LEGOs |
| 3.13 | **Deduplication** | Raw LEGOs | Deduplicated LEGOs | Removes exact duplicates |
| 3.14 | Watcher pushes to main | `lego_pairs.json` | Committed to `main` | Single file on main |
| 3.15 | Watcher deletes branches | All `claude/legos-*` | Branches removed | Cleanup |
| 3.16 | Phase 3 notifies orchestrator | Status: `complete` | POST `/phase-complete` | Phase done |

### LEGO Structure

**Output example:**
```json
{
  "version": "curated_v7_spanish",
  "course_id": "spa_for_eng",
  "total_seeds": 668,
  "total_legos": 2716,
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": ["Hello", "Hola"],
      "legos": [
        {
          "id": "S0001L01",
          "known": "hola",
          "target": "hello",
          "type": "A",
          "new": true
        }
      ]
    },
    {
      "seed_id": "S0002",
      "seed_pair": ["How are you?", "¿Cómo estás?"],
      "legos": [
        {
          "id": "S0002L01",
          "known": "cómo",
          "target": "how",
          "type": "A",
          "new": true
        },
        {
          "id": "S0002L02",
          "known": "estás",
          "target": "you are",
          "type": "A",
          "new": true
        },
        {
          "id": "S0002L03",
          "known": "cómo estás",
          "target": "how are you",
          "type": "M",
          "new": true,
          "components": ["S0002L01", "S0002L02"]
        }
      ]
    }
  ]
}
```

---

## Phase 4: LEGO FD Check + Infinitive Validation

### Step-by-Step Process

| Step | Function | Input | Output | Description |
|------|----------|-------|--------|-------------|
| 4.1 | Orchestrator triggers | Phase 3 complete | Validation checks | Auto-runs after Phase 3 |
| 4.2a | **FD Check** | `lego_pairs.json` | `*_fd_report.json` | `scripts/validation/check-lego-fd-violations.cjs` |
| 4.2b | **Infinitive Check** | `lego_pairs.json` | Exit code 0/1 | `scripts/validation/check-infinitive-forms.js` |
| 4.3 | Check LEGO-level FD | All LEGOs (known side) | Learner uncertainty list | Detects ambiguous LEGOs |
| 4.4 | Check infinitive forms | English LEGOs | Grammar violations | Validates "to X" forms |
| 4.5 | Generate FD report | Violations found | `*_fd_report.json` | Collision details |
| 4.6 | Orchestrator evaluates | Both validations | Pass/Fail decision | Thresholds check |
| 4.7a | **If PASS** | No violations | Continue to Phase 5 | Auto-progression |
| 4.7b | **If FAIL** | Critical violations | Pause or regenerate | Depends on checkpoint mode |

### FD Violation Report

**Example:**
```json
{
  "course": "spa_for_eng",
  "total_legos": 2716,
  "violations": [
    {
      "known": "es",
      "legos": [
        { "lego_id": "S0050L02", "target": "is" },
        { "lego_id": "S0051L01", "target": "he is" }
      ],
      "severity": "high",
      "reason": "Learner uncertainty: same Spanish, different English"
    }
  ],
  "total_violations": 96,
  "passed": false
}
```

---

## Phase 5: Basket Generation

**Agent Intelligence:** [phase_5_lego_baskets.md](public/docs/phase_intelligence/phase_5_lego_baskets.md)
**Orchestrator Prompt:** [phase_5_orchestrator.md](public/docs/phase_intelligence/phase_5_orchestrator.md)
**Dashboard Guide:** https://ssi-dashboard-v7.vercel.app/phase-intelligence/5
**Complete Pipeline:** [phase_5_complete_pipeline.md](public/docs/phase_intelligence/phase_5_complete_pipeline.md)

### What Agents Actually Do

**Orchestrator (Master Agent):**
- Reads orchestrator intelligence from `phase_5_orchestrator.md`
- Spawns N sub-agents in parallel
- Each sub-agent gets seed range (e.g., S0001-S0010)
- **CRITICAL:** Instructs agents on metadata stripping workflow
- Monitors completion

**Sub-Agent (Basket Generation Worker):**
- Reads agent intelligence from `phase_5_lego_baskets.md`
- For each seed assigned:
  1. Reads pre-built scaffold from `phase5_scaffolds/seed_sXXXX.json`
  2. Reviews context:
     - **10 recent seed pairs** (full sentences for thematic continuity)
     - **30 recent NEW LEGOs** (sliding window of recently introduced vocabulary)
     - **Current seed's earlier LEGOs** (incremental availability within seed)
     - **Current LEGO** (the target to practice)
  3. Generates **10 practice phrases** following 2-2-2-4 distribution:
     - **2 short** (1-2 LEGOs)
     - **2 medium** (3 LEGOs)
     - **2 longer** (4 LEGOs)
     - **4 longest** (5 LEGOs)
  4. **Saves FULL output** to `seed_sXXXX_FULL.json` (336KB with metadata - **LOCAL ONLY**)
  5. **Strips metadata** → extracts only `legos` object
  6. **Saves stripped** to `seed_sXXXX_baskets.json` (7KB - **96% smaller**)
  7. **Pushes ONLY stripped file** to git branch
- Self-validates phrase quality

**Example Phrase Generation:**

LEGO: "dónde" → "where"

Context available:
- Recent LEGOs: "hola", "estás", "buenos días", "gracias", ...
- Current seed earlier LEGOs: (none, it's first in seed)

Generated phrases (10 total, following 2-2-2-4):
```json
{
  "practice_phrases": [
    // Short (1-2 LEGOs): 2 phrases
    { "phrase": [{"known": "dónde", "target": "where"}], "translation": "where" },
    { "phrase": [{"known": "dónde", "target": "where"}, {"known": "estás", "target": "you are"}], "translation": "where are you" },

    // Medium (3 LEGOs): 2 phrases
    { "phrase": [{"known": "hola", "target": "hello"}, {"known": "dónde", "target": "where"}, {"known": "estás", "target": "you are"}], "translation": "hello where are you" },
    ...

    // Longer (4 LEGOs): 2 phrases
    ...

    // Longest (5 LEGOs): 4 phrases
    ...
  ]
}
```

### Step-by-Step Process

| Step | Function | Input | Output | Description |
|------|----------|-------|--------|-------------|
| 5.1 | Orchestrator triggers | Phase 4 passed | POST `http://localhost:3459/start` | Starts Phase 5 server |
| 5.2 | **Scaffold Preparation** | `lego_pairs.json` | 668 scaffold files | `scripts/phase5_prep_scaffolds.cjs` |
| 5.3 | Generate scaffolds | Each seed's LEGOs | `phase5_scaffolds/seed_sXXXX.json` | Pre-built context + empty baskets |
| 5.4 | Build recent context | Previous 10 seeds | Recent seed pairs | Sliding window |
| 5.5 | Build recent NEW LEGOs | Previous 30 NEW LEGOs | Recent vocabulary | Sliding window |
| 5.6 | Spawn browser windows | Config: `browsers`, `agents_per_browser` | N browsers | Opens Claude sessions |
| 5.7 | Master agent spawns workers | Seed range (e.g., S0001-S0010) | Task tool × 10 | Parallel basket generation |
| 5.8 | Sub-agent reads scaffold | `phase5_scaffolds/seed_s0001.json` | LEGO + context | Pre-built structure |
| 5.9 | Sub-agent generates phrases | LEGO + recent context | 10 practice phrases | Uses Phase 5 Intelligence |
| 5.10 | **Agent saves FULL output** | Generated baskets | `seed_s0001_FULL.json` (336KB) | **Local only, gitignored** |
| 5.11 | **Agent strips metadata** | Full output | Extract `legos` object only | Remove `_metadata`, `_instructions`, `_stats` |
| 5.12 | **Agent saves stripped** | Stripped baskets | `seed_s0001_baskets.json` (7KB) | **96% smaller** |
| 5.13 | Agent pushes stripped file | `seed_s0001_baskets.json` | Branch: `claude/baskets-*` | **Only 7KB pushed to GitHub** |
| 5.14 | Branch watcher detects | Pattern: `claude/baskets-*` | Merge triggered | Waits for all branches |
| 5.15 | Watcher pulls branches | All basket branches | Temp directory | `.git/merge-temp/` |
| 5.16 | Watcher merges baskets | All stripped baskets | `lego_baskets.json` | Combines all LEGO baskets |
| 5.17 | Watcher strips metadata | Merged file | Clean `lego_baskets.json` | Final cleanup |
| 5.18 | Watcher pushes to main | `lego_baskets.json` | Committed to `main` | Single 4.8MB file |
| 5.19 | Watcher deletes branches | All `claude/baskets-*` | Branches removed | Cleanup |
| 5.20 | Phase 5 notifies orchestrator | Status: `complete` | POST `/phase-complete` | Phase done |
| 5.21 | **Gate Violation Check** | `lego_baskets.json` | Validation report | `scripts/validation/check-gate-violations.js` |
| 5.22 | Orchestrator evaluates | Validation result | Pass/Fail | Threshold check |

### Scaffold Structure (Input to Agents)

**Example: `phase5_scaffolds/seed_s0171.json`**
```json
{
  "version": "curated_v7_spanish",
  "seed_id": "S0171",
  "generation_stage": "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
  "seed_pair": {
    "known": "¿Dónde está el baño?",
    "target": "Where is the bathroom?"
  },
  "recent_seed_pairs": [
    { "seed_id": "S0161", "known": "Buenos días", "target": "Good morning" },
    { "seed_id": "S0162", "known": "Buenas tardes", "target": "Good afternoon" }
  ],
  "recent_new_legos": [
    { "id": "S0140L01", "known": "buenos", "target": "good", "type": "A" },
    { "id": "S0140L02", "known": "días", "target": "days", "type": "A" }
  ],
  "legos": {
    "S0171L01": {
      "lego": [
        { "known": "dónde", "target": "where" }
      ],
      "type": "A",
      "is_final_lego": false,
      "current_seed_earlier_legos": [],
      "practice_phrases": [],
      "phrase_distribution": {
        "short_1_to_2_legos": 2,
        "medium_3_legos": 2,
        "longer_4_legos": 2,
        "longest_5_legos": 4
      },
      "target_phrase_count": 10,
      "_metadata": {
        "lego_id": "S0171L01",
        "seed_context": {
          "known": "¿Dónde está el baño?",
          "target": "Where is the bathroom?"
        }
      }
    }
  },
  "_instructions": {
    "task": "Fill practice_phrases arrays using Phase 5 Intelligence v7.0",
    "methodology": "Read: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5",
    "vocabulary_sources": "10 recent seed pairs + 30 recent NEW LEGOs + current seed's earlier LEGOs + current LEGO",
    "distribution": "ALWAYS 2-2-2-4 (10 phrases per LEGO)"
  },
  "_stats": {
    "new_legos_in_seed": 4,
    "phrases_to_generate": 40,
    "recent_seed_pairs_count": 10,
    "recent_new_legos_count": 30
  }
}
```

### Agent Output (FULL - Local Only)

**Example: `phase5_outputs/seed_s0171_FULL.json` (336KB, gitignored)**
```json
{
  "version": "curated_v7_spanish",
  "seed_id": "S0171",
  "generation_stage": "PHRASE_GENERATION_COMPLETE",
  "seed_pair": {
    "known": "¿Dónde está el baño?",
    "target": "Where is the bathroom?"
  },
  "recent_seed_pairs": [...],
  "recent_new_legos": [...],
  "legos": {
    "S0171L01": {
      "lego": [{ "known": "dónde", "target": "where" }],
      "practice_phrases": [
        {
          "phrase": [{ "known": "dónde", "target": "where" }],
          "translation": "where"
        },
        {
          "phrase": [
            { "known": "dónde", "target": "where" },
            { "known": "está", "target": "is" }
          ],
          "translation": "where is"
        }
      ]
    }
  },
  "_metadata": {...},
  "_instructions": {...},
  "_stats": {...}
}
```

### Agent Output (STRIPPED - Pushed to GitHub)

**Example: `phase5_outputs/seed_s0171_baskets.json` (7KB, pushed to branch)**
```json
{
  "S0171L01": {
    "lego": [{ "known": "dónde", "target": "where" }],
    "practice_phrases": [
      {
        "phrase": [{ "known": "dónde", "target": "where" }],
        "translation": "where"
      },
      {
        "phrase": [
          { "known": "dónde", "target": "where" },
          { "known": "está", "target": "is" }
        ],
        "translation": "where is"
      }
    ]
  },
  "S0171L02": {...},
  "S0171L03": {...},
  "S0171L04": {...}
}
```

### Final Output (Merged)

**Example: `lego_baskets.json` (4.8MB, on main branch)**
```json
{
  "version": "1.0.0",
  "merged_at": "2025-11-16T04:30:00.000Z",
  "data": {
    "S0001L01": {
      "lego": [{ "known": "hola", "target": "hello" }],
      "practice_phrases": [...]
    },
    "S0001L02": {...},
    "S0002L01": {...},
    ...
    "S0668L04": {...}
  }
}
```

### Storage Comparison

| Approach | Local Files | GitHub Branches | GitHub Main | Total Git History |
|----------|-------------|-----------------|-------------|-------------------|
| **Old (no stripping)** | 218MB | 650 × 336KB = 218MB | 4.8MB | 223MB |
| **New (with stripping)** | 218MB (gitignored) | 650 × 7KB = 4.8MB | 4.8MB | **9.6MB (96% savings)** |

---

## Phase 6: Introductions

### Step-by-Step Process

| Step | Function | Input | Output | Description |
|------|----------|-------|--------|-------------|
| 6.1 | Orchestrator triggers | Phase 5 passed | POST `http://localhost:3460/start` | Starts Phase 6 server |
| 6.2 | Phase 6 loads baskets | `lego_baskets.json` | All LEGO baskets | Reads practice content |
| 6.3 | Identify introduction points | LEGO metadata | Seeds with new LEGOs | First occurrence of each LEGO |
| 6.4 | Spawn browser windows | Config | N browsers | Opens Claude sessions |
| 6.5 | Master agent spawns workers | Introduction points | Task tool × N | Parallel intro generation |
| 6.6 | Sub-agent generates intro | LEGO + examples | Introduction content | Uses Phase 6 Intelligence |
| 6.7 | Sub-agent pushes | Introduction JSON | Branch: `claude/intros-*` | Git branch per agent |
| 6.8 | Branch watcher merges | All intro branches | `introductions.json` | Combines all intros |
| 6.9 | Watcher pushes to main | `introductions.json` | Committed to `main` | Single file |
| 6.10 | Watcher deletes branches | All `claude/intros-*` | Branches removed | Cleanup |
| 6.11 | Phase 6 notifies orchestrator | Status: `complete` | POST `/phase-complete` | Phase done |

### Introduction Structure

**Output example:**
```json
{
  "version": "curated_v7_spanish",
  "course_id": "spa_for_eng",
  "total_introductions": 2716,
  "introductions": [
    {
      "lego_id": "S0001L01",
      "lego": {
        "known": "hola",
        "target": "hello"
      },
      "introduction": {
        "title": "Saying Hello",
        "explanation": "The word 'hola' is the most common greeting in Spanish...",
        "examples": [
          {
            "spanish": "Hola, ¿cómo estás?",
            "english": "Hello, how are you?"
          }
        ],
        "tips": [
          "Use 'hola' in both formal and informal settings",
          "Pronunciation: OH-lah"
        ]
      }
    }
  ]
}
```

---

## Phase 7: Compilation (App-Ready Format)

### Step-by-Step Process

| Step | Function | Input | Output | Description |
|------|----------|-------|--------|-------------|
| 7.1 | User triggers | Dashboard UI | POST `/compile` | Manual compilation request |
| 7.2 | Load all phase outputs | Multiple files | Aggregated data | Reads all pipeline outputs |
| 7.3 | Read `seed_pairs.json` | Phase 1 output | 668 translations | Sentence pairs |
| 7.4 | Read `lego_pairs.json` | Phase 3 output | 2716 LEGOs | Vocabulary items |
| 7.5 | Read `lego_baskets.json` | Phase 5 output | Practice phrases | All baskets |
| 7.6 | Read `introductions.json` | Phase 6 output | Teaching content | Intro presentations |
| 7.7 | Build dependency graph | LEGO relationships | Graph structure | M-type dependencies |
| 7.8 | Generate slices | Learning progression | Curriculum slices | Chunked learning units |
| 7.9 | Create sample sentences | LEGO examples | Contextualized samples | Real usage examples |
| 7.10 | Add metadata | Course info | Full metadata | Languages, version, etc. |
| 7.11 | Write compiled output | Complete structure | `compiled.json` | App-ready file |
| 7.12 | Generate manifest | File summary | `manifest.json` | Course index |

### Compiled Structure

**Output example: `compiled.json`**
```json
{
  "version": "curated_v7_spanish",
  "course_id": "spa_for_eng",
  "target_language": "spa",
  "known_language": "eng",
  "total_seeds": 668,
  "total_legos": 2716,
  "compiled_at": "2025-11-16T05:00:00.000Z",

  "metadata": {
    "target_language_name": "Spanish",
    "known_language_name": "English",
    "difficulty": "beginner",
    "estimated_hours": 120
  },

  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": {
        "known": "Hello",
        "target": "Hola"
      },
      "legos": [
        {
          "lego_id": "S0001L01",
          "lego": { "known": "hola", "target": "hello" },
          "type": "A",
          "introduction": {
            "title": "Saying Hello",
            "explanation": "...",
            "examples": [...]
          },
          "practice_phrases": [
            {
              "phrase": [{ "known": "hola", "target": "hello" }],
              "translation": "hello"
            }
          ]
        }
      ],
      "introduction_items": [
        {
          "type": "lego_intro",
          "lego_id": "S0001L01",
          "content": {...}
        }
      ]
    }
  ],

  "samples": {
    "S0001L01": {
      "lego_id": "S0001L01",
      "lego": { "known": "hola", "target": "hello" },
      "roles": ["greeting", "conversation_starter"],
      "sample_sentences": [
        {
          "spanish": "Hola, buenos días",
          "english": "Hello, good morning"
        }
      ]
    }
  },

  "graph": {
    "nodes": [
      {
        "id": "S0001L01",
        "type": "A",
        "prerequisites": []
      },
      {
        "id": "S0002L03",
        "type": "M",
        "prerequisites": ["S0002L01", "S0002L02"]
      }
    ],
    "edges": [
      {
        "from": "S0002L01",
        "to": "S0002L03",
        "type": "component"
      }
    ]
  },

  "slices": [
    {
      "slice_id": "slice_001",
      "name": "Getting Started",
      "lego_ids": ["S0001L01", "S0002L01", "S0002L02"],
      "estimated_minutes": 15
    }
  ]
}
```

---

## Phase 8: Audio/TTS Generation

### Step-by-Step Process

| Step | Function | Input | Output | Description |
|------|----------|-------|--------|-------------|
| 8.1 | User triggers | Dashboard UI | POST `/phase/8/start` | Manual audio generation |
| 8.2 | Phase 8 loads baskets | `lego_baskets.json` | All phrases to speak | Text to convert |
| 8.3 | Extract unique phrases | All practice phrases | Deduplicated list | Remove duplicates |
| 8.4 | Generate audio batches | Phrase list | Batch requests | Group for efficiency |
| 8.5 | Call TTS API | Text + language + voice | Audio files (.mp3) | External TTS service |
| 8.6 | Save audio files | Audio data | `audio/*.mp3` | Individual audio files |
| 8.7 | Generate manifest | File mappings | `audio_manifest.json` | Index of audio files |
| 8.8 | Notify orchestrator | Status: `complete` | POST `/phase-complete` | Phase done |

### Audio Manifest

**Output example:**
```json
{
  "version": "1.0.0",
  "generated_at": "2025-11-16T06:00:00.000Z",
  "total_files": 15432,
  "audio_files": [
    {
      "phrase_id": "S0001L01_P001",
      "spanish": "hola",
      "english": "hello",
      "audio_file": "audio/s0001l01_p001.mp3",
      "duration_ms": 450,
      "voice": "es-ES-Standard-A"
    }
  ]
}
```

---

## Complete Pipeline Summary

### File Progression

```
Input:
└── canonical_seeds.txt (50KB)

Phase 1:
└── seed_pairs.json (500KB)

Phase 2:
└── *_phase2_report.json (10KB) [validation only]

Phase 3:
└── lego_pairs.json (2MB)

Phase 4:
└── *_fd_report.json (50KB) [validation only]

Phase 5:
├── phase5_scaffolds/ (gitignored)
│   └── seed_sXXXX.json × 668
├── phase5_outputs/
│   ├── seed_sXXXX_FULL.json × 668 (gitignored, local only)
│   └── seed_sXXXX_baskets.json × 668 (pushed to branches, then deleted)
└── lego_baskets.json (4.8MB) [FINAL on main]

Phase 6:
└── introductions.json (500KB)

Phase 7:
└── compiled.json (8MB) [app-ready format]

Phase 8:
├── audio/*.mp3 × 15432
└── audio_manifest.json (2MB)
```

### Git Repository State (Main Branch)

**Essential files committed to git:**
```
public/vfs/courses/spa_for_eng/
├── canonical_seeds.txt          (50KB)   [Input]
├── seed_pairs.json               (500KB)  [Phase 1]
├── lego_pairs.json               (2MB)    [Phase 3]
├── lego_baskets.json             (4.8MB)  [Phase 5]
├── introductions.json            (500KB)  [Phase 6]
├── compiled.json                 (8MB)    [Phase 7]
└── audio_manifest.json           (2MB)    [Phase 8]

Total: ~16MB (without audio files)
```

**Files NOT committed (gitignored):**
```
public/vfs/courses/spa_for_eng/
├── phase5_scaffolds/             [668 × 50KB = 33MB]
├── phase5_outputs/
│   └── *_FULL.json               [668 × 336KB = 218MB]
└── *_report.json                 [Validation reports]

Total saved in git history: ~251MB
```

### Performance Metrics

| Phase | Sequential Time | Parallel Time (10 browsers × 10 agents) | Speedup |
|-------|----------------|------------------------------------------|---------|
| Phase 1 | 668 × 2min = 22.3 hours | ~20 minutes | **67x faster** |
| Phase 3 | 668 × 3min = 33.4 hours | ~30 minutes | **67x faster** |
| Phase 5 | 2716 × 2min = 90.5 hours | ~60 minutes | **90x faster** |
| **Total** | **146.2 hours** | **~2 hours** | **~73x faster** |

### Configuration

**From `automation.config.simple.json`:**
```json
{
  "phase3_lego_extraction": {
    "browsers": 10,
    "agents_per_browser": 10,
    "seeds_per_agent": 10
  },
  "phase5_basket_generation": {
    "browsers": 10,
    "agents_per_browser": 10,
    "seeds_per_agent": 10
  },
  "validation_thresholds": {
    "phase3_error_rate": 0.05,
    "phase5_gate_violations": 0.02,
    "phase5_quality_score": 0.95
  }
}
```

**Capacity calculation:**
- Phase 3: 10 browsers × 10 agents × 10 seeds = **1000 seeds capacity**
- Phase 5: 10 browsers × 10 agents × 10 seeds = **1000 seeds capacity**

For 668 seeds: **67% utilization** (room for larger courses)

---

## Quick Reference: Key Scripts

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `start-automation.cjs` | Start all services | Config | 6 servers running |
| `phase5_prep_scaffolds.cjs` | Generate scaffolds | `lego_pairs.json` | 668 scaffold files |
| `watch_and_merge_branches.cjs` | Merge git branches | Pattern + output file | Merged JSON |
| `phase2_collision_check.cjs` | Validate seed FD | `seed_pairs.json` | Report + exit code |
| `check-lego-fd-violations.cjs` | Validate LEGO FD | `lego_pairs.json` | Report + exit code |
| `check-infinitive-forms.js` | Validate grammar | `lego_pairs.json` | Report + exit code |
| `check-gate-violations.js` | Validate baskets | `lego_baskets.json` | Report + exit code |
| `strip_phase5_metadata.cjs` | Clean metadata | JSON file | Stripped JSON |

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SSi Automation System                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐                                            │
│  │ Orchestrator │  (Port 3456)                               │
│  │  - Job queue                                              │
│  │  - Validation                                             │
│  │  - Checkpoints                                            │
│  └──────┬───────┘                                            │
│         │                                                     │
│    ┌────┴────┬─────────┬─────────┬─────────┬─────────┐      │
│    │         │         │         │         │         │      │
│  Phase 1   Phase 3   Phase 5   Phase 6   Phase 8   Phase X  │
│  (3457)    (3458)    (3459)    (3460)    (3461)    (...)    │
│    │         │         │         │         │         │      │
│    ▼         ▼         ▼         ▼         ▼         ▼      │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Browser Windows (Claude Code)              │     │
│  │  ┌──────┐  ┌──────┐  ┌──────┐       ┌──────┐      │     │
│  │  │ Win1 │  │ Win2 │  │ Win3 │  ...  │ Win10│      │     │
│  │  └──┬───┘  └──┬───┘  └──┬───┘       └──┬───┘      │     │
│  │     │         │         │               │          │     │
│  │   10 agents 10 agents 10 agents      10 agents     │     │
│  └────────────────────────────────────────────────────┘     │
│                         │                                    │
│                         ▼                                    │
│                  ┌──────────────┐                            │
│                  │ Git Branches │                            │
│                  │ claude/*     │                            │
│                  └──────┬───────┘                            │
│                         │                                    │
│                         ▼                                    │
│                  ┌──────────────┐                            │
│                  │Branch Watcher│                            │
│                  │ - Merge      │                            │
│                  │ - Push main  │                            │
│                  │ - Delete     │                            │
│                  └──────────────┘                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Handling & Validation Gates

| Checkpoint | Validation | Threshold | Action on Fail (gated mode) |
|------------|------------|-----------|----------------------------|
| Phase 1 → 2 | FD collision check | 0% violations | Block if any collisions |
| Phase 3 → 4 | LEGO FD check | 5% error rate | Block if > 5% |
| Phase 3 → 4 | Infinitive forms | 0 violations | Block if any violations |
| Phase 5 → 6 | Gate violations | 2% violations | Block if > 2% |
| Phase 5 → 6 | Quality score | 95% minimum | Block if < 95% |

**Checkpoint modes:**
- `manual`: Pause after each phase, wait for user approval
- `gated`: Auto-progress if validations pass thresholds
- `auto`: Skip all validations, full automation (risky)

---

## How Agents Know What To Do: Phase Intelligence System

The entire automation system is driven by **Phase Intelligence Documents** - markdown files that contain detailed instructions, methodologies, and quality standards for each phase.

### Intelligence Document Structure

Each phase has **two types** of intelligence documents:

1. **Orchestrator Intelligence** (`phase_X_orchestrator.md`)
   - Instructions for the master agent
   - How to spawn sub-agents
   - How to distribute work
   - Example: `phase_5_orchestrator.md`

2. **Worker Intelligence** (`phase_X_*.md`)
   - Instructions for sub-agents
   - Detailed methodology
   - Quality standards
   - Output format
   - Example: `phase_5_lego_baskets.md`

### How Agents Receive Instructions

**Step 1: Phase server spawns browser**
```javascript
// services/phases/phase5-basket-server.cjs
const windowPrompt = generatePhase5OrchestratorPrompt(courseCode, params, courseDir);
// Opens browser with Claude Code
await spawnClaudeCodeSession(windowPrompt);
```

**Step 2: Orchestrator prompt includes intelligence link**
```markdown
# Phase 5 Orchestrator: Spawn 67 Parallel Agents

**Course**: spa_for_eng
**Total Seeds**: 668

Each agent prompt should include:
- Specific seed range (e.g., "S0001-S0010")
- Path to scaffolds: public/vfs/courses/spa_for_eng/phase5_scaffolds/
- Reference to Phase 5 intelligence: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5

**CRITICAL OUTPUT WORKFLOW** (each agent must follow):
1. Save FULL output to seed_SXXXX_FULL.json (with _metadata)
2. Strip metadata → extract ONLY the legos object
3. Save stripped to seed_SXXXX_baskets.json (~7KB vs 336KB)
4. Push ONLY stripped file to GitHub (96% bandwidth savings)
```

**Step 3: Agent reads intelligence from dashboard**
- Agent visits: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5
- Reads complete methodology from `phase_5_lego_baskets.md`
- Understands:
  - Context sources (10 recent seeds, 30 recent LEGOs, etc.)
  - Phrase distribution (2-2-2-4)
  - Quality standards
  - Output format

**Step 4: Agent executes task following intelligence**
- Generates baskets exactly as specified
- Self-validates against quality criteria
- Outputs in exact format specified

### Why This Works

✅ **Single source of truth:** Intelligence docs are the definitive specification
✅ **Version controlled:** Changes to methodology tracked in git
✅ **Human readable:** Devs can review and update methodology
✅ **Agent accessible:** Claude can read and follow markdown instructions
✅ **Dashboard accessible:** Users can review what agents will do
✅ **Evolvable:** Methodology improves over time (see `PHASE_EVOLUTION.md`)

### Intelligence Document Index

| Phase | Orchestrator Doc | Worker Doc | What It Defines |
|-------|------------------|------------|-----------------|
| 1 | phase_1_orchestrator.md | phase_1_seed_pairs.md | Translation methodology, register, cultural adaptation |
| 3 | phase_3_orchestrator.md | phase_3_lego_pairs_v7.md | LEGO extraction rules, A vs M types, collision avoidance |
| 5 | phase_5_orchestrator.md | phase_5_lego_baskets.md | Basket generation, 2-2-2-4 distribution, vocabulary sources |
| 5.5 | - | phase_5.5_basket_deduplication.md | Post-processing deduplication rules |
| 5.5 | - | phase_5.5_grammar_review.md | Grammar validation criteria |
| 6 | - | phase_6_introductions.md | Teaching content generation |
| 7 | - | phase_7_compilation.md | Final format assembly |
| 8 | - | phase_8_audio_generation.md | TTS generation rules |

### Evolution of Intelligence

The `PHASE_EVOLUTION.md` document tracks how methodologies have improved:

**Phase 5 Evolution Example:**
- **v1.0:** Simple phrase generation, no context
- **v2.0:** Added whitelist vocabulary (500KB+ per scaffold)
- **v3.0:** Reduced to 10 recent seeds (removed bloat)
- **v7.0:** Added 30 recent NEW LEGOs sliding window (prevents using old vocabulary)

This evolution is tracked, documented, and the current best practices are always in the intelligence docs.

---

## Quick Reference: Where Everything Lives

```
ssi-dashboard-v7-clean/
│
├── start-automation.cjs                    # Start all services
│
├── services/
│   ├── orchestration/
│   │   └── orchestrator.cjs                # Main orchestrator (port 3456)
│   └── phases/
│       ├── phase1-translation-server.cjs   # Phase 1 server (port 3457)
│       ├── phase3-lego-server.cjs          # Phase 3 server (port 3458)
│       ├── phase5-basket-server.cjs        # Phase 5 server (port 3459)
│       ├── phase6-introductions-stub.cjs   # Phase 6 stub (port 3460)
│       └── phase8-audio-stub.cjs           # Phase 8 stub (port 3461)
│
├── scripts/
│   ├── phase5_prep_scaffolds.cjs           # Generate Phase 5 scaffolds
│   ├── watch_and_merge_branches.cjs        # Git branch merger
│   ├── phase2_collision_check.cjs          # Phase 2 validator
│   └── validation/
│       ├── check-lego-fd-violations.cjs    # Phase 4 LEGO FD checker
│       ├── check-infinitive-forms.js       # Phase 4 infinitive checker
│       └── check-gate-violations.js        # Phase 5 gate checker
│
├── public/docs/phase_intelligence/         # ⭐ AGENT INTELLIGENCE DOCS ⭐
│   ├── phase_1_orchestrator.md            # Phase 1 master agent instructions
│   ├── phase_1_seed_pairs.md              # Phase 1 worker instructions
│   ├── phase_3_orchestrator.md            # Phase 3 master agent instructions
│   ├── phase_3_lego_pairs_v7.md           # Phase 3 worker instructions
│   ├── phase_5_orchestrator.md            # Phase 5 master agent instructions
│   ├── phase_5_lego_baskets.md            # Phase 5 worker instructions
│   ├── phase_5_complete_pipeline.md       # Complete Phase 5 workflow
│   ├── phase_5.5_basket_deduplication.md  # Deduplication rules
│   ├── phase_5.5_grammar_review.md        # Grammar validation
│   ├── phase_6_introductions.md           # Phase 6 instructions
│   ├── phase_7_compilation.md             # Phase 7 instructions
│   ├── phase_8_audio_generation.md        # Phase 8 instructions
│   ├── PHASE_EVOLUTION.md                 # History of methodology improvements
│   └── README.md                          # Overview of phase intelligence
│
├── automation.config.simple.json           # Simple numeric config
│
└── public/vfs/courses/spa_for_eng/
    ├── canonical_seeds.txt                 # Input: 668 English seeds
    ├── seed_pairs.json                     # Phase 1 output
    ├── lego_pairs.json                     # Phase 3 output
    ├── phase5_scaffolds/                   # Phase 5 input (gitignored)
    ├── phase5_outputs/                     # Phase 5 working (gitignored)
    ├── lego_baskets.json                   # Phase 5 final output
    ├── introductions.json                  # Phase 6 output
    └── compiled.json                       # Phase 7 output
```

---

*Generated: 2025-11-16*
*System Version: Modular v7.0*
*Phase Intelligence: Living documentation in `public/docs/phase_intelligence/`*
