# Read-only census of the B6-partial + B7-no-relation LEGOs (the ~565). For each: is there a window of the SEED target
# that is a near-variant of the LEGO target (candidate "one provably correct value")? Does the LEGO's known text sit in the seed's known text?
# How many BUILD/USE phrases would a LEGO-target change cascade into?
import json,os,re,subprocess,difflib,unicodedata,collections
d=json.load(open(os.environ['CS_SCRATCH']+'/lego-vs-seed.json'))
ids=[(k.split('|')[0],k.split('|')[1],v) for k,v in d.items() if v['bucket'] in('B6-partial','B7-no-relation')]
def q(sql):
    r=subprocess.run(['psql',os.environ['DATABASE_URL'],'-At','-c',f"select coalesce(json_agg(zz),'[]') from ({sql}) zz"],capture_output=True,text=True,check=True); return json.loads(r.stdout)
courses=sorted({c for c,_,_ in ids})
def norm(s): return re.sub(r'[\W_]+',' ',unicodedata.normalize('NFC',(s or '').lower())).strip()
seeds={};legos={};phr=collections.defaultdict(list)
for c in courses:
    for r in q(f"select seed_number n,known_text k,target_text t from course_seeds where course_code='{c}'"): seeds[(c,r['n'])]=r
    for r in q(f"select seed_number n,lego_index i,known_text k,target_text t from course_legos where course_code='{c}'"): legos[(c,r['n'],r['i'])]=r
    for r in q(f"select seed_number n,lego_index i,phrase_role ro,target_text t from course_practice_phrases where course_code='{c}' and phrase_role in('build','use','practice')"): phr[(c,r['n'],r['i'])].append(r)
out=[]
for c,i,v in ids:
    m=re.match(r'.+:S(\d+)L(\d+)$',i); n,l=int(m[1]),int(m[2])
    s=seeds.get((c,n)); g=legos.get((c,n,l))
    if not s or not g: out.append({'id':i,'course':c,'bucket':v['bucket'],'missing':True}); continue
    lt=norm(g['t']); st=norm(s['t']); stoks=st.split(); ltoks=lt.split()
    best=(0,None)
    for w in range(max(1,len(ltoks)-1),len(ltoks)+2):
        for a in range(0,max(1,len(stoks)-w+1)):
            win=' '.join(stoks[a:a+w]); r=difflib.SequenceMatcher(None,lt,win).ratio()
            if r>best[0]: best=(r,win)
    kin=norm(g['k']) in norm(s['k'])
    ncasc=sum(1 for p in phr[(c,n,l)] if g['t'].strip() in p['t'])
    out.append({'id':i,'course':c,'bucket':v['bucket'],'lego_known':g['k'],'lego_target':g['t'],'seed_known':s['k'],'seed_target':s['t'],'best_window':best[1],'sim':round(best[0],2),'known_in_seed':kin,'phrases_containing':ncasc,'phrases_total':len(phr[(c,n,l)])})
json.dump(out,open('ops/967-lego-seed/census.json','w'),ensure_ascii=False,indent=1)
print(len(out))
