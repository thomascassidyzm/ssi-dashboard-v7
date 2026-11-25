# Walks recut.json in course order (seed, then LEGO index; new LEGOs only) and checks it against draft 2.
import json,sys,re
r=json.load(open(sys.argv[1])); d=json.load(open(sys.argv[2]))
draft=[l['target'] for l in d['lines'] if l['kind']=='lego']
walk=[]; ok=True; known=[]
for s in r['seeds']:
  t=s['target']
  for lt,kn,was,new in s['legos']:
    if lt not in t: print('CONTAIN FAIL seed',s['n'],lt); ok=False
    if new: walk.append((s['n'],lt,was)); known.append(lt)
  # coverage: strip every taught chunk (longest first) and punctuation; nothing may remain
  rest=t
  for c in sorted(set(known),key=len,reverse=True): rest=rest.replace(c,' ')
  if re.sub(r'[\s.,?]','',rest): print('COVER FAIL seed',s['n'],repr(rest)); ok=False
for i,(n,lt,was) in enumerate(walk,1):
  m = 'OK' if i<=len(draft) and draft[i-1]==lt else 'MISMATCH draft='+(draft[i-1] if i<=len(draft) else '-')
  if m!='OK': ok=False
  print(f'{i:2} seed {n} {lt:10} (was {was}) {m}')
print('walk length',len(walk),'draft length',len(draft))
# every draft line tiles from whole chunks taught up to its round
order={lt:i for i,(n,lt,w) in enumerate(walk,1)}
def tiles(text,upto):
  avail=sorted([c for c,i in order.items() if i<=upto],key=len,reverse=True)
  rest=text
  for c in avail: rest=rest.replace(c,' ')
  return re.sub(r'[\s.,?]','',rest)
for l in d['lines']:
  if l['kind']=='phrase':
    left=tiles(l['target'],l['intro'])
    if left: print('LINE FAIL round',l['intro'],l['target'],'leftover',left); ok=False
for extra in r.get('extraLines',[]):
  left=tiles(extra['target'],extra['round'])
  print('extra line round',extra['round'],extra['target'],'OK' if not left else 'FAIL '+left)
  ok = ok and not left
for s in r['laterSeeds']:
  rest=s['target']
  for c in sorted(set(known)|{x[0] for x in s['legos']},key=len,reverse=True): rest=rest.replace(c,' ')
  print('later seed',s['n'],'covered' if not re.sub(r'[\s.,?]','',rest) else 'GAP '+rest)
print('ALL OK' if ok else 'PROBLEMS')
