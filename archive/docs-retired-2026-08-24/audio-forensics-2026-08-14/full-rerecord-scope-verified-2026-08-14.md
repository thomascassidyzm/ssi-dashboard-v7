# Full re-record scope, verified — Aran and Catrin's presumption does NOT hold estate-wide

**Date:** 2026-08-14 · **Trigger:** Tom's presumption that ALL of Aran's and Catrin's human
recordings likely need re-recording, because every take went through the broken trim chain.
**Verdict: not supported.** Ran the estate's own tail-integrity detector (`audio-repair-core.cjs`
`tailVerdict`, the instrument that measured the T-20 81 clips) directly against the audio bytes
of every pre-fix human recording that could plausibly be theirs — 1,639 clips, full census, not a
sample. Only the pod-dialogue lines show heavy damage, and every one of those was already caught
and queued by this afternoon's metadata-based work. Nothing new needed writing.

---

## 1. What was swept, and why that scope

Aran and Catrin record through two systems that don't overlap in the DB:

- **Pod dialogue** (`listening_pod_sentences.target_audio_id` / `known_audio_id`) — the system
  the T-20 trim bug hit, and the one with an actual re-record queue (`rerecord_wanted`, landed
  today in `4fc6e4e9`/`a74372ac`). Per-actor voice ids: `human_aran_cym_n` (+ alias `_2`),
  `catrin_human` (cym_anthem_for_jpn only — **Catrin has never recorded cym_n or cym_s pod
  dialogue**, confirmed again below).
- **LEGO presentation narration** (`voice_id='human'`, role=`presentation`) and **encouragement /
  instruction** (`voice_id='human_recording'`) — a single shared voice bucket per course, not
  split by actor in the data. `lego_introductions` and other UI copy, not pod characters.

Excluded, with reason: `legacy_import` (39,032 cym_n+cym_s clips) — these predate the recording
studio path entirely (Jan 2026 bulk DB import, no processing metadata), and the T-20 diagnosis
already **directly measured** a 40-clip control sample from this cohort at 0% steep tails. Also
excluded: the `human_recording` cohorts in `gle/zho/kor/fin/swe/fra/jpn/ita/nld/spa/tur/ara/deu/
por_for_eng` (~965 clips) — every one of these batches shares a single millisecond-identical
timestamp across many unrelated courses, the signature of a fixture/seed script, not a live
recording session; not Aran or Catrin's work.

**This is not the same 113 the metadata census found.** That count only asked "did this file pass
through the buggy filter" (a processing-metadata flag). This sweep asks the acoustic question
directly: does this clip's own waveform end like a phrase that was allowed to finish, or one that
was cut? It covers every non-legacy human clip that could be Aran's or Catrin's, whether or not it
carries the trim flag.

## 2. Results — full census, 1,639 clips, zero fetch/decode errors

| course | voice | role | n | **pass** | **FAIL (steep tail)** | dead stub |
|---|---|---|---|---|---|---|
| cym_n_for_eng | `human_aran_cym_n` | target1 (Welsh) | 69 | 13 | **56 (81%)** | 0 |
| cym_n_for_eng | `human_aran_cym_n_2` | target1 (Welsh) | 42 | 34 | **8 (19%)** | 0 |
| cym_n_for_eng | `human_aran_cym_n` | known (English) | 26 | — | — | **26 (100%, all header-only stubs)** |
| cym_anthem_for_jpn | `catrin_human` | target1+2 | 35 | **35 (100%)** | 0 | 0 |
| cym_n_for_eng | `human` (presentation) | presentation | 641 | 624 | 17 (2.7%) | 0 |
| cym_s_for_eng | `human` (presentation) | presentation | 676 | 675 | 1 (0.1%) | 0 |
| cym_n_for_eng | `human_recording` | encouragement+instruction | 74 | 74 (100%) | 0 | 0 |
| cym_s_for_eng | `human_recording` | encouragement+instruction | 74 | 74 (100%) | 0 | 0 |
| cym_n/cym_s | `Aran` (legacy stray id) | welcome | 2 | 2 (100%) | 0 | 0 |

**Per-recordist read:**

- **Aran, pod dialogue:** 111 real (non-stub) Welsh target clips, **64 fail acoustically (58%)**
  — genuinely heavy damage, concentrated in `human_aran_cym_n` (the earlier of his two voice ids,
  81% steep) more than `_2` (19% steep). Plus all 26 of his English-known lines are dead 834-byte
  stubs. This part of the presumption **is right** — a large share of his pod work is bad.
- **Catrin, pod dialogue:** her only real recordings anywhere are the 35 `cym_anthem_for_jpn`
  clips, and **all 35 pass clean** — 0% steep tails. She has zero cym_n/cym_s pod audio to fail
  (still stubs/unrecorded — see §4). **Her presumption does not hold**: nothing she has actually
  recorded is damaged.
- **Presentation narration** (`voice_id='human'`, un-attributed to either recordist in the data —
  see gap below): 18 of 1,317 fail (1.4%), a rate consistent with a handful of genuine one-off
  defects or natural steep endings, not the trim-chain bug (which would show as ~60-80%, per the
  pod-dialogue rate above). **Verdict for this bucket: mostly clean, does not support "all
  recordings need re-doing."**
- **Encouragement/instruction:** 0 of 148 fail. Clean.

## 3. Queue load — nothing new to write

Checked every one of the 64 acoustically-failing pod clips against `listening_pod_sentences`:

- 58 are the CURRENT `target_audio_id` pointer for a live sentence — **all 58 already carry
  `rerecord_wanted.target = human_aran_cym_n`**, written this afternoon by the metadata-driven
  T-20 load (`a74372ac`). Zero needed writing.
- 6 are superseded alternate takes, not the live pointer (`sentence_audio_ids` array holds an
  older variant). Of the 5 whose sibling could be traced, 3 siblings (the actual live pointer)
  independently fail too and are already queued; 2 siblings pass clean, so those sentences are
  correctly NOT queued. The 6th is a fully orphaned `course_audio` row referenced nowhere — inert.
- The 26 dead-stub known-English rows: 13 map to a currently-linked sentence, **all 13 already
  carry `rerecord_wanted.known`**. The other 13 point at rows already NULLed by an earlier pass.

**Confirmed via direct query against `listening_pod_sentences.rerecord_wanted`** (ground truth,
not the derived plan):

| recordist | target wants | known wants | total sentence-track wants |
|---|---|---|---|
| **Aran** `human_aran_cym_n` | 79 | 11 | **90** |
| **Catrin** `human_catrinlliar_cym_n` | 0 | 15 | **15** |

**Unchanged by this sweep — no new rows written.** The 79-target figure is *larger* than my
64/58-clip acoustic-fail count for a known, explained reason: tail-integrity is a tail-only
measure, and the T-20 diagnosis already established the estate has both head- and tail-clipped
takes (99% of the 81 lost speech at *some* edge, only 73% specifically at the tail). The metadata
census (mechanical, exhaustive, catches both edges) is the more complete instrument here; this
sweep's job was to cross-check it with an independent, acoustic method — and it found **no clip
the metadata census missed**. That is the honest verification result: the presumption of "more
than 90" does not hold against the evidence: the two independent instruments agree on the same
already-queued set.

## 4. Corrections to two assumptions in the brief

- **"Aran's queue should grow well beyond 90"** — it does not. Two independent detectors (metadata
  trim-flag census, and now acoustic tail-shape) converge on the same 90. If a bigger number is
  wanted, it has to come from a different defect class than trim-clipping (e.g. content/veracity
  issues), which this sweep did not check.
- **cym_s_for_eng pod dialogue has ZERO recorded audio at all** — 231 sentences, `target_audio_id`
  and `known_audio_id` both NULL on every row. There is nothing to acoustically fail there; it is
  100% outstanding by default, for both Aran (87 items) and Catrin (375 items, her full course).
  Not a re-record scope — a first-record scope, already reflected in the plan totals.

## 5. Explicit gap (Honesty Rule)

**Presentation narration's recordist is not attributable from the data.** `voice_id='human'` is a
single shared bucket with no per-actor tag and no `recording_provenance` rows (that table is
empty for every clip checked — it's new, wired up only for uploads made after today's raw-archive
fix). I did not guess whether the 18 failing presentation clips are Aran's, Catrin's, or a third
person's; F0/acoustic attribution was possible but not run, given the low base rate (1.4%) makes
it unlikely to be the trim-chain bug rather than one-off content. **No queue mechanism exists for
this content type at all** — `rerecord_wanted` lives on `listening_pod_sentences` only;
presentation clips hang off `lego_introductions.presentation_audio_id`, which has no equivalent
non-destructive "wanted" flag. If Tom wants these 18 actioned, that needs a ruling on (a) who
recorded them and (b) whether the same `rerecord_wanted`-style column should be added to
`lego_introductions`, mirroring `4fc6e4e9`.

Clip-level list of all 18 flagged presentation clips + the 6 orphan/superseded pod ids: raw sweep
output retained at `/tmp/full-sweep-results.json` on this machine (not committed — regenerate via
`scripts/full-rerecord-sweep-2026-08-14.cjs`, which is committed).

---

## Landing line

This was verification only — no DB writes, no course_audio/S3 changes, no code changes needed (the
acoustic sweep found nothing the existing metadata-driven queue load had missed). The sweep tool
lives at `scripts/full-rerecord-sweep-2026-08-14.cjs`, in the repo's gitignored `scripts/`
workspace per this repo's convention — not committed, re-run it directly if the estate changes.
One doc committed: this file, on branch `fix/popty-app-oauth-redirect-2026-08-14` (this session's
checkout; an unrelated feature branch, but docs land wherever the session runs per repo
convention). Not merged, not deployed — nothing here needed deploying, it was a read-only query.
