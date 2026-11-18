# Checks the LIVE course (a saved Popty GET .../seeds answer) for seeds 1-300: every word covered by a LEGO
# (frames by subsequence, stand-in "it" allowed), no LEGO over 8 syllables, no new-LEGO clash (one English, two Irish),
# every new LEGO has practice, and LEGO order equals the plan. Usage: python3 verify.py <seeds.json>
import json,sys,collections
from build import tok,dm,demut,find,subseq
from syl import syl
raw={s['seed_number']:s for s in json.load(open(sys.argv[1]))['seeds']}
P=json.load(open('plan.json'))['plan']
gaps=[];long=[];clash=collections.defaultdict(set);empty=[];order=[];notin=[]
for n in range(1,301):
    s=raw[n]; st=tok(s['target_text']); cov=[False]*len(st)
    L=sorted(s['legos'],key=lambda l:l['lego_index'])
    for l in L:
        lt=tok(l['target_text']); f=find(st,lt) or find(dm(st),dm(lt))
        if f:
            for a in f:
                for j in range(a,a+len(lt)): cov[j]=True
        else:
            lt2=[w for w in lt if w in st or demut(w) in dm(st)]
            ix=subseq(st,lt2) or subseq(dm(st),dm(lt2))
            if ix:
                for j in ix: cov[j]=True
            else: notin.append((n,l['target_text']))
        if l['is_new']:
            if syl(l['target_text'])>8: long.append((n,l['target_text']))
            clash[l['known_text'].lower().strip('?')].add(l['target_text'].lower().strip('?'))
            if not [p for p in l.get('basket_phrases') or [] if p['phrase_role']!='component']: empty.append((n,l['lego_id']))
    g=[st[j] for j in range(len(st)) if not cov[j]]
    if g: gaps.append((n,' '.join(g)))
    want=[w['target'].lower() for w in P[str(n)]['legos']]; got=[l['target_text'].lower() for l in L]
    if sorted(want)!=sorted(got) or want!=got: order.append(n)
cl={k:v for k,v in clash.items() if len(v)>1}
print('gaps',gaps); print('not in seed',notin); print('long',long); print('clash',cl); print('new LEGO without practice',empty); print('order differs from plan',order)
