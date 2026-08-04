# Open questions / decisions pending

## Waiting on Tom

1. **eve audio-gate ownership (issue #18).** Does Tom own the canonical gate change on `main`, or is
   Kai cleared to land the voice-scoped soft-rule exemption (`e476b242`, already on kai-stage)? Blocks
   finishing deu/fra generation. (`projects/01`)
2. **xAI mastering approach (issue #17 / PR #17).** Land the gated `afftdn` denoise on the production
   path, OR converge onto Tom's `normalizeAudioClean` clean-master approach? Neither branch is a
   superset; kai-stage keeps de-hiss (matches the 138k live clips), main took clean-master. The probe
   data is there to inform the call. (`projects/02`)
3. **Playback-speed fix (issue #19).** Needs confirming in `ssi-learning-app` source (Tom's / watson-1's
   scope): is the speed flag meant to default off, and does the core scheduler tag the early-seed ramp?
   (`projects/03`)
4. **Popty → watson-1 migration itself.** The parallel-run door: env-switcher now has a "SSi Machine
   (Cloud)" entry (`6c807d0d`) + a phase-2 runbook (`debf3ca4`, `docs/…migration…`). Confirm the
   cutover plan and who runs TTS from where once watson-1 is primary.

## Waiting on Kai (TTS clicks + decisions — nothing here is auto-fireable)

1. **TTS for the 647 deepening phrases** (all draft/no-audio). Generate from **kai-stage phase8**
   (has de-hiss + gates), never a plain main checkout. (`projects/05`)
2. **deu/fra straggler conversion** — after issue #18 lands: relink+unflag dupes first, then
   `regenerate-role flaggedOnly` per role. Kai fires the TTS. (`projects/04`)
3. **kor re-decomposition** — fix tooling / spec the methodology ruling / park. Do **not** resume the
   re-cut without fixing rollback (it emptied a released seed twice). (`projects/06`)
4. **Repair backlog** — the never-final-passed 301–668 back-thirds: jpn S451–668 + S301–325
   unlicensed-tags, kor 451–668, por 562–668, ara 163–300. (`projects/05`)
5. **Two lego-target prereqs** to unblock two more deepens: spa_mx "that is" esa→**eso**;
   por_br ouviste/perguntaste→**você**.
6. **A/B-listen the de-hiss clone voices** (`temp/hiss-ab-2026-07-29/`), then commit the pipeline
   wiring on whichever branch wins + re-enable Mac sleep (`sudo pmset -a disablesleep 0`). (`projects/02`)
7. **Round-index refreshes pending** (need `.env.psql`): several courses built/edited by direct DB
   ops won't appear in `course_round_index` until `REFRESH MATERIALIZED VIEW CONCURRENTLY
   course_round_index` — incl. deu_at test-batch, fin proofread S16, zho_for_tam S135. Symptom of a
   stale view: "one seed then INF PLAY."
8. **Held native reviews before TTS:** yue "too mainland" register sweep (Kai + friend, HK voice);
   yue/hak/nan deepening held; deu_at word-order borderlines. (`projects/07`)

## Housekeeping decisions for Kai

- Whether to keep any of the 3 old no-upstream branches with unique commits, or delete them
  (`branches-and-uncommitted.md`). The two `kai-stage-*` snapshot branches + 13 stashes can very
  likely be dropped once kai-stage is on origin.
- Whether the in-flight CJK vocab-separator .cjs change (folded into kai-stage `90f2de86`) is wanted
  — trivially revertable if not.
