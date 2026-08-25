# eus_for_eng — full rebuild of Deborah's affected seeds
**25 Aug 2026.** Course content written live to the database. No audio generated. No commits to main.

---

## THE CENSUS, FIRST — because it tells you the shape of the job

**Of the 156 seeds Deborah rewrote, only 72 are learner-reachable. The other 84 have no LEGOs and no practice phrases beneath them at all — there is no LEGO there to fix.**

Only seeds 1–300 of this course have ever been decomposed. Seeds 301–668 are draft: zero LEGOs, zero phrases, no learner. I verified that directly, not by inference. When the build eventually reaches them it will decompose Deborah's corrected text from the start. So "all 156" is really **72**, and that is what I rebuilt.

The untaught-vocabulary picture inside those 72, after hunting my own false positives:

- Two independent detectors (my census; the course-builder's own tiling validator) agree, with **zero census-only hits**.
- **19** flagged forms are plainly a taught stem plus a suffix — `aukerarik`←`aukera`, `zeren`←`zer`, `zuri`←`zu`. Taught, not new.
- My prefix test then **mis-fired on three Basque patterns it structurally cannot see** — truncation (`polikiago`←`polikiagoa`), the `ba-` conditional prefix (`banaiz`←`naiz`), verbal-noun alternation (`jateko`←`jan`). Roughly **14 more false positives** inside what my own script called "new".
- **~7** are new auxiliary paradigm cells (`diezazuket`, `zintudan`, `zizula`).
- **~6 are genuinely new lexemes**: `hil` (month), `ordu`, `giltza`, `huts`, `ote`, `atsegin`.

**Empirically confirmed by the rebuild itself: 71 of the 72 absorbed their new vocabulary as ordinary new LEGOs with Deborah's Basque completely unchanged.** Exactly one seed was genuinely blocked.

Your four named suspects: **`daramat` is taught** (a LEGO at seeds 33/38, 12 occurrences) — not a defect. `neba`, `hausnatu`, `katakumea` are all draft-range. `hausnatu` (s325) looks like a **one-letter typo** for the taught `hausnartu` — worth putting to Deborah.

---

## WHAT LANDED

**71 of the 72 reachable seeds are rebuilt and pass validation. One is flagged. Zero regressions across the whole course.**

| | before | after |
|---|---|---|
| LEGOs under the 72 seeds | 183 | 180 |
| Practice phrases under them | 1,593 | **1,963** (net **+370**) |
| Seeds passing validation, course-wide | 27 / 300 | **103 / 300** |
| Decomposed seeds left empty | — | **0** |

Every one of those 1,963 phrases passes the gates: containment, target vocabulary, no-later-siblings, phrase minimums, no duplicates, and the English-side controlled-language check. **Back-fill is done** — no LEGO sits below its 3 BUILD / 5 USE floor; most were rebuilt to 4 BUILD / 6 USE deliberately, which is where the +370 comes from.

**Presentations: 0 LEGOs carry a presentation clip for text that changed.** Rebuilt LEGOs are inserted fresh with a null presentation, so nothing announces one thing while the screen shows another.

### The one seed I flagged, and why

**Seed 228** — *"That man has just started to practise speaking."* Deborah wrote **`Gizon horri`** (dative). The course already teaches **`gizon horrek` = "that man" at seed 227, immediately before**. Building a second LEGO glossed "that man" would put one English prompt against two Basque forms — a textbook ZUT violation against its own neighbour — and `horri` is untaught. The two differ only by grammatical case, which cannot be glossed without a banned grammar label.

Your rule says flag rather than rebuild around it, so I left the seed exactly as it was and moved on. **My read: `horri` is a one-letter slip for `hori`.** `Gizon hori hitz egiten praktikatzen hasi berria da` is correct Basque and would tile immediately. That is Deborah's call, not mine.

### Content defects fixed as a by-product
- **Seed 268 was teaching the wrong thing.** Its LEGO said `iaz` = "last year" while the English says "last week" — Deborah corrected the seed to `joan den astean`. The LEGO now teaches **"last week"**, matching. (`joan den hilean` = "last month" from seed 37 gave a clean parallel.)
- **A live ZUT violation resolved**: "time" mapped to *both* `denbora` (s27) and `garaia` (s93). Seed 93 is now `time to go → joateko ordua`; the prompts differ honestly.
- Five downstream phrases stranded by my own edits — orphaned words, a containment break, an untaught auxiliary — found by re-running the detector after editing and repaired. One of those repairs itself created a duplicate, which I caught on the next pass and fixed.

---

## THREE PIPELINE DEFECTS — ONE IS SERIOUS

### (a) `edit-cascade`'s rollback empties live seeds. It fired ~20 times today.
The route deletes a seed's LEGOs and phrases, tries the new breakdown, and on rejection re-inserts its snapshot. **That re-insert always fails**, because it replays `course_legos.lego_id` — a **GENERATED ALWAYS** column Postgres refuses a value for. The route then reports *"original decomposition restored"* while the seed sits with **zero LEGOs and zero phrases**.

Rejections are the normal case, so this fires constantly. I built a backup-and-restore harness around every submit and **every emptied seed was restored within seconds**; the course now has zero empty seeds, verified. But without that harness this run would have gutted roughly twenty live seeds.

**Fix before anyone touches this route again:** strip generated columns on restore, and null `presentation_audio_id` on component rows (a second trigger, `refuse_component_introduction()`, correctly rejects those).

### (b) `/v2/validate` is not the gate
It checks the Basque side only. `/seed/complete` also runs the **English-side** check, **ZUT**, and a **stricter target-vocab check**. 13 of 17 proposals passed the simulation and were rejected on submit. There is no dry-run of the real gate.

**The English side is the real bottleneck, and it is stricter than documented.** I reported earlier that it licenses regular `-s/-ed/-ing`; **that was wrong and I'm correcting it** — for this course `stemKnownGloss` strips *nothing*. The contract supplies no `stemStrip`, so the gate is **exact-form only**: `finish` is allowed, `finished` is not; `message` is allowed, `messages` is not unless some gloss introduced that exact string. Once I extracted the true allowed-form inventory per seed and replicated the gate locally, the failures went away.

The other trap: **phrases must tile from WHOLE taught chunks**, never re-split into words. `bi galdera` fails if the course taught `galdera batzuk` as the unit.

### (c) `generateAudio` defaults to `true`
`edit-cascade` will spend TTS money unless you pass `generateAudio: false`. I passed it on every one of ~90 submissions and verified `wouldGenerateAudio: {skipped: true}`. Worth flipping the default.

---

## AUDIO — NOTHING GENERATED, NOTHING QUEUED

**6,178 clip slots now need rendering across eus_for_eng:**

| slot | count |
|---|---|
| phrase target1 | 1,948 |
| phrase target2 | 1,948 |
| phrase known (English) | 1,945 |
| LEGO presentations | 205 |
| seed target1 | 66 |
| seed target2 | 66 |

**Split synthetic vs human-recorded: 100% synthetic, 0% human.** All 28,893 existing clips in this course carry `origin = 'tts'` (Azure `eu-ES-Ainhoa`/`Ander`, plus xai voices). There is no human-recorded Basque anywhere in this course, so nothing here was make-before-break sensitive.

I have not queued an audio pass and have not rendered anything.

---

## THE HONEST CAVEAT

These 1,963 phrases passed gates that **cannot read Basque**. The gates check counts, tiling, containment and vocabulary bookkeeping; no code here judges whether a sentence is good Basque. The text is agent-authored — which is how the existing 6,800 phrases in this course got here too, but the volume is now much larger.

Deborah is the only person in this pipeline who can rule on that. Two things specifically worth her eye: **seed 228** (`horri` vs `hori`), and the **systematic pattern** in her own edits — she is consistently replacing synthetic ditransitive subjunctives (`lagundu diezazudan`, `lagun diezadazun`, `esan nahi ziola`) with periphrastic verbal nouns (`laguntzea`, `zizula`). That looks deliberate and it is now reflected in the LEGOs beneath 71 seeds.

### Backups
Pre-edit snapshots of every touched seed are in the run's scratch directory as `backup_s<N>.json` / `snap_s<N>.json`, each holding the complete original LEGO and phrase rows.
