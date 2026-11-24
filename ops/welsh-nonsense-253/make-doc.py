#!/usr/bin/env python3
"""make-doc.py <handread.json> <out.md> [apply-status-file] — Kai's doc for cs #253·AL. Korean/Yoruba-free: for courses
whose known side is not English only the Welsh and the seed/LEGO are printed."""
import json, sys, collections
H = [o for o in json.load(open(sys.argv[1])) if o['hand'] != 'FINE']
apply_status = open(sys.argv[3]).read().strip() if len(sys.argv) > 3 else 'ARMED for 22:02Z tonight; not yet applied.'
FAM = [('South', ('cym_s_for_eng', 'cym_sv2_for_eng')), ('North', ('cym_n_for_eng', 'cym_nnew_for_eng', 'cym_nv2_for_eng')),
       ('Welsh for Korean speakers', ('cym_for_kor',)), ('Welsh for Yoruba speakers', ('cym_for_yor',)), ('Anthem (Japanese)', ('cym_anthem_for_jpn',))]
ENG = lambda c: c.endswith('_for_eng')
short = lambda c: c.replace('_for_eng', '').replace('cym_', '')
def rowid(o):
    r = o['unit']['rows'][0]; pid = r['id']
    return pid.split(':', 1)[1] if ':' in pid else r['lego']
def line(o):
    u = o['unit']; cs = sorted({r['course'] for r in u['rows']})
    tag = '/'.join(short(c) for c in cs)
    s = f"- **{rowid(o)}** ({tag}, {u['role']})"
    if ENG(u['course']): s += f" — {u['known']} · *{u['target']}*"
    else: s += f" — *{u['target']}* (LEGO *{u['lego_target']}*)"
    if o['note']: s += f" — _{o['note']}_"
    if o['deleted']: s += ' — **DELETED (tonight)**'
    return s
cnt = collections.Counter()
for o in H:
    for r in o['unit']['rows']: cnt[(r['course'], o['hand'])] += 1
L = []
L.append('# Welsh senseless practice phrases: every Welsh course scanned (24 Nov)\n')
L.append("A reader found \"I'd prefer if I don't care whenever you breathe\". Yes, it is a practice row (a BUILD under the "
         "*ta pryd* / whenever LEGO in seed 328), not the seed sentence. It is in South (cym_s and cym_sv2) only; North has no such row. "
         "It is the only thing deleted. Everything else below is **for you to look at, not touched**.\n")
L.append('## Deleted\n')
L.append("- **S0328L01B06** in cym_s_for_eng and cym_sv2_for_eng — I'd prefer if I don't care whenever you breathe · *well 'da fi os nagw i'n becso ta pryd ti'n anadlu*")
L.append(f'- Status: {apply_status}\n')
L.append('## Counts (hand-confirmed rows; a row shared by two courses counts in both)\n')
L.append('| course | clear | borderline |\n|---|---|---|')
for _, cs in FAM:
    for c in cs: L.append(f"| {c} | {cnt[(c,'CLEAR')]} | {cnt[(c,'BORDERLINE')]} |")
L.append("\nPlus one CLEAR row this run missed but #249's hand-read caught: **S0324L01B02** (s/sv2) — game is a lucky word · *mae gêm gair lwcus*.\n")
L.append('**CLEAR** = both the English and the Welsh pile chunks into no meaning. **BORDERLINE** = a meaning can just about be forced, '
         'or only ONE side is senseless (that default is mine, and I flag it: one-sided rows were never put in CLEAR).\n')
for name, cs in FAM:
    rows = [o for o in H if o['unit']['course'] in cs]
    if not rows: continue
    rows.sort(key=lambda o: (o['unit']['seed'], rowid(o)))
    L.append(f'## {name}\n')
    for h in ('CLEAR', 'BORDERLINE'):
        rr = [o for o in rows if o['hand'] == h]
        L.append(f'### {h} ({len(rr)} distinct rows)\n')
        L += [line(o) for o in rr] or ['- none']
        L.append('')
open(sys.argv[2], 'w').write('\n'.join(L) + '\n')
print(len(L), 'lines')
