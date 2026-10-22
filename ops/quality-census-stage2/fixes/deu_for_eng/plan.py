import sys,re,copy;sys.path.insert(0,__import__('os').path.dirname(__file__))
from lib import *
C='deu_for_eng'
V=json.load(open(S+'/verdicts.json'))
ops=[];touched_seeds=set();log=[]
NEVER=['course_code','known_audio_id','target1_audio_id','target2_audio_id','target1_duration_ms','target2_duration_ms','presentation_audio_id','last_edit_event_id','created_at','updated_at','version','qa_checked','decomposition','decomposition_course_version','display_tiling','display_tiling_version','target_syllable_count','_lego','_new','release_batch']
# 1. P26 inserts
P26={242:'S0242L02',572:'S0572L05',229:'S0229L03',469:'S0469L01',639:'S0639L01'}
links=[]
for n,L in P26.items():
  s=seeds[n];l=legos[L];bask=byLego[L]
  proto=next(p for p in bask if p['phrase_role']=='use')
  maxU=max([int(re.search(r'U(\d+)$',p['id']).group(1)) for p in bask if re.search(r'U\d+$',p['id'])]+[0])
  pid=f"{C}:{L}U{maxU+1:02d}"
  assert pid not in phrases
  row={k:v for k,v in proto.items() if k not in NEVER}
  row.update(id=pid,seed_number=l['seed_number'],lego_index=l['lego_index'],lego_id=L,known_text=s['known_text'],target_text=s['target_text'],phrase_role='use',position=max(p['position'] for p in bask)+1,status='draft',introduce=True,
    word_count=len(s['target_text']),lego_count=len(re.sub(r'[,.?!]','',s['target_text']).split()),lego_position='end' if norm(s['target_text']).endswith(norm(l['target_text'])) else 'middle',
    metadata={'p26':'seed sentence in a played basket (canon P26)','from_seed':n,'job':'#418 deu census fix'},connected_lego_ids=[])
  ops.append({'op':'phrase.insert','row':row})
  for slot in ['known','target1','target2']:
    links.append({'op':'audio.link','target':'phrase','phrase_id':pid,'slot':slot,'audio_id':s[slot+'_audio_id']})
  touched_seeds.add(n);touched_seeds.add(l['seed_number'])
  log.append(f"P26 insert {pid} ({L} {l['known_text']}|{l['target_text']}): {s['known_text']} | {s['target_text']}")
ops+=links
# 2. capitals case-dup (known side lowercase first letter)
def lc1(t):return t[0].lower()+t[1:]
for r in V:
  if r['check']=='capitalisation' and r['sub']=='case-dup' and r['verdict']=='real' and r['ref'].startswith(C+':'):
    p=phrases[r['ref']];old=p['known_text'];new=lc1(old)
    assert re.match(r'[A-Z]',old) and not re.match(r"I\b|I'",old),old
    ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{'known_text':new},'expect':{'known_text':old}})
    touched_seeds.add(p['seed_number']);log.append(f"caps {p['id']}: {old} -> {new}")
# 3. lowercase-i
fixI=lambda t:re.sub(r"(^|\s)i(?=\s|'|$)",lambda m:m.group(1)+'I',t)
for r in V:
  if r['check']=='lowercase-i' and r['verdict']=='real':
    if r['ref'].startswith(C+':'):
      p=phrases[r['ref']];old=p['known_text'];new=fixI(old)
      ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{'known_text':new},'expect':{'known_text':old}})
      touched_seeds.add(p['seed_number']);log.append(f"lower-i {p['id']}: {old} -> {new}")
    else:
      l=legos[r['ref']];old=l['known_text'];new=fixI(old)
      ops.append({'op':'lego.update','lego_id':l['lego_id'],'set':{'known_text':new},'expect':{'known_text':old}})
      touched_seeds.add(l['seed_number']);log.append(f"lower-i LEGO {l['lego_id']}: {old} -> {new}")
# 4. jane's
for kind,key,old,new in [('lego','S0635L02',"jane's","Jane's"),('phrase',C+':S0635L02B01',"jane's","Jane's")]:
  if kind=='lego':ops.append({'op':'lego.update','lego_id':key,'set':{'known_text':new},'expect':{'known_text':old}})
  else:ops.append({'op':'phrase.update','phrase_id':key,'set':{'known_text':new},'expect':{'known_text':old}})
  log.append(f"proper noun {key}: {old} -> {new}")
touched_seeds.add(635)
# 5. multi-sentence deletes
for pid in [C+':S0162L01U04',C+':S0251L01U13']:
  p=phrases[pid];ops.append({'op':'phrase.delete','phrase_id':pid,'expect':{'known_text':p['known_text'],'target_text':p['target_text']}})
  touched_seeds.add(p['seed_number']);log.append(f"delete {pid}: {p['known_text']} | {p['target_text']}")
# 6. wrong-language known
p=phrases[C+':S0638L01B03']
ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{'known_text':'I try to fetch the keys'},'expect':{'known_text':p['known_text']}})
touched_seeds.add(638);log.append(f"wrong-language {p['id']}: {p['known_text']} -> I try to fetch the keys")
# 7. unapprove
for n in sorted(touched_seeds):
  s=seeds[n]
  if s['approved_at']:ops.append({'op':'seed.update','seed_number':n,'set':{'approved_at':None},'expect':{'approved_at':s['approved_at']}})
json.dump(ops,open(S+'/ops.json','w'),ensure_ascii=False,indent=1)
open(S+'/plan.log','w').write('\n'.join(log)+'\n')
print(len(ops),'ops;',len(touched_seeds),'seeds touched;',sum(1 for o in ops if o['op']=='seed.update'),'unapproved')
