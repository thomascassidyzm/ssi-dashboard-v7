# Shared parsing + checks for the hyw_for_eng authoring files (cs #405·AI). No DB, no network.
import re, os, glob, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PUNCT = '։,՝՞՛՜.?!:;«»—–-…()"“”'
def norm_tokens(s):
    s = s.replace("'", '՚').replace('’', '՚')
    for ch in PUNCT: s = s.replace(ch, ' ' if ch in '—–-' else '')
    return [t for t in s.lower().split() if t]
def norm_known(s):
    return re.sub(r'\s+', ' ', re.sub(r"[.,!?;:\"“”]", '', s.lower())).strip()
VOW = 'աեէըիոօ'
def syllables(s):
    n = 0
    for t in norm_tokens(s):
        t = t.replace('՚', '')
        c = 0; i = 0
        while i < len(t):
            ch = t[i]
            if ch == 'ո' and i + 1 < len(t) and t[i+1] == 'ւ': c += 1; i += 2; continue
            if ch == 'ե' and i + 1 < len(t) and t[i+1] == 'ւ' and i + 2 == len(t): c += 1; i += 2; continue
            if ch in VOW: c += 1
            i += 1
        n += max(c, 1)
    return n
def load_gloss():
    g = {}
    p = os.path.join(HERE, 'gloss.tsv')
    if os.path.exists(p):
        for l in open(p, encoding='utf8'):
            l = l.rstrip('\n')
            if not l or l.startswith('#'): continue
            w, k = l.split('\t')[:2]
            g[norm_tokens(w)[0]] = k
    return g
def load_english():
    return {int(l.split('\t')[0]): l.rstrip('\n').split('\t')[1] for l in open(os.path.join(HERE, 'english-1-300.tsv'), encoding='utf8')}
def load_seeds():
    """-> list of seeds: {n, known, target, legos:[{idx, new, known, target, line}]}"""
    seeds = []; errs = []
    for f in sorted(glob.glob(os.path.join(HERE, 'seeds', '*.txt'))):
        for ln, l in enumerate(open(f, encoding='utf8'), 1):
            l = l.strip()
            if not l or l.startswith('#'): continue
            where = f'{os.path.basename(f)}:{ln}'
            parts = [p.strip() for p in l.split('|')]
            m = re.match(r'^S(\d+)$', parts[0])
            if m:
                if len(parts) != 3: errs.append(f'{where}: seed line needs "S<n> | english | target"'); continue
                seeds.append({'n': int(m.group(1)), 'known': parts[1], 'target': parts[2], 'legos': [], 'where': where}); continue
            m = re.match(r'^([+=])\s*(.*)$', parts[0])
            if m and len(parts) == 2 and seeds:
                s = seeds[-1]
                s['legos'].append({'idx': len(s['legos']) + 1, 'new': m.group(1) == '+', 'known': m.group(2).strip(), 'target': parts[1], 'where': where, 'seed': s['n']}); continue
            errs.append(f'{where}: cannot parse: {l}')
    return seeds, errs
def lego_id(seed, idx): return f'S{seed:04d}L{idx:02d}'
def load_phrases():
    """-> {lego_id: [{role:'build'|'use', known, target, where}]}"""
    out = {}; errs = []; cur = None
    for f in sorted(glob.glob(os.path.join(HERE, 'phrases', '*.txt'))):
        for ln, l in enumerate(open(f, encoding='utf8'), 1):
            l = l.strip()
            if not l or l.startswith('#'): continue
            where = f'{os.path.basename(f)}:{ln}'
            m = re.match(r'^@(S\d{4}L\d{2})\b', l)
            if m:
                cur = m.group(1)
                if cur in out: errs.append(f'{where}: {cur} appears twice')
                out.setdefault(cur, []); continue
            parts = [p.strip() for p in l.split('|')]
            if len(parts) == 3 and parts[0] in ('B', 'U') and cur:
                out[cur].append({'role': 'build' if parts[0] == 'B' else 'use', 'known': parts[1], 'target': parts[2], 'where': where}); continue
            errs.append(f'{where}: cannot parse: {l}')
    return out, errs
def subseq(needle, hay):
    """positions of needle tokens in hay as an in-order subsequence (greedy, prefers contiguous), or None"""
    n = len(needle)
    for i in range(len(hay) - n + 1):
        if hay[i:i+n] == needle: return list(range(i, i + n))
    pos = []; j = 0
    for i, t in enumerate(hay):
        if j < n and t == needle[j]: pos.append(i); j += 1
    return pos if j == n else None
def all_positions(needle, hay):
    """every position covered by a contiguous occurrence; falls back to the in-order subsequence"""
    n = len(needle); pos = set()
    for i in range(len(hay) - n + 1):
        if hay[i:i+n] == needle: pos.update(range(i, i + n))
    if pos: return sorted(pos)
    return subseq(needle, hay)
def contains(needle, hay):
    n = len(needle)
    return any(hay[i:i+n] == needle for i in range(len(hay) - n + 1))
