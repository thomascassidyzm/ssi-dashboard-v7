# Experiment 0 phase C — the clone verdict, German and French

2026-08-07. Voice `gfzdpspr5fdp` (xAI clone) tested against the incumbent course
voices on 80 real course sentences. Gate stack version `2026-08-06`.

**80 of 80 clips rendered. Zero errors. $0.047 spent against a $5 ceiling.**

---

## The verdict

| Language | Incumbents | Verdict | Margin |
|---|---|---|---|
| **German** | `ara`, `leo` | **HOLDS** | 0.0% adverse |
| **French** | `eve` | **HOLDS** | 0.0% adverse |

Per-language, never averaged — the two languages were scored separately and both
pass on their own evidence.

The rule was written into the scoring script *before* any number was seen: the
clone HOLDS iff its paired failures do not exceed the incumbent's by more than 10%
of judged pairs. German came in at 1 adverse vs 1 favourable over 53 pairs. French
at 1 adverse vs 1 favourable over 71 pairs. Both are dead level on the deciding
gates — and, as below, well ahead on the rest.

## The headline the early signal promised, confirmed at full n

**On German the clone does not merely match the incumbents — it out-gates them
almost 3 to 1.**

| | clone admitted | incumbent admitted |
|---|---|---|
| **German** (40 clips) | **37** | **14** |
| **French** (40 clips) | **37** | **32** |

Twenty-six of forty German incumbent clips are quarantined by the same stack that
admits thirty-seven of forty clone clips on the identical sentences.

Where that gap comes from, paired, gate by gate:

| Gate | deu clone-only fail | deu incumbent-only fail | fra clone-only | fra incumbent-only |
|---|---|---|---|---|
| speech-span | 0 | 0 | 0 | 0 |
| loudness | 0 | **7** | 1 | **6** |
| tail-shape | 0 | **20** | 0 | 0 |
| syllable-rate | — not measurable either side — | | | |
| phonology | 1 | 1 | 1 | 1 |
| words | 0 | 0 | 0 | 0 |

**German's incumbents are losing on tail-shape at 20 of 40 — half the sample — and
the clone loses it zero times.** That is `ara` and `leo` clips ending in a way the
stack reads as cut rather than stopped. It is the single largest effect in the
experiment and it is entirely on the incumbent side.

## The four numbers

| | German | French |
|---|---|---|
| phonology pass rate — clone | 92.5% | 95.0% |
| phonology pass rate — incumbent | 92.5% | 95.0% |
| speaking rate (syll/sec) | 4.43 | 5.75 |
| mean speech duration | 2,125 ms | 1,857 ms |
| duration ratio vs incumbent | 1.116 | 0.982 |

The clone speaks German about 12% longer than `ara`/`leo` on the same text, and
French essentially identically to `eve` (−1.8%). The German stretch is worth a
listen before it is called good or bad — it is a pacing difference, not a gate
failure, and no gate objected to it.

## Every clone-only failure, in full

Three clips across both languages. That is the complete adverse evidence.

| Language | Axis | Text | Refused by |
|---|---|---|---|
| deu | short | `allein` | phonology |
| fra | short | `fatigués` | phonology |
| fra | short | `mais` | loudness |

All three are single-word or two-syllable fragments. Two are whisper language-ID
calls on clips of under a second — the exact condition where that gate is known to
be unreliable (it has previously called a correct, shipped French `je` clip
Turkish). The third, `mais`, is a loudness miss on a one-syllable clip.

## On whisper — stated explicitly, per Tom's ruling

**Whisper is dropped from production verification.** Two of the six gates here —
`phonology` and `words` — are whisper-based, and the formal decision rule is
computed from exactly those two. So this experiment does use whisper, and it does
so deliberately, on this reasoning:

- It is a **paired** comparison on **identical text**. Whisper's errors fall on both
  sides equally, so they cancel; only a clone failure where the incumbent passes is
  counted against the clone. That is what makes an unreliable instrument usable as a
  *relative* measure even though it is not trustworthy as an absolute one.
- The absolute pass rates above (92.5% / 95.0%) are therefore **not** claims about
  the voice. They are identical for clone and incumbent because the same gate is
  making the same kind of mistake on both.
- The result does not rest on whisper alone. The three signal-based gates —
  speech-span, loudness, tail-shape, no whisper anywhere in them — favour the clone
  by 33 to 1 across both languages. Delete the whisper gates entirely and the
  verdict gets *stronger*, not weaker.

This is an A/B bench experiment, not a production verification path. Nothing here
argues for putting whisper back on the production path.

## Gaps and limits — what this does not tell you

- **Syllable-rate is unmeasured on every clip, both sides** (0 judged pairs). The
  clone has no calibrated rate, so the gate could not run. It is reported as
  unmeasured, not as a pass — no evidence was invented in either direction.
- **`words` was judged on only 13 of 40 German pairs** and 31 of 40 French. On the
  rest the gate did not return a comparable judgement, so those pairs are excluded
  rather than counted as passes.
- **This is a gate verdict, not a taste verdict.** The gates measure whether a clip
  is intact, in-band, in the right language and carrying the right words. They say
  nothing about whether the clone *sounds right* for the course. The 80 clone clips
  and their 80 incumbent counterparts are on disk at
  `scripts/phasec-clips/` in the `voicelab-wt` worktree, paired and named, for a
  listening pass. **That listening call is Tom's, and it has not been made.**
- **No course audio was touched.** Nothing was written to `course_audio`, no slot
  bound, nothing relinked, nothing deleted. Clone clips are files on this box; the
  incumbent halves were fetched read-only from S3.

## Method, for the record

80 sentences drawn from real `deu_for_eng` and `fra_for_eng` course audio,
stratified 13 short / 13 long / 14 phonologically awkward per language — both
languages got the full 13/13/14, no axis under-covered. Selected from incumbent
*clips* rather than from seeds, so every sentence already had an `ara`, `leo` or
`eve` take and half of every A/B was free. Deterministic seed 20260807; the 80 are
reproducible from `voicelab-phasec-sentences-2026-08-07.json` alone.

Each clone clip took the real course path — `tts-service` generate → phase8
`masterAudio` → the six-gate stack on the **mastered** bytes. Gating raw TTS would
fail every clip on loudness and say nothing about the voice.

3,099 characters total, $0.047 at xAI rates — three orders of magnitude under the
$5 escalation ceiling, which was never approached.

## Artifacts

- `docs/audio/voicelab-phasec-sentences-2026-08-07.json` — the frozen 80
- `docs/audio/voicelab-phasec-verdict-2026-08-07.json` — every clip, every gate, full detail
- `docs/audio/voicelab-phasec-capability-2026-08-07.json` — the aggregated verdict
- `scripts/phasec-clips/` — 160 mp3s, clone and incumbent, paired (gitignored, on this box)
