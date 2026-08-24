# Verify against known text — the canonical STT mode

*2026-08-24. Tom's ruling, and the measurements that shaped how it was built.*

---

## The ruling

> "We always know the prescribed sentence, so the question is never open transcription —
> where Whisper is weak on Welsh, Icelandic compounds, French spoken times — but
> verification: is this audio a rendition of this known text?"

Built into the canonical engine (`services/audio-veracity.cjs`), so one implementation serves
the render gate, the repair loop and the human-upload path. No ad-hoc scripts.

## What changed

`checkAudioVeracity` now runs in **verify mode** by default. The free, unprimed decode is still
tried first and still decides when it can. Only when it condemns a clip does the engine ask the
verification question: decode again with the known text as whisper's `--prompt`, and score that
decode against the known text.

A rescue must clear five things, not one:

| Check | Constant | Why |
|---|---|---|
| Real speech in the primed decode | rule 1, unchanged | Catrin's room takes |
| Similarity ≥ 0.60 | `VERIFY_THRESHOLD` | the measured gap is 0.31 → 0.82, wide and empty |
| Word coverage ≥ 0.60 | `VERIFY_MIN_COVERAGE` | similarity can be carried by a shared prefix |
| The last word still present | rule 3, unchanged | Tom's 2026-08-07 dropped-final-word class |
| Speech span ≥ 0.14 s/syllable | `VERIFY_MIN_SEC_PER_SYLLABLE` | the truncation veto — see below |

Scoring runs through the **same currency the free verdict uses** — synthesis cues stripped,
numerals aligned, normalised — so verification never re-litigates a difference the free gate
already knows is orthography.

Cost: the ~97% of clips that pass today still pay for exactly one decode. Only the failing
minority pays for a second, against a re-render that costs three TTS attempts.

Escape hatch: `AUDIO_VERACITY_VERIFY=off` reverts to the free-only gate.

## The two hallucination worries — tested, not argued

**Prompt echo** — "the model will just parrot the prompt back." Control: re-prime each of the 15
Icelandic clips with a *different* clip's sentence and score against that wrong sentence.

| | similarity |
|---|---|
| primed with the truth | 0.82 – 1.00 |
| primed with a wrong sentence | 0.00 – 0.31, mean 0.13 |

A prompt biases the decoder; it does not overwrite the acoustics. That is the whole difference
from the `--grammar` experiment the 2026-08-04 findings warn about, where removing the decoder's
alternatives sent its confidence to ~1 regardless of what was in the audio.

**Priming noise into speech** — the Catrin case, three takes of an empty room (one with a sheep)
that the *free* decode turned into fluent Welsh. Priming does the opposite of the fear: all three
primed decodes came back **empty, scoring 0.000**. With a hypothesis to test, the model finds no
support for it and says nothing; with no hypothesis, it invents one. **Verification is the safer
mode on noise, not the riskier one.**

## The worry that turned out to be real: truncation

Replaying the 165 labelled clips the free gate was fitted on:

| group | n | free passes | **verify rescues** |
|---|---:|---:|---:|
| silent_stub | 25 | 0 | 0 |
| near_silent | 21 | 0 | 0 |
| **truncated** | 25 | 0 | **17** |

Seventeen truncated clips primed back to the *complete* sentence at similarity 1.00, coverage
1.00. "can you check the weather?" — a clip that stops partway — primed to the full sentence.
It is obvious in hindsight: noise and wrong text remove the acoustic evidence, so the prompt has
nothing to lean on; truncation leaves most of it intact and the prompt supplies the tail, which
is precisely what a language model is best placed to invent. No text-layer rule can catch this,
and the last-word rule least of all — the decode being checked is the one that hallucinated the
last word.

The check has to come from outside the decoder, and Tom's own instrument does it: count the
script's syllables, measure the clip's actual VAD speech span, divide.

| group | s/syllable |
|---|---|
| truncated | max **0.132** (median 0.101) |
| good_paired | min **0.152** (median 0.234) |
| good_unflagged | min **0.144** (median 0.194) |

The floor sits at **0.14** — inside that gap, 6% above everything truncated and 3% below
everything good. It vetoes a *rescue* only: a clip the free decode already passed is never
re-judged by it, so it cannot cost anything that passes today.

## Result — the A/B, same corpus, same code, one env flag apart

227 clips end-to-end through the real `checkAudioVeracity`, nothing stubbed. The only difference
between the two columns is `AUDIO_VERACITY_VERIFY`.

| | n | free (today) | **verify** |
|---|---:|---:|---:|
| **KNOWN GOOD** | | | |
| labelled good_paired | 50 | 50 | **50** |
| labelled good_unflagged | 27 | 23 | **25** |
| Welsh human takes, good | 11 | 6 | **11** |
| Icelandic pod controls (linked, live) | 15 | 8 | **15** |
| French pod controls (linked, live) | 15 | 15 | **15** |
| *good clips passing* | *118* | *102* | ***116*** |
| **KNOWN BAD** | | | |
| labelled silent_stub | 25 | 0 | **0** |
| labelled near_silent | 21 | 0 | **0** |
| labelled truncated | 25 | 0 | **0** |
| Welsh noise-only takes | 3 | 0 | **0** |
| *bad clips passing* | *74* | *0* | ***0*** |
| **PREVIOUSLY QUARANTINED** | | | |
| Icelandic pod quarantine | 15 | 0 | **14** |
| French pod quarantine | 3 | 3 | 3 |

**Good clips wrongly refused: 16 → 2. Bad clips wrongly passed: 0 → 0.**

The two good clips still refused are `last_word_missing` — the pre-existing Rule 3, untouched by
this work.

The line that matters most is the one nobody was looking at: **8 of 15 live, linked, already-
published Icelandic clips fail the free gate**, and **5 of 11 of Catrin's good Welsh takes do**.
Those are not quarantine candidates — they are clips that shipped. The free gate has been wrong
about roughly half of the Welsh and Icelandic audio it has ever been pointed at, and that is the
cost Tom's ruling removes.

⚠️ **whisper is not bit-reproducible under the threaded wrapper.** The French clips decoded as
"…jusqu'à 10h." on one run and "…jusqu'à 10h00." on another, which straddles the CER threshold;
the Icelandic quarantine count moved between 13 and 14 across runs for the same reason. Treat
single-clip counts as ±1, not as exact.

## The three named validation cases

**Icelandic — the 11 quarantined pod sentences** (`docs/pods/isl-pod-1-render-failure-2026-08-22.md`).
15 quarantined clips on disk. **14 verify and would now publish** (13 on a second run — see the reproducibility note above). Not one of them passes the free gate. Free-decode
similarity ran 0.00–0.66; primed 0.82–1.00 on the ones that clear. The one that does not is
genuinely mis-rendered, and priming did not launder it: "Gangi þér vel með það!" primed to
"Kon kið servið al maðsás?" — similarity 0.29, still refused.

**French SC11-S008 — the spoken-times false positive** (fixed upstream; measured anyway)**.** "De sept heures et demie jusqu'à dix
heures…" free-decoded as "de 7h30 jusqu'à 10h…" — *the same words, written as a clock*, CER 0.26.
Three quarantined render attempts of that sentence exist. Primed, they score 0.99 / 0.60 / 0.23:
attempt 1 verifies and would publish, and the other two are genuinely damaged (one is missing the
first clause, one decodes to whisper's "Sous-titres réalisés par la communauté d'Amara.org"
subtitle hallucination). The mode discriminates *between attempts of the same sentence*.

**Welsh — Catrin's noise takes must still fail.** They do, cleanly, and her good takes stop being
punished for it:

| | primed similarity | verifies |
|---|---|---|
| 11 good human takes | 0.886 – 1.000 | **11/11 yes** |
| 3 noise-only takes | 0.000, 0.000, 0.000 | **0/3** |

Including "Bore da. Sut wyt ti?" — the take Tom listened to and called perfect, which the free
decode read as "Poreddaa. Siwtwit'i." and refused at CER 0.50. It now verifies at 1.000.

## Numerals: already solved upstream, deliberately not re-solved

The first cut of this work grew its own digit handling and it was worse. `numeralVariants` /
`alignedPair`, already on main, read both sides into the same currency before anything is
measured — including French clock times, so "7h30" and "sept heures et demie" are the same string
by the time the gate sees them. Verify mode scores through that same path. The Icelandic
quarantine whose script says "19. … 20. … 21." and whose decode spells them out scores
**similarity 1.00, coverage 1.00** with no special case at all.

That is also why the French spoken-times class needs no verification-layer answer: it already has
one, upstream, and a second answer to the same question would have been a worse one competing
with it.

## Scope

- **Human recordings: checked always**, in `services/production-api.cjs`'s upload path, alongside
  the existing speech gate. **Advisory, never a refusal** — per Tom's ruling STT is not a hard
  veto; voice-match and VAD are. The verdict is logged and rides back on the upload response as
  `textVerification` so the recorder can show it. Nothing is auto-flagged.
- **TTS: whatever the phase-8 sampler already samples.** Verify mode lives inside
  `checkAudioVeracity`, so every existing caller — the render gate, the repair loop, the pod
  verifier — gets it with no call-site change.

## Explicit gaps

- **The syllable counter is fitted for English and German only**, and the truncation floor was
  fitted through it on English and German truncations. Other languages run through the generic
  vowel-group counter. Measured headroom where it matters: the Icelandic and Welsh clips this mode
  exists to rescue sit at 0.157–0.736 s/syllable, the nearest 12% clear of the floor. That is real
  headroom, but it is not a fitting. A language whose written form over-counts syllables would be
  refused wrongly, and the fix is to measure that language, not to widen the floor blind.
- **`good_kept` (17 clips of the 165) was excluded from the calibration.** Its members are not
  reliable ground truth: "they know about the problem" is labelled good and is a 0.69-second file,
  which is not a physically possible reading of that sentence. Calibration used the five
  unambiguous groups (77 good, 71 bad).
- **Mispronunciation is still not covered**, exactly as the free gate's header says. Verification
  makes that class *harder* to see, not easier — a prompt gives the decoder something to snap a
  wrong phoneme onto. This mode is validated on silence, noise, wrong-text and truncation.
- **The thresholds are defaults, not rulings.** 0.60 / 0.60 / 0.14, fitted 2026-08-24 on 209 clips
  in five languages. Each is a named constant and env-overridable.
- **`renderChecked` still quarantines and refuses to publish** on a failed check. That is a
  pre-publish render decision, not a course veto, and it is unchanged by this work — but it is the
  behaviour the 2026-08-24 pod report's "STT can no longer veto a course" refers to, and giving the
  render gate the pod verifier's voice+VAD-hard rule remains unmade. Named, not done.

## Files

- `services/audio-veracity.cjs` — verify mode, the scorers, the truncation veto
- `services/audio-veracity.test.cjs` — the operating point pinned against the real decodes above
- `services/production-api.cjs` — human-upload advisory check
- Corpus and probe logs: `/home/tomcassidy/stt-verify-corpus-2026-08-24/` (209 clips, not committed)
