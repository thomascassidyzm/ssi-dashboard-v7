# The empty seed clause — what was repaired, 2026-09-03

## The defect

Presentation Frame A ("introduce this chunk with no context sentence") was
produced by stripping the `as in — '{seed}'` clause off the Frame B template
using a hand-maintained list of **language-specific patterns**. Templates are
generated **per known language**, so any known language nobody had added to that
list fell through every pattern; only `{seed}` itself was replaced, and the
stored line kept the connector and an **empty quoted slot**. Spoken aloud, a
Hindi learner heard:

> अंग्रेज़ी में — 'जानते हैं' — जैसे — '' — में :
> *"The English for 'to know', as in '', is:"*

`stripSeedClause` was fixed in `e4e1964ba`. Nothing had touched what was already
stored.

## The measured scope

**16,208 rows, 26 live courses, every one of them with audio.**

Two corrections to what the conversation had assumed:

- **"Not every row has audio rendered; text rows outnumber spoken ones" is
  FALSE for this defect.** All 16,208 affected rows have a non-null `s3_key`, so
  every one of them was being spoken to a learner. The audio pass is the full
  set, not a subset.
- **Zero rows are `origin='human'`.** The precious-audio guard stayed on
  throughout and never fired.

A naive `''` search over-reports and under-reports. It catches apostrophe-final
words (`ita_for_ita` "restare qui ancora un po''", `spa_mx_for_eng` "''twas'"),
and a whole-line template match misses `eng_for_sin` entirely, because those 697
rows were rendered from a template revision whose target-language name differs
by one character from today's. The detector used here is neither: it derives the
one contiguous chunk by which old Frame A and fixed Frame A differ, and excises
that literal chunk. It reconciles to 16,208 exactly.

## Was it audible?

Not everywhere. Two shapes:

- **12,123 rows — audible.** The template's connector is a real word that was
  spoken with nothing after it: Hindi `जैसे`, Gujarati `જેમ`, Punjabi `ਜਿਵੇਂ`,
  Bengali `যেমন`, Urdu `جیسے`, Japanese `のように`, Korean `처럼`, Chinese `如`,
  Tamil `போல`, Sinhala `ඉතින්`. Measured on the served bytes for `eng_for_jpn`:
  old (3.53s) decoded as `「いい」のように、お英語で言うと` — the dangling "as in";
  new (2.06s) decodes as `いい、お英語で言うと`, connector gone, nothing else changed.
- **4,085 rows — text-only, inaudible.** `eng_for_tel` (1,403), `eng_for_kan`
  (1,390) and `eng_for_mar` (1,292) share the template
  `{target_lang_name} — '{known}' — '{seed}' —:`, whose "connector" is just an
  em-dash. Azure speaks nothing for `''` and collapses the extra dash: measured
  over 12 old/new pairs on the served bytes, mean duration change **0.005s**.
  The stored text was wrong; the clip already sounded right. These were
  re-rendered anyway, so text and audio are provably consistent for every future
  veracity check.

## How it was repaired

Text, then audio; nothing deleted at any point.

1. `tools/course-optimization/fix-empty-seed-clause.cjs` rewrites
   `course_audio.text` (`role='presentation'`), the authoritative store the TTS
   step reads verbatim. The before-state assertion IS the update predicate —
   `id` + the exact scanned text + `origin <> 'human'` — so a row that moved
   under the run matches nothing and aborts it. Per-course
   `*-seedclause-text-applied-log.json` carries every before/after.
2. `tools/course-optimization/fix-empty-seed-clause-audio.cjs` drives phase8
   `POST /regenerate-single/:courseCode/:audioUuid` per row. Chosen over the
   per-LEGO `/regenerate-presentation` because **9,515 of the 16,208 rows carry
   `lego_id = NULL`** and that route cannot address them. Make-before-break:
   render → upload a NEW S3 object → `swapClipInPlace` bumps `audio_revision`
   (so the learner ref `<uuid>.vN` moves and devices re-fetch) → the old key is
   only then unreferenced. A row that fails keeps its old clip and its corrected
   text — never silence.

"Produced output" is verified as a **moved `s3_key` read back from the DB**, not
as an HTTP 200. The run aborts non-zero if the first row, or five consecutive
rows, produce nothing — which is exactly what saved 1,298 wasted calls on
`eng_for_ben` (below). Every completed row id is appended to a JSONL, so an
interrupted 1,400-clip run resumes instead of restarting.

## GAP: four courses cannot be re-rendered — xAI is retired

`eng_for_ben` (1,298), `zho_for_hin` (1,110), `eng_for_hin` (1,014) and
`kor_for_hin` (1,021) — **4,443 rows** — cast xAI `eve` as their presentation
voice. `services/shared/tts-provider-policy.cjs` retires xAI from selection by
Tom's own ruling (2026-08-27/28), and there is no Cartesia voice cast for those
languages, so every render is refused before a call is made:

> the configured voice "eve" (provider "xai") cannot be carried onto azure for
> eng_for_ben/presentation. Re-cast this role's voice in voice_config.

**Their TEXT is repaired.** Their audio still speaks the dangling connector, and
this is the audible shape, not the inaudible one. Unblocking them needs a
presentation-voice re-cast for those four courses — a casting decision, not a
repair, and deliberately not taken here. Once re-cast, re-running the audio tool
for each course picks them straight up: the failed rows were never marked done.

Note for planning: the commission expected xAI to be the slow leg — ~4,400 clips
at the measured ~6 clips/min, ten-plus hours. It is not slow, it is blocked.
