# Audio link reconciliation — the standing tool, and what the estate actually looks like

**Date:** 6 August 2026
**Tool:** `tools/audio-link-reconcile.cjs` (committed, shared with Kai)
**Nothing was generated. Nothing was deleted. Nothing was unlinked.**

---

## What it is

A slot reported as "missing audio" is very often not missing: the `course_audio` row exists, is
alive, and is simply not linked to the content row. Re-linking costs nothing and generates nothing.
This tool finds those, whole-course, and can heal them.

```
node tools/audio-link-reconcile.cjs <course_code>                  # report, whole course
node tools/audio-link-reconcile.cjs --all                          # report, every course
node tools/audio-link-reconcile.cjs <course_code> --json           # machine-readable
node tools/audio-link-reconcile.cjs <course_code> --apply          # heal (dry run is the default)
     [--include-loose] [--verify-storage] [--log <path>]
```

It walks every seed, LEGO and phrase — the Script Viewer's missing-audio filter only ever saw the
current batch of 20 rounds.

### The four buckets, per slot (slot = one content row × one audio role)

| | meaning | cost to fix |
|---|---|---|
| **(a) LINKED** | link set, `course_audio` row alive | — |
| **(b) UNLINKED-BUT-PRESENT** | link NULL, a matching alive row exists | **free** |
| **(c) TRULY ABSENT** | nothing matches | TTS — queue it, never spend here |
| **(d) DANGLING** | link set, points at a `course_audio` row that no longer exists | depends |

`course_legos.presentation_audio_id` and `course_practice_phrases.presentation_audio_id` have no FK
constraint, so (d) is real rather than theoretical: **17,537 dangling links estate-wide.**

### Two keys, kept distinct

Three normalisers disagree in this estate, so a slot can be unlinked purely as an artefact of which
one ran:

- `normalize_text()` (DB) = `rtrim(lower(trim(t)), '.?!¿¡。？！')` — writes `text_normalized`
- `normalizeForAudio()` (JS) — collapses internal whitespace, **keeps** a trailing `?`
- the old `link_audio_to_content` trigger matched `lower(trim(content_text))` — stripped nothing
  (154,257 rows were unmatchable; fixed in `20260806_audio_link_integrity.sql`, now applied)

So both keys are computed from the **raw** text on both sides, never from the stored
`text_normalized`, and reported separately: **strict** = `normalizeForAudio`, **loose** = strict plus
trailing `? ？ ¿ ¡` stripped.

**Loose matches are report-only unless `--include-loose`.** A loose match is a slot whose text
differs from the clip's only by a trailing `?` — the chunk `what` against the clip `what?`. The
estate keeps those apart deliberately (a `?` changes TTS intonation), and a link, once written, is
permanent in practice: every relink path only ever fills a NULL, so a correct clip rendered later
would never displace it. Free recovery must not quietly become a permanent downgrade.

### Apply hygiene

- dry run by default; `--apply` required to write
- **only ever fills a link that is NULL** — never deletes audio, never unlinks, never overwrites a
  link that already points at a live clip (make-before-break,
  `docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md` §6b)
- per-row before-state assertion **inside the UPDATE's WHERE clause**; a zero-row update means the
  row drifted under us and **aborts the whole pass**
- S3 `HEAD` on every candidate object before promising a free link — a `course_audio` row is a
  claim about audio, only the bucket settles it
- per-row log to `docs/audio-relink-{dryrun,applied}-log.json`
- re-runs the report afterwards and reconciles it against the log exactly

Which clip wins when several match is not decided here: it is
`services/shared/audio-link-preference.cjs` `pickPreferredAudioRow` (human > newest > larger id),
so repeated passes are deterministic and human recordings always win.

---

## The estate, measured — dry run over all 143 courses

| bucket | slots |
|---|---:|
| (a) LINKED | 2,534,631 |
| (b) UNLINKED-BUT-PRESENT | 14,013 |
| (c) TRULY ABSENT | 1,311,281 |
| (d) DANGLING | 17,537 |

**But (b) splits in two, and the split is the finding.**

### (b1) 849 slots this pass can heal today — 837 strict, 12 loose

| slot | strict | loose |
|---|---:|---:|
| `course_legos:presentation` | 231 | 0 |
| `course_practice_phrases:target1` | 192 | 0 |
| `course_practice_phrases:target2` | 184 | 0 |
| `course_practice_phrases:known` | 153 | 6 |
| `course_legos:target1` | 26 | 0 |
| `course_legos:target2` | 21 | 0 |
| `course_legos:known` | 14 | 2 |
| `course_seeds:*` | 16 | 4 |

Concentrated in a handful of courses: `ara_eg_for_eng` 527, `zho_for_jpn` 118, `ell_for_eng` 38,
`cym_n_for_eng` 18, `deu_for_eng` 18, `cym_s_for_eng` 17, `zho_for_eng` 13, `jpn_for_eng` 12,
`dan_for_eng` 10, `fra_ca_for_eng` 9, `ara_lb_for_eng` 8, `nld_for_eng` 8. One of the 849 picks a
**human** recording — exactly the case `pickPreferredAudioRow` exists for.

This backlog is small because the root cause was already fixed at the write path today
(`20260806_audio_link_integrity.sql` — see `docs/DECISIONS.md`, 2026-08-06). What is left is
historical residue, which is what a standing tool is for.

### (b2) 13,164 slots in `course_practice_phrases.presentation_audio_id` — **needs one ruling**

This tool **reports and refuses to heal** that slot. The reason, stated plainly:

- Presentation clips are keyed by `lego_id`, not by text, so the only available match is "this
  phrase's `lego_id`". Many phrases share a `lego_id`, so healing fans one presentation clip out
  across every phrase of that LEGO.
- The estate does not speak with one voice about whether that is correct. `eng_for_guj` has 1,119
  such links populated and `cat_for_spa` 514 — so the pattern exists and is used. But in
  `ara_lb_for_eng` **all 305** of them point at `course_audio` rows that no longer exist, and
  `ara_eg_for_eng` has 298 in the same state.
- That same slot is where nearly all of bucket (d) lives too: **17,537 dangling links, almost
  entirely phrase presentation** — `eng_for_guj` 1,135, `eng_for_fra` 1,083, `fra_for_jpn` 1,002,
  `eng_for_ara` 949, `eng_for_deu` 940, `deu_for_eng` 933.

**Decision candidate (one sentence):** should `course_practice_phrases.presentation_audio_id` be
linked to its LEGO's presentation clip by `lego_id` — in which case 13,164 slots are free to recover
and ~17.5k dangling links can be repointed — or is that column vestigial, in which case the honest
move is to stop reporting it as a slot at all? Nothing has been done to it either way.

### (c) 1,311,281 absent

That is the real generation backlog across 143 courses and it is **not** this tool's business. It
is queued, never spent: `node tools/course-optimization/queue-audio-pass.cjs <course> --reason "…"`.
The single largest contributor remains `ara_lb_for_eng` (35,917 absent slots — seeds 301–668 have
no audio at all; scoped separately in `docs/audio/ara-lb-missing-audio-scope-2026-08-06.md`).

---

## The proving run — `ara_lb_for_eng`, applied

The 1,324 clips that made Tom raise this had **already been re-linked** earlier today by the
write-path fix, so this course was not the large recovery it was when it was found. What remained:

```
(b) UNLINKED-BUT-PRESENT = 8  (3 strict + 5 loose)
```

Applied: **3 strict slots.** Storage-verified first (3 distinct objects HEADed, 0 gone).

| table | ref | column | audio |
|---|---|---|---|
| `course_seeds` | S0329 | `known_audio_id` | `7cff42e4…` ("it's important") |
| `course_seeds` | S0321 | `known_audio_id` | `01de0be5…` ("a book") |
| `course_legos` | S0207L01 | `presentation_audio_id` | `1f42c11c…` |

**Reconcile — exact:**

```
linked      21289 → 21292  (+3)
recoverable 8 → 5          (-3)
logged writes: 3
absent unchanged: 35917 → 35917
EXACT: YES — residue equals the log, nothing new
```

Log: `docs/audio-relink-applied-log.json`.

**The 5 held back** are all the `what` / `who` case: the content chunk is `what`, the clip is
`what?`. Linking them would permanently bind a question-intoned clip to a statement chunk, and
nothing would ever displace it. They are listed in the dry-run log with `match: "loose"` and are
one `--include-loose` away if the call is that something beats nothing here too.

---

## Gaps, stated rather than papered over

1. **`services/shared/audio-fallback-resolver.cjs` did not exist** when this was written. The
   entire choice logic is isolated in one function, `resolveSlot()`, precisely so it can be deleted
   and delegated to that resolver when it lands. Nothing else in the file makes a choice.
2. **Storage is only checked on the candidate set**, not on bucket (a). So "LINKED = 2,534,631" is a
   count of live DB rows, not of live S3 objects. A full estate storage audit is 2.5M HEADs and is a
   separate job.
3. **`--all --apply` is refused by design.** The estate-wide 837-slot heal is a real, cheap, free
   win and I have not taken it — that is the lead's call, not mine.
4. **The phrase-presentation ruling above is genuinely open** and is 94% of bucket (b) and ~100% of
   bucket (d). Everything else in this report is small by comparison.
5. **`--all` takes ~25 minutes** (143 courses, 2.5M audio rows, worked per course because naive
   whole-estate lateral joins hit the statement timeout).
