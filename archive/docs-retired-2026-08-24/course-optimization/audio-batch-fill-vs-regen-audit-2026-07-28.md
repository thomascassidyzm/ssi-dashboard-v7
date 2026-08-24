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

---

## Addendum — real-rate re-cost + measured copy hit-rates (2026-07-28, third-dispatch verification)

All numbers below are live Supabase measurements (char sums per `voice_id`, batch window
`2026-07-27T09:33Z → 2026-07-28T18:00Z`), priced at the now-verified rates: **xAI $15/1M chars**
(`docs.x.ai/docs/pricing`, commit `6b5e3bed`), Azure S0 $4/1M. Copy-bucket inserts are separable
in the data: bare `voice_id` (`gfzdpspr5fdp`/`bedd6226`) = free copy, `xai_`/`azure_`-prefixed =
paid render — the bare counts reconcile with the log's `copied=` figures exactly (kan 1,956 ✓,
tam 1,298 ✓, pan 1,209≈1,222).

### What the batch has actually cost so far

| engine | rendered chars | rate | cost |
|---|---|---|---|
| xAI (English t1+t2 of guj/kan/pan/tam) | 1,134,910 | $15/1M | **$17.02** |
| Azure (Indic known sides + tel partial + small courses) | ~891,000 | $4/1M | **$3.56** |
| ffmpeg-incident wasted renders (719 clips, xAI, no rows) | ~19,000 | $15/1M | ~$0.29 |
| **Total spend, resume4 + incident** | | | **≈ $21** |

Copy bucket saved 6,874 renders (~124k chars ≈ $1.9 at xAI rates). The regeneration upper
bound (≈4.6% of clips) is worth ≈ $1 of the $21 — the "are we regenerating?" answer is
unchanged, only the denominators are now real.

### Heavies projection at real rates — the repoint economics FLIP

Measured today (unlinked slots, chars, and copy hit-rate against existing clone/Olivia audio,
normalized-text match):

| bucket | slots | chars | copy hits | render cost |
|---|---|---|---|---|
| fra_ca/por_br/spa_mx target sides (Azure, French/Port./Spanish) | 54,002 | 1,351,172 | ~0 | $5.40 Azure |
| tel/urd known sides (Azure, Telugu/Urdu) | 13,003 | 339,544 | 0 | $1.36 Azure |
| tel/urd English t1+t2 (xAI, already-trusted) | 24,448 | 602,051 | 9,676 (40%) | ≈$5.49 xAI |
| fra_ca/por_br/spa_mx English known — **if kept on Azure** | 25,458 | 590,535 | n/a (azure refused) | **$2.36 Azure** |
| fra_ca/por_br/spa_mx English known — **if repointed to clone** | 25,458 | 590,535 | 8,507 (33%) | **$6.82 xAI** |

- **Total heavies, current scope, no repoint: ≈ $14.6.** With repoint: ≈ $19.1.
- **The repoint is no longer a cost win.** At the corrected $15/1M, rendering the ~67%
  copy-misses on the clone costs ~3× what Azure charges for all 100%. The repoint now buys
  voice consistency (Tom-clone English matching the eng_for_X estate) for **+$4.50** — a taste
  call, not a savings, reversing this doc's line 63 rationale and the heavies-prep §5 framing.
- Lights batch (running): 5,059 slots ≈ 120k chars ≈ $1–2. Corrected-scope-only alternative
  (~1,428 repair rows ≈ 4,300 clips): ≈ $1–1.5 — the delta remains the backfill estate, not waste.
- Blocked trio (no voice_config): 118,569 slots ≈ 2.35M chars ≈ $10–30 depending on voice
  choices — still a separate spend decision.

---

## Addendum 2 — verifying the 67% copy-miss: real gaps or matching artifact? (2026-07-28)

Founder challenge before any heavy rendering starts: *"Most of these we MUST already have audio
for — so it's a copy job almost certainly."* Checked directly against live Supabase (all 25,458
NULL-`known_audio_id` slots across fra_ca/por_br/spa_mx_for_eng — full population, not a sample;
an initial 210-item spot sample was run first but used a biased shuffle and is superseded below).

### Verdict

**Mostly real, not an artifact — but the miss bucket has one previously-uncounted sub-slice.**
Of the 25,458 slots:

| bucket | slots | % | what it means |
|---|---|---|---|
| clone-voice audio already exists (bare `gfzdpspr5fdp` key) | 6,583 | 25.9% | true copy-bucket hit |
| clone-voice audio exists, stored under `xai_gfzdpspr5fdp` (same voice, prefixed key) | 1,937 | 7.6% | **also** a true hit — see matching-key note below |
| **clone-hit combined** | **8,520** | **33.5%** | matches the addendum's reported 8,507 (33%) almost exactly (drift = batch still running) |
| audio exists for the exact text, but under a *different* voice (mostly Azure `en-GB-Sonia/Bella/Ryan/Mia`, the courses' own current known-side voice) | 2,249 | 8.8% | real duplicate content, just not reachable by today's copy-match trust rules |
| no audio anywhere, any voice, for that exact normalized text | 14,689 | 57.7% | genuinely new phrase text — the backfill estate |

Per-course split (clone-hit bare-key only / other-voice / nowhere / total):
fra_ca 3,019 / 2,190 / 6,723 / 11,932 — por_br 2,168 / 1,086 / 4,589 / 7,843 — spa_mx 1,396 / 910 /
3,377 / 5,683.

### Matching-key diagnosis (asked for, found one real artifact — on the hit side, not the miss side)

`voices` registers the clone as bare `gfzdpspr5fdp` (display name "Tom"); `clone-copy-match.cjs`'s
`computeAudioKey` requires an exact string match against that bare id. But a chunk of
`course_audio` rows store the *same clone voice's* renders under the engine-prefixed string
`xai_gfzdpspr5fdp` instead — same audio, different key. Naively matching only the bare key (as a
first pass here did) undercounts real clone-hits by 7.6 points (25.9% → 33.5%). **This artifact
already existed in the original 33% figure** — it reconciles almost exactly with the combined
(bare+prefixed) count, so the addendum's headline number was already correct; it just wasn't
decomposed. The founder's "we must already have this" instinct is right for that combined 33.5%,
already counted — it does not extend further into the 66.5% miss.

Checked and ruled out as a source of *additional* hidden hits: punctuation/quote-normalization
differences (curly vs straight quotes, trailing punctuation variants) were not fully reconcilable
within this session's time budget (a same-text loose-normalization sweep over the 14,689
"nowhere" slots was started but the DB round-trip cost — 20,499 unique texts, ~1-3s/chunk — made
it impractical to finish live). Manual read of 20 "nowhere" sample texts (e.g. "Can you hold the
door open while I fetch the keys?", "did they want to develop a new approach?") shows genuinely
novel sentences, not near-duplicates of existing rows — corroborating, not proof, that the 57.7%
figure is real rather than a normalization gap.

### Re-cost under the corrected reuse picture

Using the addendum's own char totals (590,535 chars / 25,458 slots) and this session's slot-level
hit-rate (hit slots are shorter than average, so the 33.5% slot-hit-rate implies ~23% of chars —
consistent with the addendum's own $6.82 repoint figure, which already implies ~135,868 hit chars
/ ~454,667 render chars):

- **Copy bucket (bare+prefixed clone key), zero cost: 8,520 slots ≈ 135,868 chars.** No change to
  the addendum's existing $6.82 (repoint) / $2.36 (stay-Azure) render-cost lines — those already
  reflect the correct combined hit-rate.
- **Of the remaining ~454,667 render chars, an estimated ~60,000 chars (2,249 slots, other-voice
  hit, proportional estimate) are NOT new content** — they exist today as Azure clips in the
  courses' own current known voice. Repointing to the clone would still pay full xAI render cost
  for this slice (≈$0.91) because Azure clips are untrusted as copy sources (speed not verified
  1x, per `isTrusted1xEngine`). **This is a separate, real opportunity**: if Tom is willing to
  trust those specific Azure clips as 1x (or re-verify a sample), this slice becomes a free relink
  regardless of the repoint decision — independent taste/engineering call, not assumed here.
  - The remaining ≈$5.91 xAI (≈394,287 chars, 14,689 slots) is genuinely new text with no
    audio anywhere — real backfill estate either way, matching the addendum's framing.
- **Bottom line: the 67% miss is ~86% genuinely new content and ~14% an untapped
  Azure-source-trust opportunity — not a copy-matching bug inflating the miss count.** The
  repoint-vs-stay-on-Azure economics in Addendum 1 stand as costed.

No rendering, batch resume, or repoint decision was executed — numbers only, per the verification
brief.

---

## Addendum 3 — dialect-vs-parent English diff: the founder's sharpened test (2026-07-28)

Founder's sharpened prior: English prompts never name the dialect ("I want to speak Spanish", not
"Mexican Spanish"), so each dialect course's English side should be **near-identical** to its
parent (spa_mx vs spa, por_br vs por, fra_ca vs fra) — true misses expected ≤5%. If the measured
33% hit-rate holds against that bar, the matching key is the prime suspect.

**Direct diff, run against live Supabase (full population, both courses' entire known-side text
inventories, not just the unlinked slots):**

| dialect | parent | dialect slots | parent slots | whole-course English identical | miss-only: % of copy-misses that exist verbatim in parent |
|---|---|---|---|---|---|
| spa_mx_for_eng | spa_for_eng | 14,728 | 18,479 | **32.2%** | **21.0%** (79.0% truly new vs parent) |
| por_br_for_eng | por_for_eng | 16,417 | 16,232 | **42.2%** | **24.9%** (75.1% truly new vs parent) |
| fra_ca_for_eng | fra_for_eng | 14,922 | 18,186 | **34.1%** | **17.8%** (82.2% truly new vs parent) |

(Loose-normalization pass — stripping all punctuation/quotes, not just the strict trailing-mark
rule — added at most 0.3-0.5 points on top of the strict-match figures above; it is not where the
gap lives.)

### Verdict: the founder's ≤5% prior is refuted — but not by a matching-key bug

**This is not a matching-key artifact.** Two pieces of direct evidence:

1. **No lineage exists between these courses.** `courses` has no `parent_course`/`derived_from`/
   template field, and each dialect's `created_at` postdates its parent by weeks-to-months
   (spa_for_eng 2026-01-04 → spa_mx_for_eng 2026-02-27; por_for_eng 2026-01-16 → por_br_for_eng
   2026-02-27; fra_for_eng 2026-01-11 → fra_ca_for_eng 2026-04-15). There is no "copy parent, patch
   the dialect differences" build path in this system to have gone wrong.
2. **Total slot counts differ course-to-course** (spa 18,479 vs spa_mx 14,728; fra 18,186 vs
   fra_ca 14,922) — a shared-template model would produce near-identical counts. These are
   independently authored courses (per `ralph-methodology.md`: each pair gets its own seed
   selection, decomposition, and translation-choice pass — `synonym-choice-architecture.md`),
   which only *happen* to target a common macro-language. The ~33-42% overlap is the naturally
   recurring stock of short, high-frequency English pedagogical phrases ("I don't think that",
   "he couldn't", "to talk about") that independent authors converge on by the methodology's own
   frequency/cliff-front-loading logic (§1.3 "Cliff front-loading" in the manual) — not a shared
   source being under-matched.

**So the founder's mental model — one English scaffold, three dialect skins — does not match how
these three course-pairs were actually built.** The 33% clone-copy hit-rate (Addendum 2) is
consistent with "two independently authored courses share about a third of their common stock
phrases," not with "one course's English, mostly re-used, mostly missed by the matcher." Getting
to the founder's ≤5%-miss bar would require *making* the courses share an English scaffold — a
content/authoring decision (retrofitting fra_ca/por_br/spa_mx onto their parents' English side),
not an audio-pipeline fix. That is a real, sizeable lever if wanted (it would also mean rebuilding
or re-authoring the dialect target-language sides to match parent seed selection) — flagged here as
a decision for Tom, not assumed or started.
