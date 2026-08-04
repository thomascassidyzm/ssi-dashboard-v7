# QA landscape scout — 2026-08-04

Ground-truth map of every automated quality capability in the SSi course production
pipeline: where the code is, whether it runs, and whether failing it **blocks** anything.

Written as input to the "publish-ready" tool design. Scope was scouting only — nothing
in this pass changed code, generated audio, or deleted an asset.

**Method note, and it matters for how you read this.** Three evidence tiers were used,
and each row says which one it rests on:

- **CODE** — read in this repo at commit `d7620c05` + working tree.
- **DB** — queried live via `.env.psql` against the production Supabase (psql 17 at
  `~/.local/pg17/bin/psql`; `psql` is not on `PATH` on this box).
- **LIVE** — probed against the actually-running backend at `https://ssi-machine.ngrok.app`
  and its local ports 3470 / 3491.

Where a doc and the code disagreed, the code won. Where the code and the running system
disagreed, the running system won — and there is at least one place where they do
disagree, called out below.

---

## 1. Headline verdict

**Tom's read — "lots of capability, but little enforcement" — is confirmed, and it is
worse than that in one specific way and better than that in another.**

Counts, by what each check actually does:

| Class | Count | What it means |
|---|---:|---|
| Checks that **BLOCK** something | **1 family** (the `/api/seed/complete` gate, ~12 distinct checks inside it) | Real enforcement — a 400 and nothing is written |
| Checks that run **automatically but only report** | **1** (`audio-batch-gate.cjs` via phase8) | Fires on its own; by explicit design cannot stop anything |
| Checks that exist and are **manually-run CLI only** | **~14** | Someone must know to type the command |
| Checks that are **wired to nothing** (dead code / unmounted / commented out) | **9** | Built, never reachable |
| Checks that are **installed but silently switched OFF in production** | **1** (the xAI wrong-language phonology gate) | Believed on; provably off |

So of roughly **26 identifiable quality capabilities, exactly one family enforces** —
and that one family only enforces on *new content submitted through the course-builder
API*. It has never run over the existing estate. Every course built or edited by any
other path — direct DB insert, batch regeneration, the audio pipeline, the QA fixer
agents — is entirely ungated.

**The better-than-expected part:** a surprising amount of the publish-ready tool's
layer 1 already exists as working, tested code. The `/api/qa/*` router is mounted, live,
and answering right now. There is already a `/qa/sample/:courseCode` endpoint. The
audio gate already runs itself after every generation pass. This is substantially a
**plumbing job, not a build job** — see §4.

**The worse-than-expected part:** three things that look like enforcement are not.

1. **The QA checkpoint machinery at seeds 10/50/150/300 does not run at all.**
   `services/course-builder/lib/checkpoint.cjs` implements `isBlockedByCheckpoint()`.
   `seed-complete.cjs:76-79` imports it. **It is never called.** (grep for the symbol
   returns only the import line.) And `routes/checkpoint.cjs` is not mounted —
   `services/course-builder-api.cjs:44-53` lists eleven routers and checkpoint is not
   among them. Verified LIVE: `GET :3491/api/checkpoint/status/eng_for_zho` → **404**.
   The gate that `ralph-methodology.md` describes as the course's QA spine is inert.

2. **The wrong-language render gate is off on the production machine.**
   `services/tts-service.cjs:566-569` computes
   `PHONO_GATE_ON = XAI_PHONO_GATE !== '0' && fs.existsSync(WHISPER_BIN) && fs.existsSync(WHISPER_MODEL)`.
   `WHISPER_BIN` defaults to `/opt/homebrew/bin/whisper-cli` (a macOS path) and `.env:33`
   sets `WHISPER_MODEL=/Users/tomcassidy/SSi/whisper-models/ggml-small.bin` (also macOS).
   Neither exists on this Linux box. Evaluated on the live box: **`PHONO_GATE_ON = false`**.
   Meanwhile `whisper-cli` *is* installed, at `/home/tomcassidy/.local/bin/whisper-cli`.
   The comment above it calls this a "zero-tolerance audio bar". It has been off, and it
   announces this once per run in a log line nobody reads — the near-silence run logs
   committed on the current branch contain it verbatim:
   `[TTS] xAI phonology gate unavailable (whisper-cli or model missing) — non-English xAI renders unchecked for language drift`.
   **This is a two-line env fix, and it is the highest value-per-effort item in this entire map.**

3. **A live frontend QA affordance calls a route that does not exist.**
   `src/views/production/CalibrationReview.vue:253` and `src/views/CourseManager.vue:1955`
   fetch `/api/golden/review-queue/:course`. `routes/golden.cjs` is **not mounted**
   (`course-builder-api.cjs:44-53`). Verified LIVE: `GET :3491/api/golden/review-queue/eng_for_zho`
   → **404 Cannot GET**. The human-approval review queue — the existing analogue of Tom's
   "manual sign-off" — is a dead button.

And the number that frames the whole exercise: **`eng_for_zho` has 4,882 phrases,
of which 0 are `qa_checked` and 0 carry a QA flag** (LIVE, `GET /api/qa/summary/eng_for_zho`).
Estate-wide, 75,671 of 818,280 phrases have ever been marked checked — **9.2%** (DB).

---

## 2. Capability versus enforcement — the table

Legend for **Invoked**: `BUTTON` = dashboard control · `AUTO` = runs itself in a pipeline
stage · `CRON` · `CLI` = manually-run only · `NOWHERE` = unreachable.
Legend for **Enforces**: `BLOCKS` = failing it prevents a write/publish/transition ·
`REPORTS` = emits a finding only · `n/a` = never runs.

### 2A. Text / LEGO / methodology

| # | What it checks | Where | Invoked | Enforces | Coverage | Trust |
|---|---|---|---|---|---|---|
| T1 | **ZUT (LEGO level)** — same known → different target | `lib/validation.cjs:476 checkLegoConflict`, used `seed-complete.cjs:448,751,1134` | AUTO (inside the submit gate) | **BLOCKS** (`errors.push type:'zut'` → 400, `seed-complete.cjs:1156,1695`) | one seed at submit | High for what it sees. Sees only *new* submissions. |
| T2 | **ZUT (phrase level)** | `lib/validation.cjs:630 checkPhraseZUT`, used `seed-complete.cjs:534,1417` | AUTO (submit gate) | **BLOCKS**, per-phrase hold-out (`zut_held_out`, `seed-complete.cjs:679`) | seed's phrases | High. Note the 2026-07-04 rescope: an earlier version checked component rows as ZUT units and ~93% of flags were noise. Component rows are now known-side exempt. |
| T3 | **Tiling** — seed recomposable from its LEGOs | `lib/validation.cjs:101 checkTiling`, `seed-complete.cjs:1191` | AUTO (submit gate) | **BLOCKS**. Runs even under `skip_validation` | one seed | High. Mechanical. |
| T4 | **LEGO syllable cap (≤8)** | `checkLegoSyllables`, `seed-complete.cjs:1165-1184` | AUTO (submit gate) | **BLOCKS**. Explicitly "always runs, even with skip_validation" | one seed's LEGOs | High. |
| T5 | **Vocabulary containment** — no forward references | `lib/validation.cjs:250 checkVocabViolations`, `seed-complete.cjs:513,1257,1346` | AUTO (submit gate) | **BLOCKS** | seed vs all prior | High. |
| T6 | **Known-side controlled language** | `lib/validation.cjs:843 checkKnownSide` + `896 loadPairContract`, `seed-complete.cjs:1491` | AUTO (submit gate) — **only if `docs/pair-contracts/{course}.contract.cjs` exists**; absent contract = silent skip | **SPLIT**: vocab breaches BLOCK (`:1500`); construction/licensing problems are **warnings only** (`:1512`) — deliberate, "contracts are mostly unratified" | seed's phrases | Medium. Silently skips whole courses with no contract. Count your contracts before trusting a pass. |
| T7 | **BUILD recombination** — BUILD is new LEGO + prior vocab | `lib/validation.cjs:968 checkBuildRecombination`, `seed-complete.cjs:1223,1340` | AUTO (submit gate) | **BLOCKS** | per LEGO | Medium-high; has its own test file `build-recombination.test.cjs`. |
| T8 | **Phrase-count floors / ramp** | `seed-complete.cjs` phrase-count block | AUTO (submit gate) | **BLOCKS** | per LEGO | High mechanically — but enforces the *validator ramp* (S4+: 3 BUILD/5 USE), **not Tom's stated floor of ≥4 BUILD / ≥5 USE**. See §2E. |
| T9 | **Phrase complexity / length ratio** | `lib/validation.cjs:159 checkPhraseComplexity`, `seed-complete.cjs:1631` | AUTO (submit gate) | **BLOCKS** | per LEGO | Medium. |
| T10 | **Late-course vocab balance (seed 21+)** | `lib/validation.cjs:360,427`, `seed-complete.cjs:1656` | AUTO (submit gate) | **BLOCKS** on third consecutive strike | course-wide rolling | Medium. |
| T11 | **Metadata-gloss gate** — "object marker" style debuts | `lib/validation.cjs:781 checkMetadataGloss`, `seed-complete.cjs:1452` | AUTO (submit gate) | **REPORTS ONLY** (`warnings.push`, `:1454`) | seed's LEGOs | Medium. Doctrine calls this a category error; the gate only whispers. |
| T12 | **Basket frame coverage / diversity** | `lib/validation.cjs:717 checkBasketFrameCoverage`, `seed-complete.cjs:556,1468` | AUTO (submit gate) | **REPORTS ONLY** (`:1470`) | per LEGO basket | Medium. |
| T13 | **Role separation** — creator may not submit | `seed-complete.cjs:895` | AUTO | **BLOCKS** (403) | per request | High. |
| T14 | **Phrase monitor** — LEGO over/under-use tally + flags | `services/phrase-monitor.cjs` | CLI (`--tally/--analyze/--report`); referenced in a spawn brief at `services/shared/spawn-course-builder.cjs:808` | REPORTS | whole course | Unassessed here. |
| T15 | **Known-side gate, standalone** | `tools/known-side-gate.cjs` (thin wrapper over T6) | **NOWHERE** — zero callers | n/a | — | — |
| T16 | **Course validators** | `tools/validators/course-validator.cjs`, `tools/validators/validate-course.cjs` | **NOWHERE** — zero callers | n/a | — | — |
| T17 | **QA flag/sample/summary API** | `services/course-builder/routes/qa.cjs` (25 routes) | Mounted (`course-builder-api.cjs:51`) and **LIVE-verified answering** | REPORTS + records human verdicts | course / sample | Works. See §4 — this is the reusable spine. |
| T18 | **QA checkpoints at seeds 10/50/150/300** | `lib/checkpoint.cjs` + `routes/checkpoint.cjs` | **NOWHERE.** Router unmounted; `isBlockedByCheckpoint` imported at `seed-complete.cjs:76` and never called. LIVE 404. | **n/a — does not run** | — | Documented as a gate; is not one. |
| T19 | **Golden-seed human approval / review queue** | `routes/golden.cjs` (10 routes) | **NOWHERE** — unmounted. Frontend calls it anyway (`CalibrationReview.vue:253`). LIVE 404. | n/a | — | A dead button in the UI. |
| T20 | **Seed preflight scoring** | `routes/preflight.cjs` | **NOWHERE** — mount deliberately commented out at `course-builder-api.cjs:43` (used the Anthropic SDK; removed to stop ~$38/day billing) | n/a | — | Correctly disabled. Do not revive as-is. |
| T21 | **Haiku phrase scoring in the submit path** | — | **REMOVED** (`seed-complete.cjs:1717` comment) | n/a | — | Same cost reason. |

### 2B. Audio

| # | What it checks | Where | Invoked | Enforces | Coverage | Trust |
|---|---|---|---|---|---|---|
| A1 | **Silent / near-silent / short clips** | `tools/audio-batch-gate.cjs` (`gateBatchSafe:452`) | **AUTO** — `services/phases/phase8-audio-v13.cjs:2223`, after every successful generation pass. Also CLI. | **REPORTS ONLY, deliberately.** The code says so: *"Fire-and-forget and never throws — a gate that can break a completed render pass is worse than no gate. It REPORTS; it never deletes or mutates a row."* (`phase8-audio-v13.cjs:2219-2221`) | clips minted by that run (`--since`); whole course from CLI | **Do not treat a pass as proof.** See §2D. |
| A2 | **Clip repair (re-render)** | `tools/repair-silent-clips.cjs` | CLI | n/a (a fix, not a check) | list-driven | Refuses `presentation` role on purpose (CASCADE would destroy authored content). |
| A3 | **Wrong-language render gate (xAI)** | `services/tts-service.cjs:566-661`, `detectSpokenLanguage:588` | AUTO at render time **in principle** — **provably OFF on this box** (see §1.2) | Would block a bad render; currently **n/a** | every xAI call site | Fail-open by design even when on: unmeasurable → treated as pass (`:591-593`). |
| A4 | **Wrong-language sweep, cross-course** | `tools/sweep-wrong-language-crosscourse.cjs`, `tools/rescue-wrong-language-clips.cjs` | CLI (zero code callers) | REPORTS | course / estate | Prior run artefacts in `tools/audio-sweeps/`. |
| A5 | **Gender lint** — voice↔text gender mismatch | `tools/audio-gender-lint.cjs` | CLI (zero code callers; only doc cross-refs from `pod-recolour.cjs:29`, `gendered-speech.cjs:4`) | REPORTS | course | — |
| A6 | **Envelope / loudness** | `services/audio-envelope.cjs` (+ `.test.cjs`), `tools/audio-envelope-batch.cjs` | CLI / library | REPORTS | batch | Has unit tests. |
| A7 | **Tail click / de-click** | `tools/declick-tail.cjs`; mastering rules in `phase8-audio-v13.cjs` (`masterAudio` tail burst/resurgence) | AUTO within mastering | Mutates (repairs), does not block | per clip | **Known over-rejection**: the soft resurgence/rise rules over-reject breathy voices — 3 clips hard-error after 3 passes (issue #18). `docs/tail-click-listening-test.html` is the manual ear-check artefact for exactly this. |
| A8 | **Chunk-audio coverage** | `tools/audit-chunk-audio-coverage.cjs` | CLI | REPORTS (feeds `build-chunk-audio-regen-queue.cjs`) | course/pod | Queue artefacts exist as `*-STAGED.json`. |
| A9 | **Pod voice coverage** | `tools/pod-voice-coverage.cjs` | CLI (6 cross-refs) | REPORTS | pod | — |
| A10 | **Legacy/stranded voice ids** | `tools/revoice-clips.cjs`, `tools/rescue-child-voice-clips.cjs` | CLI | Mutates on demand | list-driven | 14 hrv rows still carry ElevenLabs ids that 404 on xAI — unresolved, needs a voice-mapping ruling. |
| A11 | **Missing-audio backlog** | `services/shared/audio-pass-queue.cjs` (`queueAudioPass`) | AUTO from content passes (`regenerate-stamped-builds.cjs:167`, `clone-copy-pass.cjs:243`); fulfilled by `phase8-audio-v13.cjs:46` | **REPORTS ONLY — explicitly non-blocking.** Header: *"Never throws — a content pass must not fail because the queue write did."* | course | Ledger, not a gate. **DB: 24 requests pending** (created 2026-07-24 → 07-31), 45 fulfilled, 3 dismissed. Nothing is blocked by the 24. |
| A12 | **Duration consistency (DB vs file)** | `services/audio-duration-service.cjs` | Used by `s3-deploy-service.cjs` | REPORTS | deploy set | **This is the check that was fooled**: `duration_ms` was computed *from* the laundered silent file, so DB and S3 agreed perfectly. See §2D. |

### 2C. Structural / integrity

| # | What it checks | Where | Invoked | Enforces | Coverage | Trust |
|---|---|---|---|---|---|---|
| S1 | **`course_round_index` freshness** | `tools/refresh-round-index.cjs` | **CLI only.** The tool's own header states the matview *"has no trigger/RPC that keeps it in [sync]"* | n/a — no check exists at all | whole estate | **Real, measured drift (DB):** 4 courses in `course_legos` are entirely absent from the matview — `kor_for_tam`, `zho_for_hin`, `zho_for_tam`, `zzz_test_for_eng`. Per-course: `eng_for_zho` 502 LEGOs → 500 index rows; `fra_for_eng` 1,653 → 1,529 (**124 missing**). Symptom for a learner is "one seed then INF PLAY". **Nothing detects this today.** ⚠️ `CLAUDE.md` claims the view is "refreshed on lego mutations by the dashboard pipeline" — the code says otherwise. Code wins; CLAUDE.md is stale here. |
| S2 | **Orphan component rows** | historical sweep scripts under `tools/course-optimization/` | CLI, ad hoc | REPORTS | course | ⚠️ `tools/course-optimization/audit-phrase-zut.cjs` — cited in the distilled sweep protocol as the canonical audit tool — **does not exist in the tree**. Another stale-doc trap. |
| S3 | **Missing BUILD/USE per LEGO** | only inside T8, at submit time | — | n/a for existing courses | — | **DB-measured on live courses** (join on course+seed+lego_index): see §2E. |
| S4 | **Manifest structure** | `services/manifest-validator.cjs`, `tools/validators/manifest-structure-validator.cjs` | **NOWHERE** — zero callers | n/a | — | Also legacy: the manifest is not on the learner read path. |
| S5 | **Quality control service** | `services/quality-control-service.cjs` | **NOWHERE** — zero callers | n/a | — | Dead. |
| S6 | **Preflight check service** | `services/preflight-check-service.cjs` | **NOWHERE** — zero callers | n/a | — | Dead. |
| S7 | **Frame diversity / fine seams / canon ellipsis audits** | `tools/audit-frame-diversity.cjs`, `audit-fine-seams.cjs`, `audit-canon-ellipsis.cjs` | CLI (0–1 callers each) | REPORTS | course/pod | — |

### 2D. Checks whose passing you should NOT trust

Named explicitly, because the repo's own audio-repair doc is a what-not-to-trust document
and this map would be dishonest without carrying it forward.

1. **`audio-batch-gate.cjs` default (non-`--deep`) run.** It screens by *duration floor*
   first and only measures the clips that screen in (`gateBatchSafe:456-458`). It is
   **structurally blind to any defect longer than the floor.** The forensics pass measured
   a real defect at **624 ms** — above the floor. The near-silence run log committed on
   the current branch shows that exact clip being repaired:
   `[2/6] target1 "窗边那张桌子空着。": 624ms -> 1944ms`. A clean default gate report is
   *not* proof of a clean course. (`docs/audio-repair-2026-08-04/README.md`.)

2. **Any "0 confirmed" produced before commit `a16889c3`.** `loadClips` paged 1,000 rows
   at a time ordered by a non-unique `created_at`, so rows silently vanished at page
   boundaries while the row *count* stayed correct. **Not reproducible.** Everything in
   the repair table was re-verified on the fixed tool; anything else was not.

3. **Anything that reasons from `duration_ms`.** The degrading-xAI defect produced empty
   HTTP 200 bodies which the mastering chain laundered into well-formed MP3s, and
   `duration_ms` was computed *from those files*. DB and S3 agreed perfectly. Every
   consistency check in the estate passed. That includes A12.

4. **"0 failures" reports.** The de-hiss pass reported *"142,973 files, 0 failures"* —
   an honest statement about thrown exceptions, and silent on whether any file contained
   audio.

5. **Silence-only checks, on three grounds.** There are **three artefact classes** sharing
   one duration signature: silent stubs (−91 dB), truncations (audible, normal level, half
   a sentence), and near-silence (full byte size, real signal, 10–30 dB under healthy).
   A check that only asks "is it silent?" passes two of the three. `hrv_for_eng` had
   **zero** silent clips and 9 real defects — all truncation, **all role `known`**.
   `eng_for_ben`'s 149 confirmed defects were all `known` too. **No amount of ear-checking
   target audio would have found either** — a direct and important constraint on what a
   sample mode must cover.

6. **T6 known-side gate on a course with no pair contract** — skips silently and reports
   a pass.

7. **A3 wrong-language gate** — currently off (§1.2), and fail-open even when on.

### 2E. Two numbers Tom asked for, measured

**LEGO count in the first 50 seeds** (DB, `course_legos`) — Tom estimated 120–150:

| course | seeds 1–50 | 1–300 | 1–668 | total | max seed |
|---|---:|---:|---:|---:|---:|
| `eng_for_zho` | **137** | 502 | 502 | 502 | 300 |
| `fra_for_eng` | **143** | 660 | 1,653 | 1,653 | 668 |
| `spa_for_eng` | **138** | 742 | 1,475 | 1,475 | 668 |
| `cym_s_for_eng` | 82 | 532 | 679 | 679 | 334 |

**Tom's estimate is right: 137–143 LEGOs** for a typical course. `cym_s_for_eng` at 82 is
an outlier — worth knowing that the deep-pass workload is not constant across courses.

**MVP (300 seeds) vs Full (668) — the cost difference.** Tom has not made this call, so
both are mapped. Note the courses differ in shape:

- `eng_for_zho` **stops at seed 300** — for it, MVP *is* Full (502 LEGOs, 5,092 phrases).
- `fra_for_eng`: 660 LEGOs to seed 300 → 1,653 to 668. **2.5× the LEGOs.**
  Phrases (DB, `course_practice_phrases`): 6,913 build+use to seed 300 → 14,151 total. **~2× the text-sweep volume.**

**Default I am taking, flagged for Tom:** map and cost the automated sweep at **Full
(668)**, because a code-based sweep's marginal cost is near zero and a 300-seed floor
cannot support the "acceptable risk from seed 51" argument for a 668-seed course. The
MVP/Full distinction should apply to *human* effort (the deep pass and sample budget),
not to the automated floor.

**Phrase floors on live content** (DB, joined on course+seed+lego_index, seeds ≥4):

| course | LEGOs s4+ | <3 BUILD (validator ramp) | <5 USE (ramp) | below Tom's ≥4/≥5 floor | zero phrases at all |
|---|---:|---:|---:|---:|---:|
| `eng_for_zho` | 493 | 0 | 0 | **194** | 0 |
| `fra_for_eng` | 1,641 | 178 | 276 | **1,138** | **117** |
| `spa_for_eng` | 1,465 | 160 | 215 | **851** | **92** |

This is the clearest single illustration of capability-vs-enforcement. `eng_for_zho`
passes the shipped validator ramp perfectly (0/0) yet **194 of 493 LEGOs sit below Tom's
stated floor**. And `fra_for_eng` has **117 LEGOs with literally no phrases attached** —
a structural defect no running check reports.

> Caveat on the join, stated honestly: `course_practice_phrases.lego_id` is nullable and
> not in the same format as the generated `course_legos.lego_id`, so this joins on
> `(course_code, seed_number, lego_index)`. My first attempt joined on `lego_id` and
> returned 100% violations — an obviously-wrong result that I discarded rather than
> reported. The 117 zero-phrase LEGOs should be spot-checked against the seeds before
> any repair is actioned; per the repo's own rubric, a count is not a work-list.

---

## 3. The journey-script page — does it use the learner's engine?

*(Section pending sub-agent reports on both sides; see §5 for status.)*

---

## 4. Publish-ready tool — ADD versus WIRE UP

*(Section pending; drafted after §3 lands.)*

---

## 5. Explicit gaps

*(Section pending.)*
