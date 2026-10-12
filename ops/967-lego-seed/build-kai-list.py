# Builds Kai's (d) list from census.json: one line per LEGO (course, id, seed, LEGO, why). Pure function of the census; no DB.
import json,collections,sys
o=json.load(open('ops/967-lego-seed/census.json'))
def why(x):
    if x.get('missing'): return 'row missing at census time'
    n,t=x['phrases_containing'],x['phrases_total']
    if t and n<=t/2:
        tag='NEAR-(b)' if x['id'] in ('hrv_for_eng:S0036L01','hrv_for_eng:S0034L01') else 'phrases disagree with LEGO'
        return f"{tag}: only {n}/{t} of the LEGO's own BUILD/USE phrases carry the LEGO target (the rest follow another form)"
    if x['bucket'].startswith('B7'):
        if not x['known_in_seed']: return f"no relation: LEGO known side is not in the seed either; seed sentence looks like a different sentence (seed-text drift?). LEGO is coherent with {n}/{t} phrases"
        return f"no relation on the target side though known side sits in the seed; LEGO coherent with {n}/{t} phrases"
    if x['seed_target'] and len(x['seed_target'])<len(x['lego_target']): return f"seed is a fragment shorter than the LEGO; LEGO coherent with {n}/{t} phrases"
    if not x['known_in_seed'] and x['sim']<0.6: return f"LEGO known side not in seed known; seed sentence may be wrong/shifted; LEGO coherent with {n}/{t} phrases"
    if x['known_in_seed'] and x['sim']>=0.8: return f"same intention, seed words it differently (synonym/contraction/register/form); changing the LEGO cascades into {n} phrases + audio; which text wins?"
    if x['known_in_seed']: return f"known side matches seed, target wording differs; LEGO coherent with {n}/{t} phrases; which text wins?"
    return f"partial overlap only; LEGO coherent with {n}/{t} phrases; which text wins?"
rows=sorted(o,key=lambda x:(x['course'],x['id']))
with open('ops/967-lego-seed/kai-list.tsv','w') as f:
    f.write('course\tlego_id\tseed_known\tseed_target\tlego_known\tlego_target\twhy\n')
    for x in rows:
        f.write('\t'.join([x['course'],x['id'],x.get('seed_known') or '',x.get('seed_target') or '',x.get('lego_known') or '',x.get('lego_target') or '',why(x)])+'\n')
with open(sys.argv[1],'w') as f:
    f.write(f"# LEGO-vs-seed (d) list for Kai — {len(rows)} LEGOs\n\nPilot-first result: nothing applied. One line per LEGO: **course · id** — seed (known ‖ target) — LEGO (known ‖ target) — why.\n")
    cur=None
    for x in rows:
        if x['course']!=cur: cur=x['course']; f.write(f"\n## {cur}\n")
        f.write(f"- `{x['id']}` — seed: {x.get('seed_known') or ''} ‖ {x.get('seed_target') or ''} — LEGO: {x.get('lego_known') or ''} ‖ {x.get('lego_target') or ''} — {why(x)}\n")
print(collections.Counter(why(x).split(':')[0].split(';')[0][:40] for x in rows).most_common(10))
