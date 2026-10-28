import json,re,sys
rows={p['id']:p for p in json.load(open(sys.argv[1]))}
ids=['B01','B03','B04','U01','U02','U03','U04','U05','U06']
ops=[]
for i in ids:
    p=rows['cym_nv2_for_eng:S1204L03'+i]
    t=re.sub(r'\b(d?delio)\b',r'\1 efo fo',p['target_text'],count=1)
    k=re.sub(r'\bdeal\b','deal with it',p['known_text'],count=1)
    assert t!=p['target_text'] and k!=p['known_text']
    ops.append({'op':'phrase.update','phrase_id':p['id'],'set':{'known_text':k,'target_text':t},'expect':{'known_text':p['known_text'],'target_text':p['target_text']}})
json.dump(ops,open(sys.argv[2],'w'),ensure_ascii=False,indent=1)
