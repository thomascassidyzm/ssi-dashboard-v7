# Chatterbox local trial — watson-1, 2026-08-26

Deliverable 4 of 4, TTS bake-off phase 1. Question asked: **can Resemble Chatterbox run on this
box, and if it does, is it genuinely deterministic under a fixed seed and low temperature?**

**It runs, and it is byte-for-byte deterministic.** That is the headline and it is measured, not
claimed. The rest of this document is the evidence, the two things that nearly stopped it, and one
finding that matters more than the determinism result.

---

## 0. The finding that outranks everything else: Chatterbox has no Welsh

Gate zero for this project is Welsh. Chatterbox does not support it.

Verified against the installed package source, not a web page — `SUPPORTED_LANGUAGES` in
`chatterbox/mtl_tts.py`, read out of the venv on this box:

```
23 languages: ar da de el en es fi fr he hi it ja ko ms nl no pl pt ru sv sw tr zh
'cy' in SUPPORTED_LANGUAGES -> False
```

Chatterbox-Turbo and Chatterbox-Nano are **English-only** (350M and 110M params respectively);
Multilingual V3 is the 23-language 500M model. Welsh is in none of them.
Sources: [model card](https://huggingface.co/ResembleAI/chatterbox),
[turbo card](https://huggingface.co/ResembleAI/chatterbox-turbo), and the installed source.

So under gate zero as written, **Chatterbox is dead for canonical Welsh course work.** It is not
dead for the 29-course xAI migration scope, whose target languages are eng, deu, fra, ita, jpn,
kor, spa, por, zho, fin, pdc — of those, Chatterbox covers all but **pdc** (Pennsylvania Dutch).
That is the honest shape: a strong candidate for the migration, not a candidate for the whole
estate. Someone other than me needs to decide whether that split is acceptable, because it changes
Chatterbox from "possible single supplier" to "possible partial supplier", and a partial supplier
means running two engines.

---

## 1. Hardware assessment — done first, before any install

Re-confirmed on the box rather than taken from the brief:

| Fact | Measured |
|---|---|
| CPU | 12 vCPU AMD EPYC-Genoa (KVM guest), AVX-512 incl. `avx512_bf16`, `avx512_vnni` |
| RAM | 22 GB total |
| Disk | 175 GB free on `/` at start |
| Python | 3.14.4, no pip, no ensurepip, no numpy, no torch |
| ffmpeg / node | ffmpeg 8.0.1, node v24.18.0 |

### VRAM, checked properly

Tom asked for this explicitly, so it was checked at the PCI level rather than inferred from the
absence of `nvidia-smi`:

```
00:01.0 VGA compatible controller: Red Hat, Inc. Virtio 1.0 GPU (rev 01)
    Memory at 80000000 (32-bit, prefetchable) [size=8M]
    Kernel driver in use: virtio-pci
```

- The only display device is a **paravirtual virtio-gpu with an 8 MB BAR**. That 8 MB is a
  framebuffer aperture, not usable compute memory.
- `/dev/nvidia*` — absent. `/dev/kfd` (AMD compute) — absent. `/dev/dri/renderD128` exists but is
  the virtio render node.
- No `nvidia-smi`, no `rocm-smi`, no `rocminfo`, no CUDA.

**Verdict: there is no GPU and there is no VRAM. Usable accelerator memory is zero, not "small".**
CPU inference was the only option and that is what was measured.

### What Chatterbox actually requires

From [`pyproject.toml`](https://github.com/resemble-ai/chatterbox) and the PyPI metadata for
`chatterbox-tts` 0.1.7:

- `requires-python >=3.10`
- `torch>=2.9.0` and `torchaudio>=2.9.0` **when `python_version >= "3.14"`** (it pins `==2.6.0`
  below 3.14) — so upstream has explicitly accounted for Python 3.14
- `transformers==5.2.0`, `diffusers==0.29.0`, `librosa==0.11.0`, `s3tokenizer`, `conformer==0.3.2`,
  `safetensors==0.5.3`, `pykakasi==2.3.0`, `gradio==6.8.0`, `spacy-pkuseg`, `pyloudnorm`, `omegaconf`
- CPU-only inference **is** supported (`device="cpu"`; the library also supports CUDA and MPS)
- No minimum VRAM is published on any Resemble page I fetched. Recorded as a gap.
- Model sizes: 500M (base / multilingual V3), 350M (Turbo), 110M (Nano). Resemble claim Nano runs
  "3x faster than realtime on 8 CPU cores" — their number, not verified here.

### The PyTorch-on-3.14 question, settled

The brief flagged that torch wheels historically lag new Python releases, and that if torch does
not publish for 3.14 that alone is the blocker. **It does publish.** Queried the PyPI JSON API
directly:

- torch: first cp314 wheels appear at **2.9.0**; `torch-2.10.0+cpu-cp314-cp314-manylinux_2_28_x86_64.whl`
  exists on the CPU index and is 189 MB
- torchaudio: cp314 from 2.9.0
- numpy: cp314 throughout the 2.3+ line

So Python 3.14 is **not** the blocker. That is worth stating crisply because it was the expected
one.

---

## 2. What I tried, in order

1. **Bootstrapped pip without root.** `python3 -m venv` at `/home/tomcassidy/.chatterbox-trial/venv`
   printed the usual "ensurepip is not available, apt install python3.14-venv" error — but it still
   creates the directory skeleton, so `get-pip.py` run against the venv's interpreter installed
   pip 26.2.1 into it cleanly. No sudo, nothing system-wide.
2. **Installed torch CPU-only** from `https://download.pytorch.org/whl/cpu` —
   `torch 2.10.0+cpu`, `torchaudio 2.10.0+cpu`. Confirmed `torch.cuda.is_available() == False`,
   12 threads.
3. **`pip install chatterbox-tts` — failed.** See the blocker below.
4. **Routed around the blocker**, installed the dependency set explicitly, then
   `pip install --no-deps chatterbox-tts`. `import chatterbox` succeeds.
5. **Smoke test** — model downloaded and one sentence rendered.
6. **Ran the determinism benchmark** (experiments A, B, C) and a follow-up seed-vs-temperature
   probe (experiment D).

Nothing was installed system-wide, no sudo was used, and nothing large went on `/tmp` — the venv,
the HF cache and all audio live under `/home/tomcassidy/.chatterbox-trial` (4.7 GB total). Disk
went 175 GB → 170 GB free.

### Blocker hit, and how it was cleared

`spacy-pkuseg` has **no cp314 wheel** (it stops at cp313), so pip tried to build it from source and
died on:

```
spacy_pkuseg/inference.cpp:42:10: fatal error: Python.h: No such file or directory
```

`/usr/include/python3.14/` does not exist — the Python **dev headers are not installed**, and
installing them needs `apt`, which needs root. That is a real, hard gap on this box.

It is also irrelevant to the question asked. `spacy-pkuseg` is a **Chinese word segmenter**;
the English path never touches it. I installed every other dependency normally, installed
chatterbox with `--no-deps`, and dropped in a deliberately loud stub at
`site-packages/spacy_pkuseg/__init__.py` that **raises** if anything ever tries to segment Chinese.
A silent wrong result is therefore impossible; a Chinese render on this box would crash rather than
mislead.

**Explicit gap: the Chinese path of Chatterbox is untested on this box and cannot be tested here
without root.** zho is one of the 29-course migration languages, so this needs testing somewhere
with dev headers before anyone trusts Chatterbox for Chinese.

A second, smaller one: `torchaudio.save` on torch 2.10 now requires `torchcodec`, which also has no
cp314 wheel. Worked around by writing WAVs with `soundfile` (already a Chatterbox dependency),
16-bit PCM. This affects file writing only, not inference.

---

## 3. Determinism, as measured

**Chatterbox exposes no seed of its own.** Verified by grepping the installed package: there is no
`seed` argument, no `set_seed`, and no `torch.manual_seed` anywhere in `chatterbox/`. The
`generate()` signature is:

```python
def generate(self, text, repetition_penalty=1.2, min_p=0.05, top_p=1.0,
             audio_prompt_path=None, exaggeration=0.5, cfg_weight=0.5, temperature=0.8)
```

So the seed must be imposed **externally** with `torch.manual_seed()` immediately before each
`generate()` call. That is not a workaround I invented: Resemble's own official Space
(`ResembleAI/Chatterbox-Multilingual-TTS`) does exactly this — its `app.py` has
`seed_num = gr.Number(value=0, label="Random seed (0 for random)")` and a `set_seed()` helper
calling `torch.manual_seed()`. My harness mirrors the reference implementation.

Test material: **20 real English sentences pulled live from the DB** — `course_seeds.target_text`
for `eng_for_mar` (English-as-target, live, 668 seeds), deduplicated and stratified by length from
1 to 11 words. The sibling worker's `tools/tts-bakeoff/data/utterances-eng.json` did not exist when
I needed it, so this is my own set; it is committed at
`tools/tts-bakeoff/chatterbox/utterances-eng.json` so the run is repeatable and comparable.

Engine: `chatterbox-tts` 0.1.7, `ChatterboxTTS` (500M base), `device="cpu"`, torch 2.10.0+cpu,
temperature 0.1, base seed 1234, 24 kHz output.

### A — 20 repeats, one sentence, same seed

Sentence: *"But that doesn't mean we can't change it."*

| Metric | Result |
|---|---|
| Renders | 20 |
| Distinct sha256 | **1** |
| Byte-identical | **YES** |
| Duration | 1.72 s on every render, zero variance |
| File size | 82,604 bytes on every render |
| Mean real-time factor | 4.1x (i.e. 4.1 s of compute per second of audio) |

sha256 of all twenty: `08eddb92ccf03ae36b91eb32d0aa7a842f4807c2469e816090697a0838b63cb2`

**Answer to "are outputs byte-identical across identical runs": yes.** Not perceptually close —
identical. Confirmed independently at signal level: all 19 pairs against the reference render
produce a difference signal at **-91 dB peak**, which is the measurement floor (see §3.1), i.e.
perfect cancellation.

### 3.1 A measurement bug I found and fixed — read this before trusting any dB figure

My first version of `compare.cjs` computed the difference signal with
`amix=inputs=2:weights=1 -1:normalize=0`, believing the negative weight inverted the second input.
**It does not.** A negative control — comparing a file against *itself* — exposed it:

| Method | file vs ITSELF | Correct? |
|---|---|---|
| `amix weights "1 -1"` | mean -11.7 dB, max **0.0 dB** | **No** — no cancellation at all |
| `volume=-1` then `amix normalize=0` | mean -91.0 dB, max **-91.0 dB** | Yes — 16-bit floor |

The tool now uses the second form and the header documents the control. **-91 dB is the noise
floor of this measurement**, so a pair reading -91 dB is the same waveform.

I had quoted a residual figure for experiment B off the broken version before catching this. The
recomputed numbers are below and the *conclusion* is unchanged — but the number came from an
unvalidated tool at the time, and that is worth saying rather than quietly restating it. Every dB
figure in this document comes from the corrected, negative-controlled version.

### B — does the seed actually change anything?

Same sentence, same temperature, five different seeds:

| Seed | sha256 (first 16) |
|---|---|
| 1234 | `08eddb92ccf03ae3` |
| 1 | `9f61fb489b702fb5` |
| 42 | `a2d01c4fc1be98a2` |
| 99999 | `32d149e1b471b886` |
| 2026 | `d4490974809dbfc0` |

**Five seeds, five distinct outputs. The seed is doing real work** — it is not an ignored
parameter, which was a live possibility worth ruling out.

How different? Not subtly. Measured against the seed-1234 render:

| vs seed 1234 | duration delta | difference RMS | signal RMS | residual |
|---|---|---|---|---|
| seed 1 | 0 s | -14.8 dB | -17.6 dB | **+2.8 dB** |
| seed 42 | 0.04 s | -14.3 dB | -17.6 dB | **+3.3 dB** |
| seed 99999 | 0 s | -14.5 dB | -17.6 dB | **+3.1 dB** |
| seed 2026 | 0.04 s | -14.6 dB | -17.6 dB | **+3.0 dB** |

The difference signal is **louder than the signal itself**, by about 3 dB in every case. That is
the arithmetic signature of two essentially uncorrelated waveforms: subtract two unrelated signals
of similar level and you get roughly +3 dB, which is exactly what appears. Durations shift too
(1.68 / 1.72 / 1.76 s). So a different seed is a **different take** — different prosody and timing,
not a jittered version of the same performance.

This also settles the attribution question, and it is the important one: **the determinism is
coming from the seed, not from the low temperature.** At one and the same temperature of 0.1,
changing only the seed produces completely different audio. So temperature 0.1 has not collapsed
sampling to greedy decoding; there is real sampling entropy present, and the seed is what pins it.

Note the cross-check that fell out of this for free: seed 1234 in experiment B produced
`08eddb92ccf03ae3…` — **the same hash as all twenty renders in experiment A**, generated in a
different experiment, at a different point in the process, after 20 intervening generations had
advanced the RNG. Reproducibility holds across context, not just across a tight loop.

### C — the whole 20-utterance corpus, rendered twice

| Metric | Result |
|---|---|
| Utterance pairs | 20 |
| Byte-identical pass 1 vs pass 2 | **20 / 20** |
| Pairs with any duration delta | 0 |
| Difference signal, every pair | -91 dB peak (the measurement floor) |
| Throughput | 40 renders, 296 s of compute for 75.0 s of audio = **RTF 4.0x** |

Determinism holds across the full length range, from a one-word utterance to eleven words. No
sentence in the set was an exception.

### D — a fourth experiment, launched but NOT completed

I wrote `temp_probe.py` to separate "deterministic because seeded" from "deterministic because the
temperature is low", by repeating the same-seed and different-seed comparisons at the library's
**default temperature of 0.8** rather than 0.1, plus an unseeded control.

**It did not finish.** It was still loading the model when I wrote this up, having produced zero
renders — the box was under load average 8-9 from sibling agent sessions for the whole period. I am
reporting that rather than quietly dropping the experiment.

It matters less than it did when I wrote it, because **experiment B already answers the question it
was built for**: at a fixed temperature of 0.1, changing only the seed changes the output
completely, which proves sampling entropy exists at that temperature and that the seed is what
controls it. What D would add is confirmation that the same holds at temperature 0.8. The script is
committed and takes one command to run when the box is quiet.

### What I could not do: listen

The brief asks for my own listening description. **I cannot listen to audio** — that is a hard
limit, not an oversight, and I am not going to invent an impression of how these renders sound.
Everything above is measurement. The 60 English WAVs are on the box at
`/home/tomcassidy/.chatterbox-trial/out/` for a human to judge naturalness and voice quality
(Tom's axes A and B), which is the part of the bake-off that genuinely needs ears.

What I *can* say from measurement is that this trial says nothing about quality. It answers axis
**F (control)** and axis **E (repeatability)** and nothing else.

---

## 4. Verdict on the question asked

**Chatterbox is deterministic on a fixed seed, and the determinism is real rather than incidental.**

- Same seed, same input, same everything → **byte-identical output**, 20/20 on a repeat test and
  20/20 across a full corpus rendered twice. Not "perceptually close" — bit-equal.
- Different seed → a genuinely different take, verified at signal level.
- The determinism survives an intervening 20 generations, so it is a property of the seed rather
  than of a warm loop.
- Caveat, and it is a real one: this was measured on **one machine, one build, CPU-only, one
  session**. Byte-identity across *hardware* (CPU vs GPU), across torch versions, or across
  library versions is **not** tested here and should not be assumed — GPU kernels in particular
  are a well-known source of non-determinism. What is proven is same-box reproducibility.

On Tom's axis F, Chatterbox scores well: seed control works, temperature is exposed, the model is
MIT-licensed and self-hostable, and versions can be pinned exactly because you hold the weights.
On axis G it is free to run, with no rate limits and no per-character cost, at the price of
providing compute.

And then gate zero, from §0: **no Welsh.**

---

## 5. Running it for real — what the hardware gap actually is

The box ran the benchmark, so there is no blocker for English experimentation. The gap is
throughput, and it is worth stating precisely rather than as "we need a GPU".

**Measured: RTF 4.0x on 12 shared vCPUs** — 4 seconds of compute per second of audio, on a box
whose CPU is shared with other agent sessions (load average was 8-9 throughout, and the observed
rate varied by roughly an order of magnitude between the quiet and busy stretches of the run).

Scaling that honestly:

- The 20-utterance English benchmark, rendered twice: 75 s of audio, **~5 minutes** of compute.
  Already done, on this box, for free.
- One full 668-seed course, target side only, at ~3 s per utterance ≈ 2,000 s of audio ≈
  **~2.2 hours** of CPU on this box. Plus practice phrases, which multiply that severalfold.
- The 29-course xAI migration scope: **days of CPU**, on a shared box, for a first pass — and
  every re-render repeats it.

So: fine for evaluation, wrong tool for production rendering. That is a throughput judgement, not
a capability one.

**Exact gaps, named:**

1. **No GPU / zero VRAM.** virtio-gpu, 8 MB framebuffer, no CUDA, no `/dev/kfd`. Nothing to fix
   here in software.
2. **No Python dev headers and no root.** `/usr/include/python3.14/` absent; `apt install
   python3.14-dev` requires privileges I do not have. This is what blocks `spacy-pkuseg`, and
   therefore **the Chinese path of Chatterbox is untested and untestable on this box**. zho is in
   the migration scope, so this must be closed somewhere else.
3. **No `torchcodec` for cp314**, so `torchaudio.save` is unavailable. Worked around with
   `soundfile`; affects file writing only, not inference.

---

## 6. Cheapest viable routes, with prices I fetched

Prices as of 2026-08-26. Note the benchmark is **2,495 characters** of text in total
(20 utterances x2 passes + 20 repeats + 5 seed variants), which is why the hosted numbers are so
small.

| Route | Price | Seed control? | Notes |
|---|---|---|---|
| **This box, CPU** | **£0 / $0** | Yes, via `torch.manual_seed` | Already done. RTF 4.0x. The right answer for evaluation. |
| **HF Space, `ResembleAI/Chatterbox-Multilingual-TTS`** | **$0** | **Yes** — `gr.Number(value=0, label="Random seed (0 for random)")` plus a temperature slider 0.05-5 | Runs on ZeroGPU (H200 slices). Free quota is ~3.5 min GPU/day (2 min unauthenticated); HF PRO at $9/mo raises it to ~25 min/day. Browser-driven, so awkward to script. |
| **Vast.ai RTX 4090** | **from $0.13/GPU-hr** (median $0.49 across 63 configs) | N/A — you run the code | Cheapest metal. Marketplace, so availability and reliability vary. |
| **RunPod RTX 4090** | **$0.34/hr** community, **$0.69-0.74/hr** secure; L4 $0.49/hr | N/A | Per-second billing, no minimum. Storage $0.10/GB/mo. |
| **Lambda** | A10 $1.29/hr, RTX 6000 $0.69/hr | N/A | Per-minute billing, no egress fees. No L4/L40S listed. |
| **Google Colab free** | **$0** | N/A | T4 16 GB still available on the free tier; ~12 h session ceiling, no guaranteed allocation, roughly 15-30 GPU-h/week observed. |
| **fal.ai hosted Chatterbox** | **$0.025 / 1,000 chars** | **Yes** — explicit `seed` param, documented as "a fixed seed should always generate the exact same audio file", plus `temperature`, `exaggeration`, `cfg` | Pay-as-you-go, no subscription. |
| **Resemble's own hosted API** | **Not published** | Unknown | Their pricing page lists plans (Flex $0/mo credits, Team $350/mo, Business $1,000/mo, Enterprise custom) and per-second *detection* rates, but **no TTS per-character rate at all**. Recorded as a gap. |

### Order-of-magnitude cost to run the full English benchmark once

- **On this box: $0.** It is done. This is the answer.
- On fal: 2,495 chars x $0.025/1,000 = **$0.06**.
- On a rented RTX 4090: the benchmark is ~5 min of CPU here and would be well under a minute on a
  4090. At $0.34/hr with per-second billing that is **under $0.01 of compute**, but realistically
  you pay for ~15 minutes of setup and model download, so **$0.09-0.19**.
- On the HF Space or Colab: **$0**, at the cost of manual clicking or notebook babysitting.

**Position: there is no reason to spend anything on this candidate.** The local CPU route works,
costs nothing, and gives the tightest control over the variable actually under test. If a GPU is
ever wanted for volume, Vast.ai at $0.13/hr is the cheapest and RunPod at $0.34/hr is the sane
default. fal at $0.06 for the whole benchmark is the cheapest *managed* route and, notably, is the
only hosted option I found that exposes the seed — but it is a paid API and therefore a **phase-2
item to be named, not run**, under the zero-spend rule.

### A second machine in the estate with a GPU

Checked documentation only, as instructed — **I did not SSH anywhere and did not probe any remote
machine.** From `docs/secrets-vault.md` and `~/.ssh/config`:

- **Tom's local box** (`MacBook-Air-3`)
- **SSi Machine, Camberley** (Tailscale `toms-air`, runs the pm2 stack)
- `~/.ssh/config` names two hosts: `camberley` (100.66.204.84) and `holmes` (100.84.15.13)

**No machine in the estate is documented as having an NVIDIA GPU, and I verified none of them
live.** One genuine lead worth someone else checking: Chatterbox supports Apple **MPS**, so if
`MacBook-Air-3` / `toms-air` is Apple Silicon it could run this natively and free, likely faster
than watson-1's CPU. I have not verified the chip in either machine and am not going to guess.

---

## 7. Gaps, stated plainly

1. **No Welsh in Chatterbox.** Gate zero. Verified in the installed source, not a doc.
2. **No Pennsylvania Dutch (pdc)** either — one of the 29-course migration languages.
3. **Chinese path untested and untestable here** — `spacy-pkuseg` needs Python dev headers, which
   need root. Must be tested elsewhere before Chatterbox is trusted for zho.
4. **I cannot listen.** No naturalness or voice-quality judgement is offered. The WAVs are on the
   box for a human.
5. **Determinism proven on one box only.** Cross-hardware and cross-version byte-identity are
   untested; do not assume them, especially on GPU.
6. **Resemble publish no TTS pricing** and no minimum-VRAM figure. Both fetched, both absent.
7. **The utterance set is mine, not the shared one.** `tools/tts-bakeoff/data/utterances-eng.json`
   did not exist when I needed it; I pulled 20 English sentences live from `course_seeds` for
   `eng_for_mar` and committed them. If the sibling worker's set becomes canonical, this trial
   should be re-run against it — it is one command.
8. **CPU timings are noisy.** The box is shared with other agent sessions; the observed render rate
   varied by roughly 10x across the run. RTF 4.0x is the honest aggregate, not a clean benchmark.

