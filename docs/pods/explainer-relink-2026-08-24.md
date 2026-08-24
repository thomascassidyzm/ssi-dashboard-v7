# Off-cast explainer clips on the live Pod 1 fleet — relinked, not nulled

**2026-08-24.** Piece 3 of the Pod 1 split-array incident closeout.
Tool: `tools/pods/relink-off-cast-explainer-clips.cjs` (+ `.test.cjs`, 16 tests green).
Logs: `docs/pods/explainer-relink-<course>-2026-08-24-{dryrun,applied}-log.json`.
**No audio was generated. No link was nulled. No `course_audio` row was deleted.**

## The measurement — 34, exactly as briefed

Re-measured against the live DB before doing anything, not taken from the brief.
Off-cast = the clip's voice is not in the pod's own `listening_pods.speakers` cast,
with provider prefixes stripped first (`xai_yis75yfp` and `yis75yfp` are ONE voice)
and composite ids decomposed, so `comp:A+B` is off-cast unless **every** part is cast.

| course | off-cast explainer links | Tom's brief |
|---|---|---|
| gle_for_eng | 20 | 20 |
| ara_eg_for_eng | 10 | 10 |
| hrv_for_eng | 2 | 2 |
| spa_for_eng | 1 | 1 |
| ara_for_eng | 1 | 1 |
| **total** | **34** | **34** |

Every one of the 34 is an old **composite** asset — `comp:ga-IE-ColmNeural+en-GB-SoniaNeural`,
`comp:xai_rex+azure_en-GB-SoniaNeural`, `comp:hr-HR-SreckoNeural+en-GB-SoniaNeural`,
`comp:yis75yfp+en-GB-SoniaNeural`. The fleet's other 21 pods narrate their explainers with the
single cast voice `gfzdpspr5fdp`. Azure Sonia is in nobody's cast, which is what makes all 34 fail.

## What was relinked — 18, all gle_for_eng

For 18 of the 20 Irish rows the correctly-voiced clip **already existed** in `course_audio`,
rendered on 2026-06-10 on `gfzdpspr5fdp`, with **byte-identical normalised text** to the composite
the row was pointing at — it had simply never been linked (`audio_autolink` only fills NULLs, so a
row that already had a pointer kept the old one). Those 18 pointers now point at the twin.

Make-before-break, per row, **before** the link moved: the S3 object was fetched, ffprobed for a
real duration, and volume-measured for speech. All 18 came back alive — 2.88 s to 24.12 s,
−17.1 dB to −22.3 dB mean. Every prior `explainer_audio_id` is snapshotted in the applied log, so
each write is reversible from the log alone. The `UPDATE` predicate re-asserted the exact prior link
per row; no drift, single transaction.

`gle_for_eng:pod-1` explainer voices now: **`gfzdpspr5fdp` × 18**, plus the 2 unresolved composites.

## What was left alone — 16, and why

The bar for a relink is deliberately strict: **identical normalised text**, `role='pod_explainer'`,
a single in-cast known-side narrator, proven alive. A clip that says *nearly* the same thing is a
content change, not a repair, so it is left for Tom rather than swapped in under a live learner.

All 16 unresolved rows carry the **older "Breaking it down…" explainer script** — a generation that
repeats each chunk and drops the "means" connector. No in-cast clip anywhere says those words.

| pod | global_order | near-equivalent in-cast clip exists? |
|---|---|---|
| gle_for_eng:pod-1 | 3 | yes — `d7af7e45` says the same three chunks in the current "means" script |
| gle_for_eng:pod-1 | 4 | no |
| ara_eg_for_eng:pod-1 | 1 | yes — `a3d107d0` "صباح الخير". means good morning. |
| ara_eg_for_eng:pod-1 | 2 | yes — `fa7a1132` "إزيك". means how are you? |
| ara_eg_for_eng:pod-1 | 3 | yes — `713ba76c`, same three chunks, current script |
| ara_eg_for_eng:pod-1 | 4 | no |
| ara_eg_for_eng:pod-1 | 5 | yes — `679f3bca`, same three chunks |
| ara_eg_for_eng:pod-1 | 6 | no |
| ara_eg_for_eng:pod-1 | 10 | yes — `3db17490`, same two chunks |
| ara_eg_for_eng:pod-1 | 11 | yes — `070f9b78` (`xai_gfzdpspr5fdp`), same six chunks |
| ara_eg_for_eng:pod-1 | 12 | yes — `c6c5ca95`, same two chunks |
| ara_eg_for_eng:pod-1 | 20 | yes — `b3632ab4` "أهلاً". means hello. |
| ara_for_eng:pod-1 | 6 | no |
| hrv_for_eng:pod-1 | 3 | yes — `d70ef8af`, same content, last two chunks merged |
| hrv_for_eng:pod-1 | 4 | no |
| spa_for_eng:pod-1 | 3 | yes — `0395f027` (`xai_gfzdpspr5fdp`), same content, last two chunks merged |

**The decision this hands back.** 11 of the 16 have an in-cast clip that says the same thing in the
current script rather than the old one — the difference is chunking and the "means" connector, not
meaning. Accepting those would clear 11 more for £0, but it is a content call, not a repair, so
nothing was touched. The remaining 5 (gle 4, ara_eg 4 and 6, ara 6, hrv 4) have no in-cast
equivalent at all and are the only rows that could need a render.

## Post-apply verification

Re-measured independently of the tool (fresh probe, same off-cast definition):

```
gle_for_eng:pod-1: 2 off-cast — go=3,4
ara_for_eng:pod-1: 1 off-cast — go=6
ara_eg_for_eng:pod-1: 10 off-cast — go=1,2,3,4,5,6,10,11,12,20
hrv_for_eng:pod-1: 2 off-cast — go=3,4
spa_for_eng:pod-1: 1 off-cast — go=3
TOTAL off-cast explainer links on the live pod-1 fleet: 16
```

34 → 16, and the 16 are exactly the rows listed unresolved above. Nothing else moved.

## Two things found on the way

- **The wider live estate has 661 off-cast explainer links**, nearly all on `pod-0` in courses where
  the narrator (`gfzdpspr5fdp`) is simply absent from the pod's `speakers` map — a bookkeeping gap in
  the cast, not a wrong voice on air. Different cause, different fix; the tool defaults to
  `--slug=pod-1` so that population is not swept in passing.
- **`zzz_test_for_eng:pod-0` and `zzz_test2_for_eng:pod-0` have no cast at all.** With an empty cast
  every clip reads as off-cast, which is the one reading that must never drive a write, so they are
  skipped loudly rather than swept.
