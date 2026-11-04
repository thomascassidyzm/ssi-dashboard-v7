#!/usr/bin/env python3
"""prep.py <course.json> <out.jsonl> [--seeds a-b] [--every N]
Builds one judging unit per PLAYED basket (is_new LEGO, phrases with phrase_role != component):
  basket id, seed pair, lego pair, phrases, and the cumulative taught pairs up to and including that LEGO
  (all LEGOs in seed order, plus component sub-pairs), both FULL and FILTERED (lexical overlap with the basket)."""
import json, sys, re, unicodedata
def norm(s): return unicodedata.normalize('NFKC', (s or '')).lower()
def words(s): return [w for w in re.split(r"[^\w']+", norm(s)) if w]
def stems(s):
    ws=words(s); return {w for w in ws if len(w)>1} | {w[:5] for w in ws if len(w)>=6}
args = sys.argv[1:]
src, out = args[0], args[1]
seedrange = None; every = 1
if '--seeds' in args: a,b = args[args.index('--seeds')+1].split('-'); seedrange=(int(a),int(b))
if '--every' in args: every = int(args[args.index('--every')+1])
d = json.load(open(src)); course = d['courseCode']
seeds = sorted(d['seeds'], key=lambda s: s['seed_number'])
taught = []  # cumulative: (lego_id, known, target, is_new, kind)
units = []
for s in seeds:
    legos = sorted(s['legos'], key=lambda l: l['lego_index'])
    for l in legos:
        taught.append((l['lego_id'], l['known_text'], l['target_text'], l['is_new'], 'lego'))
        for c in (l.get('components') or []):
            if c and c.get('known') and c.get('target'):
                taught.append((l['lego_id']+'c', c['known'], c['target'], l['is_new'], 'component'))
        if not l['is_new']: continue
        phr = [p for p in (l.get('basket_phrases') or []) if p['phrase_role'] != 'component']
        if not phr: continue
        if seedrange and not (seedrange[0] <= s['seed_number'] <= seedrange[1]): continue
        phr.sort(key=lambda p: (p['phrase_role'] != 'build', p['position'] or 0))
        bag = set()
        for p in phr: bag |= stems(p['known_text']) | stems(p['target_text'])
        full = [{'id':t[0],'known':t[1],'target':t[2],'kind':t[4]} for t in taught]
        filt = [x for x in full if x['id'].startswith(l['lego_id']) or x['id'][:5]==l['lego_id'][:5]
                or (stems(x['known']) & bag) or (stems(x['target']) & bag)]
        # keep filtered context to the pairs that can explain a chunk: whole words, or 5-char stems of long words
        units.append({'course':course,'basket':l['lego_id'],'seed':s['seed_number'],
            'seed_pair':{'known':s['known_text'],'target':s['target_text']},
            'lego_pair':{'known':l['known_text'],'target':l['target_text']},
            'phrases':[{'id':p['id'].split(':')[-1],'role':p['phrase_role'],'known':p['known_text'],'target':p['target_text'],
                        'decomp':p.get('decomposition')} for p in phr],
            'taught_full':full,'taught_filtered':filt})
units = units[::every]
with open(out,'w') as f:
    for u in units: f.write(json.dumps(u, ensure_ascii=False)+'\n')
import statistics
print(course, 'units', len(units), 'phrases', sum(len(u['phrases']) for u in units),
      'full ctx median', statistics.median(len(u['taught_full']) for u in units) if units else 0,
      'filtered median', statistics.median(len(u['taught_filtered']) for u in units) if units else 0)
