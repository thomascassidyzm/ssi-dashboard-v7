#!/usr/bin/env python3
"""Turn an azure-census.cjs output into the four-day plan (cs #35). No DB, no network: reads the census JSON only.

  python3 -I ops/voice-casting/azure-to-cartesia/build-days.py <census.json> <outdir>

Writes <outdir>/course-summary.json (every in-scope course, premium/live order), <outdir>/day-plan.json (the four days),
and <outdir>/day1-batch.jsonl (one line per render ask for day 1: course, role, text, voiceId, chars, slots).

Counting: one ask = one (course, role, words) — the shape revoice-seeds-to-cast.cjs sends. An ask whose words the cast
voice already says elsewhere in the SAME course is free (library-first links it) and costs 0. Across courses the plan
charges a (language, words, voice) once, in day order: the second course's ask is a library link by the time it runs.
Clips already in the cast voice in OTHER courses are not visible to the census; the day-1 dry run measures them.
"""
import json, sys, os

DAYS = [  # (label, UTC window, replacement courses) — fixes come from fixes.json by their "day"; fixes are charged first.
    ('Day 1', '19 Nov UTC, from Kai\'s Y/N (spills into 20 Nov 00:00-06:00 UTC if late)', ['ita_for_eng', 'eng_for_hin', 'eng_for_urd', 'eng_for_ben', 'zho_for_eng', 'jpn_for_eng', 'kor_for_eng']),
    ('Day 2', '20 Nov UTC', ['eng_for_tam']),
    ('Day 3', '21 Nov UTC', []),
    ('Day 4', '22 Nov UTC (Popty\'s Cartesia cycle restarts 23 Nov 00:00 UTC: tts-spend-guard cycleStartDay 23)', ['por_for_eng']),
]
TOTAL_CAP, DAY_CAP = 2_000_000, 600_000

def main(census_path, outdir):
    d = json.load(open(census_path))
    by = {c['course']: c for c in d['courses'] if not c.get('skipped')}
    order = {'live': 0, 'beta': 1}
    summary = []
    for c in by.values():
        ins = {r: s for r, s in c['roles'].items() if s['inScope']}
        outs = {r: s for r, s in c['roles'].items() if not s['inScope']}
        if not ins and not outs:
            continue
        summary.append({
            'course': c['course'], 'new_app_status': c['new_app_status'], 'pricing_tier': c['pricing_tier'],
            'inScope': {r: {k: s[k] for k in ('cast', 'slots', 'asks', 'chars', 'freeInCourse', 'byGender')} for r, s in ins.items()},
            'inScopeChars': sum(s['chars'] for s in ins.values()),
            'inScopeCharsNotFree': sum(a['chars'] for a in c['asks'] if not a['freeInCourse']),
            'stayAzure': {r: {'cast': s['cast'], 'slots': s['slots'], 'chars': s['chars']} for r, s in outs.items()},
            'stayAzureChars': sum(s['chars'] for s in outs.values()),
        })
    summary.sort(key=lambda s: (s['pricing_tier'] != 'premium', order.get(s['new_app_status'], 2), -s['inScopeChars']))
    seen, running, plan = set(), 0, []
    fixes = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixes.json')))['fixes']
    for n, (label, window, courses) in enumerate(DAYS, 1):
        dayFixes = [f for f in fixes if f['day'] == n]
        fixChars = sum(f['chars'] for f in dayFixes)
        rows, day = [], 0
        for code in courses:
            c = by[code]
            asks = [a for a in c['asks'] if not a['freeInCourse']]
            charged = 0
            for a in asks:
                k = (a['language'], a['text'], a['voiceId'])
                if k in seen:
                    continue
                seen.add(k); charged += a['chars']
            roles = sorted({a['role'] for a in c['asks']})
            rows.append({'course': code, 'roles': roles, 'asks': len(c['asks']), 'freeInCourse': sum(1 for a in c['asks'] if a['freeInCourse']),
                         'slots': sum(len(a['slots']) for a in c['asks']), 'chars': charged})
            day += charged
        running += day + fixChars
        plan.append({'day': label, 'window': window, 'fixes': [{k: f[k] for k in ('id', 'chars', 'status')} for f in dayFixes], 'fixChars': fixChars, 'courses': rows, 'replacementChars': day, 'dayChars': day + fixChars, 'runningChars': running})
        assert day + fixChars <= DAY_CAP, (label, day + fixChars)
    assert running <= TOTAL_CAP, running
    os.makedirs(outdir, exist_ok=True)
    json.dump(summary, open(os.path.join(outdir, 'course-summary.json'), 'w'), indent=1)
    json.dump({'census': census_path, 'censusGeneratedAt': d['generatedAt'], 'db': d.get('db'), 'dayCap': DAY_CAP, 'totalCap': TOTAL_CAP, 'days': plan}, open(os.path.join(outdir, 'day-plan.json'), 'w'), indent=1)
    with open(os.path.join(outdir, 'day1-batch.jsonl'), 'w') as f:
        for code in DAYS[0][2]:
            for a in by[code]['asks']:
                f.write(json.dumps({'course': code, 'role': a['role'], 'text': a['text'], 'voiceId': a['voiceId'], 'language': a['language'], 'chars': a['chars'],
                                    'freeInCourse': a['freeInCourse'], 'firstSeed': a['firstSeed'],
                                    'slots': [{k: v for k, v in s.items() if k != 'role'} for s in a['slots']]}, ensure_ascii=False) + '\n')
    for p in plan:
        print(p['day'], 'fixes', p['fixChars'], 'replacement', p['replacementChars'], 'day', p['dayChars'], 'running', p['runningChars'], [(r['course'], r['chars']) for r in p['courses']])

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
