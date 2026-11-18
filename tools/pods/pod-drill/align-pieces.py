#!/usr/bin/env python3
"""Where does each piece of a take actually sit in it? Waveform cross-correlation, so the answer comes from the clips'
own bytes and not from any cut record. argv: whole.mp3 piece1.mp3 piece2.mp3 ...  Prints JSON
[{start, end, score, speech}] in seconds; score is the normalised correlation, near 1 when the piece really came from
that take; speech is how much of the piece is above the splicer's -35 dB floor, in 10 ms frames."""
import json, subprocess, sys
import numpy as np
SR = 16000
FRAME = SR // 100
FLOOR = 32768 * 10 ** (-35 / 20)
def pcm(p):
    b = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    return np.frombuffer(b, dtype=np.int16).astype(np.float64)
whole = pcm(sys.argv[1])
out = []
for p in sys.argv[2:]:
    x = pcm(p)
    n = len(whole) + len(x)
    N = 1 << int(np.ceil(np.log2(n)))
    c = np.fft.irfft(np.fft.rfft(whole, N) * np.conj(np.fft.rfft(x, N)), N)[:len(whole)]
    # sliding energy of the take under the piece, so a loud passage cannot beat the true position
    e = np.concatenate(([0.0], np.cumsum(whole ** 2)))
    L = len(x)
    en = np.zeros(len(whole))
    m = len(whole) - L + 1
    if m > 0:
        en[:m] = e[L:] - e[:m]
    en[m if m > 0 else 0:] = np.inf
    px = float(np.sum(x ** 2)) or 1.0
    s = c / np.sqrt(np.maximum(en, 1.0) * px)
    i = int(np.argmax(s))
    frames = x[:len(x) - len(x) % FRAME].reshape(-1, FRAME)
    speech = int(np.sum(np.sqrt(np.mean(frames ** 2, axis=1)) > FLOOR)) * FRAME / SR
    out.append({'start': round(i / SR, 3), 'end': round((i + L) / SR, 3), 'score': round(float(s[i]), 3), 'speech': round(speech, 2)})
print(json.dumps(out))
