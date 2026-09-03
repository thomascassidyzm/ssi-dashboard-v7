# Whisper-cli word-timestamp calibration vs Azure TTS ground truth — 2026-08-22

READ-ONLY calibration job. Answers one question: **how accurate are whisper-cli's word timestamps on this exact kind of audio**, using Azure TTS's own `word_boundaries` (synthesiser-declared, exact) as ground truth. No conclusions drawn about the recording/chunking pipeline — this characterises the instrument only.

## Method

- Sampled 30 rows from `course_audio` (`course_code='deu_at_for_eng'`, `role='target1'` — the Austrian-dialect target audio, not the English `known` side), `word_boundaries IS NOT NULL`, `duration_ms` 2000–6000.
- Downloaded each `mastered/*.mp3` from S3.
- Ran `whisper-cli -m ggml-medium.bin -l de -ml 1 -sow -oj` (word-level timestamps) serially on each.
- Aligned whisper words to the truth word list: 1:1 by position where word counts agreed (126/178 words), char-level Needleman-Wunsch DP otherwise (52/178 words) — reusing the alignment idiom from `scripts/_eval-score2.cjs`.
- Punctuation-only truth entries dropped before scoring.

Scripts (gitignored scratch, not committed): `scripts/_wcal-sample.cjs`, `scripts/_wcal-score.cjs`. Raw data: `$CS_SCRATCH/eval/wcal-results.json` (ephemeral, this conversation's scratch dir only).

## Coverage

- 30/30 clips sampled were usable — 0 dropped. 178 words scored total.

## Headline numbers (all 178 words, both edges pooled, n=356)

| | value |
|---|---|
| median abs error | 130ms |
| mean abs error | 200ms |
| p90 abs error | 424ms |
| max abs error | 990ms |
| within 30ms | 8.4% |
| within 50ms | 18.3% |
| within 100ms | 34.3% |

Split by edge:

| | starts (n=178) | ends (n=178) |
|---|---|---|
| median abs | 120ms | 150ms |
| mean abs | 171ms | 230ms |
| p90 abs | 392ms | 522ms |
| max abs | 990ms | 989ms |
| within 30ms | 9.6% | 7.3% |
| within 50ms | 20.8% | 15.7% |
| within 100ms | 37.1% | 31.5% |
| **median signed** | **+110ms** | **+145ms** |

**Signed error is systematically positive on both edges: whisper places word boundaries LATE relative to the synthesiser's own truth, consistently, not just noisy.** Median lag ~110ms at word onset, growing to ~145ms by word offset (i.e. whisper also tends to run words a bit long, not just shift them).

## Is the error really about timing, or is it dialect mistranscription bleeding through?

This course is Austrian dialect; whisper-cli was run with `-l de` (standard German) and — as expected — badly mistranscribes it: of the 126 words that aligned 1:1 by word count, only **45 (35.7%) exactly matched the truth word text** after normalization; **81 (64.3%) were transcribed as a different word entirely** (dialect collapsed to a standard-German lookalike, e.g. "guat"→"Quatsch", "woaß"→"wusste", "z'laung"→"Zettelung"). Content-level errors are pervasive, not a tail case.

To find out whether this content mismatch is *causing* the timing error (misaligned words dragging in wrong durations) or is a separate, independent problem, I split the 126 1:1-aligned words by whether the transcribed text matched:

| | content-matched (n=45) | content-mismatched (n=81) |
|---|---|---|
| start median abs | 120ms | 120ms |
| start within 50ms | 17.8% | 22.2% |
| end median abs | 145ms | 145ms |
| end within 50ms | 26.7% | 9.9% |

**The timing error is essentially the same whether whisper got the word right or wrong.** This means the ~120–150ms median lag is a real property of the instrument's timestamp precision on this audio — not an artefact of dialect mistranscription contaminating the alignment. Dialect collapse is a real, separate problem (word *identity* is wrong two-thirds of the time) but it is not what's driving the timing numbers above.

## Clip-edge effect

Errors are not uniform across a clip — the **last word's END boundary is much worse than interior words**:

- last-word-in-clip, END abs median: **325ms** (n=30, one per clip)
- all other word-END abs median: **145ms** (n=148)
- first-word START isn't similarly elevated (120ms, same as interior words at 125ms) — this is an end-of-clip effect only, not a start-of-clip one.

Likely cause: whisper's declared end-of-speech for the final word doesn't line up with where Azure's own boundary metadata puts it (trailing-silence/padding handling differs between the two). Restricting to interior words only (excludes first-word start and last-word end) moves the numbers modestly: start median 115ms, end median 152ms, end-within-50ms 16.1% — i.e. the last-word effect explains some but not most of the overall spread.

## Clip-level outliers

20/30 clips (67%) had at least one word with >300ms max edge error — this is the norm on this audio, not a tail. Reading the whisper output against the truth text, causes split into two buckets:

1. **Dialect collapse changing word count** (the char-DP-aligned clips, e.g. `59564a0d…`: truth "i wü iatz sogn, wos i moan" → whisper "Ich will jetzt sagen, wo ist ein Mond?", 7 truth words vs 8 whisper words). Word-count mismatch forces DP alignment, which is inherently softer than 1:1 position mapping.
2. **Dialect collapse with a coincidentally-matching word count** (1:1-aligned clips that still score as outliers, e.g. `8085988c…`: truth "a jeda woaß des" → whisper "Ah, jeder wusste es!", both 4 words but wrong words in 3 of 4 slots) — this is the more dangerous bucket, because the alignment logic can't detect it's actually a semantic mismatch masquerading as a clean 1:1 map.

No clip showed an outright hallucination-into-silence or empty transcription; every outlier traces to real (if wrong) transcribed speech.

## Honest gaps / what I could not measure

- **Ground truth itself may not be acoustically exact.** Azure's `word_boundaries` are the synthesiser's own declared SSML boundaries, which the task specifies to treat as truth — but TTS engines don't always place these boundaries exactly at the acoustic onset/offset either (this is a property of Azure's engine, not something I could independently verify without a second gold source). I did not attempt to validate Azure's own boundaries against, say, a forced aligner.
- **Content-match flag is only available for the 126 1:1-aligned words** — for the 52 char-DP-aligned words (dialect collapse changed word count), there's no clean whisper-side word text to compare against truth text, so I can't run the same content-match split on that subset. I'm relying on the 1:1 subset as representative; it's the majority (126/178) but not all of it.
- **n=30 clips / 178 words is a calibration sample, not exhaustive** — outlier causes above are read from the specific clips that produced them, not confirmed against a larger corpus.
- **This is one course (`deu_at_for_eng`), one voice, one whisper model size (`medium`) — not a general whisper-cli accuracy number.** Standard (non-dialect) German or a larger model may behave differently; not tested here per the brief's scope.

## Bottom line

A 50ms tolerance is **not measurable with this instrument on this audio** — it sits inside the instrument's own noise floor, not above it. Median absolute error is ~120–150ms per edge with a consistent late-running bias (whisper trails truth by ~110–145ms), only ~18% of edges land within 50ms, and this holds up whether or not whisper got the word right — so it isn't fixable by improving transcription accuracy alone. Separately, and worth flagging on its own: whisper mistranscribes this Austrian-dialect audio to a different word two-thirds of the time when run with the standard German language flag, which is a real problem for anyone using whisper's *word identity* on this content, distinct from the timing-precision finding above.
