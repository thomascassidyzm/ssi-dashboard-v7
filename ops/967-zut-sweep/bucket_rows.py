import json,glob,re,unicodedata,collections
def norm(t):
  t=t.lower(); t=re.sub('[ً-ْ]','',t); t=re.sub(r'[.,!?;:¿¡«»""\'\'。，！？؟،؛、：；"“”‘’]',' ',t); return re.sub(r'\s+',' ',t).strip()
cjk=lambda s: any('぀'<=ch<='鿿' or '가'<=ch<='힯' for ch in s)
def bucket(comp,seed):
  c=norm(comp); s=norm(seed)
  if c.replace(' ','') and c.replace(' ','') in s.replace(' ',''): return 'B0-space-only'
  c2=c.replace('ـ','').strip(); s2=s.replace('ـ','')
  if 'ـ' in comp and c2 in s2: return 'B1-tatweel-clitic'
  if re.search(r'\.\.\.|…',comp):
    parts=[norm(p) for p in re.split(r'\.\.\.|…',comp) if norm(p)]
    if all(p in s for p in parts): return 'B2-ellipsis-discontiguous'
  cw=c.split(); sw=s.split()
  # in-order subsequence
  it=iter(sw)
  if all(any(w==x for x in it) for w in cw): return 'B3-interposed-in-order'
  if collections.Counter(cw)<=collections.Counter(sw) : return 'B4-reordered'
  def stem_hit(w):
    if cjk(w): return any(w[0]==x[0] for x in sw) or w[0] in s
    n=max(3,int(len(w)*0.6))
    return any(x[:n]==w[:n] for x in sw) or (len(w)>=4 and w[:n] in s)
  if all(stem_hit(w) for w in cw): return 'B5-inflection-stem'
  if any(stem_hit(w) for w in cw): return 'B6-partial'
  return 'B7-no-relation'
tot=collections.Counter(); per={}
allrows=[]
for f in sorted(glob.glob('zut-967-context-*.json')):
  d=json.load(open(f)); c=f.split('context-')[1][:-5]; cc=collections.Counter()
  for x in d:
    b=bucket(x['target'],x['seed_target'] or ''); x['bucket']=b; cc[b]+=1; tot[b]+=1; allrows.append(x)
  per[c]=cc
print(tot, sum(tot.values()))
for c,cc in per.items(): print(c, dict(cc))
json.dump(allrows,open('/home/tomcassidy/.cs-scratch/cs-10fbac97-2cdd-476d-8da3-4f880eece73b/allrows.json','w'))
