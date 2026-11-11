import json
api=json.load(open('seeds.json'))
P={};L={};S={}
for s in api['seeds']:
    S[s['seed_number']]=s
    for l in s.get('legos') or []:
        L[l['lego_id']]=l
        for p in l.get('basket_phrases') or []: P[p['id'].split(':')[1]]=dict(p,_l=l['lego_id'])
sh={}
for l in open('shards.jsonl'):
    o=json.loads(l); sh[o['id']]=o
out=[]
for l in open('verdicts.jsonl'):
    v=json.loads(l)
    if v.get('family')!='CALQUE-WORD': continue
    i=v['id']; o=sh[i]; p=P.get(i); lg=L.get(i[:8])
    st='DELETED' if not p else ('CHANGED' if [p['known_text'],p['target_text']]!=o['before'] else 'same')
    out.append(dict(id=i,status=st,live=[p['known_text'],p['target_text']] if p else None,role=p and p['phrase_role'],
      before=o['before'],after255=o['after'],reason255=o['reason'],reason348=v['reason'],fix_verdict=v['fix_verdict'],fix_note=v.get('fix_note'),better_fix=v.get('better_fix'),
      lego=[lg['lego_id'],lg['known_text'],lg['target_text'],lg['is_new']] if lg else None,
      seed=[S[int(i[1:5])]['known_text'],S[int(i[1:5])]['target_text']],
      basket=['%s|%s|%s|%s'%(q['id'].split(':')[1],q['phrase_role'],q['known_text'],q['target_text']) for q in P.values() if q['_l']==i[:8]]))
json.dump(out,open('calque.json','w'),ensure_ascii=False,indent=1)
import collections;print(len(out),collections.Counter(r['status'] for r in out))
for r in out:
    if r['status']!='same': print(r['id'],r['status'],r['before'],'->',r['live'])
