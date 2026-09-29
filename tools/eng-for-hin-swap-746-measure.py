#!/usr/bin/env python3
"""Measure the speaker of eng_for_hin known clips (job #746). READ-ONLY: downloads clip bytes
from S3, prints md5 + median f0 (autocorrelation, voiced frames). No TTS, no DB writes.
usage: measure.py in.tsv(id<TAB>s3_key) out.jsonl   (resumable; 2 threads; run niced)"""
import sys, os, json, hashlib, subprocess, threading
import numpy as np
from concurrent.futures import ThreadPoolExecutor
SR = 16000
env = dict(l.strip().split('=', 1) for l in open(os.path.expanduser('~/ssi-dashboard-v7-clean/.env')) if l.startswith(('AWS_', 'S3_AUDIO_BUCKET')))
def fetch(key):
    url = f"https://{env['S3_AUDIO_BUCKET']}.s3.{env['AWS_REGION']}.amazonaws.com/{key}"
    return subprocess.run(['curl', '-s', '-f', '--aws-sigv4', f"aws:amz:{env['AWS_REGION']}:s3", '--user',
        f"{env['AWS_ACCESS_KEY_ID']}:{env['AWS_SECRET_ACCESS_KEY']}", url], capture_output=True, timeout=60).stdout
def decode(b):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-f', 's16le', '-ac', '1', '-ar', str(SR), 'pipe:1'], input=b, capture_output=True, timeout=60)
    return np.frombuffer(p.stdout, dtype=np.int16).astype(np.float32) / 32768
def f0_track(x, fmin=70, fmax=400):
    n = 1024; hop = 320; lo = SR // fmax; hi = SR // fmin; out = []
    for s in range(0, len(x) - n, hop):
        f = x[s:s + n]; f = f - f.mean()
        if np.sqrt((f ** 2).mean()) < 0.01: continue
        w = f * np.hanning(n); ac = np.fft.irfft(np.abs(np.fft.rfft(w, 2 * n)) ** 2)[:hi + 1]
        if ac[0] <= 0: continue
        ac = ac / ac[0]; k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.5: out.append(SR / k)
    return out
def measure(row):
    i, key = row
    try:
        b = fetch(key)
        if len(b) < 500: return {'id': i, 'err': 'short', 'bytes': len(b)}
        x = decode(b); t = f0_track(x)
        r = {'id': i, 'md5': hashlib.md5(b).hexdigest(), 'bytes': len(b), 'dur': round(len(x) / SR, 3), 'nvoiced': len(t)}
        if len(t) >= 5: r.update(f0=round(float(np.median(t)), 1), f0p10=round(float(np.percentile(t, 10)), 1), f0p90=round(float(np.percentile(t, 90)), 1))
        return r
    except Exception as e:
        return {'id': i, 'err': str(e)[:80]}
if __name__ == '__main__':
    rows = [l.rstrip('\n').split('\t') for l in open(sys.argv[1])]
    done = set()
    if os.path.exists(sys.argv[2]): done = {json.loads(l)['id'] for l in open(sys.argv[2])}
    rows = [r for r in rows if r[0] not in done]; lock = threading.Lock()
    with open(sys.argv[2], 'a') as fo, ThreadPoolExecutor(2) as ex:
        for n, r in enumerate(ex.map(measure, rows)):
            fo.write(json.dumps(r) + '\n')
            if n % 500 == 0: fo.flush(); print(n, len(rows), flush=True)
