# course-monitor

Reconciles every course's status across the four places it lives, and flags where they disagree —
so "what needs doing, what goes to legacy, and is it up to date" is answerable at a glance instead
of from memory.

## Sources
| Source | Access | Gives |
|---|---|---|
| New-app intent | Supabase `courses` | status, new_app/legacy_app_status, seed_count, export_ready, version |
| Legacy reality | `ssh ssi@apidev … compare-courses.rb` | repo/stage/prod version + published? + in-sync? |
| Encouragements truth | Supabase `shared_audio` (by S3 sample-UUID) | current 48 instruction + 50 pooled + 101 paywall |
| Human tracking | Basecamp "Creu Cyrsiau" card table | pipeline column per course |

## Scripts
- `gather.cjs` — four-way reconciliation → markdown table + anomalies (board-vs-legacy-reality drift).
- `check-encouragements.cjs` — per course, is the deployed encouragement set current? Strict: full match only. (`shared_audio` is truth; the `public/vfs/canonical/*_encouragements.json` file is STALE — don't use it.)
- `seed-tracker.cjs` — (re)generate the observable fields of `docs/course-tracker.yml`. Does NOT overwrite decision fields blindly — diff before running over a populated tracker.
- `basecamp-aliases.json` — Creu Cyrsiau card-title → course_code map (hand-maintained; `gather` reports UNMAPPED cards).
- `run-daily.sh` — the scheduled entry point (below).

## `docs/course-tracker.yml`
Our authoritative, dated record: goal + build/legacy state + content checkpoints per course.
Git history is the decision log. Checkpoint state = `not_done | current | outdated`.

## run-daily.sh — the routine
1. Brings the VPN up (OpenVPN Connect, connect-on-launch) so legacy is reachable; skips legacy gracefully if it can't.
2. **Stage 1 (deterministic, no LLM):** runs the gatherers → a timestamped snapshot. Never blocked by usage limits.
3. **Stage 2 (LLM interpret + post to Basecamp):** wrapped in a **usage-aware retry** — waits and retries a couple of times so a spent *session* recovers; if still limited (weekly quota spent) it **gives up gracefully and drops a `DEFERRED.flag`** rather than looping. Stage-1 output is always fresh regardless.
   - `post-findings.cjs` (the reason-about-anomalies + post-to-status-card agent) is TODO — wired when the comment behaviour is finalised. The retry harness around it is real.

## Requirements
- `basecamp` CLI authenticated (`basecamp auth login`) + a default account set.
- Passwordless `ssh ssi@apidev` (needs VPN; `compare-courses.rb` needs rvm ruby → invoked via `bash -lc`).
- Repo-root `.env` with `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`.
- Node deps: `@supabase/supabase-js`, `dotenv`, `uuid` (all already in the repo). `jq` on apidev.

Methods/gotchas recorded in agent memory: `encouragements-currency-check`, `kai-stage-reset-2026-07-28`.
