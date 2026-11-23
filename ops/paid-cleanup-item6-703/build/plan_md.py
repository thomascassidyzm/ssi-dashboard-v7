import json, os
OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = json.load(open(f'{OUT}/plan.json'))
L = []
w = L.append
w('# Paid cleanup item 6 — wrong target-language form: the plan (cs #703·AI, 18 Nov)\n')
w('Section 6 of the combined list (d/23c5a220): 311 rows in 13 courses. Every row was re-read live through Popty (script-view, 18 Nov) before planning; 309 were unchanged since the scan, 1 was already fixed (deu S0513L03B01), 1 is a combined id. **Nothing is applied yet.**\n')
w('**How each change was checked (offline, before any write).** `ops/paid-cleanup-item6-703/check.cjs` applies the plan in memory to a Popty dump of the whole course and runs the course-builder validator\'s own pure checks on every touched seed, before vs after (tiling, LEGO containment, BUILD/USE floors, untaught vocabulary — the same functions `POST /api/v2/validate` runs), plus a whole-course one-known-two-targets (ZUT) scan for every edited row and a duplicate scan per basket. A change that added an issue was reworked; the few that remain are listed under each course with the reason. Rows marked *extra* are not in the scan list: they are the same defect found by a course-wide sweep (canon R0.4 step 3) or the knock-on a fix obliges (seed→LEGO→basket, L26/P17/O12).\n')
w('**Actions:** edit · delete · hold (left as is, reason given — evidence or rules could not settle it) · keep (scan row judged not a defect) · already-fixed.\n')
w('| course | scope rows | extra rows | edit | delete | hold | keep | chars (est.) |\n|---|---|---|---|---|---|---|---|')
for c, s in P['summary'].items():
    w(f"| {c} | {s['scope_rows']} | {s['extra_rows']} | {s.get('edit',0)} | {s.get('delete',0)} | {s.get('hold',0)} | {s.get('keep',0)+s.get('already-fixed',0)} | {s['chars_est']:,} |")
tot = sum(s['chars_est'] for s in P['summary'].values())
w(f'\nAudio estimate {tot:,} characters before library-first (cap 30,000). Known side = 1 clip, target = 2 voices, LEGO with a new English = new presentation.\n')
by = {}
for e in P['entries']: by.setdefault(e['course'], []).append(e)
for c, E in by.items():
    w(f'\n## {c}\n')
    srcs, defs = {}, {}
    def ref(d, text, pre):
        if text not in d: d[text] = f'{pre}{len(d)+1}'
        return d[text]
    rows = []
    for e in E:
        cur, new = e['current'], e['new'] or {}
        tag = f"#{e['scope_n']}" if e['scope_n'] else 'extra'
        line = f"- **{e['row']}** ({e['kind']}, {tag}) {e['action'].upper()}: `{cur['known']} | {cur['target']}`"
        if e['action'] == 'edit':
            kk = new.get('known') if new.get('known') != cur['known'] else None
            tt = new.get('target') if new.get('target') != cur['target'] else None
            line += ' → `' + (kk if kk is not None else '=') + ' | ' + (tt if tt is not None else '=') + '`'
            if new.get('is_new') is False: line += ' (is_new → false)'
        line += f" — [{ref(defs, e['defect'], 'D')}] [{ref(srcs, e['source'], 'S')}] {e['confidence']}"
        if e.get('note'): line += f" — note: {e['note']}"
        rows.append(line)
    w('**Defects:**'); [w(f'- {k}: {t}') for t, k in defs.items()]
    w('\n**Sources / reasoning:**'); [w(f'- {k}: {t}') for t, k in srcs.items()]
    w('\n**Rows** (`known | target` → `new known | new target`, `=` unchanged):')
    for r in rows: w(r)
open(f'{OUT}/plan.md', 'w').write('\n'.join(L) + '\n')
print(len(L))
