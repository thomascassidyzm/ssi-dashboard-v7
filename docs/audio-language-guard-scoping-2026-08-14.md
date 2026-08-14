# The audio guard that rejects Pennsylvania Dutch

*2026-08-14 — read-only scoping. No changes made.*

Kai flagged this while doing the language display-name work and deliberately left
it alone. Here is what it is, why it is there, and what closing it costs.

---

## The short version

There is one function, `canonicalLanguage()`, that every audio *write* passes
through. It accepts a language only if the estate's reference CSV gives that
language a `database_code`. Pennsylvania Dutch has no `database_code`, so the
function raises "not in language_codes.csv" and the write fails.

It is not a policy about voices. Breton, Cornish and Manx have no synthetic voice
anywhere either, and all three sail through — they were added to a hand-written
list years ago and Pennsylvania Dutch never was. The guard is an artefact of who
happened to need a language before, not a decision about who should be allowed.

Closing it for Pennsylvania Dutch is **one cell in one spreadsheet-shaped file**.
No database migration, no re-render, nothing to back-fill: not a single audio row
in the estate carries any of the affected codes today.

**Recommendation: admit all fourteen affected languages at once, and separately
ask you to declare Pennsylvania Dutch human-voice-only** — the same ruling you
made for Breton on 2026-07-27, and the thing that makes admitting it safe.

---

## 1. Where the guard lives, and the real list

`services/shared/clip-identity.cjs`, function `canonicalLanguage()` (line 140).
It builds its accepted set from `tools/sync/reference/language_codes.csv` —
specifically the `database_code` column — plus a 44-entry hard-coded map inside
`services/language-code-service.cjs`. Anything not in that set throws.

**Kai said nine. It is fourteen.** Kai's nine were the languages that were *both*
nameless in the UI *and* rejected by the guard. Five more are rejected while
already having a display name, so they never showed up in the display sweep:

| Rejected | Course | Content built |
|---|---|---|
| **pdc** Pennsylvania Dutch | `pdc_for_eng` | 300 seeds, 661 LEGOs, 6,629 phrases |
| hak Hakka | `hak_for_eng` | 668 seeds |
| nan Taiwanese Hokkien | `nan_for_eng` | 668 seeds |
| yue Cantonese | `yue_for_eng` | 668 seeds |
| yor Yoruba | `yor_for_eng`, `cym_for_yor` | 305 seeds |
| lmo Lombard | `lmo_for_eng` | — |
| rgn Romagnol | `rgn_for_eng` | — |
| vec Venetian | `vec_for_eng` | — |
| fur Friulian | `fur_for_eng` | — |
| nap Neapolitan | `nap_for_eng` | — |
| scn Sicilian | `scn_for_eng` | — |
| roh Romansh | `roh_for_eng` | — |
| sme Northern Sami | `sme_for_eng` | — |
| yid Yiddish | `yid_for_eng` | — |

Fifteen courses, all `draft`. Measured by running the real function over every
distinct `known_lang`/`target_lang` in the live `courses` table: 73 distinct
languages, 14 rejected.

## 2. What it gates, and why it is load-bearing

**It gates writes and renders. It does not gate playback.** The learner app reads
`course_audio` straight from the database and never touches this code, so no
learner-facing behaviour depends on it.

What a rejection actually stops, in `services/phases/phase8-audio-v13.cjs`:

- **`/generate` — partially blocked.** Each item is canonicalised individually
  (`tryCanonicalLanguage`), so English known-side and presentation audio for
  `pdc_for_eng` would still render; every Pennsylvania Dutch target item is
  marked `identityError` and fails at dispatch.
- **`/regenerate-lego`, `/regenerate-phrase`, `/regenerate-presentations`,
  `/generate-components` — fully blocked.** These canonicalise the course's
  target language in their first few lines, so the throw takes the whole request
  down with a 500 — including the English rows in it.
- **`/insert` — 400.** This is the endpoint that registers a clip after TTS or a
  recording.
- **Cross-course clip reuse** (`executeCopyBucket`) fails per item, so a
  Pennsylvania Dutch course cannot even re-use an English clip another course
  already owns.
- **Pod generation** throws per clip on the target track.

**What makes it load-bearing:** `language` is not decoration. It is one of the
three columns of a clip's identity — `(language, text_normalized, voice_id)` —
and it sits inside the live unique index
`course_code, text_normalized, language, role, voice_id`. Two spellings of one
language are two identities: the dedup lookup misses, the system pays for a
render that already exists, and a reader filtering the other spelling can never
see the row. The guard exists because the previous function, `toIso3()`, **failed
open** — it lowercased anything it did not recognise, so `pt-BR` became `pt-br`
and the placeholder `auto` stayed `auto`, and 7,847 rows across 36 courses ended
up under a spelling nothing could find. Throwing is the deliberate correction.

So the guard is right to be strict. It is simply wrong about which languages exist.

## 3. Why those fourteen — voices, config, or history?

**History.** Not voice availability, and not a missing language config.

The accepted list is the `database_code` column of the reference CSV. That column
was filled in for languages that had a text-to-speech locale — 95 of the 96
languages carrying a `database_code` also carry an Azure, ElevenLabs or Google
locale. So the guard has *accidentally* become "languages a synthesiser speaks",
without anyone deciding that.

The exception proves it. **Manx** has a `database_code` and no TTS locale at all.
**Breton** and **Cornish** have no `database_code` and pass anyway, because
someone hand-wrote a Celtic block into `language-code-service.cjs`:

```
'bre': 'br',  'eus': 'eu',  'cym': 'cy',
'gle': 'ga',  'gla': 'gd',  'glv': 'gv',  'cor': 'kw'
```

`bre_for_fra` is a live course with no synthetic Breton voice in existence — you
ruled it human-voice-only on 2026-07-27 for exactly that reason — and it is
admitted to clip identity without difficulty. There is no principle here that
excludes Pennsylvania Dutch. The Celtic languages got a hand-written line and the
minority Germanic and Romance languages did not.

## 4. What closing it for Pennsylvania Dutch would touch

Less than you would expect, because Pennsylvania Dutch audio has not started.

- `pdc_for_eng` holds **one** audio row: an English "welcome" clip from
  2026-07-27. Nothing in Pennsylvania Dutch exists to migrate or re-spell.
- Its `voice_config` names a **known-side voice only** (Leo, xAI, English). There
  is no target voice, so admitting the language does not by itself cause a render
  — an item with no voice fails at dispatch as it does today.
- **No volunteer take has been uploaded yet.** `recording_provenance` has zero
  rows mentioning `pdc`. The guard has not bitten anyone yet; it will the moment
  the first take needs a home.
- Estate-wide, `course_audio` holds **zero** rows under any of the fourteen
  codes. Nothing to back-fill, nothing to de-duplicate, nothing to reverse.

**One thing worth knowing, which cuts the other way.** The guard is only on the
TTS side. The human recording path — `services/voice-engine/synthesis-job.cjs`
via `db.upsertHumanCourseAudio` — writes `course.target_lang` **raw**, with no
canonicalisation at all, and the pod registration path does the same. So when
Doug and Erik do start recording, their takes would write `language='pdc'` rows
perfectly happily, and phase 8 would then be unable to read its own estate's
rows. Admitting Pennsylvania Dutch is not only unblocking — it closes a hole
where the two halves of the pipeline disagree. *(That asymmetry is a separate
finding and deserves its own look; it applies to every language, not just these
fourteen.)*

## 5. The safe path, sized

Verified by building an isolated copy of the CSV and the two service files,
applying the change, and running the real `canonicalLanguage()` against it:
all fourteen resolve correctly, and every existing estate spelling — `eng`,
`zho`, `cmn`, `zh`, `pt-BR`, `fr-CA`, `cym`, `glv`, `en-GB`, `ara`, `por` —
resolves to exactly what it resolves to today. No regression.

1. **Fill the `database_code` column** in `tools/sync/reference/language_codes.csv`.
   Seven existing rows get a value (`se`→`sme`, `rm`→`roh`, `yi`→`yid`,
   `yo`→`yor`, plus `fur`, `nap`, `scn`); seven need a new row (`pdc`, `hak`,
   `lmo`, `nan`, `rgn`, `vec`, `yue`). Six of those seven are rows **Kai already
   added on the display-name branch** — this fills one more column on them. Names
   only, no locale: nothing gains a synthetic voice it does not have.
2. **Add a test file.** `clip-identity.cjs` currently has **no tests at all** —
   there is no test to flip, and none guarding the behaviour either. Assert the
   fourteen canonicalise and the existing spellings are unchanged.
3. **Your ruling: is `pdc_for_eng` human-voice-only?** Add it to
   `services/shared/human-voice-courses.cjs` alongside `bre_for_fra` if so. This
   is what makes step 1 safe — it guarantees admitting the language can never
   turn into a Pennsylvania Dutch line rendered by a German voice.
4. **Restart phase 8** — the CSV is read once at module load, and the services run
   from the production checkout on `main`.
5. **Verify** on a dry-run `/generate` for `pdc_for_eng`: target items stop
   carrying `identityError`.

**Size: one commit, about an hour, no database migration, no S3 operation, no
spend.** Fully reversible by reverting the CSV lines.

---

## What you are choosing between

**A — Leave it.** Costs nothing today. Pennsylvania Dutch audio stays impossible,
and the first volunteer take discovers it the hard way, mid-session.

**B — Admit Pennsylvania Dutch only.** One cell. Unblocks Doug and Erik. Leaves
thirteen identical landmines for whoever reaches audio next.

**C — Admit all fourteen, plus the human-voice-only ruling for Pennsylvania
Dutch.** Same edit, fourteen lines instead of one.

**D — Make the guard fail open** (fall back to the raw code). Rejected outright:
that is precisely the `toIso3()` bug the guard was written to kill, and it would
re-open the 7,847-row split-identity failure.

**My recommendation: C.**

- **Better** — every language we build a course in gets one agreed spelling, and
  the TTS and human halves of the pipeline stop disagreeing about what a
  Pennsylvania Dutch clip is called. B fixes one course and leaves the class.
- **Simpler** — it is data, not code. Fourteen cells in the file that
  `clip-identity.cjs` already names as its source of truth. Nothing conditional,
  nothing to remember, no second mechanism beside the hard-coded Celtic block —
  it makes that block the anomaly rather than the pattern.
- **Cheaper** — no migration, no re-render, no back-fill, no spend, because zero
  rows exist under any of the fourteen codes. The expensive version of this is
  the one where it is discovered by a volunteer with a microphone in their hand.

C is not more work than B; it is the same work applied once rather than fourteen
times. The only reason to prefer B is if you want a positive decision per
language, and the Breton and Manx precedents say we have never worked that way.

---

## Explicit gaps

- **Kai's count of nine is not wrong so much as differently scoped** — nine is
  the overlap between "rejected by the guard" and "had no display name". The
  guard rejects fourteen.
- **Job #559 is not on `main`.** The display-name work sits on
  `feat/language-display-names-2026-08-14` and is unmerged as of this writing.
  The CSV rows for `pdc`/`hak`/`lmo`/`nan`/`rgn`/`vec` exist only on that branch.
  This scoping deliberately did not touch it.
- **The 500-on-regeneration behaviour is read from the code, not executed.** I
  did not fire a live request at phase 8 against `pdc_for_eng`, because this pass
  was read-only and a real request risks a write. The `/generate` per-item
  behaviour and the endpoint-level throws are both plain in the source, but they
  have not been observed running.
- **The human-write asymmetry in §4 is reported as found, not investigated.** How
  many raw non-canonical language spellings the human path has already written
  across the estate is a separate question I did not measure.
