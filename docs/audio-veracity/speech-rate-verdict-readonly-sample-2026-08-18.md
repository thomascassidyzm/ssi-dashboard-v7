# speechRateVerdict against the veracity cache — read-only sample

**2026-08-18. Advisory only. Nothing was wired in, nothing was rendered, nothing was written.**
`renderChecked` and the live publish gate are untouched; `speechRateVerdict()` remains
unreferenced by any call site (`services/audio-veracity.cjs:1251`, from d217682d4).

## The four answers

1. **36 of 5,341 cached decodes would be flagged — 0.67%.** All 36 are `too_fast_for_text`.
   `too_slow_for_text` never fired once.
2. **Flag rate by language: fr 36/4,257 (0.85%), en 0/1,084 (0%).** The cache holds only these
   two languages — it is the fra_for_eng render history. By voice: **0 flagged across all 1,150
   voice-attributable clips**, because every flagged clip's DB row is gone (see the gap below).
3. **Spot-checked 12 clips — all 12 are real defects. Zero false positives.**
4. **Read: the false-positive picture is clean, but this sample cannot license an estate-wide
   gate.** Advisory/log-only first, and measure a second language before enforcing.

---

## What was actually measured, and how

The decode cache (`~/.audio-veracity-verdicts.json`, the one
`tools/reverify-veracity-cache.cjs` replays) **does not carry clip duration** — its `ms` field is
whisper's wall-clock, not audio length (`services/audio-veracity.cjs:1391`). `speechRateVerdict`
needs `durationMs`, so duration was measured by ffprobing the mastered objects themselves. That is
the ground truth rather than a substitute for it: `mastered/<uuid>.mp3` is write-once, and all
5,341 objects were readable. Cost: 5,329 S3 GETs of ~11 KB each. **No TTS, no ASR, no writes.**

Voice and course came from `course_audio` + `audio_clips`, joined on `s3_key`.

## Rate distribution across the whole cache

| | min | p1 | p5 | p50 | p95 | p99 | max |
|---|---|---|---|---|---|---|---|
| chars/sec | 6.08 | 9.11 | 11.81 | **18.68** | 23.93 | **27.13** | 33.28 |

The band is 4–28. The floor has enormous headroom (nothing came within 2 cps of it). **The ceiling
does not**: p99 sits at 27.13 against a 28 gate. 44 clips abstained as `text_too_short_to_rate`.

## The evidence that settles it: every flagged text has a normal sibling

Each of the **36 flagged clips has at least one other render of the identical text elsewhere in the
cache, and every sibling is 25–45% longer.** Not one flagged clip is the only render of its text.
That is not a threshold argument — it is the estate's own voices saying how long that sentence
takes, and each flagged clip failing to take it.

| cps | flagged ms | sibling ms (✗ = itself failed) | ASR gate | script | whisper heard |
|---|---|---|---|---|---|
| 28.01 | 1214 | 1800 | **fail** — last_word_missing | `c'est exactement ce que je pensais` | `c'est exactement ce qu'il y a.` |
| 28.06 | 998 | 1344 | pass | `j'aurais fait ça aujourd'hui` | `J'aurais fait ça aujourd'hui.` |
| 28.07 | 962 | 928✗ | **fail** — last_word_missing | `nous n'espérions pas partir` | `Nous n'espérions pas.` |
| 28.10 | 1388 | 1920 | **fail** — last_word_missing | `j'ai l'impression de faire ça très bien` | `J'ai l'impression de faire ça tout.` |
| 28.25 | 1876 | 2256 | **fail** — last_word_missing | `nous n'essayons pas de dire que ce n'est pas comme ça` | `Nous n'essayons pas de dire que ce n'est pas...` |
| 28.26 | 1734 | 2112 | pass | `je ne sais pas pourquoi tu voulais nous retrouver` | `Je ne sais pas pourquoi tu voulais nous retrouver.` |
| 28.28 | 1450 | 1944 | **fail** — last_word_missing | `je pense que c'est très gentil de ta part` | `Je pense que c'est très gentil.` |
| 28.66 | 1012 | 1680 | **fail** — last_word_missing | `j'essaie de faire un peu plus` | `J'essaie de faire un peu.` |
| 28.85 | 832 | 1152 | **fail** — last_word_missing | `c'est pour cela que nous` | `C'est pour cela que...` |
| 28.86 | 1490 | 2256 | **fail** — last_word_missing | `il est important d'y aller avec le prochain` | `Il est important d'y aller avec moi.` |
| 28.89 | 1246 | 1704 / 1824 | **fail** — last_word_missing | `je ne connais pas ces gens très bien` | `Je ne connais pas ces gens.` |
| 28.97 | 932 | 1392 | pass | `quand on travaille ensemble` | `Quand on travaille ensemble.` |
| 29.02 | 758 | 1128 | **fail** — last_word_missing | `je ne l'aurais pas dit` | `Je ne l'aurai pas.` |
| 29.04 | 1102 | 1416 | **fail** — last_word_missing | `pourquoi c'est le meilleur choix ?` | `Pourquoi c'est le meilleur...` |
| 29.09 | 1100 | 1632 / 1584 | **fail** — last_word_missing | `je voulais dire ce que j'ai fait` | `je voulais dire ce qu'il y a.` |
| 29.09 | 928 | 962✗ | **fail** — last_word_missing | `nous n'espérions pas partir` | `Nous n'espérions pas.` |
| 29.11 | 1580 | 1968 | **fail** — last_word_missing | `nous n'essayons pas de nous arrêter maintenant` | `Nous n'essayons pas de nous arrêter.` |
| 29.28 | 888 | 1224 | pass | `elle voulait te rencontrer` | `Elles voulaient te rencontrer.` |
| 29.41 | 1020 | 1464 | **fail** — last_word_missing | `ce n'est pas le meilleur choix` | `Ce n'est pas le meilleur.` |
| 29.46 | 1358 | 2088 / 1944 | **fail** — last_word_missing | `je vais dire que je ne suis pas d'accord` | `je vais dire que je ne suis pas.` |
| 29.72 | 1548 | 2376 | **fail** — last_word_missing | `je ne pouvais pas penser à ce qui se passerait` | `Je ne pouvais pas penser à ce qu'il y ait.` |
| 29.76 | 1882 | 2640 | **fail** — last_word_missing | `il y a quelque chose d'important dans ma tête maintenant` | `Il y a quelque chose d'important dans ma tête.` |
| 29.93 | 1136 | 1560 / 1680 | **fail** — last_word_missing | `j'ai fait beaucoup en peu de temps` | `J'ai fait beaucoup en plus.` |
| 30.04 | 932 | 1776 | **fail** — last_word_missing | `je suis plus fatigué qu'hier` | `Je suis plus fatigué.` |
| 30.08 | 798 | 1326 | **fail** — last_word_missing | `tu ne devrais pas partir` | `Tu ne devrais pas.` |
| 30.13 | 896 | 1440 | pass | `je comprends ce qu'il a dit` | `Je comprends ce qu'il m'a dit.` |
| 30.24 | 1356 | 1800 / 1944 | **fail** — last_word_missing | `est-ce que tu peux penser à quelque chose ?` | `Est-ce que tu peux penser à qui ?` |
| 30.41 | 1710 | 2328 | **fail** — last_word_missing | `ce dont nous parlions tout à l'heure était important` | `Ce dont nous parlions tout à l'heure est...` |
| 30.43 | 986 | 1320 | pass | `tu pourrais m'aider maintenant ?` | `Tu pourras m'aider maintenant.` |
| 30.70 | 684 | 1080 / 1080 | pass | `comment tu t'appelles` | `comment tu t'appelles` |
| 30.70 | 684 | 1080 / 1080 | pass | `comment tu t'appelles?` | `comment tu t'appelles` |
| 30.91 | 1650 | 2328 / 2520 | **fail** — last_word_missing | `je ne connais pas la personne de laquelle tu parles` | `Je ne connais pas la personne de l'accès.` |
| 31.14 | 1670 | 2256 | **fail** — last_word_missing | `tu ne devrais pas t'inquiéter de faire quelque chose` | `Tu ne devrais pas t'inquiéter de faire…` |
| 31.58 | 1140 | 1680 | pass | `qu'est-ce que tu apprends maintenant ?` | `Qu'est-ce que tu apprends maintenant ?` |
| 32.03 | 718 | 1104 | **fail** — last_word_missing | `je ne l'aurais pas fait` | `Je ne l'aurai pas.` |
| 33.28 | 1262 | 1944 / 2400 | **fail** — last_word_missing | `ce sont des gens que je ne connais pas ici` | `Ce sont des gens que je ne connais pas.` |

**27 of the 36 already fail the ASR gate, every one of them for `last_word_missing`.** Two
independent checks — one reading the transcript, one reading the clock — agree on the same 27
clips. That is not redundancy to be pruned; it is the rate check earning its calibration.

**The 9 that ASR passes are where the new coverage is.** Whisper transcribes fast speech perfectly
well, so a rushed-but-complete render sails through a transcript check. The rate check is the only
thing that sees it.

## Spot check — 12 clips, one verdict each

Method per clip: fetch the mastered object; ffprobe duration (cross-checked against a decoded WAV —
identical to the millisecond on all six tested, so the mp3 headers are not lying); silence-map at
−45 dB; energy of the final 120 ms; and compare against the sibling render of the same text.
The tail-energy test is the discriminator — **a clip cut mid-word ends loud, a clip that merely
rushed ends in the synthesiser's own tail silence.**

I did not listen to these with ears. That is a real limit and it is stated rather than papered over
— but "0.68 s of speech for a six-syllable French sentence, where the same sentence renders at 1.08 s
twice elsewhere" is not an ear question.

**The nine the ASR gate passed:**

1. `comment tu t'appelles` — 684 ms, 0.566 s of speech, **37.1 cps over the speech span**. Two
   sibling renders of the same text, both 1080 ms, both passing. Six syllables in 0.57 s is
   ~10.6 syll/sec — past the ceiling of natural fast speech. **REAL.** Rushed render, ASR blind to it.
2. `comment tu t'appelles?` — same clip, same 684 ms, reached under the punctuated spelling of the
   text. **REAL** (and the same underlying defect as #1 — the 36 are 35 distinct clips).
3. `qu'est-ce que tu apprends maintenant ?` — 1140 ms vs a 1680 ms sibling; 36.9 cps over speech.
   Whisper got every word, and the clip ends in digital silence, so nothing was cut — the voice
   simply sprinted. **REAL** (rushed, not truncated).
4. `je comprends ce qu'il a dit` — 896 ms vs 1440 ms sibling, 35.0 cps over speech. 38% short of
   its own text's normal length. **REAL.**
5. `tu pourrais m'aider maintenant ?` — 986 ms vs 1320 ms, 34.8 cps. Also note whisper heard
   "Tu **pourras**" — a rushed conditional losing its syllable is exactly what over-speed does to
   intelligibility. **REAL.**
6. `quand on travaille ensemble` — 932 ms vs 1392 ms, 34.4 cps. **REAL.**
7. `j'aurais fait ça aujourd'hui` — 998 ms vs 1344 ms, 32.0 cps. The mildest of the nine and the
   closest to a judgment call; the sibling gap (35%) still carries it. **REAL, low confidence.**
8. `elle voulait te rencontrer` — 888 ms vs 1224 ms, 30.9 cps. Tail energy −68.7 dB, the only
   spot-checked clip not ending in flat digital silence: a fading cut rather than a clean stop.
   Whisper heard the plural "Elles voulaient". **REAL.**
9. `je ne sais pas pourquoi tu voulais nous retrouver` — 1734 ms vs 2112 ms, 30.4 cps. The longest
   text of the nine and the smallest relative gap (18%). Full decode, clean silent tail. **REAL,
   low confidence** — this is the one I would expect a wider band to release.

**Three the ASR gate already failed, checked to confirm the two checks agree on the same object:**

10. `j'ai l'impression de faire ça très bien` — 1388 ms vs 1920 ms sibling. **Tail energy −16.7 dB:
    this clip ends at full speaking volume.** It was cut mid-utterance at the file level. Whisper
    heard "…faire ça tout." **REAL, and the clearest truncation in the sample.**
11. `c'est exactement ce que je pensais` — 1214 ms vs 1800 ms; ends in silence but the last words are
    absent from the decode ("ce qu'il y a"). The synthesiser stopped early rather than the file being
    chopped. **REAL.**
12. `nous n'espérions pas partir` — 962 ms; its only sibling is 928 ms and **also fails**. The one
    text in the whole set with no healthy render anywhere. **REAL**, and worth a look on its own —
    both takes of this line are bad.

**Score: 12 real, 0 false positives.** Two (#7, #9) I would call low-confidence rather than wrong.

## A second corroboration, and the gap it comes from

**Not one of the 36 flagged clips still has a live row in `course_audio` or `audio_clips`.**
Across the cache as a whole, 1,150 of 5,341 clips (21.5%) still do. If flagged clips were ordinary
renders, ~8 of 36 would be expected to survive; zero did (p ≈ 1.6 × 10⁻⁴). Every clip this check
would refuse has already been superseded and unlinked by the existing process. The check is
pointing at exactly the clips the estate already threw away — it would simply have caught them one
render earlier, before the ASR pass paid for the decode.

**EXPLICIT GAP, stated rather than papered over.** That same fact is why the by-voice breakdown is
thin: only 21.5% of cached clips are voice-attributable, and the flagged 36 are all in the
unattributable 78.5%. `course_audio.s3_key` carries no index (a single `.eq()` lookup on it times
out against 2.56 M rows), so attribution came from full scans of the seven French course codes plus
all 746,535 rows of `audio_clips`. **The by-voice flag rate is therefore 0/1,150 across
`xai_gfzdpspr5fdp` (en, 879), `xai_leo` (fr, 251), `xai_eve`/`eve` (fr, 17) and
`gfzdpspr5fdp` (en, 3) — which says the surviving estate is clean, not that any voice was cleared
of the 36.** The voices behind the flagged clips cannot be recovered from the DB; their rows are gone.

## The read

**The false-positive picture is clean.** 0.67% flag rate, 36 flags, 36 with an abnormally short
duration against their own text's sibling renders, 27 independently condemned by the ASR gate, 12
spot-checked and 12 real. On this evidence the primitive does what its docstring claims: it catches
order-of-magnitude events and abstains everywhere else.

**But this sample cannot license enforcement estate-wide**, for three reasons that are facts about
the data, not caution for its own sake:

1. **One language pair, one voice family.** 4,257 fr + 1,084 en, xai voices, fra_for_eng. The band
   was originally measured on nld. Two languages is not the estate.
2. **The ceiling has almost no headroom.** p99 = 27.13 against a gate of 28. A voice or language
   that reads 5% faster than fra_for_eng's would start refusing healthy audio — which is precisely
   the defect `speechRateVerdict` was written to remove. The floor, by contrast, is untested and
   safe: nothing in 5,341 clips came near 4 cps.
3. **`too_slow_for_text` fired zero times.** Half the primitive has no evidence behind it here.

**Recommendation.** Wire it in **advisory-only first** — compute the verdict on every render, log
it, refuse nothing — and let one week of real renders across the estate's other languages produce
the cps distribution per language and voice. If p99 stays clear of 28 everywhere, enforce; if it
does not, the fix is a per-language band measured from that log, not a wider global one.
Enforcing today on two languages' evidence would be the same shape of mistake the
"old clip as reference" check was.

## Reproduction

All read-only, all in the gitignored `scripts/` workspace:

- `scripts/harvest-durations.cjs` — ffprobe every cached clip from S3 → `clip-durations.json`
- `scripts/scan-course-meta.cjs` / `scripts/scan-shard.cjs` — voice/course attribution
- `scripts/speech-rate-score.cjs` — replay `speechRateVerdict` → `speech-rate-findings.json`
- `scripts/spotcheck-detail.cjs` — per-clip silence map, tail energy, speech-span cps
