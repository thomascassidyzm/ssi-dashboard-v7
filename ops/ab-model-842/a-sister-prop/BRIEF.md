# A/B test (a), MECHANICAL: por_br sister-course propagation, FILE-ONLY (cs #842·AI)

You are ONE ARM of a model A/B. A worker on another model gets this exact brief, and your output is
diffed against theirs and against a hidden reference. Do the job properly; don't aim to be cheap or
expensive on purpose.

## PURPOSE
por_br_for_eng (Brazilian Portuguese) still carries European Portuguese forms that were already
fixed in the European course. Kai approved carrying the same RULES across on 18 Nov. Your job is to
author the text plan. **Nothing touches the database.**

## HARD LIMITS (breaking any of them voids the arm)
- FILE-ONLY. Make no call to Popty (:3470/:3471), no edit-batch (dry run included), no audio route,
  and no database access of any kind. Your only input is `inputs/live.json` in this directory.
- BLIND. Do not read anything under `ops/sister-propagation/por_br_for_eng/` on any branch, and do
  not read other jobs' reports about it. That is the reference you are being scored against.
- Do not merge to main.

## INPUT
`inputs/live.json` is a snapshot, read live on 18 Nov, of the rows in scope: `phrases` (87), `legos`
(12), `intros` (6) and `seeds` (6). Each row has its `known_text` and `target_text`.

## THE RULES (Brazilian norm; apply the RULE, not a row; the known/English side never changes)
1. `ter a certeza` → `ter certeza`, in every conjugation (tenho/tinha/… a certeza → … certeza).
   Michaelis gives "ter certeza"; the course already says `tenho certeza` in S0482L04U05.
2. `magoar(-se)` for physical hurt → `machucar(-se)` (`se magoou` → `se machucou`). In Brazil
   *magoar* means hurt feelings, and *machucar* means physical hurt.
3. `falando a sério` → `falando sério`.
4. tu-forms → você-forms, with the verb in the third person: `perguntaste` → `você perguntou`,
   `concordaste` → `você concordou` (canon K26: Brazilian uses você).
5. `pensar em` (+ infinitive, meaning "consider doing") → `considerar` (`devia pensar em fazer` →
   `devia considerar fazer`). This carries #432's seed-98 fix through to its rows.

A LEGO whose target changes changes its own target too, and every phrase under it must still contain
the LEGO's new target exactly. If a seed's target text carries a form, change the seed as well.
Leave anything the rules don't cover exactly as it is. Where you think a rule should NOT apply to a
row, skip that row and write the reason down.

## OUTPUT, in `ops/ab-model-842/a-sister-prop/<arm>/` (your arm name is in your dispatch)
- `plan.json`, with exactly this shape:
  `{"course":"por_br_for_eng","phrases":[{"id":"S0202L03B01","target":"<new target>"}],
    "legos":[{"id":"S0202L03","target":"..."}],"seeds":[{"n":202,"target":"..."}],"deletes":[]}`
  List ONLY the rows whose target changes, and give each one its full new target text.
- `skipped.md` lists every in-scope row you left alone on purpose, with the reason.
- `check.md` holds your own self-check, in at most 10 lines: that every phrase still contains its
  LEGO target, and any one-English → two-Portuguese clash you introduced.

Commit with scoped adds and push your own branch.
REPORT: one paragraph covering the counts (phrases, legos, seeds changed, skipped), followed by the
landing line.
