# A detector that catches what Tom's ear catches — built and validated

**2026-08-06.** Tonight Tom played two clips outside the app and confirmed both are clipped, which
rules out a player bug. Both of the estate's existing damage checkers scored them clean. This
document is the replacement detector and, more importantly, the validation table that says whether
it actually works.

**Headline: the edge-shape tier catches 9 of 9 clips Tom labelled damaged and flags 0 of 384 fresh
provider renders. Tier 1 measures at 2 of 9 and tier 3 at 2 of 9 — both weaker than expected, and
the reasons why are the most useful things measured tonight.**

Nothing was repaired, no audio was rendered, and nothing was written to the database.

---

## 0. The indictment, in one line

`f0404e5d` is a **1,176 ms file** carrying **936 ms of speech** for the phrase *"to speak German
with you"* — six syllables. `eve`'s own measured rate across 132 untrimmed renders says that takes
**1,224 ms**. Tom, listening: *"how can it get that whole phrase in, in one second???"*

It cannot, and it does not. He hears *"to speak German wi…"* — **"with" cut mid-word and "you"
entirely absent.** The arithmetic corroborates him exactly: the fresh render of the same line
carries 1,310 ms of speech, so **374 ms is gone** — about one syllable of "you" at eve's 221 ms per
syllable, plus roughly 150 ms taken out of the middle of "with".

**Both live checkers passed this file.** That is the clearest statement of the problem: nobody was
asking the cheapest possible question — does the audio last long enough to contain the words? The
honest qualifier, measured below, is that asking it would have caught *this* clip and only one
other of the nine.

---

## 0b. Mid-word truncation, and why it makes ASR worse rather than better

Tom's precision on `f0404e5d` — the cut is **mid-phoneme, not at a word boundary** — is now a
validation criterion, and it sharpens the ASR finding into something stronger than "ASR is blind".

Whisper, decoding that clip, wrote **"with"**. There is no complete "with" in the file. **The model
reconstructed the whole word from a mid-phoneme fragment**, which is exactly what a good ASR is
built to do. So a transcribe-and-diff check does not merely miss mid-word cuts — it *actively
repairs them in the transcript* before the diff ever runs. The better the model, the more reliably
it hides this defect.

Two consequences, both adopted:

- **Tier 3 diffs the last N words, N ≥ 2, never the final word alone.** On `f0404e5d` two words are
  affected — one partial, one gone — and a final-word test attributes the damage to one.
- **A mid-word cut leaves an abrupt waveform ending with no release.** That is precisely what tier 2
  measures, and it is why tier 2 is the tier that actually works here.

---

## 1. Why the old checkers miss it — the finding underneath everything else

**The damage is not a missing word. It is the final word's ending, amputated.**

Whisper recognises a word from its onset. Cut the last 150 ms off "lernen" and whisper still writes
"lernen"; the ear hears the word stop dead. That single fact explains every miss:

| checker | what it scores | why it passes these clips |
|---|---|---|
| unprimed-whisper CER, `services/audio-veracity.cjs` | character error rate vs 0.3 | the word is still transcribed, so CER is ~0 |
| final-word retention (`docs/deu-first5-clipping-emergency-2026-08-05.md` §3) | is the last word present | the last word *is* present |
| tail-ratio / release-time detector | release measured from the global peak at 5 ms | reports 40 ms and 65 ms for clips whose fall actually takes 21 ms and 36 ms |

The clip Tom confirmed tonight, `0df92d35` — "ich will Deutsch lernen" — transcribes **perfectly**:
unprimed whisper returns `"Ich will Deutsch lernen."`, every word, right order. It is still clipped.
Any detector built on what whisper *reads* is blind to this class by construction.

---

## 2. The ground truth

Assembled from tonight's session artefacts in `docs/audio-repair-2026-08-05/`. Every damaged clip is
tested against **the exact bytes Tom heard** — for clips whose repair was already accepted, that is
the superseded S3 key recorded in the accept log, not the replacement.

**DAMAGED — 9 clips, all labelled by Tom's ear**

| id | lang | text | provenance |
|---|---|---|---|
| `f0404e5d` | eng | to speak German with you | confirmed clipped tonight, played outside the app |
| `0df92d35` | deu | ich will Deutsch lernen | confirmed clipped tonight — **this is the seed-2 "lernen" voice-2 clip**, the two are the same clip, not two |
| `4bdae65b` | deu | Ich versuche so oft wie möglich Deutsch zu lernen | R9 "as often as possible" batch |
| `bce8631a` | eng | possible | R9 batch |
| `936fa5bd` | deu | ich versuche so oft wie möglich zu lernen | R9 batch |
| `414ebf08` | deu | so oft wie möglich | R9 batch |
| `2d2c2ef0` | deu | Ich will so oft wie möglich Deutsch sprechen | R9 batch |
| `392cc471` | eng | The German for: 'as often as possible'… is: | R9 batch |
| `b3e4a980` | deu | auf Deutsch | the old v1, pre-repair — the one Tom accepted a replacement for |

**CONTROL — three populations, because one is not enough**

1. **30 clips nobody flagged** — sampled across language, role and length from the 159 seeds-1-5
   clips that neither existing checker flagged and that were never put in front of Tom.
2. **39 fresh provider renders** of those same 39 texts, from the "naked" pass already paid for on
   2026-08-05. These went through no trimming, no silence stripping and no tail detection, so they
   are a population that **by construction contains no truncation**. This is the honest specificity
   test — see the caveat in §6 about why the first control set is not.
3. **All 159 never-flagged clips**, as a "does it flag everything?" check.

Artefacts: `scripts/clip-detector/` (gitignored) — `ground-truth.json`, `selected.json`,
`features.json`, `asr.json`, `validation.json`, `sweep-unflagged.json`.

---

## 3. The tier architecture, and how each tier actually measures

Tom's triage, adopted as the architecture: **tier 1** duration-vs-text (trivially cheap, gross
cases), **tier 2** end-of-clip abruptness (cheap, mid-word cuts), **tier 3** STT transcribe-and-diff
(the authoritative check for the ambiguous band — the `lernen` type, where the speaker is naturally
falling off in volume anyway).

The expectation in that triage was tier 1 + 2 covering most cases at near-zero cost with STT
reserved for the residual. **That half is confirmed: tiers 1 + 2 cover 9 of 9 at no model cost.**
The part that did not survive contact with the data is *which* tier does the covering, and the
assumption that tier 3 is the arbiter. Tier 3 is the weakest of the three on this damage class.

| | tier 1 duration | tier 2 edge shape | tier 3 ASR last-2 |
|---|---|---|---|
| `f0404e5d` to speak German with you | . | **CATCH** | **CATCH** |
| `0df92d35` ich will Deutsch lernen | **CATCH** | **CATCH** | . |
| `4bdae65b` …so oft wie möglich Deutsch zu lernen | . | **CATCH** | . |
| `bce8631a` possible | . | **CATCH** | . |
| `936fa5bd` ich versuche so oft wie möglich zu lernen | . | **CATCH** | . |
| `414ebf08` so oft wie möglich | **CATCH** | **CATCH** | . |
| `2d2c2ef0` Ich will so oft wie möglich Deutsch sprechen | . | **CATCH** | . |
| `392cc471` The German for: 'as often as possible'… is: | . | **CATCH** | **CATCH** |
| `b3e4a980` auf Deutsch (old v1) | . | **CATCH** | . |
| | **2 / 9** | **9 / 9** | **2 / 9** |

Tiers 1 and 3 are genuinely complementary — each catches two clips the other misses, union 4 of 9 —
but tier 2 subsumes both on this set.

---

## 3b. The three approaches, scored on the same data

### TIER 1 — expected duration vs script, in syllables, calibrated per voice

Built to Tom's specification: syllables not words ("words are useless, but syllables are pretty
consistent"), and each **voice** calibrated from its own corpus of presumed-good clips.

- **Syllable method:** vowel-group counting — lower-case, strip punctuation, count maximal vowel
  runs per word against a per-language vowel set (German adds ä ö ü); every word counts at least
  one. It over-counts diphthongs and under-counts syllabic consonants. That is acceptable because
  every clip is counted the same way, so a consistent bias cancels out of the ratio.
- **Rate corpus:** all **384** fresh renders from the 2026-08-05 naked pass — untrimmed by
  construction, so "presumed good" is a fact about how they were made, not anyone's opinion.
- **Model:** a flat syllables/sec was fitted first and **rejected on the data**. Every clip carries
  a fixed onset+release overhead, so a flat rate reads every short clip as slow and every long one
  as fast. The shipped model is a per-voice linear fit, `speechMs = intercept + msPerSyllable ×
  syllables`, which also makes two-syllable clips scorable at all:

| voice | lang | n | intercept | ms/syllable | R² | relative-residual sd |
|---|---|---|---|---|---|---|
| eve | eng | 132 | −102 ms | 221 | 0.909 | 0.237 |
| ara | deu | 114 | +166 ms | 178 | 0.927 | 0.126 |
| leo | deu | 114 | +144 ms | 191 | 0.914 | 0.151 |

**Threshold chosen in the open, not assumed.** Sweep against 9 ear-labelled damaged clips and the
384 never-trimmed renders:

| z ≤ | caught / 9 | false flags on never-trimmed |
|---|---|---|
| −0.75 | 5 | 18.9 % |
| −1.00 | 2 | 11.4 % |
| −1.50 | **2** | **2.5 %** ← ships here |
| −2.00 | 0 | 0.3 % |

**Verdict: real signal, blunter than hoped. 2 of 9 at a usable false-flag rate.**

This is a correction to my own earlier figure and it matters. On a 39-clip baseline this approach
appeared to catch 5 of 9. Calibrating properly on 384 renders showed that was an artefact of an
under-powered baseline: the healthy population's rate spread is far wider than 39 clips suggested
(eve's fastest untrimmed render is 6.85 syll/s, not 5.50). **The bigger corpus made the detector
look worse and the number more true.**

The reason is physical, and it is not fixable by a better threshold: **four of the nine clips lost
only the final word's decay — 50 to 250 ms — which sits inside the corpus's own duration spread**
(relative residual sd 0.13–0.24). There is nothing there for a duration test to see. Tier 1 catches
amputations big enough to move the total, which is exactly the case Tom pointed at, and nothing
smaller.

Keep it: it costs one ffmpeg decode, no model, and it is the tier that makes the defect *legible* —
"a one-second file for a six-syllable phrase" is the sentence that explains the problem to a human.
Do not promote a tier-1 flag to a verdict, and never read a tier-1 pass as "clean".

### TIER 3 — ASR the tail specifically, diffed against the script

Implemented exactly as specified: unprimed whisper (medium model, no initial prompt anywhere) on the
last ~1.3 s of the clip, final word diffed against the script's final word. Full-clip decode run
alongside as the comparison.

**Verdict: it fails, and the failure is informative. 2 of 9 — and the two it catches are the only
two that lost a whole word.**

| clip | script's final word | tail decode | caught? |
|---|---|---|---|
| `f0404e5d` | you | "German with" | **yes** |
| `0df92d35` | lernen | "Deutsch lernen." | no |
| `4bdae65b` | lernen | "wirklich Deutsch zu lernen." | no |
| `bce8631a` | possible | "possible." | no |
| `936fa5bd` | lernen | "wie möglich zu lernen." | no |
| `414ebf08` | möglich | "oft wie möglich." | no |
| `2d2c2ef0` | sprechen | "wie möglich Deutsch sprechen." | no |
| `392cc471` | is | "as often as possible." | **yes** |
| `b3e4a980` | Deutsch | "auf deutsch." | no |

The tail decode is not worse than the full decode — it is **identical in outcome** on all nine,
catching the two clips that lost a whole word and none of the seven that lost a word's *ending*.
Cutting the tail out and decoding it alone does not help, because the problem was never that whisper
had too much context. It is that a truncated word is still a recognisable word — and, as §0b shows,
often a *reconstructed* one.

Scored with the last-**2** words rather than the final word alone, per Tom's refinement. On this set
the wider window changes no verdict, but it correctly attributes `f0404e5d`'s damage to two words
rather than one, which is what a repair queue needs to know.

This closes the question: **no ASR-based method, primed or unprimed, whole-clip or tail-only, can
find this damage class.** Worth knowing before anyone spends on an ASR sweep.

### TIER 2 — terminal fall + digital pad, the tier that works

Two fingerprints a trim leaves and a render allowed to finish does not:

1. **The fall into silence is near-instantaneous.** Measured at **1 ms** resolution (the old
   detector used 5 ms, which is most of why it disagreed), as the time from the last frame at
   peak − 12 dB down to speech end at peak − 40 dB, expressed as dB per ms.
2. **The silence afterwards is digitally pure.** The trim re-pads with generated silence — exact
   zero samples. A clip that ended on its own carries the provider's noise floor.

Both conditions must hold. Thresholds: **fall ≥ 0.70 dB/ms** and **≥ 80 % exact-zero trailing
samples**.

The threshold was not chosen to fit the answer, it was read off the gap between two populations:

```
fall rate over 39 never-trimmed provider renders      max  0.633 dB/ms
fall rate over 9 clips Tom confirmed damaged by ear   min  0.741 dB/ms
                                          threshold        0.70
```

Neither condition works alone, and that is the point. The zero-pad fingerprint on its own flags 7 of
the 30 controls — consistent with the 2026-08-05 finding that the 100 ms pad signature tells you a
clip went through the pad, not that the trim ate anything. It earns its place only as the second
half of an AND.

---

## 4. The validation table

```
tier                                   caught / 9 damaged    false flags on never-trimmed renders
TIER 1  duration vs syllables, per voice     2                 9 / 360   (2.5%)   [z <= -1.5]
TIER 3  full-clip ASR, last 2 words          2                 not run
TIER 3  TAIL-only ASR, last 2 words          2                 not run
TIER 2  terminal fall + digital pad          9                 0 / 384   (0.0%)
TIER 1 + TIER 2, no model, near-zero cost    9
```

Per clip, for the population that matters:

| id | text | T1 | T3 tail-ASR | T2 new | fall | zero % |
|---|---|---|---|---|---|---|
| `f0404e5d` | to speak German with you | — | FLAG | **FLAG** | 1.23 dB/ms | 85.8 |
| `0df92d35` | ich will Deutsch lernen | FLAG | — | **FLAG** | 0.741 | 87.0 |
| `4bdae65b` | Ich versuche so oft wie möglich Deutsch zu lernen | — | — | **FLAG** | 4.73 | 86.3 |
| `bce8631a` | possible | — | — | **FLAG** | 3.91 | 87.4 |
| `936fa5bd` | ich versuche so oft wie möglich zu lernen | — | — | **FLAG** | 3.82 | 92.2 |
| `414ebf08` | so oft wie möglich | FLAG | — | **FLAG** | 2.39 | 95.9 |
| `2d2c2ef0` | Ich will so oft wie möglich Deutsch sprechen | — | — | **FLAG** | 1.13 | 86.1 |
| `392cc471` | The German for: 'as often as possible'… is: | — | FLAG | **FLAG** | 1.12 | 86.6 |
| `b3e4a980` | auf Deutsch (old v1) | — | — | **FLAG** | 4.34 | 89.8 |

The two clips Tom confirmed tonight are the first two rows. The old tail detector scored **both** of
them clean; it also scored `392cc471` clean. The new detector catches all three.

**Does it flag everything? No.** Run read-only over all 159 seeds-1-5 clips that neither existing
checker flagged: **11 flagged, 6.9 %.**

---

## 5. The 11 clips it flags that nobody has listened to

These are the detector's claim, not a verdict. Tom's ears decide whether they are true positives or
the detector's false-flag rate — one listening pass settles the precision question:

| text | listen |
|---|---|
| ich will sprechen | https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/1C7CC706-AAE5-4A66-9F8D-7E7AB4BE09F8.mp3 |
| Ich versuche so oft wie möglich zu üben | https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/6CA4D779-9676-4FD4-98EB-366691A90C6E.mp3 |
| Ich versuche zu lernen, wie man etwas auf Deutsch sagt | https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/DE554F48-50C8-4769-B910-6C67EC30AB42.mp3 |
| how to say something in German | https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/65B8A730-F879-4B1F-92C9-9F8449A73975.mp3 |
| I want to learn German | https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/853A948E-77E3-465A-A16E-C0FACAE39BB3.mp3 |
| I want to speak in German | https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/F5C1AF9C-F38A-4215-BB13-A2EABFFADB53.mp3 |
| Ich werde jetzt lernen | https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/77328A7D-1FA7-4542-9B22-F6D1FA3B4B55.mp3 |
| something | https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/162A1CB5-ACDF-49A8-B0E5-C3F4D18BD343.mp3 |
| to say | https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/98859628-4908-4A59-893A-B976488CB151.mp3 |
| üben | https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/CD99B040-BF0D-4EF2-99B9-39B7D5E3A6B6.mp3 |
| with | https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/3FBAC965-D7E7-46A5-AAFF-60868BF2ACAA.mp3 |

---

## 6. What this does not prove — read before trusting it anywhere

- **One course, two voices, two languages.** Calibrated on `deu_for_eng` seeds 1-5: `eve` (eng),
  `ara` and `leo` (deu). The 0.70 dB/ms threshold is an empirical read off *these* voices. Any other
  course or provider needs its own never-trimmed population measured before the number is trusted.
- **The margin is narrow and is not being hidden.** 0.633 (worst healthy) against 0.741 (best
  damaged) is a gap of 0.11 dB/ms. It is a clean gap on 48 clips, but 48 clips is 48 clips.
- **The first control set is biased in the detector's favour.** Those 30 clips were drawn from
  the pool the old tail detector had already passed — a pool purged of the easy positives. The
  39 fresh renders are the unbiased specificity population, and that is why they are in the table.
- **It detects the mechanism, not the ear's judgement.** What it actually finds is "this clip was
  trimmed and re-padded". On the ground truth, every trimmed clip Tom listened to sounded damaged —
  but "trimmed but still fine" is a category this detector cannot rule out, and the 11 clips in §5
  are exactly that open question.
- **Explicit gap: the ASR control arm was never run.** Whisper-medium runs at roughly 4 minutes a
  clip on this box tonight (load average 22 from other work). All 9 damaged clips are decoded; the
  30 controls are not. This does not change tier 3's verdict — it failed on *sensitivity*, and
  specificity is moot for a tier that misses 7 of 9 known positives — but the row is empty and is
  labelled empty rather than rounded up.
- **Tier 1's false-flag rate is measured on never-trimmed renders, not on live clips.** 2.5 % at
  z ≤ −1.5 is the rate against a population that is clean by construction. The rate against live
  audio will be higher, because some live clips genuinely are damaged.
- **My own earlier tier-1 figure of 5 of 9 was wrong** and is corrected above. It came from a
  39-clip baseline; the 384-clip calibration is the one to trust.
- **No scale sweep is proposed here and no spend is proposed here.** That is the next decision,
  and it is Tom's.

---

## 7. Where the code is

- `tools/audio-truncation-detector.cjs` — the detector. Pure measurement: takes a file or URL plus
  the script, returns a verdict with its numbers. No database, no repair, no render, no writes.
  `--batch <list.json>` for a list.
- `tools/audio-truncation-detector.test.js` — 6 tests, green. Fixtures are synthesised with ffmpeg
  at test time (a natural decay into a noise floor vs a hard cut re-padded with digital silence), so
  no binary fixtures enter the repo. One test pins the calibrated thresholds so they cannot drift
  silently away from the evidence above.
- `scripts/clip-detector/` — gitignored working set: ground-truth assembly, downloads, feature
  extraction, the ASR runs, the validation harness and the read-only sweep.

```
node tools/audio-truncation-detector.cjs <url-or-file> --text "ich will Deutsch lernen" --lang deu
```
