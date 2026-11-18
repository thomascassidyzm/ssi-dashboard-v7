#!/usr/bin/env python3
"""Romanisation for NEW target text in zho courses (cs #714·AI), from the course's OWN readings (lexicon/lex-<course>.json,
harvested by lexicon_zho.py from every row's target_text_roman via Popty's basket route). Longest-match over words the course
already spells; a character with more than one reading in the course outside a known word is returned in `flags` for a
hand read (polyphones need a reader — roman-sync.cjs). decisions may override any text via ROMAN = {text: roman}."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_lex = {}
HAN = re.compile(r'[㐀-鿿]')


def lex(course):
    if course not in _lex:
        f = os.path.join(ROOT, 'lexicon', f'lex-{course}.json')
        _lex[course] = json.load(open(f)) if os.path.exists(f) else None
    return _lex[course]


def roman(course, text, override=None):
    if override and text in override:
        return override[text], []
    L = lex(course)
    if not L:
        return None, ['no lexicon']
    W, C = L['words'], L['char']
    out, flags, i = [], [], 0
    t = text
    while i < len(t):
        ch = t[i]
        if not HAN.match(ch):
            p = {'？': '?', '?': '?', '，': ',', ',': ',', '！': '!'}.get(ch)
            if p and out:
                out[-1] += p
            i += 1
            continue
        hit = None
        for n in range(min(5, len(t) - i), 1, -1):
            w = t[i:i + n]
            if w in W:
                hit = (w, max(W[w].items(), key=lambda x: x[1])[0])
                break
        if hit:
            out.append(hit[1].replace(' ', ''))
            i += len(hit[0])
            continue
        r = C.get(ch)
        if not r:
            flags.append(f'{ch}: no reading in course')
            out.append('?')
        else:
            best = sorted(r.items(), key=lambda x: -x[1])
            import unicodedata as _u
            _b = lambda y: ''.join(c for c in _u.normalize('NFD', y) if _u.category(c) != 'Mn')
            alt = [y for y, n in best[1:] if n >= 0.2 * best[0][1] and len(y) > 1 and (_b(y) != _b(best[0][0]) or ch not in '不一')]
            alt = [y for y in alt if _b(y)[0] == _b(best[0][0])[0] or _b(y) != _b(best[0][0])]
            if alt and not (ch in '不一' and all(_b(y) == _b(best[0][0]) for y in alt)):
                flags.append(f'{ch}: {best[0][0]} (also {alt[0]})')
            out.append(best[0][0])
        i += 1
    return ' '.join(out), flags
