# eng_for_hin — applying Kai's कल ruling course-wide

**Date:** 2026-09-03 · **Course:** `eng_for_hin` (known = Hindi, target = English), 668 seeds, `new_app_status: live`
**Ruling (Kai, 2026-09-03, verbatim):** *"we just need to make the legos larger so they always come in certain
contexts, and make sure it stays consistent the whole time - never use the word without a verb that gives the
past/future context."*

**Outcome in one line:** one change applied (seed 12, zero breakage, 40 downstream seeds unblocked); five bare
chunks measured and **deliberately not grown**, because in a verb-final language every candidate growth overlaps
a sibling LEGO — the numbers are below and the decision is Kai's.

---

## 1. The occurrence census

Word-boundary search for कल (Devanagari-letter boundaries, danda treated as a boundary; excludes विकल्प, कल्पना,
निकलने — the naive substring search has a 25% false-positive rate on this course).

| Where | Occurrences |
|---|---|
| `course_seeds.known_text` | **15** of 668 |
| `course_legos.known_text` | **12** of 1,489 |
| `course_legos.components` | **1** (S0012L03 — restored by this work; was 0) |
| `course_practice_phrases.known_text` | **312** of 10,953 (211 `use`, 101 `build`, 0 `component`) |

Spread: seeds 12 → 477, i.e. the whole course.

**Every one of the 312 phrases renders कल consistently**: 155 "tomorrow", 113 "yesterday", 41 "last night", 3
"tomorrow"-in-a-fragment. There is not one phrase where the English disagrees with the Hindi tense.

**Every chunk maps to exactly one sense, always.** Cross-tabulating tile × sense over all 312:

| Tile (LEGO) | Sense | Uses |
|---|---|---|
| `कल` S0030L03 | yesterday | 111 (+2 as `कल को`) |
| `कल सुबह` S0155L04 | tomorrow morning | 47 |
| `कल दोपहर` S0167L02 | tomorrow afternoon | 19 |
| `कल क्या होगा` S0012L03 | tomorrow | 16 |
| `कल रात` S0192L02 | tomorrow night | 12 |
| `मैं कल रात एक व्यक्ति से मिला` S0234L02 | last night | 11 |
| `वह कल आपसे पूछने वाला है` S0223L02 | tomorrow | 9 |
| `कल रात के मुक़ाबले` S0042L03 / `उन्होंने कल रात किसे देखा था` S0453L02 / `कल रात सब` S0278L02 | last night | 8 each |
| **no tile at all — untiled ghost** | tomorrow 52, last night 6 | **58** |

So there is **no ZUT collision** at tile level. The defects are of two other kinds, below.

---

## 2. How many already comply

Compliance test: does the chunk itself contain a finite verb (copula है/हैं/हूँ/हो/था/थी/थे, future -गा/-गे/-गी or
वाला है, a subjunctive, or a perfective participle)?

**LEGO chunks — 4 of 12 comply.** Every complying one is a *whole clause*:

| LEGO | Chunk | Verdict |
|---|---|---|
| S0012L03 | कल क्या होगा → *what's going to happen tomorrow* | ✅ होगा |
| S0223L02 | वह कल आपसे पूछने वाला है → *he's going to ask you tomorrow* | ✅ वाला है |
| S0234L02 | मैं कल रात एक व्यक्ति से मिला → *I met someone last night* | ✅ मिला |
| S0453L02 | उन्होंने कल रात किसे देखा था → *who they saw last night* | ✅ देखा था |
| S0030L03 | कल → *yesterday* | ❌ bare |
| S0042L03 | कल रात के मुक़ाबले → *than last night* | ❌ bare |
| S0155L04 | कल सुबह → *tomorrow morning* | ❌ bare |
| S0167L02 | कल दोपहर → *tomorrow afternoon* | ❌ bare |
| S0192L02 | कल रात → *tomorrow night* | ❌ bare |
| S0278L02 | कल रात सब → *everything last night* | ❌ bare |
| S0262L03 | कल → *yesterday* | ❌ bare, but `is_new=false`, 0 phrases → **generates no round; no learner meets it** |
| S0312L03 | कल रात → *tomorrow night* | ❌ bare, `is_new=false`, 0 phrases → same |

A LEGO's `known_text` is spoken to the learner twice — at **intro** and again at **debut**, and
`learning-script-generator.cjs:1290` says it outright: *"The debut IS the bare LEGO."* So each ❌ above with
`is_new=true` is a live prompt where a Hindi speaker is asked for an English tense direction the cue does not fix.
**Six such prompts.**

**Practice-phrase prompts — 283 of 312 comply.** Of the 29 that carry no finite verb, hand-reading each:

- **6** are fixed by a perfective/ergative my automated test missed (मैंने … पिया, किसी ने … बताया, … दिखा) — compliant.
- **10** are fixed by an elided present copula (`… कोई आपत्ति नहीं [है]`, `… चाहिए`, `… चाहते?`). Hindi present tense
  cannot combine with कल = yesterday, so the reading is pinned to *tomorrow* — compliant in effect.
- **12** are genuinely unanswerable fragments: `कल रात के मुक़ाबले बेहतर`, `या कि कल`, `कल सुबह मिलना`, `कल सुबह जागना`,
  `कल सुबह बात करना`, `कल सुबह किसी रेस्टोरेंट में जाना`, `कल दोपहर मिलना`, `कल दोपहर आराम करना`, `कल दोपहर बात करना`,
  `कल सुबह डॉक्टर के पास जाना`, `कल रात मिलना`, `कल रात आराम करना`. All are `build` rungs 1–3 of a bare adverbial LEGO;
  they are downstream of the LEGO problem, not separate from it. (A Hindi infinitive projects non-past, so these lean
  *tomorrow* pragmatically — but nothing in the prompt fixes it.)
- **1** is a mistranslation risk, not a chunking one: `305.1.5 वह औरत कल आपकी मदद कर देती।` → *"that woman would help
  you tomorrow"*. Bare imperfective `कर देती` is counterfactual and reads more naturally as **past** irrealis.
  **Flagged, not changed** — it is a translation question, not this ruling's.

---

## 3. What was changed

### Seed 12 — restored the component `कल → "tomorrow"` on S0012L03

`PATCH /api/production/eng_for_hin/lego/S0012L03` with `{"components": [{"known":"कल","target":"tomorrow"},
{"known":"क्या होगा","target":"what will happen"}]}`. Version 109 → 110.

**Why this is the ruling, not a reversal of it.** A `course_legos` component is **not a prompt**. On the real learner
path `ssi-learning-app/api/courses/[code]/cycles.ts:774` states and enforces it — *"Component rows never produce a
cycle of any kind: components are never introduced … via `lego.components` on the intro and debut cards"* — and the
cycle builder only ever emits `phrase_role` `build`/`practice`/`use` (`cycles.ts:874-876`). The dashboard mirror
agrees (`learning-script-generator.cjs`: *"component cycles are NEVER emitted"*). A component is the **internal
alignment of its parent chunk**, drawn as a tile on that chunk's card. Here the parent chunk is `कल क्या होगा`, which
carries होगा. So कल comes, exactly as Kai asked, *inside a certain context* — and the learner is never asked to
answer it alone.

**What it fixes.** Before this, the English word *"tomorrow"* had **no teaching unit anywhere in the course** (a
sibling job removed this component earlier today on the belief that a component is a spoken cue). The consequence was
that 52 phrases carried कल in the Hindi prompt with **no chunk at all** on the tiling — the most extreme form of "used
without a context" — and 40 seeds failed the course's own write-time gate.

**Measured, through the dashboard's own validator** `POST /api/v2/validate/eng_for_hin`:

| | before | after |
|---|---|---|
| seeds failing | **86** | **46** |
| seeds newly passing | — | **40** (23–29, 44, 243, 252, 269, 305, 312, 316, 333, 334, 336, 391, 395, 397, 402, 405, 407, 418, 420, 423, 425, 434, 435, 445–448, 450, 456, 466, 470, 471, 473, 474) |
| seeds newly failing | — | **0** |

Independent local replay of the same whole-chunk DP: 268 → 213 untileable phrases, **55 fixed, 0 broken**.

**It also repairs the LEGO's partition.** S0012L03's components covered only `क्या होगा`, leaving कल unglossed inside
an M-LEGO — components are supposed to partition their LEGO.

**Audio: nothing nulled.** `updateLego` whitelists fields and `trg_null_lego_audio_on_text_change` has a `WHEN`
clause on `known_text`/`target_text` only. Verified in the response: `target1_audio_id`, `target2_audio_id` and
`presentation_audio_id` are byte-identical before and after; `known_audio_id` was already NULL. **No text changed
anywhere in this work, so no audio link was nulled and no audio pass is warranted.**

---

## 4. What was NOT changed, and why — the structural finding

**In a verb-final language, a कल chunk can only reach its verb by swallowing everything in between — and in all six
cases that material is already a separate LEGO.**

Hindi is SOV. कल is an adverbial near the front; the tensed verb is at the clause end; the object/complement sits
between them. The four chunks that *do* comply are all whole clauses. For the six that don't, here is the material
that stands between कल and the nearest finite verb, and who owns it:

| Seed | Bare LEGO | What lies between कल and the verb | Owner |
|---|---|---|---|
| 30 | `कल` | आपसे कुछ पूछना … चाहता था | S0030L01 + S0030L02 |
| 42 | `कल रात के मुक़ाबले` | ज़्यादा अच्छा महसूस करने लगा था | S0042L01 |
| 155 | `कल सुबह` | कुछ मिनट / इंतज़ार करने में / कोई आपत्ति नहीं | S0155L01-03 — **and the seed has no finite verb at all** |
| 167 | `कल दोपहर` | क्या करना है | S0167L01 |
| 192 | `कल रात` | व्यस्त हूँ | S0192L01 |
| 278 | `कल रात सब` | पूरा करना था | S0278L01 |

Six for six. So growth means one of three things, all forbidden or costly:

1. **Overlap a sibling LEGO** — LEGOs must partition, never overlap.
2. **A gapped chunk** — banned by this brief, and the same defect the चाहिए ruling was about.
3. **Absorb the sibling into one clause-sized LEGO** — allowed, and priced below.

### The price of option 3, measured

Dropping both LEGOs' targets from the inventory and re-running the whole-chunk DP over all 10,953 phrases:

| Seed | Merge | Phrases that stop tiling | own seed | **downstream** | seeds hit |
|---|---|---|---|---|---|
| 30 | S0030L03 + L01 + L02 | 124 | 24 | **100** | 48 |
| 155 | S0155L04 + L01-L03 | 77 | 32 | **45** | 32 |
| 167 | S0167L02 + L01 | 29 | 16 | **13** | 10 |
| 192 | S0192L02 + L01 | 22 | 16 | **6** | 5 |
| 42 | S0042L03 + L01 | 19 | 19 | **0** | 1 |
| 278 | S0278L02 + L01 | 16 | 16 | **0** | 1 |

And every merge removes one `is_new` LEGO, which removes one round — round numbers are assigned by walking `is_new`
LEGOs in order (`learning-script-generator.cjs:1214`, `loadAllUniqueLegos:732`), so **every later round in a live
course shifts**. That is a learner-progress migration, not a content edit.

### Seed 30 specifically — the trap, confirmed

`S0030L03 कल → "yesterday"` is the one the first attempt tried to grow and reverted. Confirmed independently:
**113 phrases tile through it; only 8 sit in seed 30's own चाहता था frame.** The other 105 use कल = yesterday in
frames that have nothing to do with it — *"I didn't sleep yesterday"* (55), *"I'm doing worse than yesterday"* (114),
*"we were talking about yesterday"* (143), on to seed 453. Dropping the unit costs **79 phrases across 43 seeds**.
Growing it is the wrong move, and no new chunk substitutes for it, because the phrase gate tiles from **whole chunk
strings** (`validation.cjs:253` `checkVocabViolations`) — the word *"yesterday"* is only reachable if some unit's
target is exactly `yesterday`. **Not changed.**

Seed 30's ladder is, for what it's worth, already compliant: all 8 of its practice phrases carry चाहता था. The one
bare exposure is the intro/debut of the LEGO itself.

### Not changed, and why, in one list

| Item | Decision |
|---|---|
| S0030L03 `कल` | **Not grown.** 79 phrases / 43 seeds stranded; no contiguous verb-adjacent span exists; the merge costs 124 phrases and a round. |
| S0042L03, S0155L04, S0167L02, S0192L02, S0278L02 | **Not grown.** Every growth overlaps a sibling LEGO. The compliant merge costs 16–77 phrases *and one round each* on a live course. |
| S0262L03, S0312L03 | **Not touched.** `is_new=false`, zero phrases → no round, no learner exposure. Dead rows. |
| The 12 verbless `build` rungs | **Not rewritten.** They are rungs 1–3 of the bare adverbial LEGOs; rewriting them without settling the LEGO leaves the debut prompt bare anyway, and rewriting live phrase text nulls audio for a cosmetic gain. |
| 305.1.5 `वह औरत कल आपकी मदद कर देती।` | **Flagged, not changed** — a translation question (irrealis reads past), not a chunking one. |
| The 58 untiled ghosts | **Not re-decomposed.** Their decompositions concatenate to their `target_text` correctly (checked; see §5) — the gap is known-side only, and the vocabulary they needed is now restored. A 58-row live rewrite for a display nicety is not warranted. |

---

## 5. The course-wide check after the boundary change

| Check | Result |
|---|---|
| Phrases whose stored decomposition references S0012L03 | **16** |
| …whose stored tile still equals the LEGO's current known text | **16** — 0 stale, 0 repaired needed |
| Decomposition blocks joined == `target_text`, whitespace-normalised, **whole course** | **10,931 / 10,931 ok, 0 mismatched** |
| Seeds failing `POST /api/v2/validate/eng_for_hin` | 86 → **46**, none newly failing |
| Audio links nulled by this work | **0** |
| TTS generated | **none** |
| Audio passes queued | **none** — no text changed, so none is warranted |

---

## 6. Does the rule now hold everywhere? — honest answer

**Partly, and here is the exact residue.**

- ✅ **No bare कल *practice* cue is untiled any more** — "tomorrow" has a teaching home again, inside a future-marked
  chunk, and the 40 seeds whose phrases could not tile now can.
- ✅ **The course is sense-consistent**: every chunk containing कल maps to exactly one English reading, in all 312
  phrases, with zero exceptions. A learner's operating rule for any chunk they are taught is never contradicted later.
- ✅ **283 of 312 spoken practice prompts** carry a tense-fixing verb; of the other 29, 16 are fixed by forms the
  automated test missed, leaving **12 fragments and 1 translation flag**.
- ❌ **Six LEGO intro/debut prompts remain bare** — S0030L03, S0042L03, S0155L04, S0167L02, S0192L02, S0278L02.
  This is the gap. It cannot be closed by growing the chunk, for the reason in §4, and closing it by merging costs
  a round each on a live course.

### The one real inconsistency still standing, for Kai

`कल रात` is taught as **"tomorrow night"** at seed 192 (bare, no verb) and used meaning **"last night"** inside four
chunks — at seeds 42 (also bare, no verb), 234, 278, 453. Seed 42 comes *first*. So the learner meets the same
two-word string in both senses, 150 seeds apart, and in the two places where it is a bare chunk, nothing fixes it.
This is the sharper twin of the seed 12 / seed 30 pair Kai spotted.

**A cheap fix exists that needs no verb and no merge:** Hindi has an unambiguous word for last night — **पिछली रात**
— and the learner already has पिछल- at seed 42 itself (`पिछले महीने → "than last month"`, phrase 42.2.3). Re-authoring
the four "last night" chunks to पिछली रात removes कल from every verbless chunk in that family and leaves `कल रात` with
one meaning. It changes Hindi text on a live course (≈36 rows, nulls their known-side audio links — acceptable
now that the course is being recast off retired xAI, but it is a real edit). **Not done: it substitutes a different
mechanism for the one Kai named, so it is Kai's call.**

### Options for the six bare LEGOs, priced

1. **Accept them.** Each is sense-consistent within the course; the ambiguity is theoretical, not a wrong answer a
   learner can actually give in a phrase. Cost: nothing. This is the status quo after this work.
2. **`is_new = false`** on the offenders — verified to generate no round (`loadAllUniqueLegos:732`) while staying
   tileable (`loadCourseVocab` does not filter on `is_new`). The bare prompt disappears, the tiling survives.
   Cost: one round each, so a round-number shift and a learner-progress migration on a live course.
3. **Merge to clause-sized LEGOs.** Fully compliant with the letter of the ruling. Cost: the table in §4 — 16–124
   phrases re-authored per seed, plus the same round shift.

---

## 7. How this was done

Content write went through the dashboard's own route — `PATCH /api/production/:courseCode/lego/:legoId`
(production-api, 3470). Verification through `POST /api/v2/validate/:course` (course-builder, 3471) and read-only
PostgREST queries. **No bespoke data script wrote anything.** Work ran strictly sequentially in ascending seed order,
one seed at a time; no seed ranges were sharded. One sub-worker was dispatched (**#324**, sonnet) and it was an
adversarial read-only verifier of the component claim in §3, not a builder.

Prior art, and the premise this work corrects: `docs/course-optimization/eng-for-hin-chunk-merges-hai-chahiye-kal-2026-09-03.md`.
