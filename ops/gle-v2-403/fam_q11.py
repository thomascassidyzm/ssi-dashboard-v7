# Q11 (Kai, 12 Nov): every "X speak(s) Irish" that states ABILITY takes the "have Irish" form (tá Gaeilge agat, daoine a bhfuil Gaeilge acu),
# course-wide. Rows where "speak" is the ACT of speaking (to speak Irish, speak Irish with me, when you speak, all day, every day, often,
# quickly) keep labhair and are listed in ACT for the record.
from lib import *
F='Q11 have Irish'
HAVE=lambda who,word: [{"known":"there is","target":"tá"},{"known":"Irish","target":"Gaeilge"},{"known":who,"target":word}]
REL=[{"known":"that","target":"a"},{"known":"is","target":"bhfuil"},{"known":"Irish","target":"Gaeilge"},{"known":"they have","target":"acu"}]
# --- seeds
seed(9,None,"Tá beagán Gaeilge agam anois",F,"Q11")
seed(13,None,"Tá Gaeilge an-mhaith agat",F,"Q11: Eoghan's sentence, our English")
seed(22,None,"mar is mian liom bualadh le daoine a bhfuil Gaeilge acu",F,"Q11: Eoghan's")
seed(283,None,"cé acu de do chairde a bhfuil Gaeilge acu?",F,"Q11: Eoghan left labhraíonn here; moved for consistency")
seed(285,None,"Tá Gaeilge aici",F,"Q11: the form Eoghan names in his note")
seed(297,None,"Níl aithne agam ar mhórán daoine a bhfuil Gaeilge acu",F,"Q11: Eoghan's second version, with daoine kept")
# --- LEGOs
lego('S0009L01',F,"Q11: first LEGO that teaches the form; carries the note literally, 'I have Irish'",known_text='I speak Irish',target_text='tá Gaeilge agam',type='M',components=HAVE('I have','agam'))
lego('S0013L02',F,'Q11',known_text='you speak Irish',target_text='tá Gaeilge agat',components=HAVE('you have','agat'))
INS_LEGO.append({"course_code":"gle_v2_for_eng","seed_number":13,"lego_index":3,"known_text":"you speak Irish very well","target_text":"tá Gaeilge an-mhaith agat","type":"M","is_new":True,"status":"draft","components":[{"known":"very good","target":"an-mhaith"}]})
lego('S0022L03',F,'Q11: was not-new with no practice; the new form needs teaching here',target_text='a bhfuil Gaeilge acu',is_new=True,components=REL)
lego('S0283L03',F,'Q11',target_text='a bhfuil Gaeilge acu',components=REL)
lego('S0285L01',F,'Q11',target_text='tá Gaeilge aici',components=HAVE('she has','aici'))
lego('S0297L04',F,'Q11: the seed no longer has a labhraíonn',known_text='who speak Irish',target_text='a bhfuil Gaeilge acu',components=REL)
# --- baskets rewritten whole
basket('S0009L01',[
 ('build',"I speak Irish","tá Gaeilge agam"),
 ('build',"I speak Irish now","tá Gaeilge agam anois"),
 ('build',"I speak Irish and I want to speak","tá Gaeilge agam agus is mian liom labhairt"),
 ('use',"I speak Irish and I want to speak with you now","tá Gaeilge agam agus is mian liom labhairt leat anois"),
 ('use',"I speak Irish and I'm trying to learn","tá Gaeilge agam agus tá mé ag iarraidh foghlaim"),
 ('use',"I speak Irish now and I'm trying to remember","tá Gaeilge agam anois agus tá mé ag iarraidh cuimhneamh"),
 ('use',"I speak Irish and I'm going to practise speaking with someone else","tá Gaeilge agam agus tá mé chun labhairt a chleachtadh le duine éigin eile"),
],F,'Q11')
upd('S0009L02B03',"I speak a little Irish","tá beagán Gaeilge agam",F,'Q11')
upd('S0009L02U01',"I speak a little Irish now","Tá beagán Gaeilge agam anois",F,'Q11: the seed sentence')
upd('S0009L02U02',"I speak a little Irish and I want to speak with you","tá beagán Gaeilge agam agus is mian liom labhairt leat",F,'Q11')
upd('S0009L02U03',"I speak a little Irish and I'm trying to learn","tá beagán Gaeilge agam agus tá mé ag iarraidh foghlaim",F,'Q11')
upd('S0009L02U04',"I want to speak a little with someone else","is mian liom labhairt beagán le duine éigin eile",F,'Q11: labhraím is no longer taught; act of speaking kept with the taught infinitive')
basket('S0013L02',[
 ('build',"you speak Irish","tá Gaeilge agat"),
 ('build',"you speak Irish now","tá Gaeilge agat anois"),
 ('build',"and you speak Irish","agus tá Gaeilge agat"),
 ('build',"you speak Irish and I speak a little Irish","tá Gaeilge agat agus tá beagán Gaeilge agam"),
 ('use',"you speak Irish and I'd like to speak with you","tá Gaeilge agat agus ba mhaith liom labhairt leat"),
 ('use',"you speak Irish and I'm trying to learn","tá Gaeilge agat agus tá mé ag iarraidh foghlaim"),
 ('use',"you speak Irish and I want to practise with you","tá Gaeilge agat agus is mian liom a chleachtadh leat"),
 ('use',"you speak Irish now and I'd like to be able to speak","tá Gaeilge agat anois agus ba mhaith liom a bheith ábalta labhairt"),
 ('use',"you speak Irish and I'd like to practise speaking with you","tá Gaeilge agat agus ba mhaith liom labhairt a chleachtadh leat"),
 ('use',"you speak Irish and I want to speak Irish with you now","tá Gaeilge agat agus is mian liom Gaeilge a labhairt leat anois"),
],F,'Q11')
for role,kn,tg in [
 ('build',"you speak Irish very well","tá Gaeilge an-mhaith agat"),
 ('build',"you speak Irish very well now","tá Gaeilge an-mhaith agat anois"),
 ('build',"and you speak Irish very well","agus tá Gaeilge an-mhaith agat"),
 ('use',"you speak Irish very well and I'd like to speak with you","tá Gaeilge an-mhaith agat agus ba mhaith liom labhairt leat"),
 ('use',"I speak a little Irish and you speak Irish very well","tá beagán Gaeilge agam agus tá Gaeilge an-mhaith agat"),
 ('use',"you speak Irish very well and I'd like to practise with you","tá Gaeilge an-mhaith agat agus ba mhaith liom a chleachtadh leat"),
 ('use',"you speak Irish very well and I want to speak Irish with you","tá Gaeilge an-mhaith agat agus is mian liom Gaeilge a labhairt leat"),
 ('use',"you speak Irish very well and I'd like to be able to speak very well","tá Gaeilge an-mhaith agat agus ba mhaith liom a bheith ábalta labhairt go han-mhaith"),
]: ins('S0013L03',role,kn,tg,F,'Q11: new LEGO for the whole seed sentence')
dele('S0013L01U01',F,"Q11: the old seed sentence; 'very well | go han-mhaith' keeps its other 17 rows")
dele('S0013L01U08',F,"Q11: used labhraíonn tú, which is now first taught at seed 14")
dele('S0014L01U01',F,"Q11: used labhraíonn tú before its LEGO (S0014L02)")
upd('S0014L02B02',"do you speak Irish with someone else?","an labhraíonn tú Gaeilge le duine éigin eile?",F,"Q11: 'do you speak Irish very well?' is ability; this LEGO keeps the act of speaking")
for role,kn,tg in [
 ('build',"who speak Irish","a bhfuil Gaeilge acu"),
 ('build',"people who speak Irish","daoine a bhfuil Gaeilge acu"),
 ('build',"to meet people who speak Irish","bualadh le daoine a bhfuil Gaeilge acu"),
 ('use',"because I want to meet people who speak Irish","mar is mian liom bualadh le daoine a bhfuil Gaeilge acu"),
 ('use',"I'd like to meet people who speak Irish","ba mhaith liom bualadh le daoine a bhfuil Gaeilge acu"),
 ('use',"I want to speak with people who speak Irish","is mian liom labhairt le daoine a bhfuil Gaeilge acu"),
 ('use',"I'm going to meet people who speak Irish","tá mé chun bualadh le daoine a bhfuil Gaeilge acu"),
 ('use',"I'd like to practise speaking with people who speak Irish","ba mhaith liom labhairt a chleachtadh le daoine a bhfuil Gaeilge acu"),
]: ins('S0022L03',role,kn,tg,F,'Q11: practice for the newly taught piece')
basket('S0285L01',[
 ('build',"she speaks Irish","tá Gaeilge aici"),
 ('build',"she speaks Irish now","tá Gaeilge aici anois"),
 ('build',"of course she speaks Irish","ar ndóigh tá Gaeilge aici"),
 ('build',"but she speaks Irish","ach tá Gaeilge aici"),
 ('use',"that's not a problem she speaks Irish","ní fadhb é sin tá Gaeilge aici"),
 ('use',"of course she speaks Irish now","ar ndóigh tá Gaeilge aici anois"),
 ('use',"I don't know but she speaks Irish","níl a fhios agam ach tá Gaeilge aici"),
 ('use',"she speaks Irish and she wants to meet your brother","tá Gaeilge aici agus is mian léi bualadh le do dheartháir"),
 ('use',"she speaks Irish and she wants to speak Irish with them at work","tá Gaeilge aici agus is mian léi Gaeilge a labhairt leo ag an obair"),
 ('use',"she speaks Irish now and I am happy","tá Gaeilge aici anois agus tá mé sásta"),
],F,'Q11')
basket('S0297L04',[
 ('build',"your friends who speak Irish","do chairde a bhfuil Gaeilge acu"),
 ('build',"a few friends who speak Irish","cúpla cara a bhfuil Gaeilge acu"),
 ('build',"most people who speak Irish","formhór na ndaoine a bhfuil Gaeilge acu"),
 ('build',"many people who speak Irish","mórán daoine a bhfuil Gaeilge acu"),
 ('use',"I saw your friends who speak Irish","chonaic mé do chairde a bhfuil Gaeilge acu"),
 ('use',"how many people do you know who speak Irish","cé mhéad duine a bhfuil aithne agat orthu a bhfuil Gaeilge acu"),
 ('use',"I met a few friends who speak Irish","bhuail mé le cúpla cara a bhfuil Gaeilge acu"),
 ('use',"I don't know your friends who speak Irish","níl aithne agam ar do chairde a bhfuil Gaeilge acu"),
 ('use',"I don't know many people who speak Irish","níl aithne agam ar mhórán daoine a bhfuil Gaeilge acu"),
],F,'Q11')
# --- rows under 'well | go maith' (S0055L04): the row must keep go maith, so the ability rows become 'to speak Irish well'
upd('S0055L04B03',"to speak Irish well","Gaeilge a labhairt go maith",F,"Q11: 'do you speak Irish well?' is ability and cannot carry go maith")
upd('S0055L04U02',"when other people are here I want to speak Irish well","nuair atá daoine eile anseo is mian liom Gaeilge a labhairt go maith",F,'Q11')
upd('S0055L04U05',"I do not enjoy making mistakes but I want to speak Irish well now","ní bhainim taitneamh as botúin a dhéanamh ach is mian liom Gaeilge a labhairt go maith anois",F,'Q11')
dele('S0055L04U06',F,"Q11: 'people who speak Irish well' cannot carry go maith in the new form")
dele('S0087L03U04',F,"Q11: 'you speak Irish better than they' has no safe have-Irish wording with iad")
# --- act rows that used labhraím (no longer taught): moved to 'we'
upd('S0114L03U03',"I feel as if I am doing something useful when we speak Irish","mothaím go bhfuil mé ag déanamh rud úsáideach nuair a labhraíonn muid Gaeilge",F,"Q11: act of speaking kept; labhraím is no longer taught")
upd('S0114L06U12',"I feel as if I am thinking more quickly than yesterday when we speak","mothaím go bhfuil mé ag smaoineamh níos tapa ná inné nuair a labhraíonn muid",F,"Q11: act of speaking kept; labhraím is no longer taught")
upd('S0283L03B01',"who speak Irish","a bhfuil Gaeilge acu",F,"Q11: 'at work' dropped, it only fits the act of speaking")
dele('S0042L01U06',F,"Q11: 'I speak a little Irish better than yesterday' has no sensible have-Irish wording")
upd('S0014L02U04',"do you speak Irish all day today?","an labhraíonn tú Gaeilge an lá ar fad inniu?",F,"Q11: 'very well' taken out; this LEGO keeps the act of speaking")
upd('S0015L05U05',None,"tá beagán Gaeilge agam anois agus is mian liom go labhrófá liom",F,'Q11')
upd('S0042L04U06',"I want to speak Irish better than last night","is mian liom Gaeilge a labhairt níos fearr ná aréir",F,"Q11: the row must keep 'níos fearr ná' whole, so it becomes the act of speaking")
upd('S0071L04B01',"to anyone here","d'aon duine anseo",F,"Q11: 'anyone who speaks Irish' needs aige, not taught until 105")
upd('S0071L04U03',"I know how to read the whole sentence to anyone","tá a fhios agam conas an abairt iomlán a léamh d'aon duine",F,"Q11: as above")
dele('S0071L04U05',F,"Q11: 'anyone who speaks Irish' needs aige, not taught until 105")
upd('S0094L01U02',"this is your friend and he wants to speak Irish","is é seo do chara agus is mian leis Gaeilge a labhairt",F,"Q11: 'who speaks Irish' needs aige, not taught until 105")
upd('S0103L05U01',"I'd like to practise speaking with other people who speak Irish well","ba mhaith liom labhairt a chleachtadh le daoine eile a bhfuil Gaeilge mhaith acu",F,"Q11: plural, because aige is not taught until 105")
ins('S0283L03','use',"which of your friends speak Irish?","cé acu de do chairde a bhfuil Gaeilge acu?",F,'Q11: the seed sentence, so it is in a played basket')
upd('S0264L01U05',None,"tá Gaeilge an-mhaith ag an seanfhear sin",F,'Q11')
# --- act of speaking: kept on labhair, listed for Kai
ACT={'S0085L01U03':'speak Irish quickly (manner)','S0125L01U14':'speak Irish with you','S0127L02U15':'speak Irish with me','S0133L01U01':'when you speak Irish',
 'S0141L04U05':'when speaking Irish','S0160L02U11':'when I am speaking Irish','S0137L03B04':'speak Irish often in the pub','S0137L03U01':'speak Irish often in the pub',
 'S0232L02U10':'speaks Irish every day','S0233L04U05':'speaks Irish every day','S0233L05U03':'speaks Irish every day','S0234L05U08':'speaks Irish every day','S0184L02U07':'I spoke Irish a while ago'}
# --- everything else: literal conversion, every result printed and read
QUAL={' go han-mhaith':' an-mhaith',' go maith':' mhaith',None:'','':''}
PRON=[(r"(daoine|ndaoine|chairde|cara|mhórán|orthu|duine)$",'acu')]
def conv(t):
    t=re.sub(r"labhraím (beagán )?[Gg]aeilge( níos fearr)?",lambda m:f"tá {m.group(1) or ''}Gaeilge{m.group(2) or ''} agam",t)
    def rel(m):
        ant=m.group(1); q=QUAL[m.group(3)]
        last=ant.split()[-1].lower()
        if re.search(r"cé mhéad duine$",ant) or last in('daoine','ndaoine','chairde','cara','mhórán','orthu'): p='acu'
        elif last in('seanbean','dheirfiúr'): p='aici'
        else: p='aige'
        return f"{ant} a bhfuil Gaeilge{q} {p}"
    t=re.sub(r"((?:cé mhéad )?[\w'’-]+(?: éigin eile| ar bith anseo| ar bith| sin| an-chineálta| le m'athair| a oibríonn anseo agus)?) a labhraíonn [Gg]aeilge( go han-mhaith| go maith)?".replace('( go','(( go').replace('maith)?','maith))?'),rel,t)
    return t
DONE=set(PH)|set(ACT)
for k,r in sorted(R.items()):
    if k in DONE or r['phrase_role']=='component' or r['lego'] in('S0009L01','S0013L02','S0285L01','S0297L04','S0014L02','S0015L03','S0015L05'): continue
    if not re.search(r"labhraím|labhraíonn",r['target_text']): continue
    n=conv(r['target_text'])
    if n!=r['target_text']: PH[k]=('upd',r['known_text'],n,F,'Q11')
KEPT=sorted(k for k,r in R.items() if r['phrase_role']!='component' and k not in PH and re.search(r"labhraím|labhraíonn",r['target_text']))
STALE=[r"a labhraíonn [Gg]aeilge(?! (go tapa|an lá ar fad|go minic|leat|liom))",r"labhraím\b",r"labhraíonn (tú|sí|sé) [Gg]aeilge(?! (go minic|le |an lá|chomh|amárach))"]
if __name__=='__main__':
    show(F); print('\nKEPT on labhair (finite):')
    for k in KEPT: print(' ',k,'|',R[k]['known_text'],'|',R[k]['target_text'])
