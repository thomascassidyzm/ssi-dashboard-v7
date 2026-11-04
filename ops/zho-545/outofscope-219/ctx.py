import json,sys,re
D=json.load(open(sys.argv[1]))['seeds']
seeds={s['seed_number']:s for s in D}
legos={}; phr={}
for s in D:
  for l in s['legos']:
    legos[l['lego_id']]=l
    for p in l.get('basket_phrases') or []:
      pid=p['id'].split(':')[-1]; phr[pid]=p
def show_lego(lid,full=True):
  l=legos.get(lid)
  if not l: print('  LEGO',lid,'MISSING'); return
  print(f"  LEGO {lid} new={l['is_new']} {l['known_text']!r} | {l['target_text']}  comps={[ (c.get('known'),c.get('target')) for c in (l.get('components') or []) if c]}")
  if full:
    for p in sorted(l.get('basket_phrases') or [], key=lambda p:p['id']):
      pid=p['id'].split(':')[-1]
      if p['phrase_role']=='component': continue
      print(f"     {pid} {p['phrase_role'][0]} {p['known_text']!r} | {p['target_text']}")
for item in sys.argv[2:]:
  print('=== ',item)
  if item.startswith('seed:'):
    n=int(item[5:]); s=seeds[n]; print(f"  SEED {n} {s['known_text']!r} | {s['target_text']}  approved={bool(s['approved_at'])}")
    for l in s['legos']: show_lego(l['lego_id'],full=False)
  elif re.fullmatch(r'S\d{4}L\d\d',item):
    n=int(item[1:5]); s=seeds[n]; print(f"  SEED {n} {s['known_text']!r} | {s['target_text']}")
    show_lego(item)
  else:
    p=phr.get(item); n=int(item[1:5]); s=seeds[n]
    print(f"  SEED {n} {s['known_text']!r} | {s['target_text']}")
    print('  ROW', 'GONE' if not p else f"{p['phrase_role']} {p['known_text']!r} | {p['target_text']}")
    show_lego(item[:8])
