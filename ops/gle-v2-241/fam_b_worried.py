# Family B: worried = buartha (Eoghan every time; his note at 343: "buartha = worried; imní = afraid").
from lib import *
F='worried'
seed(46,target='ach ní bhím buartha faoi bhotúin a dhéanamh',fam=F,why="Eoghan's ní bhím buartha; 'a dhéanamh' kept because the English says 'making mistakes' and S0046L04 teaches it")
seed(270,target='mar tá mé buartha go mbeidh mé déanach',fam=F)
seed(343,target='a dúirt go bhfuil sí buartha faoin ngeilleagar',fam=F)
lego('S0046L02',fam=F,target_text='ní bhím buartha faoi',components=[{"known":"I am not habitually","target":"ní bhím"},{"known":"worried","target":"buartha"},{"known":"about","target":"faoi"}])
lego('S0270L02',fam=F,target_text='tá mé buartha',components=[{"known":"I am","target":"tá mé"},{"known":"worried","target":"buartha"}])
RULES=[('ní bhíonn imní orm','ní bhím buartha'),('tá imní orm','tá mé buartha'),('bhí imní orm','bhí mé buartha'),
 ('go raibh imní uirthi','go raibh sí buartha'),('bhí imní uirthi','bhí sí buartha'),('bhí imní air','bhí sé buartha'),
 ('bhí imní ar gach duine','bhí gach duine buartha'),('gan imní a bheith orm','gan a bheith buartha')]
for k,r in R.items():
    if 'imní' in r['target_text']: sub(k,RULES,fam=F)
upd('S0046L02C01',known='I am not habitually',target='ní bhím',fam=F,why='component row follows the LEGO')
upd('S0046L02C02',known='worried',target='buartha',fam=F,why='component row follows the LEGO')
upd('S0066L01U08',target='ceapaim Níl sé tábhachtach a bheith buartha faoi bhotúin a dhéanamh ag foghlaim Gaeilge',fam=F,why='imní orm sat in a broken frame; a bheith buartha (to be worried). Row was already mismatched (she thinks / ceapaim): not repaired here')
upd('S0078L03U03',target='Ní thuigim gach rud ach níl mé buartha faoi sin',fam=F,why="English is 'I am not worried' = níl mé buartha")
upd('S0089L04U07',target='Tá a fhios agam go bhfuil go leor déanta agus níl mé buartha, mar ceapaim gur rud maith é sin go bhfuil muid ag foghlaim le chéile',fam=F,why="'I'm not worried' = níl mé buartha")
upd('S0089L06U02',target='Níl a fhios agam conas go leor focal éagsúil a rá fós, ach níl mé buartha faoi bhotúin a dhéanamh',fam=F,why="'I'm not worried' = níl mé buartha")
upd('S0156L04U09',target='níl mé buartha faoi bhotúin a dhéanamh anocht agus ceapaim gur rud maith é sin',fam=F,why="'I am not worried' = níl mé buartha; stray leading ach dropped (English has no but)")
upd('S0114L01U11',known="I feel it's easier to speak when I'm not worried about making mistakes",target='mothaím go bhfuil sé níos éasca labhairt nuair nach bhfuil mé buartha faoi bhotúin a dhéanamh',fam=F,why="nach bhfuil mé buartha uses only taught forms; English moved to 'I'm not worried' so it does not clash with 'I don't worry' = ní bhím buartha")
