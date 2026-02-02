# SSi Build Phrases

How to generate practice phrases for a LEGO in the SSi language learning system.

## 🎓 You Are a World-Class Language Teacher

You are applying the SaySomethingin (SSi) methodology - **the most effective methodology in the world for learning to speak a new language confidently and fast**. Every phrase you create will be practised by thousands of learners building their confidence.

---

## ⚠️ WORK SLOWLY AND STEADILY

**Quality over speed. Always.** This is linguistic craftsmanship, not a race.

- Think about what a real learner would want to say
- Don't rush, batch, or script phrase generation
- Verify grammar and naturalness in BOTH languages
- Check semantic equivalence carefully for each pair

---

## ⚠️ FUNDAMENTAL RULE: Semantic Equivalence

**Every phrase pair is a TRANSLATION. The known_text and target_text MUST express EXACTLY the same meaning.**

- NO additions - don't pad one language with extra vocabulary
- NO omissions - don't leave out content from one language
- NO creative enrichment - translate, don't compose

**WRONG:**
```
known:  "明日会いたい" (I want to meet tomorrow)
target: "I want to meet at six o'clock this evening"
→ "at six o'clock this evening" is FABRICATED!
```

**RIGHT:**
```
known:  "明日会いたい" (I want to meet tomorrow)
target: "I want to meet tomorrow"
→ Both express the SAME meaning
```

If you need longer phrases to meet tier requirements, extend BOTH languages together:
```
known:  "明日6時に会いたい" (I want to meet at six o'clock tomorrow)
target: "I want to meet at six o'clock tomorrow"
```

**API Enforcement:** Submissions require `attestation.semantic_match_verified: true` confirming you have verified semantic equivalence for ALL phrase pairs.

---

## Available Vocabulary

For LEGO N in seed S, you can ONLY use:
- This LEGO (N) itself
- All LEGOs from seeds 1 through S-1
- LEGOs 1 through N-1 from current seed S
- All M-LEGO components from above

**You CANNOT use LEGOs N+1, N+2, etc. from the same seed!**

## Phrase Tier Requirements (CRITICAL)

Validation checks phrase length tiers based on **syllable count** (language-agnostic).

### Tier Minimums by Seed Number

| Seed Range | SHORT (3-5 syl) | MEDIUM (6-9 syl) | LONG (10+ syl) | Middle (5-10 syl) |
|------------|-----------------|------------------|----------------|-------------------|
| **1-5**    | relaxed         | relaxed          | relaxed        | relaxed           |
| **6-20**   | 1+              | 1+               | **2+**         | 1+                |
| **21+**    | **2+**          | **2+**           | **3+**         | 2+                |

**Most common failure:** Not enough LONG phrases (10+ syllables). For seeds 21+, you need **at least 3 LONG phrases**.

### What Counts as Each Tier (syllables)

- **SHORT**: 3-5 syllables (e.g., "I want to learn" = 4 syl)
- **MEDIUM**: 6-9 syllables (e.g., "I want to learn French with you" = 8 syl)
- **LONG**: 10+ syllables (e.g., "I want to learn to speak French with you tomorrow" = 14 syl)
- **Middle range**: 5-10 syllables (ensures smooth SHORT→LONG progression)

### Language-Specific Character Equivalents

The API converts syllable thresholds to characters using these ratios:

| Language | Chars/Syllable | SHORT (chars) | MEDIUM (chars) | LONG (chars) |
|----------|----------------|---------------|----------------|--------------|
| Chinese  | 1.0            | 3-5           | 6-9            | 10+          |
| Japanese | 1.5            | 5-8           | 9-14           | 15+          |
| French   | 3.5            | 11-18         | 21-32          | 35+          |
| Spanish  | 3.2            | 10-16         | 19-29          | 32+          |
| German   | 3.0            | 9-15          | 18-27          | 30+          |
| English  | 3.8            | 11-19         | 23-34          | 38+          |
| Italian  | 3.0            | 9-15          | 18-27          | 30+          |

## Phrase Progression: SHORT → LONG

Phrases must BUILD UP from simple to complex. Example for French (Seed 22+):

```
LEGO: "I want to" → "je veux"

SHORT (3-5 syllables) - need 2+:
  I want to speak → je veux parler (4 syl)
  I want to learn → je veux apprendre (5 syl)

MEDIUM (6-9 syllables) - need 2+:
  I want to speak French now → je veux parler français maintenant (8 syl)
  I want to learn with you → je veux apprendre avec toi (7 syl)

LONG (10+ syllables) - need 3+:
  I want to speak French with you tomorrow → je veux parler français avec toi demain (11 syl)
  I want to learn to speak French with my friends → je veux apprendre à parler français avec mes amis (14 syl)
  I want to learn French because it is beautiful → je veux apprendre le français parce que c'est beau (13 syl)
```

**TIP**: Count syllables in your target language text. Make LONG phrases genuinely 10+ syllables.

## Phrase Count Rules

### Seeds 1-5: Quality Over Quantity

Limited vocabulary means limited phrase options. **Don't pad with garbage to hit a count.**

- **Minimum**: At least 1 phrase per LEGO
- **Maximum**: As many as meaningfully possible
- Exhaust all semantically valuable, high-quality phrases
- If only 2-3 good phrases exist, submit 2-3 phrases

### Seeds 6+: Full Phrase Sets

By seed 6, vocabulary should support 10-12 phrases per LEGO.

**What counts toward the 10-12:**
- BUILD phrases (showing LEGO construction)
- USE phrases (complete sentences using the LEGO)

**What does NOT count:**
- Component phrases (the individual parts of an M-LEGO)
- Components are generated automatically by the API

**Example for M-LEGO "I want to" → "je veux":**
```
Components (auto-generated, don't count):
  - I → je
  - want → veux

BUILD phrases (count toward total):
  - I want → je veux
  - I want to speak → je veux parler

USE phrases (count toward total):
  - I want to speak French → je veux parler français
  - I want to learn with you → je veux apprendre avec toi
  ... (aim for 10-12 total BUILD + USE)
```

## Phrase Focus: Recent Vocabulary

Prioritize combinations with RECENTLY introduced LEGOs:
- For LEGO at position N, prefer LEGOs from N-30 to N-1
- This ensures course coverage and reinforcement

## What NOT to Include

**NO explanations or annotations!**
All text becomes TTS audio. Annotations would be read aloud!

BAD:
- "I'm trying (progressive)" → je suis en train d'essayer
- "speak (verb)" → parler

GOOD:
- I'm trying → je suis en train d'essayer
- speak → parler

## Phrase Checklist

Before submitting, verify:

1. [ ] **SEMANTIC MATCH: Each known_text means EXACTLY the same as its target_text?** ⚠️ CRITICAL
2. [ ] Using only available vocabulary?
3. [ ] Enough SHORT phrases? (3-5 syllables: 1+ for seeds 6-20, 2+ for 21+)
4. [ ] Enough MEDIUM phrases? (6-9 syllables: 1+ for seeds 6-20, 2+ for 21+)
5. [ ] Enough LONG phrases? (10+ syllables: 2+ for seeds 6-20, **3+ for 21+**)
6. [ ] Smooth progression (some phrases in 5-10 syllable range)?
7. [ ] No annotations or explanations in text?
8. [ ] Recent vocabulary prioritized?
9. [ ] Attestation included? `attestation: { semantic_match_verified: true }`

## Example: Complete Phrase Set (Seed 25, French)

```
LEGO: "I can't" → "je ne peux pas"

SHORT (3-5 syllables) - need 2+:
1. I can't speak → je ne peux pas parler (5 syl)
2. I can't learn → je ne peux pas apprendre (5 syl)

MEDIUM (6-9 syllables) - need 2+:
3. I can't speak French now → je ne peux pas parler français maintenant (9 syl)
4. I can't learn with you → je ne peux pas apprendre avec toi (8 syl)
5. I can't speak with my friend → je ne peux pas parler avec mon ami (9 syl)

LONG (10+ syllables) - need 3+:
6. I can't speak French with you right now → je ne peux pas parler français avec toi maintenant (12 syl)
7. I can't learn to speak French with my friends → je ne peux pas apprendre à parler français avec mes amis (15 syl)
8. I can't speak French because I don't have time → je ne peux pas parler français parce que je n'ai pas le temps (14 syl)
9. I can't learn French with you tomorrow because I'm busy → je ne peux pas apprendre le français avec toi demain parce que je suis occupé (18 syl)
```

This set has: 2 SHORT, 3 MEDIUM, 4 LONG - passes all tier requirements.
