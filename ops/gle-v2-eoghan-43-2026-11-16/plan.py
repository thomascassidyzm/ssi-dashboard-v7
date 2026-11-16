# cs #343·AI: Eoghan's line taken on the 43 "no reason recorded" seeds of gle_v2_for_eng (Kai, 16 Nov: "With no reason
# recorded I'd take his every time and then find all the clashes and other issues they cause").
# Where his wording collides with a choice the whole course already makes (want = 'is mian', 'tá mé'/'tá muid', after
# want the conditional, 'practise speaking' = 'labhairt a chleachtadh'), the clash is fixed by L34's first remedy: unify on
# the course's form; everything else is his. Usage: python3 plan.py <live seeds.json> <batch> -> batch-<batch>.ops.json
import sys,json,re
from ed import Ed
from check import check
from lib import syl
E=Ed(sys.argv[1]); B=sys.argv[2]
def in_seed(*ns): return lambda p: p['seed'] in ns

def s7():
    E.seed(7,"Is mian liom m'iarracht is fearr a dhéanamh inniu")
    E.lego('S0007L03',target_text="m'iarracht is fearr a dhéanamh",components=[{'known':'my attempt','target':"m'iarracht"},{'known':'best','target':'is fearr'},{'known':'to do','target':'a dhéanamh'}])
    E.sub(r"\bmo dhícheall a dhéanamh","m'iarracht is fearr a dhéanamh")
    E.set('S0044L03U03',known='if I need to improve, I want to try my best',target="má chaithfidh mé feabhsú, is mian liom m'iarracht is fearr a dhéanamh")
def s36():
    E.seed(36,"Ní mian linn briseadh isteach ar an scéal")     # his 'Níl fonn orainn' unified on 'Ní mian linn' (want = mian, from 1)
    E.lego('S0036L03',target_text='briseadh isteach ar',components=[{'known':'breaking','target':'briseadh'},{'known':'in','target':'isteach'},{'known':'on','target':'ar'}])
    E.sub(r"\bcur isteach\b","briseadh isteach")
def s38():
    E.seed(38,"Tá mé ag foghlaim thart ar sheachtain")
    E.lego('S0038L04',target_text='thart ar sheachtain',components=[{'known':'about','target':'thart ar'},{'known':'a week','target':'sheachtain'}])
    E.dellego('S0038L05')          # 'for about a week | le timpeall seachtaine': his line has no 'le'
    E.sub(r"\b(le )?timpeall seachtaine","thart ar sheachtain")
    E.delp('S0038L04B03')          # 'for about a week' now the same Irish as B01
def s247():
    E.seed(247,"cheap mé go raibh an leabhar sin cuíosach maith")   # his line without 'sin'; 'sin' kept for 'that book' (both his English and ours)
    E.lego('S0247L04',target_text='cuíosach'); E.lego('S0247L05',target_text='cuíosach maith',components=[{'known':'fairly','target':'cuíosach'},{'known':'good','target':'maith'}])
    E.sub(r"\bréasúnta\b","cuíosach")
    E.set('S0247L03U01',known='I thought that book was interesting',target='cheap mé go raibh an leabhar sin suimiúil')   # was the seed sentence, which uses 'cuíosach' (taught after L03); L05 already carries it
def s61():
    E.seed(61,"an bhféadfá é sin a rá arís, ach beagán níos moille?")
    l=E.newlego(61,7,'again a little more slowly','arís, ach beagán níos moille',[('again','arís'),('but','ach'),('a little more slowly','beagán níos moille')])
    E.sub(r"\barís beagán níos moille","arís, ach beagán níos moille")
    for k in ['S0061L04U01','S0061L04U06','S0061L06U15','S0061L06U01']: E.move(k,l)
    E.delp('S0061L04B03'); E.delp('S0061L06B04')   # the same sentence as L04U01
    E.add(l,'build','again a little more slowly','arís, ach beagán níos moille')
def s69():
    E.seed(69,"Níor mhian leis aire a thabhairt don mhadra óg um thráthnóna ar fad")   # 'um tráthnóna' spelt with the lenition 'um' takes
    E.dellego('S0069L05')          # 'the afternoon | an tráthnóna' is no longer in the seed; its 'this afternoon' phrases go with it
    l=E.newlego(69,7,'all afternoon','um thráthnóna ar fad',[('in the afternoon','um thráthnóna'),('all','ar fad')])
    E.sub(r"\ban tráthnóna ar fad","um thráthnóna ar fad")
    E.add(l,'build','all afternoon','um thráthnóna ar fad')
    for k in ['S0069L06B02','S0069L06U01','S0069L06U02','S0069L06U03','S0069L04U01']: E.move(k,l)
    E.delp('S0069L06B01')          # bare 'all afternoon', now the LEGO itself
    E.add(l,'use',E.S[69]['known_text'],"Níor mhian leis aire a thabhairt don mhadra óg um thráthnóna ar fad")
def s77():
    E.seed(77,"Cuireann sé ionadh orm cé chomh tapa is atá tuiscint á fáil agam air")   # 'tapaidh' spelt 'tapa' as from 20
    E.lego('S0077L01',known_text="I'm surprised",target_text='Cuireann sé ionadh orm',components=[{'known':'it puts','target':'cuireann sé'},{'known':'surprise','target':'ionadh'},{'known':'on me','target':'orm'}])
    E.sub(r"\btá ionadh orm\b","cuireann sé ionadh orm")
def s102():
    E.seed(102,"Tá muid ag iarraidh a rá nach mar sin atá sé")     # his 'Táímid' in the course's 'tá muid'
    E.dellego('S0102L04')          # 'that it is not | nach bhfuil sé' is no longer in the seed
    l=E.newlego(102,6,"that it's not like that",'nach mar sin atá sé',[('that not','nach'),('like that','mar sin'),('it is','atá sé')])
    for kn,tg,r in [("that it's not like that",'nach mar sin atá sé','build'),("I think that it's not like that",'ceapaim nach mar sin atá sé','build'),
                    ("I know that it's not like that",'Tá a fhios agam nach mar sin atá sé','use'),("he said that it's not like that",'dúirt sé nach mar sin atá sé','use'),
                    (E.S[102]['known_text'],'Tá muid ag iarraidh a rá nach mar sin atá sé','use')]: E.add(l,r,kn,tg)
def s142():
    E.seed(142,"Is an-chineálta atá tú agus tá mé an-bhuíoch díot as do chabhair")   # his 'táim' in the course's 'tá mé'
    E.dellego('S0142L01'); E.dellego('S0142L03')
    E.lego('S0142L05',known_text="I'm very grateful to you",target_text='tá mé an-bhuíoch díot',components=[{'known':'I am','target':'tá mé'},{'known':'very grateful','target':'an-bhuíoch'},{'known':'to you','target':'díot'}])
    E.lego('S0142L07',target_text='as do chabhair',components=[{'known':'for','target':'as'},{'known':'your help','target':'do chabhair'}])
    E.sub(r"\btá mé buíoch díot","tá mé an-bhuíoch díot",r"\bI a?'?m grateful to you|\bI am grateful to you","I'm very grateful to you")
    E.sub(r"\bas cabhrú\b(?! liom)","as do chabhair",only=lambda p:p['seed']>=142)   # 'as cabhrú liom' (for helping me, 74) is another phrase
    E.set('S0142L07B03',known='very grateful for helping',target='an-bhuíoch as do chabhair')
    l=E.newlego(142,8,"that's very kind of you",'is an-chineálta atá tú',[('is','is'),('very kind','an-chineálta'),('that you are','atá tú')])
    for kn,tg,r in [("that's very kind of you",'is an-chineálta atá tú','build'),("thank you very much, that's very kind of you",'go raibh míle maith agat, is an-chineálta atá tú','build'),
                    ("that's very kind of you and I'm very grateful to you",'is an-chineálta atá tú agus tá mé an-bhuíoch díot','use'),
                    (E.S[142]['known_text'],"Is an-chineálta atá tú agus tá mé an-bhuíoch díot as do chabhair",'use')]: E.add(l,r,kn,tg)
def s147():
    E.seed(147,"B'an-chineálta a bhí sí nuair a thug sí faoi deara go raibh faitíos orm")   # 'Ba an-' written b' before the vowel
    E.dellego('S0147L01')
    E.lego('S0147L03',known_text='that I was nervous',target_text='go raibh faitíos orm',type='M',components=[{'known':'that I was','target':'go raibh'},{'known':'fear','target':'faitíos'},{'known':'on me','target':'orm'}])
    E.lego('S0147L04',known_text='when she noticed',target_text='nuair a thug sí faoi deara',components=[{'known':'when','target':'nuair a'},{'known':'she gave','target':'thug sí'},{'known':'notice','target':'faoi deara'}])
    E.sub(r"nuair a chonaic sí go raibh mé neirbhíseach","nuair a thug sí faoi deara go raibh faitíos orm",r"when she saw that I was nervous","when she noticed that I was nervous")
    for k in ['S0147L03B02','S0147L03U05','S0147L03U02','S0147L03U03','S0147L03U04','S0147L03U01','S0147L03U06']: E.delp(k)
    E.set('S0147L03B01',known='that I was nervous',target='go raibh faitíos orm')
    l3='S0147L03'
    E.add(l3,'build','he said that I was nervous','dúirt sé go raibh faitíos orm')
    E.add(l3,'use',"I didn't know that I was nervous",'ní raibh a fhios agam go raibh faitíos orm')
    # 'nervous' after 147 still said 'neirbhíseach' (148, 228): those phrases say 'tired' instead, so 'nervous' keeps one answer
    # 'nervous' after 147 said 'neirbhíseach': it now takes the 'faitíos ar' form; where a phrase must keep its LEGO's words
    # (228 'tá an fear sin', 222 'tá sé', 236 'go raibh sí', 270 'go mbeidh mé', 300) it says 'tired' instead, so 'nervous' keeps one answer
    E.set('S0191L02U05',target='ní raibh faitíos orm ar chor ar bith')
    E.set('S0202L02U10',known='it was always difficult to know how to answer the question when I was nervous',target='bhí sé deacair a fhios a bheith agam conas an cheist a fhreagairt nuair a bhí faitíos orm')
    E.sub(r"\bneirbhíseach\b","tuirseach",r"\bnervous\b","tired",only=lambda p:p['seed']!=147 and p['id'].split(':')[1] in('S0228L01B04','S0228L01U03','S0300L03U06','S0222L01U07','S0236L04B04','S0236L04U04','S0270L03U06'))
    l=E.newlego(147,5,'she was very kind',"b'an-chineálta a bhí sí",[('was',"b'"),('very kind','an-chineálta'),('that she was','a bhí sí')])
    E.add(l,'build','she was very kind',"b'an-chineálta a bhí sí")
    E.add(l,'build','she was very kind last night',"b'an-chineálta a bhí sí aréir")
    E.set('S0147L04U01',known=E.S[147]['known_text'],target="B'an-chineálta a bhí sí nuair a thug sí faoi deara go raibh faitíos orm"); E.move('S0147L04U01',l)
def s148():
    E.seed(148,"Ní rófhoighneach a bhí sé liom nuair nárbh fhéidir liom freagra a thabhairt dó")   # 'ró-fhoighneach' solid; 'thahairt' slip
    E.dellego('S0148L01')          # 'he wasn't | Ní raibh sé' is no longer in the seed
    E.lego('S0148L02',known_text='not very patient',target_text='ní rófhoighneach',components=[{'known':'not','target':'ní'},{'known':'too patient','target':'rófhoighneach'}])
    for k in [k for k,p in E.P.items() if p['lego']=='S0148L02' and p['phrase_role']!='component']: E.delp(k)
    for kn,tg,r in [('not very patient','ní rófhoighneach','build'),("she wasn't very patient",'ní rófhoighneach a bhí sí','build'),("you weren't very patient with me",'ní rófhoighneach a bhí tú liom','use')]: E.add('S0148L02',r,kn,tg)
    E.lego('S0148L03',target_text='nuair nárbh fhéidir liom',components=[{'known':'when','target':'nuair'},{'known':"it wasn't possible",'target':'nárbh fhéidir'},{'known':'with me','target':'liom'}])
    E.sub(r"\bnuair nach raibh mé in ann\b","nuair nárbh fhéidir liom")
    E.sub(r"\ban-fhoighneach\b","an-chineálta",r"\bvery patient\b","very kind",only=lambda p:p['seed']!=148)   # 'an-fhoighneach' is no longer taught at 148
    E.set('S0148L04U06',target="Ní rófhoighneach a bhí sé liom nuair nárbh fhéidir liom freagra a thabhairt dó")
    l=E.newlego(148,5,"he wasn't very patient with me",'ní rófhoighneach a bhí sé liom',[("not very patient",'ní rófhoighneach'),('that he was','a bhí sé'),('with me','liom')])
    E.move('S0148L04U06',l)
    E.add(l,'build',"he wasn't very patient with me",'ní rófhoighneach a bhí sé liom')
    E.add(l,'use',"he wasn't very patient with me last night",'ní rófhoighneach a bhí sé liom aréir')
def s159():
    E.seed(159,"Ní hé sin an rud atá mé ag iarraidh a rá leat")    # his 'atáim' in the course's 'atá mé'
    # after 'ní hé sin' Irish says 'an rud', where 'what' is 'cad' elsewhere: taught inside 'Ní hé sin an rud' (L34)
    l=E.newlego(159,4,"that isn't what",'Ní hé sin an rud',[("that isn't",'Ní hé sin'),('the thing','an rud')])
    hit=E.sub(r"\bní hé sin (atá|cad a)","Ní hé sin an rud \\1".replace('\\1',r'\1'))
    for k in hit: E.set(k,target=E.cur[k][1].replace('an rud cad a','an rud a'))
    for k in hit:
        if E.P[k]['seed']==159: E.move(k,l)
    E.add(l,'build',"that isn't what",'Ní hé sin an rud')
def s166():
    E.seed(166,"Níl ainm an-neamhghnách orm")
    E.dellego('S0166L01'); E.dellego('S0166L02')
    l=E.newlego(166,4,'my name is not very unusual','níl ainm an-neamhghnách orm',[('is not','níl'),('name','ainm'),('very unusual','an-neamhghnách'),('on me','orm')])
    E.delp('S0166L03B04')
    for kn,tg,r in [('my name is not very unusual','níl ainm an-neamhghnách orm','build'),('of course my name is not very unusual','ar ndóigh níl ainm an-neamhghnách orm','build'),
                    ('thank you but my name is not very unusual','go raibh maith agat ach níl ainm an-neamhghnách orm','use'),('unfortunately my name is not very unusual','faraor níl ainm an-neamhghnách orm','use')]: E.add(l,r,kn,tg)
def s178():
    E.seed(178,"Ní raibh an t-am agam, in ainneoin gur mhian liom tú a fheiceáil")   # his 'go raibh mé ag iarraidh' unified on 'mian'
    E.lego('S0178L01',target_text='ní raibh an t-am agam',components=[{'known':'not was','target':'ní raibh'},{'known':'the time','target':'an t-am'},{'known':'at me','target':'agam'}])
    E.sub(r"\b(raibh|níl|bhfuil|tá) am agam\b",r"\1 an t-am agam")
    E.lego('S0178L02',target_text='in ainneoin gur mhian liom',components=[{'known':'in spite','target':'in ainneoin'},{'known':'that I wanted','target':'gur mhian liom'}])
    E.sub(r"\bcé gur mhian liom","in ainneoin gur mhian liom")
    E.set('S0093L02U12',known=re.sub(r'\balthough\b','even though',E.cur['S0093L02U12'][0]))   # 'although' is 'in ainneoin' from 178; 93 keeps 'cé go' as 'even though' (159, 160)
def s228():
    E.seed(228,"Tá an fear sin díreach tar éis tosú ar labhairt a chleachtadh")   # his 'tosú ar … a chleachtadh' with 'labhairt', as 'practise speaking' is said from 5
    E.lego('S0228L04',known_text='to start to practise speaking',target_text='tosú ar labhairt a chleachtadh',components=[{'known':'to start','target':'tosú'},{'known':'on','target':'ar'},{'known':'to practise speaking','target':'labhairt a chleachtadh'}])
    for k in [k for k,p in E.P.items() if p['lego']=='S0228L04' and p['phrase_role']!='component']: E.delp(k)
    for kn,tg,r in [('to start to practise speaking','tosú ar labhairt a chleachtadh','build'),("I'd like to start to practise speaking",'ba mhaith liom tosú ar labhairt a chleachtadh','build'),
                    ("I'd like to be able to start to practise speaking",'ba mhaith liom a bheith in ann tosú ar labhairt a chleachtadh','use'),
                    ("I'm going to start to practise speaking",'tá mé chun tosú ar labhairt a chleachtadh','use'),
                    (E.S[228]['known_text'],'Tá an fear sin díreach tar éis tosú ar labhairt a chleachtadh','use')]: E.add('S0228L04',r,kn,tg)
GT={304:"ceapaim nach mian léi go mbeadh sí ag obair ón mbaile",   # 'go mbeidh' in the conditional the course uses after want
 332:"is féidir leis saol nua a chur ar bun dá dheirfiúr",
 335:"ceapaim gur féidir leis smaointe tairbheacha a chur leis",
 356:"bhí, bhí rud éigin tábhachtach le plé acu",
 357:"Ní raibh, ní raibh ann ach gur mhian léi teachtaireacht a sheoladh chuici",
 374:"Chonaic, cheap mé go raibh sé go hálainn",
 378:"Ní dheachaigh, ní raibh dóthain airgid agam i leith laethanta saoire",
 411:"ba mhaith linn bord i leith ceathrar a chur in áirithe don oíche anocht",
 415:"Ní bheadh fadhb ar bith leis sin, dar liom",
 423:"an gcaithfidh siad ceist atá chomh ríshoiléir sin a chur?",       # 'ríiléir' slip
 454:"tháinig ár gcairde anseo thart ar a sé a chlog",                 # 'anseol' slip
 460:"Is mian liom siopa atá gar don teach ósta a aimsiú",
 461:"siopa inar féidir liom roinnt cártaí poist a cheannach",
 481:"Is é an fíordhóchas amháin atá fágtha againn",
 483:"Níl an saol éasca ach níl sé amuigh air go bhfuil sé éasca",
 489:"mura ndéanann tú cupán de chaife láidir dom láithreach bonn",    # 'de caife', 'aláithreach' slips
 490:"Dá bharr sin, ní bheidh muinín agam as aon duine go deo arís",
 492:"cé acu de na háiteanna sin atá ina áit is suimiúla duit?",        # 'siúmúla' slip
 496:"Níl mé ag beartú go gcailleoidh mé nuair atá fíorthábhacht ag baint leis",   # 'Nílím' in the course's 'níl mé'
 498:"Tá sé ina sheasamh thall ina aonar laistigh den tslí isteach",
 501:"Mura mbeadh ann ach go bhféadfainn muinín a bheith as sibh a bheith in ann imirt le chéile gan argóint",
 542:"gach uair a mhothaíonn tú feargach",
 601:"bhí muid ag caint faoi conas a thosaigh an rud ar fad",
 614:"Tá sé in aice le cá bhfuil do chlann ina gcónaí"}
def late():
    for n,t in GT.items(): E.seed(n,t)
BATCH={'A':[s7,s36,s38,s247],'B':[s61,s69,s77,s102],'C':[s142,s147,s148],'D':[s159,s166,s178,s228],'E':[late]}
SEEDS={'A':[7,36,38,247],'B':[61,69,77,102],'C':[142,147,148],'D':[159,166,178,228],'E':sorted(GT)}
for f in BATCH[B]: f()
ops=E.emit(SEEDS[B])
json.dump({'batch':B,'seeds':SEEDS[B],'ops':ops},open(f'batch-{B}.ops.json','w'),ensure_ascii=False,indent=0)
import collections; print(B,len(ops),'ops',dict(collections.Counter(o['op'] for o in ops)))
for x in check(E,SEEDS[B]): print(*x)
