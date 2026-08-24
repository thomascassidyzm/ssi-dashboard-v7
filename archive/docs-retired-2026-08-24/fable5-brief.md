# Fable 5 — Brief: Popty community course-building + the human voice engine

*Drafted 2026-06-10. A starting brief to think through **with Tom**, not a fixed spec.*

## Mission

Spin through **every** flow in the Popty dashboard, then **design and build** better ones for the
**community-course-builder** persona — with the **human voice engine** as the centrepiece. Crack on
(audit → design → build) on a feature branch → `main`. Treat the "open questions" below as things to
**co-design with Tom**, not pre-decide.

## Corrected context — do NOT re-derive these as problems

A first grounding pass got two things backwards. They are *not* blockers:

1. **Remote already works, and it's deliberate.** A community leader **tunnels into** SSi's / Tom's /
   Kai's machine via ngrok; Popty's `osascript` then spawns the Claude CLI **on that host**. So the host
   is the compute — translate / decompose / QA run fine remotely and have for months. There is **no need
   for an "API mode."** (If you see "spawns a local CLI agent," that is the working design, not a gap.)
2. **Popty is an admin tool, not learner-facing** — it sits behind admin login, so the security posture is
   **acceptable risk for now**. The *one* item worth fixing: **cross-course access** — a contributor
   should not be able to URL-hop into a course they aren't assigned to. The broader "unauthenticated
   endpoints" observation is acknowledged and parked.
3. **Roles are deliberately simple** (`editor` + `admin`). The team/collaboration model is an **open design
   question**, not a defect.

## The real scenario to design for

**Richard leads "Macedonian for French speakers."** He has **several helpers** — some editing content,
some recording voices. **A course needs ≥2 distinct voices** (and more for the listening exercises).

So the unit to design for is **one leader + a team of contributors + multiple voices per course** — not a
solo power-user. Everything below should serve that.

## What's actually built (so you start aimed, not blind)

- **The minimal-recording planner is REAL and wired.** A greedy set-cover ("GuaranteedCoverage") computes
  the smallest set of phrases a human must record to cover every new LEGO — the "50 seeds → ~150 recordings
  → ~1500 phrases" magic, *at the planning level*. `tools/recording-optimizer/generate-recording-script.cjs`
  (`greedySetCover` ~:244; seed-auto-covers-its-legos rule ~:445; `chunkPhraseByLegos`/`mergeGlueIntoLegos`
  produce the pipe-delimited `chunksString` pause boundaries). Surfaced via
  `GET /api/production/:courseCode/recording-optimizer` and `/recording-script`, and `src/views/RecordingOptimizer.vue`.
- **The live human recorder is built.** `src/components/production/autocue/AutocueStudio.vue` (teleprompter,
  VAD continuous capture, background upload queue) → `POST /api/production/:courseCode/recording/upload`
  (trim/normalise to −16 LUFS, S3, provenance). The front-half UX is the most finished part.
- **Auth/scoping primitives exist:** `dashboard_users` role + `courses[]`; `voice_id` auto-gen
  (`human_{email}_{lang}`); invite backend; `useAuth.canAccessCourse`.

## The centrepiece to BUILD — close the synthesis loop

This is the heart of the mission. Today the leader records the optimized ~150 phrases and **nothing
assembles the other ~1350.** The chop → align → splice → register tools (`tools/recording-optimizer/align-audio.cjs`,
`segment-audio.cjs`, `splice-legos.cjs`) are **CLI-only, referenced by nothing in the running app**; the
on-screen "LEGO Audio Synthesis" is a **hard-coded Welsh `frankenstein-demo`** serving pre-baked S3 clips.
So "record 150 → get 1500" is **scoped and designed but not executable end-to-end.**

Build the **in-app engine** that turns a course's uploaded recordings into the full phrase set as
`course_audio` rows — **course-agnostic** (kill the Welsh hard-code) and **multi-voice-aware** (a course has
≥2 voices). And fix **precious-audio safety early — it's dangerous today:** human recordings currently share
the **same S3 key as TTS** and **never set `origin='human'`**, so a later TTS regen can silently overwrite
irreplaceable human audio.

## Open questions to think through WITH Tom (don't pre-decide)

- **Team & roles.** Can an `editor` add other editors as recorders? Do we want a leader-vs-recorder
  distinction, or keep it flat? How does a leader assemble and manage their team, and assign who records
  which voice? What does a recording-only helper land in (a minimal "open the teleprompter and read these"
  view, not the admin console)?
- **Multi-voice economics.** ≥2 voices means recording the minimal set **per voice** (~150 × N), more for
  listening. How do the recording plan + synthesis handle N voices without the burden feeling crushing?
  How is the work divided across recorders?
- **The leader's journey.** Today a leader lands in the full admin console — many parallel cards, SSi jargon
  (ZUT, M-LEGOs, tiling, GuaranteedCoverage). What's the right scoped shell and guided sequence
  (translate → decompose → verify → record-the-minimal-set → **synthesize** → QA → publish), with
  jargon-free inline help? Is there a self-serve "let my class start learning" publish path?

## Sweep-up fixes (real, smaller)

- **Cross-course access scoping** (the one security item — enforce per-course, server-side + route guard).
- `updateSampleFlag` is called **positionally** (`production-api.cjs` ~:4079) vs its object signature
  (`supabase-client.cjs` ~:735) → the post-record DB flag is silently broken.
- `recording-optimizer` reports `totalPhrases = totalLegos × 10` (fabricated); `RecordingOptimizer.vue`
  `recordedCount`/`splicedCount` are TODO stubs; Export-PDF disabled.
- **Schema drift:** the optimizer and `plan.js` disagree on `known_text/target_text` vs `known/target`
  (and `practice` → `build`). Verify live column names before trusting either.
- Two recorders exist (`AutocueStudio` vs `RecordingStudio V2`) — pick one for the persona.

## Guardrails

- **Feature branch → `main`** (not a shared `claude/**` branch — those auto-merge wholesale). Isolate in a
  **git worktree** — many agents share this machine and the checkout moves under you.
- **`main` → Camberley is LIVE.** Aran tunnels in; deploy is Tom's DEPLOY button. **Test each piece before
  merging**, and don't break what's already shipped (the Script View phrase edit/regenerate flow, the
  autocue recorder).
- **No TTS spend** — this is the *human* engine. The cost being minimised is the recorder's **time** (the
  whole point of the set-cover algorithm).

## Method

Ultracode. Walk every `/production/:courseCode/*` flow **as a non-expert who has never read `CLAUDE.md`.**
Actually exercise the human-recording path end-to-end on a small real course. Bring the open questions back
to Tom to co-design.
