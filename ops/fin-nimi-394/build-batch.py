import json
d=json.load(open('seeds.json')); R={x['key']+x['role']:x['resp']['audioId'] for x in json.load(open('render_real.json'))}
undo=json.load(open('del_result.json'))['undo_ops'][0]['row']; fields=list(undo.keys())
baskets={}
for s in d['seeds']:
  for l in s['legos']: baskets[l['lego_id']]=(s,l)
def newrow(lid,pid,known,target,k):
  s,l=baskets[lid]; uses=[p for p in l['basket_phrases'] if p['phrase_role']=='use']; tmpl=uses[0]
  row={f:tmpl.get(f) for f in fields if f in tmpl}
  row.update(id='fin_for_eng:'+pid,seed_number=s['seed_number'],lego_index=l['lego_index'],
    position=max(p['position'] for p in l['basket_phrases'])+1,known_text=known,target_text=target,
    word_count=len(target),lego_count=len(target.split()),metadata={"format":"build_use","source":"#394·AH Kai 12 Nov nimi ruling"},
    status='draft',phrase_role='use',known_audio_id=R[k+'known'],target1_audio_id=R[k+'target1'],target2_audio_id=R[k+'target2'],
    lego_position='start' if target.startswith(l['target_text']) else 'middle')
  for f in ['created_at','updated_at','version','last_edit_event_id','target1_duration_ms','target2_duration_ms','qa_checked','release_batch','display_tiling','display_tiling_version']: row.pop(f,None)
  return row
ops=[
 {"op":"phrase.update","phrase_id":"fin_for_eng:S0654L01U06","expect":{"known_text":"i'm not sure what his name is","target_text":"en ole varma, mikä sen nimi on"},
  "set":{"known_text":"I'm not sure what his name is, sir","target_text":"en ole varma, mikä sen nimi on, herra","known_audio_id":R['u654known'],"target1_audio_id":R['u654target1'],"target2_audio_id":R['u654target2']}},
 {"op":"phrase.update","phrase_id":"fin_for_eng:S0465L02U05","expect":{"known_text":"i'm not sure what her name is"},
  "set":{"known_text":"I'm not sure what her name is","known_audio_id":"fcb265bc-4f05-41f1-85fe-3e37233af3fd"}},
 {"op":"phrase.insert","row":newrow('S0222L01','S0222L01U06',"he's trying to remember her name","se yrittää muistaa sen nimeä",'n222')},
 {"op":"phrase.insert","row":newrow('S0372L02','S0372L02U06',"she was trying to remember his name","se yritti muistaa sen nimeä",'n372')},
 {"op":"phrase.insert","row":newrow('S0496L02','S0496L02U06',"I'm really trying to remember her name","mä yritän oikeesti muistaa sen nimeä",'n496')},
 {"op":"audio.link","target":"lego","lego_id":"S0020L02","slot":"presentation","audio_id":R['p020presentation']},
 {"op":"audio.link","target":"lego","lego_id":"S0021L03","slot":"presentation","audio_id":R['p021presentation']},
]
for pid in ['S0222L01U06','S0372L02U06','S0496L02U06']:
  assert not any(p['id'].endswith(pid) for _,l in baskets.values() for p in l['basket_phrases']), pid
json.dump({"ops":ops,"why":"#394·AH Kai 12 Nov nimi rulings: fix S0654L01U06 (formal marker, clears the ZUT clash with S0465L02U05) + S0465L02U05 casing; 3 later yrittää muistaa sen nimeä phrases; both nimi intros say his name or her name"},open('fix.json','w'),ensure_ascii=False,indent=1)
print(json.dumps(ops[2],ensure_ascii=False))
