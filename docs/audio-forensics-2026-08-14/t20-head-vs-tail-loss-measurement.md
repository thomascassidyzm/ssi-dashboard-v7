# T-20: head-vs-tail clip loss on the 81 damaged cym_n_for_eng takes — measured, read-only

2026-08-14. Testing Tom's ear observation that the trim bug clipped tails worse than heads. Input: `/tmp/damaged81.json` (81 clips, all `role: target1`, cym_n_for_eng). No writes: no `course_audio` row touched, no S3 object touched, no reprocessing.

## Result up front

**The measurement says the opposite of the hypothesis. Heads are damaged more than tails, on both independent measurements, and the gap is not close.**

- Waveform: the head edge is louder relative to the clip's own median than the tail edge in 55/81 clips vs tail-louder in 26/81 (sign test p=0.0017, two-sided). Median head-ratio 1.79 vs median tail-ratio 1.27 — heads sit ~40% further above the clip's typical loudness than tails do.
- ASR: 61/81 clips (75%) show the FIRST word missing or corrupted vs 28/81 (35%) with the LAST word missing or corrupted. First-word loss is more than twice as common as last-word loss.

Both methods, run independently on the same 81 clips, land on the same direction and neither is close to 50/50.

## (A) Waveform asymmetry — all 81 clips

Method: each clip decoded to 16kHz mono via ffmpeg. Median RMS computed over 30ms frames across the whole clip (silence-and-speech mixed, so this is "typical loudness including pauses," not a speech-only baseline). Head-ratio = RMS of the first 30ms ÷ median RMS; tail-ratio = RMS of the last 30ms ÷ median RMS. A clean clip starts/ends near silence, so ratio ≈ 0; a clip cut mid-speech starts/ends loud, so ratio is high (often >1, sometimes >>1 on loud plosives/vowels).

| | head-ratio | tail-ratio |
|---|---|---|
| median | 1.79 | 1.27 |
| mean | 3.18 | 2.37 |
| p10 | 0.65 | 0.49 |
| p90 | 5.25 | 4.67 |
| count > 0.5 | 73/81 (90%) | 72/81 (89%) |
| count > 1.0 | 65/81 (80%) | 52/81 (64%) |

**Paired comparison (the number that actually tests Tom's claim):**
- tail-ratio > head-ratio: 26/81 clips (32%)
- head-ratio > tail-ratio: 55/81 clips (68%)
- median(tail − head) = **−0.52** (negative means tail is the QUIETER/cleaner edge, i.e. head is worse)
- Two-sided binomial sign test on the 55-vs-26 split: p = 0.0017 — this is not noise, it's a real, fairly strong asymmetry, and it points at heads.

Script: `scripts/t20-head-tail-measure.cjs`. Raw per-clip output: `/tmp/t20-headtail-results.json` (not committed — regenerate from the script + `/tmp/damaged81.json` if needed).

## (B) ASR word loss — all 81 clips transcribed (exceeds the 25 minimum)

Method: whisper.cpp `ggml-medium.bin` (multilingual, handles Welsh), `--language cy`, via `~/.local/bin/whisper-cli` (`WHISPER_NO_SEMAPHORE=1` for interactive priority). Expected vs transcribed text normalized (lowercase, diacritics stripped, punctuation stripped) and word-tokenized. First/last expected word checked for a fuzzy match (character similarity ≥0.6, words <3 chars require exact match to avoid short-word false positives — Welsh has many 1-2 letter words like "o", "i", "a" that trivially substring-match almost anything) against the first/last 3 transcribed words.

| class | count | share |
|---|---|---|
| complete (both edges present) | 17 | 21% |
| first word/syllable missing only | 36 | 44% |
| last word/syllable missing only | 3 | 4% |
| both missing | 25 | 31% |
| **first-affected (first_missing + both)** | **61** | **75%** |
| **last-affected (last_missing + both)** | **28** | **35%** |

Script: `scripts/t20-asr-wordloss.cjs`. Classifier: `/tmp/classify_wordloss2.py`. Raw transcripts: `/tmp/t20-asr-results.json`, classified: `/tmp/wordloss-classified2.json` (not committed).

### Examples (expected → whisper, missing/garbled part in **bold**)

**First word gone:**
- `Chwech o'r gloch. Gorffennaf. Awst. Medi.` → `Echogloch. Cwrfennaf. Awst. Medi.` — **Chwech** fused/destroyed, "Gorffennaf/Awst/Medi" intact.
- `Wrth gwrs. Be ydi'ch symptomau chi?` → `beth ichi'n symtomau?` — **Wrth gwrs** entirely absent.
- `Ardderchog. Ac oes 'na beiriant arian…` → `ac oes 'na beiriant arian yn agos.` — **Ardderchog** entirely absent.
- `Prynhawn da. Mae gen i stafell… dan yr enw…` → `Ond mae gen i stafell dan y Rhenw John.` — **Prynhawn da** entirely absent.

**Last word gone (rarer, 3 clean cases):**
- `Diolch,… dach chi 'di bod yn help mawr. Dw i'n ddiolchgar iawn.` → `Diolch, da chi'n dibodd yn help mawr. Dwi'n diolch, Gary.` — opening "Diolch" intact, closing **iawn** replaced by nonsense "Gary".
- `Pedwar o'r gloch. Wyth o'r gloch. Mawrth. Ebrill.` → `Dŵr o'r gloch. Uist o'r gloch. Mawrth. Epreu.` — **Ebrill** garbled to "Epreu" (this one also shows head damage on "Pedwar"→"Dŵr", so it's really a "both" case on inspection, kept here as the closest thing to a clean tail-only example).

**Both edges gone:**
- `Bore da, Sarah!` → `da` — both the opening word and the name are gone, leaving one surviving word.
- `Hydref. Tachwedd. Rhagfyr.` → `ymwneud â'r ddau yn ystod ymwneud â'r ddau.` — total hallucination, see caveat below.

**Complete (control — shows whisper CAN reproduce edges when they're intact):**
- `A'r risotto i mi. Efo salad gwyrdd bach i ddechrau.` → `a'r esoto i mi efo salad gwyrdd bach i ddechrau.` — both edges present despite mid-sentence noise ("risotto"→"esoto").

## Trust level and explicit gaps

- **Waveform method**: high trust. It's a direct physical measurement (RMS at the literal first/last samples), no transcription involved, and the sign test is comfortably significant (p=0.0017) on the full 81.
- **ASR method**: moderate trust, not high. Two concrete reasons:
  1. Short list-style clips (numbers, colours, days) transcribe worst overall — whisper's Welsh model handles connected prose much better than isolated number/colour lists, so several "both missing" verdicts on clips like `Un. Dau. Tri. Gwyn. Du.` are partly an ASR-quality artifact, not purely a damage signal. I did not exclude these from the counts (that would be cherry-picking), but they inflate the "both" bucket specifically, not the first-vs-last asymmetry — a whisper-quality artifact should hit first and last roughly equally, and it didn't (75% vs 35%).
  2. Whisper systematically renders "Dw i'n" as "Dwi'n" (contraction spelling) — 5 of the 36 first-word losses have `exp_first == 'dw'` and could partly be this spelling variant rather than true clipping. I checked all 5 individually: in each, the SECOND word also differs from expected (not just a "dw"→"dwi" merge), so these look like genuine damage co-occurring with the spelling variant, not the variant alone — but flagging it as a limitation of the method rather than asserting certainty.
- Both caveats work in the direction of adding noise to the ASR measurement, not in a direction that would manufacture the first>last asymmetry — the asymmetry survives both.
- **No gaps in tool access**: whisper-cli, ffmpeg, and S3 credentials all worked as expected; nothing was unusable.

## Answer

**The tail is not measurably worse than the head — the head is measurably worse than the tail, on both independent measurements.** Waveform: heads exceed the clip's own median loudness more than tails do, in 55/81 clips vs 26/81 (p=0.0017). ASR: the first word is missing/corrupted in 75% of clips vs 35% for the last word — more than double. Tom's ear read the direction backwards on this batch, or the batch itself doesn't match whatever he was hearing when he formed that impression.
