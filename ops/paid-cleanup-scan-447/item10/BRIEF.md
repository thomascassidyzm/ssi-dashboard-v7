# item 10 (LEGO says what its seed does not) — shard brief, cs #739·AI
Shared by every item-10 shard worker. PLAN ONLY — nothing is applied, no audio is rendered.

## What you produce, per course in your shard
`decisions/<course>.py` (hand-authored, writes `decisions/<course>.json`) → `python3 -I tools/plan.py <course> <dump>` →
`plans/<course>.json` → `tools/dbslot.sh python3 -I tools/validate.py <course> <dump>` →
`tools/dbslot.sh python3 -I tools/dryrun.py <course> --chunk 50` → `python3 -I tools/price.py <course>`.
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

## Load rules (Kai, 18 Nov — a live email send was starved by our writes)
EVERY step that reaches Popty or the course-builder (dump, baskets fetch, validate.py, dryrun.py, lexicon harvest) runs inside
`tools/dbslot.sh` — it takes the shared lock (one item-10 worker on the shared store at a time) and waits while it is busy.
Dump with `tools/dbslot.sh python3 -I ../dump-course.py <course> $CS_SCRATCH/dumps/<course>.json`. No parallel fan-out,
no xargs -P. dryrun.py with `--chunk 50` (≤50 ops per rolled-back transaction). If dbslot exits 75, record it and move on.
NEVER send "apply": true. No hand-written code against the store — only these committed tools and Popty GET routes.

## Romanisation
zho rows carry `target_text_roman` (tools/roman.py; lexicon harvested by tools/lexicon_zho.py — adapt it for your course).
jpn/kor: if the door answers ROMAN_STALE, supply readings in the decisions file's `roman` map by hand; flag what you could not.

## Land
Commit decisions/plans/lexicon for your courses only (never another shard's files), push your own branch. Do not merge to main.
Report: per course — candidates, verdict counts, rows new/changed/deleted, dry-run status, validator new-issue seeds, chars
(price.py), held list with reasons. One paragraph + landing line.
