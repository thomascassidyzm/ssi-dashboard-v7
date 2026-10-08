#!/usr/bin/env python3
"""
cut-drill-units-by-word-timings.py — audition cut, no TTS, writes files only.

Cuts one whole-turn take into Drill units using Cartesia's own word timings,
by the #216 whole-sentence rule (drill-cuts.cjs on cs/216-german-pod-1-re-record-nico-vikt):
  * every sentence is a unit, however short; NO joining of short sentences and NO
    comma cuts (the app pairs each unit with an English sentence by index);
  * each cut sits in a silence (tools/pods/splice.py: >=100 ms at -35 dB) that
    overlaps the gap between the last word of one unit and the first of the
    next, cut at that silence's midpoint; pieces keep 50 ms pad, 15 ms fades.
Usage: cut-drill-units-by-word-timings.py take.mp3 timings.json outbase
  timings.json = {"words":[...],"starts":[...],"ends":[...]} (course_audio.word_timings)
Prints JSON: units [{text, file, start, end, dur, flag, notes}].
"""
import json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import splice as sp

MAX_UNIT = 3.2
MIN_PIECE = 1.0
JOIN_WORDS = 2


def nwords(toks):
    return sum(1 for t in toks if any(c.isalnum() for c in t))


def sentences(words):
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        if w.rstrip('"»)').endswith(('.', '?', '!', '…')):
            out.append(cur); cur = []
    if cur:
        out.append(cur)
    return out


def join_short(sents, words):
    sents = [list(s) for s in sents]
    changed = True
    while changed and len(sents) > 1:
        changed = False
        for i, s in enumerate(sents):
            if nwords([words[j] for j in s]) <= JOIN_WORDS:
                if i + 1 < len(sents):
                    sents[i + 1] = s + sents[i + 1]
                else:
                    sents[i - 1] = sents[i - 1] + s
                del sents[i]
                changed = True
                break
    return sents


def comma_cut(unit, words, starts, ends):
    """Split unit (list of word idx) after comma words, pieces >= MIN_PIECE."""
    if ends[unit[-1]] - starts[unit[0]] <= MAX_UNIT:
        return [unit]
    pieces, cur = [], []
    for k, i in enumerate(unit):
        cur.append(i)
        if words[i].endswith(',') and k < len(unit) - 1:
            if ends[i] - starts[cur[0]] >= MIN_PIECE and ends[unit[-1]] - starts[unit[k + 1]] >= MIN_PIECE:
                pieces.append(cur); cur = []
    if cur:
        pieces.append(cur)
    return pieces


def cut_point(gaps, a_end, b_start):
    lo, hi = min(a_end, b_start) - 0.05, max(a_end, b_start) + 0.05
    best, ov_best = None, 0
    for g0, g1 in gaps:
        ov = min(g1, hi) - max(g0, lo)
        if ov > ov_best:
            best, ov_best = (g0, g1), ov
    if best:
        return (best[0] + best[1]) / 2, 'silence %d ms' % round((best[1] - best[0]) * 1000)
    return (a_end + b_start) / 2, None


def pcm(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'],
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768


def db(x):
    return 20 * np.log10(max(float(np.sqrt(np.mean(x ** 2))) if len(x) else 0, 1e-6))


def main(src, tfile, outbase):
    t = json.load(open(tfile))
    words, starts, ends = t['words'], t['starts'], t['ends']
    dur = sp.probe_dur(src)
    gaps = [(a, b) for a, b in sp.silences(src)]
    units = sentences(words)
    bounds = [0.0]
    cutnotes = [None]
    for u0, u1 in zip(units, units[1:]):
        c, n = cut_point(gaps, ends[u0[-1]], starts[u1[0]])
        bounds.append(c); cutnotes.append(n)
    bounds.append(dur)
    res = []
    for i, u in enumerate(units):
        s = max(0.0, bounds[i] - (sp.PAD if i else 0))
        e = min(dur, bounds[i + 1] + (sp.PAD if i + 1 < len(units) else 0))
        path = f'{outbase}{i + 1:02d}.mp3'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-ss', f'{s:.3f}', '-to', f'{e:.3f}', '-af',
                        f'afade=t=in:st={s:.3f}:d={sp.FADE},afade=t=out:st={e - sp.FADE:.3f}:d={sp.FADE}',
                        '-c:a', 'libmp3lame', '-b:a', '96k', path], check=True, capture_output=True)
        x = pcm(path)
        d = len(x) / 16000
        lead = starts[u[0]] - s
        trail = e - ends[u[-1]]
        nw = nwords([words[j] for j in u])
        wps = nw / max(ends[u[-1]] - starts[u[0]], 0.01)
        notes = []
        edge = int(0.04 * 16000)
        # level 25-60 ms in from each edge (clear of the 15 ms fade)
        lo_s, lo_e = int(0.025 * 16000), int(0.065 * 16000)
        head, tail = db(x[lo_s:lo_e]), db(x[len(x) - lo_e:len(x) - lo_s])
        if head > -35: notes.append('sound at the start edge (%.0f dB)' % head)
        if tail > -35: notes.append('sound at the end edge (%.0f dB)' % tail)
        if i and cutnotes[i] is None: notes.append('no 100 ms silence at the start cut (cut at word-gap midpoint)')
        if i + 1 < len(units) and cutnotes[i + 1] is None: notes.append('no 100 ms silence at the end cut (cut at word-gap midpoint)')
        if lead > 0.4 and i == 0: notes.append('dead air %.2f s before the first word' % lead)
        if trail > 0.6 and i + 1 == len(units): notes.append('%.2f s of tail after the last word' % trail)
        if wps > 6: notes.append('fast: %.1f words/s' % wps)
        if d < 0.6: notes.append('very short (%.2f s)' % d)
        res.append({'text': ' '.join(words[j] for j in u), 'file': os.path.basename(path), 'start': round(s, 3),
                    'end': round(e, 3), 'dur': round(d, 2), 'wps': round(wps, 1), 'head_db': round(head), 'tail_db': round(tail),
                    'flag': 'clean' if not notes else 'note', 'notes': notes})
    print(json.dumps({'src': os.path.basename(src), 'dur': round(dur, 2), 'units': res}, ensure_ascii=False))


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print(__doc__); sys.exit(2)
    main(*sys.argv[1:])
