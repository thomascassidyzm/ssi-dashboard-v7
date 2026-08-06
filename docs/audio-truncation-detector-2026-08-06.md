# A detector that catches what Tom's ear catches — built and validated

**2026-08-06.** Tonight Tom played two clips outside the app and confirmed both are clipped, which
rules out a player bug. Both of the estate's existing damage checkers scored them clean. This
document is the replacement detector and, more importantly, the validation table that says whether
it actually works.

**Headline: it works on the ground truth — 9 of 9 clips Tom labelled damaged, 0 of 39 fresh
provider renders. Both of Tom's candidate approaches were tried; one of them failed, and the reason
it failed is the most useful thing measured tonight.**

Nothing was repaired, no audio was rendered, and nothing was written to the database.

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

## 3. The three approaches, scored on the same data

### (a) expected duration vs text length — Tom's first steer

Speech-rate baselines were taken from this estate's own untrimmed renders rather than from textbook
figures, per language: **English p50 4.54 syll/s (max 5.50), German p50 4.63 syll/s (max 5.73)**.
A clip is flagged if it speaks faster than any healthy render of its language.

**Verdict: real signal, not enough of it. 5 of 9.** It catches the short clips where a big fraction
of the audio is gone, and misses every long one — losing 200 ms off a 2.5 s phrase barely moves the
rate. It also produced 4 false flags on the control set, mostly on one- and two-word clips where a
syllable count is a poor proxy for expected duration. It adds nothing on top of (c): every clip it
catches, (c) catches too.

### (b) ASR the tail specifically — Tom's second steer

Implemented exactly as specified: unprimed whisper (medium model, no initial prompt anywhere) on the
last ~1.3 s of the clip, final word diffed against the script's final word. Full-clip decode run
alongside as the comparison.

**Verdict: it fails, and the failure is informative. 1 of 7 measured.**

| clip | script's final word | tail decode | caught? |
|---|---|---|---|
| `f0404e5d` | you | "German with" | **yes** |
| `0df92d35` | lernen | "Deutsch lernen." | no |
| `4bdae65b` | lernen | "wirklich Deutsch zu lernen." | no |
| `bce8631a` | possible | "possible." | no |
| `936fa5bd` | lernen | "wie möglich zu lernen." | no |
| `414ebf08` | möglich | "oft wie möglich." | no |
| `2d2c2ef0` | sprechen | "wie möglich Deutsch sprechen." | no |

The tail decode is not worse than the full decode — it is **identical in outcome**, catching the one
clip that genuinely lost a word and none of the six that lost a word's *ending*. Cutting the tail
out and decoding it alone does not help, because the problem was never that whisper had too much
context. It is that a truncated word is still a recognisable word.

This closes the question: **no ASR-based method, primed or unprimed, whole-clip or tail-only, can
find this damage class.** Worth knowing before anyone spends on an ASR sweep.

### (c) terminal fall + digital pad — the new detector

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
approach                              caught / damaged   false flags / 30 controls   false flags / 39 fresh renders
(a) expected-duration vs text              5 / 9                  4                            0
(b) full-clip ASR, final word              1 / 7                  —                           n/a
(b) TAIL-only ASR, final word              1 / 7                  —                           n/a
(c) terminal fall + digital pad            9 / 9                  2                            0
```

Per clip, for the population that matters:

| id | text | (a) | (b) tail-ASR | (c) new | fall | zero % |
|---|---|---|---|---|---|---|
| `f0404e5d` | to speak German with you | FLAG | FLAG | **FLAG** | 1.23 dB/ms | 85.8 |
| `0df92d35` | ich will Deutsch lernen | FLAG | — | **FLAG** | 0.741 | 87.0 |
| `4bdae65b` | Ich versuche so oft wie möglich Deutsch zu lernen | — | — | **FLAG** | 4.73 | 86.3 |
| `bce8631a` | possible | FLAG | — | **FLAG** | 3.91 | 87.4 |
| `936fa5bd` | ich versuche so oft wie möglich zu lernen | FLAG | — | **FLAG** | 3.82 | 92.2 |
| `414ebf08` | so oft wie möglich | FLAG | — | **FLAG** | 2.39 | 95.9 |
| `2d2c2ef0` | Ich will so oft wie möglich Deutsch sprechen | — | — | **FLAG** | 1.13 | 86.1 |
| `392cc471` | The German for: 'as often as possible'… is: | — | pending | **FLAG** | 1.12 | 86.6 |
| `b3e4a980` | auf Deutsch (old v1) | — | pending | **FLAG** | 4.34 | 89.8 |

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
- **Explicit gap: the ASR control arm is incomplete.** Whisper-medium runs at roughly 4 minutes a
  clip on this box tonight (load average 22 from other work), so the (b) row is scored on 7 of the
  9 damaged clips and on none of the controls. This does not change (b)'s verdict — it failed on
  *sensitivity*, and specificity is moot for a detector that misses 6 of 7 known positives — but
  the row is not complete and is labelled as such rather than rounded up.
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
