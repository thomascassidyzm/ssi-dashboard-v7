# Acoustic QA scoring on real SSi audio — suck-it-and-see findings

**2026-08-04.** Read-only experiment. No TTS rendered, no DB row mutated, no S3 object written
or deleted, no production change. Everything below is a measurement on live SSi audio.

Companion: [`aligner-landscape.md`](./aligner-landscape.md) — the paper assessment of what to
build on if this method is worth productionising.

---

## 0. Verdict

**Qualified yes — and the qualification is the interesting part.**

An unprimed ASR round-trip separates good from bad on real SSi audio at **98.8% recall and 1.2%
false-alarm rate** across all three artefact classes. That is a usable gate.

But three things must be said plainly, because they change what should be built:

1. **What works is *not* forced alignment.** It is a **free, unprimed decode compared afterwards
   against the expected text**. I tested the constrained-decode route that would be genuine
   forced alignment in whisper.cpp, and it fails exactly the way Tom predicted — see §5. The
   method works *because* the decode is free, not despite it.
2. **The score that works is the text comparison, not the model's confidence.** whisper's own
   token probabilities are worthless here: the healthy and broken distributions sit on top of
   each other (§1). A confidence-based gate would have been a dead end.
3. **The experiment found live defects the existing screens actively cleared.** 13 clips that the
   2026-08-04 repair run probe-tested and deliberately *kept* are, on this evidence, truncated.
   See §2 — this is the single most actionable result and it needs Tom's ear.

---

## 1. The ground-truth set — and a correction to the brief

**The brief's premise was stale.** It named `deu_for_eng` as unrepaired and therefore the live
source of bad audio. It was repaired the same day, 13:15–13:30 UTC — 1,082 clips re-rendered
(`docs/deu-audio-repair-plan-2026-08-04.md` §8). By the time this experiment started, the bad
audio was no longer reachable through the DB.

It is still reachable on S3. `tools/repair-silent-clips.cjs` uploads the replacement to a **new**
key and deletes only the DB row (`:331-345`) — **the old object is never deleted**. Combined with
the repair log, which records old id → new id, this gives something better than the brief asked
for: **matched pairs**. Same expected text, same voice, same role, one broken object and its
healthy replacement.

Labels are not my judgement. They are the recorded outcome of that repair run:

| group | n | label source | measured mean dB (min/med/max) | measured ms (min/med/max) |
|---|---:|---|---|---|
| `silent_stub` | 25 | gate `confirmed` + repaired | −91.0 / −91.0 / −70.4 | 100 / 140 / 236 |
| `truncated` | 25 | gate `suspect` + repaired (a probe render proved it short) | −23.2 / −16.8 / −15.4 | 336 / 556 / 934 |
| `near_silent` | 21 | `stub-forensics-22/near-silent-repair-list.json` | −91.0 / −43.3 / −27.7 | 100 / 286 / 357 |
| `good_paired` | 50 | the replacement render of each bad clip above — **same text** | −17.7 / −16.3 / −15.2 | 600 / 1056 / 1612 |
| `good_kept` | 17 | flagged by the free screens, probe-render proved healthy → **hard negatives** | −19.9 / −17.0 / −14.7 | 562 / 870 / 1354 |
| `good_unflagged` | 27 | live healthy `deu_for_eng`, matched on role+voice | −16.5 / −16.0 / −15.3 | 1190 / 2252 / 3924 |

165 clips: 71 known-bad across all three classes, 94 known-good. Roles span `target1`/`target2`/
`known`, per the README's point that `hrv_for_eng` and `eng_for_ben` defects were all `known`.
`near_silent` spans 13 courses and several languages; the rest is `deu_for_eng`.

**The truncated group measures −16.8 dB median — normal loudness.** This is the whole point: it is
invisible to any "is it silent?" check, and it is the class where acoustic scoring has to earn its
place.

### Candidate scores — distributions

Whisper `ggml-small`, language pinned from `course_audio.language`, **no `--prompt`, no priming**.

**Coverage** (fraction of expected words present in the decode) and **CER** (character error rate,
expected vs decode) separate. **Token probabilities do not.**

| score | silent_stub | truncated | near_silent | good_paired | good_kept | good_unflagged |
|---|---|---|---|---|---|---|
| **coverage** median | 0.000 | 0.500 | 0.000 | **1.000** | 0.600 | **1.000** |
| **CER** median | 0.909 | 0.591 | 1.200 | **0.000** | 0.429 | **0.000** |
| `mean_tok_p` median | 0.352 | 0.675 | 0.672 | 0.751 | 0.767 | 0.833 |
| `min_tok_p` median | 0.130 | 0.151 | 0.020 | 0.056 | 0.087 | 0.044 |

Read the bottom two rows carefully. `mean_tok_p` for healthy clips is 0.75–0.83; for truncated
clips it is 0.675. That is not separation, it is overlap — and `min_tok_p` is *worse for healthy
clips than for silent stubs*. **whisper's confidence is confidence in what it decoded, not in
whether the audio matched what we asked for.** Every threshold on `mean_tok_p` either misses most
of the bad set or flags most of the good set (full sweep in `scripts/fa-exp/analyse.cjs` output).

CER is preferable to word coverage: word coverage produced a false alarm on the German
compound `"um zu bringen"` decoded as `"umzubringen."` — identical audio, different word
segmentation. CER is segmentation-robust and scored that clip 0.25.

### The operating point

**Flag when the decode is empty or a non-speech marker (`[BLANK_AUDIO]`, `[Musik]`), OR CER ≥ 0.3.**

Whisper's own non-speech markers are a first-class signal, not noise: they fire on 18/25 silent
stubs and 15/21 near-silent clips and **0/94 good clips**.

| | bad | good | caught (TP) | missed (FN) | false alarm (FP) | recall | FP rate |
|---|---:|---:|---:|---:|---:|---:|---:|
| as labelled | 71 | 94 | 70 | 1 | 14 | 98.6% | 14.9% |
| **after §2 reclassification** | 84 | 81 | **83** | **1** | **1** | **98.8%** | **1.2%** |

Per class, at that operating point: `silent_stub` **25/25**, `near_silent` **21/21**,
`truncated` **24/25**, `good_paired` **0/50** flagged, `good_unflagged` **0/27** flagged.

The single miss is `"that would be good"` → `"That would be it."` (CER 0.267) — a four-word clip
where the truncation swapped one short word. The single genuine false alarm is
`"etwas stecken"` → `"Etwas schm..."`, a real mishearing of a healthy clip.

---

## 2. ⚠️ The false alarms are mostly not false — 13 live clips need Tom's ear

All 14 as-labelled false alarms are in `good_kept`: clips the repair run flagged, probe-rendered,
and **deliberately kept** because the fresh render came back a similar length.

They are not false alarms. Here is the independent, physical argument — no ASR involved:

Measured across the 77 known-good clips in this set, SSi TTS speech runs at **2.33–5.27 words per
second** (median 3.3). For each `good_kept` clip, compute the rate the voice would have to hit for
the **full expected text** to fit in the clip's actual duration:

| implied w/s if full text present | expected text | what whisper actually heard | flagged |
|---:|---|---|:--:|
| **7.94** | "she said she would like to be with you" | "She said she would like to" | Y |
| **7.73** | "I think we should tell to them" | "I think we should" | Y |
| **7.68** | "do you want to hold the kitten?" | "do you want to hold" | Y |
| **7.37** | "I think we need to eat something" | "I think we need to" | Y |
| **7.23** | "they know about the problem" | "They know a..." | Y |
| **7.12** | "und ich will sprechen" | "Und ich fahre..." | Y |
| **7.06** | "Ich werde auf Deutsch sprechen" | "Ich werde auf..." | Y |
| **6.93** | "why do they fight with each other?" | "Why do they fight?" | Y |
| **6.90** | "do you want to watch something?" | "Do you want to watch?" | Y |
| **6.56** | "sie ist durch gegangen" | "ZIIS." | Y |
| **6.27** | "sie muss Deutsch sprechen" | "Sie muss..." | Y |
| **6.02** | "I thought we needed this approach" | "I thought we needed..." | Y |
| **6.01** | "Ich werde Deutsch sprechen" | "Ich werde ..." | Y |
| 3.92 | "Ich bin jetzt fertig" | "Ich bin jetzt fertig." | n |
| 3.69 | "es ist schlechter als gestern" | "Es ist schlechter, als ..." | n |
| 3.60 | "du sprichst gut" | "Du sprichst?" | n |
| 2.92 | "etwas stecken" | "Etwas schm..." | **Y — genuine false alarm** |

Every flagged clip except the last requires a speech rate **above the maximum observed anywhere in
the healthy set**, and whisper independently reports hearing exactly a prefix. The three clips the
rule cleared are exactly the three inside the healthy band. The rule and the physics agree
clip-by-clip, and they were derived independently.

**So the probe-and-keep logic has a hole.** It keeps a clip when a fresh render is a similar
length — but if the provider truncates that text *reproducibly*, both renders are short and the
clip is kept. Acoustic scoring does not have that failure mode, because it asks whether the words
are there rather than whether two renders agree.

**This is a decision for Tom, not for me.** I have not listened to these clips and I have not
touched them. `deu_for_eng` shipped 17 probe-kept clips; 13 look truncated. The same
probe-and-keep path ran across the whole 2026-08-04 estate sweep, so the same hole is likely open
in every course repaired that day.

---

## 3. Per-word flagging — presence works, probability does not

**Per-word presence/absence points at the right word, every time.** Worked examples, `ggml-small`:

```
[truncated] 506ms  expected: "can you check the weather?"   decode: "Can you?"
  can=0.803  you=0.065  check=MISSING  the=MISSING  weather=MISSING

[truncated] 682ms  expected: "they fight with each other"   decode: "They fight."
  they=0.998  fight=0.677  with=MISSING  each=MISSING  other=MISSING

[truncated] 912ms  expected: "Ich habe alles, was ich brauche"   decode: "Ich habe alles be-"
  ich=1  habe=1  alles=0  was=MISSING  ich=MISSING  brauche=0.563

[truncated] 638ms  expected: "do you want a kitten?"   decode: "Do you want..."
  do=0.742  you=0.991  want=0.11  a=MISSING  kitten=MISSING
```

In all 25 truncated clips the `MISSING` words are exactly the tail that was cut. That is a
review queue a human can work: it does not just say "clip 4,182 is bad", it says "the last three
words are not there". The tail-word check alone is stark — the final expected word is present in
**0/25** truncated clips and **0/21** near-silent clips.

**Per-word probability is not usable.** Measured across 63 healthy, fully-covered clips:

| | min | median | max |
|---|---:|---:|---:|
| final expected word, `p` | 0.009 | **0.047** | 0.858 |
| non-final expected words, `p` | 0.000 | **0.914** | 1.000 |

The last word of a *healthy* clip scores 0.047. Any per-word confidence threshold flags the last
word of every clip in the estate. This is partly an artefact of mapping sentence-final tokens onto
words, but the honest statement stands: **whisper.cpp token `p` does not give a usable per-word
confidence, and a mispronunciation gate cannot be built on it.** That is what a real CTC forced
aligner would give and this does not.

---

## 4. Timing by-products, and against `services/voice-engine/align.cjs`

Word onsets, offsets, per-word durations, leading and trailing silence all come out of the token
timestamps at no extra cost. Measured on the 77 good clips:

| metric | min | median | p90 | max |
|---|---:|---:|---:|---:|
| leading silence | 30 | 100 | 150 | 220 |
| trailing silence | 0 | 56 | 144 | 196 |
| speech span | 370 | 1300 | 2780 | 3930 |

**Against the existing silence-span method.** `align.cjs`'s header comment ("aeneas / whisper are
NOT available on this host and are NOT dependencies") is now stale — whisper is on this host. I
ran its `detectSilenceSpans` / `invertSilenceSpans` over the same clips:

| | result |
|---|---|
| voiced regions == expected word count, defaults (−35 dB / 150 ms) | **0 / 77** |
| voiced regions == expected word count, tuned (−40 dB / 40 ms) | 6 / 77 |
| median voiced regions found (defaults) | **1**, for a median of 4 words |
| leading silence, `align.cjs` min/med/max | 0 / **0** / 185 ms |
| leading silence, whisper min/med/max | 50 / **100** / 220 ms |
| median absolute difference, lead | 90 ms |
| median absolute difference, trail | 62 ms |

This is not a criticism of `align.cjs` — it is doing exactly what its header says. It aligns
**human slow takes where the speaker pauses between LEGO chunks**, and it is deliberately zero-ML.
On continuous TTS speech there are no pauses to find, so it returns one voiced region for the
whole clip. **It cannot produce word-level timing on TTS audio, and whisper can.** Its default
150 ms silence floor also means it reports 0 ms leading silence for the median clip, where the
true value is ~100 ms — so for TTS lead/trim VAD metrics it is currently blind below its own floor.

Where `align.cjs` *is* equivalent: at tuned thresholds it finds zero voiced regions on **25/25**
silent stubs. Silence detection is free and already solved. It finds **0/25** truncations.

---

## 5. What this actually is — and the honest negative on forced alignment

**whisper.cpp does not do forced alignment.** What it gives:

- `--output-json-full`: token-level `p` from a **free decode**, plus token timestamps.
- `-dtw MODEL`: DTW-based token timestamps from cross-attention. Timestamps only — no alignment score.
- `--grammar` (GBNF): a **constrained decode**, which is the closest thing to forced alignment available.

I tested the grammar route, because it is the one that would answer Tom's closed question. **It
fails, and it fails exactly the way Tom predicted.** Constraining the decode to the expected text
and reading back the token probabilities, on paired clips:

| clip | expected text forced via GBNF | decoded | mean token p |
|---|---|---|---:|
| **TRUNCATED** | "They fight with each other." | full string emitted | **1.000** |
| GOOD (same text) | "They fight with each other." | full string emitted | 0.979 |
| SILENT | "Was denkst du?" | `" W"` | 0.987 |
| GOOD (same text) | "Was denkst du?" | full string emitted | 0.999 |

**The truncated clip scores higher than the healthy one.** Once the grammar removes the
alternatives, the softmax renormalises over what is left and the reported probability goes to ~1
regardless of the acoustics. This is Tom's worry — *"ASR has intelligence and might guess the
correct answer even when it's not clear"* — reproduced on real audio, in the one configuration
where it genuinely bites. **Do not build a gate on whisper.cpp constrained-decode confidence.**

So the method that works here is an **unprimed ASR round-trip**, and it works *because* the decode
is free. Never having seen the expected text, whisper reports the fragment it actually heard —
`"Can you?"`, `"They fight."`, `"I think we need to"` — and does not complete the sentence. On
this defect class Tom's worry is empirically unfounded, and the reason is structural: truncation
and silence remove the acoustic evidence entirely, and there is nothing left for the language
model to guess *from*.

**That reasoning does not extend to mispronunciation**, which is the other half of Tom's original
problem statement. There the evidence is present but wrong, the language model has something to
work with, and a free decode can absolutely launder a mispronounced word into the expected one.
**I have no ground-truth mispronunciation set and did not test that class — see §7.** For
mispronunciation the per-word acoustic posterior of a real CTC forced aligner is the right
instrument, and whisper.cpp cannot supply it.

The paper assessment of those aligners is in [`aligner-landscape.md`](./aligner-landscape.md).
Its recommendation, in short: **torchaudio `forced_align` + the `MMS_FA` bundle** as the backbone
— one ~1.2 GB model, no language model in the scoring path, and coverage of all 44 SSi languages
including Welsh, Basque, Armenian and the Indic tail. Two things from it belong here because they
bear directly on the numbers in §6:

- **`MMS_FA` weights are CC-BY-NC 4.0.** Fine for internal factory tooling that ships nothing;
  a genuine open question if it ever ends up in a shipped path. Worth resolving before building,
  not after.
- **BFA (Bournemouth Forced Aligner, Sept 2025) is the one candidate that could change the
  economics.** Its contextless phoneme encoder is architecturally *stronger* on Tom's guessing
  worry than wav2vec2, it is a 50 MB model, and it is the only candidate with a published CPU
  figure: RTF 0.05–0.1×, which would put a 10,000-clip sweep at roughly **ten minutes** against
  the 4.75 hours measured below. It is disqualified as the backbone because it does not support
  `zho`, `vie`, `tha`, `jpn` or `kor` — five live SSi languages, one of them an active build —
  but for the other 39 that is an order of magnitude off the running cost. Worth a head-to-head
  pilot on real SSi clips before committing to a design.

---

## 6. Runtime — sizing a 10k sweep

Measured on this VM. 8 cores, no GPU.

| model | clips | concurrency × threads | wall clock | s/clip | **10,000 clips** |
|---|---:|---|---:|---:|---:|
| `ggml-small` (488 MB) | 165 | 4 × 2 | 282 s | **1.71** | **4.75 h** |
| `ggml-medium` (1.5 GB) | — | — | **not measured** | — | — |

At `small`, a full course sweep is an overnight job on one box, or well under an hour on eight.
It is free — local CPU, no metered API.

**`ggml-medium` was not measured — explicit gap.** The model was downloaded and the run was
started twice; both times the process was killed by session teardown partway through (78/165 on
the first attempt). It is a nice-to-have row, not a load-bearing one: the brief authorised
escalating to `medium` *only if `small` failed to separate*, and `small` separates at 98.8%
recall / 1.2% false alarm. Escalating would raise cost roughly 3× for headroom the result does
not need. Re-run with `node scripts/fa-exp/score.cjs --model medium` if the question ever
becomes live — the model is on disk at
`/home/tomcassidy/.local/share/whisper-models/ggml-medium.bin`.

---

## 7. Explicit gaps

- **No mispronunciation ground truth exists, so that class is untested.** It is the class Tom named
  first ("the TTS … pronounces it wrong") and the class where the guessing risk is real. Everything
  in this memo is about silence and truncation. Do not read the headline number as covering
  mispronunciation.
- **I did not listen to any clip.** The §2 reclassification rests on an implied-speech-rate argument
  and whisper's decode agreeing, not on ears. It needs Tom's ear before anything acts on it.
- **`near_silent` clips are short texts** ("Grün.", "black", "Here it is.") — one to three words. The
  class is caught 21/21, but there is little per-word structure to test on it.
- **Single course for the truncation class.** 25 truncated and all `good_paired`/`good_kept`/
  `good_unflagged` clips are `deu_for_eng`, two languages (deu/eng), three house voices. The
  `near_silent` set spans 13 courses. Thresholds should be re-measured before trusting them on a
  language with a different script or a very different speech rate.
- **CER thresholds are language-dependent.** 0.3 was fitted on German and English. `zho`, `jpn` and
  `tha` have no word boundaries and will need a different normalisation entirely.
- **Whisper's own error rate is a floor on precision.** The single genuine false alarm was whisper
  mishearing a healthy clip. On a 10k sweep at ~1% that is ~100 clips into a human queue.

---

## 8. Side-observation — an existing QA check was dead on this host, and has since been fixed

Not part of this experiment. **Fixed by another session while this experiment was running** —
recorded here because the historical fact still matters for what shipped today.

The xAI phonology gate in `services/tts-service.cjs` defaulted to macOS paths
(`/opt/homebrew/bin/whisper-cli`, `/tmp/whisper-models/ggml-small.bin`). Neither exists on this
Linux VM, so `PHONO_GATE_ON` evaluated false and the gate silently disabled itself. Every repair
run log in `docs/audio-repair-2026-08-04/` carries the line `[TTS] xAI phonology gate unavailable
(whisper-cli or model missing) — non-English xAI renders unchecked for language drift`.

**That still stands as a fact about what shipped: every non-English xAI render made on this box
today, including the 1,082 German repairs, went out unchecked for language drift.** The clips are
in the courses now. Nothing has re-checked them.

The code hole is closed. Commit `428844e3` (2026-08-04 15:07 UTC, a parallel session) resolves
`WHISPER_BIN`/`WHISPER_MODEL` from env with a cross-platform fallback, and does the same for
`audio-processor.cjs`'s tail-defect amputation guard, which was silently no-opping for the same
reason. That session verified the gate live.

I had written this section as an open finding and staged a deliberate no-fix, on the grounds that
switching the gate on mid-run would have slowed or failed other sessions' repair jobs. That
reasoning is now moot — someone else landed it properly. **The remaining question for Tom is not
the code, it is the backlog: the renders made while the gate was off were never checked, and a
language-drift sweep over them is a separate job nobody has claimed.**

---

*Reproduce: `scripts/fa-exp/*.cjs` (gitignored workspace) — `build-manifest.cjs` → `fetch.cjs` →
`score.cjs` → `analyse.cjs` / `analyse2.cjs` / `headline.cjs` / `compare-align.cjs`.*
