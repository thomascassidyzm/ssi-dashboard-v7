import json,os,re,collections
S=os.environ['CS_SCRATCH']
def norm(t): return re.sub(r"[^\w' ]"," ",t.lower().replace("’","'")).split()
def contains(ph,lego):
    a,b=norm(ph),norm(lego)
    return bool(b) and any(a[i:i+len(b)]==b for i in range(len(a)-len(b)+1))
class C:
    def __init__(s,c):
        s.c=c; s.d=json.load(open(f'{S}/{c.split("_")[2]}.json'))
        s.legos={}; s.ph={}; s.order=[]
        for sd in s.d['seeds']:
            for l in sd['legos']:
                s.legos[l['id']]=(sd,l); s.order.append(l['id'])
                for p in l['phrases']: s.ph[p['id']]=(sd,l,p)
    def vocab(s,lid,side='target'):
        v=set()
        for x in s.order:
            sd,l=s.legos[x]
            v|=set(norm(l[side]))
            for p in l['phrases']:
                if p['type']=='component': v|=set(norm(p[side]))
            if x==lid: break
        return v
    def firstseen(s,w,side='target'):
        for x in s.order:
            sd,l=s.legos[x]
            if w in norm(l[side]): return x+' '+l['known']+'='+l['target']
        return None
    def all(s):
        for x in s.order:
            sd,l=s.legos[x]
            for p in l['phrases']: yield sd,l,p
def stale(c):
    log=json.load(open(os.path.expanduser(f'~/ssi-evidence/ssi-dashboard-v7/ops/937-ita-tiles/{c}-changeset-plan-log.json')))
    return [r for r in log['rows'] if r.get('status')=='SKIP_PARENT_UNLOCATABLE']
