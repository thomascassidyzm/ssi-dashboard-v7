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

Exceptions kept in the tree are listed at the bottom of `.gitignore`: schemas, the
eight evidence files that committed tools and tests read by path, and the frame
layer's three source `.json` files. To add one it must be small and it must be
*read by code*.

## What this rule is NOT for

**A `.json` under `docs/` is not automatically evidence.** Some of them are machine-readable
*source* that a human render sits on top of — `docs/frame-layer/*.md` is generated FROM its
`.json` companion by `tools/frame-layer/render-mapping.cjs`, and nothing generates the `.json`;
it is hand-authored analysis. Those belong in the tree, and the first sweep took three of them
out with the logs. `labs/basket-lab/server.cjs` reads `pair-mapping-classes.json` with a
`readFileSync` at **require** time and `services/production-api.cjs` mounts that lab, so the
next production-api restart crash-looped on ENOENT — eleven hours after the commit, because
nothing had restarted until then.

Two lessons worth keeping:

- **Ask what produces the file, not where it sits.** A log is a worker's output and can be
  regenerated or recovered from the store; a hand-authored input cannot be regenerated at all.
- **A grep for path literals only finds the crash you already understand.** Before moving files
  out of the tree, check the surviving references for *reads*, and check whether any of them run
  at require time inside a long-running service. Untracking a file is a change whose blast radius
  arrives at the next restart, which may be hours or days later.
