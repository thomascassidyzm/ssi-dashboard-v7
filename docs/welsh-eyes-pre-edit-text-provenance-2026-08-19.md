# Welsh "angry eyes": does any record of the pre-edit text exist?

**For Kai, 19 August 2026. Read-only forensics — no code, data or S3 object was changed, no audio
was generated, no machine transcription was used, no commits were made.**

---

## The short answer

**Yes, but only as prose, only for the North, and only as the general phrase — not per sentence.**

Two independent written records survive, both of them human sentences rather than data:

1. **Kai's own recording list, 17 June 2026**, states the before-and-after outright:
   the earlier North audio said *"pretty eyes" / "y llygaid del yma"*, and the text was rolled
   back to *angry / blin*.
2. **Deborah's QA note, 29 October 2025**, independently reports the same mismatch in the North
   course — and adds that the **English** side says "pretty eyes" too, not only the two Welsh voices.

**And here is the explicit gap: no machine record of the pre-edit text exists anywhere in scope.**
There is no manifest, no snapshot, no audit row, no prior S3 object version and no other database
table that holds the old text for any one of the 105 clips. Nobody can produce a per-sentence
before/after table from this estate. For the **South**, there is no record of a pre-edit text at
all, and every dated artefact I found says South was `crac` from the beginning.

---

## The clip set

105 human clips, counted from `course_audio` (`origin='human'`, `voice_id='legacy_import'`):

| Course | Welsh target1 | Welsh target2 | English known | Presentation | Total |
|---|---|---|---|---|---|
| `cym_n_for_eng` (seed 272, *blin*) | 10 | 10 | 10 | 1 | **31** |
| `cym_s_for_eng` (seed 290, *crac*) | 24 | 24 | 24 | 2 | **74** |
| | | | | | **105** |

The 68 Welsh-language clips are the ones I traced through every store below.

---

## 1. The legacy manifest — found by name, absent from this workspace

The importer took the manifest as a filesystem path. Two committed scripts still record the
literal path, which was on Tom's Mac:

> `const JSON_PATH = '/Users/tomcassidy/Downloads/Welsh-north_for_English_speakers_20250604_162031 (5).json';`
> — `database/import-welsh-structure.cjs` and `database/import-welsh-audio-v12.cjs`, committed 23 December 2025

The Southern one is referenced only generically, as `~/Downloads/en-cy-south.json`
(`database/import-course-v13.cjs`, 4 January 2026).

`docs/welsh-json-to-v12-mapping.md` in **ssi-learning-app** is a 23 December 2025 structural
analysis of that exact North file — 472,825 lines, 305 seeds, 20,638 audio samples, top-level
`id: "en-cy-north"` / `slices` / `samples`. So the manifest was real, was read on this project,
and its shape is documented. **Its contents are not.** The mapping document describes the
structure and counts and never quotes a sample text.

**Neither Welsh manifest is in either repository, on any branch, in any worktree, in any
scratch directory, or anywhere in the git object store.** What I searched:

| Search | Result |
|---|---|
| Both working trees for the 68 mastered UUIDs (incl. `.worktrees/`, `.a108-*`, `.a134-*`, `.a74-scratch`, `archive/`) | 7 files, all derived DB exports from today or estate-wide key dumps — no manifest |
| `git log --all -S'llygaid'` on both repos, all branches | 7 commits ever. None is a manifest. ssi-learning-app: **zero** |
| Largest blobs in the entire object store, incl. unreachable (`git cat-file --batch-all-objects`) | Legacy manifests for **en-es, en-ga, en-it, en-cm** are in history. **No en-cy-north, no en-cy-south** |
| `git fsck --lost-found`, dangling commits and trees | Nothing Welsh |
| Committed `packages/lesson-player/public/manifests/cym_n_for_eng.json` / `cym_s_for_eng.json` | **Zero bytes.** Empty placeholders |

The Irish manifest survives as `scripts/en-ga-compare/en-ga.json` because someone once copied it
across for a comparison. Nobody ever did that for Welsh.

**The one live lead, and it is outside my workspace:** if that ~470k-line file is still in
`~/Downloads` on Tom's Mac (Camberley), it is the only artefact that could give a per-sentence
before-text. I could not reach it and did not try. It is worth someone looking.

One honest caution about what it would prove. The manifest was exported **4 June 2025**; Deborah
reported the mismatch **29 October 2025**. If the del→blin text edit happened in the legacy system
in that window, the June manifest would still say *del* and would be exactly the before-record you
want. If the edit predates June 2025, the manifest already carries the mismatch and proves only
that Popty inherited it. Both are possible from what I can see here, and I am not going to guess
which.

---

## 2. S3 dates are not an instrument

I HEADed all 68 Welsh eyes objects and 200 random other Welsh human objects. No writes of any kind.

| Probe | Objects | LastModified range | Distinct timestamps | User metadata |
|---|---|---|---|---|
| The 68 eyes clips | 68/68 found | 2025-05-15 **11:24:40 → 11:34:51** | 67 | none |
| 200 random Welsh human clips | 200/200 found | 2025-05-15 **11:24:33 → 11:34:58** | 175 | none |

**The entire Welsh human estate landed in the same ten-minute window on 15 May 2025.** The eyes
clips are indistinguishable from every other clip. The second-level variation is just upload order
within one bulk migration, not recording dates. S3 `LastModified` cannot separate a stale clip from
a good one, and it cannot date a recording. It is not an instrument here.

No object carries any `x-amz-meta-*` user metadata — no original filename, no session, no date.

Bucket versioning **is** enabled on `ssi-audio-stage`, which raised a real hope of an older object
underneath. There isn't one: every eyes key I checked has **exactly one version and zero delete
markers**. The clips were written once and never overwritten. That route is closed.

---

## 3. No other store in this database holds a text for those clips

I swept every text-bearing column in the public schema for `llygaid`, and separately joined all
105 clips' `s3_key`s and row ids against every audio-referencing table.

| Store | Result |
|---|---|
| `audio_clips` | **Zero Welsh rows at all** — the clip-identity allowlist excludes `cym` |
| `shared_audio` | 3 `llygaid` hits, all Azure TTS encouragements from July 2026, unrelated |
| `target_audio`, `audio_repair_candidates`, `_canon_*`, `_fix_*`, `_converge_*` | No eyes keys |
| `course_audio_revisions` (525,985 rows) | No eyes clips, no `llygaid` anywhere |
| `audio_clip_promotions`, `audio_convergence_log` | No eyes keys in `old_s3_key` |
| `listening_pod_sentences` (19,519), `lego_introductions` (47,647) | No `llygaid` |
| `seed_redo_snapshots` (89), `raw_seed_uploads` (248), `recording_provenance` (355), `target_seed_texts` (319) | No `llygaid` |
| `board_snapshots`, `course_seed_drafts`, `apml_documents`, `documentation_content` | **Empty tables** |
| `course_qa_clip_status`, `course_qa_cycle_clips`, `seed_cycles` | Hits, but all three are **views** over `course_audio` — they echo today's text |
| `canonical_seed_translations` | 2 rows, created 2026-01-25, already say `crac`/`blin` |

`content_audit_log` cannot help by construction: it begins **2026-07-03**, three months after the
last plausible edit window, and holds **zero** rows keyed to any of the 105 clips. Of 571 Welsh
`course_audio` audit rows since 6 August 2026, **none** records a text change.

---

## 4. The dated paper trail

This is the most useful thing to come out of the sweep, because it bounds when the damage happened.

| Date | Artefact | What it says |
|---|---|---|
| **2025-05-15** | S3 bulk migration | All Welsh human audio uploaded, one 10-minute window |
| **2025-06-04** | Legacy manifest exported | `Welsh-north_..._20250604_162031 (5).json` — the file we cannot reach |
| **2025-10-29** | **Deborah, "QA Cymraeg y Gogledd"** | *"mae'r Saesneg a'r ddau lais yn dweud "pretty eyes" ond mae'r testun yn Gymraeg yn dangos "llygaid blin""* — the English and both voices say pretty eyes, the Welsh text shows llygaid blin |
| 2025-12-23 / 2025-12-31 | `course_legos` created | North seed 272, South seed 290 — structure import |
| **2026-01-04** | `course_audio` created | The audio import. Text/audio pairing inherited wholesale |
| 2026-02-17 | `scripts/qa-comparison/cym_s_for_eng-sample-r2.json` (git history) | Southern QA sample already says **`llygaid crac`** |
| **2026-06-17** | **Kai, `docs/en-cy-north-blin-recording-list.md`** | *"The earlier audio mistakenly said 'pretty eyes' / 'y llygaid del yma'."* |
| 2026-07-03 | `content_audit_log` begins | Too late to have seen any of it |

**The decisive point is Deborah's date.** She reported text-says-*blin*/audio-says-*pretty* on
**29 October 2025** — more than two months **before** the content ever entered this Postgres on
4 January 2026. The mismatch was not created in Popty. It was inherited, already broken, from the
legacy system. That is why no table in this database holds a before-text: at no point in this
database's life was the text anything other than what it is today.

### The two surviving records, verbatim

**Kai, 17 June 2026** — `docs/en-cy-north-blin-recording-list.md`, commit `2c9c2c8c`,
author kai-saraceno, on `origin/kai-stage-backup-2026-07-28` and
`origin/kai-stage-uncommitted-2026-07-28`. **This file never reached `main` and is not in any
working tree** — it exists only in git history on two backup branches.

> The North Welsh course content is **"angry eyes" / "y llygaid blin yma"** (seeds 271–273).
> The earlier audio mistakenly said "pretty eyes" / "y llygaid del yma". Text has been rolled
> back to the correct *angry* / *blin* wording; the audio below needs (re-)recording.

It goes on to list 12 English phrases and 11 Welsh phrases needing re-recording — but it lists
them in their **current** *blin* wording. It gives the old form once, as the general phrase
*"y llygaid del yma"*. It does not give a per-sentence before-text, and it says nothing about the South.

**Deborah, 29 October 2025** — to-do list "QA Cymraeg y Gogledd", in the list description:

> Gwregys Du - mae'r Saesneg a'r ddau lais yn dweud "pretty eyes" ond mae'r testun yn Gymraeg yn
> dangos "llygaid blin"

North only. She QA'd the South separately and made five findings against it; the eyes are not
among them.

---

## 5. The South

Every dated artefact says the South was **`crac`** from the start, and no artefact anywhere records
a South pre-edit text:

- The February 2026 QA samples in git history already read `llygaid crac` — and that is
  **before** the last South LEGO edit (`updated_at` 2026-02-23), so it is not a post-edit artefact.
- `canonical_seed_translations`, written 2026-01-25, says `crac`.
- Deborah QA'd the South and did not flag the eyes.
- Kai's June 2026 document treats the South as the good course and says explicitly that
  *"nothing is reusable from the southern course"* because North uses *blin* and South *crac*.

**If the Southern recordings say *del*, nothing in this estate explains why, and nothing in this
estate records it.** That is a genuine open question, not something I can close from data.

---

## 6. Explicit gap

**No machine-readable record of the pre-edit Welsh text exists anywhere in scope — not in either
repository's working tree, git history or object store, not in any S3 object or object version,
and not in any table of this Postgres — so a per-sentence before/after table for the 105 clips
cannot be produced from this estate; the only surviving before-text is the single phrase
"y llygaid del yma", quoted in prose for the North alone by Kai on 17 June 2026 and corroborated in
English by Deborah on 29 October 2025, and for the South there is no record of a pre-edit text at all.**

The one avenue I could not test, because it is outside this workspace, is the original manifest
`Welsh-north_for_English_speakers_20250604_162031 (5).json` in `~/Downloads` on Tom's Mac.

---

## Notes on method

- Read-only throughout: `SELECT` only against Postgres; `headObject`, `getBucketVersioning` and
  `listObjectVersions` only against S3. No writes, no deletions, no audio, no commits.
- No whisper and no machine transcription of any kind, per Kai's ruling. Every claim about what
  the audio *says* in this document is quoted from a human — Kai or Deborah — never inferred by me.
- Probe scripts were written to `scripts/welsh-provenance-probe/`, which is gitignored scratch.
