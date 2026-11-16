import json,re,sys
from syl import syl
c=json.load(open(sys.argv[1] if len(sys.argv)>1 else 'live-snapshot.json'));S=c['S'];LA=c['LA'];R=c['rows']
def tok(t): return [w for w in re.sub(r"[.,?!;:]",' ',t.lower()).split()]
def find(seq,sub):
    return [i for i in range(len(seq)-len(sub)+1) if seq[i:i+len(sub)]==sub]
taught={}   # tuple(tokens) -> first lego id (new)
order=sorted(LA,key=lambda k:(LA[k]['seed_number'],LA[k]['lego_index']))
res={}
for n in range(1,301):
    st=tok(S[str(n)]['target']); cov=[None]*len(st)
    mine=[k for k in order if LA[k]['seed_number']==n]
    notin=[]
    for k in mine:
        lt=tok(LA[k]['target_text']); f=find(st,lt)
        if not f: notin.append(k)
        for i in f:
            for j in range(i,i+len(lt)): cov[j]=cov[j] or k
    # register taught
    early=[]
    for k in mine:
        l=LA[k]; key=(tuple(tok(l['target_text'])))
        if l['is_new']:
            taught.setdefault(key,k)
        else:
            if key not in taught: early.append(k)
    unc=[i for i,x in enumerate(cov) if x is None]
    # try to cover uncovered by taught pieces (longest first)
    cov2=list(cov)
    keys=sorted(taught,key=lambda t:-len(t))
    for key in keys:
        for i in find(st,list(key)):
            if all(cov2[j] is None for j in range(i,i+len(key))):
                for j in range(i,i+len(key)): cov2[j]='T:'+taught[key]
    gap=[st[i] for i,x in enumerate(cov2) if x is None]
    taughtspan=sorted({cov2[i] for i in unc if cov2[i]})
    res[n]={'notin':notin,'darkfirst':early,'unc':[st[i] for i in unc],'gap':gap,'taughtspan':taughtspan,'nonew':not any(LA[k]['is_new'] for k in mine)}
if __name__=='__main__':
    tot={'notin':0,'dark':0,'gapseeds':0,'uncseeds':0,'nonew':0}
    for n,r in res.items():
        if r['notin'] or r['darkfirst'] or r['unc'] or r['nonew']:
            print(n,'| notin',[k[5:] for k in r['notin']],'| dark',[k[5:] for k in r['darkfirst']],'| uncovered',' '.join(r['unc']),'| untaught',' '.join(r['gap']),'| NONEW' if r['nonew'] else '')
        tot['notin']+=len(r['notin']);tot['dark']+=len(r['darkfirst']);tot['gapseeds']+=bool(r['gap']);tot['uncseeds']+=bool(r['unc']);tot['nonew']+=r['nonew']
    print(tot)
