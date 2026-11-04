import json,glob,os,sys
S=os.environ['CS_SCRATCH']
a=json.load(open('ops/zho-545/outofscope-219/apply-set.json'))
ov=json.load(open('ops/zho-545/overrides.json'))
dem=dict(ov['demote'])
for f in sorted(glob.glob('ops/zho-545/decisions-*.json')):
  for d in json.load(open(f))['decisions']:
    if d['action']!='hold' and d['id'] not in dem: dem[d['id']]="#219 (4 Nov): A/B/C edit/delete already applied by #206 or refused by its gates — not re-run by the out-of-scope pass"
add=[{"id":"zho_for_eng:"+e['id'],"table":"phrase","point":"other","action":"edit","before":e['before'],"after":e['after'],"why":"#219: "+e['why']} for e in a['edits']]
add+=[{"id":"zho_for_eng:"+d['id'],"table":"phrase","point":"other","action":"delete","before":d['before'],"after":None,"why":"#219: "+d['why']} for d in a['deletes']]
assert not [x for x in add if x['id'] in dem]
ov2={"note":ov.get('note'),"note219":"#219 (4 Nov): out-of-scope 'other' triage — bucket-1 pure-grammar fixes in 'add' (Kai's 4 Nov standing rule: grammar fixes with taught words applied without asking); every earlier A/B/C edit/delete demoted so only these run. Record: ops/zho-545/outofscope-219.json","demote":dem,"add":add}
json.dump(ov2,open('ops/zho-545/overrides.json','w'),ensure_ascii=False,indent=1)
print(len(dem),len(add))
