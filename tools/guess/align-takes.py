#!/usr/bin/env python3
# MOVED to Popty from ssi-learning-app/tools/guess/align-takes.py (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
"""
Forced alignment of a whole I-love-you take to its words, so tools/guess/cut-pieces.mjs can cut every
piece and build-up from that one take (Tom 2026-10-06, r-2026-10-06-guess-i-love-you-mini-lesson: never render
a single word alone; dice and splice the whole take). Called by cut-pieces.mjs, not by hand.

  python3 align-takes.py jobs.json > alignments.json
  jobs.json: [{"key": "zho", "path": "/x/take.mp3", "words": ["wo", "ai", "ni"]}, ...]
  python3 align-takes.py --hear a.mp3 b.mp3 > heard.json   # the letters the model hears in each clip

--hear is the cut check: the same acoustic model, greedy-decoded with no language model, prints the romanised
letters it hears in a clip ("wo", "lov"). Unlike whisper it cannot complete a fragment into the phrase it expects.

The aligner is Meta's MMS forced aligner (torchaudio.pipelines.MMS_FA, 1,100+ languages, romanised input),
so it needs torch and torchaudio; FA_PYTHON names an interpreter that has them. It gives each word's span of
CTC emissions. The seam between two words is then put at the quietest 10 ms frame between the end of one and
the start of the next (a little either side when they touch), so a cut falls where the voice is lowest; when
even that frame is within 12 dB of the loudest (a vowel gliding into a vowel, ti amo), the seam is the middle
of the aligner's own gap instead.
Output per key: the words' spans, the seams in ms, each seam's level in dB below the take's loudest frame
(a seam 30 dB down is a clean gap; one within 10 dB of the peak cuts through voicing and is reported doubtful).
"""
import json
import re
import subprocess
import sys
import unicodedata

import numpy as np
import torch
from torchaudio.pipelines import MMS_FA as bundle

SR = 16000
VOICED_DB = -12  # a seam frame closer than this to the take's loudest is inside voicing
FOLD = {'þ': 'th', 'ð': 'd', 'æ': 'ae', 'ø': 'o', 'ł': 'l', 'ß': 'ss', 'œ': 'oe', '’': "'"}


def romanised(word, chars):
    w = ''.join(FOLD.get(c, c) for c in word.lower())
    w = ''.join(c for c in unicodedata.normalize('NFKD', w) if not unicodedata.combining(c))
    return ''.join(c for c in w if c in chars)


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def rms_db(x, hop=80, win=160):
    """dB of every 10 ms frame, hopping 5 ms; frame i is centred at (i*hop + win/2) samples."""
    n = max(1, 1 + (len(x) - win) // hop)
    fr = np.stack([x[i * hop:i * hop + win] for i in range(n)])
    return 20 * np.log10(np.sqrt((fr ** 2).mean(axis=1)) + 1e-9)


def hear(paths):
    model, labels = bundle.get_model(with_star=False), bundle.get_labels()
    out = {}
    for path in paths:
        with torch.inference_mode():
            em, _ = model(torch.from_numpy(load(path)).unsqueeze(0))
        ids = em[0].argmax(-1).tolist()
        out[path] = ''.join(labels[i] for n, i in enumerate(ids) if i != 0 and (n == 0 or i != ids[n - 1])).replace('*', '')
    json.dump(out, sys.stdout, ensure_ascii=False)


def main():
    if sys.argv[1] == '--hear':
        return hear(sys.argv[2:])
    jobs = json.load(open(sys.argv[1]))
    model, tok, aligner = bundle.get_model(), bundle.get_tokenizer(), bundle.get_aligner()
    chars = set(bundle.get_dict().keys()) - {'-', '*'}
    out = {}
    for job in jobs:
        x = load(job['path'])
        words = [romanised(w, chars) for w in job['words']]
        if any(not w for w in words):
            out[job['key']] = {'error': f'a word has no alignable letters: {job["words"]}'}
            continue
        with torch.inference_mode():
            em, _ = model(torch.from_numpy(x).unsqueeze(0))
            spans = aligner(em[0], tok(words))
        ms_per = len(x) / em.size(1) / SR * 1000
        spans_ms = [{'start': round(s[0].start * ms_per), 'end': round(s[-1].end * ms_per), 'score': round(float(np.mean([t.score for t in s])), 3)} for s in spans]
        db = rms_db(x)
        peak = float(db.max())
        centre = lambda i: (i * 80 + 80) / SR * 1000
        seams, seam_db = [], []
        for a, b in zip(spans_ms, spans_ms[1:]):
            lo, hi = (a['end'], b['start']) if b['start'] - a['end'] >= 10 else (b['start'] - 15, a['end'] + 15)
            idx = [i for i in range(len(db)) if lo <= centre(i) <= hi]
            i = min(idx, key=lambda i: db[i]) if idx else None
            if i is None or db[i] - peak > VOICED_DB:
                # no gap and no consonant dip, one vowel gliding into the next: the quietest frame is noise, take the middle
                mid = (lo + hi) / 2
                i = min(range(len(db)), key=lambda n: abs(centre(n) - mid))
            seams.append(round(centre(i)))
            seam_db.append(round(float(db[i]) - peak, 1))
        out[job['key']] = {'words': job['words'], 'said': words, 'spans': spans_ms, 'seams': seams, 'seamDb': seam_db, 'ms': round(len(x) / SR * 1000)}
    json.dump(out, sys.stdout, ensure_ascii=False)


if __name__ == '__main__':
    main()
