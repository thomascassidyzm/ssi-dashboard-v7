import json, sys
# Compact reading view of a worklist chunk: n|text|English «seed English» plus the current row's F/M where they differ.
f, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
for i, l in enumerate(open(f)):
    if i < a or i >= b: continue
    x = json.loads(l); s = x['slots'][0] if x['slots'] else {}
    en = s.get('en', ''); se = s.get('seed_en', '')
    r = x['row']; rf = ''
    if r:
        rF = r['f'] or x['text']; rM = r['m'] or x['text']
        if rF != x['text']: rf += '  ⟶F:' + rF
        if rM != x['text']: rf += '  ⟶M:' + rM
        if not rf: rf = '  [row=]'
    print(f"{x['n']}|{x['text']}|{en}" + (f" «{se[:45]}»" if se else '') + rf)
