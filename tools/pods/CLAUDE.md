# tools/pods/ — agent guide to the pods subsystem

Read the root `CLAUDE.md` first. This file exists because pods are the busiest thing in the repo
and the subsystem is spread across five directories, so a fresh agent has nowhere to start. It
maps the subsystem, states the live rulings, and then covers this directory's own conventions.

**The code and the database are the truth.** Nothing here is a file list; the tools in this
directory are mostly one-offs and the set changes weekly. Written 2026-09-20 — treat any dated
claim below as dated.

---

## What a pod is

A pod is a **listening dialogue**: a scripted conversation a learner hears, as opposed to the
speak-prompt-respond course material made of seeds, LEGOs and practice phrases. Pods are a
different content type in a different set of tables, and almost none of the course methodology
(ZUT, tiling, phrase floors) applies to them.

Tables, all in the same Supabase project as course content:

| Table | Holds |
|---|---|
| `listening_pods` | the pod header per course: `slug`, `pod_type`, `visibility`, `required_role`, speakers |
| `listening_pod_sentences` | the lines — scene, sentence, `global_order`, speaker, known/target text, audio pointers |
| `canonical_pod_scenarios`, `canonical_pod_walk_steps` | the canonical script and its metagraph walk, edited in Script Lab |
| `pod_legos` | pod lines mapped to course LEGOs |
| `learner_pod_state` | learner progress, keyed by **slot** (`<course>:pod-1:SC03-S003`) — see the migration rule below |

Confirm the shape against the live DB (`psql "$DATABASE_URL" -c '\d+ listening_pod_sentences'`
with `.env.psql`), not against this table.

## The live rulings (Tom, Sept 2026) — and where the code agrees

These are decisions, not derivations. Each one is verifiable in the file named; all of them were
checked against the code on 2026-09-20 and agreed.

- **There is only `pod-1`, plus pods by topic** (2026-09-13). Every course's core pod was renamed
  onto the `pod-1` slug that day. The player resolves a pod by slug + `pod_type='core'`, so **the
  slug is the pointer** and writing to it is what puts content in front of learners.
  `serving-slug.cjs` is the one implementation of that question; its `SERVING_POD_SLUGS` list is a
  deliberate duplicate of the learning app's `servedPod.ts` (two repos share a database, not a
  module graph — widen both in the same change). `method-pod` is a third Listening-Mode slot.
- **`visibility` is not a guard** (2026-09-02, verbatim: "do not let visibility stand in for a
  guard anywhere"). A `held` pod on a serving slug is still served. `visibility` is a human
  release lever only (`services/pod-visibility.cjs`): going live is a human act, release needs a
  confirm token naming the pod, and since 2026-09-13 live → held is **refused** — a live pod is
  never pulled back, only fixed line by line.
- **Pods are per LANGUAGE, not per course** (2026-08-13). A language's pod content renders once
  and is shared by every course in that language. This changes the unit you count a render queue
  in; `database/migrations/20260813b_estate_map_pods_per_language.sql` makes the collapse
  measurable (`pods_by_language` in `estate_map()`). Note the asymmetry: **recordings are per
  language, but voice identity is per course** — see `build-canonical-231-pod.cjs`.
- **One canonical 231-sentence story.** `build-canonical-231-pod.cjs` / `run-canonical-231-build.cjs`
  stand it up for a course whose known language is not English; `align-pod-to-canonical.cjs` is the
  `*_for_eng` path. Measured 2026-09-19: the 231-row structure is byte-identical across canonical
  courses and exactly five lines differ — the ones naming the language being learnt (33, 94, 95,
  221, 226), which the tool refuses to guess. **Caveat worth knowing:** not every live serving
  `pod-1` is 231 lines yet; some are shorter (a 142-line live pod-1 is named in that tool's
  header). Canonical length is not a safe assumption about a given course — count the rows.
- **Stage 0 is retired; stages run 1..N** (2026-09-19). Confirmed: `src/lib/podEngine/index.ts`
  says the vendored `stage0Sequence.ts` is gone and a sentence enters the ladder at Stage 1.
- **The ladder is ten visits** — stages 1-8 once each, stage 9 twice, then the sentence retires.
  In this repo that lives in `src/views/admin/PodLab.vue` (the stage → play-role table).
- **Pod translations may run ahead; pod TTS is held until Tom picks each voice himself**
  (2026-09-19). The pick is `(language, gender) → one voice`, stored in the `pod_voice_picks`
  `app_config` row — see `services/pod-voice-picks.cjs`, whose header explains why none of the
  three existing voice stores could carry it. Do not render pod audio around this.
- **Pods are unbound from course position and always play from sentence 1 on their own ratchet**,
  with cadence Easy every 2 rounds / Fast every 4. ⚠️ **That logic is not in this repo.** The lap
  scheduler (`usePodLapScheduler`) and the cadence numbers live in `ssi-learning-app` /
  `algorithm_config`. This repo only vendors the stage *composition* (`src/lib/podEngine/`,
  a generated verbatim copy of `@ssi/core/pods`, re-synced with `tools/sync-pod-engine.sh` — do
  not hand-edit it). Nothing in Popty was found that implements the 2/4-round cadence; if you need
  to change it, change it in the learning app.

## Where the pods subsystem actually lives

```
services/pod-*.cjs              decision logic: visibility, text approval, generate guard,
                                dialogue generation, lego extraction, voice picks/approvals
services/voice-engine/pods-*    casting, coverage, planning, the pods router (recording side)
services/shared/pod-*.cjs       shared rules: tiers/syllable ceiling, jump-in, solo readers
api/pod-*.js                    Vercel functions the SPA calls (content, cast voices, fine map)
src/views/admin/PodLab.vue      Pod Lab — the stage ladder / casting surface
src/views/ScriptLab*.vue        Script Lab — where Tom edits the canonical script
src/lib/podEngine/              vendored stage composition (GENERATED, do not edit)
tools/pods/                     the operational tools — this directory
docs/pods/                      curated markdown the SPA globs and serves, plus history
database/changes/2026*pod*.sql  the guards that are enforced in the database itself
```

`docs/pods/` is mostly retired prose and does **not** carry standing (root `CLAUDE.md`, "the
retired trees") — with two exceptions that running code or policy reads: `pod-migration-protocol.md`
and `text-approval-policy-2026-08-16.md`, plus the markdown corpora
`tools/pods/parse-pod-markdown.cjs` parses.

## This directory

Operational tools: build, align, clone, promote, retire, recast, render, repair, verify, census.
Many are dated one-offs (`*-2026-09-13.cjs`) kept because their test documents a ruling. Find
what you need by grepping headers rather than by filename:

```bash
grep -l "<what you mean>" tools/pods/*.cjs | xargs -n1 head -30
```

### The hard rules a tool here must obey

1. **Never edit a live pod in place.** Learner progress is filed under a sentence's *slot*, not its
   text, so an in-place edit silently credits a learner with a line they never heard — no error, no
   alarm. Content changes go through the migration protocol: `pod-state-migrate.cjs` plans it,
   `pod-switchover.cjs` applies archive + migrate + promote **in one transaction**. Standing
   doctrine since 2026-08-16.
2. **Make before break.** The staged pod is proven complete and cast before the live pod is
   touched; the live pod is *renamed* (`pod-1-retired-<stamp>`), never deleted; audio ids are
   carried across so no clip is orphaned or re-rendered.
3. **Ask `serving-slug.cjs` before any write.** It is pure, it answers "would a core pod on this
   slug reach a learner", and it produces the refusal text naming who is at risk. A rule guarded at
   one door is not guarded — job #91 and #93 are the history. A tool that carries progress properly
   (`pod-switchover.cjs`) is the exception and does not consult it.
4. **Never render audio from unread drafted target text.** A drafted line renders only after a
   human edit clears the draft flag or an *independent* verifier approves it; blocked lines are
   counted, never silently skipped (`services/pod-text-approval.cjs`, `pod-draft-flags.cjs`).
   And pod TTS is held entirely pending Tom's voice picks, per the ruling above.
5. **Name yourself when you write.** A tool writing over SQL bypasses the HTTP editor-identity
   gate by construction, so it must declare `serviceIdentity('tools/pods/<file>.cjs')` and
   `recordContentEdit()`. Never backfill attribution for a pre-existing row.

### Conventions in this directory

- **Dry run by default; `--apply` writes.** Most write tools here refuse to touch anything without
  it, and print the plan otherwise. A few older ones use a `DRY_RUN` env var instead — check the
  header, do not assume.
- **Direct `pg` over `.env.psql`**, not the Supabase JS client, for anything transactional. Most
  tools here open a `pg.Client` with `DATABASE_URL` loaded from the repo-root `.env.psql`.
- **Evidence out of the tracked tree**: logs and censuses go through `tools/lib/evidence-path.cjs`
  to `~/ssi-evidence/...`. Some older `*-applied-log.json` / `*-dryrun-log.json` files are still
  committed next to their tool; do not add more.
- **A one-off tool still gets a test.** `foo.cjs` ↔ `foo.test.cjs` beside it, asserting the rule —
  that is how a ruling survives, since nothing in `docs/` does.
- **Long headers.** Every good file here opens with what it does, *why it is not the other tool*,
  the ruling and date behind it, and what it refuses. Follow that; it is the repo's documentation.
- Python (`splice.py`, `senedd/*.py`) turns up for audio work. It is not the norm.

### Running the tests here

Run only what you touched — **never the estate-wide suite** (it is a capped nightly job on
watson-1; parallel agents each running the whole thing took a 12-core box to load 39):

```bash
npx vitest run tools/pods/serving-slug.test.cjs
npx vitest run tools/pods
```

Two specs in this directory are **not** vitest — `parse-pod-markdown.test.cjs` and
`splice-sentence-clips.test.cjs` are standalone `node:test` scripts, excluded in the `test.exclude`
block of `vite.config.js`. Run those with `node <file>`. Check that list before assuming; it is
regenerated with the one-liner in the comment there.
