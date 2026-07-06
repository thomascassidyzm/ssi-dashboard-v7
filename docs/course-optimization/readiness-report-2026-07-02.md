# Big-nine audio-readiness report — 2026-07-02 (LIVING DOC, completes as final-passes land)

Goal (Kai): all 9 for_eng courses ready for audio generation — scan-course issues fixed, final-passes run to all-seeds-complete, plus the Deborah/Meredith investigation.

## Verdict table

| course | ZUT | vocab Cat-A (adjudicated) | strips (slash/paren/quote/。) | grid | readiness sweep | VERDICT |
|---|---|---|---|---|---|---|
| spa | 0 | 0 (11 real fixed) | clean | complete | ✅ swept, fixes applied | **READY** (197 pre-existing fewUse baskets → backfill pipeline note) |
| fra | 0 | 0 (7 real fixed + 2 backfilled) | clean | complete | ✅ swept (2,021 case-normalizations) | **READY** |
| zho | 0 | 0 (12 real fixed, CJK detector) | clean | complete | ✅ swept (metadata-gloss class closed) | **READY** |
| por | 0 | queued | clean | final-pass running | wave 2 | pending |
| ara | 0 | queued | clean | final-pass running (re-fired after wrong-range first run) | wave 2 | pending |
| jpn | 0* | queued (use check11-cjk) | clean (65 FP seeds need 。residue) | final-pass running | wave 2 + register P3 + 4 lexical pairs | pending |
| kor | 0 | queued | clean | final-pass running | wave 2 | pending |
| deu | 0 | queued | clean | final-pass running (S81 rebuilt separately) | wave 2 + gender-prep confirmation (expect ≈0) | pending |
| ita | 0 | 0 (18 real fixed post-rebuild) | clean | final-pass running (39 seeds) | wave 2 + curly-apostrophe normalization | pending |

*jpn's raw-synonym register forks resolved by design: block-P3 (see joint-pile item 7).

## Deborah/Meredith investigation (goal component — COMPLETE)
- Full mining pass over all past findings → detectors → all 9 courses (`temp/reviewer-mining-2026-07-02/report.md`). Deborah's structural patterns do NOT recur (reflexive-clitic 0, plural-register 0, você 0). Fixed live: Meredith's zho word-order S0162, spa missing-te, fra reflexive component, kor/zho single-char TTS lists compiled for the regen.
- Kai's fresh 16-item spa batch: fully executed same-day (26 deletions, 6 rewords, 2 inserts, 4 verified self-healing) + two structural escalations crafted (S0071 Welsh-style reorder, S0169 trigger-fix).
- NEW detector classes added to the library: known-drift (target-anchored), CJK-aware Check-11, post-strip collision sweep.

## Editorial items for Kai (non-blocking)
1. chance/opportunity meaning-drop (zho 5 + jpn 9 phrases) — recommend accept-as-natural (机会 untaught at those seeds).
2. spa "Ya entiendo" at S0078 (ya debuts later) — reword to "ahora entiendo" or accept.
3. zho S0651L01 "how do you feel"→觉得怎么样 — works; "what do you think" tighter (cosmetic).

## Standing follow-ups (post-goal backlog)
- Welsh-order worst-seed batch: pilot DONE (5 seeds, zho/jpn); ranked backlog in `temp/welsh-order-2026-07-02/` for fra/ita/ara/spa (~25 more) + "chain, don't tile" for the builder prompt.
- Late M-debut round-economy class (spa examples logged) — design pass candidate.
- spa fewUse backfill pipeline (197 baskets, pre-existing).
- Player resume fall-forward PR (Tom asked).
- 哪个 "which one" never-taught (zho which-family look).

## Regen gate
See `xai-regen-brief-2026-07-02.md`. Hard blocker: **XAI_API_KEY not loaded on ssi-machine prod-api** (Tom). TTS fires only on Kai's approval of the itemized plan.

## Post-report pattern sweeps (07-03, Kai's three rules)
- spa: 7 que-triggers fixed, 3 reflexive-agreement errors, 1 demonstrative fold — detectors 0/0/0 after. Follow-up noted: S0225L03 has 4 pre-existing known↔target drift rows.
- ita: 22 flagged seeds under rework (che-class); fra S204/S210 di-class redone; por/fra/deu/kor/jpn/zho sweeps queued behind their writers.
