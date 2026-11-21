#!/usr/bin/env python3
"""Item 20 thin-basket scan (cs #718·AI). Reads dump-course.py JSON (Popty script-view; no DB access).
Real build = build row whose (known,target) key differs from the LEGO debut key (cycles.ts debutKey) and
from every other emitted row. Playable = distinct real builds + distinct uses not equal to debut (USE rows
fill empty build slots up to 7, cycles.ts). Components never play.
usage: scan.py <dump.json> [hin_dump.json] -> prints summary, writes <dump>.scan.json"""
import json, sys, re
def norm(s): return re.sub(r'[\s\.\?\!,;:।؟۔]+', ' ', (s or '').lower()).strip()
def key(k, t): return norm(k) + '|' + norm(t)
def scan(d):
    out = {}
    for s in d['seeds']:
        for l in s['legos']:
            debut = key(l['known'], l['target'])
            seen = {debut}; rb = []; ru = []; bare = []
            for p in l['phrases']:
                if p['type'] not in ('build', 'practice', 'use'): continue
                k = key(p['known'], p['target'])
                if norm(p['target']) == norm(l['target']) or k == debut:
                    if p['type'] != 'use': bare.append(p['id'])
                    continue
                if k in seen: continue
                seen.add(k)
                (ru if p['type'] == 'use' else rb).append(p['id'])
            out[l['id']] = {'seed': s['n'], 'is_new': l.get('is_new'), 'type': l.get('type'), 'known': l['known'], 'target': l['target'],
                            'real_builds': len(rb), 'uses': len(ru), 'bare': bare, 'playable': min(7, len(rb) + len(ru))}
    return out
if __name__ == '__main__':
    d = json.load(open(sys.argv[1])); sc = scan(d)
    json.dump(sc, open(sys.argv[1].replace('.json', '.scan.json'), 'w'), ensure_ascii=False)
    new = {k: v for k, v in sc.items() if v['is_new'] is not False}
    thin = {k: v for k, v in new.items() if v['real_builds'] < 3}
    from collections import Counter
    print(d['course'] if 'course' in d else sys.argv[1], 'legos', len(sc), 'new', len(new), 'thin(<3 real builds)', len(thin),
          'by rb', dict(sorted(Counter(v['real_builds'] for v in thin.values()).items())),
          'playable<3', sum(1 for v in thin.values() if v['playable'] < 3), 'bare rows', sum(len(v['bare']) for v in thin.values()))
