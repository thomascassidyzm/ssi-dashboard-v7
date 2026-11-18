# Builds the target LEGO layer for seeds 1-300 from live-snapshot.json + cuts.txt, computes new/not-new
# (first exact known+target pair in course order is new), checks it, and writes plan.json.
# cuts.txt:  "@N" or "@N known | target" starts a seed (text given = seed text changes);
#            "known | target" is a LEGO, in teaching order; a leading "~" marks a wrap frame
#            (its words appear in the seed in order but not side by side); "#" starts a comment;
#            a trailing "  ## note" on a LEGO line is carried into the plan as a caveat.
# Seeds not in cuts.txt keep their live LEGOs; any uncovered span that an existing pair
# (anywhere in the plan) covers gets that pair added as a LEGO here.
import json,re,sys
from syl import syl
c=json.load(open('live-snapshot.json'));S=c['S'];LA=c['LA'];R=c['rows']
def tok(t): return [w for w in re.sub(r"[.,?!;:]",' ',t.lower()).split()]
def demut(w):
    w0=w
    for p in ('bhf','mb','gc','nd','ng','bp','dt','n-','t-','h'):
        if w.startswith(p) and len(w)>len(p)+1:
            if p=='h' and w[1] not in 'aeiouáéíóú': continue
            if p in('mb','gc','nd','ng','bp','dt','bhf') :
                return w[len(p)-1:] if p!='bhf' else 'f'+w[3:]
            return w[len(p):]
    if len(w)>2 and w[1]=='h' and w[0] in 'bcdfgmpst': return w[0]+w[2:]
    return w0
def dm(seq): return [demut(w) for w in seq]
def find(seq,sub): return [i for i in range(len(seq)-len(sub)+1) if seq[i:i+len(sub)]==sub]
def subseq(seq,sub):
    idx=[];i=0
    for w in sub:
        while i<len(seq) and seq[i]!=w: i+=1
        if i==len(seq): return None
        idx.append(i); i+=1
    return idx
cuts={};seedtext={};cur=None;relabel={}
for line in open('cuts.txt',encoding='utf8'):
    line=line.rstrip('\n')
    if not line.strip() or line.lstrip().startswith('#'): continue
    if line.startswith('='):
        note=''
        if '##' in line: line,note=line.split('##',1); note=note.strip()
        m=re.match(r'=(S\d{4}L\d{2})\s+(.*)',line); k,t=[x.strip() for x in m.group(2).split(' | ')]
        relabel[m.group(1)]=(k,t,note); continue
    if line.startswith('@'):
        m=re.match(r'@(\d+)\s*(.*)',line); cur=int(m.group(1)); cuts[cur]=[]
        if m.group(2).strip():
            k,t=[x.strip() for x in m.group(2).split(' | ')]; seedtext[cur]=(k,t)
        continue
    note=''
    if '##' in line: line,note=line.split('##',1); note=note.strip()
    line=line.strip(); frame=line.startswith('~'); standin=line.startswith('~~')
    line=line.lstrip('~').strip()
    k,t=[x.strip() for x in line.split(' | ')]
    cuts[cur].append({'known':k,'target':t,'frame':frame,'standin':standin,'note':note})
plan={}
for n in range(1,301):
    s=S[str(n)]; kn,tg=seedtext.get(n,(s['known'],s['target']))
    if n in cuts: L=[dict(x,src='cut') for x in cuts[n]]
    else:
        L=[{'known':relabel.get(k,(LA[k]['known_text'],))[0],'target':LA[k]['target_text'],'frame':False,'note':relabel.get(k,('','',''))[2],'src':'live','live':k} for k in sorted(LA) if LA[k]['seed_number']==n]
    plan[n]={'known':kn,'target':tg,'legos':L,'text_changes':n in seedtext}
# all pairs known to the plan, longest first, for auto-completion
allp={}
for n in plan:
    for l in plan[n]['legos']:
        if not l['frame']: allp.setdefault(tuple(tok(l['target'])),(l['known'],l['target']))
keys=sorted(allp,key=lambda t:-len(t))
def coverage(n):
    st=tok(plan[n]['target']); cov=[None]*len(st); bad=[]
    for i,l in enumerate(plan[n]['legos']):
        lt=tok(l['target'])
        if l['frame']:
            if l.get('standin'): lt=[w for w in lt if w in st or demut(w) in dm(st)]
            ix=subseq(st,lt) or subseq(dm(st),dm(lt))
            if ix is None: bad.append(l); continue
            for j in ix: cov[j]=cov[j] if cov[j] is not None else i
            continue
        f=find(st,lt) or find(dm(st),dm(lt))
        if not f: bad.append(l)
        for a in f:
            for j in range(a,a+len(lt)): cov[j]=cov[j] if cov[j] is not None else i
    return st,cov,bad
auto=[]
for n in range(1,301):
    st,cov,bad=coverage(n)
    if all(x is not None for x in cov): continue
    for key in keys:
        for a in (find(st,list(key)) or find(dm(st),dm(list(key)))):
            if all(cov[j] is None for j in range(a,a+len(key))):
                k,t=allp[key]
                if not any(l['target'].lower()==t.lower() and l['known'].lower()==k.lower() for l in plan[n]['legos']):
                    plan[n]['legos'].append({'known':k,'target':t,'frame':False,'note':'','src':'auto'}); auto.append((n,k,t))
                for j in range(a,a+len(key)): cov[j]=-1
# new / not-new
first={};issues={'gap':[],'notin':[],'long':[],'clash':{},'nonew':[]}
for n in range(1,301):
    anynew=False
    for i,l in enumerate(plan[n]['legos']):
        key=(l['known'].lower().strip('?'),l['target'].lower().strip('?'))
        l['is_new']=key not in first
        if l['is_new']: first[key]=(n,i); anynew=True
        l['first']=first[key][0]; l['syl']=syl(l['target'])
        if l['syl']>8 and l['is_new']: issues['long'].append((n,l['known'],l['target'],l['syl']))
        if l['is_new']: issues['clash'].setdefault(l['known'].lower(),{}).setdefault(l['target'].lower(),n)
    st,cov,bad=coverage(n)
    gap=[st[j] for j,x in enumerate(cov) if x is None]
    if gap: issues['gap'].append((n,' '.join(gap),plan[n]['target']))
    for l in bad: issues['notin'].append((n,l['known'],l['target']))
    if not anynew: issues['nonew'].append(n)
issues['clash']={k:v for k,v in issues['clash'].items() if len(v)>1}
json.dump({'plan':plan,'auto_added':auto,'issues':issues},open('plan.json','w'),ensure_ascii=False,indent=0)
if __name__=='__main__':
    print('GAPS',len(issues['gap']));[print('  ',*g) for g in issues['gap']]
    print('NOT IN SEED',len(issues['notin']));[print('  ',*g) for g in issues['notin']]
    print('LONG',len(issues['long']));[print('  ',*g) for g in issues['long']]
    print('CLASH',len(issues['clash']));[print('  ',k,v) for k,v in issues['clash'].items()]
    print('NO NEW LEGO',issues['nonew']); print('auto-added',len(auto))
