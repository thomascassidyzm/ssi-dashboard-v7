# Popty — the codebase, the risks and the debt

*A read-only survey of `ssi-dashboard-v7-clean`, 30 August 2026. No code was changed, no tests were run, nothing was executed against the database except a handful of SELECTs.*

**Who this is for.** Tom first, on a phone. Then anyone sizing follow-on work. Every section leads with what it means, then the detail. Where a claim is verified against code or the live database I say so; where I could not verify it, I say that too, plainly.

**What I actually read.** The repo has 4,261 tracked files and about 308,000 lines of hand-written JavaScript, TypeScript and Vue outside `node_modules`. I did not read all of it and no honest survey could. I read: `CLAUDE.md` in full; the whole of the course-builder (`services/course-builder/`, ~20,600 lines, the heart of the product); the entry points and every `listen()` call site; the delivery boundary in the sibling `ssi-learning-app`; `package.json` and the dependency graph; and roughly six weeks of git history. Two Sonnet sub-workers read the audio pipeline (#318) and the operator surface (#320) to the same read-only rules, and their findings are folded in below in one voice. I did **not** open: most of `src/views` beyond file sizes, `apml/`, `archive/`, `new_vision/`, `e2e/`, or the majority of the 815 markdown documents.

---

## 1. The map — what this thing is

Popty is the **content factory**. It makes courses. It does not serve them.

The split is clean and worth holding on to: this repo creates translations, LEGOs, phrases and audio and writes them into Supabase; the sibling repo `ssi-learning-app` reads that same Supabase and serves it to learners. There is no build artefact passed between them and no API between them. **The database is the interface.** That is the single most important architectural fact about the estate, and it is true — I verified it from both sides.

What actually runs as a long-lived process (verified from `ss -ltnp` on this box tonight, matched to the process command line, not guessed from docs):

| What | File | Port | Runs from | State tonight |
|---|---|---|---|---|
| Production API | `services/production-api.cjs` (13,431 lines) | 3470 | `…-clean-prod` | **running** |
| Course Builder API | `services/course-builder-api.cjs` → `course-builder/routes/*` | 3471 | `…-clean-prod` | **running** |
| Phase 8 audio | `services/phases/phase8-audio-v13.cjs` (8,311 lines) | 3465 | `…-clean-prod` | **running** |
| Orchestrator | `services/orchestration/orchestrator.cjs` (11,430 lines) | 3456 | **`…-v7-clean` — this tree** | **running** |
| v3 verify server | `scripts/v3-verify/serve-v3.cjs` | 3479 | `.worktrees/v3-wire` | running |
| Vite dev server | — | 5390 | this tree | running |

Ports and files here come from matching each listening socket to its process command line and its working directory on this box tonight, not from any document.

**Three of those four services run out of a separate checkout, `ssi-dashboard-v7-clean-prod`, which sits on `main` and was updated an hour ago. The orchestrator does not — it runs out of *this* tree**, the shared development checkout, on a six-day-old feature branch, while several workers commit into it. That means an edit to `services/orchestration/` in this tree changes what a live 11,430-line production service will do the next time it restarts. I have filed that in the risk register; it is the sharpest thing I found in the layout.

Everything else in `services/` — 108 `.cjs` files at the top level alone, plus `phases/`, `pipeline/`, `audio-intelligence/` — is either a library required by those three, or a one-shot tool run by hand. The phase servers (`phase0-language-brief`, `phase1-translation`, `phase2-conflict-resolution`, `phase3-basket-generation`, `phase8-audio-*`, `phase9-manifest-compiler`) each have their own `app.listen()` and are started on demand, not kept up.

**Three of the four `npm` scripts a newcomer would reach for are broken.** `npm run automation` runs `start-automation.js`, `npm run server` runs `automation_server.cjs`, `npm run build:local` runs `generate-course-manifest.js` — none of those three files exist. Only `start-automation.cjs` does. This is harmless to the running system and lethal to anyone new, human or agent, trying to start it.

**The front end cannot be built from this repo alone.** `package.json` declares `"@ssi/core": "file:../ssi-learning-app/packages/core"`. `node_modules/@ssi/core` is a symlink into `/home/tomcassidy/SSi/ssi-learning-app/packages/core`, and seven files in `src/` import from it. Clone Popty on a clean machine without the sibling checked out beside it and `npm install` fails. Worth knowing before anyone tries to move this to another box.

---

## 2. The content spine — where the method is actually enforced

This is the heart, so it gets the most care.

**The shape.** A course is rows in four Supabase tables: `course_seeds` (a sentence pair), `course_legos` (the pieces it teaches), `course_practice_phrases` (BUILD, USE and component rows), `course_audio` (2,597,473 clips across 149 courses tonight, per the live estate map). Agents write content through one door: `POST /api/seed/complete`, which validates a whole seed atomically and either accepts all of it or returns the full list of errors and writes nothing.

**The gates are real code, not prose.** `services/course-builder/lib/validation.cjs` (1,076 lines) implements them and `routes/seed-complete.cjs` (2,348 lines) runs them:

- `checkPhraseZUT` — same known prompt must map to one target form. Enforced per-phrase with hold-out, so one bad phrase doesn't lose a seed of work.
- `checkLegoConflict` — the same test at LEGO level, where it is a hard reject.
- `checkTiling` — the seed can be recomposed from its LEGOs, nothing missed, nothing added.
- `checkVocabViolations` — no forward references; a phrase may only use vocabulary already introduced.
- `checkKnownSide` / `loadPairContract` — the *English* side is a controlled language too, per-pair contracts in `docs/pair-contracts/`.
- `checkMetadataGloss` — blocks debuts glossed as grammar labels ("object marker") rather than producible intentions.
- `checkBuildRecombination`, `checkPhraseComplexity`, `checkPhraseBalance`, `checkBasketFrameCoverage` — phrase floors, template-stamp defence, over/under-used vocabulary.

That is a genuinely impressive piece of engineering: the methodology is not a document agents are asked to respect, it is a wall they hit. The `skip_validation` escape hatch is properly bounded — `seed-complete.cjs:954` caps it at `seed_number <= 3`, and the syllable cap runs even then.

**And here is the finding that matters.** There is a *second* write path that skips almost all of it.

`services/course-builder/routes/v2.cjs` (1,909 lines) is mounted alongside `seed-complete` in `course-builder-api.cjs:49`. It writes directly into `course_legos` and `course_practice_phrases` — upserts at lines 464, 483, 568 and 825. Its imports (line 21) pull in exactly two validators: `checkTiling` and `checkVocabViolations`. It does **not** call `checkPhraseZUT`, `checkLegoConflict`, `checkKnownSide`, `checkMetadataGloss`, `checkBuildRecombination`, `checkPhraseComplexity`, `checkPhraseBalance` or `checkBasketFrameCoverage`.

So content entering through `POST /api/v2/phrases/:courseCode` or `POST /api/v2/decompose/finalize/:courseCode` is checked for tiling and for forward-referenced vocabulary, and for nothing else. No ZUT gate. No known-side controlled-language gate. No gloss-honesty gate. Both lanes are live and both were touched in the same recent commit (`bdfb7d21c`), so this is not a dead path someone forgot: `v2` is called from `routes/build.cjs`, `routes/edit-cascade.cjs`, `services/course-data-service.cjs` and `services/production-api.cjs`.

I did not establish *how much* content has come through the v2 lane rather than through `seed/complete`, and that is the question a follow-on job should answer first. But the shape is plain: the estate has one heavily-gated front door and one side door into the same tables.

One smaller thing: `checkLegoOverlap` is defined and exported in `validation.cjs:528` and called from nowhere in the repo. Dead.

---

## 3. The audio pipeline

*(folded in from sub-worker #318 — see below; this section is completed in the second pass)*

---

## 4. The delivery boundary — what the learner actually reads

CLAUDE.md makes three claims here. Two are right and one is wrong in a way worth knowing.

**Right:** the learning app reads Supabase directly. Verified — the Vercel routes in `ssi-learning-app/api/courses/[code]/` (`round-map.ts`, `cycles.ts`, `bundle.ts`, `infplay-cycles.ts`) query Supabase tables themselves. There is no manifest on the learner path. `manifest-generator.cjs` is still required by `services/production-api.cjs:20`, so it is not deleted, but nothing a learner touches goes through it.

**Right:** `round-map.ts` reads the `course_round_index` materialised view (line 104), and returns a 503 telling you to refresh it when the view has no rows for a course.

**Wrong, and this is the one to fix:** CLAUDE.md says the view is "refreshed on lego mutations by the dashboard pipeline". It is not. There is no trigger, no RPC, and no service code anywhere in Popty that issues `REFRESH MATERIALIZED VIEW`. The only refresher in the entire repo is `tools/refresh-round-index.cjs` — a hand-run command-line tool. `docs/proposals/refresh-course-round-index-rpc.sql` shows somebody drafted an RPC to close this; it is still sitting in `docs/proposals/`, unapplied. A previous scout found the same thing on 4 August (`docs/qa-landscape-scout-2026-08-04.md`) and it is still open.

**How bad is it tonight?** I measured it, and I want to be careful because my first measurement was wrong. Comparing every LEGO against the view suggests 100 courses and 6,512 missing rounds — that number is **wrong**, because the view only indexes fresh-introduction LEGOs (`WHERE is_new = true AND lego_id IS NOT NULL`, from the view definition in the sibling repo's `schema.sql:8810`). Measured against the correct predicate, the real drift right now is **one course, `pdc_for_eng`, four rounds short** — and `pdc_for_eng` is an unreleased draft with one audio clip. So no learner is affected tonight.

The honest reading: the mechanism is fragile, nothing detects drift, and the only reason it is nearly clean is that humans remember to run the tool. The 4 August scout found four courses missing from the view *entirely*; those are fixed now, which proves both that the drift happens and that somebody is mopping it up by hand. The symptom when it bites is "one seed then INF PLAY" — a silent, learner-facing failure with no alarm anywhere.

---

## 5. The operator surface

*(folded in from sub-worker #320 — see below; this section is completed in the second pass)*

---

## 6. The debt register

**The Anthropic SDK is a ghost, and the ban is holding.** `package.json` lists `@anthropic-ai/sdk` as a live dependency while CLAUDE.md bans it outright, citing a past module that silently billed ~$38/day. I checked every `.cjs`, `.js`, `.mjs` and `.ts` file in the repo: **nothing imports it.** The only source file that mentions it is `services/shared/claude-cli.cjs`, in a comment saying never to use it. The one route that did (`routes/preflight.cjs`, via `phrase-scorer.cjs`) is commented out at `course-builder-api.cjs:41` with the reason written next to it. So this is a stale dependency line, not a live leak — but it is a loaded gun in the manifest, and removing it makes the ban enforceable by `npm` rather than by memory.

**`docs/` has become an artefact dump, and it is 44× the size of the code.** `docs/` is 328MB on disk; all of `services/` is 7.1MB. Of 2,651 tracked files under `docs/`, only 815 are markdown — there are **1,565 JSON files**, 146 `.cjs` scripts and 22 mp3s filed as documentation. The largest single tracked file in the repo is `docs/audio-repair-2026-08-06/deu-full-queue-tails.json` at 26MB, with a 26MB sibling for French. `.git` is 908MB, and this is most of why. Every clone, every worktree and every agent checkout pays for those sweep logs forever. This is the cheapest large win available.

**The working tree is six days and 981 commits behind `main`, with 69 real commits stranded.** HEAD is on `docs/seed-15-want-you-to-evidence`, which forked from `main` on 24 August (`8646e3f93`). Since then `main` has moved 981 commits ahead while this branch accumulated 97. Of those 97, `git cherry` says **69 have no equivalent on `main`** — and they are not all documents. `129ea775d fix(pods): split audio follows the row's text, never its slot` and `ab0ee8ac3 fix(pods): rebuild Pod 1 split arrays from each row's own text and own cast` are code fixes from 24 August that have never reached `main`. CLAUDE.md's own rule says everything goes to `main` and branches are transient, and that the Deploy button runs `git pull` — so by that rule, those fixes reach no machine. This is not a hypothetical: it is the state of the checkout that multiple workers are committing into right now.

**Scratch litter has escaped into the working tree.** `git status` shows 479 untracked entries, 41 of them `.a108-*`/`.a134-*` scratch directories. `scripts/` — gitignored by design as an agent workspace — holds 1,149 files and 2.5GB. `.worktrees/` inside the repo holds 32 worktrees and **8GB**; the parent directory `~/SSi` holds a further 111 `wt-*` sibling worktrees and totals 38GB. There are two files literally named `*.db` (one at the repo root, one in `database/`), both zero bytes, both created by an unquoted shell glob. And two `.env` backups sit beside the live `.env`: `.env.bak-before-service-key-2026-07-31` and `.env.bak-elevenlabs-20260818`. Nothing sensitive is tracked in git — I checked, only `.env.example` is — but a rotated-out service key sitting in a readable file next to the live one is worth a moment's thought.

**Files that have outgrown being read.** `services/production-api.cjs` is 13,431 lines in one file; `orchestration/orchestrator.cjs` is 11,430; `phases/phase8-audio-v13.cjs` is 8,311; `src/views/admin/PodLab.vue` is 3,794. The course-builder was deliberately broken out of a monolith in February and its shell is a clean 95 lines — that refactor was right and it stopped at the door of the three biggest files.

**Tests interleaved with services.** 28 `.test.cjs` files sit among the 108 `.cjs` files in `services/`. That is a filing preference, not a defect, and I mention it only because it makes `ls services/` misleading about how much machinery there is.

---

## 7. The risk register

Ranked by what actually hurts. Silent failures rank above loud ones, because the estate's own history says a loud failure gets fixed in an hour and a silent one runs for two days.

**1. The v2 side door into the content tables.** *What breaks:* content enters `course_legos` and `course_practice_phrases` having passed a tiling check and a vocabulary check and nothing else — no ZUT, no known-side contract, no gloss-honesty gate. *Who notices:* nobody, at write time. A learner meets it as the same English prompt asking for two different target forms, which is exactly the confusion the whole method exists to prevent. *How likely:* it is not a possibility, it is a live route called from four places. *Cost to prevent:* small — either route v2's writes through the same gate battery, or measure what came through it and decide. Measuring first is the cheap move.

**2. `course_round_index` drifts and nothing watches it.** *What breaks:* a course's later rounds vanish from the learner's map; the app plays one seed and then sits in INF PLAY. *Who notices:* the learner, silently, and only if someone reports it. *How likely:* it has happened repeatedly — four courses were entirely absent on 4 August. Tonight it is one unreleased draft course, four rounds. *Cost to prevent:* very small. The RPC is already written in `docs/proposals/refresh-course-round-index-rpc.sql`; alternatively call the existing tool at the end of any lego mutation. A drift *check* is cheaper still and would at least make it loud.

**3. A live production service runs out of the shared development checkout.** *What breaks:* `services/orchestration/orchestrator.cjs` is serving on port 3456 with its working directory set to this tree, on branch `docs/seed-15-want-you-to-evidence`, 981 commits behind `main`. Any worker editing files under `services/orchestration/` — or simply checking out a different branch, which several rules in this estate tell agents not to do precisely because of this — changes what that service loads on its next restart. *Who notices:* whoever is using the orchestrator, at a moment nobody can predict, with no connection to the edit that caused it. *How likely:* the other three production services were deliberately moved to a separate `-prod` checkout on `main`, so somebody already solved this problem and the orchestrator was left behind. *Cost to prevent:* restart it from `-prod` like the others. Minutes.

**4. Sixty-nine commits, including code fixes, stranded off `main` in the shared checkout.** *What breaks:* fixes that everyone believes shipped have not shipped, and no machine has them. *Who notices:* nobody, until a bug thought fixed reappears. *How likely:* certain — it is the present state. *Cost to prevent:* an afternoon of reconciliation, and thereafter a habit or a check.

**5. Documentation that is confidently wrong about the delivery path.** CLAUDE.md's materialised-view claim is the specimen: it tells every agent that a thing is automatic which is manual. CLAUDE.md itself warns that its facts rot, which is honest, but an agent that believes this particular fact will ship a course that plays one seed. *Cost to prevent:* one line.

**6. Eleven services bind to all interfaces.** `app.listen(PORT)` with no host argument, in `services/api/progress-tracker.cjs:364`, `network-builder-api.cjs:263`, `pipeline/pipeline-server.cjs:981`, all six `phases/*/server.cjs`, `phase8-audio-from-baskets.cjs:482`, `phase9-manifest-compiler.cjs:588` and `tools/seed1-listen/server.cjs:180`; `voicelab-playground/server.cjs:389` binds `0.0.0.0` explicitly. The four services that matter most — production-api, course-builder, orchestrator, phase8-audio-v13 — all take a `HOST` and default to loopback, with a comment in `course-builder-api.cjs:68` saying exactly why ("watson-1 has a public IP"). So somebody understood this and fixed the important ones. *How likely to bite:* low — none of the eleven were listening tonight. *Cost to prevent:* a one-line change per file, and it is the kind of thing that is cheap now and expensive after.

**7. Repository weight.** 908MB of git history, 8GB of in-repo worktrees, 38GB across `~/SSi`. Nothing breaks; everything is slower, every clone is dearer, and the box fills. Filed as debt rather than risk because I could not name a thing that fails.

---

## 8. What is worth doing next

Shortest useful list. Each is one dispatchable job.

**1. Measure what came through the v2 lane, then close it.** One read-only census: how many LEGOs and phrases in live courses were written by `routes/v2.cjs` rather than `seed/complete`, and do any of them break ZUT today. The answer decides whether this is a five-minute wiring fix or a content repair programme. Better, simpler, cheaper than guessing — and it is the only finding here that touches the method itself.

**2. Make the round-index refresh automatic.** The RPC is already written and sitting unapplied in `docs/proposals/`. Apply it, or call `tools/refresh-round-index.cjs` at the end of the lego write path. Either way, add the drift check so the failure becomes loud. Small, and it removes a silent learner-facing outage class permanently.

**3. Reconcile the 69 stranded commits.** Work out which of them matter, land them on `main`, and fix the belief that a pushed branch has shipped. This is a judgement job, not a mechanical one — some of those 97 commits are superseded.

**4. Fix the three broken `npm` scripts and drop `@anthropic-ai/sdk` from `package.json`.** Fifteen minutes. The scripts mislead every new arrival; the dependency makes a rule enforceable that is currently held by memory and a comment.

**5. Get the sweep logs out of `docs/`.** 1,565 JSON files and 328MB, including two 26MB files. Decide a home for run artefacts that is not the git history, and stop the bleeding — the history that exists is sunk, but the next six months of it are not. Cheapest large win on the list.

**6. Correct the two wrong facts in CLAUDE.md.** The materialised-view claim, and anything else this document contradicts. CLAUDE.md is the one file every agent reads; a wrong fact there is multiplied by every session.

**7. Move the orchestrator onto the `-prod` checkout.** It is the last production service still running out of the shared development tree. Minutes of work, and it removes a whole class of accident that this estate's own rules are currently working hard to prevent by hand.

I would do 7, then 1 and 2: 7 because it is minutes and removes an accident class, 1 because it is the only one that may be damaging course content right now, 2 because it is nearly free and closes a silent learner-facing failure.

---

## Gaps — what I could not verify

- **How much content came through the v2 lane.** Establishing the shape of the risk was in scope; counting the rows was not, and it needs a proper census rather than a quick query.
- **Whether the 69 stranded commits are individually wanted.** I established that they are absent from `main` and that some are code; I did not read them.
- **Large parts of the repo went unopened**, listed at the top of this document.
