# cs #431·AI — static checks on batch.ops.json against the live course snapshot: (1) every changed build/use phrase
# contains its LEGO's NEW target; (2) its Chinese tiles from material taught by then (+ the batch's new LEGO texts);
# (3) ZUT: no known text (case/punct-blind) maps to two different targets course-wide after the batch.
import json,re,sys,collections
SEEDS=json.load(open(sys.argv[1]))['seeds']; ops=json.load(open('batch.ops.json'))['ops']
P=re.compile(r'[，。？！、,.?!\s“”"：:；;…]')
legos={l['lego_id']:dict(l) for s in SEEDS for l in s['legos']}
phr={p['id']:dict(p,_lego=l['lego_id'],_new=l['is_new']) for s in SEEDS for l in s['legos'] for p in l.get('basket_phrases',[])}
seeds={s['seed_number']:dict(s) for s in SEEDS}
for o in ops:
  if o['op']=='lego.update': legos[o['lego_id']].update(o['set'])
  elif o['op']=='phrase.update': phr[o['phrase_id']].update(o['set'])
  elif o['op']=='phrase.delete': phr.pop(o['phrase_id'])
  elif o['op']=='phrase.insert': r=o['row']; lid=r['id'].split(':')[1][:8]; phr[r['id']]=dict(r,_lego=lid,_new=legos[lid]['is_new'])
  elif o['op']=='seed.update': seeds[o['seed_number']].update(o['set'])
def taught(N,idx):
  ch=set()
  for n,s in seeds.items():
    if n<N: ch.add(P.sub('',s['target_text']))
  for l in legos.values():
    n=l['seed_number']
    if n<N or (n==N and l['lego_index']<=idx):
      ch.add(P.sub('',l['target_text']))
      for c in (l['components'] or []): ch.add(P.sub('',c.get('target') or ''))
  ch.discard(''); return ch
def tiles(t,ch):
  s=P.sub('',t); n=len(s); ok=[False]*(n+1); ok[0]=True
  for i in range(n):
    if ok[i]:
      for j in range(i+1,n+1):
        if s[i:j] in ch: ok[j]=True
  return ok[n]
touched={o.get('phrase_id') or o.get('row',{}).get('id') for o in ops if o['op'] in('phrase.update','phrase.insert')}
bad=0
for pid in sorted(x for x in touched if x):
  p=phr[pid]; l=legos[p['_lego']]
  if p['phrase_role']=='component': continue
  lt=P.sub('',l['target_text'])
  if lt not in P.sub('',p['target_text']):
    # K49: words may sit inside the LEGO
    pat='.*'.join(map(re.escape,lt))
    if not re.search(pat,P.sub('',p['target_text'])): print('CONTAIN',pid,p['target_text'],'lego',lt); bad+=1
    else: print('contain-split(K49)',pid,p['target_text'])
  if not tiles(p['target_text'],taught(l['seed_number'],l['lego_index'])): print('TILE',pid,p['target_text']); bad+=1
zut=collections.defaultdict(set); src=collections.defaultdict(list)
norm=lambda k:re.sub(r'[^a-z\' ]','',k.lower()).strip()
for pid,p in phr.items():
  if p['phrase_role']=='component' or not p['_new']: continue
  zut[norm(p['known_text'])].add(P.sub('',p['target_text'])); src[norm(p['known_text'])].append(pid[12:])
newk={norm(phr[x]['known_text']) for x in touched if x}
for k in sorted(newk):
  if len(zut[k])>1: print('ZUT',k,zut[k],src[k]); bad+=1
print('bad',bad)
