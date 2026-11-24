#!/usr/bin/env python3
"""cym_for_kor (cs #813·AK) — reading pages from a snapshot of what Popty holds.

Snapshot first (read-only Popty route):
  curl -s "http://localhost:3470/api/production/cym_for_kor/seeds?status=all" > snap.json

  report.py compare snap.json  > compare.md   seeds 1-30 vs the approved calibration (d/2259576a)
  report.py sample  snap.json [EVERY] > sample.md   seeds + LEGOs + a few phrases, Welsh beside Korean
"""
import json, sys, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
CAL = HERE.parent / 'calibration/tools/data.py'


def load_cal():
    src = CAL.read_text()
    ns = {}
    exec(src.split("exec(open('idx.py')")[0], ns)
    return ns['D'], ns['G']


def norm(t):
    return ' '.join(t.replace('’', "'").lower().split())


def snap(path):
    seeds = json.load(open(path))['seeds']
    return {s['seed_number']: s for s in seeds if s.get('legos')}


def phrases(s):
    out = []
    for l in sorted(s['legos'], key=lambda l: l['lego_index']):
        for p in sorted(l.get('basket_phrases') or [], key=lambda p: (p['phrase_role'] != 'build', p['position'])):
            out.append((l['lego_index'], p['phrase_role'], p['target_text'], p['known_text']))
    return out


def compare(path):
    D, G = load_cal()
    S = snap(path)
    plan = json.load(open(HERE / 'plan/0001-0030.json'))
    rows, same, chg, tot = [], 0, 0, 0
    ph_cal = ph_pop = ph_overlap = 0
    straight = 0
    for n in range(1, 31):
        cal_new = [(l[0], l[1]) for l in (D[n]['legos'] if n in D else G[n])]
        s = S.get(n)
        rows.append(f'\n### {n}. {plan["seeds"][str(n)] and s and s["target_text"]}')
        if not s:
            rows.append('- **not built in Popty**'); continue
        rows.append(f'- 🇰🇷 {s["known_text"]}')
        pop_new = [(l['target_text'], l['known_text']) for l in sorted(s['legos'], key=lambda l: l['lego_index']) if l['is_new']]
        cal_map = {norm(c): k for c, k in cal_new}
        rows.append('\n| Calibration LEGO | Popty LEGO | |\n|---|---|---|')
        seen = set()
        for cy, ko in pop_new:
            tot += 1
            ck = cal_map.get(norm(cy))
            if ck is not None and ck == ko:
                mark = 'same'; same += 1
            elif ck is not None:
                mark = f'gloss changed (calibration ‘{ck}’)'; chg += 1
            else:
                mark = 'new split'; chg += 1
            seen.add(norm(cy))
            rows.append(f'| {cy + " = " + ck if ck is not None else "—"} | **{cy}** = {ko} | {mark} |')
        for cy, ko in cal_new:
            if norm(cy) not in seen:
                rows.append(f'| {cy} = {ko} | — | not a new LEGO in Popty |')
        ps = phrases(s)
        ph_pop += len(ps)
        straight += sum(1 for p in ps if "'" in p[2])
        if n in D:
            cal_ph = {norm(p[0]) for p in D[n]['phrases']}
            ph_cal += len(cal_ph)
            ov = cal_ph & {norm(p[2]) for p in ps}
            ph_overlap += len(ov)
            rows.append(f'\nPhrases: calibration {len(cal_ph)}, Popty {len(ps)}, same Welsh in both {len(ov)}.')
        else:
            rows.append(f'\nPhrases: Popty {len(ps)} (calibration built none for seeds 11-30).')
        rows.append('\n<details><summary>Popty phrases</summary>\n')
        rows += [f'- L{i} {r[0].upper()} · {t} → {k}' for i, r, t, k in ps]
        rows.append('\n</details>')
    head = [f'Seeds built in Popty: {len(S)} of 30. New LEGOs: {tot} — {same} identical to the calibration (split and Korean), {chg} different (each listed).',
            f'Phrases seeds 1-10: calibration {ph_cal}, Popty {sum(len(phrases(S[n])) for n in range(1, 11) if n in S)}, {ph_overlap} with identical Welsh. Popty phrases seeds 1-30: {ph_pop}.',
            f'Phrases stored with a straight apostrophe (\') instead of ’: {straight}.']
    return '\n'.join(head), '\n'.join(rows)


def sample(path, every=1):
    S = snap(path)
    out = []
    for n in sorted(S):
        if (n - 1) % every:
            continue
        s = S[n]
        out.append(f'\n### {n}. {s["target_text"]}\n🇰🇷 {s["known_text"]}\n')
        for l in sorted(s['legos'], key=lambda l: l['lego_index']):
            tag = '' if l['is_new'] else ' *(taught before)*'
            out.append(f'- **{l["target_text"]}** = {l["known_text"]}{tag}')
            ps = sorted(l.get('basket_phrases') or [], key=lambda p: (p['phrase_role'] != 'use', p['position']))[:3]
            out += [f'  - {p["target_text"]} → {p["known_text"]}' for p in ps]
    return '\n'.join(out)


if __name__ == '__main__':
    if sys.argv[1] == 'compare':
        h, r = compare(sys.argv[2])
        print(h + '\n' + r)
    else:
        print(sample(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 1))
