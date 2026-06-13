# SSi Course-Optimization Program — Worklist & Status

> **Entry point for any agent (incl. Claude Code web) picking this up.** This is the map: active threads, status, open questions, and where everything lives. Last updated 2026-06-13.
> Everything here is **staged / parallel-lane** — nothing reaches live learners until an explicit promotion step (see §Serving). The Dublin demo (24 Jun 2026) serves a frozen published manifest and is unaffected by any of this.

---

## North Star
**Minimum vocab × maximum pattern = least-action language learning.** The SSi method is the moat (17 years, tens of thousands of learners; not in any LLM's training data). LLMs are the language engine. Given the method, an LLM authors content; the *gates* keep the method load-bearing at scale. Theory: distinction-physics treatise module-4.

The program: take the battle-tested canonical SEEDs and make the courses **leaner, denser, more effective** by (a) optimizing the LEGO introduction ORDER for early-game producibility, (b) enforcing quality via deterministic gates, and (c) doing it in a way that LLMs can run across 58 languages.

---

## The 9 ratified methodology decisions (the pair-contract) — ✅ DONE
Ratified by Tom 2026-06-13. Machine-readable: `docs/pair-contracts/zho_for_eng.contract.cjs`. Enforced by the both-sides gate.
1. **能/会**: can+a-language→会; situational→能.
2. **尽可能** = "as much as possible" (one gloss); "as often as possible"→尽可能经常.
3. **意思**="meaning"; **我的意思**="what I mean" (bound unit).
4. **NPI free**: some→any under negation is automatic (not new vocab).
5. **也** = silent construction-feature; gloss the whole thought.
6. **想要**="to want to have"; **有**="I've got" (distinct intentions).
7. **do-support questions** via statement→question convergence on the same target.
8. **很 split**: silent before adjective predicate; "really" before psych-verb.
9. **了-contract**: past bounded event→always 了; cue table (see le-contract-proposal.md).

Plus two cross-cutting doctrines:
- **ZUT > naturalness**: one English prompt → exactly one target form, always. "I don't care if it's not the most natural Chinese." (`feedback_ssi_zut_over_naturalness` in memory)
- **The known side is a controlled language**: every English prompt must tile from introduced glosses + licensed constructions. Principle 1 (reconstructability) applies in BOTH languages.

---

## Active threads

### 1. zho_for_eng REORDER PILOT — 🟢 content built & voiced; promotion pending (post-Dublin)
The flagship. Reorder the LEGO sequence for early-game density, keep canonical seeds as milestones.
- **Order**: `data/zho-course-order-FINAL.json` — 1088 rounds, sayable (first sentence 我想说中文 by R3), 15 legos suppressed. Opening identical to canon's first 5; structural cliffs (不/很/这个…) woven into R11–30.
- **Measured win** (May-2026 harness + learner-weighted integral): ~1.34–1.44× early-game value-yield vs canon, where 79% of learner activity lives. See `ALIGNED-harness-results.md`, `seq-optimizer-results.md`.
- **Content authored**: 226 USE phrases across R1–700, all gated (both-sides tiling + ZUT + frame-diversity) and **fully voiced** (Azure Xiaoxiao/Yunyi). Parked as `status=draft, metadata.reorder_pilot=true`. ID lists in `data/reorder-pilot-parked-*.json`.
  - R1–30: 38 · R31–100: 41 · R101–700: 147 (64% yield on the hard deep band; verifier+central-gate rejected the rest).
- **Rehoming**: existing phrases keep their text+audio; `data/rehoming-map.json` maps each to its serve-round under the new order (9,383 stay / 941 rehome / 16 drop). Migration needs no re-voicing of existing content.
- **NEXT**: (a) lego-defect review (thread 4) closes the last floor gaps; (b) BUILD-scaffolding top-ups for front-loaded structural legos; (c) serving-override + publish path (§Serving).
- Scope/history: `reorder-pilot-scope.md`; transcripts `first30-transcript-v3-FINAL.md`, `reorder-first20-transcript.md`.

### 2. Both-sides tiling gate + tooling — ✅ BUILT
- `tools/known-side-gate.cjs` — enforces known-side reconstructability + construction licenses; reads the contract; order-independent. Regression: 38/38 hand-proven pass; adversarial bad-set caught.
- `tools/audit-frame-diversity.cjs` — frame-diversity audit of USE baskets (principle 7).
- `tools/basket-rework.cjs` — check/apply basket edits (tiling+ZUT+convergence-pairs; rollback snapshots).
- Canonical course order timeline (vocab availability per round): `data/zho-order-timeline.json`.

### 3. Learner migration (cross-version) — 🟡 DESIGNED, not built
Choice-based: when a course is re-ordered, existing learners get an **offer** ("cover N building-blocks the new version teaches earlier, and switch — or carry on?"), not a forced migration. Both orders served side-by-side via content-hashed snapshots.
- **Frontier resume rule** (not naive last-seed) is the correct monotone coordinate.
- **Seed-tight is the coordinate, NOT a low-inversion property** — reorder necessarily scrambles seed-completion order; that's fine, frontier handles it; catch-up cost is depth-dependent (grandfather/decline for deep learners).
- Architecture: `course_order_snapshot` (content-hashed), `course_order_diff`, `learner_course_state` (position = lego_id, never round; once-only fuse). `course_round_index` is currently a matview with hardcoded ORDER BY — the central schema gap.
- Full plan: `learner-migration-plan-raw.md`. Only test users on courses now → low-stakes; this is forward-looking insurance.

### 4. Lego-defect review — 🟠 QUEUED (worklist extracted)
The reorder authoring doubled as a lego-quality audit. Pre-existing CANON defects surfaced (need lego-level fixes; their rounds stay below floor until fixed):
- **门** (S0101L03) glossed "course" — means **door** (course = 课/课程).
- **更多要学** (S0073L02) — ungrammatical for "more to learn".
- **却睡** (S0055L01) — unnatural (却 needs fuller predicate).
- **足够** (S0058L02), **在+放进** resultative clash (S0053L03).
- Full refutation list (more candidates): `data/band2-refuted.json`.

### 5. Course-wide ZUT collisions — 🟠 176 remaining (worklist ready)
Same English → different target, course-wide. `ZUT-collision-worklist.md`. "understand" family already partitioned (懂/明白/理解/听懂/听清/了解 — 13→0). find-out 3-way fork (弄清楚/了解/不知道) and 互相/彼此 still open. Resolution unit = detect→partition→verify→apply (the `basket-rework` flow).

### 6. Basket frame-diversity (principle 7) — 🟢 audited + 2 resolver passes applied
`frame-diversity-audit.md`, `overnight-basket-work-2026-06-10.md`. Course mean 0.99 after passes 1+2; seed 80 fixed. 39-slot frame taxonomy from the May experiment supersedes the ad-hoc tagger (upgrade pending).

### 7. Particle methodology — ✅ banked (earlier work)
Particles never introduced alone; overlap-ladder twin-debut. `particle-worklist.md`, `le-contract-proposal.md`.

---

## OPEN QUESTIONS / PENDING DECISIONS (Tom)
- [ ] **BUILD-scaffolding depth** for front-loaded structural legos (USE floor met; BUILD top-ups still needed).
- [ ] **Catch-up basket depth** for migration (recommend abbreviated: intro+debut+1–2 BUILD+3 USE, no consolidate).
- [ ] **了-contract**: ratify cue table wording + approve the ~40–60 phrase re-voicing spend (le-contract-proposal.md).
- [ ] **Course-wide audio gap**: 49% of zho phrases lack target audio (pre-existing, ~8% relinkable). Separate relink-first-then-generate decision — NOT the pilot's job.
- [ ] **find-out / 互相-彼此** ZUT forks (thread 5).
- [ ] **Promotion trigger** for the pilot (post-Dublin): build the serving override + run the publish path.
- [ ] **Generalize to other pairs**: pair-contract + reorder for fresh courses (no legacy base = the prize).
- ✅ Decided already: 很-gloss split (#8); migration = learner-choice not grandfather-threshold; canonical order = sayable 1088 (NOT the rejected bare-atom 1103 file).

---

## SERVING / promotion (how this reaches learners — currently it doesn't)
- Live courses serve a **published manifest snapshot** (course-configs/S3/apidev), decoupled from the live Supabase table. ALL zho legos/phrases are currently `status=draft` (0 released).
- The manifest generator filters `status='released'`. Round order is derived from `(seed_number, lego_index)` via the `course_round_index` matview (no override column yet).
- **Promotion = a deliberate, reversible sequence**: set pilot rows released → populate the order override → regenerate manifest → publish. Map this path before promoting (see migration plan §3). Nothing auto-publishes.

---

## How to continue (env + commands)
- Repo: `~/SSi/ssi-dashboard-v7-clean`. DB access via `node -e` + `@supabase/supabase-js` + repo `.env` (SUPABASE_URL/SERVICE_KEY). `psql` is NOT installed.
- Tables: `course_seeds`, `course_legos` (is_new=true = a debut), `course_practice_phrases` (phrase_role component|build|use; metadata.reorder_pilot tags pilot rows). Paginate — PostgREST truncates at 1000.
- Both-sides gate: `node tools/known-side-gate.cjs <phrases.json> [order.json]` (phrases = `[{r,known,target}]`).
- Frame audit: `node tools/audit-frame-diversity.cjs zho_for_eng`.
- TTS: Phase 8 at `localhost:3465`; scope by `seeds`; `/plan` is a free dry-run; voice config baked per course (Azure). Re-voicing costs money — show plan + get approval.
- Detailed running state lives in the agent memory under `~/.claude/projects/-Users-tomcassidy/memory/` (reference_ssi_zho_pair_contract, project_ssi_learner_migration_plan, reference_ssi_lego_synthesis_yield_experiment, project_ssi_basket_frame_diversity_lens, feedback_ssi_zut_over_naturalness, feedback_ssi_known_side_controlled_language).

## Data artifacts (`docs/course-optimization/data/`)
- `zho-course-order-FINAL.json` — the canonical reorder (1088 rounds).
- `zho-order-timeline.json` — round→{target,known} vocab timeline.
- `pilot-suppress-final.json` / `suppression-decisions.json` — the 15 suppressions + the conservative triage.
- `reorder-pilot-parked-{R1-30,R31-100,R101-700}.json` — parked phrase IDs (draft, metadata.reorder_pilot).
- `rehoming-map.json` — every existing phrase → serve-round under the new order.
- `band2-refuted.json` — rejected authored phrases incl. the lego-defect worklist.
