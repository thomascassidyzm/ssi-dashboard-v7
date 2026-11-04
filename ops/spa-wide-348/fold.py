"""Fold the six shard verdicts into one list with the final family names, and render Kai's page.
Run from the repo root: python3 ops/spa-wide-348/fold.py <out.md>"""
import json,sys,collections
B='ops/spa-wide-348/'
ctx={o['id']:o for X in 'ABCDEF' for o in map(json.loads,open(f'{B}input/shard-{X}.jsonl'))}
TENSE=set('S0146L04U07 S0196L02U08 S0216L04U08 S0263L01U01 S0267L01U05 S0267L01U08 S0267L01U12 S0268L02U12 S0536L01U03 S0536L01U04'.split())
CLUMSY=set('S0107L03U01 S0112L05U05 S0117L04U05 S0126L01U12 S0133L01U14 S0145L01U05 S0153L01U14 S0153L02U14 S0187L02U09 S0188L02U10 S0195L02U09 S0195L03U01 S0195L03U06 S0196L01U03 S0201L02B01 S0206L02U02 S0212L01U05 S0502L03U02 S0217L05U13 S0256L01B06 S0256L01U09 S0262L01U10 S0272L03U11 S0415L01B02 S0492L02B02 S0556L01B03 S0579L01U03 S0639L02U02'.split())
MAP={'ES-BACKSHIFT':'BACKSHIFT','ES-SUBJ-FUTURE':'CUANDO-FUTURE','ES-MOOD-OTHER':'MOOD','ES-AGREEMENT':'AGREEMENT',
 'ES-MISSING-WORD':'MISSING-WORD','ES-CALQUE':'CALQUE-WORD','NEW-NEG-ANYWHERE':'CALQUE-WORD','MEANING':'MEANING',
 'EN-POLISH':'ENGLISH','NONSENSE':'NONSENSE','LEGO-MISSING':'NO-LEGO','NEW-NO-LEGO':'NO-LEGO','NEW-LACKS-LEGO':'NO-LEGO','LEGO-LEVEL':'NO-LEGO'}
FAM=[('BACKSHIFT','Past frame, present verb','"sabía que / estaba seguro de que / dijo que" followed by a present-tense verb, so the Spanish clashes with the English past.'),
 ('CUANDO-FUTURE','"cuando" + present about the future','"cuando termino" (and similar) about something still to come, where Spanish needs the subjunctive "cuando termine".'),
 ('MOOD','Other subjunctive / indicative slips','A subjunctive with nothing triggering it, or an indicative where the frame demands a subjunctive ("no pensé que podía", "como si ... queda").'),
 ('TENSE','Other tense clashes','Past tenses that do not fit together ("pensaba que fue", "has tenido ... la semana pasada").'),
 ('AGREEMENT','Gender / number agreement','"la reunión ... listo", "los mejor", "ese es lo que": a word does not agree with what it refers to.'),
 ('MISSING-WORD','A small word missing','A missing "que" after "le dije", personal "a" before a person, the "lo" in "lo estás haciendo bien", or "el" before a language.'),
 ('CALQUE-WORD','Calques and wrong word choice','English carried over word for word ("decir de", "preguntar de", "tener una comida"), or the wrong word ("ser" for location, "qué" for "cuál", "algún sitio" after "no").'),
 ('CLUMSY','Clumsy Spanish','Grammatical or nearly so, but no native would say it that way: odd word order, a doubled object, stacked infinitives, a stranded word.'),
 ('MEANING','English and Spanish say different things','A word added or dropped on one side, a different tense or person, or a different sense, so the learner is misled about what the Spanish means.'),
 ('ENGLISH','English not natural','The Spanish is fine and matches; only the English prompt is not something a native speaker would say.'),
 ('NONSENSE','Generator padding / nonsense','Rows that mean nothing on either side: stray tags ("guess here, good", "before, no"), self-contradictions ("got to be here yesterday"), spliced fragments.'),
 ('NO-LEGO','Row does not contain its LEGO','The phrase sits in a LEGO\'s basket but never uses that LEGO (or uses a different form of it).')]
rows=[]
for X in 'ABCDEF':
    for l in open(f'{B}out/{X}.jsonl'):
        r=json.loads(l); r['reader']=X
        if r['verdict']=='REAL':
            raw=r['family']; r['family_raw']=raw
            r['family']='TENSE' if r['id'] in TENSE else 'CLUMSY' if r['id'] in CLUMSY else MAP.get(raw,'CALQUE-WORD' if raw=='ES-OTHER' else raw)
        rows.append(r)
assert len(rows)==682
with open(B+'verdicts.jsonl','w') as f:
    for r in rows: f.write(json.dumps(r,ensure_ascii=False)+'\n')
def kind(c):
    b,a=c['before'],c['after']
    if a[1]=='DELETE': return 'delete'
    e=a[0].strip()!=b[0].strip(); s=a[1].strip()!=b[1].strip()
    return 'both' if e and s else 'English only' if e else 'Spanish only' if s else 'no change'
def line(r):
    c=ctx[r['id']]; sn=int(r['id'][1:5])
    a='**delete**' if c['after'][1]=='DELETE' else f"{c['after'][0]} | {c['after'][1]}"
    s=f"- **Seed {sn}** ({r['id'][5:]}): {c['before'][0]} | *{c['before'][1]}* → {a}  \n  {r['reason']}"
    if r['fix_verdict'] not in ('GOOD','DELETE-OK'):
        s+=f"  \n  ⚠ fix: {r['fix_verdict']}" + (f" ({r['fix_note']})" if r.get('fix_note') else '')
        if r.get('better_fix'): s+=f"; better: {r['better_fix'][0]} | {r['better_fix'][1]}"
    return s
def pick(lst,n=10):
    if len(lst)<=n: return lst
    step=len(lst)/n; return [lst[int(i*step)] for i in range(n)]
cnt=collections.Counter(r['verdict'] for r in rows)
out=[]
out.append('# spa_for_eng: the 682 "clear" fixes, re-checked and grouped by family\n')
out.append(f"An independent second reading of every one of the 682 rows the wide sweep marked ready to apply, re-read today from the live course with its LEGO, seed, whole basket and what had been taught by then. **Nothing has been changed in the course.** None of the 682 rows has changed since the sweep read it.\n")
out.append(f"Judged by your rule: a row is wrong only if the Spanish is wrong, or it misleads the learner given what the LEGOs teach. Two Englishes for one Spanish, soft English synonyms and rare-but-natural phrasing were **not** counted.\n")
out.append(f"**{cnt['REAL']} real · {cnt['NOT-A-DEFECT']} not a defect · {cnt['UNSURE']} unsure**\n")
out.append('| family | rows | fix: Eng only / Sp only / both / delete | fix to hold back |\n|---|---|---|---|')
for code,name,desc in FAM:
    fr=[r for r in rows if r['verdict']=='REAL' and r['family']==code]
    k=collections.Counter(kind(ctx[r['id']]) for r in fr)
    bad=sum(1 for r in fr if r['fix_verdict'] not in ('GOOD','DELETE-OK'))
    out.append(f"| {name} | **{len(fr)}** | {k['English only']} / {k['Spanish only']} / {k['both']} / {k['delete']} | {bad or ''} |")
out.append(f"| *Not a defect* | **{cnt['NOT-A-DEFECT']}** | | |\n| *Unsure* | **{cnt['UNSURE']}** | | |\n")
bad_all=[r for r in rows if r['verdict']=='REAL' and r['fix_verdict'] not in ('GOOD','DELETE-OK')]
out.append(f"\"Fix to hold back\" = the row is a real defect but the proposed fix is not right as written: {len(bad_all)} rows, listed at the end.\n")
for code,name,desc in FAM:
    fr=[r for r in rows if r['verdict']=='REAL' and r['family']==code]
    out.append(f"\n## {name} ({len(fr)})\n\n{desc}\n\n**Direction:** {{DIR_{code}}}\n")
    good=[r for r in fr if r['fix_verdict'] in ('GOOD','DELETE-OK')]
    for r in pick(good): out.append(line(r))
nd=[r for r in rows if r['verdict']=='NOT-A-DEFECT']
out.append(f"\n## Not a defect ({len(nd)})\n\nThe sweep flagged these, but by your rule they are fine as they are: soft English synonyms, two Englishes for one Spanish, or Spanish that is correct but different from what the sweep expected. **Recommend: do not apply.** Most of the proposed edits are harmless; {sum(1 for r in nd if r['fix_verdict']=='WORSE')} would make the row worse.\n")
for r in pick(nd,12): out.append(line(r))
un=[r for r in rows if r['verdict']=='UNSURE']
out.append(f"\n## Unsure ({len(un)})\n\nThese hang on a native-speaker or methodology call (optional personal \"a\", \"disfruto hacer\" vs \"haciendo\", sentence-final \"más\", a gender cue in the English). **Recommend: send to Deborah or decide as one small group.**\n")
for r in un: out.append(line(r))
out.append(f"\n## Real, but hold the fix ({len(bad_all)})\n\nThe defect is real but the proposed after is not right: it does not fix the Spanish, it makes the English worse, it drops the LEGO, or it uses a form not yet taught. A better fix is given where the reader found one.\n")
for r in bad_all: out.append(line(r))
open(sys.argv[1],'w').write('\n'.join(out)+'\n')
print(cnt, len(bad_all))
