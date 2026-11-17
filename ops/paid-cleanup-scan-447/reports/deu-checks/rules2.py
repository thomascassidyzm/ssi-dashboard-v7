import re,json,os
S=os.environ['CS_SCRATCH']
NEG=re.compile(r"\b(not|never|nobody|no one|nothing)\b|n't\b",re.I)
CFG={'deu_at_for_eng':dict(noch=r"\bno\b|\bnoch\b",schon=r"\bscho\b|\bschon\b",woll=r"\b(wü|wüst|wüll|wolln|wollts|woit\w*|wollt\w*|will|willst|wollen)\b",mocht=r"\b(möcht\w*|mecht\w*|mocht\w*|mechat\w*)\b",hon=r"\b(der Herr|gnädige Frau|Herr|Frau)\b"),
     'deu_ch_for_eng':dict(noch=r"\bno\b|\bnonig\b|\bnoch\b",schon=r"\bscho\b|\bschon\b",woll=r"\b(wott|wotsch|wänd|wött\w*|will)\b",mocht=r"\b(möcht\w*|hett gern|hät gern|hetti gern|hätt gern)\b",hon=r"\b(Herr|Frau)\b"),
     'deu_for_eng':dict(noch=r"\bnoch\b",schon=r"\bschon\b",woll=r"\b(will|willst|wollen|wollt\w*)\b",mocht=r"\bmöcht\w*",hon=r"\b(mein Herr|gnädige Frau|Herr|Frau)\b")}
LIKE=re.compile(r"\b(I'd|you'd|we'd|they'd|he'd|she'd|would) like\b|\bcare for\b",re.I)
out={}
for c,cf in CFG.items():
    d=json.load(open(f'{S}/{c}.json')); H={}
    def add(f,*a): H.setdefault(f,[]).append(a)
    for s in d['seeds']:
        items=[('seed',None,{'id':'seed:%d'%s['n'],'known':s['known'],'target':s['target']})]
        for l in s['legos']:
            items.append(('lego',l,{'id':l['id'],'known':l['known'],'target':l['target']}))
            if l.get('is_new'):
                for p in l.get('phrases',[]):
                    if p.get('type')!='component': items.append(('row',l,p))
        for kind,l,r in items:
            k=(r['known'] or '').replace('’',"'"); t=r['target'] or ''
            if re.search(r'\byet\b',k,re.I):
                neg=bool(NEG.search(k))
                if neg and not re.search(cf['noch'],t,re.I): add('k46_neg_yet_no_noch',kind,s['n'],r['id'],k,t)
                if not neg and not re.search(cf['schon'],t,re.I) and kind!='lego': add('k46_pos_yet_no_schon',kind,s['n'],r['id'],k,t)
            if re.search(r"\bwants?\b|\bwanted\b",k,re.I) and re.search(cf['mocht'],t,re.I) and not re.search(cf['woll'],t,re.I) and not LIKE.search(k): add('want_mochte',kind,s['n'],r['id'],k,t)
            if LIKE.search(k) and re.search(cf['woll'],t,re.I) and not re.search(cf['mocht'],t,re.I) and not re.search(r"\bwant",k,re.I): add('like_will',kind,s['n'],r['id'],k,t)
            if re.search(r"\b(sir|madam)\b",k,re.I) and not re.search(cf['hon'],t): add('k32_honorific_no_target',kind,s['n'],r['id'],k,t)
            if re.search(cf['hon'].replace('Herr|Frau','Herr'),t) and kind=='row' and re.search(r'\bsir|madam',(s['known'])) and not re.search(r"\b(sir|madam)\b",k,re.I): add('k32_target_hon_no_known',kind,s['n'],r['id'],k,t)
    out[c]=H; print(c,{f:len(v) for f,v in H.items()})
json.dump(out,open(f'{S}/w/rules2.json','w'),ensure_ascii=False)
