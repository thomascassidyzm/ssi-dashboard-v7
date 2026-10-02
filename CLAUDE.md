# CLAUDE.md — SSi Dashboard (Popty) agent guide

> **The code and the git history are the source of truth.** This file holds only what they *can't* tell you: the methodology rails, the approval gates, branch hygiene, the cross-repo map, and where to look. If anything here reads like an architectural fact ("service X does Y", "the app uses Z"), distrust it and verify against the code — facts rot, and a stale fact is worse than none. Prefer adding a *pointer* here ("to learn how content is served, read `<file>`") over restating how something works.

---

## 🚨 CODE IS THE ONLY TRUTH — DO NOT READ DOCS

**The live code and the live database are the only sources of truth in this repo. Markdown here is historical and must NEVER be cited as fact.** If you need to know what the system does, read the code or query the live database. If a document contradicts the code, **the code is right and the document is noise** — do not "reconcile" them, do not update the document, just use the code. If the code cannot answer the question, **ask Tom one plain question** rather than trusting a document.

Tom's standing ruling, 2026-09-03: *"we need to not maintain docs, and expressly make sure the agents do NOT read docs — agents must read live code… docs are out of date the second they are crystallised… Code is the only truth. Code can be wrong for sure, but the intent should be captured in the code itself and then the code itself is the documentation."*

The specimen: `pod1-two-voice-cast-2026-08-24.md` asserted a Narrator rule in the pod-1 recast tool and 59/59 green cast-gate tests. Neither the rule nor the tests were ever written — `buildExchangeWeights` has no Narrator handling and `non-conversant` appears nowhere in the repo. Three workers reasoned from it in one night before one thought to grep.

### Where to put what you learn — in the CODE, never in a new markdown file

When you learn something worth preserving about how or why something works, **capture the intent in the code**:

1. **A test that asserts the rule** — best of all. A test cannot rot silently; when the behaviour changes, the test fails and says so. That is the whole point.
2. **A named function or variable** that says what the rule is.
3. **A comment at the decision point** — in the file where the decision is made, not in a document about it.

**Do not create a new `.md` file to explain how the system works.** Reports to Tom are published (`/api/publish-doc`), not committed as repo documentation.

### The retired trees

Two sweeps — 2026-08-24 and 2026-09-03 — moved this repo's descriptive prose to `archive/`. Nothing was deleted and all history is intact (`git log --follow`), but **nothing in `archive/` carries any standing**; if you find yourself reading it to answer a question, you are already off the rails. Read `archive/README.md` before you do.

Prose that stayed at its original path stayed because **running code or a test reads it** — treat those as code, not as docs: `docs/pair-contracts/*.contract.cjs` (required by the course-builder validator on every seed submission), the curated `docs/pods/*.md` the dashboard SPA globs and serves plus the pod scripts `tools/pods/parse-pod-markdown.cjs` parses, `docs/sector-pods/source/*.md` (frame-layer corpora), generated outputs (`docs/explainer-*.md`), and `SYSTEM.md` / `ralph-methodology.md` / `synonym-choice-architecture.md` at the repo root, which live services `readFileSync`. `docs/README.md` lists the rest.

---

## 🚦 Start here (every session)

1. **Sync to GitHub first.** `git fetch origin main`; fast-forward if behind. Don't build on a stale checkout.
2. **Read [`WORKLIST.md`](./WORKLIST.md)** — the shared multi-agent worklist.
3. **Claim before starting** anything substantial: flip `[ ]`→`[~] @you MM-DD` and commit *only that one line* so parallel agents don't double-grab. Protocol is in the WORKLIST header.

---

## ⚠️ Hard rules (not enforced by code — read before acting)

### Methodology rails (course content)
You are applying the SaySomethingin method — the thing every phrase a learner hears depends on. The rails:
- **ZUT**: one known prompt → exactly one target form. Same known → different target = reject.
- **The known side is a controlled language too** — never use known-language words/structures the learner hasn't been given yet.
- **Vocabulary is known / target / seed** — never "source".
- **Work slowly, quality over throughput.** Course content is craftsmanship; don't batch/optimise it into mediocrity.
- **The canon: `course-methodology-canon.md` at the repo root — read it before you fix anything.** Every decision about course content in this estate is judged against it: what a valid seed, LEGO and practice phrase is, which rules are HARD and which are judgement, what a fix obliges you to fix as well, and what is Kai's call rather than yours. It carries Kai's and Tom's rulings as they are made, so it is the live rulebook, not a summary of one.
- Doctrine + worked examples: `ralph-methodology.md` (decomposition, phrases, tiers) and `synonym-choice-architecture.md` (translation-choice, applied BEFORE decomposition). Read these before authoring/regenerating content.

### Approval gates (cost / irreversibility)
- **Never generate TTS audio** (costs money) without showing a plan and getting explicit approval.
- **Content passes end by QUEUEING an audio-pass request** (`node tools/course-optimization/queue-audio-pass.cjs <course> --reason "<pass>"`, or `queueAudioPass` from `services/shared/audio-pass-queue.cjs`) — never by running TTS. Keeps text edits from silently accumulating as a missing-audio backlog; phase8 `/generate` fulfils the request when an approved pass completes.
- **Never delete generated assets** (audio/video/MARs) without a deletion plan + approval.
- **Make-before-break: any voice swap or clip replacement generates and verifies the new asset before the old one is touched, always.** (1) generate new audio, (2) verify each new clip is alive and correct-voiced, (3) swap links atomically, (4) only then delete the old clip. Deletion never precedes a verified replacement — not even "we'll regenerate right after." The 2026-08-03 fra_for_eng Azure-voice purge deleted 31,310 rows *before* re-rendering and left ~2,000 course slots silent for two days. The two tools that already implement this correctly are the reference: read them, not a document.
- **Any change to pod content must migrate learner progress under the standing content-change migration protocol — never edit a live pod in place.** Progress is filed under a sentence's slot, not its text, so an in-place edit silently credits a learner with a sentence they never heard, with no error or alarm. Adopted as standing doctrine 2026-08-16 (plate A-111): `docs/pods/pod-migration-protocol.md`.
- **Pod audio is never rendered from unread drafted target text.** A drafted line renders only once a human edit clears the draft flag, or an *independent* verifier agent approves it; blocked lines are counted, never silently skipped. Policy, gate and verifier pass: `docs/pods/text-approval-policy-2026-08-16.md` (Tom's A-109 ruling, 2026-08-16).
- **Every write to course content carries an editor identity, or it is refused.** The surfaces that write `course_seeds`/`course_legos`/`course_practice_phrases` are listed in `services/shared/content-write-surfaces.cjs`, and a gate resolves who is calling before the handler runs — a verified Supabase session, or, from a same-host caller, a declared `x-agent-id`/`x-agent-role`/`x-service-name`. A 401 `EDITOR_IDENTITY_REQUIRED` means you did not say who you are, not that the endpoint is broken. Adding a route that writes content? The drift test fails until it is in that manifest. Writing a `tools/` sweep that edits over SQL? It bypasses the HTTP gate by construction — name itself with `serviceIdentity('<sweep>')` and `recordContentEdit()`. **Never backfill or infer attribution for a pre-existing row**: a NULL `last_edit_event_id` means "no attribution was captured", never a claim about who edited it (Tom's ruling, 2026-09-01).
- **Audio has ONE route (Tom, 2026-09-29): `POST /api/audio/render` on production Popty, and nothing else.** Any agent, worker or colleague's Watson (Kai, Aran, Dom, Mandy) that wants a clip made calls `curl -s -X POST http://localhost:3470/api/audio/render -H 'Content-Type: application/json' -H 'x-agent-id: <who you are>' -d '{"courseCode":"…","role":"target1","text":"<exact words>","purpose":"<why>","dryRun":true}'` (or `node tools/audio/render.cjs --course C --role R --text T --purpose P`). It runs library-first, the spend guard, ONE render with no retries, then writes back to the course row and clip index. Never import `services/tts-service.cjs` or write a render script: the guard refuses any provider call outside the chain (`NOT_IN_CHAIN`), and `tools/check-tts-door.cjs` fails the run on a file that tries. A refusal is the answer; never retry or route around it. The code that says why: `services/shared/audio-render-entry.cjs`, `services/shared/chain-context.cjs`.
- **Never use the Anthropic SDK directly.** All LLM calls go through the Claude CLI (`claude --print`), never `@anthropic-ai/sdk`. The `ANTHROPIC_API_KEY` in `.env` is for the dashboard's env-switcher, not service code. (A past SDK module silently billed ~$38/day.) Pattern: `gender-prep-coordinator.cjs`; unset `CLAUDECODE` when spawning nested CLI calls.
- **Otherwise act autonomously** when docs are clear, the action is reversible, and there's no cost surprise.

### Standing preferences (guidance, NOT enforced in code)

- **Voice config per course is the course builder's case-by-case call — Kai's, or whoever is building it.** Not a central policy, not an estate sweep. Tom's ruling, 2026-08-28, closing the TTS coverage-gap thread: *"We will in general allow Kai or whoever, to choose the voice configs for each course on a case by case basis. We don't need to redo anything necessarily."*
- **Prefer Cartesia over Azure where a Cartesia voice exists for the language.** Tom, same ruling: *"I think Azure voices should generally NOT be used for any courses that have Cartesia voices. But we can leave that flexible."* That second sentence is load-bearing. This is a **preference, not a rule**: nothing in the code enforces it, and nothing should — no validator, no lint, no config gate, no CI check, no warning. A preference that gets enforced stops being a preference. Read it, weigh it, and use your judgement per course. The provider ladder as built is in the render code.
- Nothing already rendered is being redone because of this. The coverage-gap thread is closed.

### Branch hygiene
- **Popty workers land on `deploy/staging`, never on `main`** (Tom's ruling, 2026-10-02, superseding the 2026-08-05 "everything goes to main" rule — Popty has community users now). Finishing a piece of work means merging your branch into `origin/deploy/staging` and pushing (`git fetch origin deploy/staging`, merge it into your branch, run your one test, `git push origin HEAD:deploy/staging` — fast-forward only, never force). That is browsable at **https://staging.popty.app** (Vercel serves the branch; its backend is the staging API on watson-1, `/staging` on the funnel). Merging your own branch there is part of the job; don't park work on a branch and call it a gap.
- **`main` is advanced only by the daily promotion — or by Tom.** `tools/promote-staging.cjs` (timer `ops/systemd/popty-staging-promote.timer`, 07:00 UTC) fast-forwards `main` to `deploy/staging` only when the nightly booth-artists-day check was green for that exact staging SHA (`e2e/booth-artists-day/run.sh` records it) **and** no commit in between touches the community builder journey. Journey changes (record / proofread / build cards, recording, building — the list is `tools/staging-promotion/journey-paths.cjs`) are HELD for Tom's look on staging.popty.app; internal tooling moves on the green check alone. Cost accepted: a Popty fix reaches production a day later. A genuine production emergency is Tom's call to push to `main` directly. Staging shares the LIVE database with production — it is for reviewing code, not for data isolation.
- **Nothing auto-merges. GitHub Actions is off on this repo** (Tom's ruling, 2026-08-31) — a `claude/*` branch you push just sits there until someone merges it. Work lands the way the lines above say: you merge it to `deploy/staging` yourself. **Never** commit your work onto someone else's branch — you mix your work into theirs and neither can land alone. Stage your work on your own `docs/…`/`fix/…`/`feat/…` or `claude/*` branch.
- **The checks run as nightly jobs on watson-1, and they report rather than block.** No workflow gates a merge, so a merge can land between two nightlies and be told about it the next morning. That is Tom's deliberate trade.
- **Multiple checkouts/sessions run concurrently and the branch can move under you.** Verify `git rev-parse --abbrev-ref HEAD` in the *same* step as commit/push; stage explicit paths (never `git add -A`); if your commit lands on the wrong branch, push the *commit hash* to its intended branch (`git push origin <sha>:<branch>`) rather than force-pushing.

### File placement (keep the repo clean)
- **Never create files in repo root** (only essential configs).
- **Machine-generated evidence does not go in the tracked tree.** Sweep logs, queue tails, censuses, snapshots and screenshots go to `~/ssi-evidence/ssi-dashboard-v7/<repo-relative path>` (helper: `tools/lib/evidence-path.cjs`); `.gitignore` blocks `*.json`/`*.jsonl`/`*.gz`/images/audio under `docs/` and `archive/`. Anything Tom must read is *published* to the surface, not pointed at.
- `scripts/` is your gitignored workspace (experiments, one-off fixes, agent-generated). `tools/` is committed, stable, shared-with-Kai utilities. `docs/` for docs. Check `.gitignore` before creating files.

---

## 🧭 Where things live (pointers, not explanations)

- **Estate facts come from `GET /api/estate-map` (Production API, port 3470), not from inference** — released status, voice mode, voices of record, the state of the pod each course actually SERVES (`serving_pod`, resolved per course — every course's core pod is `pod-1` since Tom's ruling of 2026-09-13; topic pods carry their own slugs), computed fresh from the DB on every read, with a `semantics` block giving Tom's meaning for each field.
- **Course content = Supabase, not JSON.** Seeds/LEGOs/phrases/audio live in `course_seeds` / `course_legos` / `course_practice_phrases` / `course_audio`. JSON files (`lego_*.json`) are legacy artifacts — never read course data from them. Deprecated tables: `audio_samples`, `texts`, `audio_files`.
- **The learning app (player-vue) reads content DIRECTLY from Supabase.** It does NOT use the manifest. `manifest-generator.cjs` is legacy and not on the learner path (it emits `Seeds: 0` even for working courses). To diagnose a learner-facing content issue, trace the real read path: the Vercel API routes in `ssi-learning-app/api/courses/[code]/*` (e.g. `round-map.ts`, `cycles`) and the player composables (`useInstantPlayback.ts`, `useFullCourseScript.ts`).
  - ⚠️ `round-map.ts` reads the **`course_round_index` materialised view**, refreshed on lego mutations by the dashboard pipeline. A course built by *direct DB inserts* won't appear there until you `REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index` — symptom of a stale/empty view is "one seed then INF PLAY".
- **DB schema source of truth** = `ssi-learning-app/supabase/schema.sql` — a `pg_dump` snapshot committed in the **sibling learning-app repo**, not this one (this repo's own `database/migrations/` is archived history only, per its README). Both repos share one Supabase project, so that snapshot is authoritative for this repo's tables too. Regen via `ssi-learning-app/supabase/snapshot-schema.sh` (needs a pg_dump ≥ PG17; defaults to `/opt/homebrew/opt/postgresql@17/bin/pg_dump`, falls back to bare `pg_dump` on PATH; reads `DATABASE_URL` from this repo's `.env.psql` automatically). If that checkout isn't present, query the live schema directly instead — `psql "$DATABASE_URL" -c '\d+ <table>'` using `.env.psql` below.
- **Direct SQL / migrations need `.env.psql`** (the `DATABASE_URL` secret-zero) at the repo root — gitignored, so it's provisioned per machine by scp, never by git. Machine map: `ops/` and the provisioning scripts there.
- **Course content API** (agent submission): `POST /api/seed/complete` (course-builder). It validates tiling/ZUT/vocab/phrase-count atomically and auto-assigns deterministic phrase IDs — agents never set phrase IDs, always `phrase_role: 'build'`. After a compaction, recover next-seed via `/course-resume` or `GET /api/resume/:courseCode` — don't guess from memory.
- **Services / ports / endpoints**: don't trust a list here. Check the actual service files in `services/` and the APML specs in `apml/`, and test the endpoint.

---

## 🔗 Ecosystem (cross-repo map)

| Repo | Role |
|------|------|
| **this repo (Popty)** | Content **creation** — translation, LEGOs, audio generation, QA, course-builder |
| **ssi-learning-app** | Content **delivery** — `@ssi/core` engine, `player-vue` SPA, `/schools` dashboard; reads Supabase directly |

Flow: Dashboard → Supabase/S3 → Learning App → Learner.

---

## ✅ Before you start

- [ ] Synced to `origin/main`, read `WORKLIST.md`, claimed your item
- [ ] Know the methodology rails + approval gates above
- [ ] Read `course-methodology-canon.md` (and `ralph-methodology.md` / `synonym-choice-architecture.md`) if touching content
- [ ] Verified any "fact" you're relying on against the actual code
- [ ] Files going to the right place (not root; `scripts/` gitignored)

*When in doubt: read the code, check recent commits (`git log --oneline -10`), and verify before you trust.*
