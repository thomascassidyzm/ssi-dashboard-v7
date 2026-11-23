# Child B — items 7, 8, 9: changesets, census, plans. NO live writes (#785·AK)

You write NOTHING live. You are not a DB writer. Planning reads go to the nightly QA copy
(`set -a; . ~/ssi-restore/qa-copy.env; set +a` before a committed tool; the db shim routes reads there).

## Item 7 — item 9 back-fill for 17 courses (phrases only; no renders; nothing applied tonight)
- Worklist: `ops/paid-cleanup-item9/THIN-BASKETS.json` / `.md` on Popty main — 307 LEGOs below the phrase floor. Read
  `ops/paid-cleanup-item9/CHANGESETS.md`, `ops/paid-cleanup-item9/tools/`, and the precedent author brief
  `ops/paid-cleanup-item9/briefs/author-778.md` (its build/validate steps are the house pattern) before writing anything.
  Check first whether any of the 17 courses were already back-filled by #778 or later (`git log --all -- ops/paid-cleanup-item9`)
  and repeat nothing.
- Reading taken (flag it in your report): author the new phrases as NIGHT CHANGESETS (`services/shared/changeset.cjs`,
  same shape as the item-9 ones), one per course, into `ops/overnight-785/item7-backfill/<course>/`. Each must pass
  `node tools/changeset/apply-changeset.cjs <file> --check`. Commit + land on main for a later apply Kai approves. Do NOT
  apply, do NOT arm a timer, do NOT render.
- Phrases are model-written to the canon: ZUT, controlled known side, P17 whole LEGO, shortest LEGO cut, P1/P2 only taught
  material. **Thin baskets over bad phrases**: never pad with a weak phrase; leaving a basket thin is fine and is counted.
- Item 8's duplicate counts feed this: never author a phrase that duplicates an existing row in its basket or course.

## Item 8 — item 12 duplicate census, 46 courses (read-only, QA copy)
- Question: per course, how many rows inserted by paid-cleanup item 12 (seed sentence added as a practice phrase, #957·AI /
  #964·AI / #976·AI, 19-21 Nov) duplicate an already-existing phrase (same LEGO basket / same known+target text).
- Use COMMITTED tools only: `ops/paid-cleanup-717/recount`, `ops/paid-cleanup-717/tools`, `tools/paid-cleanup-717/snapshot.cjs`,
  `ops/paid-cleanup-717/item12*`, or whatever #914·AI/#976·AI used. If no committed tool answers it as-is, that is an
  EXPLICIT GAP: say exactly which tool is missing and what it would need. Never hand-write a query (the guard refuses it,
  and the rule is Tom's HARD rule). Output `ops/overnight-785/item8-census/` (per-course counts + the command that made them).

## Item 9 — cleanup items 18 / 16 / 14: PLANS ONLY, nothing applied
- 18 = the same row twice in one basket (3,775 + 2,603); 16 = a wrong NEW flag (645 LEGOs); 14 = a question mark on one side
  only (2,883 rows). Counts from the 19 Nov copy (#914·AI: `ops/paid-cleanup-scan-447/`, memory "paid-cleanup-914").
- Write a fix plan per item (what the defect is with 3-5 real examples, the fix rule per case, what is Kai's call, size,
  whether it needs audio, and the apply route). Kai, 18 Nov: "I don't want scripts to be used on these kinds of fixes unless
  I approve it specifically — you can suggest it, but don't do it without my approval." So a scripted fix is written as a
  PROPOSAL for his Y/N. Publish each plan (`/api/publish-doc` with your conv_id) and list the urls in
  `ops/overnight-785/item9-plans/README.md`.
