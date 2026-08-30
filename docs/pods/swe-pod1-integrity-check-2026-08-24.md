# swe_for_eng Pod 1 — integrity check (same disease as ita_for_eng scene 15)

**Date:** 2026-08-24 · **Scope:** `swe_for_eng:pod-1`, `visibility='live'`
**Ordered by Tom** as part of the parallel per-course sweep following the `ita_for_eng`
scene-15 two-female-voices find (`docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md`).
Read-only: nothing written, no clip touched, no pointer changed, no audio generated.

## Verdict: **INFECTED** — same mechanism as ita_for_eng and fra_ca_for_eng, same scene-15 signature

`swe_for_eng` shows the identical same-day-switchover circumstance: `listening_pods` holds a
live `pod-1`, a `pod-1-retired-2026-08-24` (retired **today**), and a `pod-0-retired-2026-08-22`.
This is a same-day flip, the exact circumstance behind the Italian and fra_ca_for_eng finds.

## Check 1 — text/casting construction in the DB canon

**Declared cast: PASS.** `listening_pods.speakers` for `swe_for_eng:pod-1` declares exactly
two target voices (Alice f / xai `3b312632`, Oscar m / xai `4c7f16ff`) and two known voices
(Olivia f / xai `bedd6226`, Tom-clone m / xai `gfzdpspr5fdp`) across all 28 declared characters
(13 f, 15 m), each character resolving to exactly one of the two pairs — no third/blank voice,
no ambiguous assignment. 4 speaker labels in the row data (`Neighbour (8 am)`, `Barista (3 pm)`,
`Friend (7 pm)`, `Neighbour (10:30 pm)`) are time-qualified variants that resolve cleanly via
each character's `variants[]` list (`Neighbour`, `Barista`, `Friend`) — not missing/ambiguous,
just recycled character labels across scenes, unremarkable and consistent with the Spanish
sibling audit's earlier finding on this shape.

**But the declared cast is not what's on the wire** — `sentence_audio_ids` (the per-sentence
split-clip arrays; same column the Italian root-cause doc names) tells a different story,
and the numbers land almost exactly on the fra_ca_for_eng signature:

- **91 of 141 comparable rows** (231 pod-1 rows total) carry a `sentence_audio_ids` array
  **byte-identical** to the retired pod-0's array at the same `(scene_number, sentence_number)`
  — inherited positionally, never re-derived. Exact same count as fra_ca_for_eng (91/141).
- **60 of 239 split clips (25.1%)** fail the containment test against their own row's
  `target_text` — the split clip's DB `text` is neither a substring of, nor contains, the
  sentence it's attached to. (fra_ca_for_eng: 59/239, 24.7% — same order of magnitude, same
  mechanism.)
- **All 60 of the 60 flagged clips carry a voice outside the pod-1 cast entirely**
  (`3b312632`/`4c7f16ff`/`bedd6226`/`gfzdpspr5fdp` are the only cast voice IDs): the leaked
  voices are `490ea3be50b1` (11 clips), `e22152e06fd8` (18 clips), and `ara`/`xai_ara`
  (31 clips combined) — three distinct off-cast voices, none named anywhere in
  `listening_pods.speakers`. This is the unambiguous "third/fourth voice" signature (like
  fra_ca_for_eng's Thierry/Antoine), not the harder-to-hear two-female-voices variant seen
  in ita_for_eng.
- **Scene 15 is the worst-hit scene again** — 29 of the 60 off-cast clips, on the Learner's
  own drill lines (global_order 141, 142, 143…), the same scene number both ita_for_eng and
  fra_ca_for_eng landed on. Off-cast clips also appear in scenes 1, 2, 3, 4, 7, 8, 9, 11, 12, 14.

Sample of flagged rows (full 60-row list in `split-check.json`, not committed — generated data,
scripts under `scripts/swe-pod1-check-2026-08-24/`, gitignored per repo convention):

| Scene | global_order | Row target_text | Clip's actual text | Off-cast voice |
|---|---|---|---|---|
| 1 | 4 | "Ja, jag har en upptagen dag idag…" | "Ja, jag har en fullspäckad dag idag." | 490ea3be50b1 |
| 2 | 6 | "Nej, den är ledig. Varsågod." | "Varsågod, sätt dig." | ara |
| 4 | 21 | "Hej! Jag är ledsen men jag kan inte…" | "Förlåt, men jag kan inte prata just nu." | 490ea3be50b1 |
| 4 | 22 | "Nej, jag är ledsen, jag är upptagen…" | "Nej, förlåt, jag är upptagen imorgon." | e22152e06fd8 |
| 8 | 54 | "Jag skulle vilja ha en pint, tack…" | "Jag skulle vilja ha en stor stark, tack." | ara |
| 15 | 141 | "Hur mycket kostar det?" | "Skulle du ha något emot om jag försökte öva…" | ara |
| 15 | 142 | "Kan du säga hur mycket det kostar?" | "Självklart, inget problem." | e22152e06fd8 |

## Check 2 — served audio spot-check, production learner URL

Fetched via `https://saysomethingin.app/api/audio/<id>` (the real proxy, not S3 direct):

- **Scene 1 first phrase** (`be74ed5a-…`, "Godmorgon, Sarah!") plus one more line from scene 1,
  and 2 lines each from scenes 4, 8, 11, 15 (10 whole-turn clips total, min-10 satisfied): all
  fetched `200` with real, non-trivial MP3 byte sizes (17–94 KB). These are `target_audio_id`
  whole-turn clips — the type both prior audits found unaffected — consistent with that here too.
- **3 flagged split clips fetched for corroboration** (scene 1 `84d9c436-…` voice `490ea3be50b1`,
  scene 2 `fbd61052-…` voice `ara`, scene 8 `91c9732e-…` voice `ara`): all fetched clean `200`
  from the production URL — confirming the mismatched-content, off-cast-voice clips found in
  the DB are exactly what a learner's browser would actually request and play, not a dead
  or orphaned row.

Given the scale of the split-array problem, a whole-turn-only spot-check would have read
completely clean and missed the disease — same lesson as both prior docs: the split arrays
had to be checked directly.

## Not investigated (explicit gaps)

- No transcription/ASR verification of the fetched MP3s against text — relied on `course_audio.text`
  (the string sent to TTS) as ground truth, same standard as the ita/fra_ca docs.
- Did not check `sentence_known_audio_ids` (English split track) — out of scope for time;
  given the target side is confirmed infected via the shared mechanism, the known side should
  be assumed suspect until checked.
- Did not run gender-agreement / adjacent-hand-off-optimum checks (the Spanish audit's C4-C6)
  — out of scope for "same disease as Italy?", which this answers.
- This is the ROOT CAUSE crew's mechanism (`sentence_audio_ids` positional inheritance across
  a same-day pod-0→pod-1 switchover); this doc does not propose or attempt a fix.

## Bottom line for the parallel sweep

swe_for_eng is a third confirmed case of the identical mechanism (ita_for_eng, fra_ca_for_eng,
swe_for_eng), same scene-15 concentration, same "positionally inherited `sentence_audio_ids`
array from the retired pod-0" root cause. Nothing here was touched — evidence only, per brief.
