# Why audio gets unlinked — root cause, 2026-08-06

Tom, 2026-08-05, and this is the commission:

> "in my experience, audio can get unlinked from time to time - not sure why - maybe we could find
> out. but the audio is still there - and maybe it's older Azure voices and so on - but it's probably
> better to have a system that plays Azure until better voices are available in lieu of nothing!!!!"

We found out. There are three mechanisms, all now fixed, and one of them was destroying human
recordings rather than merely unlinking them.

**One expectation did not survive measurement, and it is the honest headline.** The hope behind this
job was that a lot of "missing audio" is really unlinked audio. Estate-wide it is not: of 515,677
unlinked slots, only **618 (0.12%)** have a clip sitting in the same course ready to bind for free.
**515,059 (99.88%) are genuinely absent** — no audio, any voice, anywhere in that course, under
either normaliser. `ara_lb_for_eng`'s 1,324 were real and were recovered, but that pool is now
essentially drained. The remaining backlog is a **generation** backlog, not a linking bug. Full
per-course table: `docs/audio-unlink-forensics-2026-08-06.md`.

---

## The answer in one paragraph, for a non-engineer

Every clip of audio is stored once and then *pointed at* by the phrases that need it. The pointer is
the fragile part, not the audio. The system had a rule that throws the pointer away whenever anyone
edits the phrase's text — sensible, because the old recording no longer matches the new words — but
it had no rule that ever puts a pointer *back*. The only thing that could restore a pointer was
generating brand-new audio, so a perfectly good clip we already owned would sit there unreferenced,
indefinitely, and get reported to everyone as "missing audio". Worse, the two halves of the system
did not agree on how to compare two pieces of text: one half kept the question mark at the end of a
sentence and the other stripped it. Any phrase ending in "?" therefore looked like a different
phrase to the half doing the matching, so it could never be re-pointed automatically — and the
safety check that protects human-recorded audio from being overwritten was looking with the wrong
half, so it could not see 5,090 human recordings and would let the machine record over them.

---

## Mechanism 1 — the unlink fires constantly, the relink almost never

| | trigger | when it runs |
|---|---|---|
| **Unlink** | `null_lego_audio_on_text_change`, `null_phrase_audio_on_text_change` | `BEFORE UPDATE` on the content row — **any** text change |
| **Relink** | `link_audio_to_content` | `AFTER INSERT` on `course_audio` — **only** when brand-new audio is generated |

The asymmetry is the whole bug. There was no path from "this content row has no audio pointer" to
"but we already own a clip for this exact text". Only a fresh TTS render could restore a link, which
is the most expensive possible way to fix a pointer.

Two sub-cases made it worse:

- **Cosmetic edits unlinked for nothing.** The unlink test is `NEW.text IS DISTINCT FROM OLD.text` on
  the *raw* text. A trailing space, a capitalisation change, a full stop — none of which change the
  normalised text or invalidate the recording — still nulled the pointer, and nothing put it back.
- **Reverting an edit did not restore the audio.** Change text A→B→A and the clip for A, still
  sitting in `course_audio`, stayed unreferenced forever.

Both are now fixed and both were verified against real production rows (see *Verification* below).

## Mechanism 2 — three normalisers, one indexed column

`course_audio.text_normalized` is the column everything matches on. Three pieces of code computed it
or compared against it, and no two agreed:

| where | rule | trailing `?` |
|---|---|---|
| `normalize_text()` (SQL) — **writes the column**, via `BEFORE INSERT OR UPDATE` trigger | `rtrim(lower(trim(t)), '.?!¿¡。？！')` | **stripped** |
| `normalizeForAudio()` (JS) — used by every read | lower, trim, collapse whitespace, strip `.!。！` | **kept, deliberately** |
| `link_audio_to_content()` (the relink trigger) | `lower(trim(content_text))` | **kept, and strips nothing at all** |

The JS file's own header asserted *"EVERY write to text_normalized and EVERY read/match against it
MUST use this function. No exceptions."* That has not been true since the SQL trigger landed: the
trigger overwrites whatever JS supplies. The column now holds **two incompatible conventions**, and
no single exact key reaches both:

| month written | `?` kept | `?` stripped |
|---|---|---|
| 2026-01 | 68 | 5,092 |
| 2026-02 | 5,237 | 5,290 |
| 2026-03 onwards | **0** | 143,875 |
| **total** | **5,305** | **154,257** |

So: the relink trigger, comparing `lower(trim(text))` against a column with the punctuation stripped,
**could never match any phrase ending in `.`, `?` or `!`**. 69,055 known-side and 56,104 target-side
phrase rows end in such punctuation. For those, autolink was dead code.

> **Measured correction** (forensics §1): as a cause of *unrecovered* audio the normaliser split is
> real but **small** — across all 99 courses, loose matching recovers only **12 slots** more than
> strict, all in `jpn_for_eng`. Autolink being dead for punctuation-ending text mattered because it
> removed the only relink path, not because a large pool of clips is hiding behind the `?`. The
> split's serious consequence is the guard blindness below, which is about *destruction*, not
> recovery — and there the exposure is 5,090 human recordings.

## Mechanism 3 — deletion *able* to destroy authored content, and pointers with no integrity

> **Measured correction** (`docs/audio-unlink-forensics-2026-08-06.md` §5): the cascade below was a
> live **hazard, not observed damage**. A census found no legos that lost an introduction to it and
> zero dangling rows in `lego_introductions`; the column that actually carries presentation linkage
> is `course_legos.presentation_audio_id`, which is intact (9 dangling estate-wide). The FK change
> is **prevention**, and must not be reported as a repair. The 17,480 dangling pointers below ARE
> real and measured.

`course_audio` is referenced by content in three different postures, and only one of them was right:

- **`ON DELETE SET NULL`** — seeds/legos/phrases `known_/target1_/target2_audio_id`. Correct, but it
  is *silent*: deleting audio unlinks content and nothing records that it happened.
- **`ON DELETE CASCADE`** — `lego_introductions.presentation_audio_id`. Deleting an audio row deleted
  **the whole introduction row**, i.e. the authored introduction *text*, not just its pointer. Audio
  is regenerable; authored text is not.
- **No foreign key at all** — `course_practice_phrases.presentation_audio_id`,
  `course_legos.presentation_audio_id`, `listening_pod_sentences.explainer_audio_id` /
  `note_audio_id`, `pod_legos.explainer_audio_id`. These can point at audio rows that no longer
  exist, and nothing stops them. Measured 2026-08-06:

  | column | dangling pointers |
  |---|---|
  | `course_practice_phrases.presentation_audio_id` | **17,480** |
  | `course_legos.presentation_audio_id` | 9 |
  | `pod_legos.explainer_audio_id` | 0 |
  | `listening_pod_sentences.explainer_audio_id` | 0 |

  `course_legos.presentation_audio_id` is typed **`text`, not `uuid`** — which is *why* it never had
  a foreign key. A type slip became an integrity hole.

## Mechanism 2's worst consequence — the precious-audio guard was blind

`humanRowAtAudioKey()` in `services/phases/phase8-audio-v13.cjs` exists to stop TTS overwriting a
human recording that occupies the same upsert key. Every caller keyed it with
`normalizeForAudio(text)` — the `?`-keeping form — and queried with `.eq()`. The rows are stored
`?`-stripped. So for any question-ending text the guard matched nothing, returned `null`, and the
upsert below it was free to flip a human recording's `origin` and `s3_key` to TTS.

**5,090 human recordings sat at keys the guard could not see.** This is the most serious finding in
this investigation: it is not lost linkage, it is destructible irreplaceable audio.

---

## What was changed

`database/migrations/20260806_audio_link_integrity.sql` (applied to production 2026-08-06, rollback
committed alongside as `.ROLLBACK.sql`):

1. `link_audio_to_content` now matches with `normalize_text()` on both sides — the same function that
   writes the column — and covers `course_seeds` and phrase presentation slots, which it had missed.
2. The unlink triggers now **re-link to a clip we already own** for the new text, via a new
   `audio_id_for_text()` whose preference order (human > newest > id) mirrors `pickPreferredAudioRow`
   exactly, so the database and the JS link passes can never disagree about which clip wins. Only a
   clip with a live `s3_key` is eligible — a row with no file is not "audio we have".
3. `lego_introductions.presentation_audio_id` is `ON DELETE SET NULL`. Audio deletion can no longer
   destroy authored text.

`services/shared/text-normalize.cjs` — documents the split honestly, adds `normalizeForDb()`
(byte-identical to the SQL) and `audioKeyCandidates()`. `humanRowAtAudioKey()` now matches **either**
convention, so it can see all 5,090 exposed human recordings. Widening what the guard sees is
strictly more protective: a false positive only skips a TTS render.

The migration is **monotone by construction**: it only ever fills a pointer that is NULL, never
overwrites a pointer that already points at a live clip, and never deletes anything
(make-before-break, `docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md` §6b).

### Deliberately NOT done

`normalize_text()` was **not** redefined to agree with the JS. It feeds
`UNIQUE (course_code, text_normalized, language, role, voice_id)`, so recomputing it would collide on
the next write to each of the 154,257 affected rows — converting a matching bug into write failures.
Matching was made tolerant instead. Unifying the column needs a gated backfill that resolves the
collisions first; that remains open.

---

## Verification

The migration was applied inside a transaction against **real production rows**, exercised, and
rolled back before being applied for real. Sample row `por_for_eng:S0412L03U04`
(*"achas que não podíamos deixá-los ganhar?"*, linked to `c040abcf`):

| action | old behaviour | new behaviour |
|---|---|---|
| cosmetic edit (append a space) | link nulled | **link retained** ✓ |
| genuine change to text we have no audio for | link nulled | link nulled ✓ (unchanged) |
| revert the text back | stranded forever | **re-linked to the same clip** ✓ |
| `lego_introductions` FK | `CASCADE` | `SET NULL` ✓ |

The guard fix was verified through the real exported function against live data: human row
`52c6ef99-360e-43a9-90e8-80203d9cf050` (`cym_s_for_eng`, text `"how long?"`, stored as `"how long"`)
is now found where `.eq(normalizeForAudio(...))` returned null.

`services/shared/` test suite: 81 passing, including 12 new normaliser tests and the 16 tests of the
new fallback resolver.

---

## The biggest thing still unexplained — an undocumented mass-unlink, 2026-07-11

Forensics §3a. Nine courses each have **one single `updated_at` instant shared by every row of
`course_seeds`, `course_legos` AND `course_practice_phrases`** — not "many rows that day", one exact
timestamp per course, stepping forward every 10–20 seconds:

| course | instant (UTC) | rows sharing it |
|---|---|---|
| bre_for_fra | 02:34:01.561 | 5,918 (100% of course) |
| eng_template | 02:34:45.476 | 6,105 (100%) |
| gla_for_eng | 02:34:59.316 | 5,376 (100%) |
| ita_for_cym | 02:35:10.828 | 465 (100%) |
| mar_for_eng | 02:35:30.783 | 13,874 (100%) |
| mlt_for_eng | 02:35:42.901 | 5,811 (100%) |
| por_for_jpn | 02:36:02.941 | 6,786 (~93%) |
| sbx_for_eng | 02:36:11.220 | 473 (100%) |
| tel_for_eng | 02:36:17.382 | 12,562 (100%) |

`course_audio` rows did already exist for eight of the nine before 2026-07-11, and in a 2m16s window
every content row was rewritten with every audio-link column blanked. The signature is one script
looping a fixed course list, one bulk `UPDATE … SET *_audio_id = NULL` per course.

> **Severity correction — checked directly, 2026-08-06, and it matters.** "They had working audio
> before the event" is true of the row counts but **materially misleading**, and it should not be
> repeated. Broken down by role, **not one of the nine courses has a single `target1`, `target2` or
> `presentation` clip** — the audio they hold is `known` (the English prompt) plus scaffolding
> (`welcome`/`instruction`/`encouragement`). `gla_for_eng`: 1,868 known, 0 target1, 0 target2, 0
> presentation, against 536 LEGOs. `ita_for_cym` has no audio at all.
>
> Since a LEGO needs intro + voice 1 + voice 2, these courses could never have played a single round,
> before or after the event. The estate census agrees independently: all nine sit at **0 playable
> rounds, 0% reach**. They are **unbuilt, not broken** — target-side TTS has never been run for them.
>
> This does not dissolve the event: something still blanked every link across three tables in nine
> courses in one pass, and that mechanism is unidentified and could equally hit a live course. But it
> is **not** "nine working courses went dark", and it is not "bigger than the Azure purge" in
> learner-facing damage — the Azure purge silenced a course learners were actually using.

**~90,000 rows touched, and the script that did it has not been identified.** It is not the Azure
purge, nor the 2026-03-11 or 2026-05-23 windows. Read the row count as *blast radius of an unknown
mechanism*, not as damage — per the correction above, the damage to learners was nil because these
courses had no target audio to lose. A second unexplained event sits on the dangling-pointer column:
2026-06-02 blew out 9,667 `presentation_audio_id` pointers in a single day, 55% of the 17,480 total,
also untraced.

Note what this means for the fixes above: the write-path repair stops *future* text-edit unlinking,
but it cannot stop a script that issues a direct bulk `UPDATE`. Nothing in the estate currently
alarms when a course's link count collapses.

## The actionable find — ara_lb's amputation has a twin

The estate census (`tools/audio-link-reconcile.cjs --census`, 143 courses ranked by *rounds lost*
rather than slot counts) found `ara_eg_for_eng` carrying the **exact ara_lb signature**: audio stops
dead after seed 300, 368 silent seeds above it, nothing complete beyond the cut.

| course | rounds | playable | lost | reach | blocked on intro only |
|---|---|---|---|---|---|
| ara_lb_for_eng | 1,414 | 638 | 776 | 45.1% | 178 |
| **ara_eg_for_eng** | 1,334 | 683 | **651** | **51.2%** | **45** |

Egyptian Arabic is missing **half its course** for every learner, by the same mechanism as Lebanese,
and it has not been fixed. Forensics independently flags it as the estate's highest free-recovery
count (526 slots) — the same regional-suffix trap, where the course code says `ara_eg` but
`courses.target_lang` says `ara`, so any script deriving language from the code finds nothing and
reports healthy.

The census also surfaces the cheapest repair unit in the estate: LEGOs **blocked only on a missing
intro**, where both voices are already rendered and one clip buys back a whole round —
`deu_for_eng` 174, `fra_for_eng` 124, `jpn_for_eng` 93, `zho_for_eng` 86.

Everything above the line here is a **content/generation** call, so it goes to Kai, not into this
job's scope. What belongs to Popty is that the detector now exists and runs whole-course.

## Still open

- **17,480 dangling presentation pointers** must be healed (re-link where a live clip exists for the
  same text, null only what genuinely has nothing) before a foreign key can be added to
  `course_practice_phrases.presentation_audio_id`. `course_legos.presentation_audio_id` needs a
  `text` → `uuid` type correction first.
- **The normaliser backfill** that unifies the 5,305 `?`-keeping rows with the 154,257 stripped ones.
- **Other read sites still using `.eq('text_normalized', normalizeForAudio(...))`** — the guard was
  fixed because it is the one that destroys irreplaceable audio; the rest cause redundant TTS spend
  and missed matches rather than loss. Sites: `services/supabase-client.cjs` (4),
  `services/phases/phase8-audio-v13.cjs` (3 remaining), `services/voice-engine/pods-registration.cjs`,
  `tools/breakdown-flat.cjs`. `services/production-api.cjs` already carries a hand-rolled
  stripped-text fallback at lines 4292–4326 — someone hit this before and patched one site locally.
- **`services/shared/clone-copy-match.cjs`** reimplements the tiebreak in a comment claiming to
  mirror `pickPreferredAudioRow`, but **omits the human > TTS rule** — it orders on newest-then-id
  only. The cause is upstream: `SELECT_COLS` in `clone-copy-index.cjs` does not fetch `origin` at
  all, so the rule *cannot* be applied there. A cross-course copy can therefore prefer a newer TTS
  row over a human recording. Left unchanged deliberately: fixing it changes **which voice gets
  copied between courses**, which is a content/voice call, not a tooling one — flagged for Kai
  rather than decided here.
