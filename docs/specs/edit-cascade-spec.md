# Build spec — Safe scoped editing of phrases / LEGOs / seeds (the "edit cascade")

**Status:** IMPLEMENTED 2026-06-21 (branch `claude/seed-editing-auto-regen-piej1g`). Authored 2026-06-21 from a design session with Tom.

> **Implementation note (2026-06-21).** Scope refined with Tom: the edit revises **only the
> seed's target translation** — the canonical/known (English) side never changes — which
> necessarily triggers a fresh LEGO breakdown + phrases + intros + audio for that seed.
> Audio regen runs **automatically** at the end of the cascade (same principle as the
> phrase-level edit, so the course stays complete) — the TTS-approval rule is for manual/bulk
> operations, not for keeping an edited item whole.
>
> - **Delta A** — `fromSeed` scope on `POST /api/v2/validate/:courseCode` (`services/course-builder/routes/v2.cjs`), with unit test `v2-validate-scope.test.cjs`.
> - **Delta B** — orchestrator `POST /api/course/:courseCode/edit-cascade` (`services/course-builder/routes/edit-cascade.cjs`, registered in `course-builder-api.cjs`, reachable via the production-api `/api/course/*` proxy). Snapshots + **rolls back** on a failed re-decomposition so a bad edit never destroys the existing breakdown. Audio scoped via `/regenerate-presentations` (self-scoping to missing) + `/generate {seeds:[N]}`. Unit test `edit-cascade.test.cjs` covers the Case 1/2 discriminator.
> - **Delta C** — "Re-translate & rebuild" modal in `src/views/production/SeedEditor.vue` (per-seed target cell), shows the Case 1/2 result + blast radius.
> - **Delta D** — "Missing audio only" filter in `src/views/production/ScriptViewer.vue` (intros included).
>
> **Dry run:** `POST …/edit-cascade { dryRun: true, … }` reports the full plan — Case 1/2,
> vocab added/removed, deletion footprint, an audio estimate, and the **exact** downstream blast
> radius (via a non-mutating `override` on `/v2/validate`) — with zero DB writes and zero TTS.
> Surfaced in the Seed Editor modal as a "Preview (dry run)" button.
>
> **Follow-up:** `autoDecompose` currently updates the target and returns a re-decomposition
> brief for an agent/editor to resubmit with `legos`. One-click auto-spawn of the decomposition
> agent (reusing the build pipeline) is the remaining piece; the ready-breakdown path is fully wired.

**Status (original):** ready to implement. Authored 2026-06-21 from a design session with Tom.
**Scope:** dashboard repo (`ssi-dashboard-v7-clean`) — course-builder service + production dashboard frontend.
**Guiding principle:** an edit should trigger a *surgical, scoped* regeneration + re-validation — never a full-course rebuild. Almost everything needed already exists; this is mostly wiring + four small additive pieces.

> ⚠️ Verify every file/line reference below against current code before relying on it — line numbers drift. The reasoning is the source of truth, not the line numbers.

---

## 1. The problem

Aran (and other editors) need to change content in a live course:

- **Edit a phrase** — already solved. The script-view **Edit Phrase modal** (`/production/:code/script`) lets you change Known/Target text, pick *which roles to regenerate*, and on save it regenerates exactly those roles' audio (auto-approved, auditionable). Keep this; it's the model.
- **Edit a LEGO and/or a SEED** — *not* solved. These have knock-ons: re-decomposition regenerates the seed's phrases, intros must be regenerated, audio must be (re)made, and — critically — **downstream phrases may break.** The seed editor (`/production/:code/seeds`) today only writes the text and does none of this.

This spec makes LEGO/seed edits as safe as phrase edits, with a correctly-scoped cascade.

---

## 2. The model (the crux — read this first)

### 2a. How validity actually works
The course-builder validates phrases by **chunk-tiling**, not a flat word list and not LEGO ids.

- `vocabSet` = **the set of complete LEGO targets PLUS their component targets** (normalized).
  - Built in `services/course-builder/lib/vocab-cache.cjs` → `loadCourseVocab` via `extractVocab(lego.target_text)` (+ components). `extractVocab` returns the *whole normalized string* as one unit (`services/course-builder/lib/text-normalization.cjs`).
- A phrase is valid iff its target can be **tiled end-to-end from those chunks** — DP word-sequence match (DP *character*-sequence for zh/ja). No word-level splitting, no free recombination.
  - Gate: `checkVocabViolations(phrases, vocabSet, courseCode)` in `services/course-builder/lib/validation.cjs` (~line 250). Returns `[{ phrase, unknown: [...] }]`.
- Seed structural validity: `checkTiling(seedTarget, legos, courseCode, existingVocab)` (~line 101) — every word of the seed target must be covered by its LEGOs/components.
- ZUT (one known prompt → one target form), phrase complexity, balance, known-side: also in `validation.cjs` (`checkPhraseComplexity`, `checkKnownSide`, `checkPhraseBalance`).

### 2b. The two cases (this is what makes the cascade scoped)

**Case 1 — vocab-preserving edit** (a pure re-decomposition, or a reword that uses the same word-forms).
The seed's introduced **chunk set down to the word level is unchanged** — every M-LEGO still contributes its component words. So any downstream phrase that tiled before can still tile.
→ **Blast radius = the edited seed only.** Downstream is provably safe; **do not touch it.**

**Case 2 — vocab-changing edit** (the new target adds / removes / alters a word-form).
The chunk set changes; any downstream phrase that tiled *through* a now-missing chunk fails.
→ **Blast radius = the edited seed + the specific downstream phrases that used the changed vocab.** Bounded and *detectable* — `checkVocabViolations` against the new cumulative vocab returns exactly those phrases.

**Discriminator:** diff the edited seed's vocab-unit contribution (its LEGO targets + components, normalized) **before vs after**. Equal set → Case 1. Different → Case 2.

### 2c. Intros (presentations)
Intros are **per-LEGO** ("The Croatian for 'X' is:"). *Any* LEGO change (Case 1 or 2) means regenerate the intro text + audio for the new/changed LEGOs. Tightly scoped to the touched LEGOs. `services/presentation-service.cjs` builds the text; the audio is the `presentation` role.

### 2d. Audio: absence IS the signal
There is **no "render this list of clips" endpoint** — and we don't need one. Phase 8's `/generate` is **"Generate Missing Audio"**: it only renders text rows whose audio is null, and rows that already have audio are bind-only (no TTS spend) — see `services/production-api.cjs` (search "MISSING audio, not regenerates" ~4776; "toLink" ~3650; missing-audio-details endpoint ~5616).

So the audio step is trivial **provided changed content becomes null-audio**:
- `/v2/decompose` already does delete-and-recreate of a seed's LEGOs/phrases → new rows have null `*_audio_id` → caught automatically.
- The only leak is an **in-place text edit** that keeps the row's old `audio_id` (now pointing at a stale clip). **Rule: any row whose text you change, null its audio_id.** Then Generate Missing Audio does the rest.

---

## 3. What already exists (reuse — do NOT rebuild)

| Capability | Where |
|---|---|
| Validation gates (tiling, vocab-tiling, ZUT, complexity, known-side, balance) | `services/course-builder/lib/validation.cjs` |
| Vocab set builder + cache | `services/course-builder/lib/vocab-cache.cjs` |
| Single-seed submit + gates | `services/course-builder/routes/seed-complete.cjs` (`POST /api/seed/complete`) |
| Re-decompose a seed (delete old LEGOs/phrases, write new) | `services/course-builder/routes/v2.cjs` `POST /v2/decompose` (refuses if `decomposed_at` set) |
| Generate phrases for a seed's LEGOs | `services/course-builder/routes/v2.cjs` `POST /v2/phrases/:courseCode` |
| **Full-course cumulative re-validation sweep** | `services/course-builder/routes/v2.cjs` `POST /v2/validate/:courseCode` (~814) — walks all seeds in order, builds `cumulativeVocab`, re-checks tiling + vocab + containment + phrase-count per seed; returns per-seed failures |
| Generate Missing Audio (only null-audio rows) + missing-audio-details | `services/production-api.cjs` (Phase-8 `/generate`; `/api/audio/regenerate-role`; `/api/audio/regenerate-single`; missing-audio details ~5616) |
| Presentation/intro text builder | `services/presentation-service.cjs` |
| Edit Phrase modal (role-scoped regen on text change) | production dashboard script view (`src/views/production/ScriptViewer.vue` + components) |
| Seed editor save (text only, no cascade) | `src/views/production/SeedEditor.vue` `saveEdit()` → `POST /api/course/:code/translate` |
| Per-item `hasAudio` flag + "awaiting audio" amber + learner/production toggle | `src/views/production/components/LearningJourneyView.vue` (`item.hasAudio`, amber at ~717 exempts intros) + `src/views/production/ScriptViewer.vue` (`learnerAudioView`) |

---

## 4. What to build (the deltas — all additive)

### Delta A — `fromSeed` scope on `/v2/validate/:courseCode`
Extend the existing handler (`v2.cjs` ~814) to accept an optional body `{ fromSeed?: number }` (default 0 = today's full-course behaviour, unchanged byte-for-byte).

- Lift the existing loop body (the per-seed checks ~873–931) and the vocab accumulation (~881–888) into two helpers `runSeedChecks(...)` and `accumulate(seedLegos, cumulativeVocab, chinese)` — **no logic change.**
- New loop:
  ```js
  for (const seed of seeds) {
    const seedLegos = legosBySeed[seed.seed_number] || [];
    if (seed.seed_number < fromSeed) {       // prefix: provably unaffected
      accumulate(seedLegos, cumulativeVocab, chinese);   // vocab only, no checks
      seedsSkipped++; continue;
    }
    const issues = runSeedChecks(seed, seedLegos, phrasesByLegoKey, cumulativeVocab, courseCode, chinese);
    accumulate(seedLegos, cumulativeVocab, chinese);      // preserve tile-then-add order
    issues.length ? failures.push({ seed: seed.seed_number, issues }) : seedsPassed++;
  }
  ```
- Response adds `scope: fromSeed ? { fromSeed, seedsSkipped } : 'full'`. `failures` is the **blast-radius report**.
- **Case-1 short-circuit (optional but cheap & high-value):** if the edit's vocab-unit set is unchanged, skip the walk entirely and validate only the edited seed.

### Delta B — the edit-cascade orchestrator
A thin server-side flow (new route, e.g. `POST /api/course/:code/edit-cascade` or fold into the seed/lego save). On a LEGO/seed edit at seed N:

```
1. write the new text (existing /translate, or seed/lego update)
2. null the audio_id of any row whose text changed         // Rule §2d
3. if structural (LEGO/seed target changed):
     reset decomposed_at for seed N                          // so /v2/decompose won't refuse
     POST /v2/decompose            (seed N)                   // delete+recreate LEGOs/phrases → null audio
     POST /v2/phrases/:code        (seed N)
     regen intros for seed N's new/changed LEGOs             // presentation-service → null audio
4. POST Phase-8 Generate Missing Audio (course)             // renders only the null-audio rows
5. vocab-delta(seed N) unchanged ?
     → validate seed N only            (Case 1, O(1) downstream)
     : → POST /v2/validate { fromSeed: N }   (Case 2 → failures = blast radius)
6. surface failures to the editor (list of broken downstream phrases to fix/accept)
```
Phrase-only edits keep using the existing Edit Phrase modal path (no decompose, no downstream walk).

### Delta C — extend the Edit modal from phrases to LEGOs/seeds
Reuse the **exact** "which roles to regenerate" modal UX (`src/views/production/`), but for a LEGO/seed edit the Save triggers Delta B instead of a single-phrase regen. Show the returned blast-radius failures (Case 2) inline so the editor sees what they broke before committing.

### Delta D — "Missing audio only" filter in the script view
In `ScriptViewer.vue` + `LearningJourneyView.vue`:
- Add a filter state (e.g. `missingAudioOnly`) and a toggle next to the existing learner/production toggle.
- When on: use the **production-view** data (don't drop awaiting-audio), and filter items to `!item.hasAudio`, keeping only rounds that still have items. This is the inverse of the existing `learnerAudioView` drop.
- **Include intros:** drop the `item.type !== 'intro'` exemption (LearningJourneyView ~717) for this filter, so intros awaiting audio are surfaced too.
- Purpose: flick through every pending item (phrases + intros) before triggering Generate Missing Audio.

---

## 5. Gotchas / soft spots (learned the hard way)
- **`/v2/decompose` refuses if `decomposed_at` is set** — the cascade must reset it first (step 3).
- **No list-of-clips audio endpoint** — rely on Generate Missing Audio + the null-audio rule. Do not invent a clip-list renderer.
- **In-place text edits keep stale audio_id** — must null it; the decompose delete-recreate path avoids this for structural edits but not for an in-place phrase tweak.
- **Tile-then-add ordering** in the validate loop matters (a seed is checked against vocab from *prior* seeds, then its own vocab is added) — preserve it when extracting helpers.
- **Concurrent editing / multi-checkout** — the dashboard repo has parallel sessions; branch hygiene per CLAUDE.md.

---

## 6. Acceptance criteria
1. **Case 1** (re-decompose seed N, same words): only seed N's LEGOs/phrases/intros regen; `*_audio_id` of those rows become non-null after Generate Missing Audio; `/v2/validate?fromSeed=N` returns no failures; downstream rows untouched (unchanged `updated_at`).
2. **Case 2** (seed N target departs, removes a word used later): `/v2/validate?fromSeed=N` returns failures listing exactly the downstream phrases that no longer tile; nothing before N is reported.
3. **Generate Missing Audio** renders only rows with null audio (TTS spend == count of new clips, not the whole course).
4. **Missing-audio filter** shows only `!hasAudio` items, intros included; toggling back restores the full view.
5. **Edit modal** for a LEGO/seed runs the cascade and shows the blast radius before save is final.
6. Full-course `/v2/validate` (no `fromSeed`) behaviour is **unchanged**.

---

## 7. Suggested build order
1. **Delta A** (`fromSeed` patch) — pure, testable, no UI. Unit-test the prefix-skip == full-walk equivalence for `fromSeed=0`.
2. **Delta D** (missing-audio filter) — self-contained UI, immediately useful for content QA even before the cascade exists.
3. **Delta B** (orchestrator) — wire the existing endpoints in order; add the null-audio rule + decompose reset.
4. **Delta C** (modal extension) — surface it in the editor.
