# deu_for_eng — "ich will" reverted to the previous take

**2026-08-07.** Aran reported the round-1 German LEGO clip now sounds like "Ich ver" — the
final *l* gone. Tom's ruling: put the previous version back. Done, and verified on the bytes
the app actually serves.

## What had happened

The 6 August "regen from scratch" pass re-rendered seeds 1–5 and then **relinked** every
holder slot from the old `course_audio` rows to brand-new ones. Nothing was deleted: the
January rows and their S3 objects are all still there, marked `::superseded-regen`.

| slot | was (Jan 2026) | became (6 Aug) |
|---|---|---|
| target1 | `0f37d106…` `mastered/1CD434B3….mp3` voice `xai_ara`, 768 ms | `823cf48a…` voice `ara`, 744 ms |
| target2 | `695a757c…` `mastered/0BEF3EF1….mp3` voice `leo`, 696 ms | `ca2c4e01…` voice `leo`, 744 ms |

Because a relink is a *pointer* move, not a clip swap, there is no `course_audio_revisions`
row to walk back for target1 — which is exactly why `tools/seed1-relink-revert.cjs` exists
(the `audio-repair revert` verb can only reverse same-row byte swaps). That is the tool used.

## Verifying the old take before touching anything

Make-before-break: the replacement asset was checked alive and correct before the swap.

- Both old S3 objects fetched and decoded cleanly (ffprobe: 744 ms and 664 ms).
- Unprimed whisper round-trip, **two models × two language settings** (small/medium, `-l de`
  and `-l en`): all four decodes read **"Ich will."** for both old clips.
- Voice continuity: `xai_ara` and `ara` are the same voice, two spellings; target2 is `leo`
  either way. No voice regression.
- Both refs already served 200 from the public proxy with byte counts matching S3.

**Honest limit on that evidence.** The whisper check also reads "Ich will" for the *new*
clips — the ones Aran says are wrong. `services/audio-veracity.cjs` says so in its own
header: the method is validated on silence and truncation only, and mispronunciation is
precisely the class where a free decode launders a wrong word into the expected one. So STT
proves the old clips are not silent and not truncated; it cannot by itself certify the
pronunciation.

What does carry weight: **the old takes were in production from 29 January to 6 August and
nobody flagged them.** The complaint arrived only after the regen. The defect is new, and the
take being restored is the one that ran unremarked for six months.

Ears remain the arbiter — the A/B links are below.

## What was changed

`node tools/seed1-relink-revert.cjs docs/audio-repair-2026-08-07/deu-ich-will-revert-plan.json --apply`
— dry run first, each write guarded on the slot still holding the 6 Aug row (0 drift):

| table | row | slot | back to |
|---|---|---|---|
| `course_legos` | `S0001L01` | target1 | `0f37d106…` |
| `course_legos` | `S0001L01` | target2 | `695a757c…` |
| `course_practice_phrases` | `deu_for_eng:S0001L01B01` | target1 | `0f37d106…` |
| `course_practice_phrases` | `deu_for_eng:S0001L01B01` | target2 | `695a757c…` |

Then `courses.audio_stamp` bumped so the app re-reads.

Nothing was deleted. The 6 August rows and objects are untouched and the plan file reverses
cleanly in the other direction if Aran prefers the newer take after all.

## Verified live

`GET /api/courses/deu_for_eng/cycles?from=S0001L01&to=S0001L01` → `S0001L01_intro` now
hands out `target1_id: 0f37d106…`, `target2_id: 695a757c…`, durations 768/696 ms.

`GET /api/audio/<ref>` for both → **sha256 byte-identical to the January S3 objects**
(`265a96fa…`, `199e3b4f…`). Row state and served bytes agree.

## Listen — A/B

Round-1 "ich will", old (now live) vs 6 August (now off):

- target1 **old, now live**: https://saysomethingin.app/api/audio/0f37d106-cb1a-4906-be37-042263330342
- target1 6 Aug, now off: https://saysomethingin.app/api/audio/823cf48a-43bf-40c9-a5d2-56c2be1788c7.v2
- target2 **old, now live**: https://saysomethingin.app/api/audio/695a757c-dce1-4f42-a32e-6e90d1567439
- target2 6 Aug, now off: https://saysomethingin.app/api/audio/ca2c4e01-843c-4b11-a35b-b7cecc40827b.v2

## Deliberately left alone

Two other slots still point at the 6 August "ich will" rows. Both sit outside the rounds
1–200 window Tom marked safe, and the German band 201–400 rebuild is live on port 3469:

- `course_legos` `S0241L02` — the same text as a repeat LEGO, `is_new = false`, seed 241.
- `course_practice_phrases` `deu_for_eng:S0473L01C01` — a component row at seed 473.

They are one line each in the plan file whenever the band run is clear. Say the word.
