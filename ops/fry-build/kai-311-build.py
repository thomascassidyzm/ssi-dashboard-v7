# cs #311 (25 Nov 2026): build the texts for Kai's two approved fry_for_eng follow-ups found by #309·AL
# ("Apply both, seed 56 and seed 114? Y", Kai 25 Nov). Reads live rows through Popty only; no database access.
#   python3 ops/fry-build/kai-311-build.py   ->  ops/fry-build/kai-311-texts.json
#
# (1) SEED 56: #180·AL grew LEGO S0056L02 to "sadat ik it ûnthâlde kin" (L33 stand-in "it"). Kai's Y: the seed and
#     S0056L02U04 take the "it" too, so both contain the LEGO verbatim. English untouched (no English "it" fits
#     before a how/what clause).
# (2) SEED 114: the S0135 precedent (#180·AL, singles, S0135L02U02) is "dat ik it minder doch" -> "dat ik it minder
#     goed doch": "doing worse" = doing less WELL (cf. S0114L01U04 "dat ik it hiel goed doch"). Applied to every row in
#     the course carrying "it minder doch" with the English "doing worse" — the seed-114 family plus six later phrases
#     that use the same LEGO pair (O12: a re-glossed LEGO reaches every phrase that uses it; leaving them would also
#     give "that I'm doing worse" two Frisian forms, a ZUT clash). Bare "worse"/"minder" as an adjective (S0117L03B01,
#     S0118, S0132) is a different sense and is NOT touched.
import json, os, re, sys, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
d = json.load(urllib.request.urlopen('http://localhost:3470/api/production/fry_for_eng/seeds'))
L = {}
for s in d['seeds']:
    L[f"SEED{s['seed_number']}"] = (s['known_text'], s['target_text'], None)
    for l in s['legos']:
        L['LEGO:' + l['lego_id']] = (l['known_text'], l['target_text'], l['components'])
        for p in l['basket_phrases']:
            L[p['id'].split(':')[-1]] = (p['known_text'], p['target_text'], None)

def row(key, new_t, comps=None, why='', new_k=None):
    k, t, c = L[key]
    r = {'key': key, 'old': [k, t], 'new': [new_k if new_k is not None else k, new_t], 'why': why}
    if comps is not None: r['components'] = comps
    if r['new'] == r['old'] and comps is None: sys.exit(f'{key}: no change')
    return r

rows = []
# (1) seed 56 — exactly the two rows #309 named; any other S0056L02-built row lacking "it" stops the build.
for key, (k, t, c) in L.items():
    if re.search(r'(?i)\bsadat ik ûnthâlde kin\b', t) and key not in ('SEED56', 'S0056L02U04'):
        sys.exit(f'{key}: another row lacks the "it": {t!r}')
rows.append(row('SEED56', L['SEED56'][1].replace('Sadat ik ûnthâlde kin', 'Sadat ik it ûnthâlde kin', 1),
                why='seed 56 contains its LEGO S0056L02 "sadat ik it ûnthâlde kin" (Kai Y 25 Nov)'))
rows.append(row('S0056L02U04', L['S0056L02U04'][1].replace('sadat ik ûnthâlde kin', 'sadat ik it ûnthâlde kin', 1),
                why='phrase contains its LEGO S0056L02 (Kai Y 25 Nov)'))

# (2) "it minder doch" -> "it minder goed doch", course-wide, only where the English says "doing worse".
for key, (k, t, c) in sorted(L.items()):
    if not re.search(r'\bit (hjoed )?minder doch\b', t): continue
    if "doing worse" not in k: sys.exit(f'{key}: "minder doch" without "doing worse": {k!r}')
    comps = None
    if key == 'LEGO:S0114L02':
        comps = [dict(x) for x in c]
        hit = [x for x in comps if x['known'] == 'worse' and x['target'] == 'minder']
        if len(hit) != 1: sys.exit('S0114L02: component worse|minder not found')
        hit[0]['target'] = 'minder goed'
    rows.append(row(key, re.sub(r'\bminder doch\b', 'minder goed doch', t), comps=comps,
                    why='S0135L02U02 precedent: doing worse = minder goed dwaan (Kai Y 25 Nov)'))
rows.append(row('S0114L02C04', 'minder goed', why="component row mirrors LEGO S0114L02's component worse|minder goed"))

json.dump({'family': 'kai-311', 'rows': rows}, open(f'{HERE}/kai-311-texts.json', 'w'), ensure_ascii=False, indent=1)
for r in rows: print(f"{r['key']:14} {r['old'][1]!r}\n{'':14} -> {r['new'][1]!r}")
print(len(rows), 'rows')
