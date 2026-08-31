# The Voice Lab casting guard — a cast cannot speak over a human recording

**2026-08-31.** Tom's ruling: label human-recorded languages on screen before the tap, and never let
a language-level Cartesia cast silently override the per-course config those recordings depend on.

## The hole, in one paragraph

Casting writes `voice_language_roles`, keyed by **language**. The reader (`applyLanguageCast`)
overlays that onto every course in the language, per role. The **recording pipeline does not read
the overlay** — `resolveTakeVoiceId` reads `courses.voice_config` straight off the course row
(`services/production-api.cjs:5431`). Cast and splicer resolve the same slot from two different
places, and the cast is the half nobody sees.

## The signal — three parts, none of them sufficient alone

| signal | where | what it alone catches |
|---|---|---|
| **policy** | `services/shared/human-voice-courses.cjs` (existing) | **Welsh.** Its 40,704 human clips are stamped `legacy_import` / `human_aran_cym_n`, and no Welsh course marks a `human` provider anywhere. Nothing else sees it. |
| **stored config** | `voice_config.voices.<role>.provider === 'human'` | `deu_at_for_eng` target2 (Sasha Wanasky) and `fin_for_eng` target1 (Kai) — **two courses on no human-voice list at all**. This is the splicer's own test, so honouring it is what keeps the two in agreement. |
| **measured clips** | new view `course_human_recorded_roles` — `origin='human'` per (course, role) | the backstop for a slot recorded before anyone marked it. |

**Phrase roles only for the measured signal.** Sixteen courses hold ~48 stock English *instruction*
clips each under the shared id `human_recording`. Letting those protect the guide slot would make
the guide cast reach nothing — a guard that deletes the feature it guards. Their usage is already
on screen via `guideVoicesInUse`, and a genuinely human course's guide slot is still protected
because the whole **course** is.

**Protection is by the language the role SPEAKS, not by `target_lang`.** The live probe found this
hole in the first cut: nine courses are taught *from* Welsh (`eng_for_cym` and friends), so their
**known** side is spoken in Welsh while their `target_lang` is English and their course code is on
no list. All fourteen Welsh-touching courses are covered now.

## What changed

- **`services/shared/human-recorded-roles.cjs`** (new) — the three signals, pure, no database.
- **`language-voice-cast.cjs`** — refuses a human-recorded role, reporting `source:'human-recorded'`
  with the reason. Taken before the override check: a recording is a stop, not a preference.
- **`voice-config-service.cjs`** — loads the view on the same cached read as the cast, and logs
  every refusal **unconditionally**, not only when some other role happened to change.
- **`PUT /api/voicelab/languages/:language/slot`** — **409 and writes nothing** when every course the
  cast could reach is human-recorded (checked before the voice is registered, so a refused cast
  leaves no trace). Otherwise the cast saves and the response carries `skipped[]`.
- **Languages screen** — a row-level `N human-recorded courses` pill on languages whose status pill
  does not already say it; a detail block naming each course, its roles and clip count; the
  candidate list replaced by the reason where casting is refused; and the skipped list shown after
  a partial cast.
- **`tools/voice/verify-human-voice-cast-guard.cjs`** — the read-only proof, rerunnable.

## Proof against the live estate — read-only, nothing written

```
cast on "cym"  reaches 14 courses; 14 human-recorded  → 409, nothing written
   cym_n_for_eng, cym_s_for_eng, cym_nnew_for_eng, cym_anthem_for_jpn, cym_for_yor  (policy-course)
   ara/deu/fra/ita/jpn/kor/por/spa/zho_for_cym  known side  (policy-language)
   reader: cym_n_for_eng known/target1/target2/instruction/encouragement ALL REFUSED, config unchanged

cast on "eng"  reaches 103 courses; 4 human-recorded  → saved, 4 skipped
   skipped: cym_n_for_eng, cym_nnew_for_eng, cym_s_for_eng, pdc_for_eng  (known)
   deu_at_for_eng: known CAST, target2 REFUSED (stored-human-slot)
   spa_for_eng:    known CAST

cast on "deu"  reaches 9 courses; 1 human-recorded  → saved, 1 skipped
   deu_at_for_eng: target1 CAST, target2 REFUSED (stored-human-slot)

cast on "spa"  reaches 10 courses; 0 human-recorded  → saved, nothing skipped
   spa_for_eng: target1 CAST, target2 CAST
```

## Additive, not a redesign

The **32 existing `language-voice-cast` tests pass unchanged** — including the empty-table
invariant (no cast rows → the stored config back by reference equality). 19 new tests: 16 on the
guard, 3 on the endpoint's 409 / skipped[] behaviour. 51 green.

## One thing worth your eye

`deu_at_for_eng` and `fin_for_eng` are human-recorded and on **no human-voice policy list**. The
stored-config marker catches them, so they are safe from casting — but they are also not excluded
from TTS render queues the way Welsh, Breton and Pennsylvania Dutch are. That is a separate
question from this one and I have not touched it.
