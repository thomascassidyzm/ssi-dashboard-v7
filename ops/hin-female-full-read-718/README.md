# hin_for_eng speaker-gender full read (job #718)

Shared work product of a read-only audit fan-out. Nothing here writes the database.

- `in/shard-NN.jsonl` — every distinct hin_for_eng target text (seeds, LEGOs, practice phrases incl. components), one per line:
  `{n, t, occ:[[kind, id, seed, english]...], stored:{f,m}|null}`. `stored` is the course_gender_expansions row keyed on that exact text.
  Built from `GET /api/production/hin_for_eng/seeds` (Popty :3470) and the table snapshot written by the census mode of
  `tools/course-optimization/hin-for-eng-speaker-gender-2026-10-14.cjs` on 2026-10-15 13:26Z. A later rebuild will see a later state.
- `in/seed-context-NN.txt` — the seed sentences (English | Hindi) for every seed a shard touches.
- `brief.txt` — the brief each reader was given (`__ID__` = shard number).
- `out/shard-NN.jsonl` — one verdict per text, written by the reader of that shard (a model reading every row in full).
