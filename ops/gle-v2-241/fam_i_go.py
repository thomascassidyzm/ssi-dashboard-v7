# Family I: go = dul (Eoghan 26, 93, 97, 249: he changes the Irish, not the English). imeacht stays "leave".
# Consequence: seed 93 no longer says imeacht, so "to leave | imeacht" cannot debut there. Its new debut is a
# LEGO added at seed 139, the first seed whose sentence says imeacht for "leave" outside a chunk. Every row
# before that debut that used imeacht now says "go" + dul (except the chunk sula n-imíonn tú, taught whole at 119).
from lib import *
F='go'
seed(25,target='an bhfuil tú chun cabhrú liom sula gcaithfidh mé dul?',fam=F,why="English says go; Eoghan's own 25 is a different sentence and is not taken here")
seed(26,target='is maith liom a bheith ag mothú go bhfuil mé beagnach réidh le dul',fam=F,why="Eoghan's le dul; réidh kept (10 Nov keep-ours)")
seed(93,target='Tá sé in am dul anois',fam=F,why="Eoghan: in am dul = time to go")
seed(97,target='Tá, tá mé réidh le dul chomh luath agus is mian leat',fam=F,why="Eoghan's le dul; réidh kept")
seed(249,target='Is mian liom go gcabhrófá liom sula rachaidh tú',fam=F,why="Eoghan's sula rachaidh tú")
lego('S0025L03',fam=F,target_text='sula gcaithfidh mé dul',components=[{"known":"before","target":"sula"},{"known":"have to","target":"gcaithfidh"},{"known":"I","target":"mé"},{"known":"go","target":"dul"}])
lego('S0026L05',fam=F,target_text='réidh le dul',components=[{"known":"ready","target":"réidh"},{"known":"to go","target":"le dul"}])
lego('S0093L02',fam=F,known_text='to go',target_text='dul',why='was to leave | imeacht; seed 93 says go')
lego('S0097L02',fam=F,known_text='I am ready to go',target_text='tá mé réidh le dul',components=[{"known":"I am","target":"tá mé"},{"known":"ready","target":"réidh"},{"known":"to","target":"le"},{"known":"go","target":"dul"}],why='seed 97 says go')
lego('S0249L04',fam=F,target_text='sula rachaidh tú',components=[{"known":"before","target":"sula"},{"known":"will go","target":"rachaidh"},{"known":"you","target":"tú"}])
INS_LEGO.append(dict(seed_number=139,lego_index=2,known_text='to leave',target_text='imeacht',type='A',is_new=True,status='draft'))
GT=[('le himeacht','le dul'),(r'\bimeacht\b','dul')]
GK=[(r'\bleave\b','go'),(r'\bleaving\b','going'),(r'\bleaves\b','goes')]
def before139(k): return (R[k]['seed_number'],R[k]['lego_index'])<(139,2)
for k,r in R.items():
    if k in PH: continue
    t=r['target_text']
    if re.search(r'\bh?imeacht\b',t) and before139(k) and 'himeacht ama' not in t and r['lego']!='S0139L01':
        sub(k,GT,fam=F,kpairs=GK,why='imeacht is not taught until seed 139 now; go = dul')
W='go = dul'
H={
'S0093L02U01':("I want to go now but I am not sure if it is time","Is mian liom dul anois ach níl mé cinnte an bhfuil sé in am"),
'S0093L02U03':("I like feeling as if I'm nearly ready to go","is maith liom a bheith ag mothú go bhfuil mé beagnach réidh le dul"),
'S0093L02U10':("before I have to go I want to ask you a question about something","sula gcaithfidh mé dul is mian liom ceist a chur ort faoi rud éigin"),
'S0093L02U15':("I want to go now because it is already time and I am ready to go","Is mian liom dul anois mar tá sé in am cheana féin agus tá mé réidh le dul"),
'S0089L04U02':("I'm really happy with how much is done today, and I'm going to keep going for a while longer before I have to go","Tá mé an-sásta leis an méid atá déanta inniu, agus tá mé chun leanúint ar aghaidh ar feadh tamaill sula gcaithfidh mé dul"),
'S0089L05U09':("I think there is something important I have to tell you before you have to go, but I'm not quite sure how to say it yet","ceapaim go bhfuil rud éigin tábhachtach le rá agam leat sula gcaithfidh tú dul, ach níl mé cinnte fós conas é a rá"),
'S0025L03C04':("go","dul"),'S0026L05C02':("to go","le dul"),'S0097L02C04':("go","dul"),
# at or after the new debut: only rows whose English says go
'S0155L01U10':("I don't mind, I am ready to leave as soon as you want","Ní miste liom, tá mé réidh le himeacht chomh luath agus is mian leat"),
'S0156L04U10':(None,"tá sé in am dul abhaile anois ach ba mhaith liom bualadh le chéile arís anocht an tseachtain seo chugainn"),
'S0200L03U11':("I think it is very important to make sure that everybody is happy before we leave",None),
'S0222L01U04':(None,"tá sé réidh le dul anois"),'S0228L01U06':(None,"tá an fear sin réidh le dul anois"),
'S0235L06U03':(None,"ba cheart dom rud éigin a insint duit sula gcaithfidh mé dul"),
'S0236L03B02':(None,"go raibh sí réidh le dul"),
'S0274L02U15':(None,"tá sé tábhachtach imeacht in am agus sin an fáth ar theastaigh uaim labhairt leat faoi sula rachaidh tú"),
'S0274L03U06':(None,"tá brón orm go gcaithfidh mé imeacht i gceann cúpla lá agus níor theastaigh uaim dul chomh luath sin"),
'S0276L03U07':(None,"tá mé sásta fanacht ach ba mhaith liom labhairt leat faoi rud éigin sula rachaidh tú"),
}
for k,(kn,tg) in H.items(): upd(k,known=kn,target=tg,fam=F,why=W)
for k,r in R.items():
    if r['lego']=='S0249L04' and 'sula n-imíonn tú' in r['target_text']: sub(k,[('sula n-imíonn tú','sula rachaidh tú')],fam=F,why="Eoghan's sula rachaidh tú for before you go")
# seed 139: the four rows that say imeacht move under the new LEGO S0139L02, so nothing uses it before its debut
for k in ('S0139L01B03','S0139L01U01','S0139L01U03','S0139L01U06'): dele(k,fam=F,why='moved under the new LEGO S0139L02 to leave | imeacht')
NEW139=[('build',"I want to leave","is mian liom imeacht"),
('build',"I'm sorry that I need to leave","tá brón orm go gcaithfidh mé imeacht"),
('build',"it is time to leave now","tá sé in am imeacht anois"),
('build',"he was trying to leave","bhí sé ag iarraidh imeacht"),
('use',"I'm sorry that I need to leave so early","Tá brón orm go gcaithfidh mé imeacht chomh luath sin"),
('use',"I'm sorry that I need to leave now","Tá brón orm go gcaithfidh mé imeacht anois"),
('use',"I'm sorry that I need to leave so early today","Tá brón orm go gcaithfidh mé imeacht chomh luath sin inniu"),
('use',"he was trying to leave early","bhí sé ag iarraidh imeacht go luath"),
('use',"I am not sure I want to leave yet because there is still so much to learn here","Níl mé cinnte gur mian liom imeacht fós mar tá go leor le foghlaim anseo"),
('use',"he was not trying to leave and he wanted to stay for a while to keep learning","Ní raibh sé ag iarraidh imeacht agus ba mhian leis fanacht ar feadh tamaill ag foghlaim"),
('use',"I don't want to leave now","ní mian liom imeacht anois"),
('use',"we didn't want to stop and we didn't want to leave","níor mhian linn stopadh agus níor mhian linn imeacht"),
]
nb=nu=0
for i,(role,kn,tg) in enumerate(NEW139):
    if role=='build': nb+=1; pid=f'S0139L02B{nb:02d}'
    else: nu+=1; pid=f'S0139L02U{nu:02d}'
    INS_PH.append(dict(id='gle_v2_for_eng:'+pid,course_code='gle_v2_for_eng',seed_number=139,lego_index=2,position=i+1,known_text=kn,target_text=tg,phrase_role=role,status='draft',metadata={"format":"build_use","pipeline":"v2","authored":"job #241, 11 Nov 2026"},connected_lego_ids=[],lego_position='middle',introduce=True,word_count=len(tg),lego_count=len(tg.split())))
