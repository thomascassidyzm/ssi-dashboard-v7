# Shared helpers for cs #343·AI (gle_v2: take Eoghan's line on 43 seeds). Reads a saved Popty
# GET /api/production/gle_v2_for_eng/seeds answer (never JSON course files).
import json,re,sys,os
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','gle-v2-apply-2026-11-16'))
from syl import syl
def tok(t): return [w for w in re.sub(r"[.,?!;:]",' ',(t or '').lower().replace('’',"'")).split()]
def demut(w):
    for p in ('bhf','mb','gc','nd','ng','bp','dt','n-','t-'):
        if w.startswith(p) and len(w)>len(p)+1: return ('f'+w[3:]) if p=='bhf' else (w[len(p)-1:] if p not in('n-','t-') else w[len(p):])
    if w.startswith('h') and len(w)>2 and w[1] in 'aeiouáéíóú': return w[1:]
    if len(w)>2 and w[1]=='h' and w[0] in 'bcdfgmpst': return w[0]+w[2:]
    return w
def dm(s): return [demut(w) for w in s]
def find(seq,sub): return [i for i in range(len(seq)-len(sub)+1) if sub and seq[i:i+len(sub)]==sub]
def contains(text,lego):
    a,b=tok(text),tok(lego); return bool(find(a,b) or find(dm(a),dm(b)))
def load(p):
    S={s['seed_number']:s for s in json.load(open(p))['seeds']}
    for s in S.values(): s['legos']=sorted(s.get('legos') or [],key=lambda l:l['lego_index'])
    return S
