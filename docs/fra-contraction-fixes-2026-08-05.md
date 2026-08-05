# French contraction fixes — 2026-08-05

**Approval:** Tom, 02:08 2026-08-05, verbatim: "surely they are all trivial fixes?" — covering the
three French elision findings from `docs/exception-lego-leak-sweep-2026-08-04.md` (#1-3) only.
Nothing else in that sweep was touched.

**Scope:** three orthographically-obligatory elisions. `si` elides only before `il`/`ils`, never
before `elle`/`on`/`elles`; `que` elides before any vowel-initial word.

## Live rows found vs sweep's predicted counts

Direct read-only query against `course_practice_phrases` and `course_legos` (Unicode-safe boundary
matching, `/[^\p{L}\p{N}]/u`), not a re-read of the sweep doc.

| Pattern | Course | Sweep predicted | Live found | Note |
|---|---|---|---|---|
| `que on` → `qu'on` | fra_ca_for_eng | 10 | **4** | Discrepancy — see below |
| `jusqu'à ce que il/elle` → `qu'il/qu'elle` | fra_for_eng | 9 | **0** | Already correct live — see below |
| `si il` → `s'il` | fra_for_eng | 1 | **1** | Matches |

**Discrepancy #1 (4 vs 10):** all `fra_ca_for_eng` rows (12,887 phrases + 1,366 legos) were queried
directly; only 4 rows matched `que on` as a contiguous, word-bounded substring. No variant spelling,
casing, or apostrophe form accounted for the other 6. Read as: the sweep's count of 10 was an
overcount (possibly from an earlier, less precise regex pass — the sweep document itself flags that
its first contraction pass over-matched 733 hits before being corrected to the `\p{L}`-boundary
version). Applied every row that exists; did not manufacture the shortfall.

**Discrepancy #2 (0 vs 9):** every seed-396 row containing `jusqu'à ce que` in `fra_for_eng` already
reads `jusqu'à ce qu'il`/`jusqu'à ce qu'elle` correctly in the live DB (checked all 75 rows containing
"jusqu" course-wide, plus all 7 legos). Nothing to fix. Read as: this defect was already corrected by
another pass between the sweep (2026-08-04) and now, or the sweep's finding was itself a
false-positive at the time it was written. No action needed or taken.

## Rows changed

Evidence standard applied per row: full seed master sentence (`course_seeds`) + every sibling row at
the same `seed_number`/`lego_index`, read in context before editing (per the QA rubric §0). All 5 are
`course_practice_phrases` rows (`build`/`use` roles) — no `course_legos` or `component` rows matched
any of the three patterns, so no wider-blast-radius lego edits were needed.

### fra_ca_for_eng — `que on` → `qu'on` (4 rows)

Seed 22 — "because I want to meet people who speak French" → `parce que j'veux rencontrer du monde
qui parle québécois`. Siblings confirm `que` stays unelided before consonant-initial `tu`/`y`/`a`
(`parce que tu parles québécois`, `parce que y veut revenir`) and only elides before vowel-initial `on`.

| Row | Known | Before | After |
|---|---|---|---|
| `S0022L01U02` | "because we want to meet tomorrow" | `parce que on veut se voir demain` | `parce qu'on veut se voir demain` |
| `S0033L01U05` | "how long has it been that we want to meet?" | `ça fait combien de temps que on veut se voir?` | `ça fait combien de temps qu'on veut se voir?` |
| `S0038L02U05` | "it's been about a week that we want to think about it" | `ça fait à peu près une semaine que on veut y penser` | `ça fait à peu près une semaine qu'on veut y penser` |
| `S0047L01B04` | "i think that we want to meet" | `j'pense que on veut se voir` | `j'pense qu'on veut se voir` |

### fra_for_eng — `si il` → `s'il` (1 row)

Seed 289 — "I wonder if she's going to be there this afternoon" →
`Je me demande si elle va être là cet après-midi`. Siblings confirm `si` correctly stays unelided
before `elle` (`je me demande si elle peut`, `...si elle est ici`) — only the vowel-initial `il`
elides.

| Row | Known | Before | After |
|---|---|---|---|
| `S0289L01U05` | "I wonder if he's going to finish his work" | `je me demande si il va finir son travail` | `je me demande s'il va finir son travail` |

## ZUT check

Each edit changes only the target-side spelling of a known→target pair that is otherwise unique in
the course (checked: no other row shares the same normalized `known_text` with a different
`target_text` before or after the edit). These edits consolidate two spellings of one form into one,
moving toward ZUT compliance, not away from it. Zero new collisions introduced.

## Apply hygiene

Script: `tools/course-optimization/fix-fra-contractions-2026-08-05.cjs`.
- `DRY_RUN` (default) printed every row's before/after and asserted the pre-recorded before-state
  matched live DB — [`fra-contraction-dryrun-log-2026-08-05.json`](backfill-2026-08-04/fra-contraction-dryrun-log-2026-08-05.json).
- `APPLY=1` re-asserted before-state per row (would abort on drift) and wrote with an
  `UPDATE ... WHERE id = $1 AND target_text = $2` guard (no-op if raced) —
  [`fra-contraction-applied-log-2026-08-05.json`](backfill-2026-08-04/fra-contraction-applied-log-2026-08-05.json).
- Post-apply, re-ran the read-only finder (`scripts/find-fra-contraction-rows.cjs`) against all three
  patterns course-wide: **zero residue** on all three.
- No `course_legos` rows matched any pattern, so `checkEditedPhrase`/lego-level gates were not
  invoked — these were pure phrase-text corrections, not lego changes.
- Zero deletions; zero content loss.

## Audio pass — queued, not fired

```
node tools/course-optimization/queue-audio-pass.cjs fra_ca_for_eng --reason "French contraction fixes (que on -> qu'on) 2026-08-05" --by "@fra-contraction-fix-worker" --rows 4
node tools/course-optimization/queue-audio-pass.cjs fra_for_eng --reason "French contraction fix (si il -> s'il) 2026-08-05" --by "@fra-contraction-fix-worker" --rows 1
```

`fra_ca_for_eng` already had a pending request (from the 2026-07-24 BUILD template-stamp sweep) — the
queue tool touched/updated it rather than duplicating; `fra_for_eng` was freshly queued. `--list`
confirms both `fra_ca_for_eng` and `fra_for_eng` are pending as of this pass. **No TTS was generated
by this job.** Rendering remains overnight worker `8b1dae03-bd33-4229-8038-7e08933797b2`'s (German
first, then French) — no render/repair/phase8 tooling was launched, and no lock was touched.
