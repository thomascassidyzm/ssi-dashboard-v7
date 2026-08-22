# eng_for_sin — corruption scan and repair, seeds 1–100 (A-134, step 3 of 5)

**Branch:** `fix/sin-seeds-1-100-2026-08-17` · **Date:** 2026-08-17 · **Range:** `course_seeds.seed_number` 1–100 inclusive. A sibling worker owns 101–200.

`eng_for_sin` is **English for Sinhala speakers**: the known/prompt side is **Sinhala**, the target/answer side is **English**. Every repair below is on the **known (Sinhala) side**. No `target_text` was touched, so the English `target1`/`target2` clips (xai voices) are untouched by design.

---

## Headline

| | |
|---|---|
| seeds examined | **100 of 100** |
| seeds carrying a once-in-course token | **25** |
| defects **CONFIRMED** and repaired | **16 seeds** + **3 presentation clips** |
| ruled **benign**, not repaired | **9 of the 25**, plus 5 more clusters (below) |
| repairs needing **zero invented Sinhala** | **13 of 16** — verbatim lift from the course's own text |
| new audio assets created | **6** (3 seed clips + 3 presentation). 13 seeds reuse a clip that already existed |
| old clips deleted | **0** |
| learner progress rows migrated | **4,775**, across **601 learners** |
| voiced-filler (`ඒ ගෙ`) clips in range | **0 of 1,189** — the A-134 defect does not reach seeds 1–100 |

---

## How the defects were found — five signatures, not one

**1. Once-in-course tokens.** A Unicode-aware tokenizer (Sinhala block U+0D80–U+0DFF plus ZWJ U+200D — *not* an ASCII word-boundary class, which returns nothing for Sinhala) flagged **25 of 100** seeds holding a token present in 0 of 1,300 legos and 0 of 11,719 practice phrases.

**2. Seed-vs-its-own-cards.** For all 225 cards in range, how many of the card's tokens appear anywhere in its own seed — token-level, order-free, so the SOV discontinuous-frame false positive cannot fire. 41 cards scored under 0.5.

**3. Seed-vs-its-own-English.** The strongest signature, and the one that produced the repairs: **the seed's own USE phrase already carries authored English verbatim identical to the seed's `target_text`.** Where that phrase's Sinhala differs from the seed's, one of the two is wrong. 42 of 100 seeds show it.

**4. Non-words and truncations**, adjudicated by hand against the course's own vocabulary.

**5. Voiced filler / mis-voiced clips**, read from the provider's per-token `word_boundaries` array — `course_audio.text` is stored unstripped, so only the token array shows what was actually spoken.

### The substring trap, and what it changed

A hapax claim from a *token* match can be an artefact of Sinhala's suffixal morphology. Every claim was therefore re-checked by **substring** against the live DB. Four came back with hits — and all four survived, three of them with a *sharper* diagnosis:

| token | substring hits | verdict |
|---|---|---|
| `පූර්ණය` | inside `සම්පූර්ණයෙන්ම` — a different word, and it debuts at **seed 544** | hapax holds, and introduced-before-used fails too |
| `මත්` | inside `දැනටමත්`, `උද්‍යෝගිමත්`, `මමත්` — unrelated words ending in -මත් | hapax holds |
| `ලෑස්තිය` | inside `ලෑස්තියි`, the taught form, **on seed 97's own phrase** | **it is a truncation of the taught word** — claim strengthened |
| `නොකරන` | inside `නොකරන්නේ` at **seed 121**, 22 seeds *later* | claim strengthened: the `නො-` negation is not yet introduced at seed 99 |

---

## The 16 seed repairs

13 are a **verbatim lift** of a string the course already holds, whose authored English is verbatim identical to the seed's own `target_text`. Nothing was invented for them.

| seed | what was wrong | confidence |
|---|---|---|
| 5 | omits its own card `පුහුණු වෙන්න` (*to practise*) — its English says "practise" | CONFIDENT |
| 10 | `පූර්ණය` as an adjective "whole"; the course teaches the `-ම` clitic (`ඒ වාක්‍යයම`) | CONFIDENT |
| 15 | **neither** card realised — `මා එක්ක` (*with me*) and `සහ` (*and*) both unexpressed; `මට` does double duty so the wanter is ambiguous | CONFIDENT |
| 26 | `ආසන්නෙන්` hapax; card `මට ආසයි දැනෙන්න` (*I like feeling*) unexpressed — seed says "it feels to me" | CONFIDENT |
| 31 | `මත්` — a non-word for "me" (course teaches `මා`); `අද රෑ` where its card teaches `මේ රෑ` | CONFIDENT |
| 36 | `කඩා කනවා` — garbled for "interrupt", both tokens hapax; course teaches `බාධා කරන්න` | CONFIDENT |
| 62 | `ඒ එකේ` = *"in that one"*, **not** "at the same time"; its own card is `ඒ එකම වෙලාවේ` | MODERATE (composed) |
| 71 | `සත්‍යය` where its card teaches `සත්‍ය`; card `දෙනවා` (*let*) unexpressed; `ඇහෙනවා කරන්න` is not a grammatical complement | MODERATE (composed) |
| 82 | `බලාගන්නේ` hapax; card teaches `බලාගෙන ඉන්න` | CONFIDENT |
| 87 | `නාගෙ` — a non-word for "know"; course teaches `දන්නේ නැති` | CONFIDENT |
| 88 | `නාගෙ` + `කෙනාට`, both hapax; card `කතාබහ කරන්න` unused | CONFIDENT |
| 89 | `ටික කාලෙ` = *"little time"* for "short time" — card teaches `කෙටි`; `ගොඩක්` where card teaches `බොහෝ` | CONFIDENT |
| 92 | `ටිකක් ඊළඟ කාලෙ` = *"a little **next** period"* — a mistranslation of "for a while" | CONFIDENT |
| 95 | `බසියෙ` (real, but hapax) where its card teaches `බස් එක` | CONSISTENCY, not corruption |
| 97 | `ඕනෑ ඕනෑකමට ලෑස්තිය` — reduplication plus a truncation of `ලෑස්තියි`; "to go" unexpressed | CONFIDENT |
| 99 | `ඔයාම ඔයාගෙන්` double-marks the reflexive (course teaches `ඔයාටම`); `නොකරන` not yet introduced; **`අහන්න` re-introduces the ask/hear ZUT collision the course avoided by teaching `විමසන්න`** | CONFIDENT |

### Two shapes the hapax test structurally cannot see

Both found by signature 2/3, both real, and both absent from the prior single-analyst survey because that survey was orphan-token-driven:

- **Seed 62** is built *entirely of real words* and still says the wrong thing.
- **Seeds 5 and 15** omit a concept their own English states and their own card teaches.

This is why the 1–100 confirmed count (16) exceeds the prior estimate for the whole course.

## The 3 presentation-clip repairs

Proven spoken from the provider's own token array, not inferred from duration:

- **S0069L02** — card teaches `තරුණ` (*young*); the clip voiced **`ලිහිල්ල`** (*loose*), twice, in the headword slot and the example: the learner read "young" and heard *"I like learning with loose people."* `ලිහිල්ල` appears in **0 legos, 0 phrases, 0 seeds** — it existed only inside that clip.
- **S0041L02**, **S0076L04** — voiced `මමා`, the corrupt spelling of `මම`, as its own token. Same family as A-134's 27.

The `ඒ ගෙ` filler itself is **absent** from seeds 1–100: 0 of 1,189 reachable clips.

---

## What was ruled benign, and why

Not re-reported as defects. 9 of the 25 flagged seeds plus these clusters:

- **`කොහොම` cluster (43, 56, 57, 59, 60).** The course teaches `කොහොමද` with the `-ද` clitic inside the chunk; these seeds write `කොහොම` with the clitic on the verb (`කොහොම කියන්නද`). A real, grammatical colloquial variant — a consistency flag, not corruption.
- **Nominative-vs-dative `ඕනේ`.** Systemic: 682 dative against 141 nominative rows course-wide. A minority pattern, not an isolated defect.
- **Orthographic variants** — `කාලෙ`/`කාලේ`, `පස්සෙ`/`පස්සේ`, `ස්තූතියි`/`ස්තුතියි`, `කොහෙද`/`කොහේද`, colloquial `පහු`.
- **Suffixed forms of taught words** — e.g. seed 53's `බෑගෙට` is just the card's `බෑගෙ` + dative `-ට`. A tokenizer artefact, not a defect.
- **Discontinuous frames, reordering, and the `...` ellipsis convention.**

### Two seeds where the "repair" would have made it worse

The mechanical rule — *substitute the phrase whose English matches* — is wrong twice in this range, and both were caught and **excluded**:

- **Seed 77.** The seed is good Sinhala. Its matching phrase (`මම ඉංග්‍රීසිය ඉතිරිව ඉගෙනගන්නේ ඉක්මනට ගැන පුදුමයි`) drops "understand" entirely and reads roughly *"surprised about learning English remainingly quickly."*
- **Seed 43.** The seed is fine; its matching phrase has the ungrammatical `හිතන නැත්තේ`.

In both, the **phrase** is the defective row, not the seed. They are flagged for a phrase-level pass and were not touched.

---

## Gates

Seven gates, adapted from `docs/a134-sin27-2026-08-17/gates-12.cjs`, with **two disclosed divergences**:

1. **The rate model is refitted for seed clips.** A-134's model (`ms ≈ 3143 + 45.4×chars`) was fitted on *presentation* clips, which carry a fixed template; it over-predicts a bare seed sentence by ~1.75s. Refitted on 652 clean seed clips of this course and voice: **`ms ≈ 1388.3 + 44.21×chars`, sd 119.4**. The slope agrees to within 3%; only the intercept is clip-type specific.
2. **An inter-sentence pause term, `n = 2`, stated as a weakness.** Seed 82's repair is the one two-sentence text. It failed gate 2 at z = 8.35 — and so does **seed 141**, a healthy clip nothing has ever flagged. Of 668 seed clips exactly two contain an internal sentence break and *both* sit at z ≈ +9, while the 666 single-sentence clips average z = −0.02. The model has no term for the pause. A +1090ms term is applied to gate 2 only, for internal-break clips only; S0082 then lands at z = −0.78. This is the mean residual of the only two exemplars that exist, not a fitted parameter — stated rather than silently widening gate 2 for all 19 clips.

Results: **19/19 clips pass all seven on the shipping take**, plus **38 spares, 0 failing**. Tail floor −85.9 to −88.4 dB against a −40 dB threshold. Every shipping clip's voiced token array is free of every corruption this pass exists to remove (gate 5b), verified by exact-token comparison.

**ZUT.** The real builder gates, called as the submit path calls them: `checkLegoConflict` over all 225 cards in range → **0 hard violations**; `checkPhraseZUT` course-wide → **0 collisions**. The single hit on a replacement is a capitalisation artefact — the gate's `nt()` strips punctuation but does not lowercase.

**Introduced-before-used — DISCLOSED SUBSTITUTE.** The real gate is **structurally inert** for this course: `tokenizeKnown` (`validation.cjs:818`) splits on `/[^a-z']+/`, so Sinhala tokenizes to `[]` and `checkKnownSide` returns "no problems" for *any* Sinhala string. I used my own Unicode-aware standard: every Sinhala token of a replacement must appear — exactly, or as a prefix-stem allowing suffixal case/tense/clitic morphology — in a lego, component or practice phrase at a seed number **≤** this seed. **0 unresolved tokens across all 16 replacements.**

---

## Make-before-break, and the migration

Order, per `AUDIO_PIPELINE_ARCHITECTURE.md` §6b: (1) render and gate locally; (2) verify every clip alive — including verifying voice, `s3_key`, boundaries and corruption-freedom of the 13 **pre-existing** clips before pointing anything at them; (3) upload, then swap link and row in **one drift-guarded transaction**; (4) **no deletion** — all 19 old clips remain in `course_audio` and were confirmed present after the swap.

**13 of 16 seeds needed no new asset at all.** A clip for the repaired text already existed, because the practice phrase carrying that exact Sinhala was already rendered and already live. My own fresh renders of those 13 agree with them to within 20–40ms — independent corroboration that both speak the same sentence. Only the 3 composed repairs and the 3 presentation clips are new assets.

**Progress migration.** `course_seeds` has **no** trigger to invalidate `known_audio_id` on a text change — `course_legos` and `course_practice_phrases` do, `course_seeds` does not — so a seed text edit silently strands its clip. Handled explicitly. Under the standing content-change protocol (plate A-111) rule 6, *doubt resolves to unheard*: **4,775 `seed_progress` rows across 601 learners** had `is_introduced` reset in the **same transaction** as the text change (rule 8), so nobody is credited with a sentence they never heard. `lego_progress` is untouched — no LEGO text changed, so no mastery moves and rule 7 holds by construction. Measured, not assumed: `introduction_played`/`introduction_complete` are 0 across all 793 `lego_progress` rows for the three presentation legos, so those fixes have no introduction state to migrate.

## Verified live, as a learner receives it

- `courses.content_stamp` bumped to **2026-08-17 11:20:10Z** by the write — this is what invalidates the learner's cached script.
- `course_round_index` carries only structural columns (no text), so it **cannot** go stale from these edits. No refresh needed — checked, not assumed.
- One clip from each class fetched through the **live learner endpoint** `ssi-learning-app.vercel.app/api/audio/<id>`: HTTP 200, decoding to exactly the recorded durations (3.348s / 3.888s / 6.264s).
- All 16 seeds now normalise-match their clip text; 0 of the 16 still contain any flagged corruption.

---

## Explicit gaps

1. **Adversarial verification is single-analyst.** The brief allowed one sonnet verifier; the surface refused it — `FAN-OUT CEILING — depth`, tree `511af8e3`, this worker already at depth 2. The same block the prior A-134 analyst hit. I ran the adversarial pass **myself** against the live DB instead, attacking my four self-nominated weakest claims and re-checking every hapax by substring; all 19 survived and three diagnoses sharpened. **That is self-review, not independent review**, and it is the main weakness of this deliverable.
2. **I am not a Sinhala speaker.** Confidence labels are per item. The two MODERATE repairs (62, 71) are composed from course-taught chunks rather than lifted verbatim and are the likeliest to want a speaker's eye.
3. **Seeds 77 and 43 have a defective practice phrase**, left untouched — out of scope for a seed pass, and repairing a phrase is a different migration.
4. **Reported, not repaired**: seeds 11, 23, 27, 73 show milder meaning drift; card **S0080L01** teaches the frame `මම ... වෙනවා` for "I'll" while none of its 11 phrases ends in `වෙනවා` — a card edit with wide audio consequences, deliberately not taken in a seed pass.
5. **`බලාගන්නේ` is glossed two ways** — "wait for" at seed 82 (repaired) and "make sure" at seed 425, which is outside my range. Flagged for whoever owns 401–500.

## Files

| file | what it is |
|---|---|
| `proposal.json` | the 16 + 3 repairs, each with its defect, replacement, source and tier |
| `gates.cjs` | the seven gates, refitted model and disclosed pause term |
| `render.cjs` | render + master + gate, local only |
| `ship-log.json` | per-clip gate results and the captured `word_boundaries` |
| `apply.cjs` | the swap: drift-guarded, one transaction per item, dry-run by default |
| `apply-dryrun-log.json` / `apply-applied-log.json` | planned, then applied |
