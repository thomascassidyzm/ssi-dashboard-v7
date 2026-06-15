# WORKLIST — ssi-dashboard-v7-clean (Popty) · shared, multi-agent. READ THIS HEADER BEFORE EDITING.

The live "what's next" for this repo, for **all** agents (local, cloud/web, any account).
Coarse on purpose — for Opus: **directions, things to build, areas to think through.** One line per
item; if it needs detail, **link a doc** (the plans under `docs/`, e.g. `docs/course-optimization/WORKLIST.md`,
`ralph-methodology.md`), don't inline it. This is *not* a bug tracker or a subtask list, and it sits
**on top of** the main-branch rail in `CLAUDE.md` — it doesn't restate it.

### How to use (the whole protocol)

**Status marks** — one box + a suffix, nothing else:
- `[ ]` open — free to grab
- `[~] @handle MM-DD` — claimed / in progress (e.g. `[~] @cloud-3 06-14`)
- `[x] @handle MM-DD` — done (leave it; the groomer archives it)
- `[!] @handle MM-DD — why` — blocked / parked

`@handle` = a stable tag you pick for yourself (`@tom-local`, `@cloud-3`, `@web-acctB`). Date = today, `MM-DD`.

- **Grab:** flip `[ ]`→`[~] @you MM-DD` and commit **only that one line** (`worklist: claim <slug>`). If it's already `[~]`, pick another. A `[~]` older than **5 days** with no branch behind it is stale — re-grab it, note `(was @x, stale)`.
- **Add:** append `[ ]` to the **end** of the relevant section. Never renumber/reorder/reflow existing lines (append-only keeps merges trivial).
- **Finish:** flip `[~]`→`[x] @you MM-DD`, same one-line commit.
- **Merge conflicts here are always two independent line edits → keep BOTH, strip the markers.** Never overwrite the other side. Don't bundle worklist edits with code commits.
- **Branch hygiene** (inherits `CLAUDE.md`): work on a `claude/*` branch; it **auto-merges wholesale to `main`** (`.github/workflows/auto-merge-claude.yml` → Camberley `git pull` + `pm2 restart`). So **never** add your claim/commit onto someone else's `claude/*` branch (you'd sweep their whole branch to main), and never bundle a claim with a code change. Non-`claude/*` branches (`docs/…`, `fix/…`, `feat/…`) are cherry-picked by Tom — safe to stage work on.

⚠️ **Methodology rails are a hard line — read before authoring/regenerating any course content.** ZUT: one known prompt → exactly **one** target form (production direction; naturalness is *not* the tie-breaker). The **known side is a controlled language too** — never use English the learner hasn't been given. Vocabulary is **known / target / seed** — never "source". **Never generate TTS or delete generated audio without showing a plan + getting approval** (costs money / irreversible). Full doctrine: `ralph-methodology.md` + the pair-contract under `docs/pair-contracts/`.

---

## 🧭 Directions / bets   (the why — changes rarely)

- **The methodology lives in the prompt + gates, not in 70 manual rebuilds.** `zho_for_eng` is the *controlled experiment*; the principles it surfaces get distilled into the generation prompt + validation gates, then **regenerate** every course. We are not hand-rebuilding all ~70 courses. → `ralph-methodology.md`
- **ZUT outranks naturalness.** One known → one target, deterministic; many known → one target is fine (convergence pairs are a *teaching* asset, not waste). → `ralph-methodology.md` "ZUT Outranks Naturalness"
- **The known side is a controlled language.** Prompts tile from introduced glosses + a small free class (glue, inflection, NPI-under-negation, do-support) + construction licenses unlocked at a carrier's debut. → `ralph-methodology.md` "The Known Side Is a Controlled Language"
- **Better × Simpler × Cheaper (multiplicative), judged on the *learning experience*** — least action to confidence, not truth. Agents self-apply it and proceed at >90% narrative confidence.
- **Two streams, divided labour:** the speaking course is the *recombination engine*; the **listening pods** carry high-frequency zero-combination formulas (你好/谢谢 are deliberately absent from the course). Omissions there are intentional, not gaps.
- **Database-first; quality bar is zero-tolerance** (no audio that mismatches text). All voices generated at **1×**, speed adjusted in-app. Never read course data from JSON — Supabase is SSoT.
- **Per-pair rules are instances, not universals** — the pair-contract (`docs/pair-contracts/`) is the language-specific layer; free class / NPI / negation machinery are *known-language* specific. → `docs/pair-contracts/_TEMPLATE.contract.cjs`

## 🔨 To build   (claimable — one line, link the plan)

- [x] @claude-local 06-14 — **Methodology encoding MERGED to main** (`b41ba8d1`): 4 gates (phrase-ZUT on the `/seed/complete` golden path, metadata-gloss, frame-coverage, known-side) + prose + pair-contract `_TEMPLATE`. **phrase-ZUT made phrase-granular** (Tom's call): a collision holds out only the transgressing phrase(s), never the whole seed; LEGO-level conflicts still hard-reject. ⚠️ Needs a **course-builder `pm2 restart` on Camberley** to activate (landing on main doesn't auto-run the gate). → `ralph-methodology.md`
- [ ] **Work the S351–668 fix-queue** (Kai's old-way extension): **371 real issues** found by the 4-gate lint + 16-agent adjudication (of 1,499 raw; ~75% were stemmer/sub-gloss FPs). Real = zut_phrase **90** (synonym/form consolidations — want 要/想, open-door 把-vs-SVO, very 非常/很, help 帮助/帮忙) · known_side **1013** (CORRECTED: tense forms are real, not FPs — Tom) = tense **617** which collapse to **~7 tense-mapping demos** (`contract.knownTenseConstructions`, introduce-once-then-free) + **68 distinct untaught-word re-glosses** + 157 used-before-intro + 48 NPI · metadata_gloss **19** (把/遍) · frame **1**. **Actionable fixes ≪ flag count:** 90 ZUT + ~7 tense demos + ~68 re-glosses + 19 metadata + reorder. → `docs/course-optimization/upper-half-fix-queue.md` (ranked). Tools: `scripts/lint-full.cjs` + `scripts/build-adjudication-inputs.cjs` (this IS the template for the other ~69 old-way courses).
- [x] @claude-local 06-15 — **CLARIFIED: there is no "v2 zho."** `zho_for_eng` IS v1: **S1–350** = MVP refined toward new methodology; **S351–668** = Kai's old-course-builder extension (created 06-08/09, ungated). All draft; served = older 350-MVP manifest. The from-scratch "regenerate via prompt+gates" only applies to FRESH pairs. The `cmn_for_eng` experiment was a DRIFT (re-deriving v1's done breakdowns) — **binned**. Real lever for existing courses = GATE-AND-FIX (above), not regenerate.
- [ ] **Reorder-pilot promotion** (seed-aligned zho order): serving-override + publish-path mapping so the new order actually serves. *Post-Dublin (after June 24).* → branch `course-optimization`
- [ ] **Metadata-gloss re-gloss worklist (~19 legos):** debuts that give a grammar label instead of a producible intention (把 = "object marker" → bad). → `/tmp/metadata-gloss-worklist.json`
- [ ] **Incremental / scoped TTS pipeline** — diff-scoped to seed/lego delta, idempotent, addition-safe, methodology-aware (honour `introduce:false`); stop a text tweak forcing a course-wide regen + delete. → memory `project_ssi_incremental_audio_pipeline`
- [ ] **Script View edit-flow rework** — inline edit → Phase 8 regen → auto-approved preview (clone a new `regenerate-phrase` from `regenerate-presentation`; the existing `regenerate-single` re-voices OLD text). Display fix already done (not merged). → branch `fix/scriptview-show-all-lego-phrases`
- [ ] **Extend the phrase-level gates** — coverage-rule gate + 了/aspect-cue determinism gate (deferred by BSC; prompt-only for now). The phrase-ZUT gate is already wired to `/api/lego`. → `services/course-builder/lib/validation.cjs`

## 🤔 Areas to think through   (open design — link the think-piece)

- [ ] **Big-10 semi-builds** — `X_for_eng` + `eng_for_X` for the top combinations, parallelised across agents (more tokens, not more days). What's the right fan-out + cost ceiling? → `docs/course-optimization/WORKLIST.md`
- [ ] **Listening-pod ↔ course overlap** — which early pod vocabulary (if any) should become USE phrases vs stay pod-only. Tom: "a bigger question to leave for another day" — the two-stream boundary is deliberate.
- [ ] **Pair-contract derivation for non-`eng` known languages** — the gate only runs when course-known === contract `known_lang`; each new known language needs its own free-class / NPI / negation machinery. → `docs/pair-contracts/_TEMPLATE.contract.cjs`
- [ ] **了 / aspect-cue determinism** — construction features (了 present vs absent) need a deterministic English cue so the learner always knows when it's there. → `ralph-methodology.md`
- [ ] **Learner migration on reorder** — frontier resume rule (max over completed seeds, monotone), content-hashed order snapshots, `learner_course_state`. → memory `project_ssi_learner_migration_plan`

## 🚧 In flight / don't collide

- **`feat/stage0-tuner-popty`** (`origin/main` HEAD `ecc040d0`) — Stage-0 explainer ladder tuner. Another agent's lane; don't touch its checkout (`/Users/tomcassidy/SSi/ssi-dashboard-v7-clean`).
- **`methodology-encoding`** (@claude-local) — the 4 gates + prose + template; pushed, pending review.
- **`course-optimization`** (@claude-local) — reorder-pilot detailed worklist + data artifacts (order, rehoming map, suppression decisions, parked IDs).
- **Pod lanes** — `pods/casting`, `pods/dialogue-autocue`, `pods/registration`, `feat/pod-tts-resilience`, `feat/pod-explainer-audio` (separate worktrees).
- **`fix/scriptview-show-all-lego-phrases`** — Script View display fix (verified, not merged).

## ⛔ Blocked / parked

- [!] @tom 06-14 — review `methodology-encoding`, then merge to main (the gates change the live `/seed/complete` path).
- [!] @tom 06-14 — reorder-pilot promotion + any TTS approval is **post-Dublin (June 24)**.
- [!] @tom 06-14 — **Dublin gov pitch (June 24, hard deadline):** demo-readiness hardening — offline pre-cache of the `zho_for_eng` opening so flaky conference wifi can't kill the live lesson. → memory `project_ssi_dublin_pitch`

## ✅ Done archive   (recent shipped — groomer trims)

- [x] @claude-local 06-14 **Methodology encoding built & pushed** to `origin/methodology-encoding` (phrase-ZUT now also on the golden path, not just `/lego`; metadata-gloss, frame-coverage with convergence exemption, known-side controlled-language gate; pair-contract template; doctrine prose in `ralph-methodology.md`). Awaiting review (see To build).
- [x] @claude-local 06-13 **zho seed-aligned reorder authored** (sayable by ~R3, seed-completion drumbeat, value-weighted yield, rehoming keeps text+audio with zero TTS) — 226 phrases authored/gated/voiced R1–700, parked draft as a parallel lane. → `docs/course-optimization/WORKLIST.md`
