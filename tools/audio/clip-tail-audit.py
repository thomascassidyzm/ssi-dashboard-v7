#!/usr/bin/env python3
"""READ-ONLY clip quality probe (job #573, 2026-10-03): trailing clicks and low-pass 'barrel' sound.

Input CSV on stdin: label,id,audio_revision (id = course_audio.id). Fetches the SERVED bytes
from the learner audio proxy, decodes with ffmpeg to 24 kHz mono, and prints one JSON line per
clip plus a per-label summary on stderr.

Metrics (zone = "afterglow": from speech end to the last non-digital-silent sample):
  end_abs      |last non-silent sample| / clip peak — a hard cut-off leaves this high.
  tail_spike   max / median of per-millisecond peak |2nd difference| inside the afterglow — a click is a
               broadband spike on a smooth decay (natural decays score ~2-8).
  roll95       frequency below which 95% of spectral energy lies; hf_ratio = energy above 4 kHz — low = barrel.
CLICK = tail_spike>=25 with spike above -60 dBFS, or end_abs>=0.05.
"""
import sys, json, subprocess, urllib.request, concurrent.futures as cf, collections
import numpy as np
BASE = 'https://saysomethingin.app/api/audio'
SR = 24000
def ref(i, r): return f'{i}.v{int(r)}' if r and int(r) > 1 else i
def probe(row):
    label, cid, rev = row
    try:
        raw = urllib.request.urlopen(urllib.request.Request(f'{BASE}/{ref(cid, rev)}', headers={'User-Agent': 'audit'}), timeout=30).read()
        pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-f', 's16le', '-ac', '1', '-ar', str(SR), 'pipe:1'], input=raw, capture_output=True).stdout
        x = np.frombuffer(pcm, dtype=np.int16).astype(np.float64) / 32768
        if len(x) < SR // 4: return dict(label=label, id=cid, error='short')
        # Speech end = last 10 ms frame within 30 dB of the loudest frame; the "afterglow" is everything
        # from there to the last non-digital-silent sample. Clicks sit there, not at the file's last byte.
        w = SR // 100; nf = len(x) // w
        env = np.array([np.sqrt(np.mean(x[k*w:(k+1)*w] ** 2)) + 1e-9 for k in range(nf)])
        env_db = 20 * np.log10(env); loud = env_db.max()
        speech_end = int(np.where(env_db > loud - 30)[0].max()) + 1
        nz = np.where(np.abs(x) > 1e-4)[0]; last_nz = int(nz.max()) + 1 if len(nz) else len(x)
        # Click = a 1-3 sample impulse: second difference far above its own +-1 ms neighbourhood, loud enough to
        # hear (> -50 dBFS), in the final 300 ms before digital silence. Speech and breath are locally smooth.
        seg = x[max(0, last_nz - int(SR * .3)): last_nz]
        end_abs = abs(x[last_nz - 1]) / (np.abs(x).max() + 1e-9)
        d2 = np.abs(np.diff(seg, 2)); k = SR // 1000
        if len(d2) > 4 * k:
            cs2 = np.concatenate([[0], np.cumsum(d2)])
            loc = np.array([(cs2[min(len(d2), j + k)] - cs2[max(0, j - k)] - d2[j]) / (min(len(d2), j + k) - max(0, j - k) - 1) for j in range(len(d2))])
            sc = d2 / (loc + 1e-4); sc[d2 < 0.003] = 0
            spike = float(sc.max()); spike_db = float(20 * np.log10(d2[sc.argmax()] + 1e-9))
        else: spike, spike_db = 1.0, -180.0
        zone = seg
        sp = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2; fr = np.fft.rfftfreq(len(x), 1 / SR)
        cs = np.cumsum(sp) / sp.sum()
        o = dict(label=label, id=cid, dur=len(x) / SR, end_abs=end_abs, afterglow_ms=len(zone) * 1000 / SR, tail_spike=spike, tail_spike_db=spike_db,
                 last_nz_db=float(20*np.log10(np.abs(x[max(0,last_nz-48):last_nz]).max()+1e-9)),
                 roll95=float(fr[np.searchsorted(cs, .95)]), hf_ratio=float(sp[fr > 4000].sum() / sp.sum()))
        o['click'] = bool((o['tail_spike'] >= 12 and o['tail_spike_db'] > -50) or o['end_abs'] >= .05)
        return o
    except Exception as e:
        return dict(label=label, id=cid, error=str(e)[:80])
rows = [l.strip().split(',') for l in sys.stdin if l.strip() and not l.startswith('label')]
agg = collections.defaultdict(list)
with cf.ThreadPoolExecutor(4) as ex:
    for o in ex.map(probe, rows):
        print(json.dumps(o)); agg[o['label']].append(o)
for lab, os_ in sorted(agg.items()):
    ok = [o for o in os_ if 'error' not in o]
    if not ok: print(f'{lab}: all {len(os_)} failed ({os_[0].get("error")})', file=sys.stderr); continue
    m = lambda k: float(np.median([o[k] for o in ok]))
    print(f'{lab:34s} n={len(ok):3d} err={len(os_)-len(ok)} CLICK={sum(o["click"] for o in ok)/len(ok):5.1%} '
          f'end_abs={m("end_abs"):.3f} spike_med={m("tail_spike"):.1f} spike_p90={float(np.percentile([o["tail_spike"] for o in ok],90)):.0f} afterglow={m("afterglow_ms"):.0f}ms roll95={m("roll95"):.0f}Hz hf4k={m("hf_ratio"):.3f}', file=sys.stderr)
