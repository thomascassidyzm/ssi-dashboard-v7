# SSi Phrase Variety

How to ensure balanced vocabulary practice across all LEGOs.

## Core Principles

1. **Vocabulary Balance**: Every LEGO needs balanced practice exposure
2. **Length Distribution**: Phrases must progress smoothly from SHORT → MEDIUM → LONG

---

## ⚠️ Phrase Length Distribution (CRITICAL)

**Common failure:** Jumping from SHORT to LONG, skipping MEDIUM entirely.

| Tier | Syllables | Chinese chars | Purpose |
|------|-----------|---------------|---------|
| SHORT | 3-5 | 3-5 | Initial practice with LEGO |
| **MEDIUM** | **6-9** | **6-9** | **Bridge to complex sentences** |
| LONG | 10+ | 10+ | Full context, spaced repetition |

**Why MEDIUM matters:**
- Learners need gradual complexity increases
- Jumping SHORT→LONG feels jarring and demotivating
- MEDIUM phrases reinforce the LEGO before the longest phrases

**Distribution targets (seeds 6+):**
- **BUILD phrases**: Flexible count - whatever is needed to teach the LEGO
- **USE phrases**: Minimum 5 per LEGO (spread across SHORT/MEDIUM/LONG tiers)
- See `ralph-methodology.md` for complete BUILD/USE mechanics

**Seeds 1-5:** Flexible - at least 1 phrase, as many as meaningful with limited vocabulary.

---

## Vocabulary Balance

Every LEGO needs balanced practice exposure. Avoid over-relying on common vocabulary while neglecting recently introduced words.

## Practice Score

Each LEGO has a practice score:

```
practice_score = phrase_count / seeds_since_introduction
```

- **Underused** (< 0.3): Needs more practice - PRIORITIZE these
- **Balanced** (0.3 - 1.5): Good coverage
- **Overused** (> 1.5): Used too much - AVOID adding more

## What This Means

A LEGO introduced in seed 10 and now at seed 100:
- 90 seeds of availability
- If used in 27 phrases → score 0.3 (underused, needs more)
- If used in 90 phrases → score 1.0 (balanced)
- If used in 150 phrases → score 1.7 (overused)

## Building Varied Phrases

When creating practice phrases:

1. **Check underused LEGOs** - API provides list of LEGOs needing practice
2. **Prioritize recent vocabulary** - Newer LEGOs need more exposure
3. **Vary your patterns** - Don't repeat the same sentence structures
4. **Mix content words** - Rotate nouns, verbs, adjectives

### BAD (repetitive)

```
"I want to speak Chinese with everyone."
"I want to learn Chinese with everyone."
"I want to practice Chinese with everyone."
```

All use the same overused LEGOs: I, want, Chinese, everyone

### GOOD (varied)

```
"I want to speak Chinese with everyone."
"Can you help me find the new place?"
"She needs to remember this difficult word."
```

Mixes vocabulary, uses underused LEGOs (help, find, difficult, remember)

## Three-Strike Rule

The API tracks consecutive balance violations:

- **Strike 1-2**: Warning - submission accepted but flagged
- **Strike 3**: REJECTION - must resubmit with better balance

Counter resets to 0 when you submit balanced phrases.

## Practical Tips

1. **Scan the underused list** before writing phrases
2. **Include at least one underused LEGO** per phrase set
3. **Avoid phrases that ONLY use overused vocabulary**
4. **Create novel combinations** - don't just swap one word

## Example Response from API

When you get a balance warning:

```json
{
  "warning": "balance",
  "strikes": 2,
  "message": "Strike 2/3 - next violation will reject",
  "overused": ["Chinese (1.8x)", "speak (1.6x)", "everyone (1.5x)"],
  "underused": ["difficult (0.2x)", "refrigerator (0.1x)", "remember (0.3x)"]
}
```

Use this to adjust your phrases before the next submission.
