#!/usr/bin/env python3
"""
Probe Ó Curnáin, *The Irish of Iorras Aithneach, County Galway* (DIAS 2007), for
a form's frequency in Connemara.  Reads the four volumes' extracted text.

WHY THIS EXISTS RATHER THAN grep.  The volumes' bodies are largely phonetic
transcription in a custom font, which extracts as control bytes (6-13% of every
file).  grep classifies the files as binary and prints "Binary file matches"
instead of counting — so `grep -c` returns 0 for words that are demonstrably
present.  That trap produced a false zero for `Gaeilge` (real count 121) during
the 2026-08-20 open-calls pass.  Read them in Python, always.

USAGE:  python3 ocurnain-probe.py <regex> [<regex> ...]
        Volumes are expected at /tmp/vol{1,2,3,4}.txt, extracted from the four
        free DIAS PDFs with docs/gle-cn/pdfx.py.

ALWAYS CALIBRATE.  The script prints the known-positive controls first; if
`Gaeilge` does not come back at ~121 and `duine` at ~521, your extraction is
wrong and every zero below it is meaningless.

READING THE COUNTS.  Vol IV is a glossary and transcribed speech; vols I-III are
descriptive prose that cites forms phonetically.  So a form can be real and rare
in I-III for reasons that have nothing to do with the dialect.  Absence here is
weak evidence — the 1sg-present noise floor is 0 (ceapaim, cloisim and smaoiním
are all 0, and déanaim is 1).  And hunt homographs before reporting: 45 raw hits
for `éigin` are 1 indefinite pronoun and 44 tokens of `ar éigin` "barely" and
`b'éigin` "had to", which is a different lexeme entirely.
"""
import re
import sys

import os

# /tmp is shared between dispatched workers and can be cleaned mid-run. If the extracted volumes
# vanish, every probe silently returns 0 — and a zero from this tool is read as evidence of
# non-attestation, so a missing file would quietly become a linguistic ruling. Prefer the durable
# copy under $HOME, fall back to /tmp, and refuse to answer at all if neither is there.
CORPUS_DIRS = [os.path.expanduser('~/.gle-cn-corpus'), '/tmp']
CONTROLS = [('Gaeilge', 121), ('duine', 521), ('bhí', 3133)]


def _find(vol):
    for d in CORPUS_DIRS:
        p = os.path.join(d, f'{vol}.txt')
        if os.path.exists(p):
            return p
    return None


VOLS = {f'vol{i}': _find(f'vol{i}') for i in (1, 2, 3, 4)}


def load():
    out = {}
    for k, p in VOLS.items():
        if p is None:
            print(f'GAP: {k}.txt not found in {" or ".join(CORPUS_DIRS)} — extract it with '
                  f'docs/gle-cn/pdfx.py. Until then this volume contributes 0 to every count, '
                  f'and that 0 is an artefact, not attestation.', file=sys.stderr)
            continue
        out[k] = open(p, encoding='utf-8', errors='replace').read()
    return out


def count(texts, pattern):
    return {k: len(re.findall(pattern, v)) for k, v in texts.items()}


def cite(texts, pattern, per_vol=4, width=110):
    for k, t in texts.items():
        for m in list(re.finditer(pattern, t))[:per_vol]:
            s = t[max(0, m.start() - width):m.end() + width]
            s = ''.join(c if ord(c) >= 32 else '·' for c in s)
            yield k, re.sub(r'·+', '·', s)


def main(patterns):
    texts = load()
    if not texts:
        sys.exit('GAP: no volumes readable.')
    print('CALIBRATION (expected values are for all four volumes):')
    for word, expected in CONTROLS:
        got = sum(count(texts, word).values())
        flag = 'OK' if abs(got - expected) <= max(5, expected * 0.1) else '*** SUSPECT — do not trust any zero below'
        print(f'  {word:10} got={got:<6} expected≈{expected:<6} {flag}')
    print()
    for p in patterns:
        c = count(texts, p)
        print(f'{p!r:32} ' + ' '.join(f'{k}={v}' for k, v in c.items()) + f'  TOTAL={sum(c.values())}')
        for k, s in cite(texts, p):
            print(f'    [{k}] …{s}…')
        print()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
