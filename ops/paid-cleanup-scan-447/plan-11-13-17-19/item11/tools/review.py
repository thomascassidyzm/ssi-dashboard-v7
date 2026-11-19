"""review view: python3 -I review.py <course> [seed...] [--compact = only starred rows and rows whose target lacks the LEGO]  — per scan-named LEGO: seed, all seed LEGOs, full basket with a
containment flag (T = target contains LEGO, K = known words contain LEGO gloss). No network."""
import json,os,re,sys,collections
P=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); sys.argv=[sys.argv[0],"item11"]+sys.argv[1:]
import importlib.util
spec=importlib.util.spec_from_file_location('plan',P+'/tools/plan.py'); plan=importlib.util.module_from_spec(spec); spec.loader.exec_module(plan)
compact="--compact" in sys.argv
if compact: sys.argv.remove("--compact")
course=sys.argv[1]; only=[int(x) for x in sys.argv[2:]]
dump=json.load(open(os.environ['CS_SCRATCH']+f'/dumps/{course}.json'))
scan=[r for r in json.load(open(P+'/data/scan-P17.json')) if r['course']==course]
byl=collections.defaultdict(list)
for r in scan:
    for m in re.finditer(r'S(\d{4})L(\d\d)([BUC]\d\d)?',r['row']):
        byl[f'S{m.group(1)}L{m.group(2)}'].append((m.group(3),r))
SD={s['n']:s for s in dump['seeds']}
seeds=sorted({int(k[1:5]) for k in byl})
for n in seeds:
    if only and n not in only: continue
    s=SD[n]
    print(f"\n=== S{n:04d} {'LIVE' if n in dump['live_seeds'] else 'QA-COPY'} | {s['known']} | {s['target']}")
    for l in s['legos']:
        print(f"  {l['id']} {'NEW' if l['is_new'] else 'old'} {l['type']} | {l['known']} | {l['target']}  [{len(l['phrases'])} rows]")
    for l in s['legos']:
        if l['id'] not in byl: continue
        fixes={r['fix'] for _,r in byl[l['id']]}
        named={x for x,_ in byl[l['id']]}
        print(f"  -- {l['id']} | {l['known']} | {l['target']} | scan: {' // '.join(fixes)[:300]}")
        ok={}
        for p in l['phrases']:
            sid=p['id'].split(':')[-1][8:] if ':' in p['id'] else p['id']
            t='T' if plan.has(p['target'],l['target']) else '-'
            k='K' if plan.words_in(p['known'],l['known']) else '-'
            if compact and t=='T' and sid not in named:
                ok[p['type'][:3]]=ok.get(p['type'][:3],0)+1; continue
            print(f"     {sid:4}{'*' if sid in named else ' '} {p['type'][:3]} {t}{k} | {p['known']} | {p['target']}")
        if compact: print(f"     (other rows holding the LEGO on the target side: {ok})")
