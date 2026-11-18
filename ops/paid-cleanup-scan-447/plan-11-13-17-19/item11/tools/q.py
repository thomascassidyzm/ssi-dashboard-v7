"""Read-only helpers over $CS_SCRATCH/dumps/<course>.json (mkdump.py output). No network.
  python3 -I q.py find <course> <text> [--known]     LEGOs whose target (or known) contains <text>, in course order
  python3 -I q.py vocab <course> <seed> <lego_idx> "<target phrase>" ["<phrase>"...]
        P1 check: words of the phrase NOT found, in that exact form, inside any LEGO target taught before this LEGO
        (seed < n, or same seed and idx <= lego_idx). For spaceless scripts it prints the greedy cover instead.
  python3 -I q.py rows <course> <text> [--known]     phrase rows containing <text> (first 40), with their LEGO"""
import json,os,re,sys,unicodedata
def norm(t):
    t=unicodedata.normalize('NFC',t or '').lower(); t=re.sub(r"[’‘`]","'",t)
    t=re.sub(r"[\.,!?¿¡;:\"“”«»。，！？、；：（）()\[\]…—–\-।॥؟،۔]+"," ",t); return re.sub(r'\s+',' ',t).strip()
cmd,course=sys.argv[1],sys.argv[2]
D=json.load(open(os.environ['CS_SCRATCH']+f'/dumps/{course}.json'))
L=[(s['n'],l) for s in D['seeds'] for l in s['legos']]
if cmd=='find':
    side='known' if '--known' in sys.argv else 'target'; x=norm(sys.argv[3])
    for n,l in L:
        a=norm(l[side])
        if x in a or x.replace(' ','') in a.replace(' ',''):
            print(l['id'],'NEW' if l['is_new'] else 'old',l['type'],'|',l['known'],'|',l['target'])
elif cmd=='rows':
    side='known' if '--known' in sys.argv else 'target'; x=norm(sys.argv[3]); c=0
    for n,l in L:
        for p in l['phrases']:
            if x in norm(p[side]) and c<40:
                c+=1; print(l['id'],p['id'][-3:],p['type'][:3],'|',p['known'],'|',p['target'])
elif cmd=='vocab':
    n0,i0=int(sys.argv[3]),int(sys.argv[4])
    taught=set(); tl=[]
    for n,l in L:
        if n<n0 or (n==n0 and l['idx']<=i0):
            t=norm(l['target']); tl.append(t)
            for w in t.split(): taught.add(w)
    for ph in sys.argv[5:]:
        t=norm(ph)
        if re.search(r'[぀-ヿ㐀-鿿]',t):
            s=t.replace(' ',''); cov=[False]*len(s)
            for x in sorted({y.replace(' ','') for y in tl},key=len,reverse=True):
                for m in re.finditer(re.escape(x),s) if x else []:
                    for k in range(m.start(),m.end()): cov[k]=True
            miss=''.join(ch if not c else '·' for ch,c in zip(s,cov))
            print('OK ' if all(cov) else 'MISS',ph,'| uncovered:',miss if not all(cov) else '')
        else:
            miss=[w for w in t.split() if w not in taught]
            print('OK ' if not miss else 'MISS',ph,'|',miss)
