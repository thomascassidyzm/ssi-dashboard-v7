# cs #180·AL (24 Nov 2026): build the texts files for Auke's 24 Nov final-check fixes on fry_for_eng.
# Families CHAIN (a row in two families carries the first family's new text as the second's old), so they are
# applied in ORDER: after, oars, unthalde, witte, singles.
# Reads live rows through Popty (GET /api/production/fry_for_eng/seeds), writes auke-24nov-<family>-texts.json
# in the auke-108-apply.py shape. Every row's new text is authored here (R0.13): the regex only FINDS candidates,
# the per-row lists below are what was read and decided. No database access.
#   python3 ops/fry-build/auke-24nov-build.py
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

def row(key, new_k=None, new_t=None, comps=None, why=''):
    k, t, c = L[key]
    r = {'key': key, 'old': [k, t], 'new': [new_k if new_k is not None else k, new_t if new_t is not None else t], 'why': why}
    if comps is not None: r['components'] = comps
    if r['new'] == r['old'] and comps is None: sys.exit(f'{key}: no change')
    L[key] = (r['new'][0], r['new'][1], comps if comps is not None else c)  # families chain: apply in ORDER
    return r

fams = {}

# ITEM 4 (+ item 1 S0011-L, S0011L03B04): "astû" is if/when; "after you" is nei'tstû (dictionary: neidat/nei't = after;
# course precedent S0362L04 "after you left | nei'tstû fuortgien wiest"). Every row carrying the chunk, course-wide.
rows = []
for key, (k, t, c) in sorted(L.items()):
    if 'astû útpraat bist' in t.lower():
        if 'after you finish talking' not in k.lower(): sys.exit(f'{key}: chunk without the after-English: {k!r}')
        nt = re.sub(r'(?i)\b(a)stû útpraat bist', lambda m: ('N' if m.group(1) == 'A' else 'n') + "ei'tstû útpraat bist", t)
        comps = None
        if key == 'LEGO:S0011L03':
            comps = [{'known': 'after you', 'target': "nei'tstû"}, {'known': 'have finished talking', 'target': 'útpraat bist'}]
        rows.append(row(key, new_t=nt, comps=comps, why='item 4: as = when; after = nei\'t'))
rows.append(row('S0011L03C01', 'after you', "nei'tstû", why='item 4: the component row the LEGO shows'))
fams['after'] = rows

# ITEM 3: "everyone else" is "eltsenien oars" (eltsenien alone = everyone). Every row, seed 16 and LEGO S0016L04 included.
rows = []
for key, (k, t, c) in sorted(L.items()):
    if re.search(r'\beltsenien\b', t):
        if 'everyone else' not in k: sys.exit(f'{key}: eltsenien without everyone else: {k!r}')
        comps = None
        if key == 'LEGO:S0016L04':
            comps = [{'known': 'with', 'target': 'mei'}, {'known': 'everyone else', 'target': 'eltsenien oars'}]
        rows.append(row(key, new_t=re.sub(r'\beltsenien\b', 'eltsenien oars', t), comps=comps, why='item 3'))
fams['oars'] = rows

# ITEM 2: "sadat ik ûnthâlde kin" needs "it" when nothing follows (Auke's 13 lines), English mirrors "it" (Kai 23 Nov).
# LEGO S0056L02 carries a stand-in "it" (L33; fry precedent #409). S0056L02U04 keeps no "it": a clause follows.
# Extras (same rule, nothing follows ûnthâlde): S0024L03B03/B04, S0026L02U05, S0091L02B01/U01.
def mem(k): return re.sub(r'memorise(\?)?$', r'memorise it\1', k)
rows = [row('LEGO:S0056L02', 'so I can memorise it', 'sadat ik it ûnthâlde kin',
            comps=[{'known': 'so that', 'target': 'sadat'}, {'known': 'I', 'target': 'ik'}, {'known': 'it', 'target': 'it'},
                   {'known': 'to memorise', 'target': 'ûnthâlde'}, {'known': 'can', 'target': 'kin'}], why='item 2 (Auke)')]
for key in ['S0056L02B01', 'S0056L02B02', 'S0056L02B03', 'S0056L02U01', 'S0056L02U02', 'S0056L02U03', 'S0056L02U05',
            'S0056L02U06', 'S0056L02U07', 'S0161L03B03', 'S0172L01U01']:
    k, t, _ = L[key]
    rows.append(row(key, mem(k), t.replace('sadat ik ûnthâlde kin', 'sadat ik it ûnthâlde kin'), why='item 2 (Auke)'))
rows.append(row('S0168L03U04', mem(L['S0168L03U04'][0]), L['S0168L03U04'][1].replace('sil ik ûnthâlde kinne?', 'sil ik it ûnthâlde kinne?'), why='item 2 (Auke)'))
X = {
 'S0024L03B03': ("I'm going to be able to memorise it", 'ik sil it ûnthâlde kinne'),
 'S0024L03B04': ('we want to be able to memorise it', 'wy wolle it ûnthâlde kinne'),
 'S0026L02U05': ('I like it when I have the feeling that I can memorise it easily', 'ik fyn it noflik as ik it gefoel ha dat ik it maklik ûnthâlde kin'),
 'S0091L02B01': ('to be able to memorise it quickly enough', 'it fluch genôch ûnthâlde kinne'),
 'S0091L02U01': ("I'm not going to be able to memorise it quickly enough", 'ik sil it net fluch genôch ûnthâlde kinne'),
}
for key, (nk, nt) in X.items(): rows.append(row(key, nk, nt, why='item 2 extra'))
fams['unthalde'] = rows

# ITEM 5 (S0035L03U06, S0060L01U03) + item 1 S0045L03B03: modal + witte with nothing after takes "it" (Auke).
# Extras: every other phrase where nothing follows a modal's witte. LEGOs stay bare frames (their seeds put a clause after
# the verb); the phrase puts "it" inside the LEGO, which K49 allows. English mirrors "it" (Kai 23 Nov).
W = {
 'S0035L03U06': ("she wants to know it but I'm going to say nothing", 'sy wol it witte mar ik sil neat sizze', 'item 5 (Auke)'),
 'S0060L01U03': ("she wants to know it but I don't know it yet", 'sy wol it witte mar ik wit it noch net', 'item 5 (Auke)'),
 'S0045L03B03': ("I don't need to know everything but I want to know it", 'ik hoech net alles te witten mar ik wol it witte', 'item 1 (Auke, #220 file)'),
 'S0017L02B03': ("I'm trying it and she wants to know it", 'ik besykje it en sy wol it witte', 'extra'),
 'S0017L02B04': ("I'm not sure and she wants to know it", 'ik bin der net wis fan en sy wol it witte', 'extra'),
 'S0017L02U05': ("I'm not sure if I still know the whole sentence and she wants to know it", 'ik bin der net wis fan oft ik de hiele sin noch wit en sy wol it witte', 'extra'),
 'S0018L01B02': ('and we want to know it', 'en wy wolle it witte', 'extra'),
 'S0019L02B04': ("she wants to know it and I don't want to", 'sy wol it witte en ik wol net', 'extra'),
 'S0020L01B03': ('and you want to know it', 'en dû wolst it witte', 'extra'),
 'S0070L02U03': ("I wanted to know it but she didn't want to tell me why", 'ik woe it witte mar sy woe my net fertelle wêrom', 'extra'),
 'S0201L01B03': ("it's difficult but we wanted to know it", 'it is dreech mar wy woene it witte', 'extra'),
 'S0211L01B03': ('we wanted to know it and they told us', 'wy woene it witte en sy hawwe ús ferteld', 'extra'),
 'S0347L02U01': ("he wanted to know it and he's going to ask you", 'hy woe it witte en hy sil dy freegje', 'extra'),
 'S0348L01U01': ("we wanted to know what was going to happen and she didn't want to know it", 'wy woene witte wat der barre soe en sy woe it net witte', 'extra'),
 'S0348L01U02': ("she didn't want to know it and I didn't want to ask you", 'sy woe it net witte en ik woe dy net freegje', 'extra'),
 'S0380L01U03': ("I asked what was going to happen and she didn't want to know it", 'ik frege wat der barre soe en sy woe it net witte', 'extra'),
 'S0389L01U06': ("that person over there didn't want to know it", 'dy persoan dêre woe it net witte', 'extra'),
 'S0404L03B03': ('he wanted to know it before Thursday', 'hy woe it foar tongersdei witte', 'extra'),
 'S0464L03B03': ("he wanted to know it, but she didn't know it any more", 'hy woe it witte, mar se wist it net mear', 'extra'),
 'S0581L02U01': ("they didn't say what they wanted to do and he'd like to know it", 'sy seine net wat se dwaan woene en hy woe it graach witte', 'extra'),
}
fams['witte'] = [row(key, nk, nt, why=w) for key, (nk, nt, w) in W.items()]

# Singles (items 1 and 5).
fams['singles'] = [
 row('S0022L03B02', "I'm trying it because I want to meet people", 'ik besykje it om\'t ik minsken moetsje wol', why='item 1 (Auke #220 file: besykje + it); English as S0017L02B03'),
 row('S0042L01U01', None, 'dû woest my justerjûn wat sjen litte', why='item 1 (Auke #220 file: my justerjûn)'),
 row('S0135L02U02', None, "ik begryp net wêrom'tstû tinkst dat ik it minder goed doch as juster", why='item 5 (Auke: minder goed)'),
 row('S0285L01U03', None, 'sy hawwe ús ferteld dat sy Frysk praat', why='item 5 (Auke: dat sy Frysk praat)'),
]
fams['singles'] = [r for r in fams['singles'] if r]
for f, rows in fams.items():
    json.dump({'family': f, 'rows': rows}, open(os.path.join(HERE, f'auke-24nov-{f}-texts.json'), 'w'), ensure_ascii=False, indent=1)
    print(f, len(rows))
