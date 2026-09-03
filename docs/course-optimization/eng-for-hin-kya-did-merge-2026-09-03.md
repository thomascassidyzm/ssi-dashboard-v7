# eng_for_hin — क्या glossed as "did": merged, not retired

**Date:** 2026-09-03 · **Course:** `eng_for_hin` (known = **Hindi**, target = **English**) · **Live** (`new_app_status: live`)
**Kai's ruling:** 2026-09-03 · **Precedent:** job #323, `docs/course-optimization/eng-for-hin-bare-copula-cue-merges-2026-09-03.md` §5a, which found this defect and parked it.

**Applied to the live Supabase and verified live.** Two cues merged away, one LEGO grown,
eight decompositions re-pointed. **Zero audio pointers lost on any surviving row. Zero rounds moved.
No TTS generated.** One cost, stated plainly in §6: one presentation slot is now silent.

---

## 0. Kai's two questions, answered first

> *"Why does 385 use it? Is it in the seed?"*

**Yes — and that changes the fix.** Seed 385's own sentence is:

| | |
|---|---|
| known (Hindi) | `क्या आप उससे सहमत थे?` |
| target (English) | `Did you agree with her?` |

`क्या` is in seed 385 in its own right. So 385 does not need to borrow anything from 355 — under
Kai's explicit permission it **introduces its own question chunk**, and that is what was done.

> *"Can we just merge the 'did' with a sister lego?"*

**The merge was already available and nothing had to be invented.** `क्या → "did"` was never a
top-level LEGO. It was the first entry in `course_legos.components` on `S0355L03`, whose parent
already carries the whole Hindi chunk *and* the whole English chunk:

```
S0355L03   क्या उसे  →  "did she"      components: [ {क्या → did}, {उसे → she} ]
```

So the licensing chunk was whole and the particle was being split back out *below* it — exactly the
shape #323 fixed six times. Merging the two components into the parent is Kai's merge, performed
without growing either side and without smuggling anything in.

**It is also the course's own convention.** Of the 15 LEGOs in this course whose English begins
"did", **14 carry no component split at all** — `क्या आप चाहते थे → "did you want"` (32),
`क्या आपने देखा → "did you watch"` (220), `क्या वह चाहता था → "did he want"` (349),
`क्या वे चाहते थे → "did they want"` (442), and ten more. `S0355L03` was the sole outlier.

### One premise in the brief was wrong, and it mattered

> *"क्या is the course's ONLY source of the English tile 'did'."*

Not as stated. **15 LEGOs produce "did"** in their target text. What was unique was the *bare
one-word tile* `"did"`, which existed only as that component. And the five phrases at 385 do **not**
reach it through the decomposition at all — they carried `"did"` as a **ghost tile**
(`legoId: null, isGhost: true`), i.e. as un-attributed material. The dependency was in the
**vocabulary gate**, not on the learner's path. That distinction is what made the fix affordable.

---

## 1. What was changed

### A. Seed 355 — `S0355L03`: components merged away

| | before | after |
|---|---|---|
| type | `M` | `A` (the type all 14 sibling क्या-chunks use) |
| known → target | `क्या उसे → "did she"` | **unchanged** |
| components | `[{क्या → did}, {उसे → she}]` | `null` |
| component phrase rows | `S0355L03C01`, `S0355L03C02` | **deleted** |
| build/use phrases | positions 3–11 | renormalised to 1–9 |
| audio on the parent | known + target1 + target2 + presentation | **all four kept** (text never changed) |

`उसे → "she"` went with it. It fails the same test: `उसे` standing alone is the dative *"to
him/her"*, not the subject *"she"* — the subject reading is licensed by the obligation frame around
it. Merging both is what leaves one honest unit rather than one honest unit plus a leftover.

### B. Seed 385 — `S0385L01`: grown to its own seed sentence

| | before | after |
|---|---|---|
| known | `उससे सहमत थे` | `क्या आप उससे सहमत थे` |
| target | `"agree with her"` | `"did you agree with her"` |
| components | `[{उससे→her},{सहमत→agree},{थे→were}]` | **unchanged** |

This is contiguous on both sides, ZUT-unique (it is the seed sentence; no other LEGO carries either
string), and it now covers seed 385's known side **whole — no overlap, no gap**, where before
`क्या आप` was covered by no LEGO of that seed at all.

It fixes three things at once:

1. 385 no longer depends on 355's tile — it introduces the construction itself, as Kai proposed.
2. Five decompositions stop carrying a ghost `"did"`.
3. **It fixes #323's flag 5d.** `उससे सहमत थे → "agree with her"` glossed a **past** Hindi chunk
   (`थे`) with **present** English. `"did you agree with her"` is correctly past.

### C. Eight decompositions at seed 385 re-pointed

Five USE phrases and one BUILD collapsed `[ghost "did"][S0334L01 " you"][S0385L01 " agree with her"]`
into the single real tile `[S0385L01 "did you agree with her"]`. The two earlier BUILD steps
(`"agree with her"`, `"you agree with her"`) are now partials of their grown LEGO and are tiled from
their parts instead. **No phrase text was changed**, so no phrase audio moved.

---

## 2. Measured, not assumed — the vocabulary gate, before and after

Run with the course-builder's own `checkVocabViolations` (`services/course-builder/lib/validation.cjs`)
over **every phrase in the course**, with vocabulary accumulated **progressively** — a phrase at seed
*N* may only tile from chunks taught at or before *N*, which is the question the brief actually asks.

**Re-baselined against the live DB immediately before the change**, because #327 (कल) and #328
(question word order) are working the same course today. The brief's figure of 46 failing seeds was
stale.

| | phrases failing | distinct seeds failing |
|---|---|---|
| **Before** (live, 2026-09-03) | **213** | **45** |
| **After** (live, verified) | **219** | **45** — *identical set* |
| Phrases that **lost** tileability | **6** | — |
| Phrases that gained | 0 | — |

The six are listed and priced in §5. **All five phrases at seed 385 survive** — which is the whole
reason the fix takes the shape it does.

### Invariants held

| | before | after |
|---|---|---|
| Phrases with a stored decomposition | 10,917 | 10,915 |
| Decomposition not concatenating to `target_text` | **0** | **0** |
| Phrases carrying a ghost `"did"` | 13 | **6** |
| LEGOs in the course | 1,489 | 1,489 |
| Rounds in `course_round_index` | 1,321 | **1,321 — no round added, moved or deleted** |

*(Decomposition tiles concatenate with **no** separator; their `target` fields carry their own leading
spaces. Joining with a space invents ~1,600 phantom failures.)*

---

## 3. Audio

**No TTS was generated.** An audio-pass request was queued, per the standing rule.

| | count |
|---|---|
| Practice-phrase rows before / after | 10,947 / 10,945 |
| Rows removed (the two merged cues) | 2 |
| Phrase texts changed | **0** |
| **Surviving rows anywhere in the course that lost an audio pointer** | **0** |
| LEGO clip pointers re-linked after the 385 text change | 3 (known + target1 + target2) |
| Guard failures | 0 |
| **Clips needing re-recording** | **1** — see §6 |

The 385 grow cost nothing on the three main slots because the clips for the new text **already
exist**: they are seed 385's own, in the exact voices of record —

| role | clip | voice | text |
|---|---|---|---|
| known | `5931f8ce…` | `eve` | `क्या आप उससे सहमत थे?` |
| target1 | `76396694…` | `bedd6226` (Olivia) | `Did you agree with her?` |
| target2 | `0df22ccc…` | `xai_gfzdpspr5fdp` (Tom) | `Did you agree with her?` |

Each was verified against `course_audio.role`, `text_normalized`, `voice_id` and a non-null `s3_key`
before the pointer was written, and re-read from the live DB afterwards.

---

## 4. #323's tense flag (brief item 5)

Seed 355's `S0355L01` is `से बात करनी थी → "need to talk to"` — a **past** Hindi chunk glossed with
**present** English. **The merge does not fix it, and I did not chase it.** Its own USE phrases carry
the past through the question frame ("did you *need to* talk to…"), which is correct English, so the
defect is confined to the bare chunk and its debut BUILD. Fixing it would change the LEGO target and
ripple through 9 phrases on a course whose voices cannot re-render.

The same flag at seed 385 (`5d`) **is** fixed — see §1B.

---

## 5. The priced gap: six phrases at seed 355

These six lost vocabulary-gate tileability and were **deliberately left alone**:

| id | English |
|---|---|
| `S0355L01U01` | did you need to talk to that woman? |
| `S0355L01U02` | did you need to talk to someone? |
| `S0355L01U03` | did I need to talk to him? |
| `S0355L01U04` | did you need to talk to someone today? |
| `S0355L01U05` | did you need to talk to him? |
| `S0355L02U03` | did you need to talk to that woman you know? |

**Note this is six, not the five the brief expected** — #323's §5a named only the 385 five and
missed these. They are at seed 355 itself, in the *other two* LEGOs' baskets.

**Why they were not re-authored, although Kai authorised it:**

1. **No learner sees a change.** All six already carried `"did"` as a **ghost** in their stored
   decomposition, and still do. The player reads the decomposition, not the gate. Their runtime
   behaviour is byte-identical to yesterday's. Seed 355 was already in the failing-seed set before
   this change, so no new seed fails.
2. **There is no honest chunk to re-tile them through.** The needed unit is *"did you need to"*. In
   Hindi that is `क्या आपको … बात करनी थी` — `क्या आपको` at the front, the past marker `थी` at the
   very end, with the object between. **The chunk is discontiguous**, so growing it would either
   overlap `S0355L01` or leave a gap, both forbidden. Glossing bare `क्या आपको` as *"did you"* would
   smuggle the past in from `थी` — recreating the exact defect this job exists to remove. (Bare
   `क्या आप` is already glossed two different ways in this course — *"do you"* at seed 14 and
   *"are you"* at seed 25 — so a third reading would also deepen a live ZUT collision.)
3. **The only compliant rewrite costs more than it buys.** Recasting all six as *"did she …"* to reach
   `S0355L03` would collapse the seed's person variety (it currently drills *you*, *I* and *she*),
   collide with `S0355L03`'s own eight phrases, and — because every new English string would have no
   clip and the voices of record are **retired xAI** — **permanently silence 18 clips** on a live course.

**This is Kai's call, not mine.** One word and the six can be re-authored; the price is that
paragraph 3.

---

## 6. The one cost: a silent presentation slot

`S0385L01`'s presentation clip was invalidated by the text change and **is now NULL**.

The clip (`2742022a-9afe-4b94-8b05-31d85208ab2c`, voice `eve`) says
*"अंग्रेज़ी में — 'उससे सहमत थे' — जैसे — 'क्या आप उससे सहमत थे?' — में :"* — it names the **old,
smaller** chunk as the thing being translated, so after the grow it introduces the wrong unit. No
presentation clip exists anywhere in the course for the new chunk, and `eve` is xAI, which is
retired, so it cannot be rendered today.

**It was allowed to null rather than kept, because keeping it would have introduced the wrong chunk.**
The choice is reversible in one statement — the old id is recorded here and in the applied log — and
an audio-pass request naming this slot has been queued (`queue-audio-pass.cjs`). **No TTS was run.**

---

## 7. Reproducing

```
node tools/course-optimization/fix-eng-for-hin-kya-did-merge-2026-09-03.cjs           # dry run
node tools/course-optimization/fix-eng-for-hin-kya-did-merge-2026-09-03.cjs --apply
```

Logs: `…-dryrun-log.json`, `…-applied-log.json` beside the script. The script refuses to grow
`S0385L01` if a clip for the new text is not already present in the voice of record.
