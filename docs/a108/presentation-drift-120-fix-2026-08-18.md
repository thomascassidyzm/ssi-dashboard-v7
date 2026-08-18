# The 120 presentation-drift rows — fixed, and recalibrated

**2026-08-18.** Kai authorised this fix including audio spend. 120 rows in live courses where the
learner's card shows one phrase and the teaching clip announces another.

Source set: the detector job's report (`https://watson-1.tail4968cb.ts.net/d/41b8f9a8`) and
`docs/a108/check18-presentation-drift-coverage-2026-08-18.md`. I recovered all 120 exactly from the
committed table at `f8250860` and re-derived them live: **all 120 were still drifting** when I
started, distribution matching the brief (spa 55, hrv 33, zho 19, por 6, Welsh 6, ita 1).

---

## Headline

| | |
|---|---|
| rows in the set | **120** |
| ruled REAL defects | **89** |
| ruled NOT defects and discarded | **31** (26%) |
| rows fixed | **86** |
| of those, fixed by RE-LINKING at zero cost | **55** |
| newly rendered | **32** (31 fixes + 1 shared refinement clip) |
| held for Kai's decision | **3** (1 card edit, 2 Welsh) |
| total spend | **≈ $0.08** |

**Precision was 74%, not the ~93% the detector job estimated.** That is the single most important
number here: 31 of the 120 were not defects. The detector was not wrong to surface them — it was
right to refuse to call an uncalibrated count a finding.

---

## The gap the detector job left open — closed

That job verified nothing by listening. `course_audio.text` is what a row *claims* the clip says;
only 37 of the 120 carried `word_boundaries`, so for 83 there was no stored record of what was voiced.

**I transcribed all 120 clips.** Result: **119 of 120 speak exactly what the row claims.** Every
apparent mismatch in the TTS courses was whisper artefact, not divergence.

**The exception is real and it is Welsh.** `cym_s_for_eng` S129L2 is a human recording. Its stored
text is `The Welsh for <src>you had</src> is <tgt>gest ti</tgt>`; the recording actually says
*"The **Cymraeg** for you had **or you got** is gest ti"* — confirmed on the medium model. The take
says more than the script, and it says a different word for "Welsh".

So for the human-recorded Welsh courses, **`course_audio.text` is a script, not a transcript**, and
the detector is comparing the card against something that may not be what was said. `cym_n` S301L1
shows the same shape in reverse (the recording omits the scripted "moving on"). Any future drift
work on the legacy Welsh courses has to listen, not read.

## A second thing worth knowing: most of the Spanish set is not on the learner path

51 of the 55 `spa_for_eng` rows are **absent from the live round map** — the app does not serve them.
If drift were independent of reachability you would expect about 5. Observed 51.

That is the mechanism: these seeds were re-decomposed after their audio was made, the presentation
clips still carry the *old* decomposition's texts, and the stale legos dropped out of
`course_round_index`. It is why the fix was overwhelmingly a re-link — the clip the new card needs
usually already existed.

Reachable-today counts across the whole set: **68 of 120**. Fixing the other 52 is correct hygiene,
but nobody was hearing them today.

---

## What was done, per course

| course | rows | discarded | relinked | rendered | held |
|---|---|---|---|---|---|
| spa_for_eng | 55 | 0 | 53 | 2 | — |
| hrv_for_eng | 33 | **25** | 0 | 8 | — |
| zho_for_eng | 19 | 2 | 1 | 15 | 1 |
| por_for_eng | 6 | 0 | 1 | 5 | — |
| ita_for_eng | 1 | 0 | 0 | 1 | — |
| Welsh (cym_n + cym_s) | 6 | 4 | 0 | 0 | 2 |

**Croatian is the recalibration.** 25 of 33 were not defects: they were clips deliberately glossing
Croatian structure more literally than the card — the `da`-clause family (card `you to speak`, clip
`that you speak`), the impersonal `ti ide` (card `you're doing`, clip `it's going for you`), aspect
pairs, and this course's own taught gloss `chat` for *pričati*. Those are the method working, not
drift. Only 8 were genuine — mostly ZUT breaches on the known side, e.g. the clip announcing `to do`
for *napraviti* when `to do` is already the taught prompt for *raditi*.

Chinese discarded 2 of 19 (a bracket-only difference, and `will ask`/`going to ask`). Spanish
discarded none, which is consistent with the stale-layer mechanism: these are unrelated phrases,
not glosses.

---

## How the renders were made safe

**Voice and speed were measured, not read from config.** `courses.voice_config` is not reliable
evidence here:

- `ita_for_eng` config names xAI `eve` at speed 1.0 for presentation. In reality **2,504 of its 2,532
  presentation clips are `azure_en-GB-SoniaNeural`**, including every neighbour of the row being
  fixed. Rendering from config would have dropped one xAI clip at the wrong speed into an Azure course.
- Speed was confirmed empirically: re-render a real incumbent clip's exact text at each candidate
  speed and match duration. The right speed lands within ~1%; a wrong one is 4–6% out.

Measured: **ita 0.95, por 0.95, zho 0.95, hrv 1.0** — i.e. config was wrong for ita and right for the
other three. This is now a committed tool, `tools/verify-render-speed.cjs`.

**Make-before-break**, strictly: synthesise → upload → read the object back from S3 and transcribe it →
insert the `course_audio` row → *only then* repoint `course_legos.presentation_audio_id`. No old
object or row was touched or deleted; all 86 previous clips are still present. Every repoint is
journalled in a rollback file recording the previous clip id.

New rows carry `word_boundaries` — the absence of which on 83 of 120 rows is exactly why "what does
this clip say" was unanswerable without re-transcribing the estate.

`courses.audio_stamp` was bumped on all five courses, so learners are not served cached old audio.

### One refinement after the fact: the six Spanish `that` rows

All six `spa_for_eng` rows whose card is exactly `that` (S90L3, S112L1, S127L2, S132L1, S151L1,
S172L2) initially shared one clip carrying the example *"I heard that"*. That clip is **defensible** —
`heard the truth` is taught at seed 71, before the earliest of the six — so this was not a
controlled-language breach. But the example is itself a **later, different LEGO**: S364L3
`I heard that` → *oí que*. A learner at seed 90 was being shown an English phrase that later carries
a different Spanish form.

A bare clip has no example to be wrong about at any of the six seeds (90→172). One 28-character
render, verified by listening, now serves all six. Detector clean, served bytes confirmed live.

## Verification

- **Detector**: `check-presentation-drift.cjs` at **100% coverage** on all five courses — **0 of the
  86 fixed rows still drift.** (spa total drift 55 → 7, all remaining are other classes never in scope.)
- **Served bytes**: every one of the 86 clips fetched *through the app's own* `/api/audio` route and
  transcribed. **86/86 announce the card phrase.** One apparent miss, zho S251L3, was an ASR artefact:
  whisper hears `will` for `we'll` at every model size. Settled by rendering both variants — `we'll`
  is 3744 ms, exactly matching the live clip; `will` is 3780 ms.
- **Live app binding**: 9 rows confirmed end-to-end through the live `cycles` API. **Explicit gap:**
  that route is entitlement-gated past the free seeds and 403s anonymously — verified as a gate, not
  a fault, because untouched legos at the same seeds 403 identically (zho S0033L02, por S0114L02).
  hrv is ungated and all 8 of its rows passed. The binding for the remaining rows is proven by the
  detector against the live DB plus the served-bytes check, not by the cycles route.

---

## Held for Kai — three decisions

**1. `zho_for_eng` S69L3 — a card edit, not a clip fix.** Card reads `one` for 只; the clip announces
`measure word`. The reviewer's case is that *both* are wrong: 只 is the animal measure word in 那只小狗,
`one` does not appear in the seed at all, and `one` already means 一 at seed 276 — a ZUT breach.
Proposed card: `measure word for animals`. I did **not** apply it: changing a card in a released
course is a wider content edit than this job's remit, and the render should follow the card decision,
not precede it. Rendered text is ready.

**2 and 3. The Welsh six — no audio generated, as instructed.** Four are discards:

- **cym_s S279L3** and **cym_n S262L3** — confirmed false positives, exactly as the detector's author
  suspected. The clip *does* announce the card phrase (`the Welsh for "to mean"`); the delimiter parse
  grabbed `meddwl` from the opening callback.
- **cym_s S201L1** — the closing aside ("remember that we *get* time in Welsh") does the teaching.
- **cym_n S301L1** — `I find it` / `I'm finding it` reach one Welsh form. Changing the card would
  desync 10 practice phrases.

Two need a decision:

- **cym_s S129L2 — recommend a text-only card fix, no re-record.** Card reads `had you`; the seed is
  "you had something to eat". The recording already says *"you had or you got"*. Change `known_text`
  to `you had`. ZUT stays clean (`did you get?` lives on its own card at S0092L01). ⚠️ A `known_text`
  update re-resolves the audio link — the human clip `ead62605…` must be checked immediately after.
- **cym_s S148L1 — recommend leaving it.** Card `the young boy`, clip announces only `the boy`.
  `ifanc` was taught 83 seeds earlier, so the learner can build it; this is legacy partial
  introduction. Making it literal costs Aran or Catrin a take for no gain.

**Four Spanish cards flagged but deliberately NOT changed** (S71L3, S116L2, S163L1, S505L2). In each,
the card text does not tile onto its own seed's known sentence — e.g. seed 71 says `anyone` where the
card reads `no one`; seed 116 says `make` where the cards read `to do`. The reviewer declined to
re-card all four because downstream practice phrases are uniformly built on the current card text and
re-carding would orphan them, and because the neighbouring sense is owned by a different lego
(`anyone` = *cualquiera*). S163L1 is the closest call — the *que* in "I think that it's interesting"
really is the conjunction the clip announces. These are flagged for your eye, not fixed; full
reasoning per row in `scripts/pdrift120/rulings_spa_for_eng.json`.

**Separate finding, unrelated to this job:** 6 of 10 `cym_n` seed-301 practice phrases are corrupt
(`I find it easy to see` → *"y byddi di'n gorffen"*; hard/easy swapped twice). Needs its own pass.

---

## Spend

**≈ $0.08.** About 4,700 Azure characters (29 course renders, plus speed calibration, plus one
wasted 1,285-char render batch lost to a bad `origin` value before any row was repointed) at
~$16/1M, and 66 xAI characters for the two Spanish renders. No Welsh audio was generated.

## Honest gaps

- **The cycles route could not be checked anonymously for 22 of the 86 rows** (entitlement gate,
  demonstrated above to affect untouched rows identically). Their binding rests on the detector
  against the live DB plus the served-bytes transcription, not on the app route.
- **The 31 discards are reviewer judgement**, most of them Croatian. I think the Croatian call is
  right and the reasoning is recorded per row in `scripts/pdrift120/rulings_hrv_for_eng.json`, but it
  is the one part of this that a Croatian speaker should sanity-check rather than take from me.
- **83 of the 120 original clips still have no `word_boundaries`.** I transcribed them rather than
  backfilling the column; only the 31 new rows carry boundaries.
- The other drift classes the detector surfaced (B alternation-pick 1,194, C superstring, D substring,
  A bracket-only) were **not** in scope and are untouched.
