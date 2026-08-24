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
| Checks that **BLOCK** something | **3 families** — the `/api/seed/complete` gate (~12 checks inside it), the **tail-defect gate at the audio mastering chokepoint**, and the **voice-engine splice/align guards** | Real enforcement — a 400, or a thrown error that aborts the clip |
| Checks that run **automatically but only report** | **1** (`audio-batch-gate.cjs` via phase8) | Fires on its own; by explicit design cannot stop anything |
| Checks that exist and are **manually-run CLI only** | **~14** | Someone must know to type the command |
| Checks that are **wired to nothing** (dead code / unmounted / commented out) | **9** | Built, never reachable |
| Checks that are **installed but silently switched OFF in production** | **1** (the xAI wrong-language phonology gate) | Believed on; provably off |

The table in §2 has **40 rows**. Counting the submit gate's ~12 internal checks as the
one family they are, that is **29 distinct capabilities — and three of them enforce.**

> **Correction, made after a sub-agent challenged my first count and turned out to be
> right.** I originally wrote "exactly one family enforces". That was wrong, and the
> correction matters because it is the report's central claim. The two I missed:
>
> - **The tail-defect gate.** `audio-processor.cjs:687` throws
>   *"still detected after 3 repair passes — refusing to ship"*, called from
>   `repairTailDefect` at the mastering chokepoint (`phase8-audio-v13.cjs:945`).
>   `masterAudio` is `try`/`finally` with **no catch**, so the throw propagates to all
>   **7** render call sites. A clip still dirty after 3 DSP passes is genuinely aborted and
>   never written. This is real, automatic, per-clip enforcement on every render path.
> - **The voice-engine guards** — `splicer.cjs:275` (splice-length floor, ≥95% of summed
>   inputs) and `align.cjs` (chunk-count alignment). Both throw. Both cover **only the
>   human-recording pipeline**, not TTS.

**But the shape of the finding is unchanged, and in one way sharpened.** All three
enforcement points are *upstream, per-item, at creation time*: they gate an incoming seed
or an individual clip. **Nothing whatsoever gates a course-level verdict** — no publish, no
status promotion, no phase transition, no export. The `/api/seed/complete` family has
never run over the existing estate; the tail gate only ever sees clips as they are minted. Every course built or edited by any
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
| A7 | **Tail click / amputation guard** | `services/audio-processor.cjs` `repairTailDefect` (throws at `:647`, `:687`); called `phase8-audio-v13.cjs:945` inside `masterAudio`. Also `tools/declick-tail.cjs` for sweeps | **AUTO on every render** (7 `masterAudio` call sites) | **BLOCKS.** Repairs by DSP for up to 3 passes; still dirty → **throws, clip never ships**. `masterAudio` is `try`/`finally` with no catch, so it propagates. | per clip | **Known over-rejection**: the soft resurgence/rise rules over-reject breathy voices — 3 clips hard-error after 3 passes (issue #18); the repair README says *do not force them*. Its whisper-based amputation guard **silently no-ops without `whisper-cli`** — see §1.2, that is true on this box now. `docs/tail-click-listening-test.html` is the manual ear-check artefact for exactly this. |
| A13 | **Splice length floor** (human recordings) | `services/voice-engine/splicer.cjs:275` | AUTO in the recording pipeline | **BLOCKS** — throws on a truncated splice | per splice | Human-recording path only; does not cover TTS. |
| A14 | **Chunk-count alignment** (human recordings) | `services/voice-engine/align.cjs` | AUTO in the recording pipeline | **BLOCKS** — throws | per take pair | Human-recording path only. |
| A15 | **Two parallel human-flag systems** | `audio_flags` vs the older `flags`, both in `production-api.cjs` | — | REPORTS | — | Coexist **unreconciled**. Only bites if a flag goes missing where you expect it — worth a look, not urgent. |
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

### 2C-bis. The publish / export path — where enforcement should live, and does not

From a sub-agent audit of `ProductionOverview.vue` and the export wizard. **Attributed:
these are the worker's traces, spot-checked but not line-by-line re-verified by me.**
Flagged as such because it is the one block in this document I did not personally confirm
end to end.

| Affordance | What a user reasonably assumes | What it actually does |
|---|---|---|
| **"Publish Manifest"** | Publishing is gated on QA / audio completeness | Server-side (`production-api.cjs:7843`) blocks on **`duration === 0` only** (never-recorded samples). No check of `course_export_states.s3_verified`, no QA checkpoint score, no course status. The wizard's "Publishing Blocked" panel and its **"I understand the risks" override are client-only UI with no server-side gate to bypass.** |
| **"Skip verification" checkbox (Step 2)** | Turns off a verification gate | **Does nothing** — never sent to any API. Moot anyway, since the server was not enforcing verification. |
| **"Run QA Audit"** (`ProductionOverview.vue:216`) | Runs an audit and tells you the result | Spawns a Sonnet CLI agent on a remote host via AppleScript/iTerm2 and **responds success before the spawn resolves**. If that machine is not logged in with iTerm2 open, **the UI still says success.** |
| **Testing / Beta / Live and Free / Premium / Community pills** | Promotion implies readiness | Flips a DB column directly. **No audio-completeness or QA check — a course can go "Live" with zero seeds built.** |
| **"Regenerate" (Step 1)** | Appends / refreshes | Calls `resetState()`, wiping the export workflow's server record. Closer to "start over". |
| **Push-to-remote gating** | Consistent | Three separate checks, two dismissable. **Step 4's production audio deploy reads the manifest off local disk and never checks push status** — an unpushed commit has zero effect on whether audio ships. |

Working roughly as labelled: Step 2 "Verify" (real S3 + `sox` duration + MP3 format checks
with background auto-fix), version-bump diffing (`manifestDiffService`), "Download Manifest".

**This is the sharpest capability-vs-enforcement finding in the report after the checkpoint
one.** The publish path is where a "publish-ready" verdict would naturally bite, and today
**none of its safety UI is backed by server-side enforcement.** Anyone can publish, or flip
a course Live, regardless of QA or audio state. Tom's v1 item (a) — one button, pass/fail —
has an obvious home here, and wiring its verdict into `production-api.cjs:7843` is what
would turn the whole exercise from reporting into enforcement.

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

8. **`suspect` / `near-silent` verdicts read alone.** Both screens deliberately flag the
   healthy tail too. In the two applied repairs, **17–26 "suspects" per course probed
   healthy** and were correctly left alone. A suspect count is a *probe list*, not a
   defect count — treating it as the latter will manufacture work and, worse, invite
   forcing repairs on clips that are fine.

9. **Near-silence is not confined to short clips.** Near-silent clips were found at up to
   **1,080 ms** — well past the 400 ms duration floor. This compounds §2D.1: the floor is
   not merely blind to a rare long defect, it is blind to a documented band of them.

10. **Anything whisper-dependent, on this box, right now.** That is both the tail gate's
    amputation guard (A7) and `rescue-wrong-language-clips.cjs`'s phonology gate. They
    **silently no-op** without `whisper-cli` — confirmed true here (§1.2). So the one
    genuinely enforcing audio gate is currently running with its safety catch disabled:
    it can still trim, but the guard that stops it amputating resumed speech is off.

11. **`audio-duration-service.cjs` and the deploy-verify dashboard buttons** verify the
    **legacy JSON manifest**, which per CLAUDE.md is explicitly *not* what the learner app
    reads — the player reads Supabase directly. **A clean pass there says nothing about
    what a learner hears.** This is the §2C/S4 "manifest is off the learner path" problem
    showing up as a green tick someone might believe.

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

Tom's parenthetical was *"it's not the ACTUAL learning player, but it does use the same
engine (or does it...)"*.

### Verdict

**Genuinely separate implementations, hand-synced, currently drifted.**

Not "same engine". Not "shared engine with divergences". Two parallel codebases that
implement the same design and are kept in step by hand, with **no shared code and no
automated parity check**. The dashboard file says so itself, in its own header:

> `services/learning-script-generator.cjs:1-6` — *"Learning Script Generator v5.0 —
> dashboard mirror of the learner app. **Parallel implementation** of
> `generateLearningScript.ts` in ssi-learning-app (**no shared code** — keep the two in
> sync by hand; see `docs/voice-engine/script-divergence-report.md`)."*

The path is: `ScriptViewer.vue` journey view → `GET /api/production/:courseCode/learning-journey`
(`services/production-api.cjs:6676`) → `services/learning-script-generator.cjs`. One file
backs the journey view, and it lives in **this** repo.

**Why the "@ssi/core" appearance is misleading.** This repo *does* declare
`"@ssi/core": "file:../ssi-learning-app/packages/core"` and `node_modules/@ssi/core` is a
symlink into the learner repo. But that dependency is used for **pods and the network
builder only** (`services/network-builder-api.cjs:10`). The pod engine files under
`src/lib/podEngine/` are **verbatim vendored copies**, not imports — their own banners say
so (`src/lib/podEngine/index.ts:3-5`). **The journey script generator imports nothing from
`@ssi/core`.** So the shared-engine story is true for pods and false for the journey view.

### The sync history, and the drift as of today

A full line-by-line audit was done on 2026-06-10
(`docs/voice-engine/script-divergence-report.md`) and found 5 review-misleading
divergences. A convergence patch landed the same day (§6 of that report) and fixed D1
(phantom component cycles), D2 (hard-coded SR offsets → live `algorithm_config`), D4
(phantom L1 listening), and made D3 a toggle. That work was real and it holds.

**But the report's own recommended lock — a golden-fixture parity test diffing the two
generators' `(type, known, target, audioIds)` stream in CI — was never built.** I checked:
`services/learning-script-generator.test.cjs` has 13 tests including audio-completeness
parity assertions, but **no cross-repo fixture diff** (`grep parity|fixture|golden` → one
descriptive test name, no fixture).

Predictably, they have drifted again. Commit dates on the two generators:

| Side | Last change to the generator |
|---|---|
| Dashboard `learning-script-generator.cjs` | **2026-06-30** (`5a92d789`) |
| Learner `generateLearningScript.ts` | **2026-07-30** (`4120e1b3`); before that 2026-07-14 (`76fac0ff`) |

**Named, concrete, currently-live divergence** — `76fac0ff` (2026-07-14, a founders'
decision by Tom and Aran): in speaking mode, a **drained-seed production review** now
plays a fixed **target → known → target → target sandwich, all @1×**, emitted as four
single-audio sub-cycles (`emitSeedSandwich`, `Cycle.singleAudio`), replacing the standard
prompt/pause/voice1/voice2 cycle. Verified counts: `emitSeedSandwich|singleAudio` appears
**4 times** in the learner generator and **0 times** in the dashboard one. The dashboard
*does* implement the seed-phase review itself (`SEED_PHASE_START_OFFSET = 144`,
`reviewItemIsSeed:81`) — it just still renders those reviews in the **old cycle shape**.

So: on the journey page today, every seed-phase review (skip offset ≥144, i.e. the entire
back half of a mature course) is displayed with the wrong cycle structure and the wrong
play-speed profile.

### What can diverge in ways that matter for QA

Assessed per Tom's list, using the 2026-06-10 audit plus today's drift check:

| Dimension | Status | QA consequence |
|---|---|---|
| **Sequencing / round construction** | Core algorithm **aligned** (intro → debut → BUILD ≤7 → SR ≤12 → consolidate ×2 → dedup), and SR offsets now read live from `algorithm_config.script_shape` on both sides | Trustworthy for main-loop content order |
| **Cycle shape within a review** | **DIVERGED** since 2026-07-14 (the sandwich) | Seed-phase reviews shown wrong |
| **Gap / pause timing and play-speeds** | **Not modelled** by the dashboard at all | A pacing defect is invisible on the QA page |
| **Which audio variant / voice is chosen** | **ALIGNED — and this is the strong point.** Journey rows play `presentation_audio.id` / `known_audio_uuid` / `target1/2_audio_uuid` (`LearningJourneyView.vue:509-535`) via `/api/production/:course/audio/:uuid/url`; the learner plays the **same FK columns** → **same S3 `mastered/{uuid}.mp3`** | **A bad clip WILL be audible on the QA page.** This is the single most important QA fact in this section. |
| **How missing audio is handled** | **Deliberately different, and correctly so.** Default journey view keeps rows the learner drops, flagged `hasAudio:false`. The learner drops LEGOs missing *any* of known/target1/target2 *before* the walk, so round numbers compress. A `?learnerView=1` toggle ports the learner's gates | The QA page by default shows **more** than the learner gets — so it will not *hide* a defect, but round numbering/SR pairings in the default view are not the learner's |
| **Pods (L2)** | Dashboard emits none — deliberately dropped, not converged. Live pods are per-learner runtime-scheduled on a ratchet (`usePodLapScheduler.ts`) | Pod content is **out of scope** for the journey page; PodsView owns it |
| **L1 listening** | Removed from the dashboard's main-round projection to match the learner's 2026-05-19 removal | Listening MODE content is not reviewable here |
| **INF PLAY tail + cold-start bootstrap window** | Not modelled on the dashboard | Two real learner code paths the QA page never exercises |

### Correction: the learner side is a three-generator hybrid, and the 2026-06-10 report is now stale on it

A sub-agent trace of `ssi-learning-app` (folded in, and **re-verified by me before relaying**,
because its headline claim was too consequential to pass on unchecked) established that
there are **three** distinct sequencing implementations, not two:

| # | Implementation | Role today |
|---|---|---|
| (a) | `@ssi/core`'s own `packages/core/src/script/generateScript.ts` | Exported and imported widely, but mostly for `GENERATOR_VERSION` cache-busting, not round construction |
| (b) | `packages/player-vue/src/providers/generateLearningScript.ts` | The full spaced-rep engine — Fibonacci offsets `[1…2584]` at `:103`. **This** is what the dashboard mirrors |
| (c) | `useInstantPlayback.ts` → `GET /api/courses/:code/round-map` + `/cycles` → `backendCyclesToRounds.ts` | The **bootstrap and steady-state queue** |

**The worker claimed (b) is QA-tool-only, reached solely via `useFullCourseScript.ts` →
`CourseExplorer.vue`. That is wrong, and I checked:** `LearningPlayer.vue:55` imports
`generateLearningScript as generateSimpleScript` **directly**, and `runFullScriptHandoff`
(`:12500`) calls it on idle after the first cycle plays. The worker only traced
`useFullCourseScript.ts`'s callers and missed the direct import.

**But the 2026-06-10 divergence report is also now stale here.** It states the handoff
generates the steady-state session. Since the July refactor (`41ca9d6d` 2026-07-01,
`4120e1b3` 2026-07-30) the code says the opposite, in terms
(`LearningPlayer.vue:12492-12498`):

> *"The walk's output is used for the audio-aware boundary (`liveMainLoopRoundCount` —
> INF-PLAY entry needs it), for the warm-start cache, and for the stale-matview resume
> repair. It **does NOT blanket-replace the live queue**."* `replaceQueueFromCurrent`
> fires only when the resume repair needs it (`:12563`).

### ⚠️ An open question I could not resolve, and it is the biggest one in this report

**Where does cross-LEGO spaced repetition enter the live learner queue?**

What I verified myself:
- The `cycles` endpoint does not emit it. Its own comment says so — `cycles.ts:30`:
  *"Cross-LEGO spaced-rep is NOT included here; the frontend constructs those from the round-map."*
- `backendCyclesToRounds.ts` and `useInstantPlayback.ts` contain **no** `spacedRep` /
  `spacedRepOffsets` / `calculateSpacedRep` / `reviewOf` symbols. Grepped both; zero hits.
- The `round-map` materialised view is one row per **fresh-introduction** LEGO
  (`is_new = true`, `schema.sql:6326-6331`) — no review rows by construction.
- Tier-3 prefetch supplies **authored tiling**, not reviews.
- And (b), which *does* own the Fibonacci engine, explicitly does not replace the queue.

So `cycles.ts:30` points at a frontend reconstruction that neither the worker nor I could
locate. **Either it lives somewhere I did not find, or the live steady-state queue has no
cross-LEGO spaced repetition in it** — which would mean the core teaching mechanism is
absent from the path real learners are on. I am **not asserting the second reading.** I am
saying the evidence does not settle it, and it is the single most important thing to
settle before the publish-ready tool is designed, because **it determines whether the
journey page's SR timeline resembles anything a learner experiences at all.**

This deserves one focused read of the player by someone who knows the intended design —
it is a question about intent, not just about code.

### The answer to "would the QA page surface a defect the learner would hear?"

**For a bad audio clip: the bytes are there to be heard, but nothing tells you.** Same
audio UUIDs, same S3 objects, same mastered files — so a human listening to the journey
page hears exactly what a learner hears, and flag/regen targets the right row. **But no
code on either side detects the defect.** Both sides gate on **ID presence only, never
duration or validity**:

- Dashboard: `hasAudio: !!(known_audio_uuid && target1_audio_uuid)`
  (`learning-script-generator.cjs:775`). `useScriptPlayer.js` has no duration awareness —
  it sets `.src` and calls `.play()` (`:171-178`). A missing clip calls `onAudioEnded()`
  and auto-advances with a console log and **no visible UI error** (`:50-53`, `:108-166`).
- Learner: `toPlayerCycle()` drops a cycle only when an audio **ID** is absent
  (`backendCyclesToRounds.ts:214-227`), and does so **silently — no warning, no
  telemetry**. (The legacy path at least `console.warn`s the same class of defect,
  `toSimpleRounds.ts:255`.) A zero-duration clip with a valid ID sails straight through.

**So the near-silence / truncation defect class you have just spent a week repairing is
invisible to both the QA page and the player.** It is only ever caught by
`audio-batch-gate.cjs` — the one check that, by design, blocks nothing (§2B/A1).

There is a second-order consequence worth naming: the learner's inter-cycle pause is
computed from the **DB-stored** `duration_ms` via `computePauseDuration`
(`backendCyclesToRounds.ts:264-271`, algorithm in `packages/core/src/script/computePauseDuration.ts:104-159`,
clamped to 700–15000 ms). A stale or wrong stored duration desyncs pacing from the actual
clip and is invisible to that layer — which is precisely the second symptom the repair
tool had to fix by updating `target1_duration_ms` / `target2_duration_ms`.

The learner does have a genuine last line of defence, but only for a *hard* failure:
`SimplePlayer.ts:244-259` catches the `<audio>` `error` event, retries once silently
(`handleAudioFailure`, `:358-376`), then trips a tap-to-retry UI. A silent-but-decodable
clip never triggers it.

**For a sequencing, pacing or cycle-shape defect: no.** Timing is not modelled, cycle
shape has drifted, and two learner code paths (INF PLAY, cold-start bootstrap) are absent.

**And the asymmetric risk is a defect the learner hears that the QA page cannot show:**
the learner's cold-start path bootstraps from `GET /api/courses/:code/cycles` before the
full-script handoff, and INF PLAY is served by `infplay-cycles.ts`. Neither is projected
by the dashboard generator at all.

> **Design implication for the sample tool, and it is the sharp one:** Watson's point that
> a sample must play through *the same player the learner gets* is **correct but for a
> narrower reason than assumed**. The audio *bytes* are already identical, so the journey
> page is a sound instrument for catching bad clips. What it cannot catch is anything
> about *when and how* those clips are played. If sample mode is built on the dashboard
> generator, it inherits every divergence in the table above. Building it against the
> learner's own player — or at minimum landing the golden-fixture parity test the
> 2026-06-10 report already specified and nobody built — is what converts this from
> "probably in sync" to "checked".

---

## 4. Publish-ready tool — ADD versus WIRE UP

Mapped against Watson's three layers and Tom's three v1 scope items. The finding Watson
wanted: **layer 1 is mostly plumbing.** Most of the checks exist and work; they are simply
not reachable from one place, and nothing blocks on them.

### Layer 1 — code-based sweep over 100% of the course (Tom's v1 item (a): "one button, pass/fail report")

**WIRE UP (exists, works, just not reachable as one action):**

| Item | Effort | Note |
|---|---|---|
| `tools/audio-batch-gate.cjs` whole-course run | plumbing | Already has a CLI and a callable `gateBatchSafe()`. **Must run with `--deep`** — default is structurally blind above the duration floor (§2D.1). |
| Turn the **wrong-language phonology gate back on** | **two lines of `.env`** | Set `WHISPER=/home/tomcassidy/.local/bin/whisper-cli` and a Linux `WHISPER_MODEL` path. Highest value-per-effort item in this map. |
| `tools/audio-gender-lint.cjs`, `sweep-wrong-language-crosscourse.cjs`, `audit-chunk-audio-coverage.cjs`, `pod-voice-coverage.cjs`, `audit-frame-diversity.cjs` | plumbing | All CLI-only today. Each needs a callable export and a row in the report. |
| `tools/known-side-gate.cjs` | plumbing | Already a thin wrapper over the validated `checkKnownSide`. Zero callers. **Requires a pair contract per course or it silently passes** — count contracts and report coverage honestly. |
| `tools/refresh-round-index.cjs` | plumbing | Add a *staleness check* (LEGO count vs index count per course) as a report row, then offer the refresh. Currently nothing detects the drift measured in §2C/S1. |
| `/api/qa/*` router | already live | 25 working routes for flags, summary, mark-checked. This is the spine for item (b). |

**ADD (does not exist in any form):**

| Item | Why it must be built |
|---|---|
| **A course-wide re-run of the text gates over existing content** | This is the big one. Every check in §2A/T1–T10 is real and trusted — but they only ever run *inside `/api/seed/complete`*, one seed at a time, at submission. There is **no way to run them over a finished course**. The functions in `lib/validation.cjs` are pure and exported, so this is a harness over existing logic, not new checking logic — but the harness genuinely does not exist. |
| **Phrase-floor check against Tom's ≥4 BUILD / ≥5 USE** | The shipped gate enforces the validator ramp (3/5), not Tom's floor. §2E shows 194/493 `eng_for_zho` LEGOs and 1,138/1,641 `fra_for_eng` LEGOs below Tom's floor, plus 117 `fra_for_eng` LEGOs with **zero** phrases. Nothing reports this. |
| **A single pass/fail report object** | Every check today prints ad-hoc text or JSON in its own shape. There is no common result schema. |
| **Any blocking semantics at all** | Nothing in the estate currently refuses anything on quality grounds outside the submit gate. "Publish-ready = false" is a new concept. |

**Rough split for layer 1: about 70% wire-up, 30% add** — and the 30% is dominated by one
item (the course-wide text-gate harness).

### Layer 2 — deep manual sign-off, seeds 1–50 (Tom's v1 item (b))

Measured scope: **137–143 LEGOs** for a typical course (§2E) — Tom's 120–150 estimate is
right. `cym_s_for_eng` at 82 shows the workload is not constant.

**WIRE UP:**
- `course_practice_phrases.qa_checked` (timestamptz) **already exists and is already used** — 75,671 phrases estate-wide carry it.
- `/api/qa/mark-checked`, `/qa/bulk-mark-checked`, `/qa/flag`, `/qa/flags/:course/pending`, `/qa/summary/:course` are **live and answering right now**.
- `docs/tail-click-listening-test.html` is an existing manual-listening artefact and is the right shape to fold in as the audio half of a per-LEGO checklist.

**ADD:**
- A **per-LEGO** sign-off unit. Everything today is per-*phrase*; Tom asked for per-LEGO (text checked + audio checked, as one item). The `qa_checked` column is on the phrase table only — a LEGO-level sign-off record does not exist.
- **Revive the human-approval queue**, or replace it. `routes/golden.cjs` implements `human-approve`, `human-approve-all`, and `review-queue` — the exact primitives — and is **unmounted**, with the frontend already calling it and getting a 404 (§1.3). Mounting it is one line; whether its model fits per-LEGO sign-off needs a look before reviving.

### Layer 3 — stratified sampling from seed 51 (Tom's v1 item (c))

**WIRE UP:**
- `GET /api/qa/sample/:courseCode?limit&seed_min&seed_max` **exists and works** (LIVE-verified, returns 100 phrases).

**ADD — and the existing endpoint is the wrong shape, exactly as the settled decision anticipated:**

| Gap | Detail |
|---|---|
| **It is purely random** | `qa.cjs:786` — `data.sort(() => Math.random() - 0.5)`. The decision is *stratified*: every voice, every seed-decade. Needs rewriting, not extending. (Minor, but note the shuffle idiom itself is biased.) |
| **It samples phrases, not rounds** | Tom asked for "a sample of X ROUNDS". Rounds come from the journey generator, which the QA sample endpoint does not touch. |
| **It is text-only** | No audio, no voice dimension, no `course_audio` join — so it cannot stratify by voice, which is half the stated requirement. |
| **Nothing weights toward found failure modes** | The decision says weight toward what the first-50 pass found. No mechanism exists. |

**A constraint the sample design must respect, from the repair evidence:** `hrv_for_eng`
had **zero** silent clips and 9 real defects, **all role `known`**; `eng_for_ben`'s 149
confirmed defects were **all `known`** too. *"No amount of ear-checking target audio would
have found either."* **Stratification must cover `role` (known / target1 / target2 /
presentation) as a first-class dimension**, or the sample will systematically miss the
defect class the estate has actually been suffering from.

### Summary answer to the question Watson asked

**Most of layer 1 already exists as unwired capability — so the tool is mostly plumbing,
and that does change the design.** The v1 build is better understood as:

1. a **result schema** and a **runner** that calls ~10 existing functions and collects them;
2. **one genuinely new check harness** (course-wide text gates over existing content, reusing the pure functions in `lib/validation.cjs`);
3. a **sign-off record at LEGO granularity** on top of the live `/api/qa/*` spine;
4. a **rewritten sampler** that is stratified, round-based, and role-aware;
5. plus **two config fixes and one router mount** that cost minutes and recover real enforcement (`WHISPER` env; mounting `golden.cjs`; deciding what to do about the never-called checkpoint machinery).

The expensive-looking part — writing quality checks — is largely already paid for.

---

## 5. Explicit gaps

Things I could not check, or checked only partially. Reported as gaps rather than papered over.

1. **The live pages were checked at HTTP level only, not driven in a browser.**
   `https://popty.app/production/eng_for_zho` and `.../script?view=journey` both return
   **HTTP 200**, but `vercel.json` rewrites `/((?!vfs).*)` to `/index.html` — so popty.app
   is a **pure static SPA with no backend**, and both URLs return an identical 669-byte
   shell. **I did not drive a browser, so I did not visually confirm which QA buttons are
   on those pages.** The affordance list in this report is read from component code and
   from LIVE API probes, not from the rendered page. A sub-agent was dispatched to attempt
   the same; see item 9.

2. **I could not exercise any authenticated API route as a real user.** Via the real
   backend (`https://ssi-machine.ngrok.app`, which `src/services/api.js:40-42` hard-codes
   for popty.app), `/api/qa/*` and `/api/golden/*` return **401 Authentication required**.
   I probed the underlying course-builder API directly on `localhost:3491` instead, which
   answers unauthenticated. **So "what the button does when pressed" is traced through
   code plus unauthenticated backend probes — not by pressing it.**

3. **A live/code disagreement I could not fully resolve.** `production-api.cjs:9757`
   registers a `/api/checkpoint` proxy to the course-builder API, but a live GET to
   `/api/checkpoint/status/eng_for_zho` through ngrok returned Express's default 404 rather
   than the proxy's 503. I did not chase why (possible ordering issue with an earlier
   handler, or the ngrok host fronting a different process). **It does not change the
   conclusion** — the downstream route genuinely 404s on `:3491` too, because
   `routes/checkpoint.cjs` is unmounted — but the proxy behaviour itself is unexplained.

4. **The course-builder API's port is not what the proxy expects.**
   `course-builder-api.cjs:64` defaults to `3471`; the running process listens on **3491**
   (`COURSE_BUILDER_PORT` override). `production-api.cjs:9754` defaults its proxy target to
   `http://localhost:3471`. Whether `COURSE_BUILDER_API_URL` is set in the live process's
   environment I could not determine from outside it. **If it is not, every proxied QA
   route is returning 503 in production.** Worth one check by someone who can read that
   process's env.

5. **Trustworthiness history is thin for the text checks.** I have strong, documented
   false-positive history for the ZUT component-row audit (the 2026-07-04 rescope, ~93%
   noise) and for the audio gate (§2D). For T7–T12 I found unit tests but **no record of
   false-positive or false-negative incidents**, so those trust ratings are inference from
   code quality, not evidence. Stated as "medium" rather than dressed up.

6. **The 117 `fra_for_eng` LEGOs with zero phrases are a raw count, not a verified
   work-list.** Per this repo's own rubric, a violation count is not a work count, and my
   first version of that query was wrong (§2E caveat). Someone should pilot ~40 of them
   against the seeds before anyone acts.

7. **Two stale documents found, both worth correcting.** `CLAUDE.md` states
   `course_round_index` is "refreshed on lego mutations by the dashboard pipeline"; the
   refresh tool's own header says there is no trigger or RPC, and the measured drift
   (§2C/S1) proves the tool is right. And the distilled sweep protocol cites
   `tools/course-optimization/audit-phrase-zut.cjs` as the canonical audit entry point —
   **that file does not exist in the tree.** I did not fix either; flagging both.

8. **I did not verify the `.env` `WHISPER_MODEL` situation on any machine other than this
   one.** The finding that `PHONO_GATE_ON = false` is proven *here*, on the box that serves
   `ssi-machine.ngrok.app` (confirmed: local `:3470/health` and the ngrok `/health` return
   the same Production API with matching timestamps). If renders run anywhere else, that
   box needs the same check.

9. **Sub-agent reports — one worker claim corrected, one of mine corrected by a worker.**
   All three read-only workers landed (learner-app engine; journey-page + live-page +
   export-wizard trace; audio QA inventory). Nothing is still in flight.

   **The audio worker corrected me, and it was the report's central claim.** I had written
   that exactly one family enforces. It found the tail-defect gate
   (`audio-processor.cjs:687` → `phase8-audio-v13.cjs:945`) and the voice-engine
   splice/align guards. I verified all three throw sites and confirmed `masterAudio` has no
   catch, so the throw genuinely propagates. §1 and §2B/A7 are corrected accordingly. Its
   independent sweep also found **11 more capabilities than my seed list**, and confirmed
   **11 of 22 audio capabilities have zero callers** — a dead-code fraction close to half,
   covering whole defect classes (gender mismatch, child voices, wrong-language phonology,
   cross-course sweeps) that now depend entirely on someone remembering a CLI.

   The learner-engine worker asserted that `generateLearningScript.ts` is QA-tool-only,
   reachable only via `useFullCourseScript.ts` → `CourseExplorer.vue`, and therefore that
   the live player has no spaced repetition. **I checked before relaying it and it is
   wrong** — `LearningPlayer.vue:55` imports it directly and `runFullScriptHandoff` calls
   it. The worker had traced only one of its two call paths. Its *underlying* observation
   (that the steady-state queue comes from the cycles path, and that no SR construction is
   findable there) survived verification and became the open question in §3.

   **Everything in this document is stated on evidence I verified myself, except §2C-bis
   (the export/publish wizard audit), which is the worker's trace, spot-checked but not
   re-verified line by line, and is labelled as such in place.** The audio worker's
   dead-code counts (11 of 22) are its own exhaustive grep; I verified the enforcement
   claims and a sample of the zero-caller findings, not every one.

10. **Not attempted, deliberately:** no TTS generation (costs money, requires Tom's
    approval), no asset deletion, no code changes, no refactors. The `--deep` audio gate
    was **not** run over any course — it is I/O-heavy and this was a scouting pass.

### One open call flagged rather than blocked on

**MVP (300 seeds) vs Full (668) for the text sweep.** Tom has not made this call. I mapped
both (§2E) and took the default that the **automated floor should always be Full**, because
its marginal cost is near zero and a 300-seed floor cannot support "acceptable risk from
seed 51" on a 668-seed course. The MVP/Full distinction should govern *human* effort — the
deep-pass and sample budgets — not the code sweep. Note that `eng_for_zho`, the course Tom
pointed at, **stops at seed 300**, so for it the question is currently moot.
