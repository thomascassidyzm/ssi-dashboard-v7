"""Experiment D — is the determinism coming from the SEED or from the low temperature?

bench.py runs at temperature 0.1. If that alone collapses sampling to near-greedy,
byte-identical output would prove nothing about seed control, which is the property
we actually care about (Tom's axis F). This probe separates the two causes.

Four conditions on one sentence:
  D1  temp 0.8 (library default), same seed twice   -> seed holds at real temperature?
  D2  temp 0.8, two different seeds                 -> seed actually steers sampling?
  D3  temp 0.1, two different seeds                 -> does the seed matter when cold?
  D4  temp 0.8, NO manual_seed between renders      -> unseeded = variable? (control)

Usage: HF_HOME=... ./venv/bin/python temp_probe.py <outdir>
"""

import hashlib, json, os, sys, time

import soundfile as sf
import torch

from chatterbox.tts import ChatterboxTTS

TEXT = "He can build a new life for his sister."


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""):
            h.update(c)
    return h.hexdigest()


def render(model, outdir, tag, temperature, seed):
    """seed=None means: do NOT touch the RNG, leave it wherever the last call left it."""
    if seed is not None:
        torch.manual_seed(seed)
    t0 = time.time()
    wav = model.generate(TEXT, temperature=temperature)
    el = time.time() - t0
    path = os.path.join(outdir, f"D_{tag}.wav")
    sf.write(path, wav.squeeze(0).cpu().numpy(), model.sr, subtype="PCM_16")
    r = {"tag": tag, "temperature": temperature, "seed": seed,
         "duration_s": round(wav.shape[-1] / model.sr, 4),
         "gen_s": round(el, 1), "sha256": sha256(path)}
    print(f"  {tag:16} temp={temperature} seed={seed} "
          f"{r['duration_s']:6.2f}s {r['sha256'][:16]}", flush=True)
    return r


def main():
    outdir = sys.argv[1]
    os.makedirs(outdir, exist_ok=True)
    model = ChatterboxTTS.from_pretrained(device="cpu")
    print(f"model loaded (sr={model.sr}); text={TEXT!r}\n", flush=True)

    res = {}
    print("[D1] temp 0.8, same seed twice", flush=True)
    res["D1"] = [render(model, outdir, "d1_a", 0.8, 1234),
                 render(model, outdir, "d1_b", 0.8, 1234)]

    print("[D2] temp 0.8, different seeds", flush=True)
    res["D2"] = [render(model, outdir, "d2_s1", 0.8, 1),
                 render(model, outdir, "d2_s2", 0.8, 777)]

    print("[D3] temp 0.1, different seeds", flush=True)
    res["D3"] = [render(model, outdir, "d3_s1", 0.1, 1),
                 render(model, outdir, "d3_s2", 0.1, 777)]

    print("[D4] temp 0.8, NO seed set between renders (control)", flush=True)
    torch.manual_seed(4242)
    res["D4"] = [render(model, outdir, "d4_a", 0.8, None),
                 render(model, outdir, "d4_b", 0.8, None)]

    verdict = {
        "D1_same_seed_temp08_identical": res["D1"][0]["sha256"] == res["D1"][1]["sha256"],
        "D2_diff_seed_temp08_identical": res["D2"][0]["sha256"] == res["D2"][1]["sha256"],
        "D3_diff_seed_temp01_identical": res["D3"][0]["sha256"] == res["D3"][1]["sha256"],
        "D4_unseeded_temp08_identical": res["D4"][0]["sha256"] == res["D4"][1]["sha256"],
    }
    print("\nVERDICT:", json.dumps(verdict, indent=2), flush=True)
    with open(os.path.join(outdir, "temp_probe.json"), "w") as f:
        json.dump({"text": TEXT, "renders": res, "verdict": verdict}, f, indent=2)
    print("PROBE OK", flush=True)


if __name__ == "__main__":
    main()
