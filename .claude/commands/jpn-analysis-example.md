# Japanese Analysis Example (jpn_for_eng)

**Example Translation Analysis Output** - This file demonstrates what a completed Pass 1 analysis looks like for Japanese. Use this as a reference when building your own analysis for other languages.

The patterns below were discovered during Pass 1 translation of the 260 seeds. They are now applied during Pass 2 decomposition.

## Register: Casual-Polite (です/ます)

ALL Japanese output uses casual-polite register:
- Verb endings: ます form (話します, 食べます)
- Copula: です (not だ)
- Universally safe - not too formal, not too casual

**NEVER use:**
- Plain form endings (話す, 食べる) except in embedded clauses
- Keigo/super-polite forms unless contextually required
- Overly casual forms (俺, めっちゃ)

---

## Problem Verb ZUT Rules

These English verbs map to MULTIPLE Japanese verbs. Use the ENGLISH CHUNK to determine which Japanese form.

### REMEMBER vs RECALL

| English Chunk | Japanese | Meaning |
|--------------|----------|---------|
| "can remember", "remember for later" | 覚える / 覚えられる | RETAIN in memory |
| "trying to recall", "can't recall" | 思い出す / 思い出せない | RETRIEVE from memory |

**ZUT Rule:** If the canonical seed uses "remember" but means RETRIEVAL (trying to bring back forgotten info), change known_text to "recall".

**Examples:**
- "I'm trying to recall a word" → 言葉を思い出そうとしています (retrieval)
- "I can remember the sentence" → 文を覚えられます (retention)

### THINK

| English Chunk | Japanese | Meaning |
|--------------|----------|---------|
| "I think **that** X" | Xと**思う** | Opinion/belief |
| "think **about** X" | Xについて**考える** | Deliberate pondering |

**Examples:**
- "I think that it's good" → いいと思います (opinion)
- "I'm thinking about the answer" → 答えについて考えています (deliberate)

### KNOW

| English Chunk | Japanese | Meaning |
|--------------|----------|---------|
| "know" (fact/person/how-to) | 知る / 知っている | Factual knowledge |
| "understand", "know what I mean" | わかる | Comprehension |

**Examples:**
- "I know how to say it" → 言い方を知っています (procedural)
- "Do you know what I mean?" → 言いたいことがわかりますか (comprehension)

### LEARN

| English Chunk | Japanese | Usage |
|--------------|----------|-------|
| "learn a language", "study" | 勉強する | Academic learning |
| "learn/memorize X" (words, names) | 覚える | Commit to memory |
| "learn something new" | 学ぶ | Acquire knowledge |

**Examples:**
- "I'm learning Japanese" → 日本語を勉強しています
- "I want to learn this word" → この言葉を覚えたいです
- "There's more to learn" → まだ学ぶことがあります

### SEE

| English Chunk | Japanese | Meaning |
|--------------|----------|---------|
| "see" (visual), "watch", "look at" | 見る | Visual observation |
| "see you", "see (person)" | 会う | Meet person |
| "can see", "visible" | 見える | Perception ability |

**Examples:**
- "I want to see what you're doing" → 何をしているか見たいです
- "I want to see you tomorrow" → 明日会いたいです
- "I can't see it" → 見えません

### FEEL

| English Chunk | Japanese | Meaning |
|--------------|----------|---------|
| "feel" (sensation/emotion) | 感じる | Physical/emotional |
| "feel as if", "feel like" | 気がする | Impression/intuition |

**Examples:**
- "How do you feel?" → どう感じていますか
- "I feel as if I'm improving" → 上達している気がします

### GIVE

| English Chunk | Japanese | Direction |
|--------------|----------|-----------|
| "give (to someone)" | あげる | Outward from speaker |
| "give (to me)" | くれる | Toward speaker |

**Note:** くれる appears rarely in first 260 seeds. Prioritize あげる.

### HELP

| English Chunk | Japanese | Meaning |
|--------------|----------|---------|
| "help (with task)" | 手伝う | Assist with work |
| "help (enable/rescue)" | 助ける | Aid/save |

---

## Golden Key Patterns (Highest ROI)

These patterns appear most frequently. Teach them EARLY and use them to demonstrate grammar:

| Pattern | Japanese | Count in 260 seeds | Covers |
|---------|----------|-------------------|--------|
| want to V | V-stem + **たい** | 58 | want to, would like to |
| going to V | V + **つもり** | 18 | intention/plan |
| trying to V | Volitional + **としている** | 16 | attempt/effort |
| want someone to V | V-て + **ほしい** | 14 | desire for other's action |
| can V | Potential form | 12 | ability |
| start V-ing | V-stem + **始める** | 7 | inception |
| enjoy V-ing | V + **のが好き** | 7 | preference |

### The -たい Master Key

The -たい suffix is the SINGLE highest-value pattern:

| Form | Meaning | Example |
|------|---------|---------|
| -たい | want to | 話したい |
| -たくない | don't want to | 話したくない |
| -たかった | wanted to | 話したかった |
| -たくなかった | didn't want to | 話したくなかった |

**4 forms → 58 collocations covered**

---

## Character Consistency (Kanji Identity)

Same English verb = Same Japanese kanji root throughout all forms.

**CONSISTENT verbs (use these as anchors):**
- speak/talk → 話 (話す, 話したい, 話せる, 話し始める)
- say → 言 (言う, 言いたい, 言い方)
- meet → 会 (会う, 会いたい)
- read → 読 (読む, 読みたい)
- write → 書 (書く, 書きたい)
- go → 行 (行く, 行きたい)
- wait → 待 (待つ, 待ちたい)
- start → 始 (始める, 話し始める)

**INCONSISTENT verbs (handle carefully):**
- think → 思う OR 考える (disambiguate via chunk)
- learn → 勉強する OR 覚える OR 学ぶ (disambiguate via context)
- know → 知る OR わかる (disambiguate via chunk)
- see → 見る OR 会う OR 見える (disambiguate via context)

---

## M-LEGO Component Rules for Japanese

### Particles are NEVER components

Japanese particles (は, が, を, に, で, と, も) are INFERRED, never taught explicitly.

**WRONG:**
```json
{
  "type": "M",
  "known": "with you",
  "target": "あなたと",
  "components": [
    {"known": "you", "target": "あなた"},
    {"known": "with (particle)", "target": "と"}  // ❌ BULLSHIT
  ]
}
```

**RIGHT:**
```json
{
  "type": "M",
  "known": "with you",
  "target": "あなたと",
  "components": [{"known": "you", "target": "あなた"}]
}
```

### Verb suffixes are INFERRED

The -たい, -ます, -て forms are learned by contrast, never explained.

**WRONG:**
```json
{
  "components": [
    {"known": "speak", "target": "話す"},
    {"known": "want to suffix", "target": "たい"}  // ❌ BULLSHIT
  ]
}
```

**RIGHT:**
```json
{
  "type": "M",
  "known": "want to speak",
  "target": "話したい",
  "components": [{"known": "speak", "target": "話す"}]
}
```

Learner sees: speak → 話す, want to speak → 話したい. They infer たい = want to.

---

## Translation Reference

The complete 260-seed Japanese translations are at:
- `docs/experiments/japanese-mvp-260-complete.json`

Use this as the CANONICAL reference for:
- Correct Japanese forms for each seed
- Which problem verb variant to use
- ZUT-compliant English known_text (check for `english_canonical` field)

---

## Spacing Rules for Variant Forms

When a problem verb has multiple Japanese forms, maintain DISTANCE between introductions:

| Minimum Gap | Example |
|-------------|---------|
| 10+ seeds | think: 考える (seed 37) → 思う (seed 47) |
| 20+ seeds | see: 見る (seed 106) → 会う (seed 126) |
| 30+ seeds | know: 知る (seed 17) → わかる (seed 49) |

If variants appear too close, either:
1. Reorder seeds to increase distance
2. Chunk up the second form into a larger LEGO

---

## Quick Reference Card

```
REGISTER:     です/ます (casual-polite)
REMEMBER:     覚える (retain) vs 思い出す (recall)
THINK:        思う (that) vs 考える (about)
KNOW:         知る (fact) vs わかる (understand)
LEARN:        勉強する (study) vs 覚える (memorize) vs 学ぶ (acquire)
SEE:          見る (visual) vs 会う (meet) vs 見える (visible)
FEEL:         感じる (sensation) vs 気がする (impression)
GIVE:         あげる (to others) vs くれる (to me)
HELP:         手伝う (task) vs 助ける (rescue)

GOLDEN KEYS:  たい, つもり, ようとする, てほしい, potential form
ANCHOR VERB:  話す (speak) - use to demonstrate all patterns
```
