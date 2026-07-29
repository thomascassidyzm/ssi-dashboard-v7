#!/usr/bin/env python3
"""prosody-lab: contour-shaped prosodic features + cross-rendition similarity.

Design doctrine (founder, 2026-07-28): we optimise for UNDERSTANDABILITY, not
naturalness. Features are deliberately blind to voice identity/timbre:
  - F0 contour in SEMITONES RELATIVE TO THE CLIP'S OWN MEDIAN (removes register:
    a bass and a soprano saying the same phrase with the same melody are equal)
  - energy contour Z-SCORED per clip (removes recording level / mic distance)
  - timing: duration, syllable-scale envelope peaks, pauses, voiced fraction
No spectral envelope, no MFCCs, no formants — those ARE the voice.

Methods (standard, dependency-light: numpy/scipy/soundfile + ffmpeg decode):
  - F0: normalised autocorrelation per 40 ms frame, 10 ms hop, 60–400 Hz search,
    voicing = ACF peak clarity > 0.60 AND frame energy above floor; 5-pt median
    filter. (Boersma-style ACF without the full Praat interpolation — adequate
    for contour SHAPE comparison, documented limitation for creak/very low F0.)
  - Similarity: DTW (full matrix, contours resampled to 150 points) with
    normalised path cost. Resampling makes the contour comparison TIME-SHAPE
    based; absolute timing differences are carried by separate scalar features
    (duration ratio, syllable rate, pauses) so the two axes stay readable apart.

Subcommands:
  extract  — features per clip -> features/<id>.json    (Pool of 4, resume-safe)
  compare  — per-pair distances -> results.jsonl        (resume-safe, appends)
  report   — aggregate stats + example pairs -> report.json (stdout summary)

Usage: python3 tools/prosody-lab/prosody.py extract|compare|report
Data dir: temp/prosody-lab/ (manifest produced by sample-pairs.cjs)
"""

import hashlib
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
from multiprocessing import Pool

import numpy as np
import scipy.signal as sig
import soundfile as sf

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(REPO, "temp", "prosody-lab")
FEAT_DIR = os.path.join(DATA, "features")
MANIFEST = os.path.join(DATA, "pairs.json")
RESULTS = os.path.join(DATA, "results.jsonl")
REPORT = os.path.join(DATA, "report.json")

FFMPEG = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
SR = 16000
HOP_S = 0.010          # 10 ms hop everywhere
F0_WIN_S = 0.040       # 40 ms analysis window for ACF pitch
RMS_WIN_S = 0.025
F0_MIN, F0_MAX = 60.0, 400.0
VOICING_CLARITY = 0.60
SILENCE_DB = -40.0     # rel. clip peak, for trim + pause detection
PAUSE_MIN_S = 0.15
CONTOUR_LEN = 150      # DTW resample length
EXTRACTOR_VERSION = "prosody-lab-poc-2"  # v2: + syllable_peak_t (peak times, fraction of trimmed dur)
WORKERS = 4            # hard cap — machine shared with the audio batch


# ---------------------------------------------------------------- extraction

def decode(path):
    """mp3 -> mono 16 kHz float array via ffmpeg."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as t:
        tmp = t.name
    try:
        subprocess.run(
            [FFMPEG, "-v", "error", "-y", "-i", path, "-ac", "1", "-ar", str(SR), tmp],
            check=True, capture_output=True)
        x, sr = sf.read(tmp, dtype="float64")
        return x
    finally:
        os.unlink(tmp)


def frame_signal(x, win, hop):
    n = 1 + max(0, (len(x) - win) // hop)
    idx = np.arange(win)[None, :] + hop * np.arange(n)[:, None]
    return x[idx]


def acf_f0(frames):
    """Normalised-autocorrelation F0 + clarity per frame."""
    win = frames.shape[1]
    lag_min = int(SR / F0_MAX)
    lag_max = min(int(SR / F0_MIN), win - 1)
    frames = frames - frames.mean(axis=1, keepdims=True)
    f0 = np.zeros(len(frames))
    clarity = np.zeros(len(frames))
    for i, fr in enumerate(frames):
        e0 = np.dot(fr, fr)
        if e0 <= 0:
            continue
        ac = sig.fftconvolve(fr, fr[::-1])[win - 1:]
        ac = ac / e0
        seg = ac[lag_min:lag_max]
        if not len(seg):
            continue
        k = int(np.argmax(seg))
        clarity[i] = seg[k]
        lag = lag_min + k
        # parabolic interpolation around the peak
        if 0 < k < len(seg) - 1:
            a, b, c = seg[k - 1], seg[k], seg[k + 1]
            denom = a - 2 * b + c
            if abs(denom) > 1e-12:
                lag = lag + 0.5 * (a - c) / denom
        f0[i] = SR / lag
    return f0, clarity


def extract_one(job):
    clip_id, path = job
    out = os.path.join(FEAT_DIR, clip_id + ".json")
    if os.path.exists(out):
        try:
            with open(out) as f:
                if json.load(f).get("extractor_version") == EXTRACTOR_VERSION:
                    return "cached"
        except Exception:
            pass  # unreadable cache → re-extract
    try:
        x = decode(path)
    except Exception as e:
        return f"decode-fail:{clip_id}:{e}"
    if len(x) < SR // 10:
        return f"too-short:{clip_id}"

    hop = int(HOP_S * SR)
    rms_win = int(RMS_WIN_S * SR)
    frames = frame_signal(x, rms_win, hop)
    rms = np.sqrt((frames ** 2).mean(axis=1)) + 1e-12
    db = 20 * np.log10(rms / rms.max())

    # trim lead/tail silence
    active = np.flatnonzero(db > SILENCE_DB)
    if not len(active):
        return f"silent:{clip_id}"
    lo, hi = active[0], active[-1] + 1
    db = db[lo:hi]
    x = x[lo * hop: (hi - 1) * hop + rms_win]

    f0_win = int(F0_WIN_S * SR)
    if len(x) < f0_win:
        return f"too-short:{clip_id}"
    pf = frame_signal(x, f0_win, hop)
    f0, clarity = acf_f0(pf)
    n = min(len(f0), len(db))
    f0, clarity, db = f0[:n], clarity[:n], db[:n]

    voiced = (clarity > VOICING_CLARITY) & (db > SILENCE_DB + 10) & (f0 > 0)
    f0_v = np.where(voiced, f0, np.nan)
    f0_v = sig.medfilt(np.nan_to_num(f0_v), 5)
    f0_v[f0_v == 0] = np.nan
    vidx = np.flatnonzero(~np.isnan(f0_v))
    if len(vidx) >= 5:
        med = float(np.nanmedian(f0_v))
        semis = 12 * np.log2(f0_v / med)
        # interpolate across unvoiced gaps inside the voiced span, for DTW
        span = np.arange(vidx[0], vidx[-1] + 1)
        interp = np.interp(span, vidx, semis[vidx])
        f0_contour = interp
        f0_range = float(np.nanpercentile(semis, 95) - np.nanpercentile(semis, 5))
        f0_median_hz = med
    else:
        f0_contour, f0_range, f0_median_hz = None, None, None

    # syllable-scale envelope peaks (mirrors the production envelope extractor's
    # peak logic: smoothed linear envelope, prominence-gated)
    # simple 5-frame (50 ms) moving-average smooth of the linear envelope
    kernel = np.ones(5) / 5
    env_sm = np.convolve(10 ** (db / 20), kernel, mode="same")
    peaks, _ = sig.find_peaks(env_sm, prominence=0.08, distance=int(0.10 / HOP_S))
    dur_s = n * HOP_S

    # internal pauses
    sil = db < SILENCE_DB
    pauses = 0
    run = 0
    for s in sil:
        run = run + 1 if s else 0
        if run == int(PAUSE_MIN_S / HOP_S):
            pauses += 1

    feat = {
        "id": clip_id,
        "extractor_version": EXTRACTOR_VERSION,
        "duration_s": round(dur_s, 3),
        "voiced_frac": round(float(voiced.mean()), 4),
        "f0_median_hz": None if f0_median_hz is None else round(f0_median_hz, 1),
        "f0_range_st": None if f0_range is None else round(f0_range, 2),
        "syllable_peaks": int(len(peaks)),
        "syllable_peak_t": [round(float(p) * HOP_S / dur_s, 4) for p in peaks] if dur_s > 0 else [],
        "syllable_rate": round(len(peaks) / dur_s, 3) if dur_s > 0 else None,
        "pause_count": pauses,
        "f0_contour_st": None if f0_contour is None else [round(v, 3) for v in resample(f0_contour, CONTOUR_LEN)],
        "energy_contour_z": [round(v, 3) for v in resample(zscore(db), CONTOUR_LEN)],
    }
    with open(out, "w") as f:
        json.dump(feat, f)
    return "ok"


def zscore(v):
    v = np.asarray(v, dtype=float)
    s = v.std()
    return (v - v.mean()) / (s if s > 1e-9 else 1.0)


def resample(v, m):
    v = np.asarray(v, dtype=float)
    if len(v) == m:
        return v
    return np.interp(np.linspace(0, len(v) - 1, m), np.arange(len(v)), v)


# ---------------------------------------------------------------- comparison

def dtw_distance(a, b):
    """Normalised DTW path cost between equal-length 1-D contours."""
    a, b = np.asarray(a), np.asarray(b)
    n, m = len(a), len(b)
    cost = np.abs(a[:, None] - b[None, :])
    D = np.full((n + 1, m + 1), np.inf)
    D[0, 0] = 0
    for i in range(1, n + 1):
        D[i, 1:] = cost[i - 1]
        for j in range(1, m + 1):
            D[i, j] += min(D[i - 1, j], D[i, j - 1], D[i - 1, j - 1])
    return float(D[n, m] / (n + m))


def load_feat(clip_id):
    p = os.path.join(FEAT_DIR, clip_id + ".json")
    if not os.path.exists(p):
        return None
    with open(p) as f:
        return json.load(f)


def file_md5(path):
    if not os.path.exists(path):
        return None
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def compare_pair(pair, clips=None):
    fa, fb = load_feat(pair["a"]["id"]), load_feat(pair["b"]["id"])
    if not fa or not fb:
        return None
    # A "re-render" whose two files are byte-identical is the same render filed
    # under two s3_keys, not an independent re-synthesis: it scores a trivial
    # zero and would deflate the near-control baseline. Flagged, not dropped.
    same_bytes = None
    if clips:
        ma = file_md5(clips[pair["a"]["id"]]["local_path"])
        mb = file_md5(clips[pair["b"]["id"]]["local_path"])
        same_bytes = bool(ma and mb and ma == mb)
    r = {
        "pair_id": pair["pair_id"], "category": pair["category"], "language": pair["language"],
        "text": pair["text_a"], "text_b": pair["text_b"], "same_bytes": same_bytes,
        "a_id": fa["id"], "b_id": fb["id"],
        "a_voice": pair["a"]["voice_id"], "b_voice": pair["b"]["voice_id"],
        "a_origin": pair["a"]["origin"], "b_origin": pair["b"]["origin"],
        "energy_dtw": round(dtw_distance(fa["energy_contour_z"], fb["energy_contour_z"]), 4),
        "dur_log_ratio": round(abs(math.log(fa["duration_s"] / fb["duration_s"])), 4),
        "syl_count_diff": abs(fa["syllable_peaks"] - fb["syllable_peaks"]),
        "syl_rate_diff": (None if None in (fa["syllable_rate"], fb["syllable_rate"])
                          else round(abs(fa["syllable_rate"] - fb["syllable_rate"]), 3)),
        "voiced_frac_diff": round(abs(fa["voiced_frac"] - fb["voiced_frac"]), 4),
        "pause_diff": abs(fa["pause_count"] - fb["pause_count"]),
    }
    if fa["f0_contour_st"] and fb["f0_contour_st"]:
        r["f0_dtw"] = round(dtw_distance(fa["f0_contour_st"], fb["f0_contour_st"]), 4)
        r["f0_range_diff_st"] = round(abs(fa["f0_range_st"] - fb["f0_range_st"]), 3)
        r["f0_register_gap_st"] = round(abs(12 * math.log2(fa["f0_median_hz"] / fb["f0_median_hz"])), 2)
    else:
        r["f0_dtw"] = None
        r["f0_range_diff_st"] = None
        r["f0_register_gap_st"] = None
    return r


# ------------------------------------------------------------------ report

DIMS = ["f0_dtw", "energy_dtw", "dur_log_ratio", "syl_rate_diff",
        "f0_range_diff_st", "voiced_frac_diff", "syl_count_diff", "pause_diff",
        "f0_register_gap_st"]

# The dims that passed the voice test in the PoC run (same_vs_diff_auc > 0.7,
# voice_sensitivity < 0.6) — combined into one phrase-identity score.
COMBINED_DIMS = ["energy_dtw", "dur_log_ratio", "syl_count_diff"]


def pct(v, q):
    return round(float(np.percentile(v, q)), 4) if len(v) else None


def cmd_report(manifest):
    clips = {c["id"]: c for c in manifest["clips"]}
    rows = []
    with open(RESULTS) as f:
        for line in f:
            rows.append(json.loads(line))
    by_cat = {}
    for r in rows:
        by_cat.setdefault(r["category"], []).append(r)

    stats = {}
    for cat, rs in sorted(by_cat.items()):
        stats[cat] = {"n": len(rs)}
        for d in DIMS:
            vals = np.array([r[d] for r in rs if r.get(d) is not None], dtype=float)
            stats[cat][d] = {"n": len(vals), "p25": pct(vals, 25), "p50": pct(vals, 50), "p75": pct(vals, 75)}

    # discrimination score per dim: does same-phrase-cross-voice sit closer to
    # rerender (good) or to diffphrase (dim is not phrase-shaped)?
    # Byte-identical "re-renders" are the same file under two keys — a trivial
    # zero. Excluded from the near control so the baseline is real re-synthesis.
    rerender_all = by_cat.get("rerender", [])
    rerender_real = [r for r in rerender_all if not r.get("same_bytes")]
    n_dup = len(rerender_all) - len(rerender_real)

    disc = {}
    for d in DIMS:
        far = np.array([r[d] for r in by_cat.get("diffphrase", []) if r.get(d) is not None], dtype=float)
        near = np.array([r[d] for r in rerender_real if r.get(d) is not None], dtype=float)
        cross = np.array([r[d] for r in by_cat.get("crossvoice", []) + by_cat.get("crossprovider", [])
                          if r.get(d) is not None], dtype=float)
        if min(len(far), len(near), len(cross)) < 5:
            continue
        span = np.median(far) - np.median(near)
        disc[d] = {
            "near_p50": pct(near, 50), "cross_p50": pct(cross, 50), "far_p50": pct(far, 50),
            # 0 = cross-voice indistinguishable from re-render (dim is voice-invariant)
            # 1 = cross-voice as far apart as different phrases (dim is voice-dominated)
            "voice_sensitivity": (None if abs(span) < 1e-9
                                  else round(float((np.median(cross) - np.median(near)) / span), 3)),
            # separability of same-phrase (cross) vs different-phrase (far): AUC-style
            "same_vs_diff_auc": round(float(np.mean(cross[:, None] < far[None, :])), 3),
        }

    # Combined phrase-identity score over the dims that survived the voice test,
    # each divided by its median over the cross+far pool so no dim dominates by
    # unit. This is the number that answers "does the contour approach work?".
    pool = by_cat.get("crossvoice", []) + by_cat.get("crossprovider", []) + by_cat.get("diffphrase", [])
    scale = {}
    for d in COMBINED_DIMS:
        v = np.array([r[d] for r in pool if r.get(d) is not None], dtype=float)
        med = float(np.median(v)) if len(v) else 0.0
        scale[d] = med if med > 1e-9 else 1.0

    def combined(r):
        v = [r[d] / scale[d] for d in COMBINED_DIMS if r.get(d) is not None]
        return sum(v) / len(v) if v else None

    def auc(a, b):
        """P(a < b), ties half — separability of distribution a from b."""
        a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
        if not len(a) or not len(b):
            return None
        return round(float(np.mean(a[:, None] < b[None, :]) + 0.5 * np.mean(a[:, None] == b[None, :])), 3)

    combo_by_cat = {}
    for cat, rs in by_cat.items():
        vals = [combined(r) for r in rs]
        combo_by_cat[cat] = [v for v in vals if v is not None]
    near_c = [v for v in (combined(r) for r in rerender_real) if v is not None]
    cross_c = combo_by_cat.get("crossvoice", []) + combo_by_cat.get("crossprovider", [])
    far_c = combo_by_cat.get("diffphrase", [])
    combined_score = {
        "dims": COMBINED_DIMS,
        "median_scale": {d: round(scale[d], 4) for d in COMBINED_DIMS},
        "p50_by_category": {c: (round(float(np.median(v)), 3) if v else None)
                            for c, v in sorted(combo_by_cat.items())},
        "p50_rerender_deduped": round(float(np.median(near_c)), 3) if near_c else None,
        "auc_same_phrase_cross_voice_vs_diff_phrase": auc(cross_c, far_c),
        "auc_rerender_vs_diff_phrase": auc(near_c, far_c),
        "auc_rerender_vs_cross_voice": auc(near_c, cross_c),
        "n_rerender_dropped_byte_identical": n_dup,
    }

    # Example pairs the founder can LISTEN to: extremes per category, ranked on
    # energy_dtw — the dimension that actually tracks phrase identity. (Ranking
    # on f0_dtw sorts by voice, which is precisely what we found it measures.)
    examples = {}
    for cat, rs in by_cat.items():
        scored = [r for r in rs if r.get("energy_dtw") is not None]
        scored.sort(key=lambda r: r["energy_dtw"])
        pick = scored[:3] + scored[-3:]
        examples[cat] = [{
            "pair_id": r["pair_id"], "energy_dtw": r["energy_dtw"], "f0_dtw": r.get("f0_dtw"),
            "combined": (round(combined(r), 3) if combined(r) is not None else None),
            "text_a": r["text"], "text_b": r.get("text_b", r["text"]),
            "a_voice": r["a_voice"], "b_voice": r["b_voice"],
            "a_path": clips[r["a_id"]]["local_path"], "b_path": clips[r["b_id"]]["local_path"],
        } for r in pick]

    out = {"stats_by_category": stats, "dimension_discrimination": disc,
           "combined_score": combined_score, "examples": examples}
    with open(REPORT, "w") as f:
        json.dump(out, f, indent=1)
    print(json.dumps({"stats_by_category": stats, "dimension_discrimination": disc}, indent=1))
    print(f"\nfull report (incl. listenable example pairs): {REPORT}")


# -------------------------------------------------------------------- main

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    with open(MANIFEST) as f:
        manifest = json.load(f)

    if cmd == "extract":
        os.makedirs(FEAT_DIR, exist_ok=True)
        jobs = [(c["id"], c["local_path"]) for c in manifest["clips"] if os.path.exists(c["local_path"])]
        missing = len(manifest["clips"]) - len(jobs)
        if missing:
            print(f"warn: {missing} clips not on disk (download failures?) — skipped", file=sys.stderr)
        with Pool(WORKERS) as pool:
            statuses = pool.map(extract_one, jobs, chunksize=8)
        from collections import Counter
        counts = Counter(s.split(":")[0] for s in statuses)
        print(dict(counts))
        bad = [s for s in statuses if s not in ("ok", "cached")]
        for s in bad[:20]:
            print("  " + s, file=sys.stderr)

    elif cmd == "compare":
        done = set()
        if os.path.exists(RESULTS):
            with open(RESULTS) as f:
                done = {json.loads(l)["pair_id"] for l in f}
        todo = [p for p in manifest["pairs"] if p["pair_id"] not in done]
        clips = {c["id"]: c for c in manifest["clips"]}
        print(f"{len(done)} done, {len(todo)} to go")
        with open(RESULTS, "a") as out:
            for i, p in enumerate(todo):
                r = compare_pair(p, clips)
                if r:
                    out.write(json.dumps(r) + "\n")
                if (i + 1) % 50 == 0:
                    out.flush()
                    print(f"  {i + 1}/{len(todo)}")
        print("compare done")

    elif cmd == "report":
        cmd_report(manifest)

    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
