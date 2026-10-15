import json,collections
d=json.load(open('seeds.json'))
T=collections.defaultdict(list); seedctx={}; seen=set()
for s in d['seeds']:
  seedctx[s['seed_number']]=(s['known_text'],s['target_text'])
  T[s['target_text']].append(('seed',s['seed_id'],s['seed_number'],s['known_text']))
  for l in s['legos']:
    T[l['target_text']].append(('lego',l['lego_id'],s['seed_number'],l['known_text']))
    for p in l.get('basket_phrases') or []:
      if p['id'] in seen: continue
      seen.add(p['id'])
      T[p['target_text']].append((p.get('phrase_role') or 'phrase',p['id'],p.get('seed_number') or s['seed_number'],p['known_text']))
m=json.load(open('718/state/merged.json'))
out=[]
for r in m['rows']:
  v=r['v']['v']
  if v not in ('needs-female','wrong-female','ambiguous') and r['n']!=1012: continue
  live=T.get(r['t'],[])
  old=sorted(o[1] for o in r['occ']); new=sorted(o[1].split(':')[-1] if False else o[1] for o in live)
  out.append(dict(n=r['n'],v=v,t=r['t'],stored=r['stored'],f=r['v'].get('f'),why=r['v'].get('why'),occ718=r['occ'],live=live,seeds={o[2]:seedctx[o[2]] for o in live}))
json.dump(out,open('sel.json','w'),ensure_ascii=False,indent=1)
print(len(out), 'live-missing:',[x['n'] for x in out if not x['live']])
print('occ-count changed:',[(x['n'],len(x['occ718']),len(x['live'])) for x in out if len(x['occ718'])!=len(x['live'])])
