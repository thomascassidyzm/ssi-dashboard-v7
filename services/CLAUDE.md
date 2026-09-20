# services/ — agent guide

Read the root `CLAUDE.md` first; this file only covers what is specific to this directory.
**The code is the truth.** Nothing below is a list you should trust over a `grep`, and no file
count or inventory is written here on purpose — this directory gains and loses files every week.

---

## What `services/` is

The Node back end of Popty. Everything a browser or an agent talks to, plus every module those
talk to, lives here. It is **CommonJS `.cjs`** — the repo's `package.json` says `"type": "module"`,
so the `.cjs` extension is load-bearing, not decorative. A `.js` file in here would be parsed as
an ES module and blow up on its first `require`. New files get `.cjs`.

Two kinds of file live side by side, and telling them apart is the first thing to work out:

- **Long-running servers** — a handful of files that call `app.listen()`. These are processes.
- **Modules** — everything else. Required by a server, by a `tools/` script, or by a test.
  No port, no process, often pure functions holding the decision logic and no I/O at all.

The pure-module habit is deliberate and worth copying: the interesting files here (e.g.
`pod-visibility.cjs`, `shared/tts-provider-policy.cjs`) take the DB, the clock and the identity as
arguments so the *decision* can be unit-tested without any of them. If you are adding a rule, add
it as a pure function plus a test, not as an `if` inside a route handler.

To find the servers as they stand today:

```bash
grep -rln "app.listen\|server.listen" services --include=*.cjs
```

## How a service is actually wired into the running app

There are three routes into production, and only the first two put code in front of anybody:

1. **systemd units on watson-1** — `ops/systemd/*.service`. That directory *is* the list of
   long-running Popty processes; read it rather than guessing from filenames. The units run from
   `…/ssi-dashboard-v7-clean-prod` (a separate prod checkout that `git pull`s on deploy), not from
   the dev checkout — with one deliberate exception noted in the orchestrator unit. Each has an
   `ExecStartPre` running `tools/check-service-syntax.cjs`, so a file that does not parse refuses
   to start instead of crash-looping silently.
2. **Mounted into `production-api.cjs`** — the common case, and what you almost certainly want. A
   feature that needs HTTP does *not* get its own process; it exports an Express router and
   `production-api.cjs` mounts it: `grep -n "^app.use(" services/production-api.cjs`. Mounting
   under `/api/production/:courseCode/...` is what makes the app-level `app.param('courseCode')`
   course-scope auth gate fire for your routes — a router mounted elsewhere is unguarded — and
   routers mounted there must use `mergeParams` and must **not** declare `:courseCode` internally.
3. **Vercel serverless functions in `/api`** (repo root, not here) — the SPA's own endpoints.
   Different runtime, `.js`/ESM, deployed by Vercel. `vercel.json` rewrites `/api/recording/*`
   through the tailscale funnel to watson-1, so some `/api` paths are really this directory.

Every route that writes course content must pass the editor-identity gate
(`shared/content-edit-gate.cjs`, manifest in `shared/content-write-surfaces.cjs`) — a drift test
fails if you add a content-writing route without listing it. A `tools/` sweep writing over SQL
bypasses HTTP entirely and must name itself with `serviceIdentity()` + `recordContentEdit()`.

## Tests — co-located, and you run ONLY yours

Convention: `foo.cjs` is tested by `foo.test.cjs` **in the same directory**. Some areas use a
`__tests__/` folder instead (`voice-engine/`, `phases/`, `course-builder/`). Both are normal.

**Never run the estate-wide suite.** It is a nightly job on watson-1, alone, under a CPU cap.
Parallel agents each firing the whole suite took a 12-core box to load 39. Run the file you
touched, nothing more:

```bash
npx vitest run services/pod-visibility.test.cjs          # one file
npx vitest run services/voice-engine                     # one area
npx vitest run -t "refuses a bare visibility"            # one named test
```

Gotcha that will waste your time: **not every `*.test.cjs` is a vitest spec.** Some are standalone
`node:test` / bare-assert scripts that call `process.exit()`, and the runner just logs "No test
suite found" or a bogus failure for them. They are listed explicitly in the `test.exclude` block of
`vite.config.js` (the test config lives there — there is no `vitest.config.js`), together with the
one-liner that regenerates the list. Run those with `node <file>` instead.

`npm test` / `npm run test:run` fire a `pretest` hook (`tools/check-service-syntax.cjs`) that
`node --check`s the server entrypoints. Useful after a merge; not a substitute for your own test.

Also here: `e2e/pod-recording/` is Playwright, not vitest, and runs via
`npm run test:e2e:pod-recording` against its own config.

### ⚠️ `package.json` scripts in this repo are partly rotten (checked 2026-09-20)

`npm run automation`, `npm run server` and `npm run build:local` all point at files that no longer
exist (`start-automation.js` — the file is `start-automation.cjs`; `automation_server.cjs`;
`generate-course-manifest.js`). `start-automation.cjs` itself still spawns
`services/phases/phase8-audio-generator.cjs`, which is also gone — the live phase-8 is
`services/phases/phase8-audio-v13.cjs`, per `ops/systemd/popty-phase8-audio.service`. Verify any
npm script before you rely on it. `dev`, `build`, `test*`, `course-builder` and `check:syntax` are
fine. The README's port and pipeline tables have the same problem: check the service file.

## The sub-areas — shape, not inventory

**`shared/`** — cross-service utilities and, more importantly, **the single-source-of-truth rule
modules**. When a rule exists in more than one place it gets pulled in here: the provider ladder
(`tts-provider-policy.cjs`), clip identity, voice consent / personhood / ownership, text
normalisation, editor identity, the Claude CLI wrapper (`claude-cli.cjs`). Before writing a rule,
check whether `shared/` already owns it. It has its own `README.md`, accurate for `logger.cjs` and
older than the rest of the directory.

**Audio pipeline** (`audio-*.cjs`) — generation planning, processing and trimming, loudness, reuse
planning, repair, tail scanning, veracity, preview. Roughly: decide what needs audio → render →
process → check → link → deploy to S3. Approval gates that apply here, in full in the root
`CLAUDE.md`: **never run TTS without a plan and explicit approval** (it costs money), and never
delete a clip before its replacement is generated and verified — make-before-break. A content pass
ends by *queueing* an audio pass (`tools/course-optimization/queue-audio-pass.cjs`), never by
rendering one.

**TTS providers** — `tts-service.cjs` is the multi-provider front door; `azure-tts-service.cjs`,
`elevenlabs-service.cjs`, `google-tts-service.cjs` sit behind it; Cartesia is reached through the
voicelab / voice-config path rather than its own top-level file. **Which provider gets chosen is
not decided in any of those files** — it is `shared/tts-provider-policy.cjs`, which carries Tom's
ladder: human recording wins outright, Cartesia is the default, Azure the fallback, ElevenLabs
explicit-only because it is expensive, xAI retired from *selection* but very much alive in the data
model. Read that file's header before touching provider choice; it explains why "retired" does not
mean "deleted", and why an xAI voice id must still resolve.

**`audio-intelligence/`** — the quality gate stack: given the mastered bytes of one clip, does it
enter the store or go to quarantine. Ordered cheap-first (speech span → loudness → tail shape →
syllable rate → phonology → whisper CER), with `tiers/` holding the individual measurements and
`gate-stack.cjs` holding the decision. Its header explains the rule that matters: `null` refuses —
"cannot measure" is not "does not apply".

**`voice-engine/`** — turns a human recorder's ~150 uploaded phrases into a full phrase set, no TTS
ever; plus the pods casting / coverage / planning modules (`pods-*.cjs`) and the recordist queue.
Two routers mounted into `production-api.cjs`. **It has its own detailed `README.md` — read that
before touching this area.** By commit volume it is the busiest sub-area in the directory.

**`voicelab/`** and `voicelab-playground/` — voice discovery, cloning, consent capture and
declaration. `voicelab/router.cjs` attaches itself with `.mount(app, …)` rather than `app.use`;
`voicelab-playground/` is a separate small server with its own systemd unit running out of a
*different checkout* (`~/SSi/voicelab-wt`).

**`phases/`** — the numbered course-production pipeline (phase0 language brief → phase1 translation
→ phase2 conflict resolution → phase3 baskets → manifest compilation → phase8 audio → phase9
manifest compiler). Each phase is a directory with a `server.cjs` and a `PROMPT.md`. Only phase8
has a systemd unit; **whether the rest are live is unverified** — the thing that starts them is
`start-automation.cjs`, which is broken as noted above. Treat anything here as check-before-trust.

**`course-builder/`** and `course-builder-api.cjs` — the agent-facing seed submission API
(port 3471 by default, own systemd unit). `course-builder/lib/validation.cjs` is where ZUT, tiling,
vocabulary containment, syllable caps and phrase-count floors are actually enforced;
`known-side-gate-v2.cjs` enforces the controlled-known-language rule against
`docs/pair-contracts/*.contract.cjs` (those `.contract.cjs` files are code, not docs — the
validator requires them on every submission). If you want to know what the methodology *is*, read
`course-methodology-canon.md` at the repo root; if you want to know what is *enforced*, read that
validator.

**`briefs/`** — the briefs the API serves to build agents, one per pipeline stage, with an index
router that lists the stage order. Superseded briefs go to `briefs/deprecated/`.

**`api/`** — a small, odd corner: `audio-repair-routes.cjs` and `audio-tail-scan-routes.cjs` are
routers mounted elsewhere; `progress-tracker.cjs` (3462) and `ngrok-proxy.cjs` (3463) are their own
tiny servers. Do not confuse it with the repo-root `/api` (Vercel functions) — different runtime,
different deploy, different module system.

**`orchestration/`, `pipeline/`** — one server each, from the older pipeline architecture. Their
current role is **unclear from the code alone**: the orchestrator has a systemd unit (and is the
one service that runs from the dev checkout), `pipeline/pipeline-server.cjs` does not and has no
in-repo record of being started.

**`config/`** — `course-modes.json` + `machine-profiles.json` behind `course-mode-loader.cjs`.
Phase servers are meant to read modes through the loader rather than hardcoding them.

Naming collision worth knowing: `cadence-service.cjs` is about **speech speed** (slow 0.7× /
natural 1.0×). It has nothing to do with pod cadence, i.e. how often a pod plays.

## Conventions

- `.cjs` + `require`, always (see above). Config as JSON next to the module that loads it.
- `require('./shared/logger.cjs')('ServiceName')` for logging, not bare `console.log`.
- `dotenv` from the repo-root `.env`; `.env.psql` holds `DATABASE_URL` for direct SQL and is
  provisioned per machine by scp, never by git.
- **Never `@anthropic-ai/sdk`.** All LLM calls go through the Claude CLI — `shared/claude-cli.cjs`,
  or the pattern in `gender-prep-coordinator.cjs`. The SDK is in `package.json` for the dashboard's
  env switcher only. A past SDK module quietly billed ~$38/day.
- Machine-generated evidence (logs, censuses, snapshots) goes to `~/ssi-evidence/…` via
  `tools/lib/evidence-path.cjs`, never into the tracked tree.
- Capture what you learn as a **test, or a comment at the decision point** — never a new `.md`.
  The good files in here carry long headers explaining *why*, with the ruling and the date that
  produced them. That is the house style; follow it.
