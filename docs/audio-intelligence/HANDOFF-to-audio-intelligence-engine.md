# Handoff to job b6fb00a0 — the audio-intelligence engine

**2026-08-06.** Everything the engine job asked for, committed to `main`. Self-serve paths, so
nothing here is blocked on a message getting through.

---

## (a) The ground truth — `docs/audio-intelligence/ground-truth-2026-08-06.json`

9 DAMAGED clips, **all ear-labelled by Tom**, all `deu_for_eng` seeds 1-5. Each row carries
audio_id, unit, round, voice, language, role, script, tom_verdict, verdict_evidence,
url_as_heard, fresh_render_url, measurements, ASR decodes, and what both old checkers said.

**Critical on `url_as_heard`.** For the 7 clips whose repair was accepted on 2026-08-05, the live
row now points at the **replacement**. `url_as_heard` is the superseded S3 key from the accept log
— the bytes Tom actually judged. Validating against the current live URL for those scores the
repair, not the defect.

| audio_id | voice | lang | script |
|---|---|---|---|
| `f0404e5d-4a38-4707-9ed4-5665b378b6f8` | eve | eng | to speak German with you |
| `0df92d35-2a32-4ede-9768-ea3fe07d80f7` | leo | deu | ich will Deutsch lernen — **this IS the seed-2 "lernen" voice-2 clip; one clip, not two** |
| `4bdae65b-…` | ara | deu | Ich versuche so oft wie möglich Deutsch zu lernen |
| `bce8631a-…` | eve | eng | possible |
| `936fa5bd-63e7-44c0-9bca-d3e313bc6ca1` | ara | deu | ich versuche so oft wie möglich zu lernen |
| `414ebf08-d28c-41fb-a1b3-eccd18ee69e9` | ara | deu | so oft wie möglich |
| `2d2c2ef0-f812-4d2a-9dce-1fab1b604971` | leo | deu | Ich will so oft wie möglich Deutsch sprechen |
| `392cc471-6e94-44bd-91bf-3df48a131377` | eve | eng | The German for: 'as often as possible'… is: |
| `b3e4a980-62d4-4365-b94d-1e382c3afae4` | leo | deu | auf Deutsch (the old v1) |

Take exact ids from the JSON, not from this table.

**Controls — three populations, and the distinction matters:**

1. **148 UNLABELLED-CLEAN** — no checker flagged them, nobody listened. **Not ear-labelled.**
   A flag on one of these is an open question for Tom's ear, not a false positive. Do not report
   it as one.
2. **11 UNLABELLED-FLAGGED** — the edge tier flags them, nobody has listened. The outstanding ask
   on Tom.
3. **384 fresh provider renders** (the 2026-08-05 naked pass) — never trimmed, never
   silence-stripped, never tail-detected. **Presumed-good by construction.** This is the only
   unbiased specificity population that exists; use it rather than population 1.
   `fresh_render_url` is on every corpus row.

## (b) Code and calibration — branch `main`

- `services/audio-intelligence/tiers/tier1-duration.cjs` — written to the requested path
- `services/audio-intelligence/calibration/voice-rates.json`
- `docs/audio-intelligence/voice-rates-2026-08-06.json`
- `tools/audio-truncation-detector.cjs` + `.test.js` (6 tests green) — **this is tier 2, already
  built and validated**

Per-voice calibration on all 384 never-trimmed renders. **Linear model, not a flat rate:**
`speechMs = intercept + msPerSyllable × syllables`. A flat syllables/sec was fitted first and
rejected — a clip carries fixed onset+release overhead, so a flat rate reads every short clip as
slow and every long one as fast.

| voice | lang | n | intercept | ms/syllable | R² | rel-residual sd |
|---|---|---|---|---|---|---|
| eve | eng | 132 | −102 ms | 221 | 0.909 | 0.237 |
| ara | deu | 114 | +166 ms | 178 | 0.927 | 0.126 |
| leo | deu | 114 | +144 ms | 191 | 0.914 | 0.151 |

Syllables = vowel-group counting, per-language vowel sets. Crude, but *consistently* crude, so
the bias cancels in the ratio.

## (c) Which tier catches which — measured, not projected

| clip | T1 duration | T2 edge | T3 ASR last-2 |
|---|---|---|---|
| `f0404e5d` | . | **CATCH** | **CATCH** |
| `0df92d35` | . | **CATCH** | . |
| `4bdae65b` | . | **CATCH** | . |
| `bce8631a` | . | **CATCH** | . |
| `936fa5bd` | . | **CATCH** | . |
| `414ebf08` | . | **CATCH** | . |
| `2d2c2ef0` | . | **CATCH** | . |
| `392cc471` | . | **CATCH** | **CATCH** |
| `b3e4a980` | . | **CATCH** | . |
| | **2/9** at a usable threshold | **9/9** | **2/8** decoded |

---

## Two things that will save you time — please do not re-derive them

### 1. Tier 1 is weak, and the honest numbers are in the module header

Sweep against 9 damaged / 384 never-trimmed renders:

| z threshold | caught / 9 | false flags on never-trimmed |
|---|---|---|
| ≤ −0.75 | 5 | 18.9 % |
| ≤ −1.00 | 2 | 10.3 % |
| ≤ −1.50 | 2 | 2.5 % |

Ships at −1.5. The reason is physical: **4 of the 9 lost only the final word's decay, 50–250 ms,
which is inside the corpus's own duration spread** (sd 0.13–0.24). Tier 1 catches amputations big
enough to move the total and nothing else. It is the cheap explainer, not the sharp filter.

### 2. Tier 3 cannot see this damage class — load-bearing, and it contradicts "tier 3 is authoritative"

**The damage is not a missing word. It is the final word's *ending*, amputated.** Whisper
recognises a word from its onset, so a truncated word still transcribes correctly.
`ich will Deutsch lernen` decodes **perfectly** under unprimed whisper-medium and is still clipped.

Harder still: on `f0404e5d` Tom hears *"to speak German wi…"* with "you" entirely absent — and
whisper wrote **"with"**. It reconstructed the whole word from a mid-phoneme cut.

Tail-only decoding does not help. Measured against the full decode, the outcome is **identical** —
1 of 7 both ways. Before building tier 4 as the authority, validate it against these 9 or it will
ship passing 6 of them.

Tier 3 is still worth having — it is the only tier that catches whole-word loss (`f0404e5d`,
`392cc471`) — but as the residual check, not the arbiter. Use **last-N-words diff, N ≥ 2**, not
final-word-only: on `f0404e5d` two words are affected, one partial and one gone.

---

## Division of labour — your proposal accepted, with one correction

You listed tier 2 (energy/tail + end-abruptness) as yours. **It already exists, validated:**
`tools/audio-truncation-detector.cjs` — 9/9 damaged, 0/39 fresh renders, 11/159 (6.9 %) on the
never-flagged live population, 6 tests green.

It measures the fall into silence at **1 ms** resolution (the old detector's 5 ms is most of why it
disagreed and passed the clips Tom confirmed), **and** requires the trailing silence to be exact
digital zero — a trim re-pads with generated silence, a finished render carries a noise floor. Both
conditions required; the zero-pad alone flags 7 of 30 and is worthless by itself.

Lift it into `services/audio-intelligence/tiers/tier2-edge.cjs` and leave a wrapper, or just take
it. **Carry the threshold provenance with it:** 0.70 dB/ms sits in the gap between 0.633 (worst of
39 never-trimmed) and 0.741 (best of the 9 damaged) — a 0.11 margin on 48 clips, thin, and a test
pins it so it cannot drift silently.

**So:** I own tier 1, the ground-truth/control corpus, and calibration. You take tier 3 (VAD),
tier 4 (Whisper align), the engine API, CLI, calibration store and docs, and you **inherit** tier 2
rather than rebuilding it.

If you would rather I run the ASR decodes for the remaining controls, say so — whisper-medium is
running at ~4 min/clip on this box tonight (load 22), which is why the tier-3 row is 8 of 9.

**Standing constraint from Tom's brief, which I assume binds you too: detection-method validation
only. No repairs, no TTS, no DB writes.**
