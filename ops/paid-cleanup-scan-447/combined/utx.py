import json,glob,re,os,collections
fam=open('bin/fam.py').read()
U=r'untaught|before it is taught|not yet taught|word form not yet|AC\. untaught|P3 untaught|B6 untaught|P2 "she|F\. Words used|seed word no LEGO|E\. Seed words no LEGO|coverage gap|never-taught'
n=lambda t:re.sub(r'\s+',' ',str(t or '').strip().lower())
res={}
for f in sorted(glob.glob('r/*.json')):
  sl=os.path.basename(f)[:-5]
  by=collections.defaultdict(list)
  for r in json.load(open(f)):
    if isinstance(r,dict) and str(r.get('verdict','')).upper().startswith('REAL') and re.search(U,f"{sl}|{r.get('course')}|{r.get('family')}",re.I):
      by[r['course']].append(r)
  for c,rs in by.items():
    p=f'ut/{c}.json'
    if not os.path.exists(p): res[c]=dict(real=len(rs),note='no live recount (spaceless or not dumped)'); continue
    ut={n(x['target']):x for x in json.load(open(p))}
    false=[r for r in rs if n(r.get('target')) in ut and not ut[n(r.get('target'))]['fixed']]
    matched=sum(1 for r in rs if n(r.get('target')) in ut)
    res[c]=dict(real=len(rs),matched_detector=matched,false_at_seed_level=len(false),stands=len(rs)-len(false),ex=[(r.get('row') or r.get('row_id'),r.get('target'),ut[n(r['target'])]['old']) for r in false[:3]])
for c,v in sorted(res.items()): print(c,json.dumps(v,ensure_ascii=False)[:400])
json.dump(res,open('utx.json','w'),ensure_ascii=False)
