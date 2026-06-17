# Course Editor Tool — Scope

**Status:** Scoping (2026-06-17)
**Origin:** Prevention item #1 of [the 2026-06-17 cross-course LEGO corruption incident](../incidents/2026-06-17-cross-course-lego-corruption.md)
**Owner:** TBD (separate agent, per Kai)

---

## 1. Why this exists

The incident was **not** a missing-capability failure. The safe machinery already
existed and was bypassed:

- `courseDataService.updateLego()` (`services/course-data-service.cjs:529`) already
  scopes every write by `course_code + seed_number + lego_index`.
- The audit-log + restore layer (`content_audit_log` triggers →
  `/api/admin/audit-*` → `src/views/Maintenance.vue`) already gives clean,
  per-row undo for all four content tables.
- Audio-nulling triggers already fire on text edits to `course_legos` /
  `course_practice_phrases`.

The agent reached past all of it and ran a raw
`UPDATE course_legos … WHERE lego_id = 'S0524L01'`. Because `lego_id` is **not
globally unique**, that hit 79 courses instead of one.

**Therefore the tool's job is consolidation + enforcement, not green-field
construction.** Make the safe path the *only* path; forbid the ad-hoc path in
tooling (documentation already failed as a control).

## 2. Architecture

One mutation library — `services/course-editor/` — with three faces:

```
                         services/course-editor/   (the only writer to content tables)
                          ├── primitives (scoped, audited, validated)
                          ├── operations (ZUT-resolve, strip-parens, qmark-fix, …)
                          └── manifest (read/edit course-configs Courses/{id}.json)
                                   ▲            ▲              ▲
                                   │            │              │
        production-api endpoints ──┘   MCP server ──┘   CLI ───┘
        (delegate to lib)         (PRIMARY agent face)  (humans / scripts)
```

**Decisions (2026-06-17):**

- **Agent interface = MCP server (typed tools).** Agents call sanctioned edit
  tools rather than writing code, so there is no raw-script path to reach for.
  CLI exists for humans; existing HTTP endpoints delegate to the same library.
- **Enforcement = CI/lint guard + code review.** A rule blocks any direct write
  (`.update/.insert/.delete/.upsert`) to `course_legos`, `course_practice_phrases`,
  `course_seeds`, `course_audio` outside `services/course-editor/`. This is the
  incident's own conclusion: enforce in tooling, not docs.
- **Manifest DB-sync = track drift + prompt.** Direct manifest edits are recorded
  as explicit DB-drift overrides; the tool surfaces the drift and asks the editing
  agent to consider updating the DB when applicable (see §6).

## 3. Non-negotiable invariants (safety contract)

1. **Course-scoped writes only.** Every mutation is scoped by `course_code` **and**
   a unique key (row `id`, or the `course_code + seed_number + lego_index` triple).
   The tool resolves the target row-set first and **refuses any write spanning >1
   course** unless `--cross-course` is explicitly set (legitimate for same-target
   TTS-fix propagation — see memory `cross-course-audio-fix-propagation`).
2. **Dry-run by default + blast-radius circuit-breaker.** Show every affected row
   (`id`, `course_code`, `old → new`) and the count before applying; refuse above a
   threshold without explicit confirmation. *This rule alone stops the incident:
   1 intended row resolving to 79 → halt.* (Mirrors the breaker recently added to
   `cleanupOrphanAudio`.)
3. **Operation-batch id** stamped on every write, so a whole operation reverts as a
   unit through the existing `/api/admin/audit-restore` + Maintenance page.
4. **Side-effects owned by the tool, not the agent.** A text edit always carries
   the downstream chain (audio null → reconcile → relink pointer by
   `course,text,role`). Agents can't forget step 2 (memory `phrase-text-edit-workflow`,
   `reconcile-in-place-bug`).

## 4. Operation catalogue

### Already exists — wrap & standardize
| Op | Current home |
|---|---|
| Edit LEGO text | `PATCH /api/production/:course/lego/:id` → `updateLego()` |
| Mark LEGO new / not-new (ZUT dedup) | `…/lego/:id/mark-new` → `markLegoAsNew()` |
| Edit phrase text (+ `reconcileAudioForRole`) | `PATCH /api/production/:course/phrase/:id` |
| Delete phrase (single / batch) | `…/phrases/:id`, `…/phrases/batch-delete` |
| Edit / deprecate seed | `…/seed/:n`, `PATCH /seed/:course/:n` |
| Flag-for-regen, regenerate role/single/presentations | `…/audio-flags`, `…/regenerate-*` |

### Gaps — build as first-class ops (today only ad-hoc scripts or build-time gates)
- **Resolve ZUT conflict** — encode methodology (expand both, `is_new=false`,
  rename, gender-pair exception) from `methodology-zut-resolution`,
  `zut-resolution-dual-expand`. No write endpoint exists.
- **Strip parens / strip slashes** — scan **both** sides across seeds, LEGOs **and**
  phrases (`feedback_parens_slashes_both_sides`, `feedback_no_slashes_use_seed`).
- **Question-mark / punctuation fixes** — language-aware (`؟` Arabic, `¿` Spanish-only;
  `arabic_punctuation_rtl`, `qmark-apply-language-punctuation-bug`,
  `feedback_question_marks`).
- **Phrase insert / backfill** — with required `word_count`/`lego_count`
  (`phrase-insert-required-cols`).
- **Downstream containment audit on LEGO rename** — find phrases in *other* LEGOs
  quoting the old target (`lego-rename-downstream-audit`, `lego-phrase-text-drift`).
- **Readiness gate** — every op ends with a whole-class re-scan, not a curated
  verify list (`feedback_readiness_gate`).

### Also fix
- `services/course-builder/routes/qa.cjs` phrase edits scope by `id` **only** (no
  `course_code` guard) — same bug class as the incident. Route through the library.

## 5. Validation gates (reuse `course-builder/lib/validation.cjs`, run pre-apply)

ZUT conflict, tiling, vocabulary-introduced-before-use, phrase-count minimums.
They exist at build time; the tool applies them to post-build edits too.

## 6. Manifest / course-configs editor (bypass legacy export)

Normal path:
`DB → generate-legacy-manifest → temp/…_pending_manifest.json → manifest-diff-service
→ publish-manifest-service → course-configs/Courses/{id}.json → commit author → push
→ apidev stage-deploy → Step 4 audio promote`.

A direct-manifest editor interfaces at the `Courses/{id}.json` level and needs:

- **Navigate + surgically edit** a field, preserving canonical `KEY_ORDER`,
  repopulating `tokens`/`lemmas`, and updating the matching `samples`
  text→`{uuid,role,duration}` entry (editing text without touching `samples`
  breaks audio playback).
- **Diff + version gate before write** — reuse `manifest-diff-service` for the
  MAJOR/MINOR/PATCH bump and the progress-preservation estimate.
- **Commit/push via `publish-manifest-service`** (author branch); respect the
  stage-deploy unpushed-commits guard.

### DB-sync policy (decided)
The manifest is supposed to be DB-derived, so a direct edit forks DB and manifest —
the next `Step 1` regenerate from DB silently clobbers it. Policy:

1. Record every direct manifest edit as an explicit **DB-drift override** (logged,
   greppable).
2. **Surface the drift** and prompt the editing agent to consider applying the same
   change to the DB when applicable — the tool makes the DB-side edit one command
   away, but does not force it (some manifest-only patches are legitimately
   manifest-only).
3. Warn loudly that an un-synced override will be overwritten by a future
   regenerate-from-DB.

## 7. Phasing

1. **Consolidate + guard.** Mutation library; fix `qa.cjs` scoping; dry-run +
   blast-radius breaker + batch-id; wrap existing endpoints.
2. **Fill gaps + interface.** ZUT-resolve, strip parens/slashes, punctuation,
   downstream audit, full text→audio chain; MCP server (primary) + CLI; CI/lint
   guard banning raw content-table writes.
3. **Manifest editor.** Read/write course-configs with diff/version/progress gates
   + the DB-drift-tracking policy.
