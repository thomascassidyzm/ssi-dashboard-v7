import io,contextlib,json,sys
f=io.StringIO()
with contextlib.redirect_stdout(f): exec(open('count.py').read())
exec(open('data.py').read())
K=json.load(open('ko780.json'))['seeds']; KO={x['seed_number']:x for x in K}
LT={}
for l in sorted(L.values(),key=lambda l:(-(l['seed_number']>=1000),l['seed_number'])):
  LT.setdefault(key(l['target_text']),l)
def aud(x): return x.get('target1_audio_id') and x.get('target2_audio_id')
def legoreuse(w,n):
  own=[l for l in S[1000+n]['legos'] if key(l['target_text'])==key(w)]
  l=own[0] if own else LT.get(key(w))
  if l and aud(l): return f"existing({l['lego_id']} t1={l['target1_audio_id'][:8]} t2={l['target2_audio_id'][:8]})"
  if l: return f"new (source LEGO {l['lego_id']} has no t1+t2)"
  return 'new'
def phrasereuse(w,n):
  if key(w)==key(S[1000+n]['target_text']):
    s=S[1000+n]
    if aud(s): return f"existing(seed S{1000+n} t1={s['target1_audio_id'][:8]} t2={s['target2_audio_id'][:8]})"
    return f"new (seed S{1000+n} lacks t1+t2)"
  hs=byT.get(key(w),[])
  ha=[p for p in hs if aud(p)]
  if ha: p=ha[0]; return f"existing({p['id'].split(':')[1]} t1={p['target1_audio_id'][:8]} t2={p['target2_audio_id'][:8]})"
  if hs: return f"new (row {hs[0]['id'].split(':')[1]} exists, no t1+t2)"
  return 'new'
rows=[]; surv={}
for n,s,rr in out:
  surv[n]=sum(len(r.get('good',[])) for r in rr)
for n in range(1,31):
  s=S[1000+n]; ko=KO[n]
  base=dict(seed=n,source_seed=f"cym_nv2_for_eng S{1000+n}")
  rows.append(dict(base,kind='seed',welsh=s['target_text'],korean=ko['korean'],english=s['known_text'],same_or_changed='same',reason='',reuse=phrasereuse(s['target_text'],n),weave_dropped=bool(D.get(n,{}).get('weave_dropped')) or n in (2,13)))
  legos=D[n]['legos'] if n in D else G[n]
  for i,(w,k,sc,why) in enumerate(legos,1):
    rows.append(dict(base,kind='lego',lego_id=f"S{n:04d}L{i:02d}",welsh=w,korean=k,same_or_changed=sc,reason=why,reuse=legoreuse(w,n),intro_ko=f"‘{k}’는 웨일스어로 이렇게 말해요."))
  if n in D:
    for j,(w,k,u) in enumerate(D[n]['phrases'],1):
      ru=phrasereuse(w,n)
      kept='kept' if ru.startswith('existing') or 'exists' in ru else 'new'
      rows.append(dict(base,kind='phrase',under_lego=u,welsh=w,korean=k,same_or_changed=kept,reason='' if kept=='kept' else 'no source phrase usable at this point; written to fill the basket',reuse=ru))
    for w,why in D[n].get('swapped',[]):
      rows.append(dict(base,kind='phrase_dropped',welsh=w,korean=None,same_or_changed='swapped_out',reason=why,reuse='n/a'))
  else:
    rows.append(dict(base,kind='phrase_note',welsh=None,korean=None,same_or_changed='not built',reason=f'phrases not built in this slice; {surv.get(n,0)} source phrases pass the auto vocabulary check at this seed',reuse='unknown'))
json.dump(dict(about=dict(course='cym_for_kor',slice='HC seeds 1-30, text only',korean_from='origin/cs/780-cym-for-kor-step-3-proofread-kor @9a68ac155 (seeds 1-30 identical to cs/764; #780 still running)',source='cym_nv2_for_eng S1001-S1030 (Welsh identical to HC 1-30) + its older seeds 1-316 for LEGOs it relies on; read 23 Nov via GET :3470/api/production/cym_nv2_for_eng/seeds?status=all',reuse_note='reuse = an audio id present on the source row (t1+t2); not a clip-alive check'),rows=rows),open('seeds-1-30.json','w'),ensure_ascii=False,indent=1)
import collections
c=collections.Counter((r['kind'],r['same_or_changed']) for r in rows); print(c)
rc=collections.Counter((r['kind'],r['reuse'].split('(')[0].strip()) for r in rows); print(rc)
for r in rows:
  if r['seed']<=10 and r['kind'] in('phrase','lego'): print(r['seed'],r['kind'],r['welsh'],'|',r['reuse'])
