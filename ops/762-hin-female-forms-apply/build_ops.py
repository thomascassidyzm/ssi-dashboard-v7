import json
sel=json.load(open('sel.json'))
exp={e['original_text']:e for e in json.load(open('718/state/exp.json'))}
HELD127={2647,2648,2650,2652,2653,2656,2657,2660}
# judged corrections for the 6 wrong (n1012 = merge's 6th)
WRONG_F={924:'थोड़ी थकी हुई हूँ।',926:'मैं आज थोड़ी थकी हुई हूँ।',931:'मैं थोड़ी थकी हुई हूँ लेकिन शुरू करना चाहती हूँ।',
 936:'लेकिन मैं इस सुबह थोड़ी थकी हुई हूँ।',991:'मैं थोड़ी थकी हुई महसूस कर रही हूँ।',1012:'मैं थोड़ी थकी हुई महसूस करने लगी थी।'}
# ambiguous: one subject in every live occurrence (seed 144 / 234, speaker) -> store
AMB_STORE={2973:'तो गई।',4487:'मिली',4488:'मिली।'}
ops=[];plan=[]
for x in sel:
  n=x['n']
  if x['v']=='needs-female':
    if n in HELD127: plan.append((n,'HELD-127',x['t'],x['f'])); continue
    assert x['t'] not in exp, n
    ops.append({'op':'gender.insert','row':{'original_text':x['t'],'language':'hin','expanded_f':x['f'],'expanded_m':None,'text_side':'target'}})
    plan.append((n,'insert',x['t'],x['f']))
  elif n in WRONG_F:
    e=exp[x['t']]
    ops.append({'op':'gender.update','id':e['id'],'set':{'expanded_f':WRONG_F[n]},'expect':{'original_text':x['t'],'expanded_f':e['expanded_f'],'expanded_m':e['expanded_m']}})
    plan.append((n,'update',x['t'],e['expanded_f']+' -> '+WRONG_F[n]))
  elif n in AMB_STORE:
    assert x['t'] not in exp
    ops.append({'op':'gender.insert','row':{'original_text':x['t'],'language':'hin','expanded_f':AMB_STORE[n],'expanded_m':None,'text_side':'target'}})
    plan.append((n,'insert-amb',x['t'],AMB_STORE[n]))
  else: plan.append((n,'no-write',x['t'],x['v']))
json.dump({'ops':ops},open('ops.json','w'),ensure_ascii=False)
import collections; print(collections.Counter(p[1] for p in plan), len(ops))
for p in plan:
  if p[1] in ('update','no-write','insert-amb'): print(p)
