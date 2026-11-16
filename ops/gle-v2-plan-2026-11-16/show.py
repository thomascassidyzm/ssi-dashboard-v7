import json,sys
from syl import syl
c=json.load(open('live-snapshot.json'));S=c['S'];LA=c['LA'];R=c['rows']
cnt={}
for k,r in R.items():
    d=cnt.setdefault(r['lego'],{'build':0,'use':0,'component':0}); d[r['phrase_role']]=d.get(r['phrase_role'],0)+1
a,b=int(sys.argv[1]),int(sys.argv[2])
for n in range(a,b+1):
    s=S[str(n)]; print(f"{n} | {s['known']} | {s['target']}")
    for k in sorted(l for l in LA if LA[l]['seed_number']==n):
        l=LA[k]; d=cnt.get(k,{})
        print(f"   {k[5:]} {'N' if l['is_new'] else '-'}{l['type']} {syl(l['target_text'])} {l['known_text']} | {l['target_text']}  [{d.get('build',0)}b{d.get('use',0)}u]")
