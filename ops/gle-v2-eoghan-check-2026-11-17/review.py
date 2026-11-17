import json,sys,difflib,re
sys.path.insert(0,'../gle-v2-eoghan-sheet-2026-11-17')
from helpers import nrm,fada,SYN1
rows=json.load(open('classified.json'))
C={};cur=None
for ln in open('../gle-v2-eoghan-sheet-2026-11-17/comments.txt',encoding='utf-8').read().split('\n'):
    if ln.startswith('#'): continue
    m=re.match(r'@(\d+) \| (.*)$',ln)
    if m: cur=int(m.group(1)); C[cur]=''; continue
    if cur is not None and ln.strip() and not C[cur]: C[cur]=ln.strip()
def toks(s):
    out=[]
    for w in nrm(re.sub(r'\[[^\]]*\]','',s)).split(): out+= list(SYN1[w]) if w in SYN1 else [w]
    return out
def d(a,b):
    A,B=toks(a),toks(b); sm=difflib.SequenceMatcher(None,[fada(x) for x in A],[fada(x) for x in B]); o=[]
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag!='equal': o.append('{%s→%s}'%(' '.join(A[i1:i2]),' '.join(B[j1:j2])))
    return ' '.join(o)
want=sys.argv[1].split(','); lo,hi=int(sys.argv[2]),int(sys.argv[3])
for x in rows:
    if x['cls'] in want and lo<=x['seed']<=hi:
        n=x['seed']; same=fada(nrm(x['sent']))==fada(nrm(x['live']))
        print(f"{n} {x['cls'][:1]}{'' if same else '*'} L: {x['live']}\n   H: {x['his']}"+(f" [G:{x['his_note'][:80]}]" if x['his_note'] else '')+f"\n   Δ {d(x['live'],x['his'])}\n   448: {C.get(n,'(no entry)') or '(blank)'}")
