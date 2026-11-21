# 937-ita-tiles — stale word tiles in ita_for_eng / ita_for_jpn (cs #937, Kai's Watson finding #930)

Computed on the nightly copy of 2026-11-19 03:30Z by the merged tool, unchanged:

    node tools/course-optimization/refresh-stale-phrase-decompositions.cjs --course=<c> \
      --changeset=ops/937-ita-tiles/<c>.changeset.jsonl --job='#937·AI' --out=~/ssi-evidence/ssi-dashboard-v7/ops/937-ita-tiles

- ita_for_eng: 1,740 phrase.update ops (118 more stale phrases do not contain their own LEGO; left for a person).
- ita_for_jpn: 201 ops (14 left for a person).

Each op sets decomposition + decomposition_course_version only, expecting the copy's value; a row changed since
the copy is set aside, never overwritten. Applied in quiet hours by tools/changeset/apply-changeset.cjs; its
ledger (<file>.applied.jsonl) names every batch's undo file. Regenerate by re-running the command above.
