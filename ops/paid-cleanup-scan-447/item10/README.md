# item 10 — LEGO says what its seed does not (L26) + K54 + jpn L7 — PLAN ONLY

Job #714·AI (Kai, 18 Nov 2026: "do this one even more carefully and tell me the detailed plan before applying").
Nothing here has been applied. The apply is a later job that sends each `plans/<course>.json` `ops` list with `"apply": true`.

## Files

| path | what | regenerates? |
|---|---|---|
| `candidates-2026-11-17-scan.json` | the 17 Nov scan rows for this item (1,412; eng_for_sin excluded, D1 pending) | no (frozen scan) |
| `recount.json` | live recount 18 Nov per row (`status` same/changed/fixed) | `tools/` + dumps, re-runnable |
| `decisions/<course>.py` | **hand-authored** per-LEGO judgement (the real work) — writes `decisions/<course>.json` | the .py is the source; .json regenerates from it |
| `plans/<course>.json` | machine plan: per LEGO before→after, basket actions, back-fill rows, floor, vocab check, knock-on census, exact `ops`, `dryRun`, `validator` | yes: `plan.py` → `dryrun.py` → `validate.py` |
| `lexicon/lex-<course>.json` | the course's own char/word readings for romanisation (zho) | `tools/lexicon_zho.py` from `baskets --all` |
| `review.md`, `audio-price.json` | cross-family review, audio price | later milestones |

## Pipeline (all READ-ONLY against the course; Popty HTTP routes only)

```
python3 -I ../dump-course.py <course> $CS_SCRATCH/dumps/<course>.json      # GET script-view, 50-seed windows
python3 -I decisions/<course>.py                                          # hand decisions -> json
python3 -I tools/baskets.py <course> $CS_SCRATCH/dumps/<course>.json       # full rows incl. target_text_roman (touched seeds)
python3 -I tools/plan.py <course> $CS_SCRATCH/dumps/<course>.json          # -> plans/<course>.json; prints problems
python3 -I tools/dryrun.py <course>                                       # POST edit-batch WITHOUT apply (rolled back)
python3 -I tools/validate.py <course> $CS_SCRATCH/dumps/<course>.json      # POST :3471/api/v2/validate override per touched seed
```

A course is DONE when: `plan.py` prints 0 problems, `dryRun.chunks[*].status == 200`, `validator.seeds_with_new_issues == []`.

`plan.py` mirrors the course-builder validator (floor build 3+/use 5+ after seed 3, a bare-LEGO row never counts; every
target chunk of a kept/new row taught by that seed) so failures are named per row; `validate.py` is the authority.
Edit-door lessons: a `phrase.insert` needs `lego_count`; a target change on a row carrying romanisation needs a new
`target_text_roman` (`ROMAN_STALE`); `expect` catches rows other cleanup items changed (`DRIFT`) — re-dump and re-plan.

## Status per course

See the job journal / the published doc. Probe: zho_for_eng seeds 3-36 (22 LEGOs) dry-run clean, validator 0 new, 18 Nov.
