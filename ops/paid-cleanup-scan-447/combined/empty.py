# read-only: empty audio slots on played rows (new LEGO; debut/build/use), and whether the same words already have a clip
import json,glob,sys,os,re,unicodedata
D=sys.argv[1]; courses=sys.argv[2:]
def norm(t): 
    t=unicodedata.normalize('NFC',str(t or '')).strip().lower()
    t=re.sub(r'[\s]+',' ',t); return re.sub(r'[。？！、，.!?,;:¿¡؟،"“”«»…]+','',t).strip()
def langs(c):
    tgt,kn=c.split('_for_'); return tgt.split('_')[0], kn
pool={}   # (lang, normtext) -> set of (course, side)
dumps={}
for f in glob.glob(D+'/*.json'):
    d=json.load(open(f)); c=d['course']; dumps[c]=d; tl,kl=langs(c)
    for s in d['seeds']:
        for l in s['legos']:
            for p in l['phrases']:
                if p.get('ka'): pool.setdefault((kl,norm(p['known'])),set()).add((c,'k'))
                for sl in ('t1','t2'):
                    if p.get(sl): pool.setdefault((tl,norm(p['target'])),set()).add((c,sl))
res={}
for c in courses:
    d=dumps.get(c)
    if not d: print(c,'NO DUMP'); continue
    tl,kl=langs(c); rows=0; slots={'ka':0,'t1':0,'t2':0}; same=0; other=0; none=0; ch_none=0; ch_all=0; ex=[]
    for s in d['seeds']:
        for l in s['legos']:
            if not l['is_new']: continue
            for p in l['phrases']:
                if p['type'] not in ('lego_debut','build','use'): continue
                e=[x for x in ('ka','t1','t2') if not p.get(x)]
                if not e: continue
                rows+=1
                for x in e:
                    slots[x]+=1
                    lang,txt=(kl,p['known']) if x=='ka' else (tl,p['target'])
                    hits=pool.get((lang,norm(txt)),set())
                    want=('k' if x=='ka' else None)
                    insame=any(cc==c and (sd=='k')==(x=='ka') for cc,sd in hits)
                    ch_all+=len(txt or '')
                    if insame: same+=1
                    elif hits: other+=1
                    else:
                        none+=1; ch_none+=len(txt or '')
                        if len(ex)<3: ex.append((p['id'].replace(c+':',''),x,p['known'],p['target']))
    res[c]=dict(rows=rows,slots=slots,link_same_course=same,link_other_course=other,need_render=none,chars_render=ch_none,chars_if_all=ch_all,examples=ex)
    print(c,json.dumps(res[c],ensure_ascii=False))
json.dump(res,open(os.environ['CS_SCRATCH']+'/empty.json','w'),ensure_ascii=False,indent=1)
