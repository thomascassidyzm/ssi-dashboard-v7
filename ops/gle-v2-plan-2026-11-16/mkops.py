# Diffs plan.json against live-snapshot.json and writes ops.json (Popty edit-batch ops, never applied by this job),
# knockons.json (per seed: what changes and which phrases go, move or need writing) and a console summary.
import json,re,sys,collections
from syl import syl
import build
from build import tok,dm,demut,find,subseq
c=json.load(open('live-snapshot.json'));S=c['S'];LA=c['LA'];R=c['rows']
P=json.load(open('plan.json'))['plan']; P={int(k):v for k,v in P.items()}
C='gle_v2_for_eng'
GT300=json.load(open('seeds-over-300.json'))
SUBS=json.load(open('phrase-subs.json'))
HAND=json.load(open('hand-phrases.json')) if __import__('os').path.exists('hand-phrases.json') else {}
norm=lambda t:' '.join(tok(t))
live_by_seed=collections.defaultdict(list)
for k in sorted(LA): live_by_seed[LA[k]['seed_number']].append(k)
ops=collections.defaultdict(list)   # seed -> ops
K={}                                # per-seed knock-on record
def rec(n): return K.setdefault(n,{'seed':None,'legos':[],'phr_deleted':[],'phr_moved_out':[],'phr_moved_in':[],'phr_reworded':[],'phr_written':[],'needs_phrases':[],'order_differs':False})
# pairs available as components
pairs={}
for n in sorted(P):
    for l in P[n]['legos']: pairs.setdefault(norm(l['target']),l['known'])
def components(l):
    lt=tok(l['target']); out=[];i=0
    while i<len(lt):
        for j in range(len(lt),i,-1):
            if j-i==len(lt): continue
            key=' '.join(lt[i:j])
            if key in pairs or ' '.join(dm(lt[i:j])) in pairs:
                out.append({'known':pairs.get(key) or pairs[' '.join(dm(lt[i:j]))],'target':' '.join(l['target'].split()[i:j]).strip('?,.')}); i=j; break
        else: i+=1
    return out
# ---- LEGO layer
newid={}   # (seed, plan index) -> lego_id
for n in range(1,301):
    live=live_by_seed[n]; pl=P[n]['legos']; r=rec(n)
    if P[n]['text_changes']:
        ops[n].append({'op':'seed.update','seed_number':n,'set':{k:v for k,v in(('known_text',P[n]['known']),('target_text',P[n]['target'])) if v!=S[str(n)][{'known_text':'known','target_text':'target'}[k]]},'expect':{'known_text':S[str(n)]['known'],'target_text':S[str(n)]['target']}})
        r['seed']={'before':[S[str(n)]['known'],S[str(n)]['target']],'after':[P[n]['known'],P[n]['target']]}
    m={}; used=set()
    for i,l in enumerate(pl):
        for k in live:
            if k not in used and norm(LA[k]['target_text'])==norm(l['target']): m[i]=k; used.add(k); break
    for i,l in enumerate(pl):          # re-cuts: best token overlap with an unmatched live LEGO
        if i in m: continue
        best=None
        for k in live:
            if k in used: continue
            a=set(dm(tok(LA[k]['target_text']))); b=set(dm(tok(l['target']))); j=len(a&b)/len(a|b)
            if j>=0.5 and (best is None or j>best[0]): best=(j,k)
        if best: m[i]=best[1]; used.add(best[1])
    free=max([LA[k]['lego_index'] for k in live]+[0])
    order=[]
    for i,l in enumerate(pl):
        typ='A' if len(tok(l['target']))==1 else 'M'
        if i in m:
            k=m[i]; L=LA[k]; sd={}
            if L['known_text']!=l['known']: sd['known_text']=l['known']
            if norm(L['target_text'])!=norm(l['target']): sd['target_text']=l['target']
            if L['is_new']!=l['is_new']: sd['is_new']=l['is_new']
            if 'target_text' in sd:
                comp=components(l)
                if typ=='M' and comp: sd['components']=comp
                if typ!=L['type'] and (typ=='A' or comp): sd['type']=typ
            if sd: ops[n].append({'op':'lego.update','lego_id':k,'set':sd,'expect':{'known_text':L['known_text'],'target_text':L['target_text'],'is_new':L['is_new']}})
            newid[(n,i)]=k; order.append(L['lego_index'])
            r['legos'].append({'id':k,'action':'keep' if not sd else 'change','before':[L['known_text'],L['target_text'],L['is_new']],'known':l['known'],'target':l['target'],'is_new':l['is_new'],'syl':l['syl'],'frame':l['frame'],'note':l['note']})
        else:
            free+=1; k='S%04dL%02d'%(n,free); comp=components(l)
            if typ=='M' and not comp: comp=[{'known':l['known'],'target':l['target']}]
            row={'seed_number':n,'lego_index':free,'known_text':l['known'],'target_text':l['target'],'type':typ,'is_new':l['is_new'],'status':'draft'}
            if typ=='M': row['components']=comp
            ops[n].append({'op':'lego.insert','row':row}); newid[(n,i)]=k; order.append(free)
            r['legos'].append({'id':k,'action':'add','known':l['known'],'target':l['target'],'is_new':l['is_new'],'syl':l['syl'],'frame':l['frame'],'note':l['note']})
    r['order_differs']=order!=sorted(order)
    for k in live:
        if k not in used:
            r['legos'].append({'id':k,'action':'remove','before':[LA[k]['known_text'],LA[k]['target_text'],LA[k]['is_new']]})
for n,(kn,tg) in sorted((int(a),b) for a,b in GT300.items()):
    ops[n].append({'op':'seed.update','seed_number':n,'set':{'target_text':tg},'expect':{'target_text':S[str(n)]['target']}})
    rec(n)['seed']={'before':[S[str(n)]['known'],S[str(n)]['target']],'after':[kn,tg]}
# ---- phrases
planL={}   # lego_id -> plan lego (after)
for (n,i),k in newid.items(): planL[k]=dict(P[n]['legos'][i],seed=n,idx=i)
removed={k for k in LA if k not in planL}
def contains(text,l):
    a=tok(text); b=tok(l['target'])
    if l.get('standin'): b=[w for w in b if w in a or demut(w) in dm(a)]
    if l['frame']: return bool(subseq(a,b) or subseq(dm(a),dm(b)))
    return bool(find(a,b) or find(dm(a),dm(b)))
# vocabulary available at (seed, order) : tokens of every LEGO target up to there, live and plan
def avail(layer):
    seq=[]
    if layer=='live':
        for k in sorted(LA,key=lambda k:(LA[k]['seed_number'],LA[k]['lego_index'])): seq.append((LA[k]['seed_number'],set(dm(tok(LA[k]['target_text'])))))
    else:
        for n in range(1,301):
            for l in P[n]['legos']: seq.append((n,set(dm(tok(l['target'])))))
    cum={};acc=set()
    for n in range(1,301):
        for s,t in seq:
            if s==n: acc|=t
        cum[n]=set(acc)
    return cum
AL=avail('live'); AP=avail('plan')
text={k:[r['known_text'],r['target_text']] for k,r in R.items()}   # after-text of each phrase
fate={}                                                             # phrase key -> ('del',why)
# 1 course-wide rewordings that follow a seed-text correction
for k,r in sorted(R.items()):
    if r['phrase_role']=='component': continue
    kn,tg=text[k]
    for s in SUBS:
        if re.search(s['find'],tg) and (not s.get('known') or re.search(s['known'],kn,re.I)):
            tg2=re.sub(s['find'],s['repl'],tg)
            if tg2!=tg: tg=tg2; rec(r and LA[r['lego']]['seed_number'])['phr_reworded'].append({'id':k,'before':text[k][1],'after':tg,'why':s['why']})
    text[k][1]=tg
# 2 phrases under a removed or re-cut LEGO, and plan-made "used before taught"
for k,r in sorted(R.items()):
    lid=r['lego']; n=LA[lid]['seed_number']
    if r['phrase_role']=='component':
        if lid in removed or norm(LA[lid]['target_text'])!=norm(planL[lid]['target']): fate[k]=('del','word tile of a LEGO that is removed or re-cut')
        continue
    if lid in removed: fate[k]=('del','its LEGO is removed'); continue
    if not contains(text[k][1],planL[lid]): fate[k]=('del','no longer contains its LEGO ('+planL[lid]['target']+')'); continue
    t=set(dm(tok(text[k][1])))
    lost=[w for w in t if w in AL[n] and w not in AP[n]]
    if lost: fate[k]=('del','uses a piece now taught later: '+' '.join(sorted(lost)))
# 3 re-homing (canon P25): a phrase that would be deleted, or whose basket stops playing because its LEGO is now
#   not-new, moves under a NEW LEGO it contains whole, if every word in it is taught by that seed. Cap 12 per basket.
surv=collections.Counter(R[k]['lego'] for k in R if k not in fate and R[k]['phrase_role']!='component' and planL[R[k]['lego']]['is_new'])
texts_in=collections.defaultdict(set)
for k in R:
    if k not in fate and R[k]['phrase_role']!='component': texts_in[R[k]['lego']].add(norm(text[k][1]))
inserted=[]; taken=set(R); dark=[]
def nextid(lid,role):
    i=1
    while f"{lid}{role[0].upper()}{i:02d}" in taken: i+=1
    taken.add(f"{lid}{role[0].upper()}{i:02d}"); return f"{lid}{role[0].upper()}{i:02d}"
newL=sorted(((lid,l) for lid,l in planL.items() if l['is_new']),key=lambda x:(-len(tok(x[1]['target'])),x[1]['seed'],x[1]['idx']))
firstcopy={}
for lid,l in planL.items():
    if l['is_new']: firstcopy[norm(l['target'])]=lid
def put(k,lid,why):
    l=planL[lid]; r=R[k]; n=l['seed']; pid=nextid(lid,r['phrase_role'])
    row={'id':C+':'+pid,'course_code':C,'seed_number':n,'lego_index':int(lid[6:8]),'position':100+surv[lid]+1,'known_text':text[k][0],'target_text':text[k][1],'phrase_role':r['phrase_role'],'status':'draft','introduce':True,
         'metadata':{'format':'build_use','authored':'plan cs #107, 16 Nov 2026','moved_from':k},'connected_lego_ids':[],'lego_position':'middle','word_count':len(text[k][1]),'lego_count':len(text[k][1].split())}
    inserted.append((n,row)); surv[lid]+=1; texts_in[lid].add(norm(text[k][1]))
    rec(n)['phr_moved_in'].append({'id':pid,'from':k,'known':text[k][0],'target':text[k][1]})
    fate[k]=('moved','to '+lid+' ('+l['target']+'): '+why)
for k,r in sorted(R.items()):
    if r['phrase_role']=='component': continue
    src=r['lego']; srcseed=LA[src]['seed_number']
    goes_dark = k not in fate and LA[src]['is_new'] and not planL[src]['is_new']
    if k in fate and fate[k][0]=='del':
        t=set(dm(tok(text[k][1]))); best=None
        for lid,l in newL:
            if lid==src or surv[lid]>=12 or norm(text[k][1]) in texts_in[lid] or norm(text[k][1])==norm(l['target']): continue
            if l['seed']>srcseed+40: continue
            if contains(text[k][1],l) and t<=AP[l['seed']]: best=lid; break
        if best: put(k,best,fate[k][1])
    elif goes_dark:
        lid=firstcopy.get(norm(planL[src]['target'])); t=set(dm(tok(text[k][1])))
        if lid and lid!=src and surv[lid]<12 and t<=AP[planL[lid]['seed']] and norm(text[k][1]) not in texts_in[lid]: put(k,lid,'its own basket stops playing (the piece is now taught earlier)')
        else: dark.append(k)
# 4 a new LEGO still without practice gets its own seed sentence (canon P26), plus anything in hand-phrases.json
for lid,l in sorted(planL.items(),key=lambda x:(x[1]['seed'],x[1]['idx'])):
    if not l['is_new']: continue
    n=l['seed']; extra=[tuple(h) for h in HAND.get(lid,[])]
    if surv[lid]==0 and contains(P[n]['target'],l) and norm(P[n]['target'])!=norm(l['target']): extra.append((P[n]['known'],P[n]['target'],'use'))
    for h in extra:
        role=h[2] if len(h)>2 else 'use'; pid=nextid(lid,role)
        row={'id':C+':'+pid,'course_code':C,'seed_number':n,'lego_index':int(lid[6:8]),'position':100+surv[lid]+1,'known_text':h[0],'target_text':h[1],'phrase_role':role,'status':'draft','introduce':True,
             'metadata':{'format':'build_use','authored':'plan cs #107, 16 Nov 2026'},'connected_lego_ids':[],'lego_position':'middle','word_count':len(h[1]),'lego_count':len(h[1].split())}
        inserted.append((n,row)); surv[lid]+=1; rec(n)['phr_written'].append({'id':pid,'known':h[0],'target':h[1]})
    if surv[lid]==0: rec(n)['needs_phrases'].append({'lego':lid,'known':l['known'],'target':l['target']})
thin=[(lid,surv[lid]) for lid,l in planL.items() if l['is_new'] and surv[lid]<4]
for k,(a,why) in sorted(fate.items()):
    n=LA[R[k]['lego']]['seed_number']; rec(n)['phr_deleted' if a=='del' else 'phr_moved_out'].append({'id':k,'role':R[k]['phrase_role'],'known':R[k]['known_text'],'target':R[k]['target_text'],'why':why})
# ---- ops for phrases
for n,row in inserted: ops[n].append({'op':'phrase.insert','row':row})
for k,r in sorted(R.items()):
    n=LA[r['lego']]['seed_number']
    if k in fate:
        if r['lego'] in removed: continue      # goes with its LEGO (cascade)
        ops[n].append({'op':'phrase.delete','phrase_id':r['id'],'expect':{'target_text':r['target_text']}})
    elif text[k][1]!=r['target_text']:
        ops[n].append({'op':'phrase.update','phrase_id':r['id'],'set':{'target_text':text[k][1]},'expect':{'target_text':r['target_text']}})
for k in sorted(removed):
    ops[LA[k]['seed_number']].append({'op':'lego.delete','lego_id':k,'cascade_phrases':True,'expect':{'target_text':LA[k]['target_text']}})
pri={'seed.update':0,'lego.insert':1,'lego.update':2,'phrase.insert':3,'phrase.update':4,'phrase.delete':5,'lego.delete':6}
flat=[]
for n in sorted(ops):
    for o in sorted(ops[n],key=lambda o:pri[o['op']]): flat.append(dict(o,_seed=n))
json.dump({'ops':flat},open('ops.json','w'),ensure_ascii=False,indent=0)
json.dump({str(n):K[n] for n in sorted(K) if K[n]['seed'] or any(x['action']!='keep' for x in K[n]['legos']) or K[n]['phr_deleted'] or K[n]['phr_moved_in'] or K[n]['phr_reworded'] or K[n]['needs_phrases']},open('knockons.json','w'),ensure_ascii=False,indent=0)
cnt=collections.Counter(o['op'] for o in flat)
why=collections.Counter((v[0]+' '+re.sub(r'[:(].*','',v[1])) if v[0]=='del' else 'moved' for v in fate.values())
print(dict(cnt)); print(dict(why)); print('phrases reworded',sum(len(K[n]['phr_reworded']) for n in K),'moved in',sum(len(K[n]['phr_moved_in']) for n in K),'written',sum(len(K[n]['phr_written']) for n in K))
need=[(n,x['lego'],x['known'],x['target']) for n in sorted(K) for x in K[n]['needs_phrases']]
print('NEW LEGOs WITH NO PRACTICE',len(need));[print('  ',*x) for x in need]
print('thin baskets (<4 phrases) on new LEGOs',len(thin),'| phrases left in baskets that stop playing',len(dark))
json.dump({'thin':thin,'dark':dark},open('baskets.json','w'))
print('seeds changed',sum(1 for n in K if K[n]['seed'] or any(x['action']!='keep' for x in K[n]['legos'])),'order differs',[n for n in sorted(K) if K[n]['order_differs']][:400])
