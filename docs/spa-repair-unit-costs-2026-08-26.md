# spa_for_eng bare-LEGO BUILD repair — per-unit costs

Read-only research. No audio generated, no DB writes, no course-content changes.
Pricing a hypothetical repair of the 1,180 bare-LEGO BUILD phrases found in
[the edge-map audit](spa-lego-edge-audit-2026-08-26.md) — Tom's likely repair
shape is ~1,000-2,500 new/replacement BUILD phrases, each weaving a new LEGO
into 3-4 previously-taught LEGOs.

---

## A) Phrase generation — pipeline + LLM effort per repaired LEGO

**There is no route that adds phrases to an already-finalized seed cleanly.**
`POST /api/seed/complete` is create-only: it 400s with `"Seed already fully
built"` the moment `course_legos` already has rows for that seed
(`services/course-builder/routes/seed-complete.cjs:1085-1097`). Confirms the
memory record (`seed-complete-cannot-fix-an-existing-seed.md`).

Two real paths exist for adding/replacing phrases on an existing LEGO:

1. **`POST /api/v2/phrases/:courseCode`** (`services/course-builder/routes/v2.cjs:628`).
   Upserts into `course_practice_phrases` with
   `onConflict: 'course_code,seed_number,lego_index,position'` — so it *can*
   overwrite a bare-LEGO row in place by targeting its existing position. But
   `checkBuildUsePhrases` (`services/course-builder/lib/phrase-structure.cjs:134-165`)
   validates the **whole submitted basket**, not just the new row: for
   seed > 5 it demands `minBuild=3, minUse=5` in the same call. You cannot
   submit one replacement phrase alone — you must resubmit a compliant full
   BUILD+USE set for that LEGO every time.

2. **Direct-DB in-place regeneration script** — the proven precedent for
   *this exact defect shape* (a single low-value BUILD row that needs
   swapping without touching the LEGO breakdown or the rest of its phrases):
   `tools/course-optimization/regenerate-stamped-builds.cjs`, used estate-wide
   on 2026-07-24 for the template-stamp defect (LEGO + tacked-on tag — same
   family as "LEGO repeated with nothing added"). It replaces only the
   offending row(s) at the *same id/position* (floors and round structure
   untouched), re-runs the SAME validation gates in-process (containment,
   whole-chunk vocab tiling, anti-template, phrase-ZUT), and ends by
   **queueing** an audio-pass request — it never generates audio itself.
   (`edit-cascade.cjs`, the third candidate, is the wrong tool: it re-decomposes
   the whole seed's LEGO breakdown and deletes/regenerates all its audio —
   overkill for a same-LEGO phrase swap.)

### LLM effort per repaired LEGO (measured, not guessed)

The regeneration prompt is `services/course-builder/lib/build-escalation.cjs:29-49`:

- **Input**: the new LEGO, its USE phrases, up to 8 rejected-attempt lines,
  and the **cumulative introduced LEGO vocabulary, capped to the most recent
  400 pairs** (`priorPairs.length > 400 ? priorPairs.slice(-400) : priorPairs`).
  Late-course legos (where 95.9% of the bare-LEGO defect lives) always hit
  this 400-pair cap.
- **Measured on live spa_for_eng data** (47 sampled legos, seeds 250-280,
  via `GET /api/legos/spa_for_eng?seed=N`): average 38 chars per
  `known → target` line → 400 lines ≈ **15,250 chars ≈ ~3,800 tokens**, plus
  USE-phrase lines and prompt boilerplate ≈ 300-500 tokens →
  **~4,000-4,500 input tokens per generation call.**
- **Output**: a JSON array of 1-4 short phrases, ≈ 30-150 tokens.
- **Calls per LEGO**: the retry ladder is 3×Sonnet then 2×Opus
  (`tools/course-optimization/regenerate-stamped-builds.cjs:218-222`).
  Empirically, on the *same defect family*, the 2026-07-24 sweep
  (`docs/course-optimization/build-template-stamp-regen-sweep-2026-07-24.md`)
  resolved **1658/1697 rows (97.7%)**, with only **30 legos** ever needing
  Opus escalation, and **39 rows (2.3%)** failing after all 5 attempts —
  left untouched and logged for manual/human authoring rather than force-written.
- **Dollar cost: $0 marginal.** All these calls go through `claude --print`
  on the Max Plan flat-rate subscription
  (`services/shared/claude-cli.cjs:1-6`: *"NEVER use @anthropic-ai/sdk
  directly — it bills per-token via the API... covered by the Max Plan
  subscription ($200/month, unlimited usage)"*). There is no per-token
  metered spend to multiply.
- **Wall-clock**: ≈8s/call with extended thinking disabled
  (`MAX_THINKING_TOKENS=0`, measured 2026-06-08 in the same file: 122s → 8s
  for an equivalent deterministic call). The sweep script runs
  `CONCURRENCY=3` workers by default.

### Scaling to 1,180-2,500 repaired LEGOs

- ~1,200-2,600 CLI calls total (mode: 1 call/LEGO; ~2.3% need up to 5).
- **~$0 direct LLM spend** (flat-rate subscription, not metered).
- Wall-clock at the script's default concurrency (3): ~2,500 calls × 8s / 3
  ≈ **~110 minutes** serial-equivalent; scales down with more concurrency.

---

## B) Audio — clips per phrase, provider, and the one documented rate

Per **new** BUILD phrase = **3 audio clips**: source (known/English),
target1, target2. This is a documented formula already in the codebase —
`services/course-builder/routes/edit-cascade.cjs:96-107`
(`estimateAudio`: *"≈ 3 clips/phrase (known/target1/target2) + 1
presentation/LEGO"*). No presentation clip is needed here since no *new*
LEGO is being introduced — only extra BUILD phrases on existing LEGOs.

### spa_for_eng's current voice mode and provider

- `GET /api/estate-map` (port 3470): `voice_mode: "mixed"`, 79,794 clips
  total, 79,719 TTS / 75 human.
- `GET /api/courses/spa_for_eng/voice-config` (port 3470) — the config that
  governs **new** generation:
  - `known` / `presentation`: **xAI**, voice `eve` (en-GB)
  - `target1`: **Azure**, `es-ES-ElviraNeural` (speed 0.9)
  - `target2`: **Azure**, `es-ES-AlvaroNeural` (speed 0.85)
  - ⚠️ Memory caveat (`voice-config-is-not-the-incumbent-voice.md`): config
    can diverge from what actually renders — verify with a live test render
    before committing budget. There is also an **active TTS bake-off running
    today** (`docs/tts-bakeoff/PHASE1-REPORT-2026-08-26.md`) that may change
    the provider mix before any repair runs.

### The one documented rate — and the one confirmed gap

- **Azure Standard neural TTS: $4 per 1,000,000 characters**
  (`services/audio-generation-planner.cjs:24`, `PRICING.azure.tiers.s0`).
  This covers `target1` + `target2` (both Azure in the current config).
- **xAI has no documented per-character rate anywhere in this repo.** This
  is a confirmed, previously-flagged gap, not something I'm inferring:
  `docs/deu-audio-repair-plan-2026-08-04.md:283` and
  `docs/english-pod-audio-duplication-audit-2026-08-14.md:65,198` both state
  this explicitly for other courses. It applies identically to spa's
  `known`/`presentation` role (xAI `eve`). **I am not inventing a price for
  this — clip count only, cost unknown.**

### Measured phrase length (live query, not assumed)

- Bare-LEGO BUILD rows themselves (the *defects*) average only ~17 chars —
  they're a single LEGO ("driven" → "conducido"). Sampled directly:
  `S0600L01B01`, `S0668L01B01`.
- A **real** repair phrase (LEGO + 3-4 prior LEGOs) will read closer to a USE
  phrase in length. Late-course USE phrases (seed 401-668, n=500, live
  query) average **33 known chars / 33 target chars**.

### Cost estimate

- Azure-billed clips only (target1 + target2), at ~33 target chars/phrase:
  33 × 2 clips × $4 / 1,000,000 ≈ **$0.000264/phrase**.
  At 1,180-2,500 phrases: **≈ $0.31 – $0.66 total.** Trivial.
- xAI-billed clip (known/source), 1 per phrase: **1,180-2,500 clips, cost
  unknown — GAP, no rate exists to price it against.**
- **Total new clips: 3 × (1,180 to 2,500) = 3,540 to 7,500 clips.**
- Reuse via `audio_autolink`: expected near-zero. These are freshly-authored
  multi-LEGO Spanish sentences — autolink only fires on an exact
  text+voice match, and novel combinations essentially never collide with
  an existing clip (memory: `audio-autolink-only-fills-nulls.md`).

---

## C) Review/QA — what a pass on new spa BUILD phrases actually is

- **`phrase-monitor` explicitly does not cover BUILD phrases.**
  (`.claude/commands/phrase-monitor.md:9-14`): its own table marks
  `component` and `practice` as **SKIP**, and only lists `use` as
  "CHECK AND FLAG" — BUILD isn't even a row in the table. Repaired BUILD
  phrases need `checkpoint-qa` or a bespoke read, not phrase-monitor as-is.
- **`checkpoint-qa`** samples exactly **50 phrases per checkpoint — 20 BUILD
  + 30 USE** (`.claude/commands/checkpoint-qa.md:76,153,262-269`), run at
  seeds 10/50/150 per `ralph-methodology.md` ("QA Checkpoints"). Gate: QA
  average ≥7.0, USE avg > BUILD avg, no vocab violations.
- **The closest real prior read of THIS course's BUILD phrases is the source
  audit itself**: 220 phrases read in both languages
  (`docs/spa-lego-edge-audit-2026-08-26.md:186`) — 40-phrase pilot + 60 each
  of early/middle/late, half BUILD half USE, using the rubric's evidence
  standard (every reader got the seed's master sentence + every sibling
  phrase of the LEGO — never a bare fragment). Result: 219/220 (99.5%)
  tier-1-pass English, 216/220 (98.2%) natural Spanish; 20/220 (9.1%) carried
  a defect, triaged 4 mechanical / 6 clean-rewrite / 3 cut / 7
  judgment-fork. A further 25+25=50 phrases were read for the structural
  (missing-target / low-edge) classes in the same pass.
- **spa_for_eng has no documented native reviewer.** Tom's own status doc
  states he can "follow but not advise on" spa_for_eng
  (`docs/paid-english-courses-status-2026-08-06.md:137`) — he does not
  personally adjudicate Spanish quality. Every quality read found in this
  repo for spa, including the source audit this repair is based on, is
  agent-based against the rubric, not a native-speaker sign-off.

### Effort scaling

- At the audit's demonstrated rate (~220 phrases/pass, full seed+sibling
  evidence standard), reviewing all 1,180-2,500 repaired phrases at 100%
  coverage ≈ **5.4 – 11.4 passes** of that size.
- A `checkpoint-qa`-style 50-phrase spot-sample is far cheaper per pass but
  is a *sampling* check, not full coverage. Given cut-it-out/floor doctrine
  treats these rows as **known, confirmed defects being repaired** (not an
  unknown-quality baseline being spot-checked), 100%-coverage review of the
  actual replacements is the defensible default, not a sample.

---

## Summary table

| | low estimate (1,180 phrases) | high estimate (2,500 phrases) |
|---|---|---|
| LLM generation calls | ~1,200 | ~2,600 |
| LLM generation $ cost | $0 (Max Plan flat-rate) | $0 (Max Plan flat-rate) |
| Generation wall-clock (concurrency 3, ~8s/call) | ~53 min | ~111 min |
| New audio clips | 3,540 | 7,500 |
| Audio $ cost — Azure clips (target1+target2, documented rate) | ~$0.31 | ~$0.66 |
| Audio $ cost — xAI clip (known/source) | **GAP — no rate** | **GAP — no rate** |
| Review passes (220-phrase full-coverage standard) | ~5.4 | ~11.4 |

## Gaps, stated plainly

1. **No xAI per-character rate exists anywhere in this repo** — confirmed
   across three independent prior cost docs, not just this one. Clip count
   for the known/source role is solid; its dollar cost is not priced.
2. **Voice config may not equal incumbent/actual render voice**, and a TTS
   bake-off is running today that could change spa's provider before any
   repair executes — the Azure rate and the xAI gap both assume the current
   `voice-config` holds.
3. **No native Spanish reviewer is on record for this course** — all QA
   figures here are agent-read-against-rubric throughput, not
   native-speaker-verified throughput.
