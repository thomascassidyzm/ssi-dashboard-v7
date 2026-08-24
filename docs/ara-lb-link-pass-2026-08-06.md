# ara_lb_for_eng — the 1,324 free links, bound

**2026-08-06. Link-only pass. No TTS, no generation, no deletion, no spend.**

Follow-on from `docs/ara-lb-audio-reconciliation-2026-08-06.md` (commit `577b3111`).

---

## Result in one line

**All 1,324 present-but-unlinked slots are now bound. Unlinked: 1,324 → 0. Nothing was generated,
nothing was deleted, and the TTS backlog is unchanged at 20,757 jobs.**

---

## Before / after

Independent census (mine), and the live `phase8 /needs` endpoint, both run either side of the pass:

| Measure | Before | After | Δ |
|---|---|---|---|
| **Text slots linked** (my census) | 19,295 | **20,619** | **+1,324** |
| **Present-but-unlinked** | 1,324 | **0** | −1,324 |
| Genuinely absent | 23,022 | 23,022 | **0 — untouched** |
| `/needs` → `toLink` | 1,324 | **0** | −1,324 |
| `/needs` → `ledger.linked` (incl. presentations) | 19,933 | **21,257** | +1,324 |
| `/needs` → `toGenerate` (TTS jobs) | 19,474 | 19,474 | **0** |
| `/needs` → `toAuthor` (narrations) | 1,283 | 1,283 | **0** |
| `/needs` → `ledger.ttsJobs` | 20,757 | 20,757 | **0** |
| `storageBroken` | 0 | 0 | 0 |

The two independent counts reconcile exactly, before and after. The absent bucket is bit-identical
per table/role/band — the pass could not have touched it and demonstrably didn't.

By role, all 1,324: **known 312 / target1 506 / target2 506** — exactly the investigation's
breakdown and exactly `/needs`' own `unlinkedBreakdown`.

---

## Why they were unlinked, and the trap

The linker keys on `normalizeForAudio(text)|language|role`. This course stores its target audio under
language **`ara`**, not `ara_lb` — and correctly so: `courses.target_lang` for `ara_lb_for_eng` **is
`ara`**. The service reads the language from that column, so the service was never wrong; the trap is
for ad-hoc scripts that derive the language from the course code's suffix, which match zero target
rows and silently report three quarters of the set as absent. Every script in this pass reads the
`courses` row.

The rows were unlinked simply because no link pass had run over seeds 301+ since those slots were
authored. Every one is a repeated text — `she doesn't want`, `book`, `فيك`, `مش مشكلة` — already
rendered and bound at a lower seed in this course's own voices.

---

## Verification — three gates before any write, all 1,324 passing

Nothing was written until every candidate cleared all three:

1. **Text (G1)** — `normalizeForAudio(slot text)` **exactly equals** `normalizeForAudio(audio.text)`.
   Exact normalized equality, not fuzzy or similarity matching; `?` is preserved, so a question
   never binds to a statement recording. **1,324/1,324 pass.**
2. **Voice (G2)** — the audio row's `language` and `voice_id` match `courses.voice_config` for that
   role: known → `en-GB-SoniaNeural`, target1 → `ar-LB-LaylaNeural`, target2 → `ar-LB-RamiNeural`.
   No cross-voice or cross-course binding is possible. **1,324/1,324 pass.**
3. **Asset (G3)** — S3 `HeadObject` on the 572 distinct objects the 1,324 slots resolve to, in
   `ssi-audio-stage`; all present, all > 1 KB. **572/572 good, 0 missing.**

Make-before-break discipline, in a pass that deletes nothing: the asset was proven alive **before**
the FK was written, not after.

**Write hygiene:** dry run first; a structural guard refusing any table or column outside the three
audio FKs; a per-row before-state assertion (`.is(col, null)` on the update, so a row that moved
under a concurrent agent is skipped rather than overwritten); every row logged. Result:
**1,324 linked, 0 skipped-drift, 0 errors.**

---

## Verified through the round-generation path, not just the DB

A round is delivered only when its debut LEGO has all three text-role clips
(`playerDelivers = missingAudioRoles(lego).length === 0`, `services/learning-script-generator.cjs`).

Before the pass, **every** LEGO at seed 301+ had all three columns NULL — so every round from 639
onward dropped. After the pass, **94 LEGOs at seed 301+ carry all three clips**, of which **13 are
debut rounds**. All 13 were fetched from the live journey endpoint and all 13 now report
`playerDelivers: true`:

> 641 · 735 · 789 · 851 · 886 · 897 · 948 · 1000 · 1009 · 1014 · 1143 · 1344 · 1355

Control: round **639** (`S0301L01`, "to show") still reports `playerDelivers: false`,
`playerDropReason: 'lego-audio'` — its audio is genuinely absent and was correctly left alone.

`course_round_index` carries only `lego_id / seed_number / lego_index` — no audio columns — so the
materialised view needed no refresh for these links to reach the player.

**Honest caveat, worth Tom's eye and not acted on:** those 13 rounds now *open*, but most of their
items are still silent — 2 to 10 deliverable items out of 23. The links are free and lose nothing,
but "the round delivers" is not "the round is good". Whether a 2-of-23 round is better than a
dropped round is a product call, not an inference.

---

## Scope held

- **The 20,757 genuinely-absent jobs** (19,474 TTS + 1,283 to author): untouched, count unchanged.
  No approval gate was approached.
- **The 12 real gaps inside seeds 1–300** (including S223L1): untouched. They need TTS and are
  claimed on WORKLIST by another agent.
  - Four of the 1,324 sit at seed ≤ 300: the target1/target2 slots of `S0065L01U06` ("مهم") and
    `S0164L01U07` ("كتاب"). These are the two rows the investigation recorded as *"known ABSENT,
    targets UNLINKED"* — the unlinked targets are part of the 1,324 by definition, so they were
    bound. Their **absent known side was not touched** and those gaps remain open and flagged.
- **No TTS was spent. £0.00.** No generation endpoint was called; `toGenerate` is identical
  before and after.

---

## Method

- Scripts: `scripts/ara-link/{census,verify-candidates,apply}.cjs` (gitignored workspace), with
  `candidates.json`, `verified.json`, `verify-report.json`, `dryrun-log.json`, `apply-log.json`
  retained as the per-row audit trail.
- Matching key and preference logic taken from the service itself —
  `services/shared/text-normalize.cjs` and `services/shared/audio-link-preference.cjs` (human >
  newest > deterministic tiebreak) — never reimplemented.
- Live cross-checks: `GET localhost:3465/needs/ara_lb_for_eng` and
  `GET localhost:3470/api/production/ara_lb_for_eng/learning-journey?maxLegos=1&offset=<round-1>`.
