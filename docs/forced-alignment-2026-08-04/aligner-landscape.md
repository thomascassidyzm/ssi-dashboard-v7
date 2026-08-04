# Forced-alignment landscape for SSi TTS QA — paper assessment

**Date:** 2026-08-04. **Scope:** paper assessment only — nothing installed, no TTS run, no DB touched, no audio measured.
**Question:** if whisper.cpp proves inadequate as the automated QA gate over >10k clips per course, what is the right aligner to build on?

---

## 0. The frame, restated so the scoring criterion is unambiguous

Every SSi clip has an **EXPECTED TEXT** — the phrase we asked the voice to say, in its role (`target1`, `target2`, `known`, `presentation`, `pod_explainer`). We are therefore never asking the open question *"what did it say?"*. We are asking the closed question *"how well does this waveform acoustically fit **this exact string**?"*

That distinction is the whole design, and it is exactly where Tom's worry bites. An ASR decoder has a language model in the loop: it is trained to emit the *likeliest sentence*, and when the acoustics are mushy the LM supplies the missing evidence and hands back the right-looking answer. A clip that is 60% mumble can score high because the decoder inferred the rest. That is a gate that passes broken audio.

A **CTC forced alignment** cannot do this. The target string is fixed; the algorithm runs Viterbi over the acoustic model's frame-wise emission matrix constrained to that one string, and the score it returns is the per-frame posterior of the token the string demanded. There is no search over alternative sentences, so there is nothing for an LM to guess *with*. The score is a genuine acoustic likelihood, and if the audio does not contain those phones the score falls. **This is the load-bearing property, and it partitions the candidates cleanly.**

| Candidate | LM in the scoring path? | Verdict on Tom's worry |
|---|---|---|
| torchaudio `forced_align` + MMS_FA | **No** — self-supervised wav2vec2 CTC head, no LM ([docs](https://docs.pytorch.org/audio/main/tutorials/ctc_forced_alignment_api_tutorial.html)) | Cannot guess. Clean. |
| BFA (CUPE + CTC) | **No, and structurally so** — the phoneme encoder is *contextless* by design | Cannot guess even in principle. Cleanest of all. |
| ctc-segmentation + MMS | **No** — model-agnostic CTC alignment over your own emissions | Cannot guess. Clean. |
| WhisperX alignment stage | **No** in the alignment itself (wav2vec2 CTC trellis) — **but** the text it aligns to is Whisper's LM-decoded output unless you intervene | Clean only if you force your own EXPECTED TEXT in |
| MFA | **No** — HMM-GMM/acoustic Viterbi against a pronunciation dictionary | Cannot guess. Clean. |
| NVIDIA NFA | **No** when `align_using_pred_text=false` — Viterbi over CTC log-probs against ground-truth text | Clean |
| whisper.cpp free-decode token probs | **Yes** — this is decoding, LM-shaped | This is the thing being replaced |
| LLM-based aligners (e.g. [arXiv 2601.18220](https://arxiv.org/html/2601.18220v1)) | **Yes, maximally** | Disqualified on principle for this gate |

---

## 1. torchaudio CTC forced alignment (`forced_align` / `MMS_FA`)

**Score emitted.** `torchaudio.functional.forced_align(log_probs, targets, blank=0)` returns two tensors: the aligned label per frame, and *"log probability scores of the labels for each time step"* ([API docs](https://docs.pytorch.org/audio/stable/generated/torchaudio.functional.forced_align.html)). The tutorial exponentiates them straight back to posteriors (`scores = scores.exp()`), then merges frames into token and word spans by duration-weighted mean:

```python
def _score(spans):
    return sum(s.score * len(s) for s in spans) / sum(len(s) for s in spans)
```

([CTC forced alignment API tutorial](https://docs.pytorch.org/audio/main/tutorials/ctc_forced_alignment_api_tutorial.html).) So a word score is *the mean per-frame acoustic posterior of the tokens that word demanded, over the frames the aligner assigned it*. That is a genuine acoustic posterior, not a proxy. The emission matrix comes from a wav2vec2 self-supervised acoustic model with **no language model** — the tutorial says so in terms.

**Timestamps.** Yes, word-level start/end. Spans carry frame indices; the tutorial converts with `ratio = waveform.size(1) / num_frames`, i.e. frame index × hop. wav2vec2's stride gives ~20 ms resolution. Adequate for the VAD metrics SSi wants (leading/trailing silence, speech duration vs expected).

**Language coverage — this is where it wins outright.** `MMS_FA` is *not* a per-language model. `get_dict()` returns a 29-symbol vocabulary of **Latin characters only**: `{'-':0,'a':1,'i':2,'e':3,…,'x':27,'*':28}` ([Wav2Vec2FABundle docs](https://docs.pytorch.org/audio/stable/generated/torchaudio.pipelines.Wav2Vec2FABundle.html)). You romanise the EXPECTED TEXT with [uroman](https://github.com/isi-nlp/uroman) — a heuristic universal romaniser needing no per-language dictionary — and the same single model aligns it. Meta's own tooling states the *"alignment model outputs uroman tokens for input audio in any language"* ([MMS data_prep README](https://github.com/facebookresearch/fairseq/blob/main/examples/mms/data_prep/README.md)). The underlying acoustic model was trained on 31K hours across **1,130 languages** ([MMS_FA docs](https://docs.pytorch.org/audio/stable/generated/torchaudio.pipelines.MMS_FA.html)).

I checked Meta's published MMS language-coverage list directly (`https://dl.fbaipublicfiles.com/mms/misc/language_coverage_mms.html`) for the nine hard cases. **All nine are present**: `cym` Welsh, `eus` Basque, `hye` Armenian, `npi` Nepali (ISO-639-3 individual code), `kan` Kannada, `tel` Telugu, `mar` Marathi, `guj` Gujarati, `pan` Panjabi — plus `ben`, `tam`, `gle`. Architecturally the point is stronger still: because there is no language selector, **one model covers all 44 SSi languages**, including both Welsh dialects, `ara` and its variants, and `por` vs `por_br`, with zero per-language model management.

**One model, one download, forty-four languages** is the single biggest cost difference in this whole document.

**Install cost (8 cores, ~15 GB RAM, no GPU).** pip only, no conda. CPU-only wheels from the PyTorch CPU index: `torch` + `torchaudio` ≈ 250–450 MB installed. The MMS_FA checkpoint is the MMS-300M model — the HF conversion is 0.3B params, ~1.2 GB at fp32 ([mms-300m-1130-forced-aligner](https://huggingface.co/MahmoudAshraf/mms-300m-1130-forced-aligner)); an INT8 ONNX build is ~340 MB ([ONNX export](https://huggingface.co/romara-labs/mms-300m-1130-forced-aligner-ONNX)). Budget ~2 GB disk. Note torchaudio entered a **maintenance phase**: I/O and codec APIs were deprecated in 2.8 and removed in 2.9, moving to TorchCodec, but *"most of the APIs in transforms, functional, compliance.kaldi, models and pipelines modules will remain"* ([Update on TorchAudio's future, issue #3902](https://github.com/pytorch/audio/issues/3902)). So `functional.forced_align` and `pipelines.MMS_FA` survive; **plan to load audio with `soundfile`/`ffmpeg`, not `torchaudio.load`.**

**Fully local, no metered API.** Yes. Nothing phones home after the model download.

**Speed.** *Explicit gap.* I found no published CPU real-time-factor figure for MMS-300M forced alignment. The ONNX card claims "ultra-fast CPU processing" for the INT8 build but publishes no numbers. A 300M-param wav2vec2 forward pass on 8 CPU cores is the dominant cost and should be well under real-time, but **this must be measured on real SSi clips before sizing a 10k sweep — do not take a number from me.**

**One caveat on reading the score.** CTC models are **"peaky"** — probability mass spikes at label onset rather than sustaining across the label's duration, noted explicitly in the tutorial. So a raw low word score is not automatically "bad audio"; part of the spread is a CTC artifact. This is another reason the thresholds must be fitted empirically from a labelled sample per language and per role, not set from first principles.

**Pathological input.** This is documented and it is the good news. The tutorial explicitly covers a truncated transcript: removing the opening words *"results in wrong alignments of the existing word"*, and it introduces the `<star>` token, *"capable of modeling any token to improve alignment quality when the transcript is partially missing"* ([tutorial](https://docs.pytorch.org/audio/main/tutorials/ctc_forced_alignment_api_tutorial.html)). Both behaviours are useful to SSi: run **without** star and a half-rendered clip produces mangled spans and a collapsed word-score tail — exactly the signal a truncation detector wants; run **with** star to recover where the mismatch actually starts. On digital silence the emission matrix is essentially all-blank, so the constrained path is forced through low-posterior frames and every word score floors — degradation, not a crash. The one hard failure mode is structural, not acoustic: a `TORCH_CHECK` in the kernel requires emission length `T ≥ L + R` (target length plus consecutive repeats), so a very short or zero-length clip against a long EXPECTED TEXT **raises** rather than scoring. That is a catchable exception and is itself a defect verdict — a clip grossly too short for its expected text is exactly what you want flagged. Note a live cosmetic bug: the error message **swaps the `T` and `L` variable names**, so don't debug from the wording ([pytorch/audio#3747](https://github.com/pytorch/audio/issues/3747), open). Also `batch_size == 1` only, per the API docs — parallelise across processes, not batches.

**So build the gate expecting three outcomes, not two:** (1) hard exception on the length constraint → automatic fail; (2) successful alignment with a collapsed score → the main quality signal; (3) crashes in post-processing code paths that assume alignment succeeded cleanly — a real class of failure in downstream wrappers (e.g. `AssertionError: a != <star>` in `get_spans()`, [whisper-diarization#190](https://github.com/MahmoudAshraf97/whisper-diarization/issues/190)). Wrap every call and treat any exception as a fail verdict rather than a crash.

**Licence flag — needs a Tom decision.** The MMS_FA weights are *"Published by the authors of Scaling Speech Technology to 1,000+ Languages under CC-BY-NC 4.0 License"* — quoted verbatim from the torchaudio page. **Non-commercial.** Using it as an internal QA gate inside a commercial course factory is a judgement call, not a clear-cut permission. Options: (a) accept it as internal tooling that ships nothing; (b) obtain a commercial MMS licence from Meta; (c) fall back to MFA's CC-BY-4.0 models for the languages MFA covers. This is the one genuine cost of the recommendation below and it is a legal call, not a technical one.

---

## 2. WhisperX

**Score emitted.** WhisperX's aligner is its own trellis/backtracking implementation inspired by the torchaudio tutorial — not a call into `forced_align`. Word score is the mean of character-level posteriors: `word_score = round(word_chars["score"].mean(), 3)` ([whisperx/alignment.py](https://github.com/m-bain/whisperX/blob/main/whisperx/alignment.py)). Genuine acoustic posterior from a wav2vec2 CTC model, LM-free **in the alignment stage**.

**The catch, and it is the decisive one.** WhisperX is architecturally *transcribe-then-align*: Whisper decodes (LM in the loop), and the alignment stage snaps timestamps onto **the text Whisper produced**. Out of the box it is measuring "does the audio fit what Whisper thinks it heard" — precisely the gate that passes a mumbled clip, because both halves agree with each other.

You *can* bypass Whisper: `align()` takes `transcript: Iterable[SingleSegment]` and nothing in the signature or body requires that text to have come from Whisper. But this is an **undocumented, unsupported private path**, and people hit friction using it — [#1308](https://github.com/m-bain/whisperX/issues/1308) (open, no maintainer resolution), plus [#939](https://github.com/m-bain/whisperX/issues/939), [#289](https://github.com/m-bain/whisperX/issues/289), [#1009](https://github.com/m-bain/whisperX/issues/1009), [#1111](https://github.com/m-bain/whisperX/issues/1111) all asking for the same thing. And at that point you are using a wav2vec2 CTC aligner while paying for the whole WhisperX stack, its ctranslate2/torch version-pinning fragility ([discussion #1296](https://github.com/m-bain/whisperX/discussions/1296)) and a 40-language ceiling. **If you strip out the part that makes it WhisperX, buy the aligner directly.**

**Timestamps.** Yes, word-level. Accuracy is middling: the 2026 MFA benchmark measures WhisperX at ~110 ms mean word-boundary error against MFA's phone-level 10–15 ms ([arXiv 2606.18466](https://arxiv.org/html/2606.18466v1)) — fine for clip-level VAD, poor for phonetics.

**Language coverage — hard ceiling.** WhisperX ships a fixed dict of per-language wav2vec2 models. From current `alignment.py`:
- `DEFAULT_ALIGN_MODELS_TORCH`: en, fr, de, es, it
- `DEFAULT_ALIGN_MODELS_HF`: ja, zh, nl, uk, pt, ar, cs, ru, pl, hu, fi, fa, el, tr, da, he, vi, ko, ur, te, hi, ca, ml, no, nn, sk, sl, hr, ro, eu, gl, ka, lv, tl, sv, id

For a language not in those dicts it logs an error and **raises `ValueError`** — you must go find a wav2vec2 checkpoint on HF yourself and pass `--align_model`.

Against the nine hard cases: **IN** — Basque (`eu`), Telugu (`te`). **OUT** — Welsh, Armenian, Nepali, Kannada, Marathi, Gujarati, Panjabi. Also **OUT** from the wider SSi estate: Bulgarian, Lithuanian, Irish, Bengali, Tamil, Thai. That is a per-language hunt for ~13 of 44 languages, each with its own checkpoint, its own quality, its own licence. **This is the disqualifier.**

**Install.** pip; torch + faster-whisper/CTranslate2 + per-language wav2vec2 checkpoints (~300 MB–1.2 GB each). Runs CPU-only but Whisper transcription on CPU is the slow part — and for SSi it is *wasted* work, since we already know the text.

**Local, no metered API.** Yes.

**Silence/truncation.** Whisper is notorious for hallucinating text on silence, which then gets confidently aligned. Since the whole point is that we do not want ASR's opinion, this is a fatal interaction for the silent-stub case specifically.

---

## 3. Montreal Forced Aligner (MFA)

**Score emitted.** Kaldi-based HMM-GMM Viterbi alignment against a pronunciation dictionary. There is no ASR-decode step in the alignment path at all — the "grammar" is a trivial FST of the exact EXPECTED TEXT you supply, so the score is pure acoustic likelihood. **LM-free, and unlike WhisperX it is a forced aligner by construction rather than by workaround.**

Three score surfaces, and the granularity is fiddlier than it first looks:
- `Utterance.alignment_log_likelihood` / `Utterance.speech_log_likelihood` — utterance-level, with and without silence phones.
- `PhoneInterval.phone_goodness` — per-phone GMM-HMM log-likelihood, documented in source as *"Confidence score, log-likelihood, etc for the phone interval"*.
- `WordInterval.confidence` — **hard-coded `return None` in current source** ([montreal_forced_aligner/db.py](https://raw.githubusercontent.com/MontrealCorpusTools/Montreal-Forced-Aligner/main/montreal_forced_aligner/db.py)). **MFA does not natively expose a per-word score.** You would aggregate `phone_goodness` over each word's phones yourself.

MFA 3.x also exports `alignment_analysis.csv` alongside the TextGrids with columns `file, begin, end, speaker, overall_log_likelihood, speech_log_likelihood, phone_duration_deviation, snr` ([Analysing alignment quality](https://montreal-forced-aligner.readthedocs.io/en/v3.1.1/user_guide/implementations/alignment_analysis.html)). The docs warn the log-likelihood is *"a relative measure for the best path of alignment for this particular utterance compared to other possible alignments"* — **not calibrated across utterances or languages**, so thresholds must be fitted per language. The bundled `phone_duration_deviation` and `snr` columns are, incidentally, a ready-made near-silence detector. `--output_format` accepts `long_textgrid` (default), `short_textgrid`, `json`, `csv`.

**Timestamps.** Yes, and the best in the field. MFA's own 2026 paper reports mean phone-boundary error of 10.8–14.8 ms across TIMIT/Buckeye/CSJ/Seoul, beating MAUS, MAPS, Charsiu, NeMo and WhisperX ([arXiv 2606.18466](https://arxiv.org/html/2606.18466v1), by the MFA authors — read the ranking with that in mind, though the boundary numbers are consistent with prior literature).

**Language coverage — better than the docs summary suggests, still not enough.** MFA needs a **pretrained acoustic model *and* a pronunciation dictionary per language**. I initially undercounted this from the rendered readthedocs page; the authoritative list is the models repo source, which enumerates **42 acoustic models** and **50 dictionaries** ([acoustic index.rst](https://raw.githubusercontent.com/MontrealCorpusTools/mfa-models/main/docs/source/acoustic/index.rst), [dictionary index.rst](https://raw.githubusercontent.com/MontrealCorpusTools/mfa-models/main/docs/source/dictionary/index.rst)). Acoustic models: Abkhaz, Armenian, Bashkir, Basque, Belarusian, Bulgarian, Chuvash, Croatian, Czech, Dutch, English, French, Georgian, German, Greek, Guarani, Hausa, Hungarian, Italian, Japanese, Kazakh, Korean, Kurmanji, Kyrgyz, Mandarin, Polish, Portuguese, Romanian, Russian, Serbocroatian, Sorbian, Spanish, Swahili, Swedish, Tamil, Tatar, Thai, Turkish, Ukrainian, Uyghur, Uzbek, Vietnamese. Six further languages — Arabic, Hindi, Indonesian, Maltese, Punjabi, Urdu — have a **dictionary but no acoustic model**, so they need cross-language phone remapping onto e.g. Global English (paper §3.2).

Against the nine hard cases: **IN** — Basque (acoustic model), Armenian (CommonVoice-phoneset acoustic model v2.0.0, verified in the repo tree). **OUT** — Welsh, Nepali, Kannada, Telugu, Marathi, Gujarati; Panjabi is dictionary-only, i.e. no acoustic model without remapping. From the wider estate also missing: Danish, Lithuanian, Latvian, Catalan, Irish, Persian, Bengali, plus Arabic/Hindi/Urdu as dictionary-only. **MFA covers roughly 25 of SSi's 44 languages** — respectable, and much better than my first pass claimed, but it still misses seven of the nine hard cases and the whole Indic tail.

*Provisional, not verified:* MFA also hosts the **VoxCommunis** extension (XPF/Epitran-generated pronunciation resources) which appears to add Welsh (`cy`), Marathi (`mr`), Lithuanian (`lt`), Catalan (`ca`), Bengali (`bn`) and Panjabi (`pa`) at the dictionary tier. That would still need an acoustic model by remapping. The source for this was a paginated HuggingFace listing, so treat both the additions and the absences (Nepali, Kannada, Gujarati, Irish, Latvian, Danish) as **unconfirmed** — [pacscilab/VoxCommunis](https://huggingface.co/datasets/pacscilab/VoxCommunis).

**Install cost.** conda/mamba effectively mandatory — MFA and Kaldi are distributed together on conda-forge, `conda create -n aligner -c conda-forge montreal-forced-aligner` ([installation docs](https://montreal-forced-aligner.readthedocs.io/en/latest/installation.html)). It also wants a PostgreSQL instance for its corpus database in 3.x. Then a per-language acoustic model + dictionary download for each language you cover. Heaviest install of the four by a wide margin, and the operational cost scales with language count rather than being flat.

**Local, no metered API.** Yes.

**Speed.** *Explicit gap* — I found no directly comparable per-clip CPU figure. MFA is multiprocess and generally fast on CPU (it is a GMM, not a transformer), and is likely the fastest per clip of the four, but I am not going to invent a number.

**Pathological input.** MFA fails *loudly*, which is a virtue here: alignment that cannot find a path within `beam` is retried at `retry_beam`, and utterances that still fail are reported as **unaligned** rather than silently scored. A digital-silence clip or a half-rendered clip is a strong candidate for either an unaligned verdict or a badly negative `speech_log_likelihood`. *Explicit gap:* I did not verify the exact unaligned-output format in MFA 3.x docs, only that the beam/retry_beam mechanism and unaligned reporting exist.

**Licence advantage.** MFA acoustic models are published **CC BY 4.0** — commercially usable with attribution (verified on the [German MFA acoustic model v3.0.0 page](https://mfa-models.readthedocs.io/en/latest/acoustic/German/German%20MFA%20acoustic%20model%20v3_0_0.html)). This is the one place MFA beats MMS outright.

---

## 3a. Bournemouth Forced Aligner (BFA) — the newcomer that nearly wins

Added after the field sweep surfaced it; it deserves more than a one-liner. **BFA: Real-time Multilingual Text-to-speech Forced Alignment**, Rehman, Cai, Zhang & Yang, September 2025 ([arXiv:2509.23147](https://arxiv.org/abs/2509.23147), [github.com/tabahi/bournemouth-forced-aligner](https://github.com/tabahi/bournemouth-forced-aligner), [PyPI](https://pypi.org/project/bournemouth-forced-aligner/)). It is independently benchmarked in the 2026 MFA paper, so it is not vapour.

**Score emitted — and it is the strongest answer to Tom's worry in this whole document.** A **Contextless Universal Phoneme Encoder (CUPE)** feeding a CTC decoder. *Contextless* is the operative word: the encoder is architecturally incapable of using surrounding linguistic context to infer a phoneme, so it cannot guess the right answer from the sentence. Output is per-phoneme with a `confidence` field on a 0–1 scale (README suggests treating <0.2 as suspect), word-level confidence derived from constituent phonemes. Text is phonemised with **espeak-ng** to a 66-class phoneme inventory. No LM anywhere.

**It also ships the QA signal SSi actually wants, pre-built.** Alongside `phoneme_ts`, `group_ts` and `words_ts` there is a `coverage_analysis` block — `missing_count`, `extra_count`, `coverage_ratio` — which is a more direct truncation detector than any posterior threshold. **Caveat with teeth:** `enforce_all_targets=True` is the **default**, and it forces timestamps for every phoneme regardless of acoustic evidence, i.e. the same silently-stretch-the-missing-words behaviour that killed NeMo NFA. The difference is that BFA *flags* it — `"is_estimated": true` per phoneme. **Read `is_estimated` and `coverage_analysis`, or turn the default off; do not take the timestamps at face value.**

**Speed — the only published CPU figure in the entire sweep.** *"~0.2 seconds to align 10 seconds of audio (on CPU)"* (README), and the paper reports a real-time factor of **0.05–0.1×**, up to **240× faster than MFA**. At an RTF of ~0.06 a 10,000-clip sweep of ~3 s clips is on the order of **ten minutes of CPU**, not hours. If this holds on real SSi audio it changes the economics of the whole gate.

**Install** is the lightest here by an order of magnitude: `pip install bournemouth-forced-aligner`, plus system `espeak-ng` and `ffmpeg`. Model **~50 MB**, auto-downloaded — against MMS_FA's 1.18 GB. Fully local, no metered API.

**Language coverage — all nine hard cases IN, but a hole SSi cannot ignore.** Verified in the repo's own preset table: Welsh `cy`, Basque `eu`, Armenian East `hy` and West `hyw`, Nepali `ne`, Kannada `kn`, Telugu `te`, Marathi `mr`, Gujarati `gu`, Punjabi `pa` — **9/9**. But the README states plainly: *"Not supported: Tonal languages — Chinese (Mandarin, Cantonese), Vietnamese, Thai, Burmese — and isolating/agglutinative families such as Japanese and Korean, because the underlying acoustic model was not trained on them."* That removes **`zho`, `jpn`, `kor`, `tha`, `vie`** — five live SSi languages, including `jpn`, which is an active course build. BFA covers roughly **39 of 44**.

**Licence — better than MMS.** Code is **GPLv3**; the paper carries CC-BY-NC-SA 4.0. GPLv3 is unproblematic for internal tooling that ships nothing (no distribution, no copyleft trigger). *Gap: the pretrained CUPE weights' licence is not explicitly stated on the model repo — confirm before relying on it, since that is exactly the trap MMS sets.*

**Maturity is the real risk.** Published September 2025, evaluated **on English only** — the authors say so: *"evaluation on additional languages would further validate this approach."* Boundary precision is also weak against MFA (55.6% vs 81.2% at 20 ms on TIMIT, partly because BFA predicts offsets as well as onsets, which conventional aligners do not). SSi does not need 20 ms phone precision, so that matters less here than the English-only evaluation does.

## 4. The rest of the field

**NVIDIA NeMo Forced Aligner (NFA) — killed, and for a sharper reason than I first thought.** The shape is right (Viterbi over a CTC head's log-probs against ground-truth text, LM-free when `align_using_pred_text=false`, token/word/segment CTM — [NFA docs](https://docs.nvidia.com/nemo-framework/user-guide/latest/nemotoolkit/tools/nemo_forced_aligner.html)). But a source check found **`conf=None` hard-coded in the CTM writer**: NFA emits *no per-word confidence at all*. It is a timestamp aligner, not a quality scorer — you would have to fork it to pull per-token log-probs out. Worse for this use case, being a pure forced aligner with no scoring surface, a truncated clip makes it **silently stretch the missing words across whatever audio remains** and report nothing wrong — exactly the defect SSi needs caught. Coverage is also patchy (Welsh absent; the Indic set depends on a third-party AI4Bharat model with a documented unresolved tokenizer-mismatch bug against NFA), and the NeMo install is far heavier than a torch+torchaudio pip.

**`ctc-segmentation` (lumaku) — the serious runner-up.** Model-agnostic CTC alignment: you bring any CTC emission matrix, it aligns the EXPECTED TEXT and returns a **genuine acoustic-posterior confidence per segment**. LM-free, fully local. Two properties make it a real contender rather than an also-ran: it **degrades to a low score on missing words** and it **hard-errors on badly truncated clips** (`"Audio is shorter than text!"`) — both are the QA verdicts SSi wants, delivered rather than hidden. Because it is model-agnostic it pairs with an MMS checkpoint, so it inherits the same all-44-language coverage as the primary recommendation while decoupling you from torchaudio's maintenance status. *Gap:* no published CPU speed figure — the cost is the wav2vec2 forward pass, same as everything else here.

**SpeechBrain** — viable rather than killed, on the same basis: model-agnostic CTC segmentation paired with MMS checkpoints, genuine acoustic posterior, actively maintained. It is a toolkit rather than a packaged aligner, so you assemble more yourself. Reasonable fallback, not a first choice.

**`ctc-forced-aligner` (MahmoudAshraf)** — not a rival to torchaudio, a *packaging* of it. Wraps the same MMS-300M CTC alignment behind a CLI and Python API with built-in uroman romanisation, `<star>` handling, word/sentence/character granularity, and a claimed *"at least 5× less memory usage"* than the torchaudio API ([GitHub](https://github.com/MahmoudAshraf97/ctc-forced-aligner), [PyPI](https://pypi.org/project/ctc-forced-aligner/)). Needs ffmpeg. Same CC-BY-NC model licence. **This is the most likely thing SSi actually calls**, with the torchaudio primitives underneath if the wrapper gets in the way. Two known warts to plan around: CTC-architecture bugs around **trailing silence and last-word truncation**, and at least one report of large alignment drift on a low-resource language (Yiddish) — per-language quality is not guaranteed merely because a language is "covered".

**MWA — Multilingual Word-Level Forced Alignment** ([arXiv 2606.10675](https://arxiv.org/abs/2606.10675), June 2026) — MMS + UnSupSeg representations with a learned DP decoder, reporting better-than-MFA-and-MMS word boundaries and zero-shot transfer to unseen languages. *Watch, do not build on.* It targets **boundary precision, not fit scoring** — the abstract mentions no per-word confidence — it is weeks old, and it inherits MMS's licence. Revisit in six months.

**`whisper-timestamped` / `stable-ts`** — flag, never the gate. Their confidence rides on Whisper's LM-biased decoder, which is documented to **hallucinate plausible text over silence** ([openai/whisper#1606](https://github.com/openai/whisper/discussions/1606), [#679](https://github.com/openai/whisper/discussions/679)). That is the silent-stub case failing in the worst possible way — confidently. Usable as a triangulation signal alongside a real aligner; never as the sole verdict.

**LLM-ForcedAligner** ([arXiv 2601.18220](https://arxiv.org/html/2601.18220v1)) — **anti-recommended by construction.** An LLM in the alignment loop is precisely the intelligence-that-guesses failure mode Tom named.

**Killed in one line each:** *Kaldi raw* — no pretrained models for any of the nine hard languages; MFA is the usable face of it. *Prosodylab-Aligner* — dead. *EasyAlign* — no coverage. *WebMAUS (BAS)* — hosted web service, not fully local; disqualified. *aeneas* — DTW against synthesised TTS, no acoustic posterior at all, score is a proxy; would not catch a mispronunciation. *Gentle* — unmaintained, English-only Kaldi wrapper *(this one rests on my own reading; the worker report confirming it did not land — see gaps)*. *Charsiu* — English/Mandarin research aligner, benchmarked in the 2026 MFA paper, not multilingual enough for SSi. *Paid alignment APIs* — disqualified per brief, metered.

---

## 5. Coverage matrix against the nine hard languages

| | MMS_FA / ctc-seg + MMS | BFA | WhisperX | MFA | NeMo NFA |
|---|---|---|---|---|---|
| Welsh `cym` | ✅ | ✅ `cy` | ❌ | ❌ *(VoxCommunis dict only, unconfirmed)* | ❌ |
| Basque `eus` | ✅ | ✅ `eu` | ✅ (`eu`) | ✅ acoustic model | ❌ |
| Armenian `hye` | ✅ | ✅ `hy`+`hyw` | ❌ | ✅ CV acoustic model v2.0.0 | ❌ |
| Nepali `npi` | ✅ | ✅ `ne` | ❌ | ❌ | ❌ |
| Kannada `kan` | ✅ | ✅ `kn` | ❌ | ❌ | ❌ |
| Telugu `tel` | ✅ | ✅ `te` | ✅ (`te`) | ❌ | ❌ |
| Marathi `mar` | ✅ | ✅ `mr` | ❌ | ❌ *(VoxCommunis, unconfirmed)* | ❌ |
| Gujarati `guj` | ✅ | ✅ `gu` | ❌ | ❌ | ❌ |
| Panjabi `pan` | ✅ | ✅ `pa` | ❌ | ❌ dict only, no acoustic model | ❌ |
| **Hard nine** | **9 / 9** | **9 / 9** | 2 / 9 | 2 / 9 | 0 / 9 |
| `zho` `jpn` `kor` `tha` `vie` | ✅ all five | ❌ **all five out** | ✅ 4 of 5 | ✅ all five | partial |
| **SSi estate, ~44** | **all 44, one model** | ~39 of 44 | ~31 of 44, 31 models | ~25 of 44, 25 models + dicts | ~14, English-tested only |

MMS_FA ✅ = present in Meta's published MMS coverage list *and* reachable with no per-language model, because the token set is romanised Latin.

**Two code-mapping traps before wiring this up.** Meta uses ISO-639-3 *individual* codes where SSi uses macrolanguage codes: Nepali is **`npi`**, not `nep`; Chinese is **`cmn`** (Mandarin), not `zho`. Check these against the course-builder's language codes rather than assuming a straight pass-through.

**Two pipeline stages that are not formalities.** Non-Latin scripts need uroman romanisation — and **uroman mangles numerals**, flagged in the torchaudio multilingual tutorial, so expected text containing digits needs normalising first. Separately, languages without orthographic word boundaries — **Chinese, Japanese, Thai** — need a **word-segmentation step on top of romanisation** before you can get word-level spans at all. That is real pipeline work for `zho`, `jpn` and `tha`, not a config flag.

**Explicit gap: per-language alignment accuracy is not separately published**, and I would expect it to vary — Welsh, Basque and Armenian are lower-resource within MMS than German or Spanish, and there is at least one reported case of large drift on a low-resource language. A pilot per language on real SSi clips is required before trusting a single global threshold.

---

## 6. Explicit gaps — things I could not verify

1. **CPU speed per clip for any of the four.** No credible published real-time factor for MMS-300M alignment on CPU, none for MFA per short utterance, none for NFA. A 10k-clip sweep cannot be sized from this document. Measure it.
2. **Per-language accuracy of MMS_FA** across the SSi estate — no published per-language alignment-error breakdown.
3. **Score calibration across languages.** Neither MMS_FA posteriors nor MFA log-likelihoods are documented as comparable across languages. Thresholds will almost certainly need to be per-language, and probably per-role (`pod_explainer` clips are long; `target1` clips are short — the score distributions will not match).
4. **MFA 3.x unaligned-output format** — I confirmed beam/retry_beam and unaligned reporting exist, but did not read the exact failure record schema.
5. **Empirical behaviour on digital silence.** Every claim above is reasoned from the algorithms plus the torchaudio truncation tutorial. Nobody has published "here is what the score does on an all-zeros WAV". Generate the pathological cases deliberately and measure the floor — that is a half-day job and it is the calibration you actually need.
6. **Whether CC-BY-NC permits internal QA use** in a commercial business. Legal, not technical.
7. **Exact disk footprint.** MMS_FA checkpoint is a sourced ~1.18 GB (`dl.fbaipublicfiles.com/mms/torchaudio/ctc_alignment_mling_uroman/model.pt`). The CPU-only torch wheel size is **not** sourced — the PyPI default wheel is 526 MB but that is the CUDA-bundled one; verify with `pip download --no-deps` before budgeting. MFA per-language model and dictionary sizes could not be verified from official sources at all.
8. **The VoxCommunis extension list for MFA** — enumerated from a paginated HuggingFace listing, so both its additions (Welsh, Marathi, Lithuanian, Catalan, Bengali, Panjabi at dictionary tier) and its absences (Nepali, Kannada, Gujarati, Irish, Latvian, Danish) are provisional.
9. **Gentle** — the worker report covering it never landed; the one-line kill rests on my own reading, not a verified source.
10. **No explicit "LM-free" sentence exists in torchaudio's docs.** The claim rests on the complete absence of any LM parameter or reference across `forced_align`, `merge_tokens` and `Wav2Vec2FABundle`, plus the architecture. That is strong evidence, not a quotation — worth stating precisely since the whole design hangs on it.
11. **Exact frame hop/stride** is not stated on the torchaudio pages. Derive it at runtime from `waveform.size(1) / num_frames` rather than assuming the usual 20 ms.
12. **BFA's pretrained CUPE weights carry no explicitly stated licence** on the model repo — the GPLv3 covers the code. Confirm before relying on the licence advantage, since an unstated weights licence is precisely the trap MMS sets.
13. **BFA's language count is inconsistent between sources** — the paper describes three configurations (BFAen, BFAeu at 8 languages, BFAworld at 35) while the README's preset table lists 80+. The nine hard languages are verified present in the README table; the discrepancy itself is unresolved and matters for anything outside that nine.
14. **BFA's published speed figure is the authors' own**, on unstated CPU hardware, and its accuracy was evaluated on English only. Both need reproducing on real SSi clips before the sweep economics can be trusted.

---

## 7. Recommendation

**Build on torchaudio's CTC forced alignment with the MMS_FA bundle — and pilot BFA against it in the same week, because BFA wins on every axis except the one that decides it.**

Take the second half first, because it is the live tension. BFA is lighter (50 MB vs 1.18 GB), faster by a published margin nothing else in this sweep can match (RTF 0.05–0.1×, ~10 minutes of CPU for a 10k-clip sweep), better licensed for internal use (GPLv3 code vs CC-BY-NC weights), architecturally the *cleanest* possible answer to the guessing worry since a contextless phoneme encoder cannot use sentence context at all, and it ships `coverage_analysis` — a purpose-built truncation detector better than any posterior threshold. It covers all nine hard languages. **It loses on one fact: Chinese, Japanese, Korean, Thai and Vietnamese are explicitly untrained and unsupported.** `jpn` is an active course build. A QA gate that cannot see five live languages is not the backbone; it is a very good accelerator for the other thirty-nine. Add that it was published in September 2025 and evaluated on English only, and it is not something to bet a factory on this month — but it is absolutely something to measure, because if the speed holds the running cost of the gate drops by an order of magnitude.

So the backbone:

**torchaudio's CTC forced alignment with the MMS_FA bundle — most likely via the `ctc-forced-aligner` wrapper, with the raw `forced_align` primitive underneath when the wrapper gets in the way.** It is the only candidate that answers the closed question with a real acoustic posterior *and* covers the whole SSi estate — all 44 languages including Welsh, Basque, Armenian, Nepali, Kannada, Telugu, Marathi, Gujarati and Panjabi — from **one** ~1.2 GB model with no per-language acoustic model or pronunciation dictionary to source, version or maintain, because the token set is romanised Latin and uroman handles every script heuristically. It is pip-installable with no conda, runs fully locally with no metered API, emits both the per-word posterior SSi needs for mispronunciation and truncation detection and the word start/end timestamps SSi needs for VAD metrics, and it has documented, graceful behaviour on the exact pathologies in scope — a truncated render mangles the alignment and collapses the score tail, silence floors every word score, and a clip too short for its EXPECTED TEXT raises a catchable exception that is itself a verdict. WhisperX is the same aligner wrapped in an ASR you do not want, reachable only through an undocumented private path, with a 31-of-44 ceiling; MFA is more precise at boundaries and better licensed, and covers more than I first credited it with (~25 of 44, including Basque and Armenian), but it still misses seven of the nine hard languages and the whole Indic tail, exposes no per-word confidence (`WordInterval.confidence` returns `None`), and drags in conda, Kaldi and PostgreSQL; NeMo NFA is disqualified outright because it emits no confidence at all and silently stretches missing words. Keep **`ctc-segmentation` paired with an MMS checkpoint** as the live runner-up — same acoustic-posterior scoring, same coverage, model-agnostic so it does not ride on torchaudio's maintenance status, and it raises `"Audio is shorter than text!"` on exactly the truncation case in scope. **The honest trade-off is the licence: MMS_FA weights are CC-BY-NC 4.0, stated on the torchaudio page itself, so this is technically the right answer whose commercial-use question is genuinely open — resolve it with Meta or accept it as internal-only tooling that ships nothing, but do not discover it after building the gate.** Second honest caveat: no published CPU speed figure exists for any candidate, so the 10k-clip sweep must be sized by measurement, not by this document; and budget real pipeline work for uroman numeral handling plus word segmentation for `zho`, `jpn` and `tha`.

---

### Sources

- [CTC forced alignment API tutorial — torchaudio](https://docs.pytorch.org/audio/main/tutorials/ctc_forced_alignment_api_tutorial.html)
- [torchaudio.functional.forced_align](https://docs.pytorch.org/audio/stable/generated/torchaudio.functional.forced_align.html)
- [torchaudio.pipelines.MMS_FA](https://docs.pytorch.org/audio/stable/generated/torchaudio.pipelines.MMS_FA.html)
- [torchaudio.pipelines.Wav2Vec2FABundle](https://docs.pytorch.org/audio/stable/generated/torchaudio.pipelines.Wav2Vec2FABundle.html)
- [Forced alignment for multilingual data — torchaudio](https://docs.pytorch.org/audio/stable/tutorials/forced_alignment_for_multilingual_data_tutorial.html)
- [Update on TorchAudio's future — pytorch/audio#3902](https://github.com/pytorch/audio/issues/3902)
- [MMS data_prep README — fairseq](https://github.com/facebookresearch/fairseq/blob/main/examples/mms/data_prep/README.md)
- [MMS language coverage list](https://dl.fbaipublicfiles.com/mms/misc/language_coverage_mms.html)
- [uroman — isi-nlp](https://github.com/isi-nlp/uroman)
- [MahmoudAshraf/mms-300m-1130-forced-aligner](https://huggingface.co/MahmoudAshraf/mms-300m-1130-forced-aligner) / [ctc-forced-aligner GitHub](https://github.com/MahmoudAshraf97/ctc-forced-aligner) / [PyPI](https://pypi.org/project/ctc-forced-aligner/)
- [mms-300m-1130-forced-aligner ONNX](https://huggingface.co/romara-labs/mms-300m-1130-forced-aligner-ONNX)
- [whisperx/alignment.py](https://github.com/m-bain/whisperX/blob/main/whisperx/alignment.py)
- [MFA installation](https://montreal-forced-aligner.readthedocs.io/en/latest/installation.html)
- [MFA acoustic model index](https://mfa-models.readthedocs.io/en/latest/acoustic/index.html)
- [MFA German acoustic model v3.0.0 (licence)](https://mfa-models.readthedocs.io/en/latest/acoustic/German/German%20MFA%20acoustic%20model%20v3_0_0.html)
- [Analysing alignment quality — MFA](https://montreal-forced-aligner.readthedocs.io/en/v3.1.1/user_guide/implementations/alignment_analysis.html)
- [MFA and the state of speech-to-text alignment in 2026 — arXiv 2606.18466](https://arxiv.org/html/2606.18466v1)
- [Multilingual Word-Level Forced Alignment (MWA) — arXiv 2606.10675](https://arxiv.org/abs/2606.10675)
- [LLM-ForcedAligner — arXiv 2601.18220](https://arxiv.org/html/2601.18220v1)
- [NeMo Forced Aligner docs](https://docs.nvidia.com/nemo-framework/user-guide/latest/nemotoolkit/tools/nemo_forced_aligner.html)
- [MFA acoustic model index (source)](https://raw.githubusercontent.com/MontrealCorpusTools/mfa-models/main/docs/source/acoustic/index.rst) / [dictionary index (source)](https://raw.githubusercontent.com/MontrealCorpusTools/mfa-models/main/docs/source/dictionary/index.rst)
- [MFA db.py — phone_goodness, WordInterval.confidence](https://raw.githubusercontent.com/MontrealCorpusTools/Montreal-Forced-Aligner/main/montreal_forced_aligner/db.py)
- [pacscilab/VoxCommunis](https://huggingface.co/datasets/pacscilab/VoxCommunis)
- [facebook/mms-1b-all — ISO language list](https://huggingface.co/facebook/mms-1b-all)
- [pytorch/audio#3747 — forced_align error message variable swap](https://github.com/pytorch/audio/issues/3747)
- [whisperX#1308 — forced alignment with a fixed transcript](https://github.com/m-bain/whisperX/issues/1308)
- [whisper-diarization#190 — get_spans AssertionError on mismatch](https://github.com/MahmoudAshraf97/whisper-diarization/issues/190)
- [lumaku/ctc-segmentation](https://github.com/lumaku/ctc-segmentation)
- [BFA: Real-time Multilingual Text-to-speech Forced Alignment — arXiv 2509.23147](https://arxiv.org/abs/2509.23147) / [tabahi/bournemouth-forced-aligner](https://github.com/tabahi/bournemouth-forced-aligner) / [PyPI](https://pypi.org/project/bournemouth-forced-aligner/)
- [openai/whisper#1606](https://github.com/openai/whisper/discussions/1606), [#679](https://github.com/openai/whisper/discussions/679) — Whisper hallucinating text over silence
