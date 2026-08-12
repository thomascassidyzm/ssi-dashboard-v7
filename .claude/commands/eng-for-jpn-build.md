# eng_for_jpn Course Build Brief

> **Course:** English for Japanese speakers | **Known:** Japanese | **Target:** English
> **Direction:** Japanese learners producing English sentences
> **Register:** です/ます (polite standard) on the Japanese known side
> **Seeds:** 300 (MVP) | **API:** POST /api/seed/complete?course=eng_for_jpn (port 3471)

---

## What This Course IS

The learner KNOWS Japanese. They are learning to SPEAK English. So:
- **Known text** = Japanese (what they already understand)
- **Target text** = English (what they're learning to produce)
- **LEGOs** decompose the **English target text** into chunks, each carrying a Japanese known gloss
- **Phrases** have Japanese on the known side, English on the target side
- The learner hears the Japanese prompt and produces the English response

This is the REVERSE of jpn_for_eng. All the Japanese grammar complexity lives in the known text (which the learner already understands). The teaching challenge is English — word order, articles, prepositions, phrasal verbs.

### Which side gets decomposed — the TARGET, always

**Decompositions preserve TARGET word order.** The chunk sequence follows the English sentence, and the Japanese glosses are segmented to sit underneath their English chunks — so where the two orders differ, the Japanese side deliberately reads out of order. That is the teaching: the learner sees how English grammar maps onto what they already know.

This is the same law that gives `cosa azul` the literal reading "thing blue" in a Spanish target — the known side is allowed to read wrong so the target order stays true. Applied to eng_for_jpn, English is the target, so English order wins:

```
Known:  英語を話したいです        (English-を speak-want)
Target: I want to speak English

CORRECT — chunks in English order, Japanese glosses reordered to follow:
  "I want to speak" ← 話したい
  " English"        ← 英語

WRONG — chunks in Japanese order:
  "English"         ← 英語
  "I want to speak" ← 話したい
```

Concatenating the chunks' **target** text must rebuild the English sentence exactly, in order. Concatenating the **known** glosses will NOT rebuild the Japanese sentence in its own order, and must not be expected to.

Ralph's "reconstructability is sacred" still holds in both languages — both sides rebuild from the same chunk set. What is fixed is the *sequence*, and the sequence is the target's.

---

## Two Build Modes

### Mode 1: Human + Single Agent (Seeds 1-10)

Seeds 1-10 are the foundation. They establish the core vocabulary and patterns that EVERY subsequent seed builds on. This requires careful human oversight.

**Workflow:**
1. Human and agent work together, one seed at a time
2. Agent drafts the seed decomposition and phrases
3. Human reviews for naturalness, pedagogical flow, and English quality
4. Submit via `curl -s -X POST "http://localhost:3471/api/seed/complete?course=eng_for_jpn" -H "Content-Type: text/markdown" --data-binary @/tmp/seedN.md`
5. Fix any validation errors and resubmit
6. Stop at seed 10 for checkpoint QA

**What to watch for:**
- English targets must be things a real person would say
- LEGOs must be small enough to recombine (2-4 English words)
- First 10 seeds establish the たい/ている/つもり patterns — get these right
- Vocab accumulates fast in seeds 1-10: speak, learn, English, with you, now, something, say, how to, as often as possible, practise, someone else, I'm going to, word, remember, try, today, as hard as I can, explain, what I mean, a little, sentence, the whole, I can remember, I'm not sure if, to finish, after you finish, I'd like, I'd like to be able to, tomorrow, to guess, I wouldn't like, what's going to happen

### Mode 2: Parallel Agents (Seeds 11-50)

After checkpoint 10 is approved, seeds 11-50 can be built by parallel Sonnet agents with minimal human oversight.

**Workflow:**
1. Launch N agents (recommend 4-8), each assigned a batch (e.g., 11-15, 16-20, 21-25...)
2. Each agent pulls vocab before EVERY seed: `GET /api/vocab/eng_for_jpn`
3. Each agent submits seeds sequentially within its batch
4. API validates atomically — agents fix and retry on failure
5. Human spot-checks periodically
6. Stop at seed 50 for checkpoint QA

**Agent instructions for parallel mode:**
- You MUST pull vocab before each seed — other agents may have added words
- Work sequentially within your batch (S11 before S12 before S13...)
- If you get a ZUT collision, upchunk — don't fight the API
- Keep heartbeat: `POST /api/heartbeat/eng_for_jpn` with `{"status":"working","current_seed":N}`

---

## Seed Markdown Format

```markdown
# Seed N
Known: [Japanese sentence]
Target: [English sentence]

## L1 [A] "Japanese chunk" → "English chunk"

BUILD:
- Japanese chunk → English chunk
- Japanese chunk + prior vocab → English phrase fragment
- Another combination → Another fragment

USE:
- Full Japanese sentence。 → Full English sentence. [score]
- Another sentence。 → Another sentence. [score]
(minimum 5 USE phrases, target 8, scored 5-9)

## L2 [M] "Japanese chunk" → "English chunk"
Components: component1 → comp1_target, component2 → comp2_target

BUILD:
- Japanese chunk → English chunk
- Combination → Combination

USE:
- Sentence。 → Sentence. [score]
(minimum 5 USE phrases)
```

**Key format rules:**
- Header: `# Seed N` then `Known:` and `Target:` lines
- LEGO headers: `## L{n} [{A|M}] "known" → "target"`
- Components line for M-LEGOs: `Components: known1 → target1, known2 → target2`
- BUILD phrases: `- known → target` (no scores, no periods)
- USE phrases: `- known。 → target. [score]` (with periods and scores)
- Scores 5-9 (7 is baseline good, 8-9 for natural/complex phrases)

---

## Decomposition Principles for eng_for_jpn

### The Core Question: "What English pattern does this LEGO teach?"

Since the learner already knows Japanese, decomposition should be driven by what's USEFUL in English:

1. **English verb phrases** make great LEGOs: "I want to speak", "I'm trying to learn", "I'm going to practise"
2. **English preposition phrases** are non-obvious for Japanese speakers: "with you", "with someone else", "in English", "after you finish"
3. **English time/place adverbs** are straightforward A-LEGOs: "now", "today", "tomorrow"
4. **English modal patterns** deserve their own LEGOs: "I'd like", "I wouldn't like", "I'm not sure if", "I can remember"

### Overlapping LEGOs

Use overlapping M-LEGOs when the English pattern differs from what a Japanese speaker would guess:

```
L2 [A] "練習をする" → "to practise"
L3 [M] "話す練習をする" → "to practise speaking"
  ← Overlapping: contains L2 "to practise"
  ← Reveals: English uses gerund after "practise" (practise speaking, not practise to speak)
```

```
L3 [M] "なりたいです" → "I'd like"
L4 [M] "話せるようになりたいです" → "I'd like to be able to speak"
  ← Overlapping: contains L3 "I'd like"
  ← Reveals: the "to be able to" pattern
```

### When NOT to overlap

If the English composition is obvious from the parts:
- "tomorrow" + "I want to speak" = "I want to speak tomorrow" — no overlap needed
- "in English" + "to guess" = "to guess in English" — no overlap needed

---

## Vocab Constraint — The Critical Rule

Every USE phrase can ONLY use English words (target side) from:
1. Earlier seeds (already completed)
2. Earlier LEGOs within the SAME seed

**This means:** L1's USE phrases have almost no vocabulary to work with (only prior seeds). L4's USE phrases can use L1+L2+L3+prior seeds.

**Practical impact on early seeds:**
- S1 has ZERO prior vocab — L1 USE phrases are minimal ("I want to speak.")
- S2 can use S1's vocab (speak, English, with you, now, I want to)
- By S5, there's enough vocab for interesting 8-syllable sentences
- By S10+, there's rich recombination potential

**The /api/vocab endpoint returns a COMMA-SEPARATED STRING.** Parse it properly:
```javascript
const words = vocabData.vocab.split(',').map(w => w.trim());
```

---

## English Quality Standards

The English targets are what learners will actually SAY. They must be:

1. **Natural** — "I want to speak English with you now" not "Now I want English speaking with you"
2. **Complete sentences** in USE phrases — always with subject, verb, object as needed
3. **Conversational register** — not too formal, not slang
4. **Useful things to say** — phrases a language learner would actually need

**Common English patterns to establish early:**
- "I want to [verb]" (S1)
- "I'm trying to [verb]" (S2)
- "how to [verb]" (S3)
- "something" / "in English" (S4)
- "I'm going to [verb]" (S5)
- "I'm trying to remember" (S6)
- "as hard as I can" (S7)
- "what I mean" / "to try to explain" (S8)
- "a little" (S9)
- "I'm not sure if" / "I can remember" (S10)
- "I'd like to be able to" / "after you finish" (S11)
- "I wouldn't like" / "what's going to happen" (S12)

---

## Problem Verb Disambiguation

These English verbs are ambiguous for Japanese speakers. The Japanese known text disambiguates which English verb to use:

| Japanese Known | English Target | NOT |
|---|---|---|
| 話す | speak / talk | say |
| 言う | say / tell | speak |
| 覚える | remember (retain) | recall |
| 思い出す | remember (retrieve) / recall | |
| 思う | think (that) | think (about) |
| 考える | think (about) | think (that) |
| 知る | know (fact) | understand |
| わかる | understand / know what I mean | know (fact) |

---

## ZUT Collision Patterns

The API will reject if the same English chunk maps to a different Japanese chunk in an earlier seed. Common collisions:

- **"I want"** — established early as たい form. Don't introduce ほしい as "I want" — use "I want [someone] to" for ほしい
- **"to speak"** vs **"to talk"** — keep them distinct (話す for both, but chunk differently)
- **"remember"** — 覚える vs 思い出す both want "remember". Use "recall" for 思い出す

**Fix pattern:** When ZUT blocks you, upchunk the colliding piece into a larger M-LEGO that gives it unique English context.

---

## API Quick Reference

```bash
# Submit seed
curl -s -X POST "http://localhost:3471/api/seed/complete?course=eng_for_jpn" \
  -H "Content-Type: text/markdown" --data-binary @/tmp/seedN.md

# Check vocab (PARSE THE CSV!)
curl -s "http://localhost:3471/api/vocab/eng_for_jpn"

# Resume after compaction
curl -s "http://localhost:3471/api/resume/eng_for_jpn"

# Heartbeat
curl -s -X POST "http://localhost:3471/api/heartbeat/eng_for_jpn" \
  -H "Content-Type: application/json" -d '{"status":"working","current_seed":N}'

# Course stats
curl -s "http://localhost:3471/api/stats/eng_for_jpn"
```

---

## Checkpoint Schedule

| Checkpoint | Seeds | Approval |
|---|---|---|
| 10 | 1-10 | Human review required |
| 50 | 11-50 | Human spot-check + stats review |
| 150 | 51-150 | QA agent or human |
| 300 | 151-300 | QA agent or human |

At each checkpoint, review:
- Phrase count per seed (target 7-10 per LEGO)
- English naturalness (spot-check 10 random USE phrases)
- LEGO count (3-5 per seed average)
- Vocab growth curve (should be flattening by seed 100+)
- No giant single-LEGO seeds

---

## Worked Example: Seed 1

```
SEED: 今あなたと英語を話したいです。
TARGET: I want to speak English with you now.

Analysis:
- "I want to speak" — core pattern, first thing learner says
- "English" — what they're learning
- "with you" — preposition phrase (non-obvious for Japanese speakers)
- "now" — simple adverb

Decomposition:
L1 [M] "話したい" → "I want to speak"
  BUILD: 話したい → I want to speak
  USE: 話したいです。 → I want to speak. [7]

L2 [A] "英語" → "English"
  BUILD: 英語を話したい → I want to speak English
  USE: 英語を話したいです。 → I want to speak English. [8]

L3 [M] "あなたと" → "with you"
  BUILD: あなたと話したい → I want to speak with you
  USE: あなたと話したいです。 → I want to speak with you. [8]
       あなたと英語を話したいです。 → I want to speak English with you. [8]

L4 [A] "今" → "now"
  BUILD: 今話したい → I want to speak now
         今英語を話したい → I want to speak English now
  USE: 今あなたと英語を話したいです。 → I want to speak English with you now. [8]
       今話したいです。 → I want to speak now. [7]
       今英語を話したいです。 → I want to speak English now. [7]
```

Notice: S1 has 4 LEGOs, 12 phrases. L1 only has 1 USE phrase (no prior vocab). By L4, there's enough vocab for 3 USE phrases with varied combinations.

---

## Worked Example: Seed 12 (with rich prior vocab)

```
SEED: 明日何が起こるか当てたくありません。
TARGET: I wouldn't like to guess what's going to happen tomorrow.

By S12, the learner knows: speak, learn, English, with you, now, something,
say, how to, as often as possible, practise, someone else, I'm going to,
word, remember, try, today, explain, what I mean, a little, sentence,
the whole, I can remember, I'm not sure if, finish, after you finish,
I'd like, I'd like to be able to...

L1 [A] "明日" → "tomorrow"
  8 USE phrases mixing "tomorrow" with all prior vocab

L2 [A] "当てる" → "to guess"
  8 USE phrases: "I want to guess", "I'm trying to guess in English"...

L3 [M] "したくありません" → "I wouldn't like"
  8 USE phrases: "I wouldn't like to speak now", "I wouldn't like to finish today"...

L4 [M] "当てたくありません" → "I wouldn't like to guess"
  Components: I wouldn't like → したくありません, to guess → 当てる
  8 USE phrases mixing with tomorrow, in English, after you finish...

L5 [M] "何が起こるか" → "what's going to happen"
  8 USE phrases culminating in the full seed sentence
```

5 LEGOs, ~40 USE phrases. Rich recombination because of 11 prior seeds of accumulated vocab.

---

## Common Mistakes to Avoid

1. **Giant single M-LEGOs** — Never wrap the whole seed in one LEGO. Break it into 3-5 pieces.
2. **English that sounds translated** — "I want speaking English" is wrong. "I want to speak English" is right.
3. **Forgetting the vocab constraint** — L1 can only use prior seeds' vocab. Check before writing phrases.
4. **Scoring too high** — Score 7 for solid phrases, 8 for good recombination, 9 for excellent. Don't give everything 9.
5. **Too few USE phrases** — Minimum 5 per LEGO, target 8. More is fine for early LEGOs with rich vocab.
6. **Phrases that aren't complete sentences** — USE phrases must be full sentences with periods and scores.
7. **BUILD phrases with periods/scores** — BUILD phrases are fragments. No periods, no scores.

---

## Supplementary Documents

- `layered-decomposition-brief.md` — Overlapping LEGO theory (written for jpn_for_eng but principles apply)
- `jpn-analysis-example.md` — Problem verb disambiguation
- `ralph-methodology.md` — Complete SSi methodology
- `ssi-phrase-variety.md` — Phrase variety guidelines

*Brief created 2026-02-16 after seeds 1-12 human+agent session.*
