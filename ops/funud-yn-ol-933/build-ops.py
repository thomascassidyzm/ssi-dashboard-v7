"""Aran ruling 2026-10-28 (job #933): Welsh 'funud yn ôl' -> English 'a minute ago' (was 'a moment ago') in cym_nv2_for_eng.
Reads fresh through Popty (gather.py output *.read.json + seeds), emits ops with `expect` guards. Welsh text untouched."""
import json,re,sys
c='cym_nv2_for_eng'
d=json.load(open(c+'.read.json'))
ops=[]
for p in d['rows']:
    k=p['known_text'] or ''
    if re.search(r'funud yn [oô]l',p['target_text'] or '') and 'moment ago' in k:
        ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{'known_text':k.replace('moment ago','minute ago')},'expect':{'known_text':k}})
    elif p['id'].endswith('S1384L02C01') and k=='a moment':
        ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{'known_text':'a minute'},'expect':{'known_text':k}})
for s in json.load(open(c+'.seeds.json')).get('seeds',[]) if isinstance(json.load(open(c+'.seeds.json')),dict) else json.load(open(c+'.seeds.json')):
    if re.search(r'funud yn [oô]l',s['target_text'] or '') and 'moment ago' in s['known_text']:
        ops.append({'op':'seed.update','seed_number':s['seed_number'],'set':{'known_text':s['known_text'].replace('moment ago','minute ago')},'expect':{'known_text':s['known_text']}})
OLD=[{'known':'a moment','target':'funud'},{'known':'ago','target':'yn ôl'}]
NEWC=[{'known':'a minute','target':'funud'},{'known':'ago','target':'yn ôl'}]
ops.append({'op':'lego.update','lego_id':'S1384L02','set':{'known_text':'a minute ago','components':NEWC},'expect':{'known_text':'a moment ago','components':OLD}})
json.dump({'ops':ops},open(c+'.ops.json','w'),ensure_ascii=False,indent=1)
print(len(ops))
