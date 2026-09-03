# Basque pods — the switchover, done

*2026-08-22. Part of the free-tier render chain (ron, swe, isl, eus, run in that fixed order).
Every number on this page was read back out of the production database after the move, not
forecast before it.*

---

## The headline

**Basque (`eus_for_eng`) listening exercises are replaced.** Learners now get the 231-sentence
pod in place of the 142-sentence pod they had before, arriving on `pod-1` under the same 1-based
convention every other flipped course in this rollout carries.

---

## The cast

Two Azure target voices: **Ander** (`eu-ES-AnderNeural`, male) and **Ainhoa**
(`eu-ES-AinhoaNeural`, female) — per the T-21 casting ruling of 2026-08-17
(`docs/pods/t21-casting-rulings-2026-08-17.md`), ear-verified and already locked at index 0 in the
Basque pool before this job touched it. **231/231 linked target clips on-cast, 0 off-cast.**

---

## What moved

| Pod | Before | After | What it is |
|---|---|---|---|
| `pod-1` | did not exist | **231 sentences — LIVE** | The new pod. What learners hear now. |
| `pod-0` | 142 sentences, live | *gone* | Archived below. |
| `pod-0-unrecorded` | 232 → 231 sentences, staged | *gone* | Promoted to `pod-1`. |
| `pod-0-retired-2026-08-22` | — | 142 sentences | The pod learners had until today. |

**Nothing was deleted.** The archived pod keeps all 142 sentences and both audio links per
sentence.

---

## Prep

1. **Blank-row cut**: the staged pod's row `SC15-S012` (Narrator, empty text on both sides, no
   audio on either track, 0 learner progress) was deleted, landing the course at the expected 231.
   Log: `docs/pods/eus_for_eng-pod-0-unrecorded-blank-row-applied-log.json`.
2. **Proofread-draft waiver**: 111 `target_text_draft` flags cleared (Tom's ruling 2026-08-22 —
   the human-proofread gate on machine-drafted target text is waived estate-wide).
   Log: `docs/pods/eus_for_eng-pod-0-unrecorded-proofread-waiver-applied-log.json`.
3. **Off-cast audit**: on-cast check confirms 231/231 linked target clips on Ander+Ainhoa, 0
   off-cast. Log: `docs/pods/eus_for_eng-pod-0-unrecorded-off-cast-unlink-dryrun-log.json`.

---

## Render

Detached systemd render chain (`pod-render-chain-free-tier-2026-08-22`), target track only, run
fourth/last (after Romanian, Swedish, Icelandic). Only 1 clip was queued — this course was already
essentially fully rendered before the chain ran: **1 generated, 0 reused, 0 failed. Veracity: 1/1
sampled clip checked and passed, 0 quarantined.** Elapsed 11s.

---

## What was verified, in order

1. **Full probe-all audio verification** (`verify-pod-audio.cjs --probe-all`): 231 rows, 462/462
   distinct audio ids resolved, HEAD ok=231/231 on both tracks, ffprobe ok=231/0 bad on both
   tracks. Committed: `docs/pods/pod-audio-verify-eus_for_eng_pod-0-unrecorded.json`.
2. **On-cast check**: 231 linked target clips, 231 on-cast, 0 off-cast — exactly
   `eu-ES-AnderNeural` + `eu-ES-AinhoaNeural`.
3. **Prospective migration log**, committed before the real course was touched (commit
   `461e2d623`): `docs/pods/eus-pod0-switchover-prospective-2026-08-22.json` — 113 content
   survivors, 0 ambiguous, carry 34 / drop 18, 20 mis-credits prevented.
4. **Full rehearsal on a throwaway clone** (`rehearse-switchover.cjs --scratch=zzz_rehearsal_eus`)
   — forward and rollback both landed, pods restored to their original slugs and counts, zero
   orphaned progress. Forward pass matched the forecast exactly (34 carried / 18 dropped). Scratch
   cleaned up afterward.
5. **The flip** (`pod-switchover.cjs --apply`): archived 142 → `pod-0-retired-2026-08-22`,
   promoted 231 → `pod-1`. Learner progress: **34 carried, 18 dropped** — exactly matching the
   forecast.
6. **Independent database re-read**: `pod-1` — 231 sentences, 231/231 both audio tracks, titled
   "Basque Listening Pods — Pod 1"; `pod-0-retired-2026-08-22` — 142 sentences, 142/142/142,
   archived intact; `learner_pod_state` for `eus_for_eng` — 34 rows / 900 exposures, matching the
   forecast exactly.
7. **Fleet orphan check, this course only** — see below.
8. **Live verification, staging then production** — see below.

---

## Learner progress — measured against the forecast

| | Forecast | Actual |
|---|---:|---:|
| Records carried | 34 | **34** |
| Exposures carried | 900 | **900** |
| Records dropped | 18 | **18** |
| Mis-credits prevented | 20 | **20** |

Landed exactly on forecast.

---

## Honest note: 31 pre-existing `:sN` orphans, zero new ones

`learner_pod_state` rows for `eus_for_eng` with no matching `listening_pod_sentences.id`: **31
total, all of them carrying a `:sN` suffix** (the pre-existing, estate-wide "June-split" defect
documented on the Romanian record and confirmed present on courses this rollout never touched).
Filtering that pattern out: **zero new orphans** on plain (non-split) sentence ids, before or
after this flip.

---

## What was verified live — staging then production

A real headless Chromium session (Playwright) loaded both
**`https://staging.saysomethingin.app`** and **`https://saysomethingin.app`**, captured the app's
own live Supabase anon key and project URL directly off its network traffic, and replayed the
app's own REST query against `listening_pods` and `listening_pod_sentences`.

| Check | Result |
|---|---|
| `listening_pods` for `eus_for_eng` | Exactly two rows: `pod-1` (live) and
`pod-0-retired-2026-08-22` (archived). No `pod-0` remains to be mistakenly served. |
| First sentence, `eus_for_eng:pod-1:SC01-S001` | target "Egun on, Sarah!" / known "Good morning,
Sarah!", both `target_audio_id` and `known_audio_id` present and non-null. |

Both sites' captured credentials resolved to the **same Supabase project**
(`swfvymspfxmnfhevgdkg.supabase.co`) — confirmed directly, not assumed.

---

## The way back

```
node tools/pods/pod-switchover.cjs --course=eus_for_eng --stamp=2026-08-22 --promote-to=pod-1 --rollback --apply
```

No app change is needed to reverse this: the resolver prefers `pod-1`, falls back to `pod-0`,
and will find nothing on `pod-1` and serve `pod-0` on its own if rolled back.

---

## What needs Tom

Nothing new. The Basque cast was already ruled (T-21, 2026-08-17); this course simply carried it
out.

---

*Protocol: `docs/pods/pod-migration-protocol.md` (plate A-111, adopted 2026-08-16). Prospective
migration log: `docs/pods/eus-pod0-switchover-prospective-2026-08-22.json`. Audio verification:
`docs/pods/pod-audio-verify-eus_for_eng_pod-0-unrecorded.json`.*
