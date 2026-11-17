import json,os,re,sys
S=os.environ['CS_SCRATCH']
tok=lambda s:re.findall(r"[\wäöüßÄÖÜ']+",(s or '').replace('’',"'").lower())
HON={'mein','herr','gnädige','frau','der'}
c=sys.argv[1]; thr=float(sys.argv[2]) if len(sys.argv)>2 else .5
d=json.load(open(f'{S}/{c}.json')); out=[]
for s in d['seeds']:
    for l in s['legos']:
        if not l.get('is_new'): continue
        LT=tok(l['target']); formal=bool(re.search(r'\b(sir|madam)\b',l['known']))
        if formal: LT=[w for w in LT if w not in HON]
        rows=[p for p in l.get('phrases',[]) if p['type'] not in ('component','lego_debut')]
        if not rows: continue
        bad=[p for p in rows if not all(w in tok(p['target']) for w in LT)]
        hb=[p for p in rows if formal and not re.search(r'\b(sir|madam)\b',p['known'])]
        if len(bad)/len(rows)>=thr or (formal and hb):
            out.append((l['id'],l['known'],l['target'],len(rows),len(bad),len(hb),[(p['id'][-3:],p['known'],p['target']) for p in (bad or hb)][:3]))
for x in out: print(x[0],x[1],'|',x[2],f'rows={x[3]} missing={x[4]} no-honorific={x[5]}','e.g.',x[6][:2])
print(len(out))
