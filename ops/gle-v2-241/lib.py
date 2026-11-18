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
