import json,os,sys
W=os.path.join(os.environ['CS_SCRATCH'],'w')
ids={}
for f in sys.argv[1:]:
  for l in open(f):
    k,_,j=l.rstrip('\n').partition('\t')
    try: d=json.loads(j)
    except: continue
    if d.get('ok') and d.get('audioId'): ids[tuple(k.split('|',1))]=d['audioId']
b=json.load(open(os.path.join(W,'batch.json')))
d=json.load(open(os.path.join(W,'dry3.json')))['results']
missing=[]
slot={'known':'known_audio_id','target1':'target1_audio_id','target2':'target2_audio_id'}
for o,r in zip(b['ops'],d):
  bef=r.get('before') or {}
  if o['op'] in('seed.update','lego.update','phrase.update'): s=o['set']; txt={'known':s.get('known_text'),'target1':s.get('target_text'),'target2':s.get('target_text')}; chg={'known':s.get('known_text') not in (None,bef.get('known_text')),'target1':s.get('target_text') not in (None,bef.get('target_text'))}; chg['target2']=chg['target1']
  elif o['op'] in('phrase.insert','lego.insert'): s=o['row']; txt={'known':s['known_text'],'target1':s['target_text'],'target2':s['target_text']}; chg={k:True for k in txt}
  else: continue
  for role in ('known','target1','target2'):
    if not chg[role]: continue
    a=ids.get((role,txt[role]))
    if a: s[slot[role]]=a
    else: missing.append((o.get('phrase_id') or o.get('lego_id') or o.get('seed_number') or s.get('id') or s.get('lego_index'),role,txt[role]))
  if o['op']=='lego.insert' and s['lego_index']==5:
    s.update({'known_audio_id':'d7d7424b-297b-4835-8229-77d3fa9e4d00','target1_audio_id':'0f51627f-bd69-4f44-802c-3a1d2cc08001','target2_audio_id':'c2514aed-1a8d-465e-accf-430fac231e98'})
    missing=[m for m in missing if m[0]!=5]
b['apply']=True
json.dump(b,open(os.path.join(W,'apply.json'),'w'),ensure_ascii=False,indent=1)
print('missing',len(missing)); [print(m) for m in missing]
