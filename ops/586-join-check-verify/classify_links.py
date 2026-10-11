import csv,re,collections,random,json
RX=re.compile(r"^The .+? for: '(.*?)'(?:, as in — '(.*?)')?, is:$")
def norm(s):
    s=(s or '').replace('’',"'").replace('‘',"'"); return re.sub(r'\s+',' ',s).strip().lower()
def alts(k):
    k=norm(k); parts=[p.strip() for p in re.split(r'\s*/\s*|\s*\|\s*',k) if p.strip()]
    out=set(parts+[k])
    for p in list(out):
        q=re.sub(r'\s*\(.*?\)','',p).strip(); out.add(q)
        if q.startswith('to '): out.add(q[3:])
    return out
def words(s): return set(re.findall(r"\w+",norm(s)))
rows=list(csv.DictReader(open('cl.csv',encoding='utf-8')))
res=[]
for r in rows:
    m=RX.match(r['text'])
    if m:
        x=m.group(1); r['x']=x; r['ctx']=m.group(2) or ''
        ka=alts(r['known_text']); xa=alts(x)
        if ka&xa: r['cls']='ok'
        else:
            kw=words(r['known_text']); xw=words(x)
            j=len(kw&xw)/max(1,len(kw|xw))
            r['cls']='near' if j>=0.4 or norm(x) in norm(r['known_text']) or norm(r['known_text']) in norm(x) else 'divergent'
            r['j']=round(j,2)
    else:
        r['x']='';r['ctx']=''
        # language-agnostic containment
        t=norm(r['text']); ka=[a for a in alts(r['known_text']) if a]
        r['cls']='ok-contain' if any(a in t for a in ka) else 'noncontain'
    res.append(r)
c=collections.Counter(r['cls'] for r in res); print(c, len(res))
by=collections.defaultdict(collections.Counter)
for r in res: by[r['course_code']][r['cls']]+=1
json.dump(res,open('cl-classified.json','w'),ensure_ascii=False)
bad=[r for r in res if r['cls'] in('divergent','noncontain')]
print('courses with parsed rows',len({r['course_code'] for r in res if r['x']}),'courses',len(by))
print(collections.Counter(r['course_code'] for r in bad).most_common(50))
