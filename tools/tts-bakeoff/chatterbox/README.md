# Chatterbox local trial — repeatable scripts

Everything needed to re-run the 2026-08-26 Chatterbox determinism trial on a CPU-only box.
Findings: `docs/tts-bakeoff/chatterbox-local-trial-2026-08-26.md`.

## Environment (not committed — rebuild it)

The venv lives outside the repo at `/home/tomcassidy/.chatterbox-trial` (4.7 GB with the model
cache). `/tmp` is RAM-backed on watson-1 — never put the venv or the HF cache there.

```bash
D=/home/tomcassidy/.chatterbox-trial
mkdir -p $D && cd $D
curl -sSL https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python3 -m venv venv            # warns about ensurepip; harmless, the skeleton is created
./venv/bin/python get-pip.py

# CPU-only torch. cp314 wheels exist from torch 2.9.0 onward.
./venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu \
  "torch==2.10.0+cpu" "torchaudio==2.10.0+cpu"

# Every chatterbox dep EXCEPT spacy-pkuseg, which has no cp314 wheel and cannot
# build here (no Python.h, no root). It is a Chinese segmenter; English never uses it.
./venv/bin/pip install --extra-index-url https://download.pytorch.org/whl/cpu \
  "numpy>=2.0.0" "librosa==0.11.0" s3tokenizer "transformers==5.2.0" \
  "diffusers==0.29.0" "resemble-perth>=1.0.0" "conformer==0.3.2" \
  "safetensors==0.5.3" "pykakasi==2.3.0" pyloudnorm omegaconf

./venv/bin/pip install --no-deps chatterbox-tts

# Loud stub so a Chinese render CRASHES rather than silently misbehaving.
SP=$(./venv/bin/python -c "import site;print(site.getsitepackages()[0])")
mkdir -p "$SP/spacy_pkuseg"
cat > "$SP/spacy_pkuseg/__init__.py" <<'EOF'
class pkuseg:
    def __init__(self, *a, **k):
        raise RuntimeError("spacy_pkuseg is STUBBED: Chinese path unavailable")
def train(*a, **k):
    raise RuntimeError("spacy_pkuseg is STUBBED: Chinese path unavailable")
EOF
```

## Run

```bash
cd /home/tomcassidy/.chatterbox-trial
export HF_HOME=/home/tomcassidy/.chatterbox-trial/hf OMP_NUM_THREADS=8
R=/home/tomcassidy/SSi/ssi-dashboard-v7-clean/tools/tts-bakeoff/chatterbox

./venv/bin/python $R/smoke.py                                  # one sentence, RTF check
./venv/bin/python $R/bench.py $R/utterances-eng.json ./out --repeats 20
./venv/bin/python $R/temp_probe.py ./out                       # seed vs temperature
node $R/compare.cjs ./out/manifest.json ./out --out ./out/compare-report.json
```

## Files

| File | Does |
|---|---|
| `smoke.py` | Loads the model, renders one sentence, reports real-time factor. |
| `bench.py` | Experiments A (20 repeats, one seed), B (seed-vary), C (20-utterance corpus x2). Writes `manifest.json` with a sha256 per render. |
| `temp_probe.py` | Experiment D — separates "deterministic because seeded" from "deterministic because temperature is low". |
| `compare.cjs` | ffmpeg/node signal comparison. No numpy on this box, so difference RMS is computed with `amix weights "1 -1"` (true sample-wise subtraction, not an average). |
| `utterances-eng.json` | The 20 English test sentences, pulled live from `course_seeds` for `eng_for_mar`. |

## Two gotchas that cost time

- `torchaudio.save` on torch 2.10 needs `torchcodec` (no cp314 wheel). All scripts write WAVs with
  `soundfile` instead.
- Chatterbox has **no seed parameter**. The seed must be set externally with `torch.manual_seed()`
  immediately before each `generate()`. Resemble's own HF Space does the same thing.
