# esgusodwch fi replaces sir/madam (job #114, DRAFT ONLY — nothing applied)

- `drafts-n.tsv`, `drafts-s.tsv` — the hand-written drafts (the work product; NOT regenerable).
- Census input (regenerable, not committed, 23–27 MB each):
  `curl -s -H 'x-agent-id: aran-watson-114' "http://localhost:3470/api/production/<course>/seeds?status=all" -o <course>.json`
- `node build.js` checks every sir/madam row has a draft, LEGO text sits inside its phrases, no ti-forms, no basket duplicates → `built.json`.
- `node page.js` → `review.json`, published as Aran's review page https://watson-1.tail4968cb.ts.net:10000/d/d067320d
- Applying is a separate job, via Popty edit-batch only, after Aran's answers.
