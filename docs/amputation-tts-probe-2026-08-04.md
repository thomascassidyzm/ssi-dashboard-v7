# Is the SSi mastering chain amputating speech? — objective test

**2026-08-04 · verdict: AMPUTATION CONFIRMED.**
Read-only probe. No S3 uploads, no `course_audio` writes, no audio pass queued, nothing committed
beyond this document and the gitignored scripts. Actual TTS spend: **57 xAI calls, 972 characters,
~$0.03–0.05** (see §6).

---

## 1. What was tested

104 shipped clips from `deu_for_eng` + `fra_for_eng` had already been measured for *trailing room*
(ms from the last speech frame to end of file). The distribution has a hard spike at exactly
**100 ms — 21 of 104 clips**, which is exactly `apad=pad_dur=0.1` in
`services/audio-processor.cjs:674`, inside `repairTailDefect`.

Hypothesis: those 21 clips were trimmed by `repairTailDefect` *into the speech* and then re-padded
back out to 100 ms, so their speech is truncated relative to what TTS originally produced.

- **Signature group** = the 21 clips with `tailMs === 100`.
- **Control group** = 21 clips with `tailMs` outside [95, 105], matched 1:1 on
  (courseCode, role, voiceId) and then nearest `totalMs`. All 21 matched; no stratum ran dry.

Every clip in this set is xAI (`eve` / `ara` / `leo`), language resolved from the `course_audio` row
via `toBcp47`, matching how `phase8-audio-v13.cjs:2050` builds the config. `voice_config` for both
courses confirms `provider: "xai"` on every role. **Zero clips had to be skipped for unresolvable
voice**, and zero texts carried gender markers, so `textForTTS === text` throughout.

Two independent tests were run. The first is the one that was specified; it turned out to be
confounded, so a second, unconfounded test was added.

---

## 2. Test A — speech-span difference-in-differences (specified, but CONFOUNDED)

Each text re-rendered **once** through the same xAI voice + language, then through the same loudness
stage the shipped clip got (`PRE_COMPRESS` → gain → `TRUE_PEAK_LIMIT` → `ANTI_CLICK_FADE`, −16 LUFS)
but **not** through `repairTailDefect`. Speech span = first→last speech frame, 10 ms frame RMS,
−35 dB relative to that clip's own peak. Metric = `shipped_span / fresh_span`.

| group | n | median ratio |
|---|---|---|
| signature | 20 | **0.8634** |
| control | 19 | **0.9515** |

Median difference **−0.0881**. Mann-Whitney U = 102, z = −2.460, **p = 0.0139** (two-sided, tie-
corrected, normal approximation with continuity correction — implemented in
`scripts/amputation-tts-probe.cjs`, spot-checked against known cases).

**Why this result cannot be trusted on its own.** I ran the production detector over every fresh
render: **16 of 20 signature-group fresh renders carry their own tail burst, vs 12 of 19 controls.**
A tail burst is counted as speech by a frame-RMS span measure, so `fresh_span` is *inflated* for
exactly the group under test — which depresses the ratio with no amputation required. Signature
texts are by construction the ones whose original render had a tail defect, and defects are
text/voice correlated, so this is not a hypothetical. The five worst signature ratios are all clips
whose fresh render has a `rise` or `resurgence` defect.

Restricting to pairs where the fresh render is clean leaves n=4 vs 7 — diff −0.064, p = 0.45.
**Underpowered, and that subset settles nothing.** Test A is suggestive at best.

---

## 3. Test B — ASR word retention (unconfounded, decisive)

A tail burst is not a word, so it cannot inflate a transcript; and the expected text is ground
truth, so no fresh render is needed for the primary comparison. If `repairTailDefect` ate speech,
the shipped clip is missing its **final words** — which is what this measures directly.

Whisper (`ggml-small`, steered to the clip's language) over **all 104 shipped clips**, free.

**Shipped clips — fraction retaining the expected final word:**

| subset | signature | other | p |
|---|---|---|---|
| all texts | n=21, **0.524** | n=83, **0.928** | **0.00001** |
| texts ≥2 words | n=17, **0.588** | n=66, **0.955** | **0.00004** |
| texts ≥3 words | n=14, **0.500** | n=52, **0.962** | **0.00001** |

Last-2-words retention: 0.571 vs 0.916 (p = 0.0001). All-words retention: 0.764 vs 0.916 (p = 0.0034).

The effect **strengthens** as texts get longer, which is the opposite of what ASR noise would do —
single-word clips are where whisper mishears (`urlaub`→"Uralab", `ins`→"Inz", `habt`→"Hapt"), and
excluding them makes the gap wider, not narrower.

**The text/voice-difficulty explanation is ruled out.** Fresh renders of the *same* texts, never
touched by the repair, retain the final word at **0.950 (signature) vs 1.000 (other)**. The texts are
not intrinsically hard. Difference-in-differences on final-word retention (shipped − fresh, same
clip): signature −0.400 vs other −0.105, z = −2.061, **p = 0.039**.

**The qualitative evidence is unambiguous.** Seven signature clips with ≥3-word texts lost trailing
words outright:

| built | lang | span ratio | expected → shipped transcript |
|---|---|---|---|
| 2026-02-24 | de | 0.372 | "Ich will heute nicht üben" → "Ich will heute…" |
| 2026-07-11 | de | 0.512 | "es in den Garten stellen" → "Es in den Gaben." |
| 2026-07-15 | de | 0.571 | "in Italien während des Krieges" → "In Italien während" |
| 2026-01-17 | de | 0.682 | "zu viel Zeit zum Antworten" → "Zu viel Zeit zum anzeigen." |
| 2026-07-11 | en | 0.673 | "I believe they said that is important" → "…that is impossible." |
| 2026-08-03 | fr | 0.781 | "le travail change et je suis enthousiaste pour ça" → "…et je suis enthousiaste." |
| 2026-08-03 | fr | 0.798 | "j'ai besoin de m'allonger dans le jardin aujourd'hui" → "…dans le jardin au jour." |

Two whole words gone from "in Italien während **des Krieges**". Two from "Ich will heute **nicht
üben**" — a clip that now says the *opposite* of the phrase it is teaching. `aujourd'hui` cut
mid-word to "au jour". These are 7 of the 14 multi-word signature clips: **half the group.**

---

## 4. Verdict

**Amputation is real.** `repairTailDefect` is trimming into speech and re-padding to exactly 100 ms,
and the resulting clips shipped. The 100 ms trailing-room spike is a reliable fingerprint for it:
half of the multi-word clips carrying that fingerprint are demonstrably missing trailing words,
against a 4% rate in the rest of the sample.

Test A (the specified speech-span DiD) is *directionally consistent* but confounded and should not
be cited as the evidence. Test B is the finding.

## 4a. What this does and does not say about the new guard

The `AMPUTATION_MIN_KEEP_FRACTION` / silence guard landed today at commit `f8c380bd`
(2026-08-04 11:50 Z). The signature clips span 2026-01-17 → 2026-08-04, and **all seven confirmed
truncations predate that commit.** Only 5 signature clips postdate it, and the two that lost a final
word are single-word ASR misreads, not truncations.

So: no evidence the guard is failing — but **n=5 post-guard is far too small to say it is working
either.** Worth noting on the mechanism, though: the guard catches trims that keep <50% of the clip
or leave silence. A trim that eats the last word of a five-word phrase keeps well over 50% and is
not silent, so it would pass both checks. The whisper-based `verifyTrimKeepsText` is the check that
would catch it, and it returns `null` → proceed when whisper is absent. That combination is
untested by this probe and deserves its own test.

---

## 5. How this method could be wrong — be sceptical of these

Blunt list, worst first.

1. **Whisper is the instrument, and whisper is imperfect.** Every retention number inherits its
   error rate. Mitigations: it is applied identically to both groups; the fresh-render control
   measures its floor on the same texts (0.95–1.00); and the effect grows on longer texts where
   whisper is more reliable. But a systematic whisper bias correlated with tail-clicky renders
   would still fool it. I do not think one exists; I cannot exclude it.
2. **Group membership is inferred, not observed.** I never confirmed from logs that these 21 clips
   actually went through `repairTailDefect`. `tailMs === 100` is a strong fingerprint — 100 ms is
   the literal `apad` value and the bin is anomalous against clean neighbours — but it is
   circumstantial. The definitive check would be generation logs per clip; I did not have them.
3. **Test A is confounded and I am reporting it anyway.** Stated plainly in §2 rather than dropped,
   because it was the specified test. Do not quote its p = 0.014 as independent support; it is
   substantially the same signal contaminated by tail bursts in the fresh renders.
4. **Small n on the signature side.** 21 clips, 14 with ≥3 words. The p-values are small, but they
   rest on ~14 informative observations from two courses. Do not extrapolate the exact 50% rate to
   the estate.
5. **The normalisation chain was re-implemented, not called.** `audioProcessor.normalizeAudio` pipes
   ffmpeg into the **`lame` binary, which is not installed on this host** — it fails with ENOENT and
   orphans the ffmpeg child (I had 40 stuck processes before catching it). I replicated the exact
   filter chain, gain formula and target through ffmpeg's built-in `libmp3lame` instead
   (`scripts/amputation-tts-probe.cjs`, constants copied verbatim from `audio-processor.cjs:283-294`).
   This affects Test A only; Test B's primary comparison never touches it. **Separately: this is a
   real operational finding — on this box the mastering chain cannot encode at all.**
6. **The phonology gate ran during re-rendering.** `generateWithRetry` retries up to 3× on a
   whisper language mismatch, which is a quality retry, not purely a transient one. It fired on 3
   German single-word texts and they were dropped rather than substituted. It applies identically to
   both groups so it does not bias the comparison, but it is a deviation from strict render-once.
7. **`created_at` is a proxy for "when the mastering code ran".** Fine for the pre/post-guard split
   at day resolution; not something to lean on harder than §4a does.

---

## 6. Spend, skips, and artefacts

**Spend: 57 xAI TTS calls, 972 characters billed.**
39 successful renders (888 chars) + 18 calls burned on phonology-gate retries (3 texts × 3 attempts
× 2 runs, 84 chars). The second run re-attempted only the 3 failures — successful renders were
cached on disk and never re-billed.

**The repo documents no xAI per-character rate anywhere** (confirmed; also noted independently in
`docs/deu-audio-repair-plan-2026-08-04.md` §5). Anchoring on the only empirical figure available —
`docs/audio-census-2026-07-11.md`, ~7,000 clips ≈ $6 — 57 calls of this length comes to roughly
**$0.03–$0.05**. That is an estimate against an undocumented rate, not a billed figure. Approved cap
was $5; actual spend is under 1% of it.

**Skipped: 3 clips of 42** (1 signature, 2 control), all rejected by the xAI phonology gate after 3
attempts — `wirst`, `habt`, `magst`, all German single words whisper heard as English. No
substitute voice was used for any clip. Test B covered all 104 shipped clips with no skips.

**Artefacts** (all gitignored or in /tmp):
- `scripts/amputation-tts-probe.cjs` — Test A: selection, rendering, span measurement, Mann-Whitney
- `scripts/amputation-probe-analyse.cjs` — the confound check (tail-defect rate on fresh renders)
- `scripts/amputation-probe-asr.cjs` — Test B: whisper retention over all 104 shipped clips
- `scripts/amputation-probe-results.json`, `-analysis.json`, `-asr.json` — full per-clip data
- `/tmp/amputation-probe/` — fresh renders, raw and normalised

---

## 7. Suggested next steps (not taken — out of scope for a read-only probe)

1. Sweep the whole estate for `tailMs === 100`. This probe looked at 104 clips from 2 courses; the
   fingerprint is cheap to measure and the ASR retention test costs nothing but CPU.
2. Test whether the new guard actually blocks a partial-word trim — construct the case directly
   rather than waiting for 5 clips of natural evidence. The ≥50%-kept + not-silent pair does not
   obviously catch "ate the last word of five".
3. Decide what `verifyTrimKeepsText` returning `null` should mean. Right now absent whisper = proceed;
   given the above, absent whisper = hold is the safer default at the mastering chokepoint.
4. Install `lame` on this host, or make `ffmpegFilterToLameMp3` fail loudly and kill its ffmpeg child
   instead of leaving it blocked on a full pipe.
