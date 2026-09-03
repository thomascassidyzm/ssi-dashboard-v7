# Pod 1 language-gate re-run — 2,043 clips, repaired gate — 2026-08-24

Read-only re-run of the (now-repaired) whisper phonology gate over the
2,046-row candidate list from `docs/pods/pod1-xai-ungated-render-candidates-2026-08-24.json`
(job #320's blast-radius audit). **No TTS, no writes to course content.** The
candidate list has 3 duplicate `audio_id` rows; **2,043 unique clips** is the
real population and 2,043/2,043 were measured — full coverage, nothing skipped.

Executed in the foreground, single stream, `AUDIT_CONCURRENCY=6` against the
repaired `~/.local/bin/whisper-cli` semaphore (nice 15, `SCHED_IDLE`) — the box
was carrying the fleet splice throughout, so this ran at low priority and took
~2h40m wall clock rather than being fast. Two prior attempts (#345, #348)
backgrounded this and produced 2 completed rows between them; this run did the
other 2,041 in the foreground, chunked under the tool's timeout ceiling, and
never let the process go unattended.

## Result

| Verdict | Count | % |
|---|---:|---:|
| pass | 1,994 | 97.6% |
| wrong-language | 49 | 2.4% |
| unmeasurable | 0 | 0% |

Zero `unmeasurable` — every fetch through the live learner path
(`ssi-learning-app.vercel.app/api/audio/<id>`) succeeded and every clip
decoded to a non-null whisper language, across all 2,043 clips.

## Per-course

| Course | Pass | Wrong-language | Unmeasurable |
|---|---:|---:|---:|
| ara_eg_for_eng | 153 | 8 | 0 |
| deu_at_for_eng | 229 | 2 | 0 |
| deu_for_eng | 164 | 0 | 0 |
| fra_for_eng | 186 | 0 | 0 |
| hin_for_eng | 155 | 12 | 0 |
| ita_for_eng | 186 | 2 | 0 |
| kor_for_eng | 45 | 0 | 0 |
| nld_for_eng | 158 | 6 | 0 |
| por_br_for_eng | 119 | 1 | 0 |
| por_for_eng | 158 | 4 | 0 |
| spa_for_eng | 48 | 0 | 0 |
| swe_for_eng | 215 | 14 | 0 |
| zho_for_eng | 178 | 0 | 0 |

`hin_for_eng` and `swe_for_eng` carry more than half the flags between them
(12 + 14 = 26 of 49). Four courses (deu, fra, kor, spa, zho — five, actually)
have zero flags.

## Honesty check on the 49 — not all equally credible

Read plainly, not dressed up: three known confound classes cover a large
share of these 49, so "49 wrong-language" should not be read as "49 confirmed
bad clips" without applying judgement.

1. **Related-language confusion — 9 of 49.** `hi→ur` (4) and `sv→no` (5).
   Hindi/Urdu are near-identical spoken (Hindustani); Swedish/Norwegian are
   the closest pair in Scandinavian. Whisper confuses these pairs on
   correctly-spoken audio too — this is a known STT limitation, not
   necessarily a rendering defect (`[[related-language-pairs-break-leak-detectors]]`).
2. **Short clips — 30 of 49 (61%) are under 2 seconds**, median 1.8s, down to
   696ms. `[[whisper-language-id-unreliable-on-short-clips]]` measured the
   gate calling shipped, correct French `je` "Turkish" at 400-600ms — sub-2s
   single-utterance clips are the gate's known blind spot.
3. **Numeral/list lines** ("Sju. Nio. Elva. Orange. Lila." / "पाँच। दस।
   पंद्रह।") are overrepresented — these are short, staccato, low-phoneme-
   content lines that read as noise to whisper even in the target language.

None of this proves the 49 are fine — it means **a second pass (native ear,
or forced-language re-transcription per `[[whisper-language-id-unreliable-on-short-clips]]`'s
recipe) is needed before any is treated as a confirmed defect or queued for
re-render.** That second pass is out of scope for this read-only gate re-run.

The `→en` cluster (17 of 49: 5 hi, 4 nl, 4 sv, 2 ar, 2 pt) is the one worth
watching hardest — it's the only pattern that would corroborate Tom's original
"accent drift" concern rather than an STT confound, since English is not a
close relative of any of the 5 target languages involved.

## Failing clips

Full list with duration and text: `docs/pods/pod1-language-gate-failures-2026-08-24.json`
(49 rows, `audio_id`/`course_code`/`pod_sentence_id`/`expected_language`/`detected_language`/`duration_ms`/`text`).

Phone-readable version with tap-to-play players for all 49:
see the published doc link in the chat report.

## Raw results

Full 2,043-row JSONL (pass + wrong-language + unmeasurable, one per clip):
`docs/pods/pod1-language-gate-results-2026-08-24.jsonl`

## What this does NOT tell you

Per the original blast-radius audit: whisper identifies the language of the
**words**, not the accent. This re-run — like the original acoustic sample —
cannot detect accent drift within a correctly-language-identified clip. If
Tom's concern is "sounds off" rather than "wrong language entirely", this gate
is silent on it by design.
