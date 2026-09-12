# eng_for_hin — promoted to live, 2026-09-02

**Tom's ruling:** "Yes. Flip Hindi. Everything should be live."

## What changed

| | before | after |
|---|---|---|
| `courses.status` | `draft` | `released` |
| `courses.new_app_status` | `draft` | `live` |

Done through the API (`POST /api/production/eng_for_hin/status {"status":"live"}`), not by
editing the DB. No learner progress data was touched.

## The gate, and the override

The first attempt returned **409 `qa_gate_unpassed`** — "0 of 100 required rounds signed off".
That gate (`services/course-qa-gate.cjs`, Tom 2026-08-05) demands a human play through the first
100 rounds of a premium course in the real app. eng_for_hin has 0 signed-off rounds; so do all
nineteen other English courses, which were grandfathered in when the gate was built.

Override recorded through the documented path — `POST /api/qa-gate/eng_for_hin/override`:

- `override_by`: `thomas.cassidy+ssi@gmail.com` (Tom's own admin identity — the gate records the
  authenticated actor, and the actor here is the owner)
- `override_at`: 2026-09-02T08:56:21Z
- `override_reason`: *"Owner override authorised by Tom Cassidy (2026-09-02): course complete with
  real audio and 226 active school learners; gate is historic and every sibling English course
  predates it."*

The gate row still reads `gate_status: unpassed`. That is correct and deliberate: the override
does not fake a pass, it records a decision to publish without one. Clearing it later
(`DELETE /api/qa-gate/eng_for_hin/override`) re-arms the block on any future promotion.

## Why it fell back to Chinese before

`packages/player-vue/src/App.vue` resolves `?course=<code>` against `/api/courses/available`.
A draft course is not in that list, so the requested course simply wasn't found and boot fell
through to `PREFERRED_DEFAULT = 'zho_for_eng'` — the anon-visitor default. Nothing Hindi-specific;
it was the draft status alone.

`https://saysomethingin.app/api/courses/available` now returns eng_for_hin with
`new_app_status: "live"`, so that fall-through no longer fires.

## Content state (verified against the live DB)

| | eng_for_hin |
|---|---|
| seeds | 668 |
| LEGOs | 1,327 |
| practice phrases | 12,421 |
| audio clips | 51,340 |
| `course_round_index` rows | 1,274 (materialised — no "one seed then INF PLAY") |
| LEGOs missing Hindi audio | **0** |
| non-component phrases missing Hindi audio | **0** |
| seeds missing `known_audio_id` | **421 of 668** |

## The 421 missing Hindi seed-prompt clips — what a learner actually hears

The seed's *known-side* clip is used in exactly one place: the **SEED-PHASE spaced-repetition
review** at Fibonacci offset ≥144 — i.e. 144+ rounds after that seed's LEGO was introduced. It is
never used in intro, debut, BUILD, USE, or any review at offsets 1–89.

`generateLearningScript.ts` handles the absence explicitly:

```js
/** Known slot is omitted — never silenced — when the seed has no known audio. */
const roles = seed.known_audio_id
  ? ['target', 'known', 'target', 'target']
  : ['target', 'target', 'target']
```

So where a clip is absent the learner hears the English sentence **three times** instead of the
four-part English → Hindi → English → English sandwich. No silence, no gap, no error, no stall.
What is lost is the Hindi meaning-anchor inside that one deep review item.

The 421 are spread evenly across the whole course (~50–70 per hundred seeds), so this is a thin
uniform dilution of the deep-review sandwich, not a broken stretch. Nothing in the first rounds is
affected: seeds 1–20 have every LEGO and every practice phrase backed.

Every sibling (eng_for_tam, eng_for_mar) has 0 missing — so this is a real eng_for_hin gap, just a
gracefully-degrading one. **An audio-pass request is queued** for it
(`audio_pass_requests`, eng_for_hin). No TTS was run.

## One content defect found

**Seed 525** has no audio at all (known, target1, target2 all null) and its English target text is
ungrammatical: *"To check if you were been able to finish."* (Hindi:
"यह जाँचने के लिए कि आप पूरा कर पाए या नहीं।") It degrades gracefully — a seed with no target
audio falls through to the ordinary use-phrase review — but the text wants fixing. 1 seed in 668.

## Guest access

eng_for_hin is `premium`, exactly like every sibling English course. `canAccessCourse` returns
`canAccess || canPreview`, so an anonymous visitor can open it and play free **to the end of
seed 19 (end of Yellow)**, then hits the paywall. The guest link works without login.

## "I speak" filter

The pill list is built from the known languages of courses in `/api/courses/available`, labelled by
`getLanguageEndonym` — `hin: 'हिन्दी'`, flag 🇮🇳 (`useI18n.ts`). A full Hindi UI locale
(`locales/hin.json`) also exists, so the whole interface can run in Hindi.
