"""Chatterbox determinism benchmark — watson-1, CPU-only.

Three experiments, all on the ENGLISH benchmark subset:

  A. REPEAT      one sentence rendered N times with the SAME seed and the same
                 low temperature. Byte-identical or not?
  B. SEED-VARY   the same sentence rendered under several DIFFERENT seeds.
                 Does the seed change anything at all?
  C. CORPUS      the full 20-utterance set, rendered twice with the same seed.

Chatterbox exposes NO seed parameter of its own (verified against the installed
source: no manual_seed, no set_seed, no seed kwarg anywhere in the package), so
the seed is imposed externally with torch.manual_seed immediately before each
generate() call. That is the only lever available.

Outputs WAVs plus a JSON manifest with a sha256 per render. Signal comparison is
done separately by compare.cjs (node + ffmpeg — there is no numpy-based analysis
step here on purpose, so the audio maths is reproducible with the tools on the box).

Usage:
  HF_HOME=... ./venv/bin/python bench.py <utterances.json> <outdir> [--repeats N]
"""

import argparse, hashlib, json, os, sys, time

import soundfile as sf
import torch

from chatterbox.tts import ChatterboxTTS

# torchaudio.save on torch 2.10 requires torchcodec, which has no cp314 wheel
# here; soundfile writes the same 16-bit PCM WAV and is already a chatterbox dep.
def save_wav(path, wav, sr):
    sf.write(path, wav.squeeze(0).cpu().numpy(), sr, subtype="PCM_16")

# Low temperature — determinism is the thing under test, so sampling is pinned
# as tight as the API allows without being zero (the model has no greedy flag).
TEMPERATURE = 0.1
BASE_SEED = 1234


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def render(model, text, seed, out_path, temperature=TEMPERATURE):
    """One render. Seed is set immediately before generate() — see module docstring."""
    torch.manual_seed(seed)
    t0 = time.time()
    wav = model.generate(text, temperature=temperature)
    elapsed = time.time() - t0
    save_wav(out_path, wav, model.sr)
    dur = wav.shape[-1] / model.sr
    return {
        "file": os.path.basename(out_path),
        "text": text,
        "seed": seed,
        "temperature": temperature,
        "samples": int(wav.shape[-1]),
        "duration_s": round(dur, 4),
        "gen_s": round(elapsed, 2),
        "rtf": round(elapsed / dur, 2) if dur else None,
        "sha256": sha256(out_path),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("utterances")
    ap.add_argument("outdir")
    ap.add_argument("--repeats", type=int, default=20)
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)
    with open(args.utterances) as f:
        data = json.load(f)
    utts = data["utterances"]

    print(f"torch {torch.__version__} cuda={torch.cuda.is_available()} "
          f"threads={torch.get_num_threads()}", flush=True)
    t0 = time.time()
    model = ChatterboxTTS.from_pretrained(device="cpu")
    print(f"model loaded in {time.time()-t0:.1f}s (sr={model.sr})", flush=True)

    manifest = {
        "engine": "chatterbox-tts 0.1.7 / ChatterboxTTS (0.5B) / device=cpu",
        "torch": torch.__version__,
        "temperature": TEMPERATURE,
        "base_seed": BASE_SEED,
        "utterance_source": data.get("source"),
        "experiments": {},
    }

    # --- A. repeat test: same sentence, same seed, N times -------------------
    probe = utts[len(utts) // 2]
    print(f"\n[A] repeat x{args.repeats}: {probe['text']!r}", flush=True)
    rep = []
    for i in range(args.repeats):
        r = render(model, probe["text"], BASE_SEED,
                   os.path.join(args.outdir, f"A_repeat_{i:02d}.wav"))
        rep.append(r)
        print(f"  {i:02d} {r['duration_s']:6.2f}s gen={r['gen_s']:6.1f}s "
              f"rtf={r['rtf']} {r['sha256'][:16]}", flush=True)
    manifest["experiments"]["A_repeat_same_seed"] = {
        "text": probe["text"], "seed": BASE_SEED, "renders": rep,
        "distinct_sha256": len({r["sha256"] for r in rep}),
        "byte_identical": len({r["sha256"] for r in rep}) == 1,
    }

    # --- B. seed-vary: same sentence, different seeds ------------------------
    seeds = [1234, 1, 42, 99999, 2026]
    print(f"\n[B] seed-vary on the same sentence", flush=True)
    sv = []
    for s in seeds:
        r = render(model, probe["text"], s,
                   os.path.join(args.outdir, f"B_seed_{s}.wav"))
        sv.append(r)
        print(f"  seed={s:<7} {r['duration_s']:6.2f}s {r['sha256'][:16]}", flush=True)
    manifest["experiments"]["B_seed_vary"] = {
        "text": probe["text"], "renders": sv,
        "distinct_sha256": len({r["sha256"] for r in sv}),
        "all_seeds_identical": len({r["sha256"] for r in sv}) == 1,
    }

    # --- C. corpus: all utterances, rendered twice with the same seed --------
    print(f"\n[C] corpus x2 ({len(utts)} utterances)", flush=True)
    corpus = []
    for pas in (1, 2):
        for u in utts:
            r = render(model, u["text"], BASE_SEED,
                       os.path.join(args.outdir, f"C_{u['id']}_pass{pas}.wav"))
            r["id"] = u["id"]
            r["pass"] = pas
            corpus.append(r)
            print(f"  pass{pas} {u['id']} {r['duration_s']:6.2f}s "
                  f"{r['sha256'][:16]}", flush=True)
    pairs = []
    for u in utts:
        a = next(r for r in corpus if r["id"] == u["id"] and r["pass"] == 1)
        b = next(r for r in corpus if r["id"] == u["id"] and r["pass"] == 2)
        pairs.append({
            "id": u["id"], "text": u["text"],
            "sha_match": a["sha256"] == b["sha256"],
            "dur_pass1": a["duration_s"], "dur_pass2": b["duration_s"],
            "dur_delta_s": round(abs(a["duration_s"] - b["duration_s"]), 4),
        })
    manifest["experiments"]["C_corpus_two_passes"] = {
        "renders": corpus, "pairs": pairs,
        "n_byte_identical": sum(1 for p in pairs if p["sha_match"]),
        "n_total": len(pairs),
    }

    with open(os.path.join(args.outdir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print("\nBENCH OK ->", os.path.join(args.outdir, "manifest.json"), flush=True)


if __name__ == "__main__":
    main()
