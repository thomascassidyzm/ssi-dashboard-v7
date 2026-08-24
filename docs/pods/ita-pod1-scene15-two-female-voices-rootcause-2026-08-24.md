# ita_for_eng Pod 1 scene 15 — why there are two female voices

Root-cause finding, 2026-08-24. Tom heard the defect live at 10:53Z.

> **STATUS: REPAIRED AND VERIFIED ON PRODUCTION.** 113 of the 231 rows on the live
> Italian pod were affected, across scenes 1-15. All 113 were repaired in place at
> ~11:20Z by `tools/pods/repair-split-array-inheritance.cjs`. Post-repair audit:
> **231/231 rows clean**. Verified by served bytes on scene 9 — Ara at 190-229 Hz on
> Diner 1/Diner 2, Enzo at 99-119 Hz on Waiter/Narrator: exactly two voices, correctly
> cast. No audio was rendered, no clip deleted, no learner progress orphaned. Italian
> was NOT rolled back; it was fixed live, on Tom's order.
> Detail in *The fix* at the foot of this document.

---

## The answer in one paragraph

Scene 15's **whole-turn clips are fine**. The defect is in the **split-clip arrays**, which
the flip gate never looks at. Every scene-15 row on the live pod carries a
`sentence_audio_ids` array that is **byte-identical to the same (scene, sentence) slot in the
retired `ita_for_eng:pod-0-retired-2026-08-22`**, while its `target_audio_id` was correctly
recast. The split arrays were copied **positionally** from pod-0 into pod-1 and never
re-derived. Between the two pods the scene running order changed — the "practising Italian
with a friend" conversation that was **pod-0 scene 15** is now **pod-1 scene 22** — so
scene 15's split clips now play a completely different conversation. Pod-0's cast female was
**Eve**; pod-1's recast female is **Ara**. The whole-turn clips were re-voiced to Ara, the
split clips are still Eve. That is the two different female voices, back to back.

---

## What a learner actually gets

Live `ita_for_eng:pod-1`, scene 15, sentence 1:

| slot | text | voice |
|---|---|---|
| `target_audio_id` (whole turn) | `Quanto costa?` | Ara (f) — correct |
| `sentence_audio_ids[1]` | `Le dispiacerebbe se provassi a praticare l'italiano con lei?` | Eve (f) — wrong conversation |
| `sentence_audio_ids[2]` | `Non sto imparando da molto tempo, e mi sento ancora un po' nervoso di parlare con altre persone.` | Eve (f) — wrong conversation |

This is not only an audio defect. Per
`packages/player-vue/src/composables/podSentenceSplit.ts`, when a row has two or more split
clips the player uses them for **both the audio and the on-screen text** — `targetText` is
read from the clip's own `course_audio.text`. So the learner both hears and reads the wrong
conversation. `Quanto costa?` is a single short sentence and should never have had a
two-clip split at all.

The English side is off-cast too. Scene 15's known-side split clips carry
`en-GB-SoniaNeural` (Azure) and `leo` — **neither voice is in the pod-1 cast**, which is
`bedd6226` (Olivia, f) and `gfzdpspr5fdp` (Tom, m).

## Why the flip gate said zero off-cast

`tools/pods/pod-cast-gate.cjs` measures the **stored cast map** plus the two whole-turn
columns. A `listening_pod_sentences` row has **six** audio slots — `target_audio_id`,
`known_audio_id`, `sentence_audio_ids`, `sentence_known_audio_ids`, `takeg_audio_ids`,
`explainer_audio_id`. The gate reads two of the six. It counted two voices and went green.
The metadata was not lying; the gate was looking at the wrong columns.

## Evidence

**Inheritance, proven by direct comparison.** For all 11 scene-15 rows,
`sentence_audio_ids` is identical to the retired pod-0's same slot, while `target_audio_id`
differs on all 11 (i.e. the main clips *were* recast, the split arrays were not). Across
the 141 pod-1 rows that have a pod-0 counterpart, **91 inherited their split arrays**.
Scenes 16-22 have no pod-0 counterpart.

**Served bytes, scene 15** (fetched from the S3 objects the serving path resolves to;
median F0 over voiced frames, autocorrelation):

- Italian whole-turn: Ara ×10 at **182-243 Hz** (one speaker by MFCC clustering), Enzo ×1 at **104 Hz**.
- English whole-turn: Olivia ×10 at **176-267 Hz**, Tom ×1 at **110 Hz**.
- Eve split clips: **167-200 Hz** — female, sitting right on top of Ara's range.

So the whole-turn tracks are correctly one male + one female per language. The second
female enters only through the split clips.

**Not a stale-bytes problem.** All 11 scene-15 objects have an S3 `LastModified` roughly 40
seconds after their `course_audio.created_at` — render-upload lag, not an in-place
overwrite. Worker #139's shared-clip hazard is real but is **not** what happened here.

## Blast radius — first measurement, not yet the answer

A crude substring test (does a split clip's text appear inside its own row's `target_text`?)
across all 21 live pod-1 courses flags **914 of 4,917 split clips, 18.6%**:

| course | split clips | flagged | course | split clips | flagged |
|---|---:|---:|---|---:|---:|
| isl_for_eng | 239 | 90 (37.7%) | por_for_eng | 239 | 46 (19.2%) |
| nld_for_eng | 236 | 75 (31.8%) | hin_for_eng | 232 | 20 (8.6%) |
| swe_for_eng | 233 | 60 (25.8%) | kor_for_eng | 246 | 19 (7.7%) |
| fra_ca_for_eng | 239 | 59 (24.7%) | ara_eg_for_eng | 222 | 16 (7.2%) |
| hrv_for_eng | 231 | 56 (24.2%) | ara_for_eng | 222 | 15 (6.8%) |
| spa_for_eng | 239 | 54 (22.6%) | **ita_for_eng** | **239** | **51 (21.3%)** |
| fra_for_eng | 225 | 53 (23.6%) | deu_for_eng | 202 | 42 (20.8%) |
| por_br_for_eng | 237 | 53 (22.4%) | eus_for_eng | 239 | 57 (23.8%) |
| ron_for_eng | 239 | 50 (20.9%) | gle_for_eng | 239 | 49 (20.5%) |
| spa_mx_for_eng | 238 | 49 (20.6%) | jpn / zho | — | see caveat |

**Caveat, stated explicitly:** this test strips non-Latin script, so the 0% it reports for
`jpn_for_eng` and `zho_for_eng` is an artifact, not a clean bill of health. It also flags
*inheritance*, which is only harmful where the scene order actually changed. Treat the
table as a starting point. Worker #282 is producing the real per-course mismatch count with
a script-safe method.

## The fix — what was actually done

`tools/pods/repair-split-array-inheritance.cjs`, dry-run then applied to
`ita_for_eng:pod-1` at ~11:20Z. It nulls only the offending arrays, so
`podSentenceSplit` falls back to the whole-turn clip.

Two gates run before any write, and both had to pass:

1. **every whole-turn clip on the pod is correct in text AND casting — 231/231.**
   This is what makes nulling a repair rather than a mutilation: the thing being fallen
   back to is verified right first.
2. **zero split-keyed `learner_pod_state` rows for the course.** Progress is keyed
   `<row.id>` for an unsplit row and `<row.id>:s<k>` for split units, so nulling changes
   the key. Italian had 5 progress rows total, 3 learners, **0 split-keyed** — nothing
   orphaned.

Every row was snapshotted into the applied log before being touched, so the write is
reversible from the log alone. Per-row before-state assertions abort the run on drift.
**No audio rendered, no clip deleted, no pointer moved to a different clip** — a broken
join was removed so the canonical clip plays.

Result: 113 rows repaired across scenes 1-15 (scenes 16-22 were already clean, having no
pod-0 counterpart to inherit from). Post-repair audit 231/231 clean. Served-bytes check
on scene 9 gave a clean bimodal split — Ara 190-229 Hz, Enzo 99-119 Hz, correctly assigned
by character, no third voice.

**What it cost.** The per-sentence split experience on those 113 rows. 65 of them can be
re-pointed at voice-correct split clips that already exist in `course_audio`; that is
follow-up work and needs no render. The remaining 48 would need a re-split of the existing
whole-turn clip — audio processing, still not TTS.

**Identified and fixed at source on 2026-08-24** — see *Root cause — the tool, and the fix*
at the foot of this document. `pod-cast-gate.cjs` still reads two of the six audio slots;
that is owned separately.

## The fix as first scoped, and what it does not need

Nulling `sentence_audio_ids` / `sentence_known_audio_ids` on an affected row makes
`podSentenceSplit` fall back to the whole-turn clip — which is already correctly cast and
correct in content. **That needs no TTS and no new audio.** The cost is the per-sentence
split experience on turns that genuinely are multi-sentence; those want a re-split of the
existing whole-turn clip, which is audio processing, not generation.

Two things must be settled before anything is written to live rows, and both are with
worker #281:

1. whether nulling a split array counts as a content change under
   `docs/pods/pod-migration-protocol.md` (progress is filed under a sentence's slot, so this
   turns on whether slot identity changes — it appears not to, but that needs proving from
   the protocol and the `learner_pod_state` schema, not assuming);
2. which tool did the positional copy, so the bug is fixed where it lives rather than
   patched per course. `tools/pods/clone-pod.cjs`, `pod-switchover.cjs` and
   `pod1-percall-recast.cjs` are the candidates.

## Gaps

- My MFCC-mean timbre method separates male from female robustly but **could not**
  independently confirm that Eve and Ara are different speakers — their distances overlap
  the within-speaker spread. The claim that they are two distinct female voices rests on
  their being different `voice_id`s from different renders, plus Tom's ear. Worker #279 is
  redoing this with a proper speaker embedding.
- I measured the whole of scene 15 by bytes and the rest of the course by metadata only.
- I pulled bytes from the S3 objects the serving path resolves to, not through the learner
  URL itself (Popty is not running locally and the learner route needs entitlement).
  Workers #279 and #281 are covering the learner path.

---

## Root cause — the tool, and the fix

*Added 2026-08-24, after the data repair. Branch `fix/ita-pod1-scene15-rootcause-2026-08-24`.*

### It is two tools, and neither of them is the switchover

No single tool copies a split array from one pod to another. The defect is produced by a
**pair** of tools, and the second one is where it becomes wrong.

**1. `tools/pods/clone-pod.cjs` puts the arrays on the staged pod.** It copies every column
of every sentence row, driven off the row's own keys:

```js
// clone-pod.cjs:96
// Copy every column except the ones that identify the row or stamp its age.
const copyCols = Object.keys(sentences[0]).filter(c => !['id', 'pod_id', 'created_at', 'updated_at'].includes(c))
```

At this point nothing is wrong: the clone's text is byte-identical to the source's, so the
split clips still belong to the text they are attached to. The row ids keep their
`SC{scene}-S{sentence}` numbering deliberately, "which the align tool matches on".

**2. `tools/pods/align-pod0-to-canonical.cjs` then rewrites the CONTENT at each of those
slots and re-derives only two of the six audio columns.** Its per-slot payload was:

```js
// align-pod0-to-canonical.cjs:170-184 (before the fix)
const desired = {
  id, pod_id: podId,
  scene_number: c.scene_number, sentence_number: c.sentence_number,
  global_order: c.global_order, speaker: c.speaker,
  known_text: c.english_text,
  target_text:     carryTarget ? src.row.target_text     : '',
  target_audio_id: carryTarget ? src.row.target_audio_id : null,
  known_audio_id:  carryKnown  ? src.row.known_audio_id  : null,
}
```

and its write list was exactly ten columns:

```js
// align-pod0-to-canonical.cjs:317-318 (before the fix)
const COLUMNS = ['id', 'pod_id', 'scene_number', 'sentence_number', 'global_order',
  'speaker', 'known_text', 'target_text', 'target_audio_id', 'known_audio_id']
```

`sentence_audio_ids`, `sentence_known_audio_ids`, `takeg_audio_ids` and
`explainer_audio_id` are **not mentioned anywhere in the file**. A column this payload never
names survives the content change untouched — so the slot keeps the *retired* conversation's
split clips while its text, its speaker and its whole-turn clips all become the new
conversation's. That is the positional copy, and it is a copy by omission rather than by an
assignment anyone can point at, which is why grepping the column names found nothing.

**`pod-switchover.cjs` is NOT the culprit** — it moves finished rows onto a new slug with
their content intact — and neither is `pod1-percall-recast.cjs`, which writes only
`speaker`, `listening_pods.speakers` and `courses.voice_config.podCast` and touches no audio
column at all. `pod-state-migrate.cjs` touches `learner_pod_state` only.

### Proof, from production, read-only

The seventeen courses that were cloned and aligned but **never switched over** still hold
both halves, so the defect can be seen before any flip touched it. Comparing
`<course>:pod-0` with `<course>:pod-0-unrecorded` by `(scene_number, sentence_number)`:

| course | slots | slots where the English changed | …and `sentence_audio_ids` is byte-identical anyway | …and `takeg_audio_ids` is | …and `explainer_audio_id` is |
|---|---:|---:|---:|---:|---:|
| hye_for_eng | 141 | 58 | 44 | 58 | 0 |
| dan_for_eng | 141 | 57 | 42 | 55 | 0 |
| heb_for_eng | 141 | 50 | 39 | 50 | 0 |
| cat_for_eng | 141 | 46 | 39 | 45 | 7 |
| pol_for_eng | 141 | 52 | 38 | 52 | 0 |
| tur_for_eng | 141 | 47 | 35 | 46 | 32 |
| ell_for_eng | 141 | 44 | 32 | 44 | 15 |
| *(17 courses in all)* | | | 23-44 each | 0-58 each | 0-32 each |

The staged pods have never been through a switchover or a recast, so **clone + align alone
is sufficient to produce the defect**. The whole-turn columns at the same changed slots are
identical on only 1-12 rows per course, all of them the aligner's deliberate
`numerals_only` carry — the two whole-turn columns behaved; the other four did not.

**Yes, `takeg_audio_ids` and `explainer_audio_id` are inherited the same way.** takeg on
14 of the 17 courses, explainer on 4 of them (tur 32, ell 15, cat 7, bul 6).

### The fix

**The rule, in one line: split audio belongs to a row's TEXT, never to its SLOT.** It may be
carried forward only where the text it was rendered against is byte-identical; otherwise the
correct value is NULL, and the player falls back to the verified whole-turn clip — which is
exactly what the repair tool wrote.

New shared module **`tools/pods/split-audio-inheritance.cjs`** (pure, no database) holds that
rule once, so a clone, an align and a promotion cannot drift apart:

- `carrySplitAudio(source, desired[, carry])` — the four slot values a row should end up
  with. A slot is carried only when the text on the side it belongs to is unchanged
  (`sentence_audio_ids` / `takeg_audio_ids` → target; `sentence_known_audio_ids` → known;
  `explainer_audio_id` narrates the whole line, so it needs both). Everything else is NULL.
  The optional `carry` argument lets a caller that has already diffed two canons impose its
  own decision — necessary because two blank texts compare equal.
- `findInheritedSplitAudio(oldRows, newRows)` — the gate. A slot byte-identical to the same
  `(scene, sentence)` slot on the pod being replaced, while the text there has changed. Exact
  identity, no text similarity, so it is **script-safe**; the blast-radius table above this
  section reads a false 0% for jpn/zho precisely because it stripped non-Latin script.

Wired in:

| file | change |
|---|---|
| `align-pod0-to-canonical.cjs` | the four slots are now in `COLUMNS` and are set — carried or NULL — on every row via `carrySplitAudio(src.row, null, {target: carryTarget, known: carryKnown})`. The summary gained `split_audio.{slots_carried, rows_cleared}`. |
| `clone-pod.cjs` | the copy runs through `carrySplitAudio(s, s)`. A no-op today, because the clone is text-identical — which is the point of running it rather than assuming it: the day anyone makes this tool transform text, the arrays drop to NULL instead of following the slot. |
| `pod-switchover.cjs` | **new promotion gate.** It refuses to promote a staged pod carrying inherited split audio, names the offending slots, and points at `repair-split-array-inheritance.cjs`. Escape hatch `--accept-inherited-split-audio`, off by default, not applied on `--rollback`. |
| `pod1-percall-recast.cjs` | **measurement only.** Its regen queue walks the two whole-turn columns, so a recast that moves a line from Eve to Ara leaves its split clips speaking Eve — the second half of what Tom heard. The report now carries `splitClipsLeftInOldVoice` and a per-clip list. It does not write them: nulling a split array changes a learner's progress key, which is the repair tool's gated job, not a recast's. |

### What the gate catches, measured on production

Run read-only against the live database:

- **The seventeen staged, unflipped pods would all be refused** — 1,531 inherited slots in
  all, 24-57 rows per course. Every one of those flips would have shipped this defect again.
- **The live pod-1 fleet still shows 381 residual inherited slots** after the repair:
  `explainer_audio_id` 336, `sentence_known_audio_ids` 26, `takeg_audio_ids` 14,
  `sentence_audio_ids` 5. The explainer slot is the bulk of it and is **not covered by
  `repair-split-array-inheritance.cjs` at all** — its `SLOTS` list is the three arrays. That
  is a real, previously unmeasured population, and it is a data question rather than a source
  one, so nothing was written for it here.

### Tests

`tools/pods/split-array-inheritance` regressions live in
**`tools/pods/split-audio-inheritance.test.cjs`** — 12 pure unit tests, no database. The two
that pin the incident:

- *"catches split audio left behind when the scene order changed"* — the real ita shape: the
  friend conversation at pod-0 scene 15, `Quanto costa?` written into that slot, all four
  slots left standing. All four are flagged.
- *"NULLS every slot when the slot holds a different conversation"* and *"returns nulls,
  never undefined, when there is no source row at all"* — null-on-no-canon, so the player
  falls back to the whole-turn clip rather than to a best-effort array.

Plus: per-side independence (a retranslation drops the target side and keeps the known),
the explicit-carry override, a staged pod aligned *with* the fix passing the gate, genuinely
re-derived split audio not being flagged, scenes past the old canon not being flagged, and a
Japanese case proving the gate does not depend on Latin script.

**Result:** `npx vitest run tools/pods/` — **44 files, 636 tests, all passing** (that count
includes the sibling worktrees' copies of the same files).

### What is NOT fixed here

- `pod-cast-gate.cjs` still measures two of the six audio slots. Owned by another worker this
  hour; the switchover gate above is a second, independent net under the same hole.
- The 336 live `explainer_audio_id` slots, and the 45 array slots the repair pass left, are a
  data follow-up. `repair-split-array-inheritance.cjs` would need `explainer_audio_id` added
  to its `SLOTS` list before it could clear them, and that changes what a learner hears, so it
  is Tom's call rather than a side-effect of a source fix.
- The aligner refuses non-`_for_eng` courses outright, so nothing here has been exercised on
  an `eng_for_*` pod.
