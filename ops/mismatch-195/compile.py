#!/usr/bin/env python3
"""compile.py — merge judge runs (main + r2 re-runs of incomplete baskets) and Sonnet adjudications into one findings
table per course: ~/ssi-evidence/.../mismatch-195/findings.jsonl. Object-drop in zho/jpn/kor is held apart: those
languages leave a recoverable object unsaid as ordinary grammar, so Kai's 30 Oct clitic ruling (made on Italian) is not
applied to them without his say. (job #195)"""
import json, os, collections
E=os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195')
COURSES='ita fra spa por deu ara zho jpn kor'.split()
PRODROP={'zho','jpn','kor'}
rows=[]; stats={}
for c in COURSES:
    C=c+'_for_eng'
    units={}
    for l in open(f'{E}/units/{C}.jsonl'):
        u=json.loads(l); units[u['basket']]=u
    judged=set(); flags={}
    for path in (f'{E}/runs/{C}.jsonl', f'{E}/r2/{C}.runs.jsonl'):
        if not os.path.exists(path): continue
        for l in open(path):
            r=json.loads(l)
            for v in r.get('verdicts') or []:
                if not isinstance(v,dict): continue
                judged.add(v.get('id'))
                if v.get('verdict')=='DEFECT' and (v.get('confidence') or 0)>=4: flags[v['id']]=v
    adj={}
    for path in (f'{E}/adj/{C}.jsonl', f'{E}/r2/{C}.adj.jsonl'):
        if not os.path.exists(path): continue
        for l in open(path):
            r=json.loads(l)
            fl={f['id']:f for f in r['flags']}
            for a in r.get('answers') or []:
                if a.get('id') in adj: continue
                f=fl.get(a.get('id'),{})
                adj[a['id']]={'course':C,'seed':r['seed'],'basket':r['basket'],'lego':r['lego'],'seed_pair':r['seed_pair'],
                              'known':f.get('known'),'target':f.get('target'),'role':f.get('role'),'haiku_conf':f.get('confidence'),
                              'haiku_chunk':f.get('chunk'),**{k:a.get(k) for k in ('decision','severity','cause','what','fix','fixed_known','fixed_target','why','lego')}}
                adj[a['id']]['lego_id']=a.get('lego'); adj[a['id']]['lego']=r['lego']
    allph={p['id'] for u in units.values() for p in u['phrases']}
    for pid,a in adj.items():
        a['id']=pid
        a['bucket']=('lego-level' if a['decision']=='LEGO_LEVEL' else 'rejected' if a['decision']!='CONFIRM'
                     else 'held-prodrop-object' if (c in PRODROP and a['cause']=='dropped-object') else 'phrase-defect')
        rows.append(a)
    b=collections.Counter(a['bucket'] for a in adj.values())
    stats[C]={'baskets':len(units),'phrases':len(allph),'phrases_judged':len(allph & judged),'flags_ge4':len(flags),
              'adjudicated':len(set(flags)&set(adj)),**b}
with open(f'{E}/findings.jsonl','w') as f:
    for r in rows: f.write(json.dumps(r,ensure_ascii=False)+'\n')
json.dump(stats,open(f'{E}/stats.json','w'),indent=1)
for k,v in stats.items(): print(k,v)
