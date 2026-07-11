# Estate-wide audio census — 2026-07-11

**Read-only census. No audio generated, no DB writes.** Scope: all 74 learner-reachable courses (`new_app_status` live or beta). Method: SQL over the real player read-path columns (`generateLearningScript` skips any phrase/lego missing any of known/target1/target2 audio ids, any seed missing target1), pod-cast providers from `listening_pods.speakers`, plus ffmpeg silencedetect + whisper language-detect on ~10 sampled multi-unit Take G groups per non-Azure course (196 clips total). Sampler: `scripts/audio-census-sampler.cjs` (gitignored workspace); raw per-clip JSON in `scripts/census-out/`.

## State of the estate (one paragraph)

The answer to "do all other courses have perfect seams already?" is **no — only ita_for_eng is fixed**. The 15 Azure-cast dialogue courses never had the problem (word-boundary events give the slicer exact spans), but **all 18 other xAI-cast courses with Take G audio are still comma-era**: sampling found essentially no group whose seams all reach 500ms (0/10 or 1/10 everywhere; ita, the fixed control, passes by design via its sensitive-tier ladder — 163/163 groups sliced, 0 phonology fails). Phonology is largely clean across the estate (whisper detected the correct target language in ~95% of clips; neighbour-language flickers are known small-model noise) with one red flag — **nld_for_eng read 3/10 clips as English** — and two watch items (dan, hrv at 1/10). The louder, larger finding is **missing audio**: the six phrase-backfilled live courses are silently skipping roughly half their practice phrases (kor 55%, jpn 59%, por 49%, zho 45%, spa 36%, plus beta deu 56% and ara 53%) and hundreds of legos, because TTS hasn't caught up with the phrase-floor backfill — early seeds (1–50) are ~99% complete, so new learners are fine, but deep learners hit thin rounds. por_for_eng also has 366 seed sentences without audio inside its built range (spa 331). The two Welsh courses have no pod audio at all (human-recording backlog). Everything is cheap to fix in dollars: the whole estate's Take G re-render is ~$2 of xAI TTS, and the entire phrase backlog is ~$55 of Azure TTS; the real cost is pipeline hours and one approval.

## Census table (ranked by learner-facing severity; live first)

| course | status | missing phrases | missing legos | Take G groups | pod provider | seam sample verdict | phonology sample verdict | est. fix cost |
|---|---|---|---|---|---|---|---|---|
| kor_for_eng | live | 7,606 (55%); 56 seeds unrecorded in range | 874 | 171 | xai | comma-era **1/10** | clean (10 ko) | ~$6 TTS + ~$0.1 + ~1-2h pass |
| jpn_for_eng | live | 6,979 (59%); 43 seeds unrecorded in range | 801 | 175 | xai | comma-era **0/10** | clean (10 ja) | ~$5 TTS + ~$0.1 + ~1-2h pass |
| por_for_eng | live | 6,954 (49%); 366 seeds unrecorded in range | 750 | 133 | xai | comma-era **0/10** | clean (10 pt) | ~$9 TTS + ~$0.1 + ~1-2h pass |
| zho_for_eng | live | 5,231 (45%); 56 seeds unrecorded in range | 454 | 158 | xai | comma-era **0/10** | clean (10 zh) | ~$3 TTS + ~$0.1 + ~1-2h pass |
| spa_for_eng | live | 5,905 (36%); 331 seeds unrecorded in range | 611 | 141 | xai | comma-era **0/10** | clean (9 es, 1 gl noise) | ~$7 TTS + ~$0.1 + ~1-2h pass |
| cym_n_for_eng | live | 11 (0%); 286 seeds unrecorded in range | 5 | not rendered | human | no pod audio yet | n/a (human) | recording sessions |
| cym_s_for_eng | live | 0; 206 seeds unrecorded in range | 24 | not rendered | human | no pod audio yet | n/a (human) | recording sessions |
| ita_for_eng | live | 966 (7%) | 61 | 166 | xai | **FIXED** (pause-era, 163/163 sliced; 3/10 strict is by-design sensitive tier) | clean 10/10 it (pass complete 2026-07-11) | ~$0.4 TTS (xai rates) |
| hrv_for_eng | live | 0 | 0 | 166 | azure+11labs | mixed **5/10** (Azure half exact, 11labs half small gaps) | ⚠ 1/10 **en** (8 hr, 1 pl) | — |
| deu_for_eng | beta | 7,749 (56%); 58 seeds unrecorded in range | 745 | 136 | xai | comma-era **0/10** | clean (9 de, 1 tr noise) | ~$10 TTS + ~$0.1 + ~1-2h pass |
| ara_for_eng | beta | 6,672 (53%) | 738 | 151 | xai | comma-era **0/10** | clean (10 ar) | ~$10 TTS + ~$0.1 + ~1-2h pass |
| fra_for_eng | beta | 220 (1%); 37 seeds unrecorded in range | 48 | 152 | xai | comma-era **0/10** | clean (10 fr) | ~$0.3 TTS + ~$0.1 + ~1-2h pass |
| nld_for_eng | beta | 0 | 0 | 136 | xai | comma-era **1/10** | 🔴 3/10 **en** (6 nl, 1 sv) | ~$0.1 + ~1-2h pass |
| dan_for_eng | beta | 0 | 0 | 141 | xai | comma-era **0/10** | ⚠ 1/10 **en** (8 da, 1 de) | ~$0.1 + ~1-2h pass |
| ara_eg_for_eng | beta | 0 | 0 | 146 | xai | comma-era **0/10** | clean (10 ar) | ~$0.1 + ~1-2h pass |
| hin_for_eng | beta | 1 (0%) | 0 | 140 | xai | comma-era **1/10** | clean (9 hi, 1 te noise) | negligible + ~$0.1 + ~1-2h pass |
| pol_for_eng | beta | 0 | 1 | 141 | xai | comma-era **0/10** | clean (10 pl) | ~$0.1 + ~1-2h pass |
| por_br_for_eng | beta | 0 | 0 | 139 | xai | comma-era **0/10** | clean (10 pt) | ~$0.1 + ~1-2h pass |
| spa_mx_for_eng | beta | 1 (0%) | 0 | 142 | xai | comma-era **0/10** | clean (10 es) | negligible + ~$0.1 + ~1-2h pass |
| swe_for_eng | beta | 0 | 0 | 182 | xai | comma-era **0/10** | clean (9 sv, 1 no noise) | ~$0.1 + ~1-2h pass |
| tha_for_eng | beta | 0 | 1 | 137 | xai | comma-era **0/10** | clean (9 th, 1 vi noise) | ~$0.1 + ~1-2h pass |
| tur_for_eng | beta | 1 (0%) | 2 | 139 | xai | comma-era **0/10** | clean (10 tr) | negligible + ~$0.1 + ~1-2h pass |
| afr_for_eng | beta | 0; 3 seeds unrecorded in range | 0 | — | — (no pod) | n/a (no pods) | n/a | — |
| ara_lb_for_eng | beta | 0 | 0 | — | — (no pod) | n/a (no pods) | n/a | — |
| bul_for_eng | beta | 0 | 0 | 171 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | — |
| cat_for_eng | beta | 0 | 4 | 169 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | — |
| cat_for_spa | beta | 0 | 0 | not rendered | azure | n/a (no Take G) | n/a (native Azure voices) | — |
| ces_for_eng | beta | 0 | 0 | — | — (no pod) | n/a (no pods) | n/a | — |
| deu_for_jpn | beta | 0 | 0 | not rendered | xai | n/a (no Take G) | unsampled | — |
| deu_for_zho | beta | 0 | 0 | — | — (no pod) | n/a (no pods) | n/a | — |
| ell_for_eng | beta | 0 | 1 | 172 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | — |
| eng_for_ara | beta | 69 (1%) | 1 | not rendered | xai | n/a (no Take G) | n/a (target is English) | ~$0.1 TTS |
| eng_for_ben | beta | 0 | 0 | not rendered | xai | n/a (no Take G) | n/a (target is English) | — |
| eng_for_deu | beta | 32 (1%) | 1 | not rendered | xai | n/a (no Take G) | n/a (target is English) | ~$0.1 TTS |
| eng_for_fra | beta | 32 (1%) | 0 | not rendered | xai | n/a (no Take G) | n/a (target is English) | ~$0.1 TTS |
| eng_for_guj | beta | 0 | 0 | not rendered | xai | n/a (no Take G) | n/a (target is English) | — |
| eng_for_hin | beta | 0 | 0 | not rendered | xai | n/a (no Take G) | n/a (target is English) | — |
| eng_for_ita | beta | 16 (0%); 8 seeds unrecorded in range | 0 | not rendered | xai | n/a (no Take G) | n/a (target is English) | negligible |
| eng_for_jpn | beta | 396 (4%) | 0 | not rendered | xai | n/a (no Take G) | n/a (target is English) | ~$0.1 TTS |
| eng_for_kor | beta | 57 (1%) | 14 | not rendered | xai | n/a (no Take G) | n/a (target is English) | ~$0.1 TTS |
| eng_for_pan | beta | 0 | 0 | not rendered | xai | n/a (no Take G) | n/a (target is English) | — |
| eng_for_por | beta | 35 (1%); 11 seeds unrecorded in range | 1 | not rendered | xai | n/a (no Take G) | n/a (target is English) | ~$0.1 TTS |
| eng_for_sin | beta | 0 | 0 | not rendered | xai | n/a (no Take G) | n/a (target is English) | — |
| eng_for_spa | beta | 38 (1%) | 1 | not rendered | xai | n/a (no Take G) | n/a (target is English) | ~$0.1 TTS |
| eng_for_tam | beta | 0 | 0 | not rendered | xai | n/a (no Take G) | n/a (target is English) | — |
| eng_for_urd | beta | 0 | 0 | not rendered | xai | n/a (no Take G) | n/a (target is English) | — |
| eng_for_zho | beta | 104 (2%) | 8 | not rendered | xai | n/a (no Take G) | n/a (target is English) | ~$0.1 TTS |
| est_for_eng | beta | 0 | 0 | 173 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | — |
| eus_for_eng | beta | 176 (3%) | 9 | 174 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | ~$0.2 TTS |
| eus_for_spa | beta | 0 | 0 | not rendered | azure | n/a (no Take G) | n/a (native Azure voices) | — |
| fas_for_eng | beta | 13 (0%) | 0 | 171 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | negligible |
| fra_ca_for_eng | beta | 0 | 0 | 183 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | — |
| fra_for_jpn | beta | 0 | 0 | not rendered | xai | n/a (no Take G) | unsampled | — |
| fra_for_zho | beta | 1 (0%) | 0 | — | — (no pod) | n/a (no pods) | n/a | negligible |
| gle_for_eng | beta | 3 (0%) | 0 | 181 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | negligible |
| heb_for_eng | beta | 0 | 0 | 175 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | — |
| hun_for_eng | beta | 0 | 0 | — | — (no pod) | n/a (no pods) | n/a | — |
| hye_for_eng | beta | 9 (0%) | 0 | 137 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | negligible |
| isl_for_eng | beta | 0 | 0 | 181 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | — |
| ita_for_jpn | beta | 0 | 0 | not rendered | xai | n/a (no Take G) | unsampled | — |
| ita_for_zho | beta | 0 | 0 | — | — (no pod) | n/a (no pods) | n/a | — |
| lav_for_eng | beta | 2 (0%) | 0 | not rendered | azure | n/a (no Take G) | n/a (native Azure voices) | negligible |
| lit_for_eng | beta | 5 (0%) | 0 | 168 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | negligible |
| nep_for_eng | beta | 7 (0%) | 7 | not rendered | azure | n/a (no Take G) | n/a (native Azure voices) | negligible |
| nor_for_eng | beta | 1 (0%) | 1 | 172 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | negligible |
| ron_for_eng | beta | 0 | 1 | 175 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | — |
| rus_for_eng | beta | 0 | 1 | — | — (no pod) | n/a (no pods) | n/a | — |
| spa_for_jpn | beta | 0 | 2 | not rendered | xai | n/a (no Take G) | unsampled | — |
| spa_for_zho | beta | 0 | 0 | — | — (no pod) | n/a (no pods) | n/a | — |
| srp_for_eng | beta | 0 | 0 | — | — (no pod) | n/a (no pods) | n/a | — |
| swa_for_eng | beta | 2 (0%) | 0 | 185 | azure | word-boundaries — exact by construction | n/a (native Azure voices) | negligible |
| ukr_for_eng | beta | 1 (0%) | 1 | not rendered | azure | n/a (no Take G) | n/a (native Azure voices) | negligible |
| zho_for_gle | beta | 0 | 0 | — | — (no pod) | n/a (no pods) | n/a | — |
| zho_for_jpn | beta | 0 | 1 | not rendered | xai | n/a (no Take G) | unsampled | — |

Notes on the table:
- **missing phrases/legos** = rows the player silently skips (NULL known/target1/target2 audio id, particle components exempt). Percentages of the course's phrase total. "Seeds unrecorded in range" = seed sentences without target audio *inside the built seed range* (misses beyond the built range excluded — they're future content, not defects).
- **Take G groups** = multi-unit glued sentence groups with a linked gapped take. "not rendered" = the course has a pod cast and 142 pod sentences but no Take G takes at all — the fine-slicing ladder isn't live there (pods play whole-sentence takes; a rollout decision, not a regression).
- **seam verdict**: strict gate = all (units−1) seams ≥500ms on 10 sampled groups. The fixed ita course scores 3/10 on this deliberately strict measure because 59/163 of its groups were accepted at sensitive tier and sliced by the detection ladder — the honest comparison is that ita's takes carry `[pause]` markers and slice 163/163, while every comma-era course's takes have ~100–300ms seams that the strict slicer can't trust.
- **phonology verdict**: whisper `ggml-small` auto-detect; only English (or known-language) detections count as failures per the ita-pass calibration — Romance/neighbour flickers (gl, te, vi, no, tr, de, pl) on short clips are model noise.
- **est. fix cost**: TTS at ~$16/M chars Azure, ~$4.2/M xAI; "pass" = the proven ita recipe (`render-take-g` with seam+phonology gates under `TAKEG_LEDGER`, then `slice-take-g`), ~1–2h unattended per course, pennies of TTS.
- Out-of-scope but noted: ara_sy_for_eng (not learner-reachable) has 159 Azure takes, fine. eng_for_* known-side audio (the non-English prompt side) spot-checked on eng_for_hin: Azure native voices (hi-IN-SwaraNeural), all detected hi — no phonology risk on the known side.
- Counts moved slightly during the census (deu 7,846→7,749; ita +186 clips in 24h) — the TTS/link pipeline is actively burning down backlog, front of course first.

## Recommended batched fix order

1. **Live xAI seam batch (spa, zho, kor, jpn, por)** — run the ita recipe per course, serially, unattended. ~$0.5 TTS total. This is the highest-severity seam work: live learners hear the comma-era dialogue slices today. *Needs one TTS approval covering the batch.*
2. **Live TTS backlog (por, kor, jpn, zho, spa, ita)** — ~2.1M chars ≈ **$31 Azure + $0.4 xAI**, then `link_all_audio_ids` per course. Restores ~33k skipped phrases/legos and por/spa's 366/331 in-range seed sentences. *Needs approval (money), batchable overnight.*
3. **nld_for_eng phonology + seams** — the one red-flag course (3/10 English reads). The same gated re-render pass fixes both defects at once; run it first in the beta batch.
4. **Beta xAI seam batch (remaining 12: fra, dan, ara_eg, ara, deu, hin, pol, por_br, spa_mx, swe, tha, tur)** — ~$1.5 TTS total, unattended, low urgency (beta audiences).
5. **Beta TTS backlog (deu, ara)** — ~$20 Azure. Do together with their seam passes.
6. **Decisions for Tom (no action taken):**
   - **hrv_for_eng**: ElevenLabs half of the cast has no word boundaries and small gaps (5/10 strict) + one English-detected clip. Options: (a) re-render pod takes on the Azure half of the cast, (b) run the xAI-style gate pass with ElevenLabs, (c) leave (it's the best-sounding comma-era course). My read: (a) — better (exact spans), simpler (no new gate path), cheaper (~$0.2).
   - **cym_n/cym_s**: no pod audio at all + 286/206 in-range unrecorded seeds — human-voice recording backlog, a scheduling matter, not TTS.
   - **Take G rollout to the 28 pod courses without takes** (all 16 eng_for_*, 5 *_for_jpn, cat_for_spa, eus_for_spa, lav, nep, ukr + cym pair): product call on whether the fine-slicing ladder should go live there; each render pass is pennies once decided.
