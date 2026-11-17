import re,sys,json
from lib import *
PAST=re.compile(r"\b(said|told|thought|knew|wanted|tried|started|heard|was|were|had|did|didn't|asked|yesterday|ago|last|when|surprised|able)\b",re.I)
KONNTE=re.compile(r"\bkonnte(st|n|t)?\b",re.I)
NEG=re.compile(r"\b(not|never|nobody|no one|nothing)\b|n't\b",re.I)
WANT=re.compile(r"\bwants?\b|\bwanted\b",re.I)
LIKE=re.compile(r"\b(I'd|you'd|we'd|they'd|he'd|she'd|would) like\b",re.I)
MOCHT=re.compile(r"\bmöcht",re.I); WOLL=re.compile(r"\b(will|willst|wollen|wollt|wollte\w*)\b",re.I)
SUB=set('als wie dass weil wenn ob bevor nachdem obwohl bis damit während seit seitdem sobald falls was wo wohin woher warum wer wen wem der die das den dem denen deren dessen welche welcher welches'.split())
FIN=re.compile(r"\b(habe|hast|hat|haben|habt|bin|bist|ist|sind|seid|war|warst|waren|wart|kann|kannst|können|könnt|will|willst|wollen|muss|musst|müssen|soll|sollst|sollen|darf|darfst|dürfen|werde|wirst|wird|werden|hatte|hattest|hatten|wollte|wollten|konnte|konnten|könnte|könnten|musste|mussten|sollte|sollten|würde|würden|wäre|wären|hätte|hätten)$",re.I)
def rows_of(d):
    for s in d['seeds']:
        yield ('seed',s['n'],None,{'id':'seed:%d'%s['n'],'known':s['known'],'target':s['target']})
        for l in s['legos']:
            yield ('lego',s['n'],l,{'id':l['id'],'known':l['known'],'target':l['target'],'is_new':l.get('is_new')})
            if not l.get('is_new'): continue
            for p in l.get('phrases',[]):
                if p.get('type') in ('component',): continue
                yield ('row',s['n'],l,p)
out={}
for c in ['deu_for_eng','deu_at_for_eng','deu_ch_for_eng']:
    d=json.load(open(f'{S}/{c}.json')); H={}
    def add(f,kind,n,r,extra=''): H.setdefault(f,[]).append((kind,n,r['id'],r['known'],r['target'],extra))
    for kind,n,l,r in rows_of(d):
        k=(r['known'] or '').replace('’',"'"); t=r['target'] or ''
        if KONNTE.search(t) and not PAST.search(k): add('k45_konnte_bare',kind,n,r)
        if re.search(r'\byet\b',k,re.I):
            neg=bool(NEG.search(k))
            if neg and not re.search(r'\bnoch\b',t,re.I): add('k46_yet_neg_no_noch',kind,n,r)
            if not neg and not re.search(r'\bschon\b',t,re.I): add('k46_yet_pos_no_schon',kind,n,r)
            if not neg and l and re.search(r'^noch$',l['target'].strip(),re.I): add('k46_pos_in_noch_basket',kind,n,r)
        if WANT.search(k) and MOCHT.search(t) and not WOLL.search(t) and not LIKE.search(k): add('want_mochte',kind,n,r)
        if LIKE.search(k) and WOLL.search(t) and not MOCHT.search(t) and not WANT.search(k) and not re.search(r'würde',t): add('like_will',kind,n,r)
        if kind=='lego':
            tw=t.strip().rstrip('?.!').split()
            if len(tw)>=2 and FIN.search(tw[-1]) and tw[0].lower() not in SUB and tw[0].lower() in ('ich','du','er','sie','es','wir','ihr','man','mich','dich','mir','dir','uns') :
                # verb-final without trigger? check seed: word before lego start
                seed=next(s for s in d['seeds'] if s['n']==n)
                st=seed['target']; i=st.lower().find(t.lower().rstrip('?.!'))
                prev=re.findall(r"[\wäöüß]+",st[:i])[-1].lower() if i>0 and re.findall(r"[\wäöüß]+",st[:i]) else ''
                if prev in SUB: add('k48_no_subordinator',kind,n,r,'seed has "%s" before it'%prev)
        if re.search(r'\bfand\b|\bfanden\b|\bfandest\b',t) and re.search(r'\bthought\b',k): add('fand_for_thought',kind,n,r)
        if re.search(r'Fernsehen ferngesehen|Fernsehen \w+ ferngesehen',t): add('fernsehen_doubled',kind,n,r)
        if re.search(r'\bklingt wie\b',t): add('klingt_wie',kind,n,r)
        if re.search(r'\bfeel(s)? (myself|yourself|himself|herself|ourselves)\b',k,re.I): add('en_feel_myself',kind,n,r)
        if re.search(r'\bhave you already been\b|\balready been \w+ing\b',k,re.I): add('en_already_been_ing',kind,n,r)
        if re.search(r'\bin order to\b',k,re.I) and re.search(r'in Ordnung',t): add('en_in_order',kind,n,r)
        if re.search(r"\bI'm going home\b",k) is None and re.search(r'\bI thought (you|he|she|they) (are|is)\b',k,re.I): add('en_thought_present',kind,n,r)
    out[c]=H
    print(c,{f:len(v) for f,v in H.items()})
json.dump(out,open(f'{S}/w/rules.json','w'),ensure_ascii=False)
