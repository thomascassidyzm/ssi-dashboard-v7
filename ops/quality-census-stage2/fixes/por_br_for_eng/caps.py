from lib import *
H=json.load(open(S+'/before/census2.json'))
cap=[h for c in H['checks'] if c['id']=='capitalisation' for h in c['hits']]
vc=[r for r in V if r['check']=='capitalisation']
assert len(cap)==len(vc)
rows={}
for h,r in zip(cap,vc):
  assert h['ref'].split(':')[-1]==r['ref'] and h['sub']==r['sub'],(h,r)
  side='known' if ('on known' in h['why'] or h['why'].startswith('known')) else 'target' if ('on target' in h['why'] or h['why'].startswith('target')) else '?'
  rside='known' if r['reason'].startswith('known') else 'target'
  if side!=rside: print('SIDE MISMATCH',h,r)
  if r['verdict']=='real' and rside=='known': rows[h['ref']]=h
for ref,h in rows.items(): print(ref,'|',h['known'],'|',h['why'][:80])
print(len(rows))
json.dump(sorted(rows),open('capsknown.json','w'))
