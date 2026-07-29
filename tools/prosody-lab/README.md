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
voice-sensitivity scores, a `combined_score` block (the phrase-identity score
over the dims that survived the voice test, with AUCs), and extreme example
pairs **with local mp3 paths** so the verdict can be reached by ear.

Re-running is safe at every step: `extract` skips cached features, `compare`
skips pair_ids already in `results.jsonl`, downloads skip clips on disk. To
force a re-compare after changing `compare_pair`, move `results.jsonl` aside
first — resume is keyed on pair_id, not on the field set.

**Results: see `docs/course-optimization/prosody-lab-poc.md` (2026-07-28 run).**
Headline: energy-contour DTW + duration + syllable count track phrase identity
through a voice change (combined AUC 0.813); raw F0, F0 range, register gap and
voiced fraction are voice-dominated (AUC < 0.5) and must not be scored.

Data lives in `temp/prosody-lab/` (gitignored). Requires `.env` (S3),
`.env.psql` (DB), ffmpeg, python3 with numpy/scipy/soundfile.

## Credential-free tools (2026-07-29 breadth round)

Two tools added for the founder's language-breadth + clean-xAI rulings that
run WITHOUT `.env.psql`/S3/numpy (see docs/DECISIONS.md 2026-07-29):

- `extend-lab-breadth.mjs` — extends the baked lab data with new-language
  pairs via Supabase REST (anon key) + the public audio proxy + the JS
  extractor (`src/views/admin/vadProsody.js`, parity-verified mirror of
  prosody.py). Study anchors stay fixed; new pairs score on the same scale.
- `remaster-vad-lab-clean.cjs` — re-renders the lab's xAI/clone clip sides
  and masters them WITHOUT the compressor stage (the hiss source), into
  `public/vad-lab-clean/` only. Needs `XAI_API_KEY` + ffmpeg + lame — run it
  where the vault is reachable (Camberley), dry-run by default.
