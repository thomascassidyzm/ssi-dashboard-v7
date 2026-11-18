"""Aran ruling 2026-10-28 (job #983): in cym_nv2_for_eng / cym_sv2_for_eng Welsh 'golygu' ALWAYS = English 'mean', 'meddwl' ALWAYS = 'think'.
Every row whose Welsh has meddwl/feddwl paired with English mean/means/meant/meaning gets golygu, with grammar:
  fronted object / interrogative (be’|beth|pwy|pa un … ’n meddwl), and the components of those M-LEGOs -> 'ei olygu'
  soft-mutated feddwl (sv2)                                                                          -> 'olygu'
  otherwise                                                                                          -> 'golygu'
English untouched. Skipped by ruling: nv2 S1432L01 'dan ni ddim yn meddwl' rows (ambiguous). Rows whose new text would make an exact
(known,target) duplicate of a row that was not already its duplicate are held, not changed. Spoken Welsh changes, so clip text is NOT
relabelled: the old takes surface on the computed Re-record card.
Input: fresh Popty read dump (GET /api/production/<course>/seeds?status=all). No SQL.
Usage: build-ops.py <course> <dump.json> <census-ids.json> <outdir>"""
import json,re,sys,copy,collections
course,dump,census,outdir=sys.argv[1:5]
d=json.load(open(dump))
census_ids=set(json.load(open(census))[course])
MW=re.compile(r"(?<![\w’'])([mf])eddwl(?![\w’'])")
ME=re.compile(r"\bmean(s|t|ing)?\b",re.I)
EI=re.compile(r"(?<![\w’'])(be’|beth|pwy|pa un)(?![\w’']).*’n meddwl")
SKIP={'cym_nv2_for_eng':{'S1432L01B03','S1432L01U03'}}.get(course,set())
EI_COMPONENT_LEGOS={'S1008L03','S1263L02'}   # M-LEGOs 'what I mean' / 'who you mean': their 'I mean'/'you mean' piece is '… ’n ei olygu'
MEAN_LEGO={'cym_nv2_for_eng':'S0262L03','cym_sv2_for_eng':'S0279L03'}[course]

def form(t,ei=False):
    m=MW.search(t)
    if m.group(1)=='f': return 'olygu'
    if ei or EI.search(t): return 'ei olygu'
    return 'golygu'
def swap(t,f):
    assert len(MW.findall(t))==1,t
    return MW.sub(f,t,count=1)
def swap_dec(dec,f):
    if not dec: return dec
    out=[];n=0
    for seg in dec:
        tg=seg['target']
        if MW.search(tg):
            n+=1
            lead=tg[:len(tg)-len(tg.lstrip())]
            if f=='ei olygu' and tg.strip() in ('meddwl',) and seg.get('legoId'):
                out.append({'known':'','legoId':None,'target':lead+'ei','isGhost':True})
                out.append({**seg,'target':' olygu'})
                continue
            out.append({**seg,'target':swap(tg,f)})
        else: out.append(seg)
    assert n==1,dec
    return out

rows=[];seen=set()
for s in d['seeds']:
    rows.append(('seed',s['seed_id'],s,None))
    for l in s['legos']:
        rows.append(('lego',l['lego_id'],l,None))
        for p in l.get('basket_phrases') or []:
            if p['id'] in seen: continue
            seen.add(p['id']); rows.append(('phrase',p['id'].split(':')[1],p,l['lego_id']))

ops=[];plan=[];skipped=[]
for kind,rid,r,parent in rows:
    tg=r['target_text'] or '';kn=r['known_text'] or ''
    if not (MW.search(tg) and ME.search(kn)): continue
    if rid in SKIP:
        skipped.append({'kind':kind,'id':rid,'known':kn,'target':tg,'why':"ruling: nv2 S1432L01 'dan ni ddim yn meddwl' is ambiguous (intend vs signify) - left for Aran"}); continue
    is_comp=kind=='phrase' and r['phrase_role']=='component' and parent in EI_COMPONENT_LEGOS
    f=form(tg,ei=is_comp)
    new=swap(tg,f)
    entry={'kind':kind,'id':rid,'role':r.get('phrase_role') if kind=='phrase' else kind,'known':kn,'old':tg,'new':new,'form':f,'extra':rid not in census_ids}
    if kind=='seed':
        op={'op':'seed.update','seed_number':r['seed_number'],'set':{'target_text':new},'expect':{'target_text':tg,'known_text':kn}}
    elif kind=='lego':
        st={'target_text':new};ex={'target_text':tg,'known_text':kn}
        if r.get('components'):
            nc=[]
            for c in r['components']:
                if MW.search(c['target']):
                    cf='ei olygu' if rid in EI_COMPONENT_LEGOS else form(c['target'])
                    nc.append({**c,'target':swap(c['target'],cf)})
                else: nc.append(c)
            st['components']=nc;ex['components']=r['components'];entry['components']=nc
        op={'op':'lego.update','lego_id':rid,'set':st,'expect':ex}
    else:
        st={'target_text':new};ex={'target_text':tg,'known_text':kn}
        if r.get('decomposition'):
            if is_comp:
                nd=[{'known':'','legoId':None,'target':tg.replace(' meddwl',''),'isGhost':True},
                    {'known':'','legoId':None,'target':' ei','isGhost':True},
                    {'known':'mean','legoId':MEAN_LEGO,'target':' olygu','isGhost':False}]
            else: nd=swap_dec(r['decomposition'],f)
            assert ''.join(s['target'] for s in nd)==new,(rid,nd,new)
            st['decomposition']=nd;ex['decomposition']=r['decomposition']
        op={'op':'phrase.update','phrase_id':r['id'],'set':st,'expect':ex}
    entry['op']=op;plan.append(entry)

# duplicate guard: after-edit (known,target) pairs vs every other row of the same table
def table(k): return 'phrase' if k=='phrase' else k
after={};before={}
for kind,rid,r,_ in rows:
    before[(table(kind),rid)]=(r['known_text'] or '',r['target_text'] or '')
    after[(table(kind),rid)]=before[(table(kind),rid)]
for e in plan: after[(table(e['kind']),e['id'])]=(e['known'],e['new'])
idx=collections.defaultdict(list)
for k,v in after.items(): idx[(k[0],)+tuple(x.strip().lower() for x in v)].append(k[1])
final=[]
for e in plan:
    key=(table(e['kind']),e['known'].strip().lower(),e['new'].strip().lower())
    others=[o for o in idx[key] if o!=e['id']]
    created=[o for o in others if tuple(x.strip().lower() for x in before[(key[0],o)])!=tuple(x.strip().lower() for x in before[(key[0],e['id'])])]
    if created:
        skipped.append({**{k:e[k] for k in ('kind','id','known','old','new')},'why':'would duplicate '+', '.join(created)}); continue
    if others: e['already_duplicate_of']=others
    final.append(e)
json.dump({'ops':[e['op'] for e in final]},open(f'{outdir}/{course}.ops.json','w'),ensure_ascii=False,indent=1)
json.dump({'plan':[{k:v for k,v in e.items() if k!='op'} for e in final],'skipped':skipped,
           'census_not_found':sorted(census_ids-{e['id'] for e in final}-{s['id'] for s in skipped})},
          open(f'{outdir}/{course}.plan.json','w'),ensure_ascii=False,indent=1)
c=collections.Counter((e['kind'],e['extra']) for e in final)
print(course,'ops',len(final),dict(c),'skipped',len(skipped),'census ids not planned',sorted(census_ids-{e['id'] for e in final}-{s['id'] for s in skipped}))
