# cs #398·AI — gle_v2_for_eng FINAL DRY-RUN PASS of Kai's rulings of 16 + 17 Nov 2026. Writes NOTHING live.
# Reads a saved Popty GET /api/production/gle_v2_for_eng/seeds answer (live.json), builds edit-batch ops per FAMILY,
# checks them statically (check.py of #343·AI) and writes batch-<n>.ops.json (<=1500 ops each, cut at seed boundaries).
# Usage: python3 plan2.py live.json      then: python3 post2.py   (dry run only)
# The rulings are in gle-v2-eoghan-43-taken-343.md (master) here; each function below names the ruling it carries.
import sys,json,re,collections,os
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','gle-v2-eoghan-43-2026-11-16'))
from ed import Ed
from check import check
from lib import *

class Ed2(Ed):
    TAG='cs #398·AI final pass, Kai rulings 16+17 Nov 2026'
    def add(s,lid,role,known,target,moved_from=None):
        k=super().add(lid,role,known,target,moved_from)
        s.ins[k]['metadata']['authored']=s.TAG+(', moved from '+moved_from if moved_from else '')
        return k
    def ksub(s,rx,repl,trx=None,only=None,flags=re.I):
        """known-side only: re-cue the English of every live phrase (optionally only where the Irish matches trx)"""
        hit=[]
        for k,p in s.P.items():
            if p['phrase_role']=='component' or k in s.deleted or (only and not only(p)): continue
            if trx and not re.search(trx,s.cur[k][1],flags): continue
            n=re.sub(rx,repl,s.cur[k][0],flags=flags)
            if n!=s.cur[k][0]: s.cur[k][0]=n; hit.append(k)
        return hit
    def seed(s,n,target,known=None):
        # one seed.update per seed: a later ruling on the same seed folds into the first op
        prev=[o for o in s.ops[n] if o['op']=='seed.update']
        if not prev: return super().seed(n,target,known)
        o=prev[0]; sd=s.S[n]
        if target!=sd['target_text']: o['set']['target_text']=target
        if known and known!=sd['known_text']: o['set']['known_text']=known
        s.seedtext[n]=(o['set'].get('known_text',sd['known_text']),o['set'].get('target_text',sd['target_text']))
    def lego(s,lid,**st):
        L=s.L[lid]; prev=[o for o in s.ops[L['seed_number']] if o['op']=='lego.update' and o['lego_id']==lid]
        if not prev: return super().lego(lid,**st)
        prev[0]['set'].update(st); s.legoset[lid].update(st)
    def under(s,lid): return [k for k,p in s.P.items() if p['lego']==lid and p['phrase_role']!='component' and k not in s.deleted]
    def rebase(s,lid,target):
        """after a LEGO's Irish changed: drop the phrases under it that no longer contain it (P17); returns kept"""
        keep=[]
        for k in s.under(lid):
            if contains(s.cur[k][1],target): keep.append(k)
            else: s.delp(k)
        return keep
    def many(s,lid,rows):
        for r,kn,tg in rows: s.add(lid,{'b':'build','u':'use'}[r],kn,tg)
    def total(s):
        return sum(len(v) for v in s.ops.values())+sum(1 for k,p in s.P.items() if k not in s.deleted and p['phrase_role']!='component' and s.cur[k]!=[p['known_text'],p['target_text']])

E=Ed2(sys.argv[1]); S=E.S
def C(*pairs): return [{'known':a,'target':b} for a,b in pairs]
def seedtxt(n): return S[n]['known_text'],S[n]['target_text']
def in_seeds(a,b): return lambda p: a<=p['seed']<=b
FAM=collections.OrderedDict(); SEEDS=set()
def fam(name,seeds=()):
    def deco(f):
        t=E.total(); f(); FAM[name]=FAM.get(name,0)+E.total()-t; SEEDS.update(seeds); return f
    return deco

# ───────────────────────── A. Eoghan's line, rows 1-300 (17 Nov per-row rulings) ─────────────────────────
@fam('eoghan rows 1-300',[7,36,38,61,69,77,102,142,147,148,159,178,228])
def eoghan_rows():
    # 7 (08:30Z): keep mo dhícheall a dhéanamh; English everywhere "do my best"
    E.seed(7,S[7]['target_text'],'I want to do my best today')
    E.lego('S0007L03',known_text='to do my best')
    for a,b in [(r"\btry as hard as I can\b","do my best"),(r"\btrying as hard as I can\b","doing my best"),(r"\btried as hard as I could\b","did my best"),
                (r"\btry my best\b","do my best"),(r"\btrying my best\b","doing my best"),(r"\btried my best\b","did my best"),(r"\btry your best\b","do your best")]:
        E.ksub(a,b,trx=r"dhícheall")
    # 36 (08:34Z): his briseadh isteach ar; KEEP Ní mian linn
    E.seed(36,"Ní mian linn briseadh isteach ar an scéal")
    E.lego('S0036L03',target_text='briseadh isteach ar',components=C(('breaking','briseadh'),('in','isteach'),('on','ar')))
    E.sub(r"\bcur isteach\b","briseadh isteach")
    # 38 (08:36Z): his thart ar sheachtain, no le; the piece is "for about a week | thart ar sheachtain"
    E.seed(38,"Tá mé ag foghlaim thart ar sheachtain")
    E.lego('S0038L04',known_text='for about a week',target_text='thart ar sheachtain',components=C(('about','thart ar'),('a week','sheachtain')))
    E.dellego('S0038L05')
    E.sub(r"\b(le )?timpeall seachtaine","thart ar sheachtain")
    E.delp('S0038L04B03')
    # 61 (08:37Z): his ach; "but | ach" its own LEGO (taught at 19, so not new here); English carries "but"
    E.seed(61,"an bhféadfá é sin a rá arís, ach beagán níos moille?","could you say that again, but a little more slowly?")
    E.newlego(61,7,'but','ach',[],is_new=False)
    E.sub(r"\barís beagán níos moille","arís, ach beagán níos moille",r"\bagain a little more slowly","again, but a little more slowly")
    E.delp('S0061L04B03'); E.delp('S0061L06B04')          # the same sentence as L04U01
    # 69 (08:51Z): um thráthnóna ar fad, built up: "in the afternoon | um thráthnóna" then "all afternoon | um thráthnóna ar fad"
    E.seed(69,"Níor mhian leis aire a thabhairt don mhadra óg um thráthnóna ar fad")
    E.lego('S0069L05',known_text='in the afternoon',target_text='um thráthnóna',components=C(('in','um'),('afternoon','tráthnóna')))
    E.sub(r"\ban tráthnóna ar fad","um thráthnóna ar fad")
    E.sub(r"\ban tráthnóna seo\b","um thráthnóna",r"\bthis afternoon\b","in the afternoon",only=in_seeds(69,69))
    E.set('S0069L05B01',known='in the afternoon',target='um thráthnóna')
    l=E.newlego(69,7,'all afternoon','um thráthnóna ar fad',[('in the afternoon','um thráthnóna'),('all','ar fad')])
    E.delp('S0069L06B01'); E.delp('S0069L06B02')
    for k in ['S0069L06U01','S0069L06U02','S0069L06U03','S0069L04U01']: E.move(k,l)
    E.many(l,[('b','all afternoon','um thráthnóna ar fad'),('b','all afternoon yesterday','um thráthnóna ar fad inné'),('u',S[69]['known_text'],"Níor mhian leis aire a thabhairt don mhadra óg um thráthnóna ar fad")])
    # 77 (08:53Z): Cuireann sé ionadh orm; English "It surprises me how quickly…"; "I'm surprised | tá ionadh orm" stays elsewhere
    E.seed(77,"Cuireann sé ionadh orm cé chomh tapa is atá tuiscint á fáil agam air","It surprises me how quickly I'm understanding it")
    E.lego('S0077L01',known_text='it surprises me',target_text='cuireann sé ionadh orm',components=C(('it puts','cuireann sé'),('surprise','ionadh'),('on me','orm')))
    E.lego('S0077L02',known_text='how quickly')
    E.sub(r"\btá ionadh orm\b","cuireann sé ionadh orm",r"\bI(?: a|')m surprised(?: at)?","it surprises me",only=in_seeds(77,77))
    # 102 (08:54Z): his nach mar sin atá sé; keep tá muid
    E.seed(102,"Tá muid ag iarraidh a rá nach mar sin atá sé")
    E.dellego('S0102L04')
    l=E.newlego(102,6,"that it's not like that",'nach mar sin atá sé',[('that not','nach'),('like that','mar sin'),('it is','atá sé')])
    E.many(l,[('b',"that it's not like that",'nach mar sin atá sé'),('b',"I think that it's not like that",'ceapaim nach mar sin atá sé'),
              ('u',"I know that it's not like that",'Tá a fhios agam nach mar sin atá sé'),('u',"he said that it's not like that",'dúirt sé nach mar sin atá sé'),
              ('u',S[102]['known_text'],'Tá muid ag iarraidh a rá nach mar sin atá sé')])
    # 142 (08:57Z): ALL his, course 'tá mé' kept. Kai's condition FAILS ("you are X" is 'tá tú X' all through), so the cue stays
    # "that's very kind of you" (FINDING 1); 'very' and 'your help' follow his Irish.
    E.seed(142,"Is an-chineálta atá tú agus tá mé an-bhuíoch díot as do chabhair","that's very kind of you and I'm very grateful to you for your help")
    E.dellego('S0142L01'); E.dellego('S0142L03')
    E.lego('S0142L05',known_text="I'm very grateful to you",target_text='tá mé an-bhuíoch díot',components=C(('I am','tá mé'),('very grateful','an-bhuíoch'),('to you','díot')))
    E.lego('S0142L07',known_text='for your help',target_text='as do chabhair',components=C(('for','as'),('your help','do chabhair')))
    E.sub(r"\btá mé buíoch díot","tá mé an-bhuíoch díot",r"\bI(?: a|')m grateful to you","I'm very grateful to you")
    E.sub(r"\bas cabhrú\b(?! (liom|leat|linn|leis|léi|leo))","as do chabhair",r"\bfor helping\b(?! (me|you|us|him|her|them))","for your help",only=lambda p:p['seed']>=142)
    E.rebase('S0142L07','as do chabhair'); E.rebase('S0142L05','tá mé an-bhuíoch díot')
    E.delp('S0142L02U08')                                   # used the 272 echo 'Ba mhaith' 130 seeds early
    l=E.newlego(142,8,"that's very kind of you",'is an-chineálta atá tú',[('is','is'),('very kind','an-chineálta'),('that you are','atá tú')])
    E.many(l,[('b',"that's very kind of you",'is an-chineálta atá tú'),('b',"thank you very much, that's very kind of you",'go raibh míle maith agat, is an-chineálta atá tú'),
              ('u',"that's very kind of you and I'm very grateful to you",'is an-chineálta atá tú agus tá mé an-bhuíoch díot'),
              ('u',"that's very kind of you and I'm very grateful to you for your help","Is an-chineálta atá tú agus tá mé an-bhuíoch díot as do chabhair")])
    # 147 (08:58Z): B'an-chineálta a bhí sí + thug sí faoi deara; KEEP neirbhíseach
    E.seed(147,"B'an-chineálta a bhí sí nuair a thug sí faoi deara go raibh mé neirbhíseach","She was very kind when she noticed I was nervous")
    E.dellego('S0147L02')
    l='S0147L01'; E.lego(l,known_text='she was very kind',target_text="b'an-chineálta a bhí sí",components=C(('was',"b'"),('very kind','an-chineálta'),('that she was','a bhí sí')))
    for k in E.under(l): E.delp(k)
    E.lego('S0147L04',known_text='when she noticed',target_text='nuair a thug sí faoi deara',components=C(('when','nuair a'),('she gave','thug sí'),('notice','faoi deara')))
    E.newlego(147,5,'that I was','go raibh mé',[('that','go'),('I was','raibh mé')])
    E.sub(r"nuair a chonaic sí go raibh mé","nuair a thug sí faoi deara go raibh mé",r"when she saw (that I was|me feeling)","when she noticed that I was")
    E.sub(r"\bbhí sí an-chineálta nuair a thug","b'an-chineálta a bhí sí nuair a thug")
    E.rebase('S0147L04','nuair a thug sí faoi deara')
    E.many(l,[('b','she was very kind',"b'an-chineálta a bhí sí"),('b','she was very kind last night',"b'an-chineálta a bhí sí aréir"),
              ('u','she was very kind when I was tired',"b'an-chineálta a bhí sí nuair a bhí mé tuirseach"),
              ])
    E.add('S0147L05','use','She was very kind when she noticed I was nervous',"B'an-chineálta a bhí sí nuair a thug sí faoi deara go raibh mé neirbhíseach")
    E.many('S0147L05',[('b','he said that I was nervous','dúirt sé go raibh mé neirbhíseach'),('b','when she noticed that I was tired','nuair a thug sí faoi deara go raibh mé tuirseach'),
                       ('u',"I think that I was nervous this morning",'ceapaim go raibh mé neirbhíseach ar maidin')])
    E.many('S0147L04',[('b','when she noticed','nuair a thug sí faoi deara'),('u','she was very kind when she noticed that I was tired',"b'an-chineálta a bhí sí nuair a thug sí faoi deara go raibh mé tuirseach")])
    # 148 (08:59Z): Ní rófhoighneach a bhí sé liom; KEEP nuair nach raibh mé in ann; English unchanged
    E.seed(148,"Ní rófhoighneach a bhí sé liom nuair nach raibh mé in ann freagra a thabhairt dó")
    E.dellego('S0148L01')
    E.lego('S0148L02',known_text='not very patient',target_text='ní rófhoighneach',components=C(('not','ní'),('too patient','rófhoighneach')))
    for k in E.under('S0148L02'): E.delp(k)
    E.many('S0148L02',[('b','not very patient','ní rófhoighneach'),('b',"she wasn't very patient",'ní rófhoighneach a bhí sí'),('u',"you weren't very patient with me last night",'ní rófhoighneach a bhí tú liom aréir')])
    E.sub(r"\b[Nn]í raibh sé an-fhoighneach liom","Ní rófhoighneach a bhí sé liom")
    E.sub(r"\bnach raibh sé an-fhoighneach liom","nach rófhoighneach a bhí sé liom")
    l=E.newlego(148,5,"he wasn't very patient with me",'ní rófhoighneach a bhí sé liom',[('not very patient','ní rófhoighneach'),('that he was','a bhí sé'),('with me','liom')])
    E.many(l,[('b',"he wasn't very patient with me",'ní rófhoighneach a bhí sé liom'),('u',"he wasn't very patient with me last night",'ní rófhoighneach a bhí sé liom aréir'),
              ('u',S[148]['known_text'],"Ní rófhoighneach a bhí sé liom nuair nach raibh mé in ann freagra a thabhairt dó")])
    # the 6 later POSITIVE 'very patient' phrases: 'an-fhoighneach' is no longer in any seed, so it cannot be a piece (K15) — dropped
    for k in ['S0181L03U05','S0197L02U02','S0226L01U06','S0228L01U04','S0231L02U01','S0236L04U08']: E.delp(k)
    # 159 (09:00Z): an rud inside "that isn't what | Ní hé sin an rud"; keep atá mé
    E.seed(159,"Ní hé sin an rud atá mé ag iarraidh a rá leat")
    l=E.newlego(159,4,"that isn't what",'Ní hé sin an rud',[("that isn't",'Ní hé sin'),('the thing','an rud')])
    hit=E.sub(r"\bní hé sin (atá|cad a)",r"Ní hé sin an rud \1")
    for k in hit: E.set(k,target=E.cur[k][1].replace('an rud cad a','an rud a'))
    for k in hit:
        if E.P[k]['seed']==159 and k not in E.deleted: E.move(k,l)
    E.add(l,'build',"that isn't what",'Ní hé sin an rud')
    # 178 (09:12Z): an t-am agam (English "the time"); KEEP cé go and gur mhian liom
    E.seed(178,"Ní raibh an t-am agam, cé gur mhian liom tú a fheiceáil","I didn't have the time, although I wanted to see you")
    E.lego('S0178L01',known_text='I did not have the time',target_text='ní raibh an t-am agam',components=C(('not was','ní raibh'),('the time','an t-am'),('at me','agam')))
    hit=E.sub(r"\b(raibh|níl|bhfuil|tá) am agam\b",r"\1 an t-am agam")
    for k in hit: E.set(k,known=re.sub(r"\b(have|had|has|having) time\b",r"\1 the time",E.cur[k][0]))
    # 228 (09:14Z): tosú ar labhairt a chleachtadh
    E.seed(228,"Tá an fear sin díreach tar éis tosú ar labhairt a chleachtadh")
    E.lego('S0228L04',known_text='to start to practise speaking',target_text='tosú ar labhairt a chleachtadh',components=C(('to start','tosú'),('on','ar'),('to practise speaking','labhairt a chleachtadh')))
    for k in E.under('S0228L04'): E.delp(k)
    E.many('S0228L04',[('b','to start to practise speaking','tosú ar labhairt a chleachtadh'),('b',"I'd like to start to practise speaking",'ba mhaith liom tosú ar labhairt a chleachtadh'),
        ('u',"I'd like to be able to start to practise speaking",'ba mhaith liom a bheith in ann tosú ar labhairt a chleachtadh'),('u',"I'm going to start to practise speaking",'tá mé chun tosú ar labhairt a chleachtadh'),
        ('u',S[228]['known_text'],'Tá an fear sin díreach tar éis tosú ar labhairt a chleachtadh')])

# ───────────────────────── B. the 28-row list + stopped four, rows 1-300 ─────────────────────────
@fam('28-list rows 1-300',[25,82,95,98,99,111,127,129,160,178,184,195,221,235,236,272,280,291])
def rows28():
    # 25 (10:27Z): … sula gcaithfidh mé dul abhaile; keep chun. 'dul abhaile' is taught here now (95's copy becomes not new)
    E.seed(25,"an bhfuil tú chun cabhrú liom sula gcaithfidh mé dul abhaile?","Are you going to help me before I have to go home?")
    old=E.under('S0025L03')
    E.lego('S0025L03',known_text='to go home',target_text='dul abhaile',components=C(('to go','dul'),('home','abhaile')))
    l=E.newlego(25,4,'before I have to','sula gcaithfidh mé',[('before','sula'),('I have to','gcaithfidh mé')])
    E.sub(r"\bsula gcaithfidh (mé|sé|sí|tú|muid|siad) dul(?! abhaile)\b",r"sula gcaithfidh \1 dul abhaile",r"\b(ha(?:ve|s) to go)\b(?! home)",r"\1 home")
    for k in ['S0025L03B02','S0025L03B03','S0025L03B04']: E.delp(k)      # after the change, the same sentences as U03, U05, U02
    for k in old:
        if k not in E.deleted: E.move(k,l)
    E.many(l,[('b','before I have to speak','sula gcaithfidh mé labhairt')])
    E.many('S0025L03',[('b','I want to go home','is mian liom dul abhaile'),('b',"I'm going to go home now",'tá mé chun dul abhaile anois'),
                       ('u',"I'd like to go home tomorrow",'ba mhaith liom dul abhaile amárach'),('u','he wants to go home with everyone else','is mian leis dul abhaile le gach duine eile')])
    E.lego('S0095L03',is_new=False)
    for k in E.under('S0095L03'): E.delp(k)                 # a not-new basket never plays (P25)
    # 82 (09:38Z): "…Why?" | "…Cén fáth?" — 'why not' is taught nowhere else, so nothing else leans on it; 'why | cén fáth' debuts here, 99's copy not new
    E.seed(82,"níl mé chun fanacht leat. Cén fáth?","I'm not going to wait for you. Why?")
    E.lego('S0082L04',known_text='why',target_text='cén fáth',components=C(('what','cén'),('reason','fáth')))
    E.sub(r"\bcén fáth nach bhfuil\b","cén fáth",r"\bwhy not\b","why",only=in_seeds(82,82))
    E.lego('S0099L03',is_new=False)
    for k in E.under('S0099L03'): E.delp(k)             # a not-new basket never plays (P25); they lean on words taught after 82
    # 98 (10:32Z): ar chluiche eile a imirt; "playing another game". 'something else' is still taught (158, and 103's 'eile' + 4's 'rud éigin')
    E.seed(98,"ba chóir dom smaoineamh ar chluiche eile a imirt","I should consider playing another game")
    E.lego('S0098L03',known_text='another game',target_text='cluiche eile',type='M',components=C(('a game','cluiche'),('other','eile')))
    E.sub(r"\brud éigin eile a imirt","cluiche eile a imirt",r"\b(play(?:ing)?) something else","\\1 another game")
    E.sub(r"\bsmaoineamh ar cluiche\b","smaoineamh ar chluiche")
    for k in E.under('S0098L03')+E.under('S0098L02'):
        if 'luiche' in E.cur[k][1] or not contains(E.cur[k][1],E.L[E.P[k]['lego']]['target_text'] if E.P[k]['lego']!='S0098L03' else 'cluiche eile'): E.delp(k)
    E.delp('S0098L04B03')                                   # now the same sentence as L04U01
    # cs #410·AI: the loop above takes S0098L02's only phrase; the commit-time trigger DEBUT_WITHOUT_PRACTICE refused the apply. Two lines from taught pieces (rud éigin, 4):
    E.many('S0098L02',[('b','to consider something','smaoineamh ar rud éigin'),('u','I should consider something','ba chóir dom smaoineamh ar rud éigin')])
    E.many('S0098L03',[('b','another game','cluiche eile'),('b','to find another game','cluiche eile a fháil'),('u',"I'm looking for another game",'tá mé ag lorg cluiche eile'),
                       ('u','I should consider another game','ba chóir dom smaoineamh ar chluiche eile')])
    E.many('S0098L04',[('u',"I'd like to play another game with my friends",'ba mhaith liom cluiche eile a imirt le mo chairde')])
    # 111 (10:33Z): impersonal athraítear; "our brain is changed"; course's 'muid'. 'athraíonn sé' then has no teaching LEGO, so every line follows (FINDING)
    E.seed(111,"nuair a fhoghlaimíonn muid rud nua athraítear ár n-inchinn","When we learn something new, our brain is changed")
    E.lego('S0111L03',known_text='is changed',target_text='athraítear',type='A',components=[])
    E.sub(r"\b(a )?athraíonn sé ár n-inchinn",lambda m:(m.group(1) or '')+"athraítear ár n-inchinn",r"\b(it change[sd] our brain|our brain changes)\b","our brain is changed")
    E.set('S0126L04U01',known='I am learning Irish now and the shape of my brain is changed',target='tá mé ag foghlaim Gaeilge anois agus athraítear cruth m\'inchinne')
    for k in ['S0112L01U15','S0112L05U04','S0112L05U10']: E.delp(k)     # 'it changes everything / the way she thought': no passive wording that keeps their LEGO
    for k in E.under('S0111L03'): E.delp(k)
    seen=set()
    for k in E.under('S0111L01')+E.under('S0111L02')+E.under('S0111L04'):
        t=E.cur[k][1]
        if 'athraítear' in t:
            if t.lower() in seen or 'ár n-inchinn' not in t: E.delp(k)
            else:
                seen.add(t.lower())
                if E.P[k]['lego']!='S0111L04': E.move(k,'S0111L04')
    E.many('S0111L03',[('b','something is changed','athraítear rud éigin'),('b','everything is changed','athraítear gach rud'),
                       ('u','everything is changed when we learn something new','athraítear gach rud nuair a fhoghlaimíonn muid rud nua'),
                       ('u','everything is changed now','athraítear gach rud anois')])
    if 'athraítear ár n-inchinn' not in seen: E.add('S0111L04','build','our brain is changed','athraítear ár n-inchinn')
    if 'nuair a fhoghlaimíonn muid rud nua athraítear ár n-inchinn' not in seen: E.add('S0111L04','use','When we learn something new, our brain is changed','nuair a fhoghlaimíonn muid rud nua athraítear ár n-inchinn')
    # 127 (10:36Z): "…why I wanted to meet you" | …ar mhian liom bualadh leat (his and our 'an chúis' stays). 'to see you' first taught at 178 now.
    E.seed(127,"Ní hé sin an chúis ar mhian liom bualadh leat","That isn't why I wanted to meet you")
    E.lego('S0127L03',known_text='to meet you',target_text='bualadh leat',components=C(('to meet','bualadh'),('with you','leat')))
    E.sub(r"\btú a fheiceáil\b","bualadh leat",r"\bsee you\b","meet you",only=in_seeds(127,177))
    E.ksub(r"\bseeing you\b","meeting you",trx=r"bualadh leat",only=in_seeds(127,177))
    E.delp('S0131L06U02')                                   # 'meet you in my head': nonsense once reworded
    E.lego('S0178L03',is_new=True)
    E.many('S0178L03',[('b','to see you','tú a fheiceáil'),('b','I wanted to see you','ba mhian liom tú a fheiceáil'),('u',"I'd like to see you tomorrow night",'ba mhaith liom tú a fheiceáil oíche amárach'),
                       ('u',"I didn't have the time, although I wanted to see you",'Ní raibh an t-am agam, cé gur mhian liom tú a fheiceáil')])
    # 129: Kai 17 Nov 12:19Z took #398's recommendation (report item 4) — KEEP OURS at 129 (ag déanamh stays; 72/114/117 agree). Ops dropped (cs #410·AI).
    if False:
        # 129 (10:38Z): …go bhfuil ag éirí chomh maith sin leat
        E.seed(129,"Tá an-áthas orm go bhfuil ag éirí chomh maith sin leat")
        E.dellego('S0129L02'); E.dellego('S0129L03')
        pp={'mé':'liom','tú':'leat','sé':'leis','sí':'léi','muid':'linn','siad':'leo','sibh':'libh'}
        E.sub(r"\b(mé|tú|sé|sí|muid|siad|sibh) ag déanamh chomh maith sin",lambda m:"ag éirí chomh maith sin "+pp[m.group(1)])
        l=E.newlego(129,5,"you're doing so well",'ag éirí chomh maith sin leat',[('getting on','ag éirí'),('so well','chomh maith sin'),('with you','leat')])
        E.many(l,[('b',"that you're doing so well",'go bhfuil ag éirí chomh maith sin leat'),('b',"I think that you're doing so well",'ceapaim go bhfuil ag éirí chomh maith sin leat'),
                  ('u',"it's interesting that you're doing so well",'tá sé suimiúil go bhfuil ag éirí chomh maith sin leat'),('u',S[129]['known_text'],'Tá an-áthas orm go bhfuil ag éirí chomh maith sin leat')])
    # 160 (10:38Z): conas a déarfá; "how would you say"
    E.seed(160,"conas a déarfá an focal seo i nGaeilge?","how would you say this word in Irish?")
    E.lego('S0160L01',known_text='how would you say',target_text='conas a déarfá',components=C(('how','conas'),('you would say','a déarfá')))
    E.sub(r"\bconas a deir tú\b","conas a déarfá",r"\bhow do you say\b","how would you say")
    # 221 (10:43Z): ina dhiaidh sin; 168 keeps agus ansin
    E.seed(221,"d'fhéach mé ar an bpeil agus d'fhéach mé ar scannán ina dhiaidh sin","I watched the football and I watched a film after that")
    E.lego('S0221L03',known_text='and',target_text='agus',type='A',components=[])
    l=E.newlego(221,5,'after that','ina dhiaidh sin',[('after it','ina dhiaidh'),('that','sin')])
    E.sub(r"agus ansin d'fhéach mé ar scannán","agus d'fhéach mé ar scannán ina dhiaidh sin",r"and then I watched a film","and I watched a film after that")
    for k in [k for k,p in E.P.items() if p['seed']==221 and k not in E.deleted and p['phrase_role']!='component' and 'ina dhiaidh sin' in E.cur[k][1]]: E.delp(k)
    E.many(l,[('b','after that','ina dhiaidh sin'),('b','I watched a film after that',"d'fhéach mé ar scannán ina dhiaidh sin"),('u','I went out after that','chuaigh mé amach ina dhiaidh sin'),
              ('u','I watched the football and I watched a film after that',"d'fhéach mé ar an bpeil agus d'fhéach mé ar scannán ina dhiaidh sin")])
    # cs #410·AI: S0221L01 'I watched' (new) lost its only phrase above (DEBUT_WITHOUT_PRACTICE). Two lines from taught pieces (rud éigin 4, aréir before 221):
    E.many('S0221L01',[('b','I watched something',"d'fhéach mé ar rud éigin"),('u','I watched something last night',"d'fhéach mé ar rud éigin aréir")])
    # 184 (10:45Z + ECHO FINAL): Chonaic, bhí siad san oifig tamall ó shin; English plain "yes" (his own English)
    E.seed(184,"chonaic, bhí siad san oifig tamall ó shin","yes they were in the office a while ago")
    E.lego('S0184L01',known_text='yes they were',target_text='chonaic, bhí siad',components=C(('I saw','chonaic'),('they were','bhí siad')))
    E.dellego('S0184L03')
    for k in E.under('S0184L01'): E.delp(k)
    E.sub(r"chonaic, chonaic mé san oifig iad tamall ó shin","chonaic, bhí siad san oifig tamall ó shin",r"yes I saw them in the office a while ago","yes they were in the office a while ago")
    for k in [k for k,p in E.P.items() if p['seed']==184 and k not in E.deleted and p['phrase_role']!='component' and E.cur[k][1].lower().startswith('chonaic, bhí siad')]: E.delp(k)
    E.many('S0184L01',[('b','yes they were here','chonaic, bhí siad anseo'),('b','yes they were here last night','chonaic, bhí siad anseo aréir'),
                       ('u','yes they were with my mother this morning','chonaic, bhí siad le mo mháthair ar maidin')])
    E.add('S0184L02','build','yes they were in the office','chonaic, bhí siad san oifig')
    E.add('S0184L04','use','yes they were in the office a while ago','chonaic, bhí siad san oifig tamall ó shin')
    # 195 (10:55Z): Tá mé ag lorg an airgid a d'fhág mé ar an mbord (mirrors 194); -ing = ag + noun in the genitive
    E.seed(195,"Tá mé ag lorg an airgid a d'fhág mé ar an mbord","I'm looking for the money I left on the table")
    E.lego('S0195L01',known_text='I am',target_text='Tá mé',is_new=False,components=C(('am','tá'),('I','mé')))
    for k in E.under('S0195L01'): E.delp(k)
    E.lego('S0195L02',known_text='looking for the money',target_text='ag lorg an airgid',components=C(('looking for','ag lorg'),('of the money','an airgid')))
    E.dellego('S0195L05')
    E.sub(r"\bag iarraidh an t-airgead a d'fhág mé ar an mbord a fháil","ag lorg an airgid a d'fhág mé ar an mbord",r"\btrying to find the money","looking for the money")
    E.sub(r"\bag lorg an t-airgead\b","ag lorg an airgid")
    # the plain 'the money | an t-airgead' is in no seed any more, so it has no teaching piece: every line that says it goes (FINDING)
    global AIRGEAD
    AIRGEAD=[k for k,p in E.P.items() if p['phrase_role']!='component' and k not in E.deleted and 't-airgead' in E.cur[k][1]]
    for k in AIRGEAD: E.delp(k)
    for k in [k for k,p in E.P.items() if p['seed']==195 and k not in E.deleted and p['phrase_role']!='component' and 'ag lorg an airgid a d' in E.cur[k][1]]: E.delp(k)
    E.many('S0195L02',[('b','looking for the money','ag lorg an airgid'),('b',"I'm looking for the money",'tá mé ag lorg an airgid'),('b','are you looking for the money?','an bhfuil tú ag lorg an airgid?'),
                       ('u',"we're looking for the money at the moment",'tá muid ag lorg an airgid faoi láthair')])
    E.add('S0195L03','use',"I'm looking for the money that I left at work","tá mé ag lorg an airgid a d'fhág mé ag an obair")
    E.add('S0195L04','use',"I'm looking for the money I left on the table","Tá mé ag lorg an airgid a d'fhág mé ar an mbord")
    # 235 (10:57Z): … agus dúirt sé liom gur mhaith leis …; "he told me that he'd like"
    E.seed(235,"bhuail mé le duine éigin agus dúirt sé liom gur mhaith leis rud éigin a insint duit","I met someone, and he told me that he'd like to tell you something")
    E.lego('S0236L03',is_new=True)                          # 'who said | a dúirt' leaves 235, so 236 is where it is taught (L31)
    for k in E.under('S0235L03'):
        E.set(k,target=E.cur[k][1]); E.move(k,'S0236L03')
    E.lego('S0235L03',known_text='he told me',target_text='dúirt sé liom',components=C(('he said','dúirt sé'),('to me','liom')))
    E.lego('S0235L04',known_text="that he'd like",target_text='gur mhaith leis',components=C(('that','gur'),('would be good','mhaith'),('with him','leis')))
    E.sub(r"\bgur mhian leis\b","gur mhaith leis",r"\bthat he wanted\b","that he'd like",only=in_seeds(235,235))
    E.sub(r"\bduine éigin a dúirt gur mhaith leis","duine éigin agus dúirt sé liom gur mhaith leis",r"\bsomeone who said that he'd like","someone, and he told me that he'd like",only=in_seeds(235,235))
    E.set('S0235L04U07',known="I met someone at the weekend who said that he'd like to speak Irish with you")
    E.rebase('S0235L04','gur mhaith leis')
    E.newlego(235,7,'and','agus',[],is_new=False)
    E.many('S0235L03',[('b','he told me','dúirt sé liom'),('b','he told me yesterday','dúirt sé liom inné'),('u','he told me that he was too busy','dúirt sé liom go raibh sé ró-ghnóthach'),
                       ('u','I met someone, and he told me that he wanted to help','bhuail mé le duine éigin agus dúirt sé liom gur mhian leis cabhrú')])
    E.many('S0235L04',[('b',"that he'd like",'gur mhaith leis'),('b',"he told me that he'd like to help",'dúirt sé liom gur mhaith leis cabhrú'),
                       ('u',"I met someone, and he told me that he'd like to tell you something",'bhuail mé le duine éigin agus dúirt sé liom gur mhaith leis rud éigin a insint duit')])
    # 291 (11:01Z): … Gaeilge a labhairt …; "speak Irish better"
    E.seed(291,"Tá súil agam go mbeidh mé in ann Gaeilge a labhairt níos fearr go luath","I hope I'll be able to speak Irish better soon")
    E.lego('S0291L03',known_text='to speak Irish',target_text='Gaeilge a labhairt',type='M',components=C(('Irish','Gaeilge'),('to speak','a labhairt')))
    E.sub(r"go mbeidh mé in ann labhairt níos fearr go luath","go mbeidh mé in ann Gaeilge a labhairt níos fearr go luath",r"able to speak better soon","able to speak Irish better soon",only=in_seeds(291,291))
    # 272 (09:42Z + ECHO FINAL 11:25Z): "Yes, that's a great idea" | Ba mhaith, is smaoineamh iontach é sin
    E.seed(272,"Ba mhaith, is smaoineamh iontach é sin","yes that's a great idea")
    E.lego('S0272L02',known_text='yes',target_text='Ba mhaith',components=C(('would be','ba'),('good','mhaith')))
    for k in E.under('S0272L02'): E.delp(k)
    l=E.newlego(272,4,"that's a great idea",'is smaoineamh iontach é sin',[('is','is'),('a great idea','smaoineamh iontach'),('that','é sin')])
    E.many(l,[('b',"that's a great idea",'is smaoineamh iontach é sin'),('b',"that's a great idea, thank you",'is smaoineamh iontach é sin, go raibh maith agat'),
              ('u',"yes that's a great idea",'Ba mhaith, is smaoineamh iontach é sin')])
    E.many('S0272L02',[('b',"yes that's a great idea",'Ba mhaith, is smaoineamh iontach é sin'),('b','yes thank you very much','Ba mhaith, go raibh míle maith agat'),
                       ('u',"yes that's a great idea, thank you",'Ba mhaith, is smaoineamh iontach é sin, go raibh maith agat')])
    # 280 (09:51Z corrected + ECHO FINAL): "No, I only had the most important job to do" | Ní raibh, ní raibh ach an jab is tábhachtaí le déanamh agam
    # pieces as Kai set them, none with a gap: a job to do → the most important job → I only had a job → phrases slot the detail in
    E.seed(280,"Ní raibh, ní raibh ach an jab is tábhachtaí le déanamh agam","no I only had the most important job to do")
    for k in E.under('S0280L01'): E.delp(k)
    E.lego('S0280L01',known_text='no',target_text='Ní raibh',components=C(('not','ní'),('was','raibh')))
    E.dellego('S0280L03')
    a=E.newlego(280,4,'a job to do','jab le déanamh',[('a job','jab'),('to do','le déanamh')])
    b=E.newlego(280,5,'I only had a job','ní raibh ach jab agam',[('not was','ní raibh'),('but','ach'),('a job','jab'),('at me','agam')])
    E.many(a,[('b','a job to do','jab le déanamh'),('b','I had a job to do','bhí jab le déanamh agam'),('u','I had a job to do last night','bhí jab le déanamh agam aréir'),
              ('u','I had the most important job to do','bhí an jab is tábhachtaí le déanamh agam')])
    E.many(b,[('b','I only had a job','ní raibh ach jab agam'),('b','I only had a job to do','ní raibh ach jab le déanamh agam'),
              ('u','I only had the most important job to do','ní raibh ach an jab is tábhachtaí le déanamh agam'),
              ('u','no I only had the most important job to do','Ní raibh, ní raibh ach an jab is tábhachtaí le déanamh agam')])
    E.many('S0280L01',[('b',"no there wasn't much time left",'Ní raibh, ní raibh mórán ama fágtha'),('b',"no I wasn't ready",'Ní raibh, ní raibh mé réidh'),
                       ('u',"no I didn't have the time last night",'Ní raibh, ní raibh an t-am agam aréir')])
    E.add(b,'use','no I only had the most important job to do last night','Ní raibh, ní raibh ach an jab is tábhachtaí le déanamh agam aréir')

# ───────────────────────── C. census rulings (11:20Z-11:25Z) ─────────────────────────
@fam("census: I'm afraid",[183])
def afraid():
    # 183 → "I'm sorry" (tá brón orm); it works in the seed. "I'm afraid" = eagla (521) only.
    E.seed(183,S[183]['target_text'],"no I'm sorry I haven't seen them")
    E.lego('S0183L01',known_text="no I'm sorry")
    E.ksub(r"\bI'm afraid\b","I'm sorry",trx=r"brón orm")
    E.set('S0153L03U11',known='he is trying to do everything in the same way, because he is worried about changing anything')

@fam('census: to know',[45])
def toknow():
    # 45/201 (16 Nov 18:06Z rule): Irish needs both (ar eolas + a thing; a fhios + a clause). 45 grows inside the cap with the
    # stand-in "it" Kai allowed for frames on 16 Nov (L33), like 105 and 290: "to know it | é a bheith ar eolas agam" (8 syllables).
    E.lego('S0045L03',known_text='to know it',target_text='é a bheith ar eolas agam',components=C(('it','é'),('to be','a bheith'),('known','ar eolas'),('at me','agam')))
    E.add('S0045L03','build','to know it','é a bheith ar eolas agam')

@fam('census: need',[44,45,59,104,106,139,167,188,207,210])
def need():
    # need = de dhíth orm only. Every "need to" over caithfidh is re-cued "have to"; "need to do" over 'le déanamh agam' is re-cued
    # "I've got … to do" (the course's own pattern at 73/75: "I've got more to learn | tá níos mó le foghlaim agam").
    def have(k):
        k=re.sub(r"\b(do|does|did|don't|doesn't|didn't|do not|does not|did not|will|won't|would|to|might|may|should|could|can) need to\b",r"\1 have to",k,flags=re.I)
        k=re.sub(r"\b(he|she|it|everyone|nobody|someone|who|that man|that woman|my \w+|your \w+) needs to\b",r"\1 has to",k,flags=re.I)
        k=re.sub(r"\bneeds to\b","has to",k,flags=re.I); k=re.sub(r"\bneed to\b","have to",k,flags=re.I)
        return re.sub(r"\bneeded to\b","had to",k,flags=re.I)
    # le déanamh
    E.seed(59,S[59]['target_text'],"I know how to do what I've got to do next week"); E.lego('S0059L03',known_text="what I've got to do")
    E.seed(167,S[167]['target_text'],"what have you got to do tomorrow afternoon?"); E.lego('S0167L01',known_text='what have you got to do')
    E.seed(207,S[207]['target_text'],"you've done what there was for you to do")
    led=r"le déanamh"
    for a,b in [(r"\bwhat I need to do\b","what I've got to do"),(r"\bwhat do you need to do\b","what have you got to do"),(r"\bwhat you need to do\b","what you've got to do"),
                (r"\bwhat (he|she) needs to do\b",r"what \1's got to do"),(r"\bwhat we need to do\b","what we've got to do"),(r"\bwhat they need to do\b","what they've got to do"),
                (r"\bwhat you needed to do\b","what there was for you to do"),(r"\bwhat I needed to do\b","what there was for me to do"),
                (r"\bwhat do I need to do\b","what have I got to do"),(r"\bwhat does (he|she) need to do\b",r"what has \1 got to do"),(r"\bwhat do we need to do\b","what have we got to do")]:
        E.ksub(a,b,trx=led)
    E.set('S0200L01U08',known='they say that it is a good idea to check what there is to do before you start')
    E.set('S0276L03U14',known="I would like to stay longer but there is something important I've got to do next week")
    cait=re.compile(r"c?h?aithfidh|gcaithfidh",re.I)
    for n,s in sorted(S.items()):
        tg=E.seedtext.get(n,(None,s['target_text']))[1]; kn=E.seedtext.get(n,(s['known_text'],))[0]
        if cait.search(tg) and re.search(r"\bneed",kn,re.I) and n not in (327,):
            E.seed(n,tg,have(kn))
        for l in s['legos']:
            if cait.search(l['target_text']) and re.search(r"\bneed",l['known_text'],re.I): E.lego(l['lego_id'],known_text=have(l['known_text']))
    for k,p in E.P.items():
        if p['phrase_role']!='component' and k not in E.deleted and cait.search(E.cur[k][1]) and re.search(r"\bneed",E.cur[k][0],re.I): E.cur[k][0]=have(E.cur[k][0])
    E.set('S0065L03U03',known='we wanted to take a little more time to give you something')
    E.set('S0089L03U13',known="she knows there is a lot she has still got to learn, but I think it's useful to start speaking as soon as possible")
    E.set('S0103L05U07',known="I think we've got something else to try because this is not working at all")
    for lid in ['S0104L01','S0106L04']: E.lego(lid,known_text='we have to')
    E.lego('S0210L02',known_text='that we have to')

@fam('census: had-to before 278',[155,156,168,199,202,208,276])
def hadto():
    # "had to" is taught at 278. Earlier lines either never said it in Irish (English mended) or are reworded without it.
    E.set('S0155L02B04',known='I was waiting for a while')
    E.set('S0155L02U02',known='I was waiting here for a while, because I was not ready to leave at that time')
    E.ksub(r"\bbefore she had to leave\b","before she has to leave",trx=r"sula gcaithfidh sí")
    E.ksub(r"\bshe said she had to leave\b","she said she has to leave",trx=r"go gcaithfidh sí")
    E.ksub(r"\bbefore we had to finish\b","before we have to finish",trx=r"sula gcaithfidh muid")
    E.set('S0156L04U12',known='she wanted to continue speaking Irish with me tonight but I wanted to leave',target='ba mhian léi Gaeilge a labhairt liom anocht ach ba mhian liom imeacht')
    E.set('S0208L01B05',known="I didn't want to ask you but I want to know",target='Níor mhian liom ceist a chur ort ach is mian liom a fhios a bheith agam')
    E.set('S0208L01U01',known="I didn't want to ask you about that but I really want to find the answer")
    E.set('S0208L02U01',known="I didn't want to ask you how to say it but I really wanted to know",target='Níor mhian liom ceist a chur ort conas é a rá ach ba mhian liom a fhios a bheith agam')
    E.set('S0208L02U04',known='I could not remember how to say it so I wanted to ask someone else',target='ní raibh mé in ann cuimhneamh conas é a rá mar sin ba mhian liom ceist a chur ar dhuine éigin eile')
    E.set('S0208L02U02',known='I did not know how to say it in Irish so I wanted to ask someone',target='ní raibh a fhios agam conas é a rá i nGaeilge mar sin ba mhian liom ceist a chur ar dhuine éigin')
    E.delp('S0208L02U08')
    E.set('S0276L05U08',known='they wanted to stay a little longer but there was work to do and they wanted to leave')

@fam('-ing / to rule',[68,77,83])
def ing():
    # census (10:55Z rule): -ing + thing = ag + genitive. Three lines break it with a plain noun; the genitive form is taught nowhere, so they go.
    for k in ['S0068L03U07','S0077L02U02','S0083L01U10']: E.delp(k)

@fam('echo rule',[96,97,279,282])
def echo():
    # ECHO FINAL: an echo is never practised bare, and only with the question it answers
    for k in ['S0096L01B01','S0097L01B01','S0279L02B01']: E.delp(k)       # bare echo
    E.delp('S0097L01U01')      # 'Tá, ceapaim…' — Tá does not answer a "do you think" question
    E.delp('S0282L01U01')      # 'ar mhaith leat…? ní miste' — the echo of another question

# ───────────────────────── D. seeds past 300: sentence text only (no LEGOs exist there yet) ─────────────────────────
LATE={ # seed: (Irish, English or None=unchanged)
 304:("ceapaim nach mian léi go mbeadh sí ag obair ón mbaile",None),
 327:("an gceapann tú go gcaithfidh sí bealach eile a thairiscint chun é a dhéanamh?","do you think that she has to offer another way to do it?"),
 328:("Ceapaim, ceapaim gur chóir di sin a thairiscint","yes I think she ought to offer that"),
 332:("is féidir leis saol nua a chur ar bun dá dheirfiúr",None),
 335:("ceapaim gur féidir leis smaointe tairbheacha a chur leis",None),
 356:("bhí, bhí rud éigin tábhachtach le plé acu",None),
 357:("Ní raibh, ní raibh ann ach gur mhian léi teachtaireacht a sheoladh chuici",None),
 374:("Chonaic, cheap mé go raibh sé go hálainn","yes I thought it was beautiful"),
 378:("Ní dheachaigh, ní raibh dóthain airgid agam i leith laethanta saoire",None),
 381:("Níor fhiafraigh mé de an raibh sé ar intinn aige muid a leanúint","I didn't ask him if he intended to follow us"),
 411:("ba mhaith linn bord i leith ceathrar a chur in áirithe don oíche anocht",None),
 415:("Ní bheadh fadhb ar bith leis sin, dar liom",None),
 416:("Is mian leo a bheith ar thús cadhnaíochta an bhliain seo chugainn","they want to be in the lead next year"),
 423:("an gcaithfidh siad ceist atá chomh ríshoiléir sin a chur?",None),
 432:("B'fhéidir go bhfuil súil acu go gcuirfidh tú ceist orthu faoi","maybe they hope you'll ask them about it"),
 447:("an mbeidh siad in ann síob abhaile a thabhairt dúinn tar éis an bhéile?","will they be able to give us a lift home after the meal?"),
 454:("tháinig ár gcairde anseo thart ar a sé a chlog",None),
 460:("Is mian liom siopa atá gar don teach ósta a fháil",None),
 461:("siopa inar féidir liom roinnt cártaí poist a cheannach",None),
 465:("an chéad uair eile fiafróidh mé a hainm di","next time I'll ask her her name"),
 481:("Is é an fíordhóchas amháin atá fágtha againn",None),
 483:("Níl an saol éasca ach níl sé amuigh air go bhfuil sé éasca",None),
 489:("mura ndéanann tú cupán de chaife láidir dom láithreach bonn",None),
 490:("Dá bharr sin, ní bheidh muinín agam as aon duine go deo arís",None),
 492:("cé acu de na háiteanna sin atá ina háit is suimiúla duit?","which of those places is the most interesting place to you?"),
 496:("Níl mé ag beartú go gcailleoidh mé nuair atá fíorthábhacht ag baint leis",None),
 498:("Tá sé ina sheasamh thall ansin ina aonar laistigh den tslí isteach",None),
 501:("Mura mbeadh ann ach go bhféadfainn muinín a bheith as sibh a bheith in ann imirt le chéile gan argóint",None),
 542:("gach uair a mhothaíonn tú feargach",None),
 601:("bhí muid ag caint faoi conas a thosaigh an rud ar fad",None),
 611:("bheinn tar éis a bheith toilteanach féachaint áit éigin eile","I would have been willing to look somewhere else"),
}
@fam('seeds past 300 (text only)',LATE.keys())
def late():
    for n,(t,k) in LATE.items(): E.seed(n,t,k)

# ───────────────────────── E. seed 166 MOVED later (09:29Z) — kept in its own file, move-166.ops.json ─────────────────────────
# There is no op that renumbers a seed. What the existing ops can do is SWAP two sentences between their slots: 166's sentence
# (Eoghan's 'Níl ainm an-neamhghnách orm', cue "I don't have a very unusual name") goes to slot 300, the last built seed, which is
# after 'níl … agam' is secure (260, 294, 298); slot 166 takes 300's sentence ('she doesn't want to seem unfriendly'), whose only
# new word is 'míchairdiúil' and whose other pieces are taught by 35. Old pieces are deleted with their phrases and the new ones
# inserted at free indexes (4+), so the undo puts both seeds back exactly. 'my name | m'ainm' leaves the course (used nowhere else).
MOVE={166,300}
@fam('seed 166 moved to slot 300 (swap)',[166,300])
def move166():
    k166,t166=seedtxt(166); k300,t300=seedtxt(300)
    vu=[(E.P[k]['phrase_role'],E.cur[k][0],E.cur[k][1]) for k in E.under('S0166L03') if "m'ainm" not in E.cur[k][1] and E.cur[k][1].lower()!='an-neamhghnách']
    un=[(E.P[k]['phrase_role'],E.cur[k][0],E.cur[k][1]) for k in E.under('S0300L03')]
    for lid in ['S0166L01','S0166L02','S0166L03','S0300L01','S0300L02','S0300L03']: E.dellego(lid)
    # slot 166
    E.seed(166,t300,k300)
    E.newlego(166,4,"she doesn't want to",'ní mian léi',[('not a wish','ní mian'),('with her','léi')],is_new=False)
    E.newlego(166,5,'to be','a bheith',[('to','a'),('be','bheith')],is_new=False)
    a=E.newlego(166,6,'unfriendly','míchairdiúil',[])
    for r,kn,tg in un:
        if not re.search(r"an fear sin|ní dúirt|tá an fear\b",tg,re.I): E.add(a,r,kn,tg)
    E.many(a,[('b','to be unfriendly','a bheith míchairdiúil'),('u',"he doesn't want to be unfriendly with them",'ní mian leis a bheith míchairdiúil leo'),('u',k300,t300)])
    # slot 300
    E.seed(300,"Níl ainm an-neamhghnách orm","I don't have a very unusual name")
    # Kai 17 Nov 11:42Z: Eoghan's orm line, in the THREE steps of the ag/ar study (d/03eeff75): an unusual name -> a very unusual name ->
    # the orm sentence. No gapped LEGO (Kai), so the third step is the whole sentence, not 'níl … orm'. Step 1 is not literally in the
    # seed (the seed says an-neamhghnách); it is the ruled first step, whitelisted in the check below.
    n1=E.newlego(300,4,'an unusual name','ainm neamhghnách',[('a name','ainm'),('unusual','neamhghnách')])
    n2=E.newlego(300,5,'a very unusual name','ainm an-neamhghnách',[('a name','ainm'),('very unusual','an-neamhghnách')])
    n3=E.newlego(300,6,"I don't have a very unusual name",'níl ainm an-neamhghnách orm',[('is not','níl'),('a very unusual name','ainm an-neamhghnách'),('on me','orm')])
    E.many(n1,[('b','an unusual name','ainm neamhghnách'),('b',"it's an unusual name",'is ainm neamhghnách é'),('u',"I think that it's an unusual name",'ceapaim gur ainm neamhghnách é'),
               ('u',"that's an unusual name",'is ainm neamhghnách é sin')])
    E.many(n2,[('b','a very unusual name','ainm an-neamhghnách'),('b',"it's a very unusual name",'is ainm an-neamhghnách é'),('u',"I think that it's a very unusual name",'ceapaim gur ainm an-neamhghnách é'),
               ('u',"that's a very unusual name",'is ainm an-neamhghnách é sin')])
    E.many(n3,[('b',"I don't have a very unusual name",'níl ainm an-neamhghnách orm'),('u',"of course I don't have a very unusual name",'ar ndóigh níl ainm an-neamhghnách orm'),
               ('u',"unfortunately I don't have a very unusual name",'faraor níl ainm an-neamhghnách orm'),('u',"thank you, but I don't have a very unusual name",'go raibh maith agat, ach níl ainm an-neamhghnách orm')])
if __name__=='__main__':
    # ruled shapes the static check cannot see: stand-in "it" frames (L33: 45 new; 96, 207 from #253), Kai's 280 pieces, echo yes/no
    WL_LEGO={'S0045L03','S0096L04','S0207L03','S0250L03','S0280L04','S0280L05','S0300L04'}
    def ok(x):
        if x[0]=='CLASH' and x[1] in('yes','no'): return True
        if x[0]=='CLASH' and x[1]=="she doesn't want to": return True   # 300 marks it new today; at 166 it is not new
        if x[0]=='GAP' and x[1] in(45,96,207,250,280): return True
        if x[0]=='NOT IN SEED' and x[2] in WL_LEGO: return True
        if x[0]=='NO LEGO' and (x[1][:8] in WL_LEGO or x[1]=='S0100L06U02'): return True
        if x[0]=='DUP' and x[1] in('S0068L02','S0207L01'): return True       # pairs that are the same today
        return False
    seeds=sorted(SEEDS|set(E.ops))
    ops=[o for o in E.emit(seeds) if not (o['op'] in('seed.update','lego.update','phrase.update') and not o['set'])]
    ids=collections.Counter((o['op'],o.get('seed_number') if o['op']=='seed.update' else o.get('lego_id') or o.get('phrase_id') or (o.get('row') or {}).get('id') or json.dumps(o.get('row'),sort_keys=True)) for o in ops)
    assert not [k for k,v in ids.items() if v>1],[k for k,v in ids.items() if v>1][:5]
    cnt=collections.Counter(o['op'] for o in ops)
    print(len(ops),'ops',dict(cnt)); print('by family (ops incl. phrase rewordings):',dict(FAM))
    bad=[x for x in check(E,[n for n in seeds if n<=300]) if not ok(x)]
    for x in bad: print(*x)
    print(len(bad),'check lines')
    # cs #410·AI: the commit-time trigger DEBUT_WITHOUT_PRACTICE is not seen by the dry run — every surviving LEGO must keep >=1 phrase
    def lid_of(pid): return pid.split(':')[-1][:8]
    new={l['lego_id']:l['is_new'] for n,sd in S.items() for l in sd['legos']}
    for o in ops:
        if o['op']=='lego.update' and 'is_new' in o['set']: new[o['lego_id']]=o['set']['is_new']
        if o['op']=='lego.insert': new['S%04dL%02d'%(o['row']['seed_number'],o['row']['lego_index'])]=o['row'].get('is_new',True)
    alive={l for l,v in new.items() if v}-{o['lego_id'] for o in ops if o['op']=='lego.delete'}   # debut LEGOs only (the trigger's scope)
    # mirror of debut_is_practised (database/migrations/20260930_debut_practice_guard.sql): build/use row whose normalised target != the LEGO's
    def nrm(t): return re.sub(r'\s+',' ',re.sub(r'[.,!?;:¿¡«»"\']','',(t or '').lower())).strip()
    lt={l['lego_id']:l['target_text'] for n,sd in S.items() for l in sd['legos']}
    for o in ops:
        if o['op']=='lego.update' and 'target_text' in o['set']: lt[o['lego_id']]=o['set']['target_text']
        if o['op']=='lego.insert': lt['S%04dL%02d'%(o['row']['seed_number'],o['row']['lego_index'])]=o['row']['target_text']
    pt={p['id']:p['target_text'] for n,sd in S.items() for l in sd['legos'] for p in (l.get('basket_phrases') or []) if p['phrase_role'] in('build','use')}
    for o in ops:
        if o['op']=='phrase.delete': pt.pop(o['phrase_id'],None)
        if o['op']=='phrase.update' and 'target_text' in o['set'] and o['phrase_id'] in pt: pt[o['phrase_id']]=o['set']['target_text']
        if o['op']=='phrase.insert' and o['row']['phrase_role'] in('build','use'): pt[o['row']['id']]=o['row']['target_text']
    has=collections.Counter(lid_of(p) for p,t in pt.items() if nrm(t)!=nrm(lt.get(lid_of(p))))
    bare=sorted(l for l in alive if not has[l])
    print('LEGOs left without a phrase:',bare)
    # batches: cut at seed boundaries, <=1500 ops
    def seed_of(o): return o.get('seed_number') or (o.get('row') or {}).get('seed_number') or int((o.get('lego_id') or o.get('phrase_id').split(':')[1])[1:5])
    mv=[o for o in ops if seed_of(o) in MOVE]; ops=[o for o in ops if seed_of(o) not in MOVE]
    json.dump({'batch':'move-166','seeds':sorted(MOVE),'ops':mv},open('move-166.ops.json','w'),ensure_ascii=False,indent=0); print('move-166',len(mv),'ops')
    batches=[[]]
    last=None
    for o in ops:
        n=seed_of(o)
        if n!=last and len(batches[-1])>1300: batches.append([])
        batches[-1].append(o); last=n
    for f in os.listdir('.'):
        if re.match(r'batch-\d+\.ops\.json',f): os.remove(f)
    for i,b in enumerate(batches,1):
        json.dump({'batch':i,'seeds':sorted({seed_of(o) for o in b}),'ops':b},open(f'batch-{i}.ops.json','w'),ensure_ascii=False,indent=0)
        print('batch',i,len(b),'ops, seeds',seed_of(b[0]),'-',seed_of(b[-1]))
    json.dump({'families':FAM,'ops':dict(cnt),'total':len(ops)},open('totals.json','w'),indent=1)
