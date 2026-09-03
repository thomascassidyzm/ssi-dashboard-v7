# 'as in' clause removal — scoping (2026-08-06)

**SCOPING ONLY — no text edited, no audio generated.**

## Numbers first

- **deu_for_eng + fra_for_eng, seed 1 only:** 14 live clips would need regenerating (9 + 5), 985 chars total.
- **General case (every course, seed 1 only):** 82 courses confirmed affected, 534 live clips, 29,651 chars — plus 2 courses (`zho_for_gle`, `cym_for_yor`) flagged as an unresolved gap below, so the true ceiling is 82–84 courses.
- **Money:** at the one documented xAI rate in this repo ($15/1M chars), the general case costs **≈$0.44** in TTS. This is a rounding error, not a budget decision — the real cost is workflow (regen + veracity + relink), not spend.
- **Mechanism:** the "no context clause" version (Frame A) already exists in shipping code today — this is a small code change (force Frame A for seed 1), not new engineering.
- **Storage:** the phrasing is a generation-time render, not stored anywhere as authored text — nothing to bulk-edit, only clips to regenerate.

---

## 1. Where the 'as in' string comes from

**Assembled at generation time from a stored template, not baked into any content column.**

- Template lives in `presentation_templates` (`known_lang`, `template`, `priority`, `is_active`). For English-known courses, active row (priority 10):
  `"The {target_lang_name} for: '{known}', as in — '{seed}', is:"`
- Rendered by `renderIntro()` — `services/phases/presentation-author.cjs:120-128` — which fills `{target_lang_name}`, `{known}`, `{seed}` into either the full template (**Frame B**, with context) or a version with the clause stripped (**Frame A**, bare) via `stripSeedClause()` at `services/phases/presentation-author.cjs:111-117`.
- **The Frame A/B choice per LEGO is already an existing feature.** `judgeBatch()` (`presentation-author.cjs:146-192`) asks Sonnet, per LEGO, whether the intro needs the context sentence; `authorPresentations()` (`presentation-author.cjs:202-233`) renders whichever frame was chosen and that's what gets sent to TTS and stored as `course_audio.text`.
- Called from the current audio pipeline: `services/phases/phase8-audio-v13.cjs:1867` (`presentationAuthor.authorPresentations(...)`).

**Other code paths checked, and ruled out as the producer of the live rows:**
- `tools/generators/phase6-generate-introductions.cjs` and `services/phases/phase2-conflict-resolution/generate-introductions.cjs` both build the same-shaped string, but neither is `require()`'d by anything else in the repo (each only self-references in a doc comment) and both read from the legacy `public/vfs/courses/<course>` JSON path, not Supabase. Dead code for this course generation, confirmed by `git log`: last touched 2025-12-19 / on a legacy manifest branch, no callers.
- `tools/repair-presentation-clips.cjs` (the tool referenced as bypassing the phase8 parenthetical guard) does **not** independently generate the "as in" text — it re-renders `row.text`, the *existing* stored text, verbatim (`p8.masterAudio(audioBuffer, row.text)`, line 148) when repairing a damaged clip. It changes bytes, not wording.

**Conclusion: one producer, `presentation-author.cjs` → `phase8-audio-v13.cjs`. The template is a DB row, not a hardcoded string; changing seed 1's behaviour means changing which frame is chosen for seed 1, not editing prose anywhere.**

---

## 2. Rows that would change — deu_for_eng and fra_for_eng, seed 1

Live status resolved via `course_legos.presentation_audio_id` / `course_practice_phrases.presentation_audio_id` (not `course_audio.lego_id`, which is frequently null), per the brief.

| Course | Live presentation rows, seed 1 | ...with 'as in' clause | Superseded (text-marked) rows sharing that text | Chars (live, as-in) |
|---|---|---|---|---|
| deu_for_eng | 9 (5 lego-linked, 4 phrase-linked) | **9 (all of them)** | 17 course-wide (any seed), 0 within these 9's own text | 604 |
| fra_for_eng | 5 (5 lego-linked, 0 phrase-linked) | **5 (all of them)** | 0 course-wide | 381 |

**Content rows (course_legos / course_practice_phrases):** 0 rows in either course store the 'as in' phrasing directly — checked `known_text` and `target_text` for seed 1 in both tables, no hits. Confirms §1: the phrasing exists only inside `course_audio.text`, never in an authored content column.

**Anomaly found, not fixed (out of the scoping mandate, flagging for separate attention):** 4 of the 9 deu_for_eng live rows have `presentation_audio_id` pointing at a `course_audio` row whose own `text` carries a `::superseded-regen` marker — i.e., the pointer that determines what a learner actually hears currently resolves to a row that was tombstoned by a prior repair run and, per that tool's own design (`tools/repair-presentation-clips.cjs`), should have been repointed away from before deletion. Whether these 4 are mid-repair or a completed-but-not-fully-repointed run, I did not investigate further — it's adjacent to this question, not part of it, and I did not want to touch anything. IDs: `7e0cf53a…`, `6acc507c…`, `3b8b7eb6…`, `b73047e9…` (full IDs in the query output, not reproduced here).

---

## 3. Clips needing regeneration

- **Seed 1 of deu_for_eng:** 9 clips.
- **Seed 1 of fra_for_eng:** 5 clips.
- **Total for the two courses Tom is being asked about:** **14 clips.**

**General case — every course, seed 1, dropping 'as in' everywhere it appears:**
Detection generalised past English: pulled every known-language's active `presentation_templates.template`, extracted the literal connector text between `{known}` and `{seed}` (e.g. eng `", as in — '"`, deu `"' — wie in — '"`, fra `"' — comme dans — '"`, ara `"' — كما في — '"`, jpn `"、「"`, etc. — 24 known-languages had a connector-bearing template), then counted live seed-1 rows containing that connector.

- **82 courses** have at least one live seed-1 clip with the context clause.
- **534 live clips** total, **29,651 characters** total.
- **Gap:** 2 of the 143 courses in `courses` (`zho_for_gle`, `cym_for_yor`) have no active `presentation_templates` row for their known-language (`gle`, `yor`), so the connector-string method can't classify them automatically. `cym_for_yor` has zero live seed-1 presentation rows anyway (nothing to check). `zho_for_gle` has 5 live seed-1 rows, at least one of which reads as containing a context clause on manual inspection (`"...mar atá sa teanga Shínis, ná:"`) but doesn't match the standard quoted-`{seed}` shape the other 24 languages use, so I did not force it into the automated count. **Named gap: the true general-case ceiling is 82 confirmed + up to 2 more (534 confirmed + up to 5 more clips) pending a by-hand read of those two.**

---

## 4. Money

**TTS provider:** xAI, for all 14 clips in scope. Confirmed via `course_audio.voice_id` (`eve` / `xai_eve`) — both xAI presets (`services/voice-discovery-service.cjs:187` lists `eve` as an xAI preset voice) and `origin='tts'` on every one of the 14 rows (no `origin='human'` rows in scope).

**Rate:** the only xAI rate documented anywhere in this repo is **$15 / 1M characters**, sourced to `docs.x.ai/docs/pricing` and pinned in `docs/course-optimization/audio-batch-fill-vs-regen-audit-2026-07-28.md:73` (commit `6b5e3bed`). I did not find an xAI rate in any config file — only in that prior scoping doc's prose — so treat the rate itself as "documented once in the repo," not "in code."

**Cost at that rate:**
- deu_for_eng + fra_for_eng seed 1: 985 chars → **≈$0.015** (1.5 cents).
- General case, all 82 courses: 29,651 chars → **≈$0.44**.

**Explicit gap:** Azure's rate *is* in code (`services/audio-generation-planner.cjs:24`, $4/1M neural chars) but none of the 14 in-scope clips are Azure-voiced, so it's not applicable here — noted only so it's clear I checked, not assumed.

The character counts above are the number to hand anyone who wants to apply a different rate; at any plausible TTS rate this remains cents, not a budget line.

---

## 5. Risk / side effects

- **Learning-app UI never displays the presentation text** — checked `ssi-learning-app/api/courses/[code]/{cycles,bundle}.ts` and `packages/player-vue/src/components/LearningPlayer.vue`: the app resolves and plays `presentation_audio_id` as audio only; there is no subtitle/caption render of the intro text anywhere in the player. Changing the wording changes what is *heard*, not any on-screen text.
- **Audio veracity checking is generic** — `services/audio-veracity.cjs` has no hardcoded expectation of "as in" or seed-quoting; it verifies whatever `course_audio.text` says against the transcript, so a Frame-A render passes the same way a Frame-B render does. No QA rule needs updating.
- **No tiling/display_tiling dependency** — `display_tiling` lives on `course_practice_phrases` for target-phrase rendering; presentation clips aren't tiled content, confirmed by schema (no `display_tiling` linkage found via `presentation_audio_id`).
- **`lego_introductions` stores only an audio pointer** (`lego_id`, `audio_uuid`, `presentation_audio_id`, `duration_ms`) — no text column, so no secondary text store to keep in sync.
- **What *would* need to change alongside the text:** nothing structural. The existing Frame A/B machinery (§1) already does exactly "bare intro, no context sentence" for LEGOs the Sonnet judge decides don't need it — making seed 1 bare *everywhere* is forcing `frame = 'A'` for `seed_number === 1` in the judgment/authoring step, then running the regen through the existing make-before-break repair path (`tools/repair-presentation-clips.cjs`, which already has the render→verify→repoint→delete ordering CLAUDE.md requires) or the standard `queue-audio-pass` flow.

---

## Explicit gaps (named, not papered over)

1. **2 courses' general-case status is unresolved by automation** (`zho_for_gle`, `cym_for_yor`) — no active `presentation_templates` row for `gle`/`yor` known-langs to derive a connector string from; needs a by-hand read of the ≤5 rows involved.
2. **4 deu_for_eng live rows point at text-tombstoned `course_audio` rows** — flagged as a pointer/repair-completeness anomaly, not investigated further since it's outside this question's scope; someone should look at it separately.
3. **xAI's rate is only documented in a prior doc's prose, not in a config/pricing file** — cited as found, not verified against x.ai's current published pricing today.

---

## Landing line

No commits. This is a read-only scoping report; nothing in the DB, `course_legos`, `course_practice_phrases`, or any template was modified. Scratch query scripts used to produce these numbers live at `scripts/as-in-scoping/` (gitignored, not committed).
