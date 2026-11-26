#!/usr/bin/env python3
"""Build pairs-1-300.json / .csv from proposals-*.txt + the nightly QA-copy dump (no database code).
usage: python3 -I build-pairs.py <bre_for_fra.snap.json> <bre_for_eng.snap.json> <bre_for_fra.dump.json>
Regenerates: pairs-1-300.json, pairs-1-300.csv. Hand-written (do not regenerate): proposals-*.txt, sources.json."""
import json, sys, csv, re, os
H = os.path.dirname(os.path.abspath(__file__))
fra = json.load(open(sys.argv[1])); eng = json.load(open(sys.argv[2])); dump = json.load(open(sys.argv[3]))
SRC = json.load(open(os.path.join(H, 'sources.json')))
TAGS = {'V': 'vouloir decision', 'W': 'foreign or non-Breton word', 'G': 'Breton grammar', 'Z': 'ZUT', 'M': 'meaning mismatch',
        'F': 'French changed', 'D': 'Deborah item', 'E': 'bre_for_eng phrasing adopted', 'L': 'one word per meaning', 'U': 'unchanged'}
def url(k):
    if k == 'BE': return None
    if k.startswith('W:'): return 'https://fr.wiktionary.org/wiki/' + k[2:]
    if k not in SRC: raise SystemExit('unknown source key ' + k)
    return SRC[k]
norm = lambda s: re.sub(r'[^\w\' ]', '', (s or '').lower().replace('’', "'")).strip()
cur = {s['seed_number']: s for s in fra['seeds']}; be = {s['seed_number']: s for s in eng['seeds']}
# P26 on the CURRENT course: is the seed sentence a played (is_new) build/use phrase of its own seed?
played = {}
for s in dump['seeds']:
    hit = any(l['is_new'] and any(p['type'] in ('build', 'use') and norm(p['target']) == norm(s['target']) for p in l['phrases']) for l in s['legos'])
    played[s['n']] = (hit, any(l['is_new'] for l in s['legos']))
rows = []
for f in ('proposals-1.txt', 'proposals-2.txt', 'proposals-3.txt'):
    for line in open(os.path.join(H, f), encoding='utf8'):
        if line.startswith('#') or not line.strip(): continue
        n, bre, frap, tags, keys, note = line.rstrip('\n').split('§', 5)
        n = int(n); c = cur[n]
        tags = [t for t in tags.split(',') if t]
        urls = [u for u in (url(k) for k in keys.split(',') if k) if u]
        fr_new = c['known_text'] if frap == '=' else frap
        bre_changed = norm(bre) != norm(c['target_text']); fra_changed = frap != '='
        if bre_changed and 'BE' not in keys.split(',') and norm(bre) == norm(be[n]['target_text']): pass
        hit, has_new = played.get(n, (False, False))
        if not hit: tags.append('never-said today' if has_new else 'never played today')
        if (bre_changed or fra_changed) and not urls: raise SystemExit(f'seed {n}: change without a source url')
        rows.append(dict(seed=n, current_breton=c['target_text'], current_french=c['known_text'], proposed_breton=bre, proposed_french=fr_new,
                         breton_changed=bre_changed, french_changed=fra_changed, english_seed=be[n]['known_text'], bre_for_eng_breton=be[n]['target_text'],
                         same_as_bre_for_eng=norm(bre) == norm(be[n]['target_text']),
                         fault_tags=[TAGS.get(t, t) for t in tags], sources=urls, note=note))
assert [r['seed'] for r in rows] == list(range(1, 301)), 'need seeds 1..300 in order'
json.dump(rows, open(os.path.join(H, 'pairs-1-300.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
w = csv.writer(open(os.path.join(H, 'pairs-1-300.csv'), 'w', encoding='utf8', newline=''))
w.writerow(['seed', 'current_breton', 'current_french', 'proposed_breton', 'proposed_french', 'fault_tags', 'sources', 'note'])
for r in rows: w.writerow([r['seed'], r['current_breton'], r['current_french'], r['proposed_breton'], r['proposed_french'], '; '.join(r['fault_tags']), ' '.join(r['sources']), r['note']])
from collections import Counter
c = Counter(t for r in rows for t in r['fault_tags'])
print(json.dumps(dict(breton_changed=sum(r['breton_changed'] for r in rows), french_changed=sum(r['french_changed'] for r in rows),
      unchanged_both=sum(not r['breton_changed'] and not r['french_changed'] for r in rows), same_as_bre_for_eng=sum(r['same_as_bre_for_eng'] for r in rows), tags=c), ensure_ascii=False, indent=1))
# seed-level ZUT: one French sentence, two Breton
z = {}
for r in rows: z.setdefault(norm(r['proposed_french']), set()).add(norm(r['proposed_breton']))
print('seed-level ZUT clashes:', {k: v for k, v in z.items() if len(v) > 1})
