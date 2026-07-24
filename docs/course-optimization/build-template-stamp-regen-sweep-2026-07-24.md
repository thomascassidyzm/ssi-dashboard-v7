# BUILD template-stamp regeneration sweep — 2026-07-24

Follow-up to the [audit](build-phrase-template-stamp-audit.md) and its [fix commit](../../logs/build-regen-sweep-2026-07-24.log). `tools/course-optimization/regenerate-stamped-builds.cjs --all` ran estate-wide, in-place, gated, resume-safe.

## Totals (from `logs/build-regen-sweep-2026-07-24.log`)

- 1697 stamped rows found → **1658 applied**, 39 failed, 30 lego regens escalated to Opus (rest Sonnet).
- 60 courses had stamped rows; 55 of those queued an audio-pass request after repair.

## Independent verification

Re-ran `scripts/build-audit/classify-builds.cjs` fresh against Supabase for all 92 courses in `courses.txt`, plus `kor_for_tam` (has stamped rows per the sweep log but isn't in `courses.txt` — estate-list gap, not a sweep defect).

- **Residual `use-stem+tag`/`comma-tag` rows across all 93 courses: 30**, all in the 11 courses that logged failures in `courses.txt` scope. Per-course residual counts matched the sweep's `failed` field exactly (e.g. eng_for_kan: 6, eng_for_pan: 5, eng_for_urd: 4, eng_for_jpn: 4).
- `kor_for_tam` carries the remaining 9 residual (0.9% of its seeds1-300 band) — matches its `failed:9, applied:0` sweep entry.
- **30 (tracked) + 9 (kor_for_tam) = 39 = the sweep's logged total. Exact reconciliation, no discrepancies.**
- Every other course classified at 0.0% stamp rate across every seed band.

## The 39 unregenerable rows

All failed with "no valid replacements after 5 attempts" — the regen agent couldn't find a natural BUILD extension that passed ZUT/vocab/tiling gates in 5 tries. Rows were left untouched (still template-stamped) rather than force-written.

| Course | Lego | Cue | Rows failed |
|---|---|---|---|
| cym_n_for_eng | S0131L01 | "mae'n bosib" | 1 — no valid replacement |
| deu_at_for_eng | S0270L01 | "i Angst hob" [opus] | 1/2 rows — partial, no valid replacement for the remainder |
| eng_for_guj | S0282L01 | "that's not a problem" | 1 — no valid replacement |
| eng_for_jpn | S0096L01 / S0097L01 / S0172L01 | "no" / "yes" / "that would be very helpful" | 4 — no valid replacement |
| eng_for_kan | S0593L01 | "however much I argued" | 6 — no valid replacement |
| eng_for_pan | S0593L01 / S0599L02 | "however much I argued" / "I would have happily driven" | 5 — no valid replacement |
| eng_for_por | S0096L01 | "no" (2/4 replaced) | 2 — partial, no valid replacement for remainder |
| eng_for_tel | S0063L02 / S0229L02 | "helping me" / "if that woman could" | 3 — no valid replacement |
| eng_for_urd | S0034L01 / S0047L02 | "he doesn't want" / "it's a good thing" | 4 — no valid replacement |
| hun_for_eng | S0083L01B01 | "egyetértek" | 1 — before-state drift, skipped (row changed underneath the sweep, not a generation failure) |
| kor_for_eng | S0537L02 | "틀렸어요" | 1 — no valid replacement |
| kor_for_tam | S0096L01 / S0041L01 / S0097L01 | "아니요," / "괜찮은데" / "네," | 9 (all 3 legos; course not in `courses.txt` estate list) — no valid replacement |
| tur_for_eng | S0087L02 | "insanlar" | 1 — no valid replacement |

Common thread: short, idiomatic yes/no/discourse-marker cues ("no", "yes", "that's not a problem") and complex modal/counterfactual cues ("however much I argued", "I would have happily driven") — both ends are hard to extend into fresh non-clunky BUILD phrases within existing vocab. Candidates for manual (human/Opus) authoring rather than further scripted retries.

## Audio-pass queue

55 courses queued an audio-pass request (`queueAudioPass`) proportional to rows actually repaired (not stamped-before). Full list and row counts in the sweep log. Notably **eng_for_kan queued 110 rows** — this course was previously holding a missing-audio backlog per [`eng_for_kan build status`](../../memory) and is now cleared through the queue.

Not queued (0 rows applied, all failed): `cym_n_for_eng`, `kor_for_eng`, `kor_for_tam`.

### Approval + fulfilment run (2026-07-24, owner-approved)

Tom approved the audio passes for this sweep's queue. Approval is recorded on the
queue rows themselves (`audio_pass_requests.metadata.approval`) by
`tools/course-optimization/run-approved-audio-passes.cjs --approve`; the same tool's
`--run` fulfils them sequentially through phase8 `/generate` (gated path:
`tts-service.cjs` — pinned voices, child-voice blocklist, tail-click detector v2,
phonology gate). 57 requests approved: the 55 in this doc's count plus `hrv_for_eng`
(pre-existing pending request the sweep touched) — the log's exact split is 56
`Queued` + 1 `Touched`. Run log: `logs/build-audio-pass-2026-07-24.log`.

⚠️ Operational note: the long-lived pm2 `phase8-audio` process predated the 07-23/24
gate commits (child-voice hard block, tail-click v2) and was serving stale code — it
was restarted on current `main` before any clip was minted (verified 0 rows written
in the stale window). If a gate file changes mid-backlog, restart `phase8-audio`.

## Files

- `logs/build-regen-sweep-2026-07-24.log` — full run log
- `scripts/build-audit/regen-logs/*-applied-log.json` — per-course before/after row diffs
