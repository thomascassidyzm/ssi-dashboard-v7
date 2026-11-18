# Family E: ask = Eoghan's three-way split. ceist a chur ar = ask someone; fiafraigh de + if/where/what clause
# (176, 177... untouched); iarr ar = ask for / ask to do (203, 243: untouched).
# Seeds 30, 99, 119 lose a fhiafraí / a cheistiú, so every phrase that used the verbal noun a fhiafraí
# (no longer taught by any LEGO) moves to ceist a chur ar, on the model of Eoghan's own 208
# (ceist a chur ort conas é a rá) and 609 (ceist a chur faoi).
from lib import *
F='ask'
Q=[{"known":"a question","target":"ceist"},{"known":"to put","target":"a chur"},{"known":"on you","target":"ort"}]
seed(30,known='I wanted to ask you a question about something yesterday',target='ba mhian liom ceist a chur ort inné faoi rud éigin',fam=F,why="Eoghan's line and his English, whole")
lego('S0030L02',fam=F,known_text='to ask you a question',target_text='ceist a chur ort',type='M',components=Q,why='was to ask | a fhiafraí')
lego('S0030L03',fam=F,known_text='about something',target_text='faoi rud éigin',type='M',components=[{"known":"about","target":"faoi"},{"known":"something","target":"rud éigin"}],why='was from you | díot, which seed 30 no longer says')
seed(99,target='ba cheart duit ceist a chur ort féin cén fáth nach bhfuil sé ag obair',fam=F,why="Eoghan's ceist a chur ort féin. His faoin bhfáth is NOT taken: 'why' is cén fáth everywhere else and S0099L03 teaches it; ba cheart kept (10 Nov keep-ours)")
lego('S0099L02',fam=F,target_text='ceist a chur ort féin',components=[{"known":"to ask a question","target":"ceist a chur"},{"known":"yourself","target":"ort féin"}])
seed(119,known='can I ask you about something before you leave?',target='an féidir liom ceist a chur ort faoi rud éigin sula n-imíonn tú?',fam=F,why="Eoghan's ceist a chur ort. His maidir le is NOT taken: he writes faoi for the same thing at 30 and 609, and one English 'about' with two Irish words would break one-prompt-one-answer. English gains 'about' so every Irish word is covered. sula n-imíonn tú (leave) kept: his fág is a separate, unruled question")
lego('S0119L02',fam=F,known_text='about something',target_text='faoi rud éigin',components=[{"known":"about","target":"faoi"},{"known":"something","target":"rud éigin"}],why='stays not-new: same pair as S0030L03')
lego('S0119L03',fam=F,target_text='ceist a chur ort',components=Q,why='known stays to ask you, as 208 and 223 already gloss ceist a chur ort')
W="a fhiafraí is no longer taught; ceist a chur ar"
P={
'S0030L02B01':("I wanted to ask you a question","ba mhian liom ceist a chur ort"),
'S0030L02B02':("I want to ask you a question","is mian liom ceist a chur ort"),
'S0030L02B03':("I'd like to ask you a question in Irish","ba mhaith liom ceist a chur ort i nGaeilge"),
'S0030L02U01':("I wanted to ask you a question in Irish","ba mhian liom ceist a chur ort i nGaeilge"),
'S0030L02U02':("I'd like to ask you a question now","ba mhaith liom ceist a chur ort anois"),
'S0030L02U03':("I'm trying to ask you a question in Irish","tá mé ag iarraidh ceist a chur ort i nGaeilge"),
'S0030L02U04':("I wanted to ask you a question now","ba mhian liom ceist a chur ort anois"),
'S0030L02U05':("I don't want to ask you a question","ní mian liom ceist a chur ort"),
'S0030L02U06':("I'm looking forward to asking you a question in Irish","tá mé ag tnúth le ceist a chur ort i nGaeilge"),
'S0030L02U07':("I want to ask you a question in Irish","is mian liom ceist a chur ort i nGaeilge"),
'S0030L02U08':("it's useful to ask you a question","tá sé úsáideach ceist a chur ort"),
'S0030L03B01':("to ask you a question about something","ceist a chur ort faoi rud éigin"),
'S0030L03B02':("I wanted to ask you a question about something","ba mhian liom ceist a chur ort faoi rud éigin"),
'S0030L03B03':("I want to ask you a question about something in Irish","is mian liom ceist a chur ort faoi rud éigin i nGaeilge"),
'S0030L03U01':("I wanted to ask you a question about something in Irish","ba mhian liom ceist a chur ort faoi rud éigin i nGaeilge"),
'S0030L03U02':("I'd like to ask you a question about something","ba mhaith liom ceist a chur ort faoi rud éigin"),
'S0030L03U03':("I'm trying to ask you a question about something in Irish","tá mé ag iarraidh ceist a chur ort faoi rud éigin i nGaeilge"),
'S0030L03U04':("I wanted to ask you a question about something now","ba mhian liom ceist a chur ort faoi rud éigin anois"),
'S0030L03U05':("I don't want to ask you a question about something","ní mian liom ceist a chur ort faoi rud éigin"),
'S0030L03U06':("I'm looking forward to asking you a question about something in Irish","tá mé ag tnúth le ceist a chur ort faoi rud éigin i nGaeilge"),
'S0030L03U07':("I want to ask you a question about something","is mian liom ceist a chur ort faoi rud éigin"),
'S0030L03U08':("it's useful to ask you a question about something","tá sé úsáideach ceist a chur ort faoi rud éigin"),
'S0030L04B03':("I wanted to ask you a question about something yesterday","ba mhian liom ceist a chur ort inné faoi rud éigin"),
'S0030L04U01':("I wanted to ask you a question about something yesterday","ba mhian liom ceist a chur ort inné faoi rud éigin"),
'S0030L04U08':("I was looking forward to asking you a question yesterday","bhí mé ag tnúth le ceist a chur ort inné"),
'S0036L03U09':("she was trying to interrupt to ask a question","bhí sí ag iarraidh cur isteach le ceist a chur"),
'S0036L03U13':("she doesn't want to interrupt, but she wants to ask a question","ní mian léi cur isteach, ach is mian léi ceist a chur"),
'S0036L04U06':("she was trying to interrupt the story because she wanted to ask a question","bhí sí ag iarraidh cur isteach ar an scéal mar ba mhian léi ceist a chur"),
'S0036L04U14':("she doesn't want to interrupt the story, but she wants to ask a question","ní mian léi cur isteach ar an scéal, ach is mian léi ceist a chur"),
'S0052L07B02':("you wanted to ask a question last week","ba mhian leat ceist a chur an tseachtain seo caite"),
'S0053L01B03':("yesterday she wanted to ask a question","inné ba mhian léi ceist a chur"),
'S0068L01U15':("what were you trying to say to me when I was thinking about the story yesterday","cad a bhí tú ag iarraidh a rá liom nuair a bhí mé ag smaoineamh ar an scéal inné"),
'S0102L04U10':("he said that it is not important what I was trying to say yesterday","dúirt sé nach bhfuil sé tábhachtach cad a bhí mé ag iarraidh a rá inné"),
'S0103L04U03':("I need another word before I can ask you a question","Tá focal eile de dhíth orm sula mbeidh mé ábalta ceist a chur ort"),
'S0103L05U03':(None,"dúirt sé rud éigin eile liom inniu a bhí mé ag iarraidh ceist a chur faoi"),
'S0119L01B02':("can I ask a question","an féidir liom ceist a chur"),
'S0119L01U03':("can I ask you why it's not working","an féidir liom ceist a chur ort cén fáth nach bhfuil sé ag obair"),
'S0119L03B01':(None,"ceist a chur ort anois"),
'S0119L03B02':(None,"ba cheart dom ceist a chur ort"),
'S0119L03B03':("I'd like to ask you about something","ba mhaith liom ceist a chur ort faoi rud éigin"),
'S0119L03B04':(None,"níor mhaith liom ceist a chur ort arís"),
'S0119L03U01':(None,"níl mé chun ceist a chur ort amárach"),
'S0119L03U02':("we wanted to ask you about something yesterday","ba mhian linn ceist a chur ort inné faoi rud éigin"),
'S0119L03U03':(None,"cén fáth nach féidir liom ceist a chur ort cad a dúirt tú"),
'S0119L03U04':("I'd like to ask you about something before I have to go","ba mhaith liom ceist a chur ort faoi rud éigin sula gcaithfidh mé dul"),
'S0119L03U05':(None,"go raibh maith agat, ba mhaith liom ceist a chur ort faoi mo chara"),
'S0119L03U06':(None,"ní féidir liom ceist a chur ort anois mar tá mé tuirseach"),
'S0119L03U07':("she wanted to ask you about something new","ba mhian léi ceist a chur ort faoi rud nua"),
'S0119L04U03':("why can't I ask you about something before you leave","cén fáth nach féidir liom ceist a chur ort faoi rud éigin sula n-imíonn tú"),
'S0124L02U05':("I thought that it was a good idea and I wanted to ask you before you left about finding people who speak Irish","cheap mé gur smaoineamh maith é sin agus ba mhian liom ceist a chur ort sula n-imíonn tú faoi bualadh le daoine a labhraíonn Gaeilge"),
'S0127L01U05':("That isn't the reason and I wanted to ask you before you leave about what you wanted to do yesterday","Ní hé sin an fáth agus ba mhian liom ceist a chur ort sula n-imíonn tú faoin rud ba mhian leat a dhéanamh inné"),
'S0127L01U09':("That isn't the reason and I think it's a good idea to meet up this evening because I wanted to ask you about something","Ní hé sin an fáth agus ceapaim gur smaoineamh maith é sin bualadh le chéile anocht mar ba mhian liom ceist a chur ort faoi rud éigin"),
'S0127L02U05':("That isn't the reason why I wanted to see you and I wanted to ask you about something before I have to go today","Ní hé sin an fáth ar theastaigh uaim tú a fheiceáil agus ba mhian liom ceist a chur ort faoi rud éigin sula gcaithfidh mé dul inniu"),
'S0150L03B04':(None,"ceist a chur ort cad is ainm duit arís"),
'S0150L03U04':(None,"ba mhian léi ceist a chur ort cad is ainm duit"),
'S0181L05B06':("I have to ask a question","caithfidh mé ceist a chur"),
'S0181L05U04':(None,"caithfidh mé ceist a chur uirthi cad atá tú chun a dhéanamh sula gcaithfidh sí imeacht Dé Domhnaigh"),
'S0181L05U15':(None,"caithfidh mé ceist a chur uirthi an féidir léi cabhrú liom ar feadh tamaill maidin Dé Domhnaigh seo"),
'S0205L01U01':("i wanted to ask you about something but i have forgotten","ba mhian liom ceist a chur ort faoi rud éigin ach tá dearmad déanta agam"),
'S0246L04B04':(None,"ba mhian liom ceist a chur uirthi ach bhí sí ró-ghnóthach"),
'S0246L04U03':(None,"bhí mé ag iarraidh ceist a chur uirthi ach bhí sí ró-ghnóthach le stopadh agus labhairt liom"),
'S0283L01U05':(None,"ba mhian liom ceist a chur ort cé acu de do smaointe is fearr"),
}
for k,(kn,tg) in P.items(): upd(k,known=kn,target=tg,fam=F,why=W)
for k,r in R.items():
    if 'tú féin a cheistiú' in r['target_text']: sub(k,[('tú féin a cheistiú','ceist a chur ort féin')],fam=F)
upd('S0099L02C01',known='to ask a question',target='ceist a chur',fam=F,why='component row follows the LEGO')
upd('S0099L02C02',known='yourself',target='ort féin',fam=F,why='component row follows the LEGO')
