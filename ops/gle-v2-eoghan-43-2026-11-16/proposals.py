# Kai 20:52Z: dry-run only. Per seed: his line / ours / what taking it would change (LEGOs, phrases in this seed and in
# others, tiles) from plan.py's own seed functions run one at a time on a fresh Popty read. Nothing is posted.
# Usage: python3 proposals.py <live seeds.json> -> proposals-raw.json
import sys,json,collections,os
from ed import Ed; from check import check
src=open('plan.py').read().split('BATCH={')[0].split('E=Ed(sys.argv[1]); B=sys.argv[2]')[1]
ns={'Ed':Ed,'check':check,'json':json,'re':__import__('re'),'sys':sys}
from lib import syl; ns['syl']=syl
exec(compile('import re\n'+src,'plan.py','exec'),ns)
his={int(r['A']):r['F'] for r in json.load(open('../gle-v2-eoghan-excel-2026-11-16/his-bileog1.json'))[1:] if str(r.get('A','')).isdigit()}
out={}
def run(n,fn):
    E=Ed(sys.argv[1]); ns['E']=E; fn(); ops=E.emit([n]); legos,ph=E.after()
    rec={'seed':n,'his':his.get(n),'ours':E.S[n]['target_text'],'english':E.S[n]['known_text'],'proposed':E.seedtext.get(n,(0,None))[1],
         'lego_upd':[(o['lego_id'],E.L[o['lego_id']]['target_text'],o['set'].get('target_text'),o['set'].get('known_text')) for o in ops if o['op']=='lego.update'],
         'lego_new':[(o['row']['known_text'],o['row']['target_text']) for o in ops if o['op']=='lego.insert'],
         'lego_del':[(o['lego_id'],E.L[o['lego_id']]['known_text'],E.L[o['lego_id']]['target_text'],sum(1 for p in E.P.values() if p['lego']==o['lego_id'] and p['phrase_role']!='component')) for o in ops if o['op']=='lego.delete'],
         'ph_added':sum(1 for o in ops if o['op']=='phrase.insert'),'ph_deleted':sum(1 for o in ops if o['op']=='phrase.delete'),
         'other':collections.Counter(),'own_reworded':0,'examples':[],'findings':[list(map(str,x)) for x in check(E,[n])]}
    for o in ops:
        if o['op']!='phrase.update': continue
        k=o['phrase_id'].split(':')[1]; s=E.P[k]['seed']
        if s==n: rec['own_reworded']+=1
        else:
            rec['other'][s]+=1
            if len(rec['examples'])<3: rec['examples'].append((s,o['expect']['target_text'],o['set']['target_text']))
    rec['other']=dict(sorted(rec['other'].items())); rec['other_total']=sum(rec['other'].values())
    out[n]=rec
for n in [7,36,38,247,61,69,77,102,142,147,148,159,166,178,228]: run(n,ns['s%d'%n])
for n,t in ns['GT'].items(): run(n,lambda n=n,t=t: ns['E'].seed(n,t))
json.dump(out,open('proposals-raw.json','w'),ensure_ascii=False,indent=1)
for n,r in out.items(): print(n,len(r['lego_upd']),len(r['lego_new']),len(r['lego_del']),r['ph_added'],r['ph_deleted'],r['own_reworded'],r['other_total'],len(r['other']),r['findings'][:2])
