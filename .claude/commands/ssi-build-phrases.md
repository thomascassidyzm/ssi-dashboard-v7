# SSi Build Phrases

How to generate practice phrases for a LEGO in the SSi language learning system.

## Available Vocabulary

For LEGO N in seed S, you can ONLY use:
- This LEGO (N) itself
- All LEGOs from seeds 1 through S-1
- LEGOs 1 through N-1 from current seed S
- All M-LEGO components from above

**You CANNOT use LEGOs N+1, N+2, etc. from the same seed!**

## Phrase Tier Requirements (CRITICAL)

Validation checks phrase length tiers. Counting is by **words** for most languages, **characters** for Chinese/Japanese.

### Tier Minimums by Seed Number

| Seed Range | SHORT (3-5) | MEDIUM (6-9) | LONG (10+) | Middle (5-10) |
|------------|-------------|--------------|------------|---------------|
| **1-5**    | relaxed     | relaxed      | relaxed    | relaxed       |
| **6-20**   | 1+          | 1+           | **2+**     | 1+            |
| **21+**    | **2+**      | **2+**       | **3+**     | 2+            |

**Most common failure:** Not enough LONG phrases (10+ words). For seeds 21+, you need **at least 3 LONG phrases** and **at least 2 each of SHORT and MEDIUM**.

### What Counts as Each Tier (word count)

- **SHORT**: 3-5 words (e.g., "I want to learn")
- **MEDIUM**: 6-9 words (e.g., "I want to learn French with you")
- **LONG**: 10+ words (e.g., "I want to learn to speak French with you tomorrow")
- **Middle range**: 5-10 words (ensures smooth SHORT→LONG progression)

## Phrase Progression: SHORT → LONG

Phrases must BUILD UP from simple to complex. Example for French (Seed 22+):

```
LEGO: "I want to" → "je veux"

SHORT (3-5 words) - need 2+:
  I want to speak → je veux parler
  I want to learn → je veux apprendre

MEDIUM (6-9 words) - need 2+:
  I want to speak French now → je veux parler français maintenant
  I want to learn French with you → je veux apprendre le français avec toi
  I want to speak with my friend → je veux parler avec mon ami

LONG (10+ words) - need 3+:
  I want to speak French with you tomorrow morning → je veux parler français avec toi demain matin
  I want to learn to speak French with my friends → je veux apprendre à parler français avec mes amis
  I want to learn French because it is a beautiful language → je veux apprendre le français parce que c'est une belle langue
```

**TIP**: Make LONG phrases genuinely long (10+ words). A common mistake is submitting phrases that are only 8-9 words.

## Early Seeds: Relaxed Requirements

Seeds 1-5 have limited vocabulary. Tier checks are skipped.

**Seed 1, LEGO 1**: No phrases possible (nothing to combine with)
**Seed 1, LEGO 2**: 1-2 phrases (can only use L1)
**Seed 1, LEGO 3**: 2-4 phrases (can use L1, L2)
**Seeds 6-20**: Softened requirements (1+ SHORT, 1+ MEDIUM, 2+ LONG)
**Seeds 21+**: Full requirements (2+ SHORT, 2+ MEDIUM, 3+ LONG)

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

1. [ ] Using only available vocabulary?
2. [ ] Enough SHORT phrases? (1+ for seeds 6-20, 2+ for 21+)
3. [ ] Enough MEDIUM phrases? (1+ for seeds 6-20, 2+ for 21+)
4. [ ] Enough LONG phrases? (2+ for seeds 6-20, **3+ for 21+**)
5. [ ] Smooth progression (some phrases in 5-10 word range)?
6. [ ] No annotations or explanations in text?
7. [ ] Recent vocabulary prioritized?

## Example: Complete Phrase Set (Seed 25)

```
LEGO: "I can't" → "je ne peux pas" (has 50+ prior LEGOs available)

SHORT (3-5 words) - need 2+:
1. I can't speak → je ne peux pas parler
2. I can't learn → je ne peux pas apprendre

MEDIUM (6-9 words) - need 2+:
3. I can't speak French now → je ne peux pas parler français maintenant
4. I can't learn with you → je ne peux pas apprendre avec toi
5. I can't speak with my friend → je ne peux pas parler avec mon ami

LONG (10+ words) - need 3+:
6. I can't speak French with you right now → je ne peux pas parler français avec toi maintenant
7. I can't learn to speak French with my friends today → je ne peux pas apprendre à parler français avec mes amis aujourd'hui
8. I can't speak French because I don't have enough time → je ne peux pas parler français parce que je n'ai pas assez de temps
9. I can't learn French with you tomorrow because I am busy → je ne peux pas apprendre le français avec toi demain parce que je suis occupé
```

This set has: 2 SHORT, 3 MEDIUM, 4 LONG - passes all tier requirements.
