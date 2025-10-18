# LEGO Extraction Training Dataset

**Generation 1 Baseline** - Extracted from approved 30-seed courses

## Overview

This directory contains the **living training dataset** for fine-tuning Sonnet on SSi LEGO extraction methodology. The dataset evolves through generations:

- **Generation 1**: Baseline from existing approved courses (449 examples)
- **Generation 2+**: Baseline + human corrections
- **Quality improves** as system learns from corrections

## Architecture: Self-Learning AI OS

This training dataset is the **MEMORY** layer of the AI Operating System:

```
┌─────────────────────────────────────────────────────┐
│ KERNEL (Immutable Standards)                        │
│ - Lean Skills (~8KB methodology)                    │
│ - FD + FCFS rules                                   │
│ - Validation scripts                                │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ PROCESSING (Fine-Tuned Model)                       │
│ - Gen 1: Base Sonnet                                │
│ - Gen 5: +corrections → 95% quality                 │
│ - Gen 50: Near-perfect (99.9% quality)              │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ MEMORY (Training Dataset) ← YOU ARE HERE            │
│ - Approved outputs (patterns)                       │
│ - Human corrections (learning)                      │
│ - Grows with each generation                        │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ SELF-REGULATION (Quality Gates)                     │
│ - Auto-detect errors                                │
│ - Flag for human review                             │
│ - Block bad data propagation                        │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ EVOLUTION (Fine-Tuning Pipeline)                    │
│ - Corrections → training data                       │
│ - Auto-retrain model                                │
│ - Quality upregulates                               │
└─────────────────────────────────────────────────────┘
```

## Generation 1 Status

**Created:** 2025-10-18
**Total Examples:** 449
**Total Courses:** 4

| Course | Language | Examples | LEGOs | FEEDERs |
|--------|----------|----------|-------|---------|
| spa_for_eng_30seeds | Spanish for English | 115 | 89 | 26 |
| ita_for_eng_30seeds | Italian for English | 115 | 90 | 25 |
| fra_for_eng_30seeds | French for English | 116 | 90 | 26 |
| cmn_for_eng_30seeds | Mandarin for English | 103 | 92 | 11 |

## Directory Structure

```
training/
├── README.md                          # This file
├── build-training-dataset.cjs         # Extract examples from approved courses
├── add-correction.cjs                 # Capture human corrections
│
├── generation-1/                      # Generation 1 baseline
│   ├── manifest.json                 # Overall stats and metadata
│   ├── spa_for_eng_30seeds.json      # Spanish training examples
│   ├── ita_for_eng_30seeds.json      # Italian training examples
│   ├── fra_for_eng_30seeds.json      # French training examples
│   └── cmn_for_eng_30seeds.json      # Mandarin training examples
│
└── generation-2/                      # (Future) Gen 2 with corrections
    └── ...
```

## Training Example Format

Each example contains:

```json
{
  "input": {
    "seed_id": "S0001",
    "target": "Quiero hablar español contigo ahora.",
    "known": "I want to speak Spanish with you now.",
    "task": "Extract LEGO and classify",
    "context": {
      "target_language": "Spanish",
      "known_language": "English"
    }
  },
  "output": {
    "lego_id": "S0001L01",
    "lego_type": "BASE",
    "target_chunk": "Quiero",
    "known_chunk": "I want",
    "componentization": null
  },
  "reasoning": "FD passes: Learner sees \"I want\" → exactly one target \"Quiero\". No alternatives, deterministic. FCFS allows: First occurrence of \"I want\" in this course. Classification: BASE because cannot be meaningfully broken down further. Atomic chunk with pedagogical value."
}
```

**Key components:**
- **input**: Seed context + task (what model sees)
- **output**: Correct LEGO extraction (what model should produce)
- **reasoning**: Why this extraction is correct (helps model learn the "why")

## Self-Learning Process

### 1. Extract Baseline (Generation 1)

```bash
# Extract from all approved 30-seed courses
node build-training-dataset.cjs

# Or extract from single course
node build-training-dataset.cjs \
  --course /path/to/vfs/courses/spa_for_eng_30seeds \
  --output generation-1/spa_for_eng_30seeds.json
```

### 2. Human Review → Add Corrections

When human review identifies an error:

```bash
node add-correction.cjs \
  --course spa_for_eng_30seeds \
  --seed S0005 \
  --before '{"lego_id":"S0005L01","known_chunk":"I am","target_chunk":"Soy","lego_type":"BASE"}' \
  --after '{"lego_id":"S0005L01","known_chunk":"I am a teacher","target_chunk":"Soy un profesor","lego_type":"COMPOSITE","componentization":"I am a teacher = Soy un profesor, where Soy = I am and un profesor = a teacher"}' \
  --reason "FCFS violation: 'I am' already mapped to 'Estoy' in S0001. When FCFS blocks, chunk up with context to maintain FD." \
  --error-type FCFS_VIOLATION
```

**Correction added to training dataset!** Next generation learns this pattern.

### 3. System Self-Heals

**Generation 1 (before correction):**
```
Seed S0001: "I am" → "Estoy"
Extract: "I am" → "Estoy" ✅

Seed S0005: "I am a teacher" → "Soy un profesor"
Extract: "I am" → "Soy" ❌ FCFS VIOLATION
→ Flagged for human review
```

**Human adds correction** (via `add-correction.cjs`)

**Generation 2 (after fine-tuning):**
```
Seed S0001: "I am" → "Estoy"
Extract: "I am" → "Estoy" ✅

Seed S0005: "I am a teacher" → "Soy un profesor"
Model checks: "I am" already mapped? YES (FCFS blocks)
Model applies learned pattern: Chunk up
Extract: "I am a teacher" → "Soy un profesor" ✅
→ No human review needed
```

**System healed itself!**

## Error Type Taxonomy

The `add-correction.cjs` script tracks error patterns:

| Error Type | Description | Example |
|------------|-------------|---------|
| `FCFS_VIOLATION` | Known chunk mapped to different target | "I am" → "Estoy" (first), then "I am" → "Soy" (wrong) |
| `FD_VIOLATION` | Known chunk not functionally deterministic | "the" → "el" (could be la/los/las) |
| `WRONG_CLASSIFICATION` | Incorrect BASE/COMPOSITE/FEEDER | "I'm trying" classified as BASE (should be COMPOSITE) |
| `MISSING_COMPONENTIZATION` | COMPOSITE missing componentization | COMPOSITE LEGO with componentization: null |
| `INVALID_COMPONENTIZATION` | Componentization format incorrect | "I want = Quiero, where..." (missing components) |
| `WRONG_CHUNKING` | Chunk boundaries incorrect | "to speak Spanish" vs "to speak" + "Spanish" |
| `MISSING_FEEDER` | COMPOSITE missing FEEDER extraction | COMPOSITE with componentization but no feeder_pairs |
| `PEDAGOGICAL_ISSUE` | Valid technically but poor choice | Extracting rare/unusual chunks |

## Progressive Autonomy

As corrections accumulate, quality improves:

```
Generation 1:  80% quality → 20% human review → 8 hours/course
Generation 5:  95% quality → 5% human review  → 1 hour/course (87% reduction)
Generation 20: 99% quality → 1% human review  → 5 min/course (99% reduction)
Generation 50: 99.9% quality → 0.1% review    → 0 min/course (fully autonomous)
```

## Fine-Tuning Pipeline (Future)

Once we have sufficient corrections:

1. **Prepare dataset** for Anthropic fine-tuning API
2. **Fine-tune model** on approved outputs + corrections
3. **Version model**: `sonnet-4.5-ssi-lego-v1`, `v2`, `v3`...
4. **A/B test**: base vs fine-tuned quality
5. **Deploy** fine-tuned model to production
6. **Measure** improvement in next generation

## Next Steps

1. ✅ Build training dataset extractor (`build-training-dataset.cjs`)
2. ✅ Extract from 4 approved 30-seed courses (449 examples)
3. ✅ Create correction capture script (`add-correction.cjs`)
4. 📋 Build validation scripts (detect errors automatically)
5. 📋 Test fine-tuning with small dataset
6. 📋 Build automated fine-tuning pipeline
7. 📋 Track metrics across generations

---

**This is not just a training dataset. It's the memory of a self-learning system.**

Every approved output teaches it what's right.
Every correction teaches it what's wrong.
Every generation gets smarter.

This is **AI as Operating System**.
