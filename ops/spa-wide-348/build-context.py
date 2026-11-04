import json,sys
d=json.load(open('seeds.json'))['seeds']
rows=[json.loads(l) for l in open('clear.jsonl')]
ph={}; legos={}; seeds={}
taught=[]
for s in d:
    seeds[s['seed_number']]=s
    for L in s.get('legos') or []:
        legos[L['lego_id']]=L
        taught.append((s['seed_number'],L['lego_id'],L.get('is_new'),L['known_text'],L['target_text']))
        for p in L.get('basket_phrases') or []:
            ph[p['id'].split(':')[-1]]=(p,L['lego_id'])
with open('w/taught-legos.tsv','w') as f:
    f.write('seed\tlego_id\tis_new\tknown\ttarget\n')
    for t in sorted(taught,key=lambda x:x[1]):
        f.write('\t'.join(str(x) for x in t)+'\n')
drift=0;missing=0;out=[]
for r in rows:
    rid=r['id']; sn=int(rid[1:5]); lid=rid[:8]
    p=ph.get(rid); L=legos.get(lid); s=seeds.get(sn)
    live=None
    if p: live=[p[0]['known_text'],p[0]['target_text']]
    else: missing+=1
    dr = live is None or [x.strip() for x in live]!=[x.strip() for x in r['before']]
    if dr and live: drift+=1
    sib=[]
    if L:
        for q in sorted(L.get('basket_phrases') or [],key=lambda q:q['id']):
            sib.append(q['id'].split(':')[-1]+' | '+q['known_text']+' | '+q['target_text'])
    out.append(dict(id=rid,type=r['type'],rule=r.get('rule'),before=r['before'],after=r['after'],reason=r['reason'],
        knock_on_of=r.get('knock_on_of'),knock_on=r.get('knock_on'),proposal=r.get('proposal'),gates=r.get('gates'),
        live=live,drifted=dr,
        lego=(L['known_text'],L['target_text'],L.get('is_new')) if L else None,
        seed=(s['known_text'],s['target_text']) if s else None,
        seed_legos=[(x['lego_id'],x['known_text'],x['target_text'],x.get('is_new')) for x in (s.get('legos') or [])] if s else None,
        basket=sib))
print('rows',len(out),'drifted(text changed)',drift,'missing',missing)
json.dump(out,open('ctx.json','w'))
import collections
bands=[('A',1,149),('B',150,215),('C',216,280),('D',281,420),('E',421,545),('F',546,668)]
for b,lo,hi in bands:
    sh=[o for o in out if lo<=int(o['id'][1:5])<=hi]
    with open(f'w/shard-{b}.jsonl','w') as f:
        for o in sh: f.write(json.dumps(o,ensure_ascii=False)+'\n')
    print(b,len(sh))
