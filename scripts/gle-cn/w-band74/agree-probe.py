#!/usr/bin/env python3
"""Trap-aware re-measure of the 'I agree' question for seeds 83/84.

Traps handled explicitly:
  - binary-classified files: read in Python, never grep
  - apostrophes: folded to U+0027 in the corpus before matching
  - mutation/inflection: patterns cover the inflected and mutated shapes
  - positive controls: printed BEFORE any finding
"""
import os
import re

DIRS = [os.path.expanduser('~/.gle-cn-corpus'), '/tmp']
CONTROLS = [('Gaeilge', 121), ('duine', 521), ('bhi', 3133)]
APOS = re.compile('[‘’ʼ´`]')


def find(vol):
    for d in DIRS:
        p = os.path.join(d, vol + '.txt')
        if os.path.exists(p):
            return p
    return None


txt = {}
for i in (1, 2, 3, 4):
    p = find('vol%d' % i)
    if p is None:
        print('GAP: vol%d.txt missing - its 0 is an artefact, not attestation' % i)
        txt['vol%d' % i] = ''
    else:
        txt['vol%d' % i] = APOS.sub("'", open(p, encoding='utf-8', errors='replace').read())


def count(pat):
    return {k: len(re.findall(pat, s)) for k, s in txt.items()}


def show(label, pat):
    c = count(pat)
    print('%-34s %s  TOTAL=%d' % (label, ' '.join('%s=%d' % (k, v) for k, v in c.items()), sum(c.values())))
    return sum(c.values())


print('=== CALIBRATION (must pass before any finding below is readable) ===')
for w, exp in [('Gaeilge', 121), ('duine', 521), ('bhí', 3133)]:
    got = sum(count(w).values())
    print('  %-10s got=%-6d expected~%-6d %s' % (w, got, exp, 'OK' if abs(got - exp) <= 2 else 'MISMATCH'))

print()
print('=== A. the form the course currently uses: aont- ===')
show('aont- (all, raw)', r'aont')
show('  minus laonta/garranta/amanta', r'(?<![a-z])aont')
show('aontaigh / aontai- (verb)', r"aonta[ií]")
show('aontaim (1sg present)', r'aonta[ií]m')
show('aontaionn', r'aonta[ií]onn')
show('aontu (verbal noun)', r'aontú')
show("d'aontaigh / d'aontaiodar", r"d'aonta")
show('n-aontaim (eclipsed)', r'n-?aonta')
show('haontu (h-prefixed)', r'haont')

print()
print('=== B. the alternative frame: ta an ceart agat ===')
show('ceart (bare - frame control)', r'ceart')
show('an ceart', r'an ceart')
show('ceart aga-/aige/aici/acu', r"ceart ag|ceart a'")
show("agat (SECOND-WORD CONTROL)", r'agat')
show("a'd (THE REAL ORTHOGRAPHY FOR agat)", r"a'd\b")
show('ceart a\'d  <-- the actual idiom', r"ceart a'd")
show('an ceart a\'d', r"an ceart a'd")
show('ceart a\'m (1sg)', r"ceart a'm")
show('agam (control)', r'agam')

print()
print('=== C. contexts, so the counts can be read rather than trusted ===')
for k, s in txt.items():
    for m in re.finditer(r"ceart a'd|an ceart", s):
        print('[%s] ...%s...' % (k, s[max(0, m.start() - 110):m.end() + 110].replace('\n', ' ')))
for k in ('vol3', 'vol4'):
    for m in re.finditer(r"aonta[ií]gh, v", txt[k]):
        print('[%s] ...%s...' % (k, txt[k][max(0, m.start() - 230):m.end() + 230].replace('\n', ' ')))
