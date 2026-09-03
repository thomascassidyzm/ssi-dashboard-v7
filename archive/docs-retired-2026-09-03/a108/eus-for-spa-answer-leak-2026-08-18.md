# eus_for_spa answer-leak — authoring + verification

**Date:** 2026-08-18 · **Course:** eus_for_spa (known=spa, target=eus, beta, 300 seeds)
**Scope:** authoring and verification only. No DB writes, no TTS, no commits.
**Proposals file:** `.a108-leak42/eus_proposals.json` (12 objects)

---

## Headline

All **12 rows are real leaks**. Nothing discarded. **12 × `fix`.**

But the central assumption I was handed — *"component rows are pure housekeeping, never seen or heard"* — is **half wrong**, and the wrong half changes the recommendation. Component rows are never **heard**. They are very much **seen**.

---

## A. Are they real leaks?

Yes, all 12. Every string is unambiguously Basque with no Spanish cognate to hide behind:

`zoritxarrez` · `nahi duzu` · `behar dut` · `aldatu behar` · `ez dut` · `saiatzen ari naiz` · `lan egiten` · `garaiz amaitzen` · `ziurtatu nahi` · `egin behar` · `nola esaten` · `hasi berri`

`aldatu` (< Latin *alterare*) and `ziurtatu` (< Latin *securus*) are Latin-derived but are Basque forms, not Spanish ones — Spanish would be *cambiar* and *asegurar*. Neither is a shared-word false positive.

**The discard test is live, and it fires elsewhere.** Two rows in the wider identical-row set *would* be discarded on exactly this grounds: `S0126L02C02 forma` and `S0272L01C02 estupenda` are genuine Spanish/Basque shared forms where `known == target` is correct, not a leak. Neither is in the 12.

---

## B/C. Proposals and collisions

Full rationale + taught-evidence citations are in the JSON. Summary:

| Row | Basque (unchanged) | New Spanish | Collision |
|---|---|---|---|
| S0086L02**B03** | zoritxarrez, ez zait gustatzen hitz egiteari utzi | **por desgracia, no me gusta dejar de hablar** | clean |
| S0175L01C03 | nahi duzu | **quieres** | reinforcing |
| S0181L03C02 | behar dut | **tengo que** | clean |
| S0188L02C01 | ez dut | **no** | ⚠ pre-existing 4-way |
| S0188L02C02 | aldatu behar | **necesito cambiar** | clean |
| S0195L03C02 | saiatzen ari naiz | **estoy tratando de** | reinforcing |
| S0199L01C01 | lan egiten | **trabajando** | clean *(chosen to avoid one)* |
| S0200L01C02 | garaiz amaitzen | **terminar a tiempo** | clean |
| S0200L02C01 | ziurtatu nahi | **quieren asegurarse** | clean |
| S0207L01C01 | egin behar | **necesitar hacer** | clean |
| S0208L01C01 | nola esaten | **cómo se dice** | ⚠ flagged |
| S0228L02C01 | hasi berri | **acaba de** | clean |

Two proposals are *reinforcing* — the Spanish already exists in this course mapped to the **same** Basque target, so I am reusing the course's own rendering verbatim rather than inventing one:

- `saiatzen ari naiz` → **estoy tratando de** is lego **S0002L02**, byte-identical Basque, taught 193 seeds earlier.
- `nahi duzu` → **quieres** already exists as a component row elsewhere in the course.

### Collisions hit

**1. `lan egiten` — collision avoided, not accepted.** The obvious gloss *trabajar* is already a live **build** prompt mapped to a **different** Basque form, `lan egin`. A build prompt is producible: the learner hears *trabajar* and must say *lan egin*. Putting the same Spanish over `lan egiten` would show one Spanish across two Basque forms the course drills apart. I used **trabajando**, which is clean and is the course's own `X egiten` → gerund mapping (`hitz egiten` ⇐ *hablando*, S0005L02). **Do not substitute *trabajar* here.**

**2. `ez dut` → "no" — pre-existing overload, not created here.** The Spanish *no* is already 4-way overloaded across the component tile layer: `ez` (×9), `ez nuke`, `ezin`, and `ez dut` (×1). My value reuses the existing `no → ez dut` mapping, so it adds no new ambiguity. Tiles are visual-only and never a prompt, so this is not a ZUT breach — but it is a genuine smell in the tile layer and is sized in §E.

**3. `nola esaten` → "cómo se dice" — flagged for your call.** That Spanish is a live producible prompt (lego S0160L01 + a build phrase) mapped to `nola esaten da`; this tile puts it over `nola esaten` **without** the aux, which is the sibling tile `den`. Partial spans are exactly what tiles are for, so I judge it benign — but it is the one proposal where the same Spanish sits over a shorter Basque string than something the learner must produce. There is **no third Spanish the course supports**: the only alternative to accepting it is to leave the row and report it. Your call.

**4. `egin behar` → "necesitar hacer" is the weakest of the set.** Clean on collisions, and it matches the parent lego's own verb choice (*necesitabas*), but a reviewer may reasonably prefer *tener que hacer* (precedented at S0059L02). Flagging rather than hiding it.

---

## D. The component rows — recommendation

**Recommendation: (b) fix text-only, with NO audio spend — for the 11 component rows. The single build row S0086L02B03 does need an audio pass queued.**

Grounded in the code, because the brief's assumption needed correcting:

**Component known_text IS displayed to the learner.** There are **two** tile producers and they read from **different tables**:

- **Instant-playback path** (`api/courses/[code]/cycles.ts:738-740, 757-759`): component *rows* never produce a cycle; tiles come from `course_legos.components`. This is the path the brief checked, and the brief is right about it. `bundle.ts:247` likewise excludes `component` from `BUNDLE_PHRASE_ROLES`.
- **Full-script path** (`packages/player-vue/src/providers/generateLearningScript.ts`): `fetchAllPracticePhrases` (line 288-310) fetches **every** `course_practice_phrases` row with **no `phrase_role` filter**, and lines 863-873 push every component row into `componentsByLego` as `{known: phrase.known_text, …}`. Line 1371-1372 attaches that map to the **intro cycle** as `components`. It flows through `toSimpleRounds.ts:322` and reaches the DOM in `LegoAssembly.vue` as `{{ comp.known }}` — lines **623, 685, 753, 789**. There is **no suppression when known === target**.

Both paths reach real learners in one session: `INSTANT_PLAYBACK_ALL = true` (`LearningPlayer.vue:154`) makes cycles.ts the bootstrap, but `composables/useFullCourseScript.ts:132` still runs `generateLearningScript` for the handoff — the same mixed-producer situation cycles.ts documents for spaced review.

**Component known_audio is NEVER played.** `componentPhrasesByLego` (generateLearningScript.ts:845) is populated at line 881 and **never read anywhere in the repo** — I grepped the whole of `packages/`. It is dead. No `component_intro` / `component_practice` cycle is emitted on either path, and the DB enforces the same rule (`refuse_component_introduction` trigger).

So: **visible, never audible** → fix the text, spend nothing on audio.

### Trigger answer

`course_practice_phrases` **does** have such a trigger: `trg_null_phrase_audio_on_text_change`, BEFORE UPDATE, firing when `known_text` or `target_text` changes. It does not blindly null — it tries `audio_id_for_text_same_voice()` first and relinks if a same-voice clip already speaks the new text; otherwise it NULLs and logs to `content_audio_link_drops`.

Consequences for this fix:

- **11 component rows:** `known_audio_id` will be NULLed (no Spanish clip exists for the new text). **Harmless** — nothing resolves it. No audio pass needed.
- **1 build row S0086L02B03:** `known_audio_id` d717e4f6-… currently **speaks the Basque answer aloud** as the Spanish prompt. It will be NULLed, leaving a silent known prompt until rendered. **This row needs an audio pass queued** (`queue-audio-pass.cjs eus_for_spa`) — per the standing rule, queue it, never render it.

Also note `course_practice_phrases_audit` will capture before-values, and `touch_course_content_stamp` will invalidate the script cache — so the text fix does reach cached learners.

---

## E. Wider finding for Kai — sized, NOT fixed

The 12 rows are the tip. The detector only caught them because it required a two-word run.

**Exact numbers, both layers:**

| Layer | Table | Identical `known == target` | Total | Learner-visible via |
|---|---|---|---|---|
| Phrase rows | `course_practice_phrases` | **73** (72 component + 1 build) | — | full-script path |
| Display tiles | `course_legos.components` | **67** | 480 tiles across 240 legos | instant-playback path |

- **73 identical phrase rows**, not 12. Of these, **1 is a build row** (audible, in scope, fixed above) and **72 are component rows**, of which only 11 are in the authorised scope.
- **67 of 480 component tiles (14%)** in `course_legos.components` are `known === target` — untranslated Basque shown as the Spanish gloss.
- The two layers **overlap but do not agree**. 10 of the 11 in-scope LEGOs leak in *both*. **S0175L01 leaks only in the phrase rows** — its `course_legos.components` is clean (`[{qué, zer}, {quieres hacer, egin nahi duzu}]`, 2 tiles) while its phrase rows are 3 leaking tiles (`zer`/`egin`/`nahi duzu`). So a learner sees a clean breakdown on one path and an all-Basque one on the other, in the same session.
- Both leaks concentrate hard in **seeds 168-245** (~60 of 67 tiles), with two outliers at S126 and S272 — those two (`forma`, `estupenda`) are **not defects**, they are genuine shared forms.
- **Also in the tile layer:** the Spanish `no` maps to 4 different Basque targets (`ez`, `ez nuke`, `ezin`, `ez dut`). Pre-existing, unrelated to this fix, worth a look.

**Honest size of the full repair:** ~62 remaining component phrase rows + ~67 lego tiles, with substantial overlap — call it **~70-75 distinct known-side glosses to author**, all text-only, **zero audio spend**, since neither tile layer is ever voiced. The one audible defect in the entire course is the single build row already covered above.

---

## Explicit gaps

- I could not dispatch an independent adversarial verifier for the code trace — the fan-out ceiling refused it at depth 2. The §D trace is **mine alone, single-sourced**, though every claim carries a file:line you can check.
- I did not verify the proposals against a native Basque or Spanish speaker. The mappings are derived from the course's own corpus, which is the strongest in-repo evidence, but corpus-consistency is not the same as a native review.
- I did not check whether `course_legos.components` has its own audio-nulling trigger, since editing it is out of scope.
