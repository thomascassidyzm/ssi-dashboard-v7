# Read-only lookups over course.json (built from Popty GET /seeds). Usage:
#   q.py first <n> "<irish text>"   first LEGO/component position of each word (flags words not taught by seed n)
#   q.py g <regex> [k|t] [L|P|S]    grep LEGOs / phrases / seeds on known (k) or target (t, default)
import json,re,os,sys
c=json.load(open(os.path.join(os.environ['CS_SCRATCH'],'course.json')));S=c['S'];LA=c['LA'];R=c['rows']
TOK=re.compile(r"[a-záéíóúA-ZÁÉÍÓÚ'’-]+")
toks=lambda s:[t.lower().strip("'’-") for t in TOK.findall(s or '') if t.strip("'’-")]
order=lambda k:(int(k[1:5]),int(k[6:8]))
first={}
for k in sorted(LA,key=order):
    l=LA[k]
    for t in toks(l['target_text'])+[x for cc in (l.get('components') or []) for x in toks(cc.get('target'))]: first.setdefault(t,k)
if sys.argv[1]=='first':
    n=int(sys.argv[2])
    for t in toks(sys.argv[3]):
        f=first.get(t); print(('  ' if f and int(f[1:5])<=n else '!!'),t,f, (LA[f]['known_text']+' | '+LA[f]['target_text']) if f else '')
else:
    rx=re.compile(sys.argv[2],re.I); side=sys.argv[3] if len(sys.argv)>3 else 't'; wh=sys.argv[4] if len(sys.argv)>4 else 'LPS'
    f='known' if side=='k' else 'target'
    if 'S' in wh:
        for n in sorted(S,key=int):
            if rx.search(S[n][f]): print('SEED',n,'|',S[n]['known'],'|',S[n]['target'])
    if 'L' in wh:
        for k in sorted(LA,key=order):
            l=LA[k]
            if rx.search(l[f+'_text']) or (side=='t' and any(rx.search(cc.get('target') or '') for cc in l.get('components') or [])): print('LEGO',k,'NEW' if l['is_new'] else 'old','|',l['known_text'],'|',l['target_text'],'|',' + '.join(f"{cc.get('known')}={cc.get('target')}" for cc in l.get('components') or []))
    if 'P' in wh:
        for k in sorted(R):
            r=R[k]
            if r['phrase_role']!='component' and rx.search(r[f+'_text']): print(k,'|',r['known_text'],'|',r['target_text'])
