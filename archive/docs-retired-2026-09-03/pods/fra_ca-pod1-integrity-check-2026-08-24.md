# fra_ca_for_eng Pod 1 — integrity check (same disease as ita_for_eng scene 15)

**Date:** 2026-08-24 11:03-11:15Z · **Scope:** `fra_ca_for_eng:pod-1`, `visibility='live'`
**Ordered by Tom** as part of the parallel per-course sweep following the `ita_for_eng`
scene-15 two-female-voices find (`docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md`).
Read-only: nothing written, no clip touched, no pointer changed, no audio generated.

## Verdict: **INFECTED** — same mechanism as ita_for_eng, worse signature (off-cast voices, not just off-cast-gender)

`fra_ca_for_eng:pod-0-retired-2026-08-24` was retired **today**, hours before this check —
this is a live, same-day switchover, the identical circumstance that produced the Italian bug.

## Check 1 — text/casting construction in the DB canon

**Declared cast: PASS.** `listening_pods.speakers` for `fra_ca_for_eng:pod-1` declares
exactly two target voices (Sylvie f / `fr-CA-SylvieNeural`, Jean m / `fr-CA-JeanNeural`) and
two known voices (Olivia f, Tom-clone m). Every one of 30 characters resolves to one of these
two pairs, one gender each, no blanks. Scene 8 has a 4-character cast (Bartender + Bar
Customer 1/2/3) and scene 7 similarly — the same "third/fourth character recycles voice 1"
shape the Spanish sibling audit found, unremarkable on its own.

**But the declared cast is not what's on the wire.** `sentence_audio_ids` (the per-sentence
split-clip arrays — same column the Italian root-cause doc identifies as the one the flip
gate never checks) tell a different story:

- **91 of 231 rows** carry a `sentence_audio_ids` array **byte-identical** to the retired
  pod-0's array at the same `(scene_number, sentence_number)` — inherited positionally,
  never re-derived, exactly the ita_for_eng mechanism.
- **59 of 239 split clips (24.7%)** fail a containment test against their own row's
  `target_text` — the split clip's DB `text` is neither a substring of, nor contains, the
  sentence it's attached to. This number was already visible in the Italian doc's blast-radius
  table (`fra_ca_for_eng 239/59, 24.7%`, produced by a different worker's substring probe) —
  this run reproduces it independently from the raw DB with the scene/sentence/voice detail
  attached.
- Of those 59, **25 clips carry a voice that is not in the pod-1 cast at all**:
  `fr-CA-ThierryNeural` (5 clips, scenes 7 and 8) and `fr-CA-AntoineNeural` /
  `azure_fr-CA-AntoineNeural` (20 clips, scenes 14 and 15). Neither name appears anywhere in
  `listening_pods.speakers`. This is a **stronger** signature than the Italian case (two
  different female voices, hard to tell apart by ear) — Thierry and Antoine are simply a third
  and fourth voice, unambiguous.
- **Scene 15 is the worst-hit scene** — 20 of the 25 off-cast clips, on the Learner's own
  drill lines (141, 143, 145, 147, 149; the Learner is cast female/Sylvie-Olivia, the leaked
  voice is Antoine, male) — the same scene number the Italian defect landed on, for whatever
  that coincidence is worth.

## Check 2 — served audio spot-check, production learner URL

Fetched via `https://saysomethingin.app/api/audio/<id>` (the real proxy — `/api/audio/[audioId].ts`,
entitlement-checked, CloudFront-fronted S3), **not S3 direct**. Confirmed working with no auth
token needed for these IDs; all returned `200` with real MP3 bytes.

- **Scene 1 first phrase** (`92b180bc…`, "Bonjour, Sarah!") and one whole-turn clip from each
  of scenes 5, 10, 15, 20 (10 clips total, min-10 satisfied): all fetched clean. Whole-turn
  clips are the type the Italian doc found unaffected (`target_audio_id` was correctly
  recast there) — consistent with that, nothing here suggests the whole-turn track is broken.
- **3 flagged split clips fetched for corroboration**, including the scene-8 off-cast one
  (`6420ebbd-7390-499c-9bea-da5fb07ae619`, `fr-CA-ThierryNeural`, row 65 "Bartender": *"Oui,
  certain. Le voici. Le fish and chips est ben bon."* — the clip's own DB text is *"Oui, bien
  sûr."*, a different sentence entirely, in a voice outside the cast). All fetched `200` from
  the production URL — this is exactly what a learner's browser requests and plays.

Given the scale of the split-array problem, a targeted 10-clip whole-turn spot-check alone
would have read clean and missed the disease — the split arrays needed checking directly, same
lesson as the Italian doc.

## Failing clips (25 off-cast-voice, highest-confidence subset of the 59 flagged)

| Scene | global_order | Row speaker | Voice found (not in cast) | Clip id |
|---|---|---|---|---|
| 7 | 42 | — | fr-CA-ThierryNeural | 93400bfd-bff8-404b-9f63-6b8ca13d6ada |
| 7 | 51 | — | fr-CA-ThierryNeural | 3ced4688-8c01-4d26-b8ce-eda19f18427f |
| 8 | 65 | Bartender | fr-CA-ThierryNeural | 6420ebbd-7390-499c-9bea-da5fb07ae619 |
| 8 | 65 | Bartender | fr-CA-ThierryNeural | 6ee651cc-e659-4531-9399-7149be13e54e |
| 8 | 65 | Bartender | fr-CA-ThierryNeural | ceece23b-452e-445f-8992-500a0ba5b17c |
| 14 | 137 | Driver | fr-CA-AntoineNeural (×2, incl. azure_ prefix) | 66a06b56-…, 0d511967-… |
| 15 | 141 | Learner | fr-CA-AntoineNeural (×2) | dc86d385-…, 4f4b939c-… |
| 15 | 143 | Learner | fr-CA-AntoineNeural (×3) | 662d6db3-…, 2f82d403-…, 837ebcb1-… |
| 15 | 145 | Learner | fr-CA-AntoineNeural (×4, incl. azure_ prefix) | 14bbff17-…, b1d24feb-…, 4de9e9d0-…, 58633c09-… |
| 15 | 147 | Learner | fr-CA-AntoineNeural (×2, incl. azure_ prefix) | 11fe444e-…, de4ca1bc-… |
| 15 | 149 | Learner | fr-CA-AntoineNeural (×4) | 8b536b57-…, 62ca5386-…, df1e9ef6-…, 11076656-… |
| 15 | 151 | Narrator | fr-CA-AntoineNeural (×2) | 751a0e44-…, afb14308-… |
| 15 | 151 | (cont.) | fr-CA-AntoineNeural | d87a928c-… |

Full 59-clip flagged list (including same-cast-voice-but-wrong-content clips) and the 91-row
inheritance list: `docs/pods/fra_ca-pod1-integrity-check-2026-08-24-data.json` (not committed —
generated data, available on request; scripts under `scripts/fra-ca-pod1-check-2026-08-24/`,
gitignored per repo convention).

## Not investigated (explicit gaps)

- No transcription/ASR verification of the fetched MP3s against text — relied on `course_audio.text`
  (the string actually sent to TTS to generate the clip) as ground truth, same standard the
  Italian doc used. If Tom wants literal ASR confirmation, that's a fast follow.
- Did not check `sentence_known_audio_ids` (English split track) — the Italian doc found the
  known side off-cast too (Sonia/leo neither in cast); not replicated here for time, but given
  the target side is confirmed infected via the shared mechanism, the known side should be
  assumed suspect until checked.
- Did not run the Spanish audit's C4/C5 (scene cast size / adjacent hand-off optimum) or C6
  (gender agreement) checks — out of scope for "same disease as Italy?", which this answers.
- This is the ROOT CAUSE crew's mechanism (`sentence_audio_ids` positional inheritance across
  a pod-0→pod-1 switchover) — the fix belongs with them, not this check.
