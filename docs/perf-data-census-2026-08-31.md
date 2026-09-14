# Performance data — a truthful map, 2026-08-31

Read-only census across both repos (Popty / ssi-dashboard-v7-clean, and ssi-learning-app), plus live queries against the shared Supabase DB. No changes made. Written as input to a design discussion — not a recommendation.

---

## 1. The schools / org dashboard — what it actually shows

Popty (this repo) has **no learner-performance surfaces at all** — `CourseProgress.vue` / `ProgressMonitor.vue` track content-build progress (seeds/legos being authored), not learners. All learner/school performance UI lives in `ssi-learning-app`.

### Real, live panels (teacher / school-admin / group-leader facing)

These read real data on every request — no cache, no batch job, no fake numbers:

| Panel / endpoint | What it shows | How it's computed |
|---|---|---|
| `api/school/daily-activity.ts` | Per-day practice minutes, active students, cycles, over the caller's visible students | Live read of `learner_speaking_opportunities`, scoped server-side per caller |
| `api/school/class-practice-7d.ts` | "Hours/wk" per class, last 7 days | Live sum of `learner_speaking_opportunities.play_seconds` |
| `api/school/roster.ts` | School/class rosters, teacher & student lists | Live, server-mediated (see bug history below) |
| `api/school/group-summary.ts` | Group/school rollups for a group-leader: teacher/student counts, practice hours | Live, server-mediated (see bug history below) |
| `api/school/rate-compare.ts` | "Rate compare" — LEGOs/week for a class, school, or group vs. peer/global averages, same-course-first | Live RPC aggregation (`aggregateWindowPace`/`aggregateWeeklyTrend`), full class→school→group→region ladder |
| VAD "Voice & pause" panel (`VadPanel.vue`, mounted at `/org/:id/insights` for real teachers/school-admins/group-leaders) | Mic-derived pause mastery, response latency, prosody — see §3 | Live: `learner_lego_metrics` read straight from the browser; prosody aggregated fresh server-side from `player_events` on every call (`api/org/vad.ts`) |

**A real, three-times-repeated bug class worth knowing about**: `group-summary.ts`'s and `roster.ts`'s own doc-comments record that these dashboards showed **hard zeros** for teacher/student counts and practice hours — not "low", literally zero — for every school/group-admin whose account was created via a newer invite path, because the underlying `user_tags` RLS policy silently returned nothing for their session. Fixed by moving the aggregation server-side under the service role. The fix is landed and both endpoints are now genuinely live, but it's evidence that "the org dashboard shows a number" has, three separate times, meant "the org dashboard shows a wrong number with no error" rather than a real gap or an honest zero.

### SSi-staff-only panels (`/admin/stats`, ssi_admin gated by the router)

| Panel | Classification | Evidence |
|---|---|---|
| **CourseScoreboard** ("Course Scoreboard" tab) | LIVE by default | Calls Postgres RPCs `analytics_course_value`, `analytics_daily_active`/`analytics_retention_cohorts`, `analytics_growth` directly |
| **LifecycleBoard** ("Lifecycle" tab — funnel, at-risk, convert-ready) | **100% synthetic, always** | The component's own comment: "Seeded synthetic data renders BY DEFAULT (no `?demo`): a preview of exactly what this surfaces once real learners + Paddle rows arrive." Every data call imports unconditionally from `data/demoLifecycle.ts` — there is no live branch at all yet |
| **RatesBoard** ("Rate compare" tab, the generic admin explorer — distinct from `api/school/rate-compare.ts` above, which IS real and IS what teachers see) | **100% synthetic, always** | `getRateComparison`'s only implementation in the whole repo lives in `demoRates.ts`; the real RPC is an explicit TODO |
| `api/admin/board-metrics.ts` (investor/board-report numbers) | LIVE | 3 metrics total: real learners active (30d), real practice minutes (30d), schools on platform — small registry, all live-computed against the DB |
| `api/admin/attention.ts` ("subscribers needing attention") | LIVE | Computed server-side from subscription state + practice activity, thresholds hardcoded (7 days inactive, 30 min low-use) but the underlying activity numbers are real |
| VAD "Voice & pause" — admin door (`VadBoard.vue`) | LIVE, whole-forest | Same live sources as the org door, unrestricted scope |

**So the honest summary for Q1**: the numbers a teacher, school-admin, or group-leader actually sees today are real and live (with a documented history of RLS bugs silently zeroing them, now fixed). The SSi-staff investor-facing "Lifecycle" and generic "Rate compare explorer" boards are **entirely fake, permanently, by design, waiting on more real learners/Paddle data** — not a temporary demo toggle, they have no live code path at all yet.

---

## 2. What signals exist at source

Traced through `packages/player-vue/src/composables/useLearningSession.ts` and the event logger (`usePlayerLog.ts`), then verified against the live DB.

**What a session actually records:**
- Items practiced, actual audio-playing time (not wall-clock — a documented past bug logged "128 hours, 0 items practiced" from counting idle time), per-LEGO reps and last-practiced timestamps, highest seed reached, speaking-opportunity counts flushed at natural boundaries (not per-cycle, to avoid write noise).
- **~25 distinct behavioural event types** land in `player_events`, including taps to pause/play/skip, phase-skips (read by the code as a confidence signal: forward = "I've got it", back = "let me re-hear"), mode toggles (easy/fast, read as "too fast"/"I'm comfortable"), round completions, cold-start timing, listening-mode engagement.
- **Two write paths (`response_metrics`, `spike_events`) are wired in code but dead**: `endSession` always passes them empty arrays. Confirmed live: **0 rows in both tables.**
- **No learner ever rates or self-assesses anything.** Grepped explicitly — no thumbs, no stars, no "how did that feel". Every "confidence" number shown anywhere (e.g. `PortraitPanel.vue`) is a computed proxy inferred from tap/skip/toggle behaviour, never an asked question. The only "feedback" features in the app are a bug-report button and a "flag this phrase" content-quality report — unrelated to performance.

**Live DB history depth (queried just now):**

| Table | Rows | Date range | Distinct learners |
|---|---|---|---|
| `player_events` | 762,248 | 2026-04-20 → 2026-08-31 | 245 |
| `sessions` (legacy) | 17,909 | 2026-03-18 → 2026-08-31 | 884 |
| `learner_speaking_opportunities` (current) | 5,583 | 2026-05-14 → 2026-08-31 | 506 |
| `learner_lego_metrics` | 3,255 | 2026-08-03 → 2026-08-23 | 271 |
| `course_enrollments` | 1,609 | 2026-03-18 → 2026-08-31 | 925 |
| `lego_progress` | 149,174 | 2026-07-17 → **2026-08-19** | 638 |
| `seed_progress` | 42,660 | 2026-07-17 → **2026-08-19** | 638 |
| `response_metrics` / `spike_events` | 0 / 0 | — | — |

**Flagged, not chased further**: `lego_progress`/`seed_progress` both stop at 2026-08-19 while every other table runs to 2026-08-31 today — either a genuine ~12-day gap in progress-writing, or an artifact of which timestamp column was queried. Worth a follow-up look before anyone builds on those two tables.

**Two tables that looked live-candidate but turned out to be Postgres VIEWS, not stored data** (`learner_stats`, `learner_consistency`) — they compute on read from `sessions`, so they're always fresh but carry no history of their own. **Confirmed genuinely dead** (0 rows, no writer anywhere): `learner_practice_history`, `learner_points`, `learner_milestones`, `dashboard_sessions`.

---

## 3. VAD — is Tom's belief right?

**Verdict: the code and the DB both say VAD-for-learners is real and shipped — but real-world uptake is close enough to zero that "no data yet" is the right practical read.**

What actually exists:
- A genuine on-device voice-activity detector for learners (distinct from the recording-studio VAD used for professional voice-artist takes in Popty, which is a different, older, unrelated system — `src/composables/useVAD.ts` in this repo).
- It captures a real energy-contour envelope per speaking cycle (peak/average dB, response latency, speech start/end, whether the learner started talking before the prompt finished) — sample payload confirmed live in the DB, e.g. a 599-sample energy contour over ~12 seconds.
- It feeds two live DB surfaces (`learner_lego_metrics` for mastery/latency, `player_events` `cycle_prosody` rows for the detailed envelope) and two live, wired dashboard doors (`api/admin/vad-prosody.ts` for SSi staff, `api/org/vad.ts` for teachers/school-admins/group-leaders), unified under one renderer (`VadPanel.vue`).
- A founder ruling on 2026-08-20 explicitly moved VAD from admin-only to the ordinary visibility hierarchy (**students < teachers < school leaders < group leaders**) — this was a deliberate, recent decision to make VAD data visible more broadly, which only makes sense if the intent is to build on it.
- It is **opt-in and off by default** — settings label "Personalised pacing": *"Uses your microphone to detect when you speak, adapting pause lengths to your rhythm. No audio is recorded or stored."* Only derived numbers ever leave the device; raw audio never does.
- There was a real, dated bug (comment timestamped 2026-08-02, describing a live repro) where even learners who HAD consented got **zero** VAD activity across a full session, because a boot-path regression meant `getUserMedia` was never called on the fast (instant-playback) load path. This was fixed, but means some unknown portion of the historical "opted in" population silently produced nothing for a period.

What the numbers say:
- **1,142 total learners** in the platform.
- **4 learners, ever**, have produced a `cycle_prosody` (full envelope) event — 0.35%.
- **271 learners** (24%) have at least one `learner_lego_metrics` row (the lighter latency/mastery signal) — but only 3,255 rows total, spanning just three weeks (Aug 3–23).
- The 4 prosody-producing learners are ordinary accounts (not flagged demo/internal), so this isn't test noise — it's real but vanishingly rare opt-in + working mic + the boot-path bug window.

So: there is no fabricated data and no fake panel here — everything is genuinely wired end to end. But if the question is "do we have a usable dataset of learner speech behaviour to make decisions from", the honest answer is no — 4 learners' worth of full prosody data, and a mic-permission opt-in rate low enough that this is still an experiment, not a signal.

---

## 4. The gap

**Recorded but never surfaced anywhere:**
- The full per-cycle prosody envelope (energy contour, speech timing) — only aggregates ever leave the server by design ("aggregates only... nothing per-event and no envelope contour ever leaves here"). No panel shows a teacher or admin the shape of an individual attempt.
- Tens of thousands of `phase_skip`, `tap_pause`, `tap_play`, `learning_mode_toggle` events — the app's own code treats these as behavioural confidence signals, but no dashboard panel found in this census surfaces them. The SSi-staff board that would plausibly want this (RatesBoard/LifecycleBoard) shows synthetic data instead.
- A long tail of ~10+ other `player_events` types (`bundle_boot_path`, `turbo_toggle`, `l1_cluster_start`, various `admin_*` events) that exist in the live data but weren't traced to any consuming panel in this pass — flagged as unexamined, not confirmed unused.

**Surfaced but not really measured:**
- **LifecycleBoard and the admin RatesBoard explorer are permanently synthetic** — not degraded, not stale, never real, by explicit design, waiting on more learners/Paddle data before a live path is even built.
- **"Confidence" percentages** shown to learners/teachers (`PortraitPanel.vue`) are computed proxies from tap behaviour, presented as a number but never checked against anything the learner actually said they felt.
- **Org-level rollups have a three-times-repeated history of silently showing zero** instead of the real number, due to an RLS policy gap — fixed now, but worth knowing the failure mode existed and looked exactly like "no activity" rather than "broken read".

---

## 5. Levels — who sees what today

| Audience | What they actually see |
|---|---|
| **Learner** | Their own belt/contribution progress, a computed "confidence" estimate, their own VAD data (if opted in) — never asked to rate anything |
| **Teacher** | Their own classes only (a 2026-07-30 founder ruling explicitly restricts a teacher to classes they teach, never their whole school) — roster, 7-day practice hours per class, daily activity, rate-compare vs. school/group/global, VAD panel for their own students |
| **School admin** | Their whole school — same panel set as teacher, scoped to the whole school instead of one class, plus staff/teacher management |
| **Group / govt leader** | Their whole group subtree (schools beneath them) — rollups, rate-compare vs. sibling groups/region/global |
| **SSi staff (ssi_admin)** | Everything above, whole-platform, unrestricted — plus staff-only boards: CourseScoreboard (live), Lifecycle and Rates-explorer (both permanently synthetic), subscriber-attention list (live), and a tiny 3-metric live "board report" registry for investor reporting |

This hierarchy (`students < teachers < school leaders < group leaders`, ssi_admin above all) is enforced by one shared authorization module (`api/_utils/vadVisibility.ts` composing `schoolScope.ts` + `groupTreeAuth.ts`) for VAD, and by `resolveVisibleScope` for the rest of the schools API — it's a real, tested, single mechanism, not per-panel guesswork.

---

## Gaps in this census, stated plainly

- The ~10 unexamined `player_events` types (admin/internal-origin events) were not traced to a consuming panel.
- The `lego_progress`/`seed_progress` 12-day timestamp gap (stops 2026-08-19 vs. everything else running to today) was not investigated further.
- Worker #446's report was cut off mid-sentence on Panel 6 (CourseScoreboard) by its own output limit; the surrounding evidence was complete enough to classify that panel confidently, but any further boards on `/admin/stats` beyond the 6 covered here were not independently verified by a second reader.
