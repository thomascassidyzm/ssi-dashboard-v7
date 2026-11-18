import json,glob,re
TOK=re.compile(r"[a-záéíóúñü]+",re.I)
def toks(s): return [t.lower() for t in TOK.findall(s or '')]
legos={}   # id -> dict
first={}   # token -> (seed,idx) first taught
phrases={} # text-key info: all phrases with lego id + position role guess
for f in glob.glob('seeds/*.json'):
    d=json.load(open(f)); 
    for lid,b in d.get('baskets',{}).items():
        s=int(lid[1:5]); i=int(lid[6:8])
        legos[lid]={'seed':s,'idx':i,'known':b['lego']['known'],'target':b['lego']['target'],'is_new':b['is_new'],'components':b.get('components') or [],'n':len(b['practice_phrases'])}
        for t in toks(b['lego']['target'])+[x for c in (b.get('components') or []) for x in toks(c.get('target'))]:
            if t not in first or (s,i)<first[t]: first[t]=(s,i)
        for p in b['practice_phrases']:
            phrases.setdefault(lid,[]).append(p)
def untaught(text,seed,idx):
    return [t for t in toks(text) if t not in first or first[t]>(seed,idx)]
def first_of(t): return first.get(t.lower())
# known->targets map over all phrases
k2t={}
for lid,ps in phrases.items():
    for p in ps:
        k=p['known'].strip().lower().rstrip('?.!'); k2t.setdefault(k,set()).add(p['target'].strip().lower().rstrip('?.!'))
