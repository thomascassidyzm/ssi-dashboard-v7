# Turns the decisions into one edit-batch body (ops.json) and a flat decisions.json for the record.
import sys;sys.path.insert(0,'.')
import io,contextlib
with contextlib.redirect_stdout(io.StringIO()): import check
from lib import *
C='gle_v2_for_eng'; ops=[]
for r in INS_LEGO: ops.append({"op":"lego.insert","row":r})
for n,(k,t,f,w) in sorted(SEED.items()):
    s=S[str(n)]; sd={}
    if k!=s['known']: sd['known_text']=k
    if t!=s['target']: sd['target_text']=t
    ops.append({"op":"seed.update","seed_number":n,"set":sd,"expect":{"known_text":s['known'],"target_text":s['target']}})
for k,(sd,f,w) in sorted(LEGO.items()):
    l=LA[k]; ops.append({"op":"lego.update","lego_id":k,"set":sd,"expect":{"known_text":l['known_text'],"target_text":l['target_text']}})
for k,v in sorted(PH.items()):
    r=R[k]
    if v[0]=='del': ops.append({"op":"phrase.delete","phrase_id":r['id'],"expect":{"target_text":r['target_text']}})
    else:
        sd={}
        if v[1]!=r['known_text']: sd['known_text']=v[1]
        if v[2]!=r['target_text']: sd['target_text']=v[2]
        ops.append({"op":"phrase.update","phrase_id":r['id'],"set":sd,"expect":{"known_text":r['known_text'],"target_text":r['target_text']}})
for r in INS_PH: ops.append({"op":"phrase.insert","row":r})
json.dump({"ops":ops},open('ops.json','w'),ensure_ascii=False,indent=0)
dec={"seeds":{str(n):{"before":S[str(n)],"known":k,"target":t,"family":f,"why":w} for n,(k,t,f,w) in sorted(SEED.items())},
 "legos":{k:{"before":{x:LA[k][x] for x in('known_text','target_text','components','is_new','type')},"set":sd,"family":f,"why":w} for k,(sd,f,w) in sorted(LEGO.items())},
 "lego_inserts":INS_LEGO,"phrase_inserts":INS_PH,
 "phrases":{k:{"action":v[0],"role":R[k]['phrase_role'],"before":{"known":R[k]['known_text'],"target":R[k]['target_text']},"known":v[1],"target":v[2],"family":v[3],"why":v[4]} for k,v in sorted(PH.items())}}
json.dump(dec,open('decisions.json','w'),ensure_ascii=False,indent=1)
print(len(ops),'ops')
