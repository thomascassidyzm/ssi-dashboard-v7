import json,collections,os
T=os.path.expanduser('~/.tmpbig/trace98/')
D='ops/trace-unattributed-98/'
clips=json.load(open(D+'clips.json')); vo=json.load(open(D+'voices.json'))['voices']
voice={x['id']:v for v,l in vo.items() for x in l}
live={}
for c in ['cym_nv2_for_eng','cym_sv2_for_eng']:
    d=json.load(open(T+f'live-{c}.json')); idx={}
    for s in d['seeds']:
        idx[('seed',str(s['seed_number']))]=s
        for l in s['legos']:
            idx[('lego',l['lego_id'])]=l
            for p in l.get('basket_phrases') or []: idx[('phrase',p['id'])]=p
    live[c]=idx
res=collections.Counter(); rows=[]
for x in clips:
    k=json.loads(x['key'])
    if x['op']=='seed.update': key=('seed',str(k['seed_number']))
    elif x['op']=='lego.update': key=('lego',k.get('lego_id') or k.get('id'))
    else: key=('phrase',k.get('phrase_id') or k.get('id'))
    row=live[x['course']].get(key)
    cur=row.get(x['slot']+'_audio_id') if row else 'NOROW'
    st='gone' if cur=='NOROW' else ('empty' if cur is None else ('relinked-same' if cur==x['audio_id'] else 'filled-other'))
    rows.append({**x,'voice':voice.get(x['audio_id']),'state':st,'cur':cur,'newtext':row.get('target_text') if row else None})
    res[(voice.get(x['audio_id']),st)]+=1
for k,v in sorted(res.items(),key=str): print(k,v)
json.dump(rows,open(D+'state.json','w'),indent=1)
