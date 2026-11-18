import json,sys
dec=json.load(open(sys.argv[1])); audio=json.load(open(sys.argv[2])) if len(sys.argv)>2 else {}
ops=[]
for e in dec['edits']:
    s={}
    if e['known_changed']:
        s['known_text']=e['new_known']
        if audio: s['known_audio_id']=audio[e['id']]['known']
    if e['target_changed']:
        s['target_text']=e['new_target']
        if audio: s['target1_audio_id']=audio[e['id']]['target1']; s['target2_audio_id']=audio[e['id']]['target2']
    ops.append({"op":"phrase.update","phrase_id":"spa_for_eng:"+e['id'],"expect":{"known_text":e['old_known'],"target_text":e['old_target']},"set":s})
for d in dec['deletes']:
    ops.append({"op":"phrase.delete","phrase_id":"spa_for_eng:"+d['id'],"expect":{"known_text":d['old_known'],"target_text":d['old_target']}})
print(json.dumps({"ops":ops},ensure_ascii=False))
