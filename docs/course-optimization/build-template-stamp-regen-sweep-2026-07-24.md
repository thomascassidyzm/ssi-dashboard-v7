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

## cym_s_for_eng — human recording needed (Tom ruling 2026-07-25)

The Welsh courses are human-voiced only (no TTS ever). The 6 re-texted BUILD rows below were KEPT by Tom's ruling — they need **human recordings** of the new target phrases; until recorded, these rows have no matching audio:

| row | new English | new Welsh |
|---|---|---|
| S0054L01B01 | thank you very much but I still need to practise speaking | diolch yn fawr ond dw i dal angen ymarfer siarad |
| S0164L01B07 | so I'd better speak Welsh now | felly well i fi siarad Cymraeg nawr |
| S0131L01B02 | it's possible that you started a week ago | mae'n bosib wnest ti ddechrau wythnos yn ôl |
| S0131L01B03 | it's possible I've forgotten something | mae'n bosib dw i wedi anghofio rhywbeth |
| S0286L03B03 | he wants whatever | ma fe'n moyn ta beth |
| S0286L03B05 | whatever they say | ta beth maen nhw'n dweud |

## cym_n / cym_s — human recording needed: unlinked Welsh-TTS rows (Tom ruling 2026-07-26)

Owner ruling (Tom, 2026-07-26), **option B**: the 32 reachable Welsh-target legacy TTS clips (Jan 2026 `legacy_import`, `origin=tts`, `language=cym`) were **unlinked now** (`target1_audio_id`/`target2_audio_id` nulled on the 17 content rows below — 5 legos + 12 phrases across the two courses) so the rows go silent, and the phrases are queued here for **human recording**. Welsh courses are human-voiced only; no TTS. The clip assets themselves were left in place (repo no-delete rule); only the references were cut. Each row had **no human-voiced alternative** for the same target text — verified before unlinking, so nothing learner-facing was lost that a human recording won't restore. Before-state (for reversibility): `docs/course-optimization/welsh-tts-unlink-2026-07-26-before-state.json`.

| row | English | Welsh | table | db id |
|---|---|---|---|---|
| S0043L01 | did you start? | wnest ti ddechrau? | course_legos | cym_n_for_eng / ab81afcd-e392-405a-87bc-61a79e6e9df0 |
| S0094L03 | did you have? | gest ti? | course_legos | cym_n_for_eng / 2dd6aaa6-d3c9-4ad3-bab5-a77c3c207c84 |
| S0194L01 | did you have? | gest ti? | course_legos | cym_n_for_eng / c4a8244e-95e1-45e3-87eb-6802adda92aa |
| S0043L01B04 | did you start a month ago? | wnest ti ddechrau mis yn ôl? | course_practice_phrases | cym_n_for_eng:S0043L01B04 |
| S0043L01B06 | did you start to practice a week ago? | wnest ti ddechrau ymarfer wythnos yn ôl? | course_practice_phrases | cym_n_for_eng:S0043L01B06 |
| S0043L01B07 | did you start to practice? | wnest ti ddechrau ymarfer? | course_practice_phrases | cym_n_for_eng:S0043L01B07 |
| S0197L01B01 | what did you think? | beth oeddat ti’n meddwl? | course_practice_phrases | cym_n_for_eng:S0197L01B01 |
| S0210L01B02 | did you say that you wanted a cup of tea or coffee? | ddudest ti bo’ ti isio panad o de neu goffi? | course_practice_phrases | cym_n_for_eng:S0210L01B02 |
| S0235L01B03 | did you say that you wanted to get up early in the morning? | ddudoch chi bo’ chi isio codi yn gynnar yn y bore? | course_practice_phrases | cym_n_for_eng:S0235L01B03 |
| S0040L01 | did you start? | wnest ti ddechrau? | course_legos | cym_s_for_eng / ac6d6e64-5523-4c82-a3ac-dda38270aaaa |
| S0092L01 | did you get? | gest ti? | course_legos | cym_s_for_eng / 2fb944d5-a863-45d0-8d0a-79a2330d99cf |
| S0040L01B05 | did you start a month ago? | wnest ti ddechrau mis yn ôl? | course_practice_phrases | cym_s_for_eng:S0040L01B05 |
| S0040L01B06 | did you start to practice a week ago? | wnest ti ddechrau ymarfer wythnos yn ôl? | course_practice_phrases | cym_s_for_eng:S0040L01B06 |
| S0040L01B07 | did you start to practice? | wnest ti ddechrau ymarfer? | course_practice_phrases | cym_s_for_eng:S0040L01B07 |
| S0204L01B01 | what did you think? | beth o’t ti’n meddwl? | course_practice_phrases | cym_s_for_eng:S0204L01B01 |
| S0218L03B03 | did you say that you wanted a cup of tea or coffee? | ddwedest ti bo’ ti’n moyn dishgled o de neu goffi? | course_practice_phrases | cym_s_for_eng:S0218L03B03 |
| S0248L01B02 | did you say that you wanted to get up early in the morning? | ddwedoch chi bo’ chi’n moyn codi yn gynnar yn y bore? | course_practice_phrases | cym_s_for_eng:S0248L01B02 |

Graceful-degradation check (learner app): both playback paths funnel through `packages/player-vue/src/providers/generateLearningScript.ts`, which filters out any lego/phrase lacking all three audio ids (`phraseHasFullAudio`; lego filter — rows dropped with a `console.warn`, never rendered as a cycle). `api/courses/[code]/cycles.ts` omits null audio keys ("frontend treats absence as no audio for this role"). The throwing guard in `useCyclePlayback.ts` never receives these rows because they're filtered upstream. Silence = skip, not crash. `content_stamp` bumped on both courses by the `touch_course_content_stamp` trigger (fires on every update), so learner devices re-fetch.
