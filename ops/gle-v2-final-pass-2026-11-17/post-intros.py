# cs #410·AI — posts presentations.todo.json's 20 intro lines through Popty's intro-text route (HARD mark: the soft column is unapplied), then reads each back.
# Usage: python3 post-intros.py -> intro-readback.json
import json,urllib.request,urllib.parse
B='http://localhost:3470/api/production/gle_v2_for_eng/presentation/'
H={'Content-Type':'application/json','x-agent-id':'worker-gle-v2-final-pass-410','x-agent-role':'content-apply'}
todo=json.load(open('presentations.todo.json')); out=[]
for x in todo['lines']:
    body={'author':todo['author'],'text':x['text'],'guard':'hard','why':"Kai 17 Nov 2026 12:19Z: echo context / heads-up line (cs #398·AI plan, applied by cs #410·AI). HARD because the soft-guard column (database/changes/20261111_human_authored_presentations_soft_guard.sql) is not applied; re-mark soft once it is"}
    try: w=json.load(urllib.request.urlopen(urllib.request.Request(B+x['lego_id']+'/authorship',data=json.dumps(body).encode(),headers=H),timeout=60))
    except urllib.error.HTTPError as e: w={'http':e.code,'body':e.read().decode()[:500]}
    r=json.load(urllib.request.urlopen(urllib.request.Request(B+x['lego_id'],headers=H),timeout=60))
    ok=r.get('text')==x['text']; out.append({'lego_id':x['lego_id'],'write':w,'readback_text':r.get('text'),'human_authored':r.get('human_authored'),'match':ok})
    print(x['lego_id'],'MATCH' if ok else 'MISMATCH',w.get('guard') or w)
json.dump(out,open('intro-readback.json','w'),ensure_ascii=False,indent=1); print(sum(o['match'] for o in out),'/',len(out),'read back')
