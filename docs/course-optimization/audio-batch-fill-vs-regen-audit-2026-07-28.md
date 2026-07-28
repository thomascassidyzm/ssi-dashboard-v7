# Audio batch audit — fills vs regenerations, guard health, projection (2026-07-28)

Founder question: **"Are we regenerating audio we already have?"** Batch: `tools/course-optimization/run-approved-audio-passes.cjs` → phase8 `/generate`, log `logs/build-audio-pass-resume4-2026-07-27.log`, queue `audio_pass_requests`. Batch is PAUSED (phase8 `/status`: `cancelled:true`, eng_for_tel stopped at 1,800/21,469). Nothing here restarts it.

## Verdict in one line

**No — ≥95% of the generated clips are genuine first-time fills for NEW phrase texts (the July backfill-spread passes), not regenerations; the precious-audio guard is intact and never decides what gets generated; the real finding is a scope mismatch: requests commissioned for ~1,400 re-texted BUILD rows ran course-wide `/generate`, which also voiced each course's unvoiced backfill estate.**

## Method (all numbers from Supabase via psql, not logs alone)

- The batch was sequential, so each course owns a non-overlapping wall-clock window from the log.
- The TTS write path upserts `course_audio` on `(course_code,text_normalized,language,role,voice_id)` **without touching `created_at`** — so a window-dated row = INSERT = fill (no row existed for that phrase+voice); `generated − window_inserts` = UPDATEs = upper bound on regeneration of a key that already had a clip.
- Cross-checked at the text level with aggressive normalization (strip all non-alphanumerics, ignore voice): for eng_for_kan only **81 of 21,600** window-inserted rows (0.4%) had prior audio for the same text under ANY voice/normalization. The generated texts are new texts.
- Origin tags were not trusted anywhere in this audit (per the stale legacy_import warning); classification is row/timestamp/text-based.

## Q1 — fills vs regenerations, per completed course (resume4)

| course | generated | window inserts | copied (no TTS) | UPDATEs = regen upper bound | share |
|---|---|---|---|---|---|
| deu_at_for_eng | 8 | 8 | 0 | 0 | 0% |
| eng_for_guj | 12,030 | 10,864 | 0 | ~1,166 | 9.7% |
| eng_for_ita | 17 | 17 | 0 | 0 | 0% |
| eng_for_jpn | 22 | 22 | 0 | 0 | 0% |
| eng_for_kan | 20,357 | 21,600 | 1,956 | ~713 | 3.5% |
| eng_for_kor | 9 | 9 | 0 | 0 | 0% |
| eng_for_pan | 18,842 | 18,937 | 1,222 | ~1,127 | 6.0% |
| eng_for_por | 21 | 20 | 0 | 1 | — |
| eng_for_spa | 27 | 26 | 0 | 1 | — |
| eng_for_tam | 17,124 | 18,166 | 1,298 | ~256 | 1.5% |
| eng_for_tel (cancelled mid-run) | 1,793 | 4,170 | (incl. copies) | — | — |

- Total TTS clips ≈ 70,250; regeneration upper bound ≈ 3,264 (≈4.6%) — and part of that is benign (pending presentation placeholder rows being voiced, and re-runs over the jammed 07-24/25/26 attempts, which explains guj's higher share).
- **Known vs target split of the fills** (eng_for_X ⇒ known = Indic language, target = English): kan 6,801 known / 13,533 target / 1,266 presentations; pan 6,215/11,454/1,268; tam 6,039/11,178/949; guj 101/9,762/1,001. English-side reuse via the clone copy bucket DID work where trusted: 4,476 clips copied at zero TTS cost.
- **Why whole-course scale:** each of these courses gained ~6,000–7,400 NEW phrases in mid-late July (backfill-spread: guj +7,196 Jul 17–20, pan +6,837 Jul 17–19, kan +7,438 Jul 21–24, tam +6,141 Jul 21–27, tel +7,856 Jul 20–21). ×3 roles ≈ the generated counts. Those phrases had no audio anywhere — the clips are real fills the learners need.
- **Money actually spent (resume4 heavy courses):** ≈2.12M chars ≈ **$8.50 at Azure S0 ($4/1M chars, `services/audio-generation-planner.cjs`)**, plus the xAI-priced share for English `bedd6226` (t1) clips — xAI TTS pricing is not recorded in the repo; flagged below.

## Q2 — is the precious-audio guard broken?

**No.** Three facts:

1. **The guard never decides what gets generated.** `humanRowAtAudioKey` runs at write time only, to refuse a TTS overwrite of an `origin='human'` row. Generation scope comes from NULL audio FKs + `getExistingAudioSet` — a guard failure cannot cause regeneration. Regeneration it "should have prevented": **zero, by construction**.
2. **It is fail-closed and failures were rare and transient**: 33 `precious-audio guard query failed: TypeError: fetch failed` occurrences across the whole ~27h batch (pm2 phase8 error logs), amid ~70 other transient `fetch failed` TTS/provider errors — ~0.04% of ~70k writes. Each failed clip stays missing and is picked up by the next run; nothing was clobbered. There were also **zero human-origin rows in any eng_for_* course**, so nothing precious was even in reach.
3. **No wrong port / dead service**: the guard queries Supabase cloud (`SUPABASE_URL=https://swfvymspfxmnfhevgdkg.supabase.co`) — not a local service, so the kai-stage port change is not implicated. Live proof: the same PostgREST query path answers in **99 ms** today.

**Fix applied** (hardening, not a behaviour change): `humanRowAtAudioKey` now retries the read 3× with backoff before failing the clip — transient undici blips no longer waste an already-paid TTS render. Still fail-closed after retries. The running phase8 (checkout `/Users/tomcassidy/ssi-dashboard-v7-clean`, pm2) picks it up on next pull+restart; the paused batch was NOT restarted.

## Q3 — projection for the remaining queue (41 pending requests)

Current unlinked audio slots (NULL FK) per pending course, from the DB today:

**(a) Current scope (course-wide /generate):**
- Runnable heavy courses: fra_ca_for_eng 38,492 slots (~903k chars), por_br_for_eng 24,033 (~540k), spa_mx_for_eng 16,935 (~344k), eng_for_tel remainder 19,730 (~501k), eng_for_urd 17,721 (~373k), guj+pan residuals 3,823 (~102k). ~30 light courses ≈ 700 slots (~30k chars) total.
- **Runnable total ≈ 141k clips / ≈2.8M chars ≈ $11 at Azure rates** + xAI share (eng_for_tel/urd t1) + presentations authoring. English known-side of the X_for_eng heavies is on legacy Azure en-GB voices (Sonia/Bella) — NOT the clone — so the copy bucket refuses them (engine not verified speed-invariant) and they would be TTS'd (~46k of those slots).
- Blocked regardless: deu_ch_for_eng (46.6k slots), fin_for_eng (48.2k), por_for_jpn (23.8k) have **no voice_config** — `/generate` 400s, generates nothing (~2.35M chars if ever configured).

**(b) Corrected scope (commissioned repairs only):** the pending reasons sum to ~1,428 re-texted BUILD rows ≈ **~4,300 clips ≈ ~$2**.

The (a)−(b) delta is NOT waste — it is the unvoiced backfill estate (real learner-facing phrases). The decision is *when* to voice it, not *whether it was already voiced*.

## Rescope recommendation

1. **Resume the batch as-is for the ~30 light courses** — they will each generate single-to-double-digit clips (exactly the commissioned repairs). Minutes of work, ~$1.
2. **Treat the 5 heavy runnable courses (fra_ca, por_br, spa_mx, eng_for_tel, eng_for_urd + residuals) as a deliberate "voice the backfill estate" decision**, not a repair pass: ~141k clips, ≈$11 Azure + unquantified xAI share. My read: approve it — the phrases are live course content and the cost is small — but it's a spend call, so it's yours. If approved, consider first repointing the X_for_eng English known-side to the clone `gfzdpspr5fdp` so ~46k English clips become free copies instead of Azure renders.
3. **deu_ch_for_eng / fin_for_eng / por_for_jpn need voice_config before anything happens** — separate task; their queue rows will keep 400ing until then.
4. Re-run failed clips (~1,000 across guj/kan/pan/tam, mostly tail-defect refusals + transient fetch) via normal resume — the runner is already resume-safe.
5. Open loose end: exact xAI per-char/per-clip pricing isn't in the repo — worth pinning down once, since bedd6226 voices every eng_for_X target1.
