"""Aran ruling 2026-10-28 (job #917): 'ychydig o ddyddiau' (nv2) / 'ychydig ddyddiau' (sv2) -> 'ychydig o ddiwrnodiau'.
Re-reads every row fresh through Popty (basket route) and emits phrase/lego/seed ops with `expect` guards.
Usage: build-ops.py <course> <out.json>   (reads LEGO ids listed below; 'these days' rows never match the patterns)"""
import json,re,sys,urllib.request
course,out=sys.argv[1],sys.argv[2]
PAT={'cym_nv2_for_eng':r'\bychydig o ddyddiau\b','cym_sv2_for_eng':r'\bychydig ddyddiau\b'}[course]
NEW='ychydig o ddiwrnodiau'
LEGOS={'cym_nv2_for_eng':['S1274L02','S1295L03','S1315L03','S1319L01','S1332L01','S1406L02'],
 'cym_sv2_for_eng':['S1341L03','S1343L01','S1347L03','S1370L02','S1379L01','S1388L02','S1390L02','S1392L03','S1393L02','S1454L01','S1455L01','S1462L02','S1468L01','S1507L01','S1520L01']}[course]
base='http://localhost:3470/api/production/'+course
ops=[]
for l in LEGOS:
    for p in json.load(urllib.request.urlopen(f'{base}/lego/{l}/basket'))['phrases']:
        t=p['target_text'] or ''
        if re.search(PAT,t):
            ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{'target_text':re.sub(PAT,NEW,t)},'expect':{'target_text':t}})
        elif p['phrase_role']=='component' and t=='ddyddiau' and course=='cym_nv2_for_eng' and l=='S1274L02':
            ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{'target_text':'ddiwrnodiau'},'expect':{'target_text':t}})
SEEDS=json.load(urllib.request.urlopen(f'{base}/seeds')); SEEDS=SEEDS.get('seeds',SEEDS)
for s in SEEDS:
    if re.search(PAT,s['target_text'] or ''):
        ops.append({'op':'seed.update','seed_number':s['seed_number'],'set':{'target_text':re.sub(PAT,NEW,s['target_text'])},'expect':{'target_text':s['target_text']}})
LEGO_TXT={'cym_nv2_for_eng':[('S1274L02','mewn ychydig o ddyddiau')],'cym_sv2_for_eng':[('S1341L03','ychydig ddyddiau yn ôl')]}[course]
for lid,txt in LEGO_TXT:
    ops.append({'op':'lego.update','lego_id':lid,'set':{'target_text':re.sub(PAT,NEW,txt)},'expect':{'target_text':txt}})
json.dump({'ops':ops},open(out,'w'),ensure_ascii=False,indent=1)
print(course,len(ops),'ops')
