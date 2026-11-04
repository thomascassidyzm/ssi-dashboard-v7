#!/usr/bin/env python3
"""render.py <course,...> <out.md> [--title T] — markdown list of confirmed phrase-level defects from findings.jsonl,
per course, grouped by cause, sorted by seed; each row = seed · phrase id · known | target · what · proposed fix. (job #195)"""
import json, os, sys, collections
E=os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195')
courses=sys.argv[1].split(','); out=sys.argv[2]
R=[json.loads(l) for l in open(E+'/findings.jsonl')]
CAUSE={'dropped-object':'Dropped object pronoun / clitic / demonstrative (Kai 30 Oct: counts)','missing-chunk':'Chunk missing on one side',
 'extra-chunk':'One side adds a chunk the other lacks','wrong-word':'Different word / meaning','person-number':'Person or number mismatch (I / she / we …)',
 'polarity':'Negation on one side only','tense-modality':'Tense or modal meaning differs','other':'Other'}
ORDER=list(CAUSE)
def fix(r):
    if r['fix']=='delete': return '**delete** (no valid reword with taught material)'
    k=r.get('fixed_known'); t=r.get('fixed_target')
    if not k and not t: return 'no fix proposed'
    ks = k if k and k!=r['known'] else None; ts = t if t and t!=r['target'] else None
    if not ks and not ts: return '⚠ proposed text identical to current — needs a human reword'
    return 'reword → ' + ' | '.join([f"known: {ks}" if ks else 'known unchanged', f"target: {ts}" if ts else 'target unchanged'])
L=[]
for C in courses:
    rows=[r for r in R if r['course']==C and r['bucket']=='phrase-defect']
    L.append(f"\n## {C} — {len(rows)} confirmed phrase defects\n")
    by=collections.defaultdict(list)
    for r in rows: by[r['cause'] if r['cause'] in CAUSE else 'other'].append(r)
    for c in ORDER:
        g=sorted(by.get(c,[]),key=lambda r:(r['seed'],r['id']))
        if not g: continue
        nd=sum(1 for r in g if r['fix']=='delete')
        L.append(f"\n### {CAUSE[c]} — {len(g)} ({len(g)-nd} reword, {nd} delete)\n")
        for r in g:
            L.append(f"- **seed {r['seed']}** · `{r['id']}` · {r['severity'] or ''}  \n  {r['known']} **|** {r['target']}  \n  missing/wrong: {r['what']}  \n  fix: {fix(r)}")
open(out,'w').write('\n'.join(L)+'\n')
print(out, sum(len(x) for x in L), 'chars')
