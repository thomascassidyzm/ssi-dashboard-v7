#!/usr/bin/env python3
"""
splice.py — cut a whole-turn pod clip into its sentences, with ffmpeg only.

No TTS. Nothing is written to the course. Reads an mp3, finds the silences,
keeps the N-1 longest INTERIOR ones for an N-sentence turn, cuts at each gap's
midpoint with a short fade, and writes N mp3s plus a measurement record.

The whole claim being tested is in the MARGIN it prints: the shortest gap we
cut at, divided by the longest gap we did NOT cut at. Above ~1.5 the sentence
boundaries are a different population from the comma pauses and the choice is
not a close call. At 1.0 it would be a coin toss.
"""
import json
import re
import subprocess
import sys

NOISE_DB = -35          # silencedetect floor
MIN_SIL = 0.10          # a gap must be this long to count at all
MERGE_MS = 0.07         # gaps closer than this are one gap split by a blip
EDGE = 0.15             # ignore leading/trailing silence
FADE = 0.015            # 15ms fade in/out on every piece, so no click
PAD = 0.05              # keep 50ms of the gap either side of the cut


def probe_dur(path):
    return float(subprocess.run(
        ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
         '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip())


def silences(path):
    out = subprocess.run(
        ['ffmpeg', '-hide_banner', '-i', path, '-af',
         f'silencedetect=noise={NOISE_DB}dB:d={MIN_SIL}', '-f', 'null', '-'],
        capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([0-9.]+)', out)]
    ends = [float(x) for x in re.findall(r'silence_end: ([0-9.]+)', out)]
    return list(zip(starts, ends))


def splice(src, n, outbase):
    dur = probe_dur(src)
    raw = silences(src)
    # interior only
    gaps = [(a, b) for a, b in raw if a > EDGE and b < dur - EDGE]
    # merge gaps separated by a tiny blip
    merged = []
    for a, b in gaps:
        if merged and a - merged[-1][1] < MERGE_MS:
            merged[-1] = (merged[-1][0], b)
        else:
            merged.append((a, b))
    merged.sort(key=lambda g: g[1] - g[0], reverse=True)
    chosen = sorted(merged[:n - 1])
    rejected = merged[n - 1:]
    shortest_cut = min((b - a) for a, b in chosen) if chosen else 0
    longest_reject = max((b - a) for a, b in rejected) if rejected else 0
    margin = (shortest_cut / longest_reject) if longest_reject else None

    bounds = [0.0]
    for a, b in chosen:
        bounds.append((a + b) / 2)
    bounds.append(dur)

    pieces = []
    for i in range(len(bounds) - 1):
        s = max(0.0, bounds[i] - (PAD if i else 0))
        e = min(dur, bounds[i + 1] + (PAD if i + 1 < len(bounds) - 1 else 0))
        path = f'{outbase}-s{i}.mp3'
        subprocess.run(
            ['ffmpeg', '-y', '-v', 'error', '-i', src, '-ss', f'{s:.3f}',
             '-to', f'{e:.3f}', '-af',
             f'afade=t=in:st={s:.3f}:d={FADE},afade=t=out:st={e - FADE:.3f}:d={FADE}',
             '-c:a', 'libmp3lame', '-b:a', '96k', path],
            check=True, capture_output=True)
        pieces.append({'file': path.split('/')[-1],
                       'start': round(s, 3), 'end': round(e, 3),
                       'dur': round(e - s, 3)})

    return {
        'src': src.split('/')[-1], 'whole_dur': round(dur, 3), 'sentences': n,
        'interior_gaps_ms': [round((b - a) * 1000) for a, b in
                             sorted(merged, key=lambda g: g[0])],
        'cut_at_gaps_ms': [round((b - a) * 1000) for a, b in chosen],
        'rejected_gaps_ms': [round((b - a) * 1000) for a, b in rejected],
        'margin': round(margin, 2) if margin else None,
        'pieces': pieces,
    }


if __name__ == '__main__':
    print(json.dumps(splice(sys.argv[1], int(sys.argv[2]), sys.argv[3]), indent=1))
