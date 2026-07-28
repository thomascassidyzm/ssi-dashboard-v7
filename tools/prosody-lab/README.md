# prosody-lab — TTS-as-lab prosody invariance study (PoC)

Founder-commissioned research PoC (2026-07-28). The audio estate already
contains the same phrase rendered in multiple voices (male/female target
pairs, cross-provider renders, human Welsh vs TTS). That makes TTS a
controlled experiment bed: across voices saying the SAME phrase, what stays
the same (candidate **understandability core**) and what changes (voice
identity / naturalness)?

**Doctrine:** we optimise for UNDERSTANDABILITY, not naturalness. The model
voice must be maximally copyable by a beginner. Features are contour-shaped
and deliberately blind to timbre — see header of `prosody.py` for methods.

Findings + design doc: `docs/course-optimization/prosody-lab-poc.md`.
Parent research direction: `ssi-learning-app/docs/vad-feedback-design.md`.

## Pipeline (resume-safe at every step; all concurrency capped at 4)

```bash
# 1. sample pairs from course_audio + download clips from S3
node tools/prosody-lab/sample-pairs.cjs            # -> temp/prosody-lab/pairs.json + clips/

# 2-4. extract features, compare pairs, aggregate
python3 tools/prosody-lab/prosody.py extract       # -> temp/prosody-lab/features/
python3 tools/prosody-lab/prosody.py compare       # -> temp/prosody-lab/results.jsonl
python3 tools/prosody-lab/prosody.py report        # -> temp/prosody-lab/report.json

# or all four, detached:
nohup bash tools/prosody-lab/run-study.sh > temp/prosody-lab/run.log 2>&1 &
```

`report.json` includes per-category distance distributions, per-dimension
voice-sensitivity scores, and extreme example pairs **with local mp3 paths**
so the verdict can be reached by ear.

Data lives in `temp/prosody-lab/` (gitignored). Requires `.env` (S3),
`.env.psql` (DB), ffmpeg, python3 with numpy/scipy/soundfile.
