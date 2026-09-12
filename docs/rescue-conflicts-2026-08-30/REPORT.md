# The 44 conflicted files — the premise checked, and what the conflicts actually are

**Verdict: nothing is stranded. No file needs resolving. The branch should not be merged at all.**

The number is not 44 and it is not zero. Today the merge produces **169 conflicts** — 96 of them
phantom, 73 real code conflicts. But the fear underneath the number is the thing that mattered, and
it is answered: **every one of the 73 conflicted files, in its rescued version, exists byte-identically
on a branch already pushed to origin.** Nothing on that branch is a single copy. There is no work to
integrate, so there is nothing to resolve.

## First, what the branch actually is

Job #358's report calls it "the rescued checkout's branch". It is more specific than that, and the
specificity is the whole answer.

The branch is **`docs/course-drift-proposal-2026-08-30`**, and it is the HEAD of
`/home/tomcassidy/SSi/ssi-dashboard-v7-clean` — the **shared dev tree** that roughly fifteen
concurrent sessions all commit into. It is not one person's stale work. It is a **collector**: 115
commits that are the accumulated tips of fifteen *other people's still-open feature branches* —
the known-side sentence splice, the pod-1 two-voice cast, the variant-drill voice rule, the CJK
pause cue, the Spanish edge map, the landing check, and a dozen more.

That is why it conflicts. It is not one month of divergence against main. It is fifteen open
branches held in one hand, meeting a main that has moved 1,024 commits.

## The premise check, as run

| test | result |
|---|---|
| `git cherry origin/main <branch>` | 35 commits already on main verbatim, 80 not |
| of those 80, subject line present in main's history | 13 landed by another route |
| of the remaining 67, **contained in some pushed `origin/*` branch** | **66 of 67** |
| commits on this branch and no remote at all | **1** — today's in-flight drift work |
| test-merge conflicts | **169** (144 add/add, 22 content, 3 delete/modify) |
| of those, `archive/docs-retired-2026-08-24` | 96 — **byte-identical on both sides**, pure phantom |
| real code conflicts | 73 |
| **conflicted files whose rescued version is on a pushed origin branch** | **73 of 73** |

The last row is the deliverable. I checked it at blob level, not by argument: for each of the 73
files I took the branch's exact object hash and searched every `origin/*` ref for a byte-identical
object. Every one was found.

## Per area

### Archive documents — 96 conflicts, all phantom
Both sides added the same documents to `archive/docs-retired-2026-08-24`. All 96 pairs are
byte-identical object-for-object. Main archived them; the branch carries the same archiving. There
is no difference to resolve on any of them.

### Pods — ~40 conflicts (`tools/pods/*`, `services/voice-engine/*`, `docs/pods/*`, `Pod*.vue`)
The rescued side is the pod-1 splice/casting programme of 24–25 August: the known-side sentence
splice across 22 courses, the two-voice cast, the variant-drill voice rule, the CJK pause cue, the
split-array inheritance repair. Main has since evolved all of these files by other routes.
**Every rescued version is on its own pushed branch** — `feat/known-side-sentence-splice`,
`fix/pod1-two-voice-cast-2026-08-24`, `feat/pod-variant-drill-voice-rule`,
`fix/pod-pause-cue-cjk-2026-08-24`, `docs/pods-end-to-end-2026-08-14` and siblings. Those branches
are their own authors' to land, with their own verification. Resolving them here would be deciding
fifteen people's merges by proxy, on no evidence. **Take main. Nothing rescued.**

This includes the six verification result files #358 correctly refused to touch
(`*-sentence-splice-verify-2026-08-24.json`, ~1,900 of 2,000 rows differing). They are data from two
different runs, and both runs are preserved on their own branches. Nobody has to pick a winner to
protect them.

### Voice lab — ~15 conflicts (`services/voicelab/*`, `src/views/admin/voicelab/*`, `e2e/voice-lab/*`)
Same shape. Main is a thousand commits newer here. Rescued versions all present on origin.
**Take main. Nothing rescued.**

### Audio pipeline — ~10 conflicts (`phase8-audio-v13.cjs`, `audio-processor.cjs`, `audio-repair-core.cjs`, `AudioPreview.*`, `clip-identity.test.js`)
Main is a strict superset on four of these by line-set test (`audio-processor.cjs` 452/452 lines
already present, `audio-repair-core.cjs` 114/114, `clip-identity.test.js` 146/146,
`recordist-router.cjs` 402/402). Three more are **deletions on main** —
`services/pod-explainer-composite.cjs`, `services/run-pod-explainer-batch.cjs` and
`docs/architecture/AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md` — where the branch merely
still holds the old file. Taking main means they stay deleted, which is what main decided.
**Take main. Nothing rescued.**

### Everything else — ~8 conflicts
`CLAUDE.md`, `services/production-api.cjs`, `src/router/index.js`, `src/utils/languageNames.js`,
`src/components/CoursePicker.vue`, `src/views/admin/SpeakingConfig.vue`, `src/views/RecordistRoom.vue`,
`services/briefs/build-team-creator.cjs`. Main is already a strict superset of the branch on
`CLAUDE.md`, `languageNames.js`, `router/index.js`, `VoiceConfiguration.vue` and
`voice-config-service.cjs`. The rest are on origin. **Take main. Nothing rescued.**

## Why the branch must not be merged, beyond the conflicts

Two reasons, and both are independent of whether the 169 conflicts get resolved well.

1. **It would re-add ~300 documents at paths main deliberately retired.** Of the 509 files the merge
   touches, 443 conflict-free changes are mostly documents that main moved into
   `archive/docs-retired-2026-08-24`. A merge puts them back at their old paths and silently undoes
   another worker's archiving pass.

2. **It would land fifteen unmerged feature branches at once, by proxy.** Their owners have not
   verified them against today's main. That is exactly the failure mode #358 stopped short of.

## The one thing that IS a single copy — and what I did

Commit `28189f71c`, *"docs(drift): the six-course drift evidence"* — 11 files, 17,473 lines of
Arabic / German-contraction / Portuguese drift data and its extractors — was on this branch and on
**no remote at all**. It is not rescue material; it is a session that is **running right now**
(the `drift-proposal:*` jobs), committing into the shared tree as I write.

I pushed the branch to `origin` to give that work a second copy. Non-destructive, reversible, and it
removes the only genuine loss risk on the whole branch. The session has committed again since
(`f47dbb58e`), so the remote is a snapshot, not a mirror — that session will push its own tip when
it lands. **`docs/*` branches do not auto-merge**, so publishing it creates no path to main by
accident.

## Gaps, stated plainly

- **I could not read job #358's own transcript.** The surface has no `/api/messages` for it, the
  jsonl is not under `~/.cs-accounts`, and `command-surface.db` has no `jobs` table from where I
  sit. I identified the branch forensically instead — by finding which branch carries the original
  of the gitignore commit #358 cherry-picked — rather than taking the name on trust.
- **My superset test is stricter than #358's.** It counts 12 files where main is a superset; #358
  counted 25. Mine is line-set based and trips on whitespace and reordering. The difference does not
  change the conclusion, because all 73 are proven non-stranded by object hash, which is exact.
- **I did not verify the 443 non-conflicted files individually.** The argument is structural: a
  file's branch content comes from its last-touching commit, and every branch commit except
  `28189f71c` is reachable from a pushed `origin` ref. `28189f71c` touches exactly the 11 drift
  files named above.

## Recommendation

**Delete `merge/rescue-checkout-2026-08-30` and close this out.** There is no integration project
here. The 44 were never 44 files of stranded work; they were the shared dev tree meeting main, and
every piece of them already has a home. The pods, voice-lab and audio-pipeline branches land on
their own merits, by their own authors, against today's main — which is what should happen anyway.
