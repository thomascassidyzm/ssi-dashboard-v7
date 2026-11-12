# Shared helpers for the #241 apply (gle_v2_for_eng). Reads course.json built from Popty GET routes
# (/seeds, /seed/:n/baskets, /lego/:id/basket). Decisions are plain dicts filled by fam_*.py files.
import json,re,os
SC=os.environ.get('CS_SCRATCH','.')
c=json.load(open(os.path.join(SC,'course.json')));S=c['S'];LA=c['LA'];R=c['rows']
SEED={}    # n -> (known,target,family,why)
LEGO={}    # lego_id -> (set-dict,family,why)
PH={}      # phrase key -> ('upd',known,target,family,why) | ('del',None,None,family,why)
INS_LEGO=[]; INS_PH=[]
def seed(n,known=None,target=None,fam='',why=''):
    s=S[str(n)]; SEED[n]=(known or s['known'],target or s['target'],fam,why)
def lego(k,fam='',why='',**setd): LEGO[k]=(setd,fam,why)
def upd(k,known=None,target=None,fam='',why=''):
    r=R[k]; PH[k]=('upd',known if known is not None else r['known_text'],target if target is not None else r['target_text'],fam,why)
def dele(k,fam='',why=''): PH[k]=('del',None,None,fam,why)
def sub(k,pairs,fam='',why='',kpairs=()):
    """candidate by literal substitution; every result is printed and read before use"""
    r=R[k]; t=r['target_text']; kn=r['known_text']
    for a,b in pairs:
        t=re.sub(a,b,t)
    for a,b in kpairs: kn=re.sub(a,b,kn)
    PH[k]=('upd',kn,t,fam,why)
def show(fam):
    for n,(k,t,f,w) in sorted(SEED.items()):
        if f==fam: print(f"SEED {n}\n   - {S[str(n)]['known']} | {S[str(n)]['target']}\n   + {k} | {t}")
    for k,(sd,f,w) in sorted(LEGO.items()):
        if f==fam: l=LA[k]; print(f"LEGO {k}\n   - {l['known_text']} | {l['target_text']} | {json.dumps(l['components'],ensure_ascii=False)}\n   + {json.dumps(sd,ensure_ascii=False)}")
    for k,v in sorted(PH.items()):
        if v[3]==fam:
            r=R[k]
            if v[0]=='del': print(f"DEL {k} {r['phrase_role']}\n   - {r['known_text']} | {r['target_text']}   [{v[4]}]")
            else:
                same_k = v[1]==r['known_text']
                print(f"{k} {r['phrase_role'][:1]}\n   - {'' if same_k else r['known_text']+' | '}{r['target_text']}\n   + {'' if same_k else v[1]+' | '}{v[2]}")
# --- #253 additions: LEGO deletes, phrase inserts, and "rewrite a basket" helpers ---
DEL_LEGO={}   # lego_id -> (family, why); phrases under it go with it (cascade)
def lego_del(k,fam='',why=''): DEL_LEGO[k]=(fam,why)
def _free(lid,role):
    used={k for k in R if k.startswith(lid)}|{r['id'].split(':')[1] for r in INS_PH}
    i=1
    while f"{lid}{role[0].upper()}{i:02d}" in used: i+=1
    return f"{lid}{role[0].upper()}{i:02d}"
def ins(lid,role,known,target,fam='',why=''):
    k=_free(lid,role); pos=1+sum(1 for r in INS_PH if r['id'].split(':')[1].startswith(lid))+max([R[q].get('position') or 0 for q in R if R[q]['lego']==lid]+[0])
    INS_PH.append({"id":"gle_v2_for_eng:"+k,"course_code":"gle_v2_for_eng","seed_number":int(lid[1:5]),"lego_index":int(lid[6:8]),"position":pos,
      "known_text":known,"target_text":target,"phrase_role":role,"status":"draft","metadata":{"format":"build_use","pipeline":"v2","authored":"job #403, 12 Nov 2026","family":fam},
      "connected_lego_ids":[],"lego_position":"middle","introduce":True,"word_count":len(target),"lego_count":len(target.split())})
def basket(lid,pairs,fam='',why=''):
    """Rewrite a LEGO's whole BUILD/USE basket: pairs = [(role,known,target)...] in order. Existing rows of the
    same role are reused in id order; surplus rows are deleted; missing ones inserted. Component rows are deleted
    (they are the old LEGO's word tiles and are never played)."""
    have={'build':sorted(k for k,r in R.items() if r['lego']==lid and r['phrase_role']=='build'),
          'use':sorted(k for k,r in R.items() if r['lego']==lid and r['phrase_role']=='use')}
    for k,r in R.items():
        if r['lego']==lid and r['phrase_role']=='component': dele(k,fam,'stale word tile of the re-cut LEGO')
    for role,kn,tg in pairs:
        if have[role]:
            k=have[role].pop(0)
            if R[k]['known_text']==kn and R[k]['target_text']==tg: continue
            upd(k,kn,tg,fam,why)
        else: ins(lid,role,kn,tg,fam,why)
    for role in have:
        for k in have[role]: dele(k,fam,why or 'surplus after the basket was rewritten')
