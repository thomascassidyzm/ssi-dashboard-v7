import json,sys,difflib,re,os
sys.path.insert(0,'../gle-v2-eoghan-sheet-2026-11-17')
from helpers import nrm,fada,SYN1
rows=json.load(open('classified.json'))
def toks(s):
    out=[]
    for w in nrm(re.sub(r'\[[^\]]*\]','',s)).split():
        if w in SYN1: out+=list(SYN1[w])
        else: out.append(w)
    return out
def d(a,b):
    A,B=toks(a),toks(b); sm=difflib.SequenceMatcher(None,[fada(x) for x in A],[fada(x) for x in B]); o=[]
    for tag,i1,i2,j1,j2 in sm.get_opcodes():
        if tag!='equal': o.append('{%s→%s}'%(' '.join(A[i1:i2]),' '.join(B[j1:j2])))
    return ' '.join(o)
want=sys.argv[1].split(','); lo,hi=int(sys.argv[2]),int(sys.argv[3])
for x in rows:
    if x['cls'] in want and lo<=x['seed']<=hi:
        print(f"{x['seed']} {x['cls']}\n L: {x['live']}\n H: {x['his']}"+(f"  [G:{x['his_note']}]" if x['his_note'] else '')+f"\n live→his: {d(x['live'],x['his'])}"+('' if fada(nrm(x['sent']))==fada(nrm(x['live'])) else f"\n sent→live: {d(x['sent'],x['live'])}"))
