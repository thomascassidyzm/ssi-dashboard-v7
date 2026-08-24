# Adaptation v2 — shadow verdict, 2026-07-16

**Verdict: KEEP SHADOWING — not because its decisions look wrong, but because in three days it made no decisions at all, and it provably cannot.** The soak validated the plumbing (153 plans logged, 14 learners, 16 courses, 48 sessions, zero crashes, zero learner-visible effects). It validated nothing about judgment: every single plan was the scripted default — build 7, consolidate 2, spaced-rep 12, no breathers — and all 75 difficulty reads came back "steady".

## 1. What it would have done, judged as a tutor

1. **hin_for_eng guest, 15 Jul, 2h36 session** — 15 replays, 24 back-skips, 73 pauses, 5 round restarts. Engine: full rate, every round. A good tutor slows new-LEGO arrival and consolidates. **Wrong — missed intervention.**
2. **hrv_for_eng learner 40d9d637, 15 Jul, 1h53** — restarted rounds 3× (the strongest struggle signal in the engine's own evidence mapping, value 2.0). Engine: nothing. **Wrong — missed.**
3. **Same hin session, 18:43→20:39** — learner walked away for two hours mid-session and returned. Engine: "steady", straight back to full rate. A tutor eases back in. **Wrong — missed.**
4. **spa_for_eng learner 67529065, 15 Jul, 37 min** — 54 fast forward-skips, then switched turbo on themselves. Engine: nothing. Half-defensible: the manual dial outranks the engine by design. But it also couldn't see the easing that should trim padding. **Partial.**
5. **cym_n_for_eng learner 7434474c, 16 Jul, 14 clean rounds in 39 min** — near-zero interventions needed. Engine: nothing. **Right** — and this is what most of the 48 sessions look like. "Do nothing" was usually correct; it was never a choice.

## 2. Why nothing ever fired, and the inversion hunt

- **The sensor is structurally blind.** Evidence timestamps are session-milliseconds, so the fitted acceleration comes out ~10⁻¹⁰, the alarm's "negligible-noise" fallback then compares that raw number against a threshold of 2 — unreachable by ten orders of magnitude. Max |z| across all 3 days of production reads: 6.5×10⁻¹⁰. Reproduced with the shipped code: a blatant synthetic struggle reads "steady" with ms timestamps and sane z with cycle-index x. Fix is one line of x-normalisation in the series feed.
- **Its memory is wiped every session.** `learner_lego_metrics` contains **zero rows ever** — every persistence write since the June migrations has failed silently (console.warn only). Units cap at ~7 samples; cross-session curvature is impossible. This also means v1 mastery states have never persisted.
- **The kill switch was never seeded.** No `adaptation_v2` row exists in `algorithm_config`; the engine runs on code defaults, which say `enabled: true` where the spec said ship disabled. Shadow-mode-by-default is the only thing between this and live, and none of the bounds are tunable without a deploy until the row exists.
- **Drill-the-rare inversion:** none observable — there were no decisions to invert, and the code is structurally sound here (no path raises drilling on struggle; criticality is introduction order, not frequency). But one **latent inversion by omission**: `planRound` is handed the ordinal of only the current round's LEGO, so every review-phase unit reads "unknown → not critical → deferrable" — **including seed-1 LEGOs. As wired, "early LEGOs resist deferral" protects nothing.** Must be fixed before any flip.

## 3. The three PROPOSED numbers you're being asked to bless

- **15% criticality cutoff** — the first 15% of the course's LEGOs can never have their practice thinned, however stuck the learner looks. My read: right shape, right default — but meaningless until the ordinal wiring above is fixed; bless the number, gate the flip on the wiring.
- **Lever floors (build 3 of 7, consolidate 1–4, spaced-rep 6 of 12, pause 0.7–1.4)** — the engine can never hollow a round below turbo's proven-playable shape. My read: sane, matches an already-shipped precedent; fine as-is.
- **Breathers, max 1 per 3 rounds** — at most one no-new-material round in three, assembled from the learner's own review pool, indistinguishable from a generous review section. My read: conservative and invisible; fine as-is.

## 4. Options

- **Flip now** — zero risk and zero point: every plan is the default, so nothing would change; you'd be signing off machinery that has never made a decision, and its first real decision would happen live and untested when someone fixes the sensor.
- **Flip with bounds tightened** — nothing to tighten against; the bounds were never touched.
- **Keep shadowing (my recommendation)** — three mechanical fixes: normalise the evidence x-axis, root-cause the zero-row persistence failure, seed the `adaptation_v2` config row + real ordinal map. Then a one-week re-soak, and the bar for flipping is concrete: a handful of non-default plans in the log, each reading like the tutor you'd want in examples 1–3.

*Evidence: `player_events` where `event_type='adaptation_plan'` (14–16 Jul); sensor reproduction against `@ssi/core` `localDifficulty`/`curvature`; wiring in `useAdaptationEngine.ts:291` and `LearningPlayer.vue:4253`.*
