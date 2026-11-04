#!/usr/bin/env python3
"""score.py <labels.json> <run.jsonl>...  precision/recall of DEFECT verdicts against hand labels, per run file."""
import json,sys
L=json.load(open(sys.argv[1])); pos=set(L['defects'])
for f in sys.argv[2:]:
    tp=fp=fn=0; n=0; fps=[]; fns=[]; secs=0; chars=0; nb=0; bad=0
    seen=set()
    for l in open(f):
        r=json.loads(l); nb+=1; secs+=r['secs']; chars+=r['prompt_chars']
        if not r['verdicts']: bad+=1; continue
        for v in r['verdicts']:
            n+=1; pid=v.get('id'); seen.add(pid)
            flag = v.get('verdict')=='DEFECT'
            if flag and pid in pos: tp+=1
            elif flag: fp+=1; fps.append((pid,v.get('chunk'),v.get('why'),v.get('confidence')))
    for p in pos:
        c=L['defects'][p]['course']
        if p in seen and not any(p==x[0] for x in fps) and p not in [x for x in []]:
            pass
    # recall over positives inside this run's baskets
    baskets={json.loads(l)['basket'] for l in open(f)}
    inrun=[p for p in pos if p[:8] in baskets]
    fn=[p for p in inrun if p not in {x[0] for x in []} and not any(json.loads(l)['verdicts'] and any(v.get('id')==p and v.get('verdict')=='DEFECT' for v in json.loads(l)['verdicts']) for l in open(f))]
    tp=len(inrun)-len(fn)
    prec = tp/(tp+fp) if tp+fp else float('nan'); rec = tp/len(inrun) if inrun else float('nan')
    print(f"\n### {f}: baskets={nb} phrases={n} unparsed={bad} avg_secs={secs/max(nb,1):.1f} avg_prompt_chars={chars/max(nb,1):.0f}")
    print(f"positives_in_run={len(inrun)} TP={tp} FP={fp} FN={len(fn)}  precision={prec:.2f} recall={rec:.2f}")
    for x in fps: print('  FP', x)
    for x in fn: print('  FN', x)
