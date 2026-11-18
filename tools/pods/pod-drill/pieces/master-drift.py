import json,os,re,unicodedata,collections,sys
import os.path
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','..','..','ops','pod-drill')  # Popty ops/pod-drill (job #628)
def L(t): return re.sub(r'[^\w]','',unicodedata.normalize('NFKC',t).lower())
master={}
for line in open(f'{D}/_eng-shared/split.txt'):
    line=line.rstrip('\n')
    if not line.strip(): continue
    ps=[p.strip() for p in line.split('||')]
    master[L(''.join(ps))]=ps
def bounds(ps):
    out=[];n=0
    for p in ps[:-1]: n+=len(L(p)); out.append(n)
    return set(out)
courses=[d for d in sorted(os.listdir(D)) if os.path.exists(f'{D}/{d}/plan.json')]
res=collections.defaultdict(list); extra=collections.defaultdict(lambda: collections.Counter()); xcount=collections.Counter()
for c in courses:
    plan=json.load(open(f'{D}/{c}/plan.json')); course=plan['course']; eng_side=0 if course.startswith('eng_for_') else 1
    for t in plan['turns']:
        if not t.get('pieces'): continue
        E=[p[eng_side] for p in t['pieces']]; key=L(''.join(E))
        M=master.get(key)
        if M is None: res[course].append(('reworded/no-master',t['id'],' || '.join(E))); continue
        x=bounds(E)-bounds(M)
        if x:
            res[course].append(('extra-cut',t['id'],' || '.join(E),' || '.join(M)))
            if eng_side==1:
                for b in x: extra[key][b]+=1
        if eng_side==1: xcount[key]+=1
summ={c:collections.Counter(r[0] for r in v) for c,v in res.items()}
for c in courses:
    course=json.load(open(f'{D}/{c}/plan.json'))['course']; print(course, dict(summ.get(course,{})))
print('--- extra cuts in X_for_eng, by master line: cut made by n of m courses')
for key,cnt in extra.items():
    M=master[key]
    for b,n in cnt.items():
        # show where
        s=' '.join(M); 
        print(n,'/',xcount[key],' || '.join(M),'@',b)
if len(sys.argv)>1:
    for c,v in res.items():
        if c==sys.argv[1]:
            for r in v: print(r)

def cut_at(ps,b):
    # split master pieces at letter offset b, return new piece list
    out=[];n=0
    for p in ps:
        lp=len(L(p))
        if n<b<n+lp:
            # find char index in p where letters count reaches b-n
            k=0;need=b-n
            for i,ch in enumerate(p):
                if L(ch): k+=1
                if k==need: idx=i+1;break
            # move trailing punctuation/space
            while idx<len(p) and not L(p[idx]) and p[idx]!=' ': idx+=1
            out+= [p[:idx].strip(), p[idx:].strip()]
        else: out.append(p)
        n+=lp
    return out
FOLD={}
for key,cnt in extra.items():
    for b,n in cnt.items():
        if n==xcount[key]: FOLD.setdefault(key,[]).append(b)
for key,bs in FOLD.items():
    ps=master[key]
    for b in sorted(bs,reverse=True): ps=cut_at(ps,b)
    print('FOLD', ' || '.join(master[key]), '  ==>  ', ' || '.join(ps))

if os.environ.get('WRITE'):
    out=[]
    for line in open(f'{D}/_eng-shared/split.txt'):
        line=line.rstrip('\n')
        if not line.strip(): out.append(line); continue
        ps=[p.strip() for p in line.split('||')]; key=L(''.join(ps))
        if key in FOLD:
            for b in sorted(FOLD[key],reverse=True): ps=cut_at(ps,b)
        out.append(' || '.join(ps))
    open('_eng-shared/split.txt','w').write('\n'.join(out)+'\n')
