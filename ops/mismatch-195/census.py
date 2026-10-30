import json,glob,os,sys
rows=[]
for f in sorted(glob.glob('courses/*.json')):
    c=os.path.basename(f)[:-5]
    try: d=json.load(open(f))
    except Exception as e: rows.append((c,'ERR',str(e)[:60])); continue
    if not isinstance(d,dict) or 'seeds' not in d: rows.append((c,'ERR',str(d)[:60])); continue
    seeds=len(d['seeds']); legos=newl=played=comp=notnew=0; chars=0
    for s in d['seeds']:
        for l in s['legos']:
            legos+=1
            if l['is_new']: newl+=1
            for p in l.get('basket_phrases') or []:
                if p['phrase_role']=='component': comp+=1; continue
                if not l['is_new']: notnew+=1; continue
                played+=1; chars+=len(p['known_text'] or '')+len(p['target_text'] or '')
    rows.append((c,seeds,legos,newl,played,comp,notnew,chars))
json.dump(rows,open('cal/census.json','w'))
print('courses',len(rows),'with played>0',sum(1 for r in rows if r[1]!='ERR' and r[4]>0))
print('total played phrases',sum(r[4] for r in rows if r[1]!='ERR'),'played baskets',sum(r[3] for r in rows if r[1]!='ERR'))
for r in rows: print(*r)
