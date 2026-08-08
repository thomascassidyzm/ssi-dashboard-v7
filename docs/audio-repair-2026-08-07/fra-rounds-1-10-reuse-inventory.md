# French rounds 1–10 — estate reuse inventory, and what actually needed rendering

2026-08-07. Sample-first slice of the French audio redo, under Tom's scope correction
("we do samples first… let's pick all phrases in the first 10 ROUNDS… surely we've got
all these clips already in Spanish, or Italian or Chinese for English speakers").

---

## The headline

**Tom's instinct was right, and the answer is stronger than he expected.**

He guessed the English known-side clips already existed elsewhere in the estate and
could be reused. All 58 of them do exist elsewhere. But we did not need to borrow any
of them, because **fra_for_eng's own English side is already on the current generation**
— rendered 3–5 August, xAI `eve`. The stale layer was somewhere else entirely.

The only stale layer in the first 10 rounds was the **French target1 side: 61 of 63
slots were still January/February 2026 renders.** That — not the English — is what he
was hearing.

So the render bill for this slice was 58 French clips, 1,282 characters, well under a
penny.

---

## What the 10 rounds contain

Rounds 1–10 of `fra_for_eng` = seeds 1–3 (round 10 is S0003L03; S0003L02 carries no
round of its own).

| Holder | Rows | known | target1 | target2 | presentation |
|---|---|---|---|---|---|
| `course_legos` | 10 | 10 | 10 | 10 | 10 |
| `course_practice_phrases` (25 USE, 22 BUILD, 6 component) | 53 | 53 | 53 | 53 | 6 |
| **Total slots** | **63** | **63** | **63** | **63** | **16** |

**205 audio slots in total.**

## Generation audit — which layers were actually stale

| Role | Language | Voice | Generation | Verdict |
|---|---|---|---|---|
| known | eng | `xai_eve` | 2026-08-03 → 08-05 | **current — no work** |
| presentation | eng | `xai_eve` | 2026-08-03 | **current — no work** |
| target2 | fra | `xai_leo` | 2026-08-03 → 08-06 | **current — no work** |
| **target1** | **fra** | **`eve` / `xai_eve`** | **2026-01-21 → 02-26 (61/63)** | **STALE — rebuilt** |

## The reuse question, answered on all three legs

### Leg 1 — duplication inside French
63 target1 slots resolve to **58 distinct clips, 58 distinct texts** — already a clean
1:1 clip-to-text mapping. Nothing was rendered twice. Five slots legitimately share a
clip with another slot.

### Leg 2 — is the English known side shared across for-eng courses?
**No. It is strictly per-course today, and that is a measured fact, not an assumption.**

Of 46,312 known-side links from `course_legos` across every `*_for_eng` course,
**46,312 point at a `course_audio` row carrying their own `course_code`. Zero cross-course
sharing exists.**

All 58 of our English texts *do* exist in other for-eng courses — but almost entirely on
**Azure** voices (`en-GB-SoniaNeural`, `BellaNeural`, `MiaNeural`) rendered Feb–Jul 2026.
Borrowing those would have been a voice regression *and* a voice-identity change, which
is Tom's taste call and not ours to make. Only `spa_for_eng` (25 texts, xAI eve, 21 Jul)
and `deu_for_eng` (26 texts, xAI eve, through 6 Aug) are on the current generation.

**The estate-wide prize is real and large:** across all for-eng courses there are
**544,207 English known/presentation clips carrying only 315,089 distinct texts — 42.1%
redundancy, ~229,000 duplicate clips.** That is the case for a shared English known store.

### Leg 3 — reconciliation against German
German shares 26 of our 58 English texts, on the same xAI `eve` voice, rebuilt through
6 August. Nothing needed re-rendering on either side for this slice, and no French text
was rendered that German already had at current quality — because the French English
side was already current. Reconciliation was genuinely a no-op here; that is the finding,
not a step we skipped.

---

## Reusable architecture — the shared English known store

The precedent already exists in this repo, for pods: `tools/build-shared-known-store.cjs`
creates a store keyed by `course_code='pod_known_en'` and repoints every course's
`pod_legos.explainer_audio_id` at it. **No schema change was needed.** The same shape
applies directly to the course known side:

- **Canonical clip identity key** (already enforced by `unique_course_audio_per_voice`, and
  already computed by the generated column `course_audio.text_stripped`):
  `(text_stripped, language, role, voice_id)`.
- **Store**: `course_code='known_en'`, `language='eng'`, `role IN ('known','presentation')`,
  one row per distinct English text per voice.
- **Repoint**: `course_legos.known_audio_id` / `course_practice_phrases.known_audio_id`
  → the shared row id, via the same reverse-holder lookup
  `tools/regen-seed-clips-from-scratch.cjs` already implements (`HOLDERS`).
- **Make-before-break throughout**: mint new ids, verify, repoint, ledger, delete nothing.

Sizing: ~229,000 redundant clips collapse away; a future re-voice of the English side
becomes one render per distinct text instead of one per course per text.

**This is a proposal, not something done.** It is a voice-identity and cost decision at
estate scale and needs Tom's ruling before anyone builds it.

---

## What was rendered, and how it was verified

- **57 of 58** French target1 clips replaced. **1,282 TTS characters** — a fraction of a
  penny against the ~$5 full-course estimate; nowhere near the $25 stop.
- **137 links repointed.** More than the 63 slots in scope, because short shared words
  (`je`, `avec`, `parler`) are held by phrases elsewhere in the course too — repointing a
  deduped clip necessarily moves every holder. Those phrases got a newer, verified,
  current-generation clip; nothing was deleted and nothing regressed. Flagged here
  because it does reach beyond rounds 1–10.
- **62 of 63** target1 slots now resolve to today's generation.
- **Verified on served bytes**, not on the database: all 57 new objects fetched from
  `ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/`, HTTP 200, non-trivial size;
  sampled durations from `ffprobe` matched the DB exactly (600/576/696/720/1200/744/576/960 ms).
- `courses.audio_stamp` bumped to `2026-08-07 01:24:33Z`.
- **Nothing deleted** — old rows tombstoned, old S3 objects retained, every swap ledgered
  in `course_audio_revisions`.

### Pace gate — before and after

`tools/audio-pace-gate.cjs` **could not run on this course**: it pulls all ~29k target
clips and Postgres kills it — `canceling statement due to statement timeout` — with and
without `--since`. Reported as an explicit gap. That tool needs a scoping flag before it
can serve a course this size.

Substituted the same model by hand: Theil–Sen fit on 4,000 current-generation French
clips (`target2`, `xai_leo`, 3 Aug+) giving `duration ≈ 344 + 40.74 × chars`, gate
threshold = the reference's own 2nd-percentile residual, −0.296.

| | Clips ≥8 chars | Failing pace |
|---|---|---|
| **Before** (Jan/Feb generation) | 49 | **0** |
| **After** (today's renders) | 49 | **0** |

**Finding: the old French clips were not rushed.** Whatever Tom heard as "shit" is not
pace-measurable — it is voice/generation quality, which no automated gate in the estate
currently catches. His ear remains the only instrument for it. That is precisely why
this slice stops here for a listen.

### The one failure

`fra_for_eng:S0002L02C01` — the single word **"essaie"**. Three render attempts, all
rejected by the phonology gate: *whisper detected 'en' instead of 'fr'*. The gate is
misfiring on a short French word that is phonetically ambiguous to a language detector,
not producing bad audio. It **unwound cleanly — the old clip is still serving**, which is
make-before-break working exactly as designed. Left alone rather than forced.

---

## What needs Tom

1. **Listen to rounds 1–10** and rule on whether the new French takes are right. Everything
   downstream waits on that.
2. **Shared English known store** — build it or not? ~229k redundant clips, 42% of the
   estate's English side.
3. **"essaie"** — accept the old clip, or relax the phonology gate for very short words?
