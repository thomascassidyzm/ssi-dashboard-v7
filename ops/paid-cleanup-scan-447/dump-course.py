#!/usr/bin/env python3
"""READ-ONLY course dump for the #447 paid-courses cleanup scan.
Reads one course through Popty's own route GET /api/production/<course>/script-view in 50-seed windows
(the whole-course /seeds route hits the 8 s statement timeout on big courses) and writes a compact JSON:
  {course, seeds:[{n, known, target, status, legos:[{id, idx, type, is_new, known, target,
     phrases:[{id, pos, type, known, target, ka, t1, t2}]}]}]}
ka/t1/t2 = known / target1 / target2 audio uuid (None = empty slot). No database access of its own.
Usage: python3 -I dump-course.py <course_code> <out.json> [max_seed=700]"""
# cs #968·AI: live gate. Every urlopen to a Popty port (:347x) is refused (exit 77) unless --live-ok '<why>' is given
# (put it last) AND it is 22:00-07:00 Europe/London. ops/paid_cleanup_livegate.py.
import os as _lg_os, sys as _lg_sys
_lg_d = _lg_os.path.dirname(_lg_os.path.realpath(__file__))
while not _lg_os.path.exists(_lg_os.path.join(_lg_d, 'paid_cleanup_livegate.py')) and _lg_d != '/':
    _lg_d = _lg_os.path.dirname(_lg_d)
_lg_sys.path.insert(0, _lg_d)
import paid_cleanup_livegate as livegate
livegate.install()
import json, sys, urllib.request, time
course, out = sys.argv[1], sys.argv[2]
max_seed = int(sys.argv[3]) if len(sys.argv) > 3 else 700
seeds = []
for a in range(1, max_seed + 1, 50):
    url = f"http://localhost:3470/api/production/{course}/script-view?seedStart=S{a:04d}&seedEnd=S{a+49:04d}"
    for attempt in range(4):
        try:
            d = json.load(urllib.request.urlopen(url, timeout=90)); break
        except Exception as e:
            err = e; time.sleep(3 + 3 * attempt)
    else:
        print(f"WINDOW FAILED {course} {a}: {err}", file=sys.stderr); sys.exit(1)
    got = d.get('seeds') or []
    for s in got:
        seeds.append({'n': s['seed_number'], 'known': s.get('known_text'), 'target': s.get('target_text'), 'status': s.get('status'),
          'legos': [{'id': l['lego_id'], 'idx': l['lego_index'], 'type': l.get('type'), 'is_new': l.get('is_new'),
                     'known': l.get('known_text'), 'target': l.get('target_text'),
                     'phrases': [{'id': p['id'], 'pos': p.get('position'), 'type': p.get('type'), 'known': p.get('known_text'),
                                  'target': p.get('target_text'), 'ka': p.get('known_audio_uuid'), 't1': p.get('target1_audio_uuid'),
                                  't2': p.get('target2_audio_uuid')} for p in l.get('phrases', [])]} for l in s.get('legos', [])]})
    if not got and a > 1: break
nums = [s['n'] for s in seeds]
assert len(nums) == len(set(nums)), 'duplicate seeds across windows'
json.dump({'course': course, 'dumped': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'seeds': seeds}, open(out, 'w'), ensure_ascii=False)
print(course, 'seeds', len(seeds), 'legos', sum(len(s['legos']) for s in seeds), 'phrases', sum(len(l['phrases']) for s in seeds for l in s['legos']))
