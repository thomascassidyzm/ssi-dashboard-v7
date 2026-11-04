#!/usr/bin/env python3
"""report.py <out.md> — wave 2 of #195 (job #241): compiles wave2/runs + wave2/adj into wave2/findings.jsonl and
wave2/stats.json, and writes the plain-English per-course report. Read-only over local files.
Held apart (as wave 1 did for zho/jpn/kor): 'dropped-object' wherever either side is a language that leaves a
recoverable object unsaid as ordinary grammar (HELD_PRODROP), and politeness/honorific omissions (POLITE words in the
adjudicator's 'what'/'why'), so neither inflates a course's defect rate before Kai rules on them."""
import json, os, sys, glob, collections, statistics
E=os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195/wave2'); W1=os.path.dirname(E)
H=os.path.dirname(os.path.abspath(__file__))
HELD_PRODROP={'zho','jpn','kor','tha'}
POLITE=('polite','politeness','honorific','formal register','please','respectful')
CAUSES=['dropped-object','missing-chunk','extra-chunk','wrong-word','person-number','polarity','tense-modality','other']
def langs(c): a=c.split('_for_'); return {a[0].split('_')[0],a[1]}
order=[l.strip() for l in open(f'{H}/courses.txt') if l.strip()]
rows=[]; stats={}
for C in order:
    up=f'{E}/units/{C}.jsonl'
    if not os.path.exists(up): stats[C]={'status':'not started'}; continue
    units={json.loads(l)['basket']:json.loads(l) for l in open(up)}
    allph={p['id'] for u in units.values() for p in u['phrases']}
    judged=set(); jb=set(); flags={}
    if os.path.exists(f'{E}/runs/{C}.jsonl'):
        for l in open(f'{E}/runs/{C}.jsonl'):
            r=json.loads(l)
            if r.get('verdicts') is None: continue
            jb.add(r['basket'])
            for v in r['verdicts']:
                if not isinstance(v,dict): continue
                judged.add(v.get('id'))
                if v.get('verdict')=='DEFECT' and (v.get('confidence') or 0)>=4: flags[v['id']]=v
    adj={}
    if os.path.exists(f'{E}/adj/{C}.jsonl'):
        for l in open(f'{E}/adj/{C}.jsonl'):
            r=json.loads(l); fl={f['id']:f for f in r['flags']}
            for a in r.get('answers') or []:
                if not isinstance(a,dict) or a.get('id') in adj or a.get('id') not in fl: continue
                f=fl[a['id']]
                adj[a['id']]={'course':C,'id':a['id'],'seed':r['seed'],'basket':r['basket'],'lego':r['lego'],'seed_pair':r['seed_pair'],
                    'known':f.get('known'),'target':f.get('target'),'role':f.get('role'),'haiku_conf':f.get('confidence'),
                    **{k:a.get(k) for k in ('decision','severity','cause','what','fix','fixed_known','fixed_target','why')},'lego_id':a.get('lego')}
    for a in adj.values():
        txt=((a.get('what') or '')+' '+(a.get('why') or '')).lower()
        a['bucket']=('lego-level' if a['decision']=='LEGO_LEVEL' else 'rejected' if a['decision']!='CONFIRM'
            else 'held-prodrop-object' if (a['cause']=='dropped-object' and langs(C)&HELD_PRODROP)
            else 'held-politeness' if any(w in txt for w in POLITE) else 'phrase-defect')
        rows.append(a)
    conf=[a for a in adj.values() if a['bucket']=='phrase-defect']
    st=open(f'{E}/state/{C}').read().strip() if os.path.exists(f'{E}/state/{C}') else '?'
    stats[C]={'status':st,'baskets':len(units),'baskets_judged':len(jb),'phrases':len(allph),'phrases_judged':len(allph&judged),
        'flags_ge4':len(flags),'adjudicated':len(set(flags)&set(adj)),
        'confirm':len(conf),'by_cause':dict(collections.Counter(a['cause'] if a['cause'] in CAUSES else 'other' for a in conf)),
        'held_prodrop':sum(1 for a in adj.values() if a['bucket']=='held-prodrop-object'),
        'held_polite':sum(1 for a in adj.values() if a['bucket']=='held-politeness'),
        'reject':sum(1 for a in adj.values() if a['bucket']=='rejected'),'lego_level':sum(1 for a in adj.values() if a['bucket']=='lego-level')}
    s=stats[C]; s['rate']=round(1000*s['confirm']/s['phrases_judged'],1) if s['phrases_judged'] else None
with open(f'{E}/findings.jsonl','w') as f:
    for r in rows: f.write(json.dumps(r,ensure_ascii=False)+'\n')
json.dump(stats,open(f'{E}/stats.json','w'),indent=1)
# wave-1 rates for reference
w1={}
if os.path.exists(f'{W1}/stats.json'):
    for c,v in json.load(open(f'{W1}/stats.json')).items():
        if v.get('phrases_judged'): w1[c]=round(1000*v.get('phrase-defect',0)/v['phrases_judged'],1)
done={c:s for c,s in stats.items() if s.get('rate') is not None and s['phrases_judged']>=500}
rates=sorted(s['rate'] for s in done.values()); med=statistics.median(rates) if rates else 0
mad=statistics.median(abs(r-med) for r in rates) if rates else 0
hi=max(med*2.5, med+4*mad); lo=med/4
def outlier(s):
    if s.get('rate') is None or s['phrases_judged']<500: return ''
    return 'HIGH' if s['rate']>hi else 'LOW' if s['rate']<lo else ''
LAB={'dropped-object':'dropped object','missing-chunk':'missing chunk','extra-chunk':'extra chunk','wrong-word':'wrong word',
     'person-number':'person/number','polarity':'negation','tense-modality':'tense/modal','other':'other'}
L=[f"# #195 mismatch check, wave 2: {len(done)} more courses (detection only)\n",
 "Stage one only, the same as wave 1: Haiku reads every played basket and flags phrases whose two sides don't match, "
 "Sonnet then reads every flag at confidence 4 or more and decides CONFIRM, REJECT or LEGO_LEVEL. Nothing has been written to any course and no fix pass has started.\n",
 f"**Rate** = confirmed phrase defects per 1,000 phrases judged. The median across wave-2 courses is **{med:g}**; I mark a course HIGH if it is above {hi:.1f} and LOW if it is below {lo:.1f}. "
 "For comparison, wave 1 got: "+', '.join(f"{c.split('_for_')[0]} {r:g}" for c,r in w1.items())+".\n",
 "Held apart, as wave 1 did (not counted in the rate): **pro-drop** = a dropped object where Chinese, Japanese, Korean or Thai is on either side, because those languages leave an object unsaid as ordinary grammar; "
 "**polite** = a confirmed flag about politeness or honorific words. Kai has not ruled on either for these courses.\n",
 "| course | baskets judged | phrases judged | flags | CONFIRM | REJECT | LEGO_LEVEL | held pro-drop / polite | rate /1,000 | | CONFIRM by cause |","|---|---|---|---|---|---|---|---|---|---|---|"]
for C in order:
    s=stats[C]
    if 'baskets' not in s: L.append(f"| {C} | — | — | — | — | — | — | — | — | | **{s['status']}** |"); continue
    bc=', '.join(f"{LAB[k]} {v}" for k,v in sorted(s['by_cause'].items(),key=lambda x:-x[1]))
    L.append(f"| {C} | {s['baskets_judged']}/{s['baskets']} | {s['phrases_judged']:,} | {s['flags_ge4']} | {s['confirm']} | {s['reject']} | {s['lego_level']} | {s['held_prodrop']} / {s['held_polite']} | {s['rate'] if s['rate'] is not None else '—'} | {outlier(s)} | {bc} |")
gaps=[(C,s) for C,s in stats.items() if 'baskets' not in s or s['baskets_judged']<s['baskets'] or s['adjudicated']<s['flags_ge4'] or not s['status'].startswith('DONE')]
L.append("\n## Gaps\n")
L+= [f"- **{C}**: {s.get('status')}" + (f"; judged {s['baskets_judged']}/{s['baskets']} baskets, adjudicated {s['adjudicated']}/{s['flags_ge4']} flags" if 'baskets' in s else '') for C,s in gaps] or ['- none: every listed course was judged and every flag read.']
L.append("\n## Worked examples (courses with more than 20 confirmed flags)\n")
for C in order:
    s=stats[C]
    if s.get('confirm',0)<=20: continue
    conf=[a for a in rows if a['course']==C and a['bucket']=='phrase-defect']
    byc=collections.defaultdict(list)
    for a in conf: byc[a['cause']].append(a)
    pick=[]; i=0
    causes=sorted(byc,key=lambda k:-len(byc[k]))
    while len(pick)<3 and i<3:
        for k in causes:
            g=sorted(byc[k],key=lambda a:(a['severity']!='clear',a['seed']))
            if len(g)>i and len(pick)<3: pick.append(g[i])
        i+=1
    L.append(f"### {C} ({s['confirm']} confirmed{', '+outlier(s)+' outlier' if outlier(s) else ''})\n")
    for a in pick:
        fx='delete' if a['fix']=='delete' else ('reword to: '+' | '.join(x for x in [a.get('fixed_known') or a['known'], a.get('fixed_target') or a['target']])) if a['fix']=='reword' else 'no fix proposed'
        L.append(f"- Seed {a['seed']}, `{a['id']}` ({LAB.get(a['cause'],a['cause'])}): **{a['known']}** | **{a['target']}**. Problem: {a['what']}. Sonnet's fix: {fx}.")
    L.append('')
open(sys.argv[1],'w').write('\n'.join(L)+'\n'); print(sys.argv[1], len(done), 'courses; median', med)
