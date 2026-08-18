# Addendum: the reproduction, run against the shipped code — and the fan-out nobody has counted

2026-08-18, job #107. Successor to job #103, whose session died mid-flight.

**Read [`audio-regeneration-relink-probe-2026-08-18.md`](./audio-regeneration-relink-probe-2026-08-18.md) first — it is the report.** Its diagnosis is correct and this addendum does not restate it. This pass exists to do three things:

1. **Close its stated gap #5** — the one claim in the reproduction that did not rest on running real code.
2. **Land the evidence as repo-convention tests**, so the finding survives contact with future edits.
3. **Add the one number the estate is missing**, and one honest caveat about the proposed fix.

Nothing was applied. Nothing was merged. No audio row was touched anywhere. **TTS spend: £0.00** — the harness's TTS double throws if it is reached, so a regression that starts spending money fails a test rather than an invoice.

---

## 1. Gap #5 is closed: the defect reproduces against the SHIPPED `getAudioNeeds`

The main report says of its scenario F:

> **Scenario F asserts against a faithful re-implementation** of `getAudioNeeds` steps 1–2, not the shipped function — the one claim in the reproduction not resting on running real code.

`getAudioNeeds` is exported at `phase8-audio-v13.cjs:7275`, so it can be driven as itself. It now is. `services/phases/__fixtures__/phase8-sandbox.cjs` intercepts `Module._load` **before** requiring phase8 and substitutes `@supabase/supabase-js`, `@aws-sdk/client-s3` and `tts-service.cjs` — interception has to happen at load time because phase8 captures all three in module-closure `const`s (`:62-140`); there is no seam afterwards.

Fixture: a scratch course `zzz_for_qqq`, one lego, whose `target1` clip is the bad audio. Four presses of "Generate", varying only whether the slot is linked and whether the row exists:

| Scenario | unbound `target1` | `toLink` | `toGenerate` | TTS calls |
|---|---|---|---|---|
| **A.** bad clip still **LINKED** | **0** | 0 | **0** | 0 |
| **B.** unlinked only (workaround step 1) | 1 | **1** | **0** | 0 |
| **C.** unlinked **+ row deleted** (steps 1+2) | 1 | 0 | **1** | 0 |
| **D.** unlinked + `forceGenerate: true` | 1 | 0 | **1** | 0 |
| **D′.** still linked + `forceGenerate: true` | **0** | 0 | **0** | 0 |

**Scenario A is the whole finding in one row: a bad clip that is still linked is not counted as a problem at all.** Not regenerated, not relinked, not reported — `getAudioNeeds` returns `0 missing`. Scenario B is the re-link: the slot becomes a candidate and is handed straight back the same old row, free. Only C — the destructive step — produces a render.

**D′ is new and worth Tom's attention for proposal item 5.** `forceGenerate` bypasses layer 2 only. With the slot still linked, layer 1 (`.is(audioCol, null)`, `:649`) still wins and `toGenerate` is **0**. So an operator-facing force flag on `/generate`, as proposed, would **not** fix the primary case unless it also widens the selection query. The flag is necessary but not sufficient.

**OBSERVED**, all five rows, against the shipped function. This agrees exactly with scenario F of the replica, which is the point: the replica was faithful.

---

## 2. The tests, and where they live

`services/phases/phase8-regenerate-relink.test.cjs` — **6 tests, 6 passing** (`npx vitest run services/phases/phase8-regenerate-relink.test.cjs`, 404 ms).

These sit in the repo's normal test convention (`*.test.cjs`, vitest, picked up by `npm test`) rather than alongside the `node --test` harness in `tools/audio-regen-probe/`. That is deliberate and complementary, not duplicative:

| | `tools/audio-regen-probe/` (#105, committed) | `services/phases/phase8-regenerate-relink.test.cjs` (this pass) |
|---|---|---|
| Storage semantics | **real Postgres** (PGlite), live triggers, real UNIQUE index | in-memory double |
| `getAudioNeeds` | faithful replica | **the shipped function** |
| Runner | `node --test`, standalone | **`npm test` / vitest, with the suite** |

Each is the other's gap. Both should stay.

Supporting fixtures, new, used only by tests: `services/phases/__fixtures__/fake-supabase.cjs` (enforces the real unique index, models `ignoreDuplicates` honestly, and **throws on any chain shape it does not model** rather than quietly returning `[]`) and `services/phases/__fixtures__/phase8-sandbox.cjs`.

The last two tests hold both halves of the `ignoreDuplicates` correction: that an `ignoreDuplicates: true` upsert is a silent no-op, **and** that a merge-duplicates upsert genuinely replaces the bytes on the same row id. That correction is the easiest thing in this investigation to lose again, so it is now pinned by an assertion.

---

## 3. The number nobody has counted: clip fan-out

The main report's blast radius is measured in **flags** (40,884 flagged, 7,983 resolved). That is the right frame for proposal item 1. But the proposed fix swaps bytes **on a shared row**, and nothing has counted how many slots one row serves. Measured live, read-only, this pass:

| | |
|---|---|
| `course_audio` rows | **2,565,615** |
| already swapped this way (`audio_revision > 1`) | **254,686** (9.9%) |
| clips linked from ≥ 1 content slot | **1,983,359** |
| clips linked from **more than one slot** | **283,077** (14.3%) |
| worst single-clip fan-out | **108 slots** |
| clips spanning **more than one course** | **63** (max 2 courses) |
| links where the clip's `course_code` ≠ the linking course | **53** |

Two readings, both useful:

- **The repair path is proven at scale.** 254,686 rows have already been through a same-id/new-bytes swap. This is not a proposal being sold on a design document.
- **One accept can change up to 108 slots at once.** For 283,077 clips (14.3% of linked audio) an accept changes 2 or more slots simultaneously. That is usually *correct* — the same sentence should sound the same everywhere — but it is not what "repair this clip" sounds like, and neither the API response nor `AudioRepairPanel.vue` tells the operator the count before they press accept. `accept()` already computes it (`linkCensus`, `:661`) and returns it as `links` **after** the swap. **Surfacing that count in `preview` instead would be a small change and is worth doing before the flow becomes the default replace path.**

Cross-course leakage is negligible: 63 clips, never more than 2 courses.

*This corrects a stored memory* claiming one `jpn` clip was `known_audio_id` for `S0089L03` across 21 courses. Today's live maximum, across every content table, is **2 courses**. Either it was swept since, or the original measurement was wrong — **I did not determine which, and have not deleted the memory on the strength of one query.**

---

## 4. One caveat on the proposed fix, stated carefully

`linkCensus` (`audio-repair-core.cjs:287`) is the CASCADE assertion — `accept` fails closed if the census moves across the swap (`:741-747`). It counts `lego_introductions.presentation_audio_id`, `course_legos.presentation_audio_id`, and `DURATION_HOLDERS`: `target1`/`target2` on `course_legos` and `course_practice_phrases`, plus `lego_introductions`.

**It counts no `known_audio_id` column, and no `course_seeds` row at all** — and `course_seeds` alone has **44,211** rows with a non-NULL `known_audio_id`. So the guard is narrower than it reads: damage to known-side or seed-side links would not trip it.

**How much this matters, honestly: probably not much.** The swap is an `UPDATE` of non-key columns on a stable id, and `accept` separately asserts the id never moves (`:730`). I know of no mechanism by which it could drop a known-side link, and I did not find one. This is a **weaker assertion than it appears**, not a live defect — worth widening while the file is open, not worth blocking on.

**I also checked and withdrew a stronger version of this claim:** there are no `known_duration_ms` or `course_seeds.*_duration_ms` columns in the live schema, so `syncDenormalisedDurations` (`:757`) is *complete* — there is no known-side duration to go stale. The omission is in the assertion only.

---

## 5. What this pass did not settle

- **The cache-staleness layer is still not reproduced end-to-end.** Both ends are confirmed by reading — the render payload omits `audio_revision` (`:2415-2439`), the header is `public, max-age=31536000, immutable` (`services/shared/audio-cache-control.cjs`), and the learner app keys its URL on that column (`ssi-learning-app/api/_utils/audioAccess.ts:205,230,295`). No browser was driven through a stale fetch. **INFERRED, not reproduced** — and it is the layer most likely to be what Kai actually experienced.
- **The two hard breakages reported by #104** — `/regenerate-single` throwing a `ReferenceError` after the money is spent, and the flagged-clip button proxying to an endpoint that does not regenerate — **were not independently verified by me.** They are the main report's proposal items 1 and 2. Check them before relying on either control.
- **No census of the defect itself.** Unchanged from the main report: `course_audio` has no `updated_at` and no batch id, so a silent no-op leaves no trace on the row.
- **The 21-courses/2-courses discrepancy** (§3) is unresolved.
- The live database still runs trigger code from an **unmerged** branch. Any fix must be written against live definitions, not the repo's — the main report's unknown #1, restated here because it is the trap most likely to bite whoever implements this.

---

*Artefacts: `.a74-scratch/regen-finish/` (this pass), `.a74-scratch/regen-code-trace/trace.md` (#104), `.a74-scratch/regen-repro/REPRO.md` (#105), `.a74-scratch/regen-forensics/forensics.md` (#106).*
