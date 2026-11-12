# K group B (Kai, 12 Nov): K5 able = in ann, K6 should = ba chóir, K8 that is why / the reason = an chúis (cén fáth stays for questions).
# Each is a one-for-one swap in every seed, LEGO and phrase.
from lib import *
RULES=[('K5 able = in ann',[(r'ábalta','in ann')]),
       ('K6 should = ba chóir',[(r'\b(ba|níor|nár|ar|gur|nach|Ba|Níor|Nár|Ar|Gur|Nach) cheart\b',r'\1 chóir')]),
       ('K6 should = ba chóir',[(r'\bnach ceart (dom|duit|dúinn|dó|di|dóibh)\b',r'nach cóir \1')]),
       ('K8 the reason = an chúis',[(r'(?<![Cc]én )\b([Aa])n fáth\b',r'\1n chúis')])]
def conv(t):
    fams=[]
    for fam,pairs in RULES:
        t0=t
        for a,b in pairs: t=re.sub(a,b,t)
        if t!=t0: fams.append(fam)
    return t,' + '.join(fams)
for n in sorted(S,key=int):
    t,f=conv(S[n]['target'])
    if f: seed(int(n),None,t,f,f.split(' =')[0].split(' ')[0])
for k,l in sorted(LA.items()):
    t,f=conv(l['target_text']); cs=None; fc=''
    if l['components']:
        cs=[{'known':cc.get('known'),'target':conv(cc.get('target') or '')[0]} for cc in l['components']]
        if cs==[{'known':cc.get('known'),'target':cc.get('target') or ''} for cc in l['components']]: cs=None
    if f or cs:
        sd={}
        if f: sd['target_text']=t
        if cs: sd['components']=cs
        lego(k,f or conv(' '.join(c2['target'] for c2 in l['components']))[1],'swap',**sd)
for k,r in sorted(R.items()):
    t,f=conv(r['target_text'])
    if f: PH[k]=('upd',r['known_text'],t,f,'swap')
STALE=[r'ábalta',r'\b(ba|níor|nár|ar|gur) cheart',r'(?<![Cc]én )\ban fáth\b']
if __name__=='__main__':
    import collections
    print(collections.Counter(v[2] for v in SEED.values())); print(collections.Counter(v[1] for v in LEGO.values())); print(collections.Counter(v[3] for v in PH.values()))
    for k,v in sorted(LEGO.items()): print(k,LA[k]['target_text'],'→',json.dumps(v[0],ensure_ascii=False)[:160])
    for k,r in R.items():
        if re.search(r'nach ceart|go ceart',r['target_text']): print('  ?',k,r['known_text'][:80],'|',r['target_text'][:90])
# one prompt had two answers before this job (with and without 'é a dhéanamh'); made the same while the row is being touched
PH['S0276L03U09']=('upd',R['S0276L03U09']['known_text'],PH['S0276L05U03'][2],PH['S0276L03U09'][3],"swap; and 'é a dhéanamh' added so it matches S0276L05U03 (same English)")
