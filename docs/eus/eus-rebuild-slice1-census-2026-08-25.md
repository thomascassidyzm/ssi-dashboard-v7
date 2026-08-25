# eus_for_eng — untaught-vocabulary census + first rebuild slice
**25 Aug 2026.** Course content written live to the database. No audio generated. No repo commits.

---

## 1. THE CENSUS NUMBER

**Of the 156 seeds Deborah rewrote, essentially none are blocked by untaught vocabulary. The realistic count of genuinely new lexical items across the whole learner-reachable range is about six, and exactly one of those is a defect.**

That is a much better answer than feared, and it rests on two independent detectors plus an empirical test, not on one script.

### The 156 splits in half, and this is the most important fact in the report

| | seeds | LEGOs beneath | phrases beneath |
|---|---|---|---|
| **Learner-reachable** (seed ≤ 300, built + released) | **72** | 183 | 1,593 |
| **Draft only** (seed 301–668) | **84** | 0 | 0 |

Only seeds 1–300 of this course have ever been decomposed. Seeds 301–668 are draft: no LEGOs, no phrases, no learner. **84 of the 156 have nothing underneath them to rebuild.** When the build eventually reaches them it will decompose Deborah's corrected text directly. The rebuild job is 72 seeds, not 156.

(The 72 reachable seeds carry exactly the 183 LEGOs and 1,593 phrases quoted in the brief — the numbers reconcile precisely.)

### Within the 72 reachable seeds

- **45** no longer tile — her wording introduces something the seed's LEGOs don't cover. These need rebuilding.
- **27** still tile perfectly. Her edit stayed inside taught vocabulary; nothing underneath is wrong.

### The untaught-vocabulary hunt, and the false positives I found in my own work

My census flagged 46 word forms across 36 reachable seeds. I checked it against a completely independent detector — the course-builder's own tiling validator — which flagged 45 seeds. **My census was a strict subset: zero census-only hits.** Two detectors agreeing from different directions.

Then I hunted false positives, as asked, and found a lot of them in my own method:

- **19 forms** are plainly a taught stem carrying a new suffix — `aukerarik`←`aukera`, `aldian`←`aldi`, `zeren`←`zer`, `zuri`←`zu`, `berak`←`bera`, `nukeen`←`nuke`. Taught, per your calibration rule. Not defects.
- My prefix test then **systematically mis-fired on three Basque patterns it structurally cannot see**: truncation (`polikiago` ← taught `polikiagoa`), the `ba-` conditional prefix (`banaiz` ← taught `naiz`), and verbal-noun stem alternation (`esatea`←`esan`, `jateko`←`jan`, `ematea`←`eman`). Roughly **14 more false positives** hiding in what my script called "new".
- **~7** are new cells of the ditransitive/potential auxiliary paradigm — `diezazuket`, `diezazkizuket`, `zintudan`, `zizula`, `ginen`. These are real teaching items, not inflection of a taught word, but they are also exactly what a seed is *for*.
- **~6 are genuinely new lexemes**: `hil` (month, s37), `ordu` (s93), `giltza` (s182), `huts` (s248), `ote` (s290), `atsegin` (s300).

### The one actual defect

**Seed 182: she wrote `giltzak` (keys) where the course teaches the LEGO `gakoak`.** That is a lexical swap onto an untaught synonym, and it is the shape that creates a ZUT conflict — one English prompt, two Basque answers — once the old word survives elsewhere. This one needs a decision. Everything else on the list is a seed legitimately introducing a new word, which is what seeds do.

### Your four named suspects

- **`daramat` is not a defect at all.** It is taught as a LEGO around seeds 33/38 and appears 12 times. My census correctly never flagged it; the tiling validator flags it at s38 only because that seed's own LEGOs don't cover it, which is staleness, not untaught vocabulary.
- **`neba` (s316), `hausnatu` (s325), `katakumea` (s334)** all sit in the draft range, where "untaught" is meaningless because the course has not been built that far. Worth noting: the course teaches `hausnartu` at seed 98, so `hausnatu` at 325 looks like a **missing `r` — a typo**, not a new word. Worth putting to Deborah.

### The empirical proof

I rebuilt 20 of these seeds, including every awkward specimen — `hilean` (s37), `ordua` (s93), `polikiago` (s90), `diezazuket` (s119), `erabiltzea` (s121), `zintudan` (s127). **All 20 absorbed their "new" word as a normal new LEGO with Deborah's Basque completely unchanged.** Not one had to be flagged for forcing vocabulary the learner hasn't met. That is the strongest evidence in this report and it is consistent with the census.

---

## 2. WHAT THE SLICE COST

**20 seeds rebuilt: 6, 22, 37, 38, 39, 43, 50, 85, 87, 88, 90, 91, 93, 99, 116, 117, 119, 121, 127, 129. All 20 pass validation. Zero regressions anywhere in the course.**

| | before | after |
|---|---|---|
| LEGOs | 53 | 52 |
| Practice phrases | 456 | **560** (net **+104**) |
| Course-wide seeds passing validation | 27 / 300 | **52 / 300** |

**Every phrase validated.** Passing *is* the phrase-minimum check (3 BUILD / 5 USE per LEGO, containment, target vocabulary, no duplicates), so all 560 clear it.

**Back-fill done.** Net +104 phrases. Six seeds ended with fewer rows than before (6, 87, 93, 117, 127 and one other) purely because they now need fewer LEGOs — seed 93 went from two LEGOs to one. None is below minimum; there are no gaps.

**Nothing left flagged.** No seed in the slice had to be abandoned for untaught vocabulary.

**Two real defects fixed as a side effect:**
- A live ZUT violation: English "time" mapped to **both** `denbora` (s27) and `garaia` (s93). Deborah's swap to `ordua` would not have fixed it. Rebuilding s93 as `time to go → joateko ordua` resolves it honestly — the two prompts now differ.
- Removing `garaia` orphaned two phrases at seed 94 that still used it. I repaired both and nulled their target audio. Zero occurrences of `garaia` remain course-wide.

**The honest quality caveat:** the Basque in these 560 phrases is LLM-authored and has passed the code gates, not a native speaker. The gates check counts, tiling and vocabulary — they cannot judge whether a sentence is good Basque. **This slice should go to Deborah before it is treated as finished.**

---

## 3. THREE THINGS BROKE, AND ONE OF THEM IS SERIOUS

### (a) `edit-cascade`'s rollback is broken — it empties live seeds

`services/course-builder/routes/edit-cascade.cjs` deletes a seed's LEGOs and phrases, tries the new breakdown, and on failure re-inserts its snapshot. **That re-insert always fails**, because it replays the full snapshot row including `course_legos.lego_id`, which is a **generated column** Postgres refuses to accept a value for. The route then reports *"original decomposition restored"* — and the seed is left with **zero LEGOs and zero phrases**.

This hit 13 seeds during this job. Four of them (**117, 119, 121, 127**) sat empty in a *released* course for roughly twenty minutes. **I restored all four from backups I had taken first; the course now has zero empty decomposed seeds and I verified that directly.** But it was luck that I had backups — the route's own safety net does not work.

**This must be fixed before anyone rebuilds the remaining seeds.** Every gate rejection currently guts a live seed. The fix is small: strip generated columns (and null `presentation_audio_id` on component rows, which a second trigger correctly refuses) before re-inserting.

### (b) The validation endpoint is not the gate

`/api/v2/validate` checks the **Basque** side — tiling, containment, target vocabulary, phrase counts, duplicates. It does **not** run the **English-side** gate or the ZUT check. `/api/seed/complete` runs both. **13 of 17 proposals passed the simulation and were then rejected on submission.** Anyone costing this work off `/v2/validate` will be wrong by about 75%.

The blocker is almost entirely the English side, and this is the single most useful finding for planning the rest: **the known side is a controlled language, and irregular English forms and contractions are not licensed.** The gate resolves regular `-s/-ed/-ing` off an introduced stem and nothing else. So `speak` does not license `spoke`; `talking` does not license `talked`; `meet` does not license `met`; `see` does not license `saw`; `was` does not license `wasn't`; `he` does not license `him`. Once I extracted the exact allowed-English inventory per seed and handed it to the authors, **all 15 previously-rejected seeds went through.**

### (c) `generateAudio` defaults to `true`

`edit-cascade` will generate TTS unless you explicitly pass `generateAudio: false`. I passed it on every call and verified `wouldGenerateAudio: {skipped: true}` in dry-run. Worth a default flip — it is a money hazard sitting behind an unrelated route.

---

## 4. AUDIO — NOTHING GENERATED, NOTHING QUEUED

**1,907 clip slots now need rendering across eus_for_eng:**

| slot | count |
|---|---|
| phrase target1 | 564 |
| phrase target2 | 564 |
| phrase known (English) | 561 |
| LEGO presentations | 86 |
| seed target1 | 66 |
| seed target2 | 66 |

About **1,734 of those were created by this slice rebuild** (560 phrases × 3 voices + 52 presentations + the 2 repaired seed-94 slots). The rest predate today, including the 132 seed-level slots Deborah's own edits unlinked.

**Split synthetic vs human-recorded: 100% synthetic, 0% human.** All 28,893 existing clips in this course carry `origin = 'tts'` (Azure `eu-ES-Ainhoa`/`Ander`, plus xai voices). There is no human-recorded Basque to protect, so nothing here is make-before-break sensitive.

I have not queued an audio pass and have not rendered anything.

---

## 5. CAN THE REMAINING SEEDS RUN THE SAME WAY?

**Yes — but the remaining work is 52 seeds, not 136, and one bug must be fixed first.**

- **84 of the 136 need no rebuild at all.** They are draft-range; they will be decomposed from her corrected text when the build gets there.
- **52 reachable seeds remain** (72 − 20 done). Of those, roughly 25 still tile fine and may need only light work.

**Before continuing, fix `edit-cascade`'s rollback.** Running 52 more seeds through a route that empties a live seed on every rejection is not acceptable, and rejections are the normal case, not the exception.

**With that fixed, the recipe demonstrated here works and is repeatable:** extract the allowed-English inventory per seed, author against it, validate the Basque with `/v2/validate`, submit through `edit-cascade` with `generateAudio: false`, then re-check the course for what your own fix broke. Budget four to six validation rounds per seed. Four parallel authors covered 20 seeds; the same shape scales to the remaining 52 comfortably.

**The real constraint is not machinery, it is Basque.** Everything above passed code gates that cannot read Basque. Deborah is the only person in this pipeline who can tell you whether 560 new practice phrases are good Basque, and she should see this slice before it is called done. I would not run the remaining 52 until she has ruled on these 20 — otherwise you are compounding unreviewed text at four times the current volume.

---

### Backups
Pre-edit snapshots of every touched seed are at `$CS_SCRATCH/backup_s<N>.json` (and `backup2_s<N>.json` for the second pass), each holding the full original LEGO and phrase rows.
