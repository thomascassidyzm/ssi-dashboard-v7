#!/usr/bin/env python3
# MOVED to Popty from ssi-learning-app/tools/welcome/standard/splice.py (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
"""Splice helpers for the standard welcomes (job #83, Tom 2026-10-12).

Real pieces are cut out of Aran's real welcome take at word boundaries given as
fixed times in make_first.py / make_all.py, each cut snapped to the quietest 5 ms
frame within +-90 ms so it lands in a breath or gap, never inside a word. Nothing
here transcribes: Tom r-2026-11-03, audio splits/alignment never use Whisper (or any
transcription) for timings (job #732 corrected this note, which said "whisper alignment"). Clone pieces are Cartesia
renders from the Popty trial route and are only ever used to fill words Aran's
real takes do not contain. Nothing here feeds clone output back as a source.
"""
import array, subprocess, wave, os

SR = 44100

def decode(src, dst):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-ar', str(SR), '-ac', '1', '-sample_fmt', 's16', dst], check=True)
    w = wave.open(dst); a = array.array('h'); a.frombytes(w.readframes(w.getnframes())); return a

def snap(a, t, win=0.09, frame=0.005):
    n = int(frame * SR); lo = max(0, int((t - win) * SR)); hi = min(len(a) - n, int((t + win) * SR))
    best, bi = None, int(t * SR)
    for i in range(lo, hi, n):
        e = sum(abs(x) for x in a[i:i + n]) / n
        if best is None or e < best: best, bi = e, i + n // 2
    return bi / SR

def cut(a, t0, t1, snap0=True, snap1=True):
    s = snap(a, t0) if snap0 else t0
    e = snap(a, t1) if snap1 else t1
    return s, e, a[int(s * SR):int(e * SR)]

def trim_silence(a, thr=250, keep=0.02):
    i = 0
    while i < len(a) and abs(a[i]) < thr: i += 1
    j = len(a)
    while j > i and abs(a[j - 1]) < thr: j -= 1
    i = max(0, i - int(keep * SR)); j = min(len(a), j + int(keep * SR))
    return a[i:j]

def fade(a, ms=12):
    n = int(ms * SR / 1000); a = array.array('h', a)
    for k in range(min(n, len(a) // 2)):
        g = k / n; a[k] = int(a[k] * g); a[len(a) - 1 - k] = int(a[len(a) - 1 - k] * g)
    return a

def silence(sec): return array.array('h', [0] * int(sec * SR))

def join(parts):
    out = array.array('h')
    for p in parts: out.extend(p)
    return out

def write_mp3(a, path):
    raw = path + '.raw'
    open(raw, 'wb').write(a.tobytes())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', raw,
                    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7', '-ar', '44100', '-b:a', '48k', path], check=True)
    os.remove(raw)
