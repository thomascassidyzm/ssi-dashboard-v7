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

CUE-ORDINAL MODE (optional; `--cues=K --at=i,j,...`). The default above assumes
every long pause in the take is a sentence boundary, because generatePodAudio
puts its " … " TTS pause cue at exactly the sentence boundaries. Croatian Pod 1
breaks that assumption: it writes hesitation with an ellipsis mid-sentence
("Da,… imam zauzet dan danas." is ONE sentence), the cue regex treats "…" as
terminal, so the take pauses at hesitations too. Picking the longest gaps then
cuts a sentence in half at a hesitation — and every audio gate passes, because
the cut IS clean silence. Only the TEXT knows which pauses are sentence ends.

So this mode separates the two questions the default conflates:
  - WHICH gaps are cue pauses at all — still by length, top K, where K is the
    cue count the caller reads off the take's own stored text;
  - WHICH of those cue pauses to cut at — by ORDINAL IN TIME, from the caller,
    derived from the text. Never guessed.
The margin then measures the thing that actually needs discriminating: the
quietest cue pause against the loudest non-cue pause (a comma). A cue gap the
caller declined to cut at is NOT counted as a rejection — it is a known
hesitation, not evidence the choice was close.

Default behaviour is unchanged and bit-identical when the flags are absent.
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


def splice(src, n, outbase, cues=None, at=None):
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

    if at is None:
        # Default: every cut is a sentence boundary, chosen by length.
        cue_gaps = merged[:n - 1]
        chosen = sorted(cue_gaps)
        rejected = merged[n - 1:]
    else:
        # Cue-ordinal mode. Top K by length are the cue pauses; the caller says
        # which of them, in time order, are sentence ends. Everything below the
        # top K is a non-cue pause and is what the margin is measured against.
        if cues is None:
            cues = len(merged)
        cue_gaps = sorted(merged[:cues])          # in TIME order
        rejected = merged[cues:]
        if len(cue_gaps) < cues or max(at, default=-1) >= len(cue_gaps):
            # Not enough cue pauses in the audio to honour the caller's map.
            # Fail closed: emit no pieces, let the caller refuse on gap count.
            return {
                'src': src.split('/')[-1], 'whole_dur': round(dur, 3),
                'sentences': n, 'cue_mode': True,
                'interior_gaps_ms': [round((b - a) * 1000) for a, b in
                                     sorted(merged, key=lambda g: g[0])],
                'cues_expected': cues, 'cues_found': len(cue_gaps),
                'cut_at_ordinals': at,
                'cut_at_gaps_ms': [], 'rejected_gaps_ms': [], 'margin': None,
                'pieces': [],
            }
        chosen = [cue_gaps[i] for i in sorted(at)]

    # The margin discriminates the CUE population from the comma population, so
    # it is measured over every cue gap — including ones we chose not to cut at.
    shortest_cut = min((b - a) for a, b in cue_gaps) if cue_gaps else 0
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

    out = {
        'src': src.split('/')[-1], 'whole_dur': round(dur, 3), 'sentences': n,
        'interior_gaps_ms': [round((b - a) * 1000) for a, b in
                             sorted(merged, key=lambda g: g[0])],
        'cut_at_gaps_ms': [round((b - a) * 1000) for a, b in chosen],
        'rejected_gaps_ms': [round((b - a) * 1000) for a, b in rejected],
        'margin': round(margin, 2) if margin else None,
        'pieces': pieces,
    }
    if at is not None:
        out['cue_mode'] = True
        out['cues_expected'] = cues
        out['cues_found'] = len(cue_gaps)
        out['cut_at_ordinals'] = sorted(at)
        out['cue_gaps_ms'] = [round((b - a) * 1000) for a, b in cue_gaps]
    return out


if __name__ == '__main__':
    argv = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--'))
    _at = ([int(x) for x in flags['at'].split(',') if x != '']
           if 'at' in flags else None)
    _cues = int(flags['cues']) if 'cues' in flags else None
    print(json.dumps(
        splice(argv[0], int(argv[1]), argv[2], cues=_cues, at=_at), indent=1))
