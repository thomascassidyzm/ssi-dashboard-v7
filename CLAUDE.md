# CLAUDE.md — SSi Dashboard (Popty) agent guide

> **The code and the git history are the source of truth.** This file holds only what they *can't* tell you: the methodology rails, the approval gates, branch hygiene, the cross-repo map, and where to look. If anything here reads like an architectural fact ("service X does Y", "the app uses Z"), distrust it and verify against the code — facts rot, and a stale fact is worse than none. Prefer adding a *pointer* here ("to learn how content is served, read `<file>`") over restating how something works.

---

## 🚨 CODE IS GOSPEL

**Documentation in this repo is historical artifact — out of date BY DESIGN — and is never an authority for any decision.** Before acting on any claim found in a doc (including audits, build docs, README content, this file), verify it against the running code and the live DB. If the code can't answer the question, **ASK TOM** — one plain question — rather than trusting a doc. Today's specimen: agents burned a morning trusting docs about explainer clips and voice casting that the code contradicted.

**The `docs/` tree has been retired.** On Tom's ruling of 2026-08-24 it was moved wholesale to `archive/docs-retired-2026-08-24/` — nothing deleted, history intact, and nothing in there carries any standing. Do not go looking for it: if you find yourself reading the archive to answer a question, you are already off the rails. What stayed at its old path stayed because **running code reads it**, not because it is documentation: `docs/pair-contracts/*.contract.cjs` are executable code the course-builder validator `require()`s on every seed submission (`services/course-builder/lib/validation.cjs`), and `docs/pods/*.md` is content the dashboard SPA bundles and serves. `SYSTEM.md`, `ralph-methodology.md` and `synonym-choice-architecture.md` likewise stayed at the repo root because live services `readFileSync` them. Treat all of those as code, not as docs.

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
- Doctrine + worked examples: `ralph-methodology.md` (decomposition, phrases, tiers) and `synonym-choice-architecture.md` (translation-choice, applied BEFORE decomposition). Read these before authoring/regenerating content.

### Approval gates (cost / irreversibility)
- **Never generate TTS audio** (costs money) without showing a plan and getting explicit approval.
- **Content passes end by QUEUEING an audio-pass request** (`node tools/course-optimization/queue-audio-pass.cjs <course> --reason "<pass>"`, or `queueAudioPass` from `services/shared/audio-pass-queue.cjs`) — never by running TTS. Keeps text edits from silently accumulating as a missing-audio backlog; phase8 `/generate` fulfils the request when an approved pass completes.
- **Never delete generated assets** (audio/video/MARs) without a deletion plan + approval.
- **Make-before-break: any voice swap or clip replacement generates and verifies the new asset before the old one is touched, always.** (1) generate new audio, (2) verify each new clip is alive and correct-voiced, (3) swap links atomically, (4) only then delete the old clip. Deletion never precedes a verified replacement — not even "we'll regenerate right after." The 2026-08-03 fra_for_eng Azure-voice purge deleted 31,310 rows *before* re-rendering and left ~2,000 course slots silent for two days (`docs/fra-audio-1608-forensics-2026-08-05.md`). Full doctrine + the two tools that already implement it correctly: `docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md` §6b.
- **Any change to pod content must migrate learner progress under the standing content-change migration protocol — never edit a live pod in place.** Progress is filed under a sentence's slot, not its text, so an in-place edit silently credits a learner with a sentence they never heard, with no error or alarm. Adopted as standing doctrine 2026-08-16 (plate A-111): `docs/pods/pod-migration-protocol.md`.
- **Pod audio is never rendered from unread drafted target text.** A drafted line renders only once a human edit clears the draft flag, or an *independent* verifier agent approves it; blocked lines are counted, never silently skipped. Policy, gate and verifier pass: `docs/pods/text-approval-policy-2026-08-16.md` (Tom's A-109 ruling, 2026-08-16).
- **Every write to course content carries an editor identity, or it is refused.** The surfaces that write `course_seeds`/`course_legos`/`course_practice_phrases` are listed in `services/shared/content-write-surfaces.cjs`, and a gate resolves who is calling before the handler runs — a verified Supabase session, or, from a same-host caller, a declared `x-agent-id`/`x-agent-role`/`x-service-name`. A 401 `EDITOR_IDENTITY_REQUIRED` means you did not say who you are, not that the endpoint is broken. Adding a route that writes content? The drift test fails until it is in that manifest. Writing a `tools/` sweep that edits over SQL? It bypasses the HTTP gate by construction — name itself with `serviceIdentity('<sweep>')` and `recordContentEdit()`. **Never backfill or infer attribution for a pre-existing row**: a NULL `last_edit_event_id` means "no attribution was captured", never a claim about who edited it (Tom's ruling, 2026-09-01). Doctrine: `docs/editor-identity/editor-identity-on-save-2026-09-01.md`.
- **Never use the Anthropic SDK directly.** All LLM calls go through the Claude CLI (`claude --print`), never `@anthropic-ai/sdk`. The `ANTHROPIC_API_KEY` in `.env` is for the dashboard's env-switcher, not service code. (A past SDK module silently billed ~$38/day.) Pattern: `gender-prep-coordinator.cjs`; unset `CLAUDECODE` when spawning nested CLI calls.
- **Otherwise act autonomously** when docs are clear, the action is reversible, and there's no cost surprise.

### Standing preferences (guidance, NOT enforced in code)

- **Voice config per course is the course builder's case-by-case call — Kai's, or whoever is building it.** Not a central policy, not an estate sweep. Tom's ruling, 2026-08-28, closing the TTS coverage-gap thread (`docs/tts-language-coverage-gap-map-2026-08-27.md`): *"We will in general allow Kai or whoever, to choose the voice configs for each course on a case by case basis. We don't need to redo anything necessarily."*
- **Prefer Cartesia over Azure where a Cartesia voice exists for the language.** Tom, same ruling: *"I think Azure voices should generally NOT be used for any courses that have Cartesia voices. But we can leave that flexible."* That second sentence is load-bearing. This is a **preference, not a rule**: nothing in the code enforces it, and nothing should — no validator, no lint, no config gate, no CI check, no warning. A preference that gets enforced stops being a preference. Read it, weigh it, and use your judgement per course. Provider ladder as built: `docs/tts-provider-policy-2026-08-28.md`.
- Nothing already rendered is being redone because of this. The coverage-gap thread is closed.

### Branch hygiene
- **Everything on Popty goes to `main`. Branches are transient** (Tom's ruling, 2026-08-05). Finishing a piece of work means landing it on `main` and pushing — merging your own branch is part of the job, not a decision to escalate. Don't leave work parked on a branch and report it as a gap. This is also what makes deployment work at all: the machines' Deploy button runs `git pull` on their checkout, so anything not on `main` reaches no machine.
- `claude/*` branches **auto-merge wholesale to `main`** (`.github/workflows/auto-merge-claude.yml`). **Never** commit your work onto someone else's `claude/*` branch — it sweeps their whole branch to main. Stage your work on your own `docs/…`/`fix/…`/`feat/…` or `claude/*` branch.
- **Multiple checkouts/sessions run concurrently and the branch can move under you.** Verify `git rev-parse --abbrev-ref HEAD` in the *same* step as commit/push; stage explicit paths (never `git add -A`); if your commit lands on the wrong branch, push the *commit hash* to its intended branch (`git push origin <sha>:<branch>`) rather than force-pushing.

### File placement (keep the repo clean)
- **Never create files in repo root** (only essential configs).
- **Machine-generated evidence does not go in the tracked tree.** Sweep logs, queue tails, censuses, snapshots and screenshots go to `~/ssi-evidence/ssi-dashboard-v7/<repo-relative path>` (helper: `tools/lib/evidence-path.cjs`); `.gitignore` blocks `*.json`/`*.jsonl`/`*.gz`/images/audio under `docs/` and `archive/`. Anything Tom must read is *published* to the surface, not pointed at. Why, and the 279 MB that moved on 2026-09-01: `docs/EVIDENCE.md`.
- `scripts/` is your gitignored workspace (experiments, one-off fixes, agent-generated). `tools/` is committed, stable, shared-with-Kai utilities. `docs/` for docs. Check `.gitignore` before creating files.

---

## 🧭 Where things live (pointers, not explanations)

- **Estate facts come from `GET /api/estate-map` (Production API, port 3470), not from inference** — released status, voice mode, voices of record, pod-0 state and what each course is blocked on, computed fresh from the DB on every read, with a `semantics` block giving Tom's meaning for each field.
- **Course content = Supabase, not JSON.** Seeds/LEGOs/phrases/audio live in `course_seeds` / `course_legos` / `course_practice_phrases` / `course_audio`. JSON files (`lego_*.json`) are legacy artifacts — never read course data from them. Deprecated tables: `audio_samples`, `texts`, `audio_files`.
- **The learning app (player-vue) reads content DIRECTLY from Supabase.** It does NOT use the manifest. `manifest-generator.cjs` is legacy and not on the learner path (it emits `Seeds: 0` even for working courses). To diagnose a learner-facing content issue, trace the real read path: the Vercel API routes in `ssi-learning-app/api/courses/[code]/*` (e.g. `round-map.ts`, `cycles`) and the player composables (`useInstantPlayback.ts`, `useFullCourseScript.ts`).
  - ⚠️ `round-map.ts` reads the **`course_round_index` materialised view**, refreshed on lego mutations by the dashboard pipeline. A course built by *direct DB inserts* won't appear there until you `REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index` — symptom of a stale/empty view is "one seed then INF PLAY".
- **DB schema source of truth** = `ssi-learning-app/supabase/schema.sql` — a `pg_dump` snapshot committed in the **sibling learning-app repo**, not this one (this repo's own `database/migrations/` is archived history only, per its README). Both repos share one Supabase project, so that snapshot is authoritative for this repo's tables too. Regen via `ssi-learning-app/supabase/snapshot-schema.sh` (needs a pg_dump ≥ PG17; defaults to `/opt/homebrew/opt/postgresql@17/bin/pg_dump`, falls back to bare `pg_dump` on PATH; reads `DATABASE_URL` from this repo's `.env.psql` automatically). If that checkout isn't present, query the live schema directly instead — `psql "$DATABASE_URL" -c '\d+ <table>'` using `.env.psql` below.
- **Direct SQL / migrations need `.env.psql`** (the `DATABASE_URL` secret-zero) at the repo root — gitignored, so it's provisioned per machine by scp, never by git. Machine map + details: `docs/secrets-vault.md` §Provisioning.
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
- [ ] Read `ralph-methodology.md` / `synonym-choice-architecture.md` if touching content
- [ ] Verified any "fact" you're relying on against the actual code
- [ ] Files going to the right place (not root; `scripts/` gitignored)

*When in doubt: read the code, check recent commits (`git log --oneline -10`), and verify before you trust.*
