# A/B arm brief — por_for_eng mechanical held items, DRY RUN ONLY (cs #842·AI)

You are ONE ARM of a model A/B. Another worker on a different model gets this exact brief. Tom wants to
see whether Popty's apply-a-reviewed-plan jobs need Opus. Do the job as well as you can; do not try to
be cheap or expensive on purpose. Your output will be diffed against the other arm's.

## PURPOSE
Build — and validate with Popty's own edit-batch DRY RUN — the edit-batch that would clear the
mechanical part of Kai's held por_for_eng queue (#426·AI's check, 17 Nov). **Nothing is applied.**
The payload you produce may later be applied by someone else after Kai looks at it.

## PRICE
0 TTS characters (every fix reuses existing clips). A handful of Popty read calls and dry runs.
Well under 30 minutes. No tests, suites, typechecks or builds (tests are off estate-wide).

## HARD LIMITS — breaking any of these voids the arm
1. **NO LIVE WRITES.** Never send `"apply": true` to edit-batch. Never call any route that writes
   (audio render, queue-audio-pass, publish to the course, approve). If you think an audio render is
   needed, do NOT call the render route at all — list it in your notes as "needs render".
2. Popty only. No psql, no `node -e`/heredoc/scratch scripts against the DB, no Supabase REST (r-2026-10-14).
   Read through Popty routes on http://localhost:3470 (e.g. `GET /api/production/por_for_eng/edit-ops`,
   the seeds/production read routes). A small committed builder script in your output dir that only
   turns a JSON plan into edit-batch ops (as ops/deu-held-apply-440/build-ops.cjs does) is fine.
3. Touch nothing outside the rows named below. Do not merge to main.

## THE ITEMS (course `por_for_eng`) — settled under Kai's standing gate, 17 Nov 12:42Z:
> "if you're reasonably confident it doesn't clash with mine or tom's rulings and it has a precedent, you're welcome to fix."

Source of facts: `ops/ab-model-842/inputs/por-held-426-per-row-table.md` (full #426·AI table incl. the
F1 appendix) and `inputs/por-held-426-families.md`. Re-read every row live through Popty before
building its op — #426's numbers are from 17 Nov.

- **A. F1 seed-copy drift, 64 rows** (appendix of the per-row table): set each copy row's `target_text`
  to the exact seed `target_text` and link the seed's own `target1_audio_id` / `target2_audio_id`.
  Known side is already identical — check that, and hold any row where it is not. Precedent: #416 did
  10 such rows on 22 Oct.
- **B. F6 capitals, 6 rows:** S0404L01 "Thursday"; S0428L01 + its B01 "Tuesday"; S0635L02 + B01 "Jane"
  (target too); S0635L02B02 "Jane's". Same words, so clips stand; if the dry run shows a clip would be
  unlinked by the text change, keep/relink the existing clip (allow_text_mismatch, as #416 did).
- **C. S0111L01U06** target := "quando é que começaste a aprender?" (= seed 79), relinking seed 79's
  target1/target2 clips. Confirm the known text equals seed 79's.
- **D. Delete S0450L01U05** (same English as U02, other answer). Confirm the LEGO keeps practice
  phrases — the DB refuses DEBUT_WITHOUT_PRACTICE on apply and the dry run cannot see it, so check
  the counts yourself and say what you found.

Anything you cannot make clean: HOLD it with its reason. Never force.

## HOW
- Read `GET /api/production/por_for_eng/edit-ops` for the op vocabulary.
- Build ONE edit-batch covering A–D. Send it as a dry run: `POST
  http://localhost:3470/api/production/por_for_eng/edit-batch` with body `{"ops":[...]}` and NO
  `apply` key (default is dry run), header `x-agent-id: ab842-<your arm>`.
- Read the dry-run answer; fix your ops and re-dry-run until it is clean or what remains is a held
  item. Keep every dry-run answer.

## OUTPUT (this is what gets diffed — be exact)
In your own checkout, write `ops/ab-model-842/<arm>/` where `<arm>` is `sonnet` or `opus` as your
dispatch says:
- `ops.json` — the final edit-batch ops array exactly as last sent.
- `dry-run.json` — the final dry-run response, verbatim.
- `held.md` — every held row and why; plus the D practice-count finding.
- `notes.md` — ≤15 lines: dry-run iterations count, anything surprising.
Commit and push your branch. Do NOT merge to main.

## REPORT
One paragraph + landing line: rows in the batch, dry-run verdict (clean / errors), held count, number
of dry-run iterations. Say explicitly that nothing was applied.
