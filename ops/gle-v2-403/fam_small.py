# Kai's 12 Nov rulings, the small seeds: Q1 (107, 174), Q2 (281, 494, 533), Q4 (384), Q5 (390), Q6 (399), Q7 (154 + every 'oíche Dé Sathairn'), Q8 (150).
# Kept as they are, by ruling: 456 (Q3), 53 (Q9), 139 (Q10), 112 (Q12), taitin (Q13), 433/434 (Q15).
from lib import *
# Q1: 'what X was doing/saying' takes Eoghan's á ... agat/agam form. The hope frame (ag súil le) and 'cad a' are not part of the ruling and stay.
F='Q1 á…agat'
seed(107,None,"bhí muid ag súil le feiceáil cad a bhí á dhéanamh agat",F,"Q1")
seed(174,None,"an dtuigeann tú cad atá á rá agam?",F,"Q1: Eoghan's sentence")
sub('S0107L02U01',[(r'a bhí tú a dhéanamh','a bhí á dhéanamh agat')],F,'Q1')
sub('S0107L02U03',[(r'a bhí sé a dhéanamh','a bhí á dhéanamh aige')],F,'Q1')
sub('S0107L02U06',[(r'a bhí mé a dhéanamh','a bhí á dhéanamh agam')],F,'Q1')
upd('S0107L02U07',"we hoped to see what he was doing","bhí muid ag súil le feiceáil cad a bhí á dhéanamh aige",F,"Q1; 'she' made 'he' because aici is not taught until 132")
sub('S0108L02B01',[(r'a bhí tú a dhéanamh','a bhí á dhéanamh agat')],F,'Q1')
sub('S0174L01U01',[(r'atá mé a rá','atá á rá agam')],F,'Q1')
sub('S0245L02U04',[(r'atá mé a thabhairt','atá á thabhairt agam')],F,'Q1: same construction')
# Q2: future after 'before' and for future time; English kept.
F='Q2 future'
seed(281,None,"an miste leat má chríochnaím mo chaife sula dtosóidh tú?",F,"Q2: Eoghan's future")
seed(494,None,"cad a tharlóidh tar éis an chéad chuid den seó?",F,"Q2")
seed(533,None,"Ní éistfidh sí le gach focal a déarfaidh tú",F,"Q2")
lego('S0281L04',F,'Q2',target_text='sula dtosóidh tú',components=[{"known":"before","target":"sula"},{"known":"you will start","target":"dtosóidh tú"}])
for k,r in R.items():
    if 'sula dtosaíonn tú' in r['target_text']: sub(k,[(r'sula dtosaíonn tú','sula dtosóidh tú')],F,'Q2')
# Q4, Q5, Q6: one line each (seeds past 300, no LEGOs or phrases)
seed(384,None,"Ní fhéadfainn aontú leis an méid a dúirt sé bomaite ó shin",'Q4 bomaite',"Q4")
seed(390,None,"an té atá ina sheasamh in aice leis an mbealach isteach",'Q5 an té',"Q5")
seed(399,None,"Ní mian linn ár misneach a chailleadh",'Q6 misneach',"Q6: his ár misneach, our Ní mian linn")
# Q7: leat and mian kept; 'Dé' dropped: oíche Shathairn, in every row of the course so 'Saturday night' has one form.
F='Q7 oíche Shathairn'
SAT=[(r'oíche [Dd]é [Ss]athairn','oíche Shathairn')]
for n in (154,215): seed(n,None,re.sub(SAT[0][0],SAT[0][1],S[str(n)]['target']),F,'Q7')
lego('S0154L02',F,'Q7',target_text='oíche Shathairn',components=[{"known":"night","target":"oíche"},{"known":"Saturday","target":"Shathairn"}])
lego('S0215L03',F,'Q7: same LEGO taught again at 215',target_text='oíche Shathairn',components=[{"known":"night","target":"oíche"},{"known":"Saturday","target":"Shathairn"}])
for k,r in R.items():
    if re.search(SAT[0][0],r['target_text']): sub(k,SAT,F,'Q7')
upd('S0154L02C01',None,'Shathairn',F,'Q7: word tile')
# Q8: d'ainm a insint dom
F="Q8 d'ainm"
seed(150,None,"an féidir leat d'ainm a insint dom?",F,"Q8: Eoghan's sentence, our English")
lego('S0150L03',F,"Q8: the piece is now 'your name'",known_text='your name',target_text="d'ainm",components=[{"known":"your","target":"d'"},{"known":"name","target":"ainm"}])
basket('S0150L03',[
 ('build',"your name","d'ainm"),
 ('build',"your name in Irish","d'ainm i nGaeilge"),
 ('build',"to tell me what your name is","d'ainm a insint dom"),
 ('build',"to say your name again","d'ainm a rá arís"),
 ('use',"I can't remember your name","ní féidir liom cuimhneamh ar d'ainm"),
 ('use',"I'd like to learn your name","ba mhaith liom d'ainm a fhoghlaim"),
 ('use',"she wanted to say your name in Irish","ba mhian léi d'ainm a rá i nGaeilge"),
 ('use',"can you say your name in Irish","an féidir leat d'ainm a rá i nGaeilge"),
 ('use',"can you tell me what your name is?","an féidir leat d'ainm a insint dom?"),
 ('use',"thank you, can you tell me what your name is again","go raibh maith agat, an féidir leat d'ainm a insint dom arís"),
],F,'Q8')
upd('S0156L01U04',None,"an mian leat d'ainm a insint dom",F,'Q8: same wording as the seed')
upd('S0170L02U01',None,"ba mhaith liom go n-inseofá dom d'ainm",F,'Q8')
if __name__=='__main__':
    for f in sorted({v[2] for v in SEED.values()}|{v[1] for v in LEGO.values()}|{v[3] for v in PH.values()}): print('=====',f); show(f)
STALE=[r'sula dtosaíonn tú',r'oíche [Dd]é [Ss]athairn',r'(bhí|atá) (mé|tú|sé|sí|muid|siad) a (dhéanamh|rá|thabhairt)']
