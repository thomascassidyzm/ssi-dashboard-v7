#!/usr/bin/env python3
# Job #641·AD: fold every judgement into (1) edit-batch ops for course_gender_expansions and (2) the re-record plan.
#   python3 merge.py <scratch-dir> <decisions-dir>
# Sources of judgement, per chunk:
#   out/<chunk>.json   worker output: [{n,text,f,m,sure,why}] — lines not listed = f = m = text (rule in RULES.md)
#   <decisions>/<eg04|lb01..>.tsv  parent's read: "n<TAB>f|TEXT|KEEP<TAB>why[<TAB>m|TEXT]"; unlisted row = KEEP, unlisted no-row = text
# Outputs (in ops/ara-female-641/): final-<course>.json (every judged line), ops-<course>.json, plan-<course>.json, summary.json
import json, os, sys, glob, collections
S, D = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = {'ara_eg_for_eng': ('azure_ar-EG-SalmaNeural', 'azure_ar-EG-ShakirNeural'), 'ara_lb_for_eng': ('azure_ar-LB-LaylaNeural', 'azure_ar-LB-RamiNeural')}
summary = {}
for course, (fv, mv) in VOICE.items():
    pre = course[:6]
    clips = {x['id']: dict(x, voice_id=vk) for vk, v in json.load(open(f'{S}/{course}.clips.json'))['voices'].items() for x in v}
    units = json.load(open(f'{S}/{course}.units.json'))
    final, ops, plan = [], [], []
    stats = collections.Counter()
    for chunk in sorted(glob.glob(f'{HERE}/work/{pre}-*.jsonl')):
        name = os.path.basename(chunk)[:-6]
        lines = [json.loads(l) for l in open(chunk)]
        worker = f'{HERE}/out/{name}.json'
        mine = f'{D}/{name[:2]}{name[4:6]}{name[-2:]}.tsv'.replace('ara_', '')
        mine = f'{D}/{pre[4:]}{name[-2:]}.tsv'
        dec = {}
        if os.path.exists(worker):
            src = 'worker'
            for e in json.load(open(worker)): dec[e['n']] = ('SET', e.get('f') or e['text'], e.get('m') or e['text'], e.get('why', ''), e.get('sure', True))
        elif os.path.exists(mine):
            src = 'parent'
            for l in open(mine):
                p = l.rstrip('\n').split('\t')
                if not p[0].strip(): continue
                dec[int(p[0])] = ('TSV', p[1], p[3] if len(p) > 3 else None, p[2] if len(p) > 2 else '', 'unsure' not in (p[2] if len(p) > 2 else ''))
        else:
            raise SystemExit(f'no judgement for {name}')
        for x in lines:
            t, row = x['text'], x['row']
            oldf = (row['f'] or t) if row else t
            oldm = (row['m'] or t) if row else t
            d = dec.get(x['n'])
            if d is None:
                f, m = (t, t) if src == 'worker' else ((oldf, oldm) if row else (t, t)); why = ''; sure = True
            elif d[0] == 'SET':
                f, m, why, sure = d[1], d[2], d[3], d[4]
            else:
                _, fv_, mv_, why, sure = d
                f = t if fv_ == 'TEXT' else (oldf if fv_ == 'KEEP' else fv_)
                m = oldm if mv_ is None else (t if mv_ == 'TEXT' else mv_)
            final.append({'n': x['n'], 'text': t, 'f': f, 'm': m, 'old_f': oldf, 'old_m': oldm, 'row': row['id'] if row else None, 'by': src, 'why': why, 'sure': sure})
            if row:
                if f != oldf or m != oldm:
                    ops.append({'op': 'gender.update', 'id': row['id'], 'set': {'expanded_f': f, 'expanded_m': m},
                                'expect': {'expanded_f': row['f'], 'expanded_m': row['m']}})
                    stats['row_updated'] += 1
            elif f != t or m != t:
                ops.append({'op': 'gender.insert', 'row': {'original_text': t, 'language': 'ara', 'text_side': 'target', 'expanded_f': f, 'expanded_m': m}})
                stats['row_inserted'] += 1
            # re-record plan
            u = units.get(t, {'t1': [], 't2': []})
            for cid in u['t1']:
                c = clips.get(cid)
                if not c or c['voice_id'] != fv: continue
                if c['created_at'] < '2026-07-01' or f != oldf:
                    plan.append({'course': course, 'role': 'target1', 'audioId': cid, 'text': c['text'], 'spoken': f, 'why': 'pre-July' if c['created_at'] < '2026-07-01' else 'female text corrected'})
            for cid in u['t2']:
                c = clips.get(cid)
                if not c or c['voice_id'] != mv: continue
                if m != oldm:
                    plan.append({'course': course, 'role': 'target2', 'audioId': cid, 'text': c['text'], 'spoken': m, 'why': 'male text corrected'})
    # one clip may serve several texts? (it is keyed by text, so no) — dedupe by audioId anyway
    seen, dplan = set(), []
    for p in plan:
        if p['audioId'] in seen: continue
        seen.add(p['audioId']); dplan.append(p)
    for p in dplan:
        if p['text'].strip() != p['text']: p['text'] = p['text']
    json.dump(final, open(f'{HERE}/final-{course}.json', 'w'), ensure_ascii=False, indent=0)
    json.dump(ops, open(f'{HERE}/ops-{course}.json', 'w'), ensure_ascii=False)
    json.dump(dplan, open(f'{HERE}/plan-{course}.json', 'w'), ensure_ascii=False)
    stats['lines'] = len(final); stats['f_changed_vs_text'] = sum(1 for z in final if z['f'] != z['text'])
    stats['plan_t1'] = sum(1 for p in dplan if p['role'] == 'target1'); stats['plan_t2'] = sum(1 for p in dplan if p['role'] == 'target2')
    stats['plan_chars'] = sum(len(p['spoken']) for p in dplan)
    stats['unsure'] = sum(1 for z in final if not z['sure'])
    summary[course] = dict(stats)
json.dump(summary, open(f'{HERE}/summary.json', 'w'), indent=1)
print(json.dumps(summary, indent=1))
