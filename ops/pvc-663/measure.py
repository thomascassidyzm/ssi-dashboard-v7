#!/usr/bin/env python3
"""One method for every clip (job #663).
LUFS  = ffmpeg ebur128 integrated loudness of the whole clip (BS.1770, gated).
body  = integrated loudness of the 80-250 Hz band (highpass 80 + lowpass 250, each 2-pole applied twice = 24 dB/oct), minus clip LUFS.
mid   = same for 500-2000 Hz.  tilt = body - mid (dB).  dur = ffprobe seconds.
Gated loudness on each band keeps silence/padding out of every number, so clips with different pauses compare fairly."""
import subprocess, sys, re, json
def lufs(f, af=None):
    chain = (af + ',' if af else '') + 'ebur128=framelog=quiet'
    e = subprocess.run(['ffmpeg','-nostats','-hide_banner','-i',f,'-ac','1','-af',chain,'-f','null','-'],capture_output=True,text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', e)[-1])
def band(lo, hi): return f'highpass=f={lo}:poles=2,highpass=f={lo}:poles=2,lowpass=f={hi}:poles=2,lowpass=f={hi}:poles=2'
def dur(f): return float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout)
for f in sys.argv[1:]:
    L = lufs(f); b = lufs(f, band(80,250)) - L; m = lufs(f, band(500,2000)) - L
    print(json.dumps({'file': f.split('/')[-1], 'lufs': round(L,1), 'body': round(b,1), 'mid': round(m,1), 'tilt': round(b-m,1), 'dur': round(dur(f),2)}))
