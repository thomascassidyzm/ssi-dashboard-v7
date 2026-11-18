# Edit model for cs #343·AI: holds the live course, records intended changes, emits Popty edit-batch ops.
import json,re,collections
from lib import *
C='gle_v2_for_eng'
class Ed:
    def __init__(s,path):
        s.S=load(path); s.L={}; s.P={}
        for n,sd in s.S.items():
            for l in sd['legos']:
                s.L[l['lego_id']]=l
                for p in l.get('basket_phrases') or []: s.P[p['id'].split(':')[1]]=dict(p,lego=l['lego_id'],seed=n)
        s.cur={k:[p['known_text'],p['target_text']] for k,p in s.P.items()}
        s.ops=collections.defaultdict(list); s.deleted=set(); s.lego_deleted=set(); s.new_legos={}; s.ins={}; s.taken=set(s.P)
        s.seedtext={}; s.legoset={}
    # ---- seeds
    def seed(s,n,target,known=None):
        sd=s.S[n]; st={}
        if target!=sd['target_text']: st['target_text']=target
        if known and known!=sd['known_text']: st['known_text']=known
        s.ops[n].append({'op':'seed.update','seed_number':n,'set':st,'expect':{'known_text':sd['known_text'],'target_text':sd['target_text']}})
        s.seedtext[n]=(known or sd['known_text'],target)
    # ---- legos
    def lego(s,lid,**st):
        L=s.L[lid]; s.ops[L['seed_number']].append({'op':'lego.update','lego_id':lid,'set':st,'expect':{'known_text':L['known_text'],'target_text':L['target_text'],'is_new':L['is_new']}})
        s.legoset[lid]=st
        if 'target_text' in st:   # word tiles of a re-cut LEGO go (as #253 did); its components are set on the LEGO
            for k,p in s.P.items():
                if p['lego']==lid and p['phrase_role']=='component': s.delp(k)
    def newlego(s,n,idx,known,target,comps,is_new=True):
        lid='S%04dL%02d'%(n,idx); assert lid not in s.L, lid
        row={'seed_number':n,'lego_index':idx,'known_text':known,'target_text':target,'type':'A' if len(target.split())==1 else 'M','is_new':is_new,'status':'draft'}
        if row['type']=='M': row['components']=[{'known':a,'target':b} for a,b in comps]
        s.ops[n].append({'op':'lego.insert','row':row}); s.new_legos[lid]=row; return lid
    def dellego(s,lid):
        L=s.L[lid]; s.lego_deleted.add(lid)
        s.ops[L['seed_number']].append({'op':'lego.delete','lego_id':lid,'cascade_phrases':True,'expect':{'target_text':L['target_text']}})
        for k,p in s.P.items():
            if p['lego']==lid: s.deleted.add(k)
    # ---- phrases
    def pid(s,k): return C+':'+k
    def delp(s,k):
        if k in s.deleted: return
        p=s.P[k]; s.deleted.add(k)
        if p['lego'] not in s.lego_deleted: s.ops[p['seed']].append({'op':'phrase.delete','phrase_id':p['id'],'expect':{'target_text':p['target_text']}})
    def set(s,k,known=None,target=None):
        if known is not None: s.cur[k][0]=known
        if target is not None: s.cur[k][1]=target
    def sub(s,rx,repl,krx=None,krepl=None,only=None,skip=(),flags=re.I):
        hit=[]
        for k,p in s.P.items():
            if p['phrase_role']=='component' or k in skip or (only and not only(p)): continue
            t=re.sub(rx,repl,s.cur[k][1],flags=flags)
            if t!=s.cur[k][1]:
                s.cur[k][1]=t; hit.append(k)
                if krx: s.cur[k][0]=re.sub(krx,krepl,s.cur[k][0],flags=re.I)
        return hit
    def nextid(s,lid,role):
        i=1
        while f"{lid}{role[0].upper()}{i:02d}" in s.taken: i+=1
        k=f"{lid}{role[0].upper()}{i:02d}"; s.taken.add(k); return k
    def add(s,lid,role,known,target,moved_from=None):
        n=int(lid[1:5]); idx=int(lid[6:8]); k=s.nextid(lid,role)
        row={'id':s.pid(k),'course_code':C,'seed_number':n,'lego_index':idx,'position':1+max([p.get('position') or 0 for p in s.P.values() if p['seed']==n and int(p['lego'][6:8])==idx]+[x['position'] for x in s.ins.values() if x['lego_index']==idx and x['seed_number']==n]+[100]),
             'known_text':known,'target_text':target,'phrase_role':role,'status':'draft','introduce':True,
             'metadata':{'format':'build_use','authored':'cs #343·AI, Eoghan line taken, 16 Nov 2026'+(', moved from '+moved_from if moved_from else '')},
             'connected_lego_ids':[],'lego_position':'middle','word_count':len(target.split()),'lego_count':len(target.split())}
        s.ins[k]=row; s.ops[n].append({'op':'phrase.insert','row':row}); return k
    def move(s,k,lid,role=None):
        p=s.P[k]; kn,tg=s.cur[k]; s.delp(k); return s.add(lid,role or p['phrase_role'],kn,tg,moved_from=k)
    # ---- emit
    def emit(s,seeds):
        out=[]
        for k,p in s.P.items():
            if k in s.deleted or p['phrase_role']=='component': continue
            kn,tg=s.cur[k]
            if [kn,tg]!=[p['known_text'],p['target_text']]:
                st={'target_text':tg}
                if kn!=p['known_text']: st['known_text']=kn
                s.ops[p['seed']].append({'op':'phrase.update','phrase_id':p['id'],'set':st,'expect':{'known_text':p['known_text'],'target_text':p['target_text']}})
        pri={'seed.update':0,'lego.insert':1,'lego.update':2,'phrase.insert':3,'phrase.update':4,'phrase.delete':5,'lego.delete':6}
        for n in sorted(s.ops):
            for o in sorted(s.ops[n],key=lambda o:pri[o['op']]): out.append(o)
        return out
    # ---- after-state view, for checks
    def after(s):
        legos={}
        for lid,L in s.L.items():
            if lid in s.lego_deleted: continue
            st=s.legoset.get(lid,{})
            legos[lid]=dict(known=st.get('known_text',L['known_text']),target=st.get('target_text',L['target_text']),is_new=st.get('is_new',L['is_new']),seed=L['seed_number'],idx=L['lego_index'])
        for lid,r in s.new_legos.items(): legos[lid]=dict(known=r['known_text'],target=r['target_text'],is_new=r['is_new'],seed=r['seed_number'],idx=r['lego_index'])
        ph={}
        for k,p in s.P.items():
            if k in s.deleted or p['phrase_role']=='component': continue
            ph[k]=dict(lego=p['lego'],known=s.cur[k][0],target=s.cur[k][1],changed=s.cur[k]!=[p['known_text'],p['target_text']])
        for k,r in s.ins.items(): ph[k]=dict(lego=k[:8],known=r['known_text'],target=r['target_text'],changed=True)
        return legos,ph
