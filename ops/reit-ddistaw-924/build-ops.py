"""Job #924 (Aran ruling 2026-10-28): where the Welsh has 'reit ddistaw', English 'rather quiet' -> 'really quiet'. English only.
Re-reads rows fresh through Popty and emits ops with `expect` guards. Usage: build-ops.py <out.json>   (nv2 only: sv2 has no 'reit ddistaw')"""
import json,re,sys,urllib.request
out=sys.argv[1]; course='cym_nv2_for_eng'; base='http://localhost:3470/api/production/'+course
get=lambda u: json.load(urllib.request.urlopen(u,timeout=120))
WP=re.compile(r'\breit ddistaw\b'); KP=re.compile(r'\brather quiet\b')
ops=[]
for p in get(f'{base}/lego/S1362L02/basket')['phrases']:
    t,k=p['target_text'] or '',p['known_text'] or ''
    if WP.search(t) and KP.search(k):
        ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{'known_text':KP.sub('really quiet',k)},'expect':{'known_text':k,'target_text':t}})
S=get(f'{base}/seeds'); S=S.get('seeds',S)
for s in S:
    if WP.search(s['target_text'] or '') and KP.search(s['known_text'] or ''):
        ops.append({'op':'seed.update','seed_number':s['seed_number'],'set':{'known_text':KP.sub('really quiet',s['known_text'])},'expect':{'known_text':s['known_text'],'target_text':s['target_text']}})
ops.append({'op':'lego.update','lego_id':'S1362L02','set':{'known_text':'really quiet'},'expect':{'known_text':'rather quiet','target_text':'reit ddistaw'}})
json.dump({'ops':ops},open(out,'w'),ensure_ascii=False,indent=1); print(len(ops),'ops')
