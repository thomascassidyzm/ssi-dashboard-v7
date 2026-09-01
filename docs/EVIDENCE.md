# Where evidence lives

**Tom's ruling, 2026-09-01: "yes, move 290MB of machine logs out of the repo."**

Machine-generated evidence — sweep `*-dryrun-log.json` / `*-applied-log.json` /
`*-verify-log.json`, queue tails, censuses, snapshots, screenshots, sample audio —
**is not repo content.** It is one worker's output. 278 MB of it was tracked under
`docs/` and `archive/`, which meant every `git worktree add` wrote ~300 MB before a
worker typed anything; ~30 worktrees a day, and that was the whole of the estate's
~10 GB/day disk churn (job #625).

## The store

```
/home/tomcassidy/ssi-evidence/ssi-dashboard-v7/<same path it had in the repo>
```

So `docs/pods/pod1-percall-recast-estate-2026-08-23-applied-log.json` is now
`~/ssi-evidence/ssi-dashboard-v7/docs/pods/pod1-percall-recast-estate-2026-08-23-applied-log.json`.

`MANIFEST.tsv` at the store root lists every moved file with its git blob SHA and
byte count, and names the commit it was removed at — so any file can be checked
against, or recovered from, git history. **Nothing was deleted.** The bytes are in
the store, and they are still in this repo's history at `7672f9b66`.

## The rule, going forward

`.gitignore` now excludes `*.json`, `*.jsonl`, `*.gz` and image/audio files under
`docs/` and `archive/`. Tools may still write there — the point is only that the
output never enters the tracked tree, so a fresh worktree stays small.

- **A log or census a human will never read as prose** → write it to
  `$SSI_EVIDENCE_ROOT` (default `~/ssi-evidence/ssi-dashboard-v7`), not `docs/`.
  Helper: `tools/lib/evidence-path.cjs`.
- **Something Tom must read** → write the *markdown* in `docs/` and **publish it**
  (`POST /api/publish-doc`). Published docs are stored in the surface DB, not the
  repo, so the link survives this move and every future one.
- **Screenshots** → `public/evidence/`, per standing doctrine, never `docs/`.

Exceptions kept in the tree are listed at the bottom of `.gitignore`: schemas, and
the eight evidence files that committed tools and tests read by path. To add one it
must be small and it must be *read by code*.
