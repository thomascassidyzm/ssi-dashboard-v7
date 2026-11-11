# Index of spa_for_eng from a live GET /api/production/spa_for_eng/seeds dump: LEGOs, phrases, first-taught token, known->targets.
# Used only to SURFACE candidates and mechanical checks; every decision is made by reading the row (Kai: no regex decisions).
import json,re,sys
TOK=re.compile(r"[a-záéíóúñü]+",re.I)
def toks(s): return [t.lower() for t in TOK.findall(s or '')]
def load(path):
    api=json.load(open(path))
    L={};P={};first={};k2t={}
    for s in api['seeds']:
        for l in s.get('legos') or []:
            sn=l.get('seed_number') or s['seed_number']; lid=l['lego_id']
            L[lid]=dict(l,seed=sn,idx=int(lid[6:8]),phrases=[])
            for t in toks(l['target_text'])+[x for c in (l.get('components') or []) for x in toks(c.get('target'))]:
                if t not in first or (sn,L[lid]['idx'])<first[t]: first[t]=(sn,L[lid]['idx'])
            for p in l.get('basket_phrases') or []:
                pid=p['id'].split(':')[1]; P[pid]=dict(p,_lego=lid); L[lid]['phrases'].append(pid)
    for pid,p in P.items():
        if p['phrase_role']=='component': continue
        k=p['known_text'].strip().lower().rstrip('?.!'); k2t.setdefault(k,set()).add(p['target_text'].strip().lower().rstrip('?.!'))
    return api,L,P,first,k2t
def untaught(text,seed,idx,first):
    return [t for t in toks(text) if t not in first or first[t]>(seed,idx)]
norm=lambda s: ' '.join(re.sub(r"[^\wáéíóúñü' ]",' ',(s or '').lower().replace('’',"'")).split())
def contains(text,lego): return (' '+norm(lego)+' ') in (' '+norm(text)+' ')
