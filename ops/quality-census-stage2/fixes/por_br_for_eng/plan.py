import sys,re,copy,os;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
C='por_br_for_eng'
ops=[];touched=set();log=[]
NEVER=['course_code','known_audio_id','target1_audio_id','target2_audio_id','target1_duration_ms','target2_duration_ms','presentation_audio_id','last_edit_event_id','created_at','updated_at','version','qa_checked','decomposition','decomposition_course_version','display_tiling','display_tiling_version','target_syllable_count','_lego','_new','release_batch']
lc1=lambda t:t[0].lower()+t[1:]
CAPS=[r.split(':')[-1] for r in json.load(open('capsknown.json'))]
capseed={int(r[1:]) for r in CAPS if re.fullmatch(r'S\d{4}',r)}
def seedKnown(n):
  k=seeds[n]['known_text']
  return lc1(k) if n in capseed else k
P=json.load(open('p26plan.json'))
HOLD_MISSING={7:'seed vs LEGO S0007L02 wording',194:'ZUT collision with seed 68'}
SEED53={'target1':'0fc642eb-214c-4cc9-9abe-95c59e323bc4','target2':'55dfdfbb-4784-47a4-98f0-78f8e2e1742b'}
ins=[(int(n),d['home']) for n,d in P.items() if d['sub']=='missing' and d['fits'] and int(n) not in HOLD_MISSING]
ins+=[(147,'S0147L02'),(253,'S0253L02')]
links=[]
for n,L in sorted(ins):
  s=seeds[n];l=legos[L];bask=byLego[L]
  assert l.get('is_new') is not False
  assert contains(s['known_text'],l['known_text']) and contains(s['target_text'],l['target_text']),n
  proto=next(p for p in bask if p['phrase_role']=='use')
  maxU=max([int(re.search(r'U(\d+)$',p['id']).group(1)) for p in bask if re.search(r'U\d+$',p['id'])]+[0])
  pid=f"{C}:{L}U{maxU+1:02d}"
  assert pid not in phrases
  row={k:v for k,v in proto.items() if k not in NEVER}
  tt=s['target_text']
  row.update(id=pid,seed_number=l['seed_number'],lego_index=l['lego_index'],lego_id=L,known_text=seedKnown(n),target_text=tt,phrase_role='use',position=max(p['position'] for p in bask)+1,status='draft',introduce=True,
    word_count=len(tt),lego_count=len(re.sub(r'[,.?!]','',tt).split()),lego_position='end' if norm(tt).endswith(norm(l['target_text'])) else 'middle',
    metadata={'format':'build_use','p26':'seed sentence in a played basket (canon P26)','seed_sentence_of':n,'job':'#432 por_br census fix'},connected_lego_ids=[])
  ops.append({'op':'phrase.insert','row':row})
  for slot in ['known','target1','target2']:
    aid=s[slot+'_audio_id'] or (SEED53.get(slot) if n==53 else None)
    assert aid,(n,slot)
    links.append({'op':'audio.link','target':'phrase','phrase_id':pid,'slot':slot,'audio_id':aid})
  touched.add(n)
  log.append(['p26-insert',pid,f"{L} {l['known_text']}|{l['target_text']}",row['known_text'],tt])
# seed 53: fill its empty target slots with the library clips of its own sentence
for slot,aid in SEED53.items():
  assert not seeds[53][slot+'_audio_id']
  links.append({'op':'audio.link','target':'seed','seed_number':53,'slot':slot,'audio_id':aid})
log.append(['seed53-clips','S0053',SEED53])
ops+=links
# drifted copies -> exact seed sentence (+ seed clips)
DRIFT={14:'S0014L01U01',98:'S0098L03B03',115:'S0115L03U01',205:'S0205L03U03',311:'S0311L04U01'}
for n,suf in DRIFT.items():
  s=seeds[n];p=phrases[f'{C}:{suf}']
  setv={'known_text':seedKnown(n),'target_text':s['target_text']}
  if n==98:
    d=copy.deepcopy(p['decomposition']);d=[x for x in d if x['target'] not in (' pensar',' em')]
    d.insert(2,{'known':'consider','legoId':'S0098L02','target':' considerar','isGhost':False})
    assert ''.join(x['target'] for x in d)==s['target_text'],''.join(x['target'] for x in d)
    setv['decomposition']=d
  if n==14:
    d=copy.deepcopy(p['decomposition'])+[{'known':'','legoId':None,'target':'?','isGhost':True}]
    assert ''.join(x['target'] for x in d)==s['target_text'];setv['decomposition']=d
  ops.append({'op':'phrase.update','phrase_id':p['id'],'set':setv,'expect':{'known_text':p['known_text'],'target_text':p['target_text']}})
  for slot in ['known','target1','target2']:
    if p[slot+'_audio_id']!=s[slot+'_audio_id']:
      ops.append({'op':'audio.link','target':'phrase','phrase_id':p['id'],'slot':slot,'audio_id':s[slot+'_audio_id']})
  touched.add(n);log.append(['drift-copy',p['id'],p['known_text']+' | '+p['target_text'],setv['known_text'],setv['target_text']])
# seed 130 English typo
s=seeds[130]
ops.append({'op':'seed.update','seed_number':130,'set':{'known_text':'that was a surprise, because he\'s my friend'},'expect':{'known_text':s['known_text']}})
touched.add(130);log.append(['typo','S0130',s['known_text'],"that was a surprise, because he's my friend"])
# capitals, known side only
for r in CAPS:
  if r.startswith('S') and 'L' in r:
    p=phrases[f'{C}:{r}'];old=p['known_text'];new=lc1(old)
    assert re.match(r'[A-Z]',old) and not re.match(r"I\b",old)
    ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{'known_text':new},'expect':{'known_text':old}})
    touched.add(p['seed_number']);log.append(['caps',p['id'],old,new])
  else:
    n=int(r[1:]);old=seeds[n]['known_text'];new=lc1(old)
    assert re.match(r'[A-Z]',old) and not re.match(r"I\b",old)
    ops.append({'op':'seed.update','seed_number':n,'set':{'known_text':new},'expect':{'known_text':old}})
    touched.add(n);log.append(['caps','S%04d'%n,old,new])
# wrong-language known
p=phrases[f'{C}:S0227L01B02']
ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{'known_text':'just that man'},'expect':{'known_text':'just aquele homem'}})
ops.append({'op':'audio.link','target':'phrase','phrase_id':p['id'],'slot':'known','audio_id':'c47ded7e-c4a5-40f0-9bb6-4fd4658e55fc'})
touched.add(227);log.append(['wrong-language',p['id'],'just aquele homem','just that man'])
# unapprove every touched seed
for n in sorted(touched):
  s=seeds[n]
  if s['approved_at']:ops.append({'op':'seed.update','seed_number':n,'set':{'approved_at':None},'expect':{'approved_at':s['approved_at']}})
json.dump(ops,open(S+'/ops.json','w'),ensure_ascii=False,indent=1)
json.dump(log,open(S+'/plan.log.json','w'),ensure_ascii=False,indent=1)
import collections
print(len(ops),'ops',collections.Counter(o['op'] for o in ops),len(touched),'seeds touched',sum(1 for o in ops if o['op']=='seed.update' and 'approved_at' in o['set']),'unapproved')
