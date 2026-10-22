from lib import *
byKnown={}
for p in phrases.values(): byKnown.setdefault(norm(p['known_text']),[]).append(p)
for n,s in seeds.items(): byKnown.setdefault(norm(s['known_text']),[]).append({'id':'SEED%d'%n,'known_text':s['known_text'],'target_text':s['target_text']})
out={}
for r in V:
  if r['check']=='seed-placement' and r['sub'] in('missing','drifted') and r['verdict']=='real':
    n=int(r['ref'][1:]);s=seeds[n]
    ls=sorted(bySeedLegos.get(n,[]),key=lambda l:l['lego_index'])
    news=[l for l in ls if l.get('is_new') is not False]
    home=news[-1]
    fits=contains(s['known_text'],home['known_text']) and contains(s['target_text'],home['target_text'])
    disagree=[l['lego_id'] for l in ls if contains(s['known_text'],l['known_text']) and not contains(s['target_text'],l['target_text'])]
    coll=[p['id']+' '+p['target_text'] for p in byKnown.get(norm(s['known_text']),[]) if p['id']!='SEED%d'%n and norm(p['target_text'])!=norm(s['target_text'])]
    out[n]=dict(sub=r['sub'],home=home['lego_id'],fits=fits,disagree=disagree,coll=coll)
    if r['sub']=='missing': print(n,home['lego_id'],home['known_text'],'|',home['target_text'],'FITS' if fits else 'NOFIT',disagree or '',coll or '')
json.dump(out,open('p26plan.json','w'),indent=1)
