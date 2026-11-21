# item 10 (LEGO says what its seed does not) — shard brief, cs #739·AI
Shared by every item-10 shard worker. PLAN ONLY — nothing is applied, no audio is rendered.

## What you produce, per course in your shard
`node ../copy-read.cjs dump <course> $CS_SCRATCH/dumps/<course>.json` (nightly copy) → `decisions/<course>.py`
(hand-authored, writes `decisions/<course>.json`) → `python3 -I tools/fetch_baskets.py <course>` →
`python3 -I tools/plan.py <course> <dump>` → `plans/<course>.json` → `python3 -I tools/validate.py <course> <dump>` →
`python3 -I tools/dryrun.py <course> --chunk 50` (writes `plans/<course>.changeset.jsonl` when clean) → `python3 -I tools/price.py <course>`.
Model your decisions file on `decisions/zho_for_eng.py` (#714·AI's 22 LEGOs, seeds 3-36 — already done, do not redo them).
Candidates: `recount.json` rows where `course` is yours (and seed range if your shard names one). Each row is a
CANDIDATE from a regex/LLM scan, not a verdict: read every LEGO in its seed and decide.

## Verdicts (plan.py docstring is the schema)
- `regloss` — known side only, to the seed's own words (most eng_for_* and many x_for_eng cases).
- `grow` — LEGO re-cut to the seed span (L25: a LEGO that cannot be glossed to match the seed is a chunking signal, usually BIGGER). Kai 17 Nov: use the SHORTEST cut that matches; stand-in "it" frames OK.
- `seed` — L25 rung 3, edit the seed's known text: Kai's call, so mark it in `why` with "KAI:"; still planned in full.
- `keep` — not a defect (say why: K6 inflection, K54 "to", K23 presentation context, scan misread…).
- `kai` / held — only where a fix would create a ZUT clash (one known → two targets) or a K54 "to" clash; give the reason, not a question.
- Basket: every row must still contain the WHOLE new LEGO (P17, K49 split/reorder OK); rebuild or delete rows that don't;
  back-fill (`add`) from words taught by that seed so the basket keeps about its row count. The known side is a controlled language too.
- K54 (35 rows, fam "TO"): a verb LEGO's English gets "to"; an imperative never; not owed with subject/modal/finite/-ing.
- jpn L7: a particle taught alone is a construction feature — grow it into the LEGO it serves.

## Canon digest (full text: course-methodology-canon.md at repo root — grep the IDs, never read it whole; 385k chars)
L26 a LEGO holds only words its seed says, both sides (HARD). L25 un-glossable → re-chunk, usually bigger. L13 A-LEGO before the
M-LEGO containing it. S3 coverage HARD, S4 overlap fine. P17 every row contains the whole LEGO. K49 split/reorder inside a row OK.
K6 known side may inflect taught words. K54 as above. ZUT one known → one target. R0.13 anything regex-touched is read by hand.
R0.3 rewording or deleting a phrase is legitimate. Kai: easy words matter early only; one target / many English is fine.

## Database rule (cs #931·AI, 19 Nov — the planners were cancelled at ~10:20Z for reading live)
Every READ is from the NIGHTLY COPY through `../copy-read.cjs`, which refuses any database URL that is not the local
ssi_copy login (it finds ~/ssi-restore/qa-copy.env or qa-copy-fresh.env itself). No Python, psql or other client reaches
live; no Popty read route (script-view, lego/seed baskets), no :3471 validate, no `../dump-course.py`. The ONE call towards
live is the DRY RUN: `dryrun.py` → POST /api/production/<course>/edit-batch WITHOUT "apply", chunks of at most 100
(default 50), paced, each chunk only while /health shows dbLoadGate governed + green (`../copykit.py` gate; exit 75 after
30 min not green — record it, move on). An all-200 dry run also writes `plans/<course><tag>.changeset.jsonl` and runs
`node tools/changeset/apply-changeset.cjs <file> --check` (offline). Never run the applier without `--check`: applying is a
later, separate yes from Kai. `tools/dbslot.sh` is no longer part of the pipeline. A copy is up to a day old, so a dry run
may answer DRIFT on a row changed since: re-dump from the next nightly copy and re-plan; never read live to catch up.
No parallel fan-out, no xargs -P. NEVER send "apply": true.

## Romanisation
zho rows carry `target_text_roman` (tools/roman.py; lexicon harvested by tools/lexicon_zho.py — adapt it for your course).
jpn/kor: if the door answers ROMAN_STALE, supply readings in the decisions file's `roman` map by hand; flag what you could not.

## Land
Commit decisions/plans/lexicon for your courses only (never another shard's files), push your own branch. Do not merge to main.
Report: per course — candidates, verdict counts, rows new/changed/deleted, dry-run status, validator new-issue seeds, chars
(price.py), held list with reasons. One paragraph + landing line.
