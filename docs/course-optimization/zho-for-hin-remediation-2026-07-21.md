# zho_for_hin — remediation queue (build of 2026-07-21)

Build orchestrated by Claude; three sequential Sonnet builders. Seeds 1-300.
**Nothing in this list has been applied.** All items were deliberately batched rather than
patched mid-build, to avoid contending with the live builder for the same rows.

Defect counts were re-checked repeatedly during the build and are **frozen** — none of these
spread beyond the seeds listed.

---

## Blocker

The production API exposes **no phrase IDs**. `GET /api/production/<course>/seed/N/baskets`
returns phrase `known`/`target`/`position`/`word_count`/`lego_count` but no `id`, and
`/seed/N/phrases` + `GET /lego/<id>` do not exist. The documented repair path
(`PATCH /api/production/<course>/phrase/PHRASE_ID`) therefore has no ID source.

Phrase-level items below need either a route that exposes IDs, or direct DB access
(`.env.psql` is **not** provisioned on this machine).

LEGO-level items are reachable now via `PATCH /api/production/zho_for_hin/lego/<LEGO_ID>`,
but note that changing a LEGO target requires rewriting every phrase that contains it as a
literal substring — so they are not one-line fixes either.

---

## 1. Canonical translation defects (`course_seeds`) — needs seed-text edit + re-decompose

These are wrong in the **canonical target**, not in the decomposition. `/api/seed/complete`
always pulls `target_text` from the existing `course_seeds` row, so no build-stage fix reaches them.

| seed | canonical target | problem | suggested |
|---|---|---|---|
| S0050 | `我不是想尽快做完。` | Hindi = "am not **trying**"; 不是想 = "it's not that I want" | `我没在试着尽快做完。` |
| S0103 | `我们不是想听更多词。` | same | `我们没在试着听更多词。` |
| S0108 | `我们没有希望在半夜醒来。` | Hindi = "did not **want**"; 没有希望 = "have no hope" | `我们不想在半夜醒来。` |

⚠️ S0050/S0103 are negated **trying** — `不想` would also be wrong there. S0108 is negated
**wanting**, where `不想` is correct. Easy to conflate.

**Base rate checked:** of 8 canonical seeds with negated volition, 5 are correct
(S0035 `不想读`, S0071 `不想让`, S0099 `为什么不行`, S0146 `试图…不管用`, S0211 `不想解释`).
These 3 are outliers, NOT a systematic translation-pass failure.

---

## 2. LEGO targets that absorb frame material

Rule: for every character in the target, ask which Hindi word *in this LEGO* it answers to.
If it answers to a word outside the LEGO, it does not belong.

| lego | known → target | problem |
|---|---|---|
| S0054L01 | `हम चाहते थे` → `我们想再` | 再 ("again") absorbed from the 再…多一点 construction. Every phrase in the basket drills a spurious "again" (`我们想再学习` = "want to study *again*"). Also forced collateral drift at S0107 (`希望` for `想`). |
| S0071L02 | `कोई भी` → `让任何人` | 让 is the matrix verb's causative. Should be `任何人`. |
| S0079L02 | `सीखना शुरू किया` → `开始学的` | 的 belongs to the 是…的 past construction. Should be `开始学`. |
| S0095L04 | `घर जाना` → `回家了` | 了 is the frame's change-of-state marker. Should be `回家`. |
| S0094L04 | `जिससे यह काम करेगा` → `可行的` | absorbs attributive 的, AND collapses a relative clause to a bare adjective (meaning loss). 7 words on the known side. |

Not defects, for contrast: `不同的`, `真的` (的 is part of the word);
`S0093L01 该走了` (了 is inseparable from the 该…了 construction).

---

## 3. LEGOs failing the standalone-grammaticality test

| lego | known → target | problem |
|---|---|---|
| S0026L03 | `जैसे मैं लगभग जाने के लिए तैयार हूँ` → `自己快要准备好了` | 自己 needs a licensing 感觉; drilled alone (`明天自己快要准备好了`) it dangles. Also drops जाने के लिए ("to go"). 8 words. |
| S0069L01 | `वह नहीं करना चाहता था` → `他不想` | fails on the **known** side: करना torn from the compound verb देखभाल करना, and करना then appears in two LEGOs of the same seed. |
| S0108L01 | `हम जागना नहीं चाहते थे` → `我们没有希望` | target standalone = "we have no hope"; drops जागना entirely. Fix alongside item 1's S0108. |

---

## 4. LEGO targets that are semantically wrong or drifted

| lego | known → target | note |
|---|---|---|
| S0007L02 | `कोशिश करना` → `努力` | Defensible *inside* its seed (`尽可能努力` is natural), but as a generic gloss it teaches "strive" for "try". Now demonstrably collides with `मेहनत → 努力` (S0109L02) and `मेहनत करना → 努力工作` (S0106L03), which own 努力 correctly. |
| S0011L03 | `बोल पाना` → `能够开口说` | Padded to dodge a ZUT collision (说 / 会说 taken). Clunky drilled alone. 10 phrases. |
| S0056L01 | `ताकि` → `所以` | Purpose vs result. ताकि = "so that"; 所以 = "therefore". Should be 为了 / 好让 / 以便. 12 phrases. |

**Do NOT treat the कोशिश family as broadly broken.** Earlier in this build I over-called it.
The canonical translations render कोशिश seven ways by context — `试试`, `试图`, `尽力`, `努力`,
`想` — and that variation is *correct* translation practice, since Chinese has no single word
for "try". Only the items listed here are defective.

---

## 5. Phrase-level text errors (blocked on phrase IDs)

| seed | phrase | problem |
|---|---|---|
| S0003L01 | `चीनी कैसे बोलना है?` → `中文怎么说?` | Hindi = "how to speak Chinese"; 中文怎么说 = "how do you say it *in* Chinese". |
| S0003L02 | `मैं बार-बार कोशिश कर रहा हूँ।` → `我经常试试。` | 试试 (tentative) clashes with 经常 (habitual); tense mismatch too. |
| S0008L03 | `चीनी मतलब` → `中文意思` | Hindi needs the genitive: `चीनी का मतलब`. Phrase-level only, no LEGO behind it. |
| S0037L03 | `我想认真想。` ×3 | Bare 想 for "think" needs an object or reduplication (`想一想`). Corrected in later seeds. |
| S0037L04 | `अभी इसके बारे में` → `现在这件事` | Meaningless fragment in both languages. |

---

## 6. Thin baskets — seeds 1-3 need phrase backfill

| seed | phrases per LEGO |
|---|---|
| S0001 | 3, 2, 6, 4, 2 |
| S0002 | 3, 3 |
| S0003 | 3, 3, 3 |
| S0004+ | 8-11 throughout |

Brief requires **min 5 USE per LEGO**; these have 2-3 phrases *total* per LEGO.
**The API does not enforce the min-5 floor** — these passed validation. Course-wide ratio
reads healthy because later seeds dilute them.

Worst possible location for thin baskets: the learner's first contact with the course.

---

## 7. Canonical seed-source duplicates

Scanned all 300 canonical targets. **2 duplicates** (low base rate — not a systemic seed-source problem),
but both matter:

**S0068 / S0194 — fully identical seed, both sides:**
`आप क्या ढूँढ रहे हैं?` → `你在找什么？`

This is a duplicate in the seed source itself. It will trigger the empty-seed mechanism at S0194
(every lego an exact prior hit → `is_new:false` → all baskets skipped). Builder 3 was warned in
advance and instructed to rebracket. **Worth checking whether this duplicate exists in the shared
canonical seed list — if so it affects every course built from it, not just zho_for_hin.**

**S0123 / S0124 — identical Chinese target, different Hindi:**

| seed | known | target |
|---|---|---|
| S0123 | `मुझे लगता है कि वह एक अच्छा विचार है।` | `我觉得那是个好主意。` |
| S0124 | `मुझे लगा कि वह एक अच्छा विचार था।` | `我觉得那是个好主意。` |

The Hindi differs only in tense (लगता है / लगा, है / था); Chinese does not mark it there, so the
canonical translator produced the same sentence. Consequence: S0124 registered `我觉得` and
`那是个好主意` as **new a second time** (`is_new:true` on both), so its 22 phrases drill Chinese
already fully covered by S0123.

Not a builder error — built as given. A tense-preserving rendering (e.g. `我当时觉得…`) would
distinguish them. Decide whether to re-render S0124's canonical target or accept the redundancy.

---

## 8b. `S0096L02` और → 还 — HIGHEST-VOLUME DEFECT IN THE BUILD

**87 phrases across 37 seeds** contain 还; **57 of them are sentence-initial `还，`**, which is not
grammatical Chinese.

और is primarily a **conjunction** ("and"); 还 is an **adverb** ("also/still"). They are not
equivalent:
- sentence-initial "and / moreover" → 而且 / 还有
- noun-joining और → 和 — **which this course already teaches at S0001** as a component
  (`और / के साथ → 和`). So और currently maps to BOTH 和 (S1 component) and 还 (S96 lego).

Once `और → 还` was locked at S0096L02, ZUT **forced** every later phrase using और to render it as
还, so the ungrammatical openings propagated automatically. This is a root-cause LEGO defect, not
builder sloppiness — I initially mis-attributed it to the builder before checking the lock.

Fix requires re-targeting S0096L02 (likely to 而且 or 还有, or splitting the conjunction vs adverb
senses into distinct known-strings) and rewriting the 57 affected phrases. The 30 non-initial,
adverbial uses of 还 are probably fine and should be checked individually, not swept.

**Lesson for the remediation pass: check whether a recurring "builder error" is actually a locked
LEGO before treating it as a builder problem.** Under ZUT, one bad early mapping propagates by
construction, and the volume of a defect is a signal of a lock, not of carelessness.

---

## 8. S0132 — weak phrases admitted by score inflation

Builder 3 hit `known_score < 5` rejections at S0132, misread the message, and cleared them by
raising the `[N]` brackets to 5 rather than rewriting. Its original 3-4 scores were **correct** —
the phrases are defective:

| defect | examples |
|---|---|
| `还，` as sentence-initial "and" — not how 还 works | `还，这是她说的` / `还，那不如` / `还，那么令人兴奋` (all three baskets) |
| `那不如吗？` ungrammatical — 不如 needs an object of comparison | S0132L02 |
| `那么令人兴奋。` a fragment presented as a sentence (Hindi side IS complete) | also `好的，那么令人兴奋。`, `这是真的，那么令人兴奋。` |
| worst lead-in monotony in the build | 我知道 / 我们知道 / 这是真的 / 这就是为什么 / 现在 / 好的 recycled across all 3 baskets |

Root cause of the confusion is a real infra bug — see below. Builder corrected going forward:
score honestly, rewrite-or-drop rather than bump, and fewer strong phrases beat padded volume.

### 🐛 Infra bug worth fixing in the repo

`services/course-builder/lib/markdown-parser.cjs:145-148` — a single `[N]` bracket sets
`score`, `known_score` AND `target_score` all to N. `services/course-builder/lib/phrase-structure.cjs:167-172`
then rejects any USE phrase with `known_score < 5`, with the message:

> `N USE phrase(s) have known_score < 5 (broken English). Remove or rewrite them.`

Two problems: **"broken English" is hardcoded** and wrong on any course whose known side is not
English (here it is Hindi), and the message presents as an automated language-quality assessment
when it is only echoing the builder's own self-assigned number. A builder that reads it literally
will rewrite perfectly good known-side text chasing a non-existent language defect — which is
exactly what happened. Suggest: name the known language dynamically, and say the score is
self-assigned (e.g. "you scored these below 5 — rewrite or drop them").

---

## Verified-clean (do not re-litigate)

- **Devanagari integrity** — no dropped matras, truncation, or mixed-script artifacts, seeds 1-300.
- **Empty seeds** — S0081 was the only one; root-caused and repaired (see below). Zero regressions
  after post-submit verification was introduced.
- **Vocab leaks** — 用 debuts S4, 今天 debuts S7; seed 8's use of both is legitimate.
- **कोशिश family** — see the warning in item 4.
- Bare वह deliberately never taught standalone (Hindi is gender-neutral, Chinese forces 他/她).
  Consistent across all 300 seeds **by design** — but it means a learner never acquires standalone
  "he/she". Flagged for a methodology decision; the platform's gender-pair / `gender_expansions`
  mechanism may be the correct resolution.

---

## Root causes worth carrying to other courses

**Empty seeds** — when EVERY lego in a seed is an exact prior known+target hit, dedup sets
`is_new:false` and skips all baskets, leaving the seed registered but basketless. It passes
validation, `stats.seeds_with_legos` **counts** it, and `/api/resume` advances past it, so the
hole is permanent and invisible to counters. Only a per-seed baskets scan finds it.
Fix pattern: rebracket into a discontinuous M-LEGO spanning the gap.
Risk rises with seed number. **deu_at 67/305/321 and ara_eg 305/321 fit this profile and are
currently attributed to a seed-source bug — worth re-checking.**

**LEGO length drives phrase variety** — measured over 698 phrases: 17.9% repeated lead-ins under
≤2-word LEGOs vs 39.8% under ≥4-word LEGOs. Containment freezes everything inside a fused chunk,
so the only remaining variation is the lead-in, and lead-ins repeat. Length creep is an *early
warning* of decline: builder 2's mean rose 2.00→3.38 words **before** its volume fell 9.1→8.1.

**Length inflation may be intrinsic to course depth** — mean LEGO length rose monotonically
2.29 → 3.09 → 3.85 → 4.27 words across bands S92-120 while phrase volume held. As a course
accumulates locked vocabulary, more senses need bundling to obtain a distinct known_text, so
collision pressure grows with seed number. If so, the 2-4 word target is realistic early and
progressively unachievable later — check late-course LEGO lengths on finished courses.
