# English/Irish meaning mismatches among the phrase rows job #241 touched (all 346 not already cold-check-fixed were
# read by hand, 11 Nov). Each fix brings the English to what the Irish says, or repairs/deletes broken Irish.
# K = new known, T = new target, D = delete. Builds mismatch-fix.json for dry.py.
import json,os
c=json.load(open(os.path.join(os.environ['CS_SCRATCH'],'course.json')));R=c['rows']
K={
'S0068L01U03':"what was the answer you were looking for before you have to go now",
'S0068L03U07':"I was looking for the answer before I have to go but it is not easy to remember",
'S0068L03U13':"I would like to be looking for an answer to the story before I have to go",
'S0069L01U08':"he didn't want to take time before he has to go but it was important",
'S0089L02U14':"I think that I still have enough time before I have to go, so I'm going to keep trying",
'S0089L05U07':"I know there is something I have to say to you about the story before you have to go, because it's important",
'S0089L06U12':"I know there is a lot I still need to do today, but I want to practise speaking as often as possible before I have to go",
'S0093L02U02':"are you going to help me before I have to go tonight?",
'S0093L02U08':"she was trying to go without saying anything because she did not want anyone to know",
'S0097L02U02':"I am ready to go so I can go home",
'S0103L01U12':"we are not sure if there is something else we need to do before we have to go",
'S0111L01U07':"when we learn something new I want to relax",
'S0111L01U11':"when we learn something new it changes our brain and I think that's a good thing",
'S0111L01U14':"I wasn't expecting that when we learn something new it changes everything",
'S0111L01U15':"when we learn something new it's interesting and I want to keep going",
'S0111L02U09':"when we learn something new together it's very interesting and good",
'S0112L04U04':"I wasn't expecting that our brain changes when we learn something new",
'S0123L01U15':"I think it's a good thing to take time to rest after we finish before I have to go",
'S0123L02U02':"I think that it's a good idea to take time to rest after we finish because when we learn something new it changes our brain",
'S0124L02U05':"I thought that it was a good idea and I wanted to ask you before you leave about meeting people who speak Irish",
'S0124L02U10':"I thought that it was a good idea to take time to rest after we finish before I have to go",
'S0125L01U12':"I believe that it's a good thing to make mistakes because when we learn something new it changes our brain and that is the only way it will work",
'S0125L02U09':"I believe that your idea was very good and it's useful to start speaking as soon as you can because it changes our brain when we learn",
'S0127L01U09':"That isn't the reason and I think it's a good idea to meet up tonight because I wanted to ask you about something",
'S0147L02U05':"I was glad she was very kind when she saw that I was nervous",
'S0181L05U04':"I have to ask her what are you going to do before she has to leave on Sunday",
'S0181L05U15':"I have to ask her if she can help me for a while this Sunday morning",
'S0200L03U11':"I think it is important to make sure that everybody is happy before we leave",
'S0246L04U03':"I was trying to ask her but she was too busy to stop and talk to me",
'S0270L04U01':"I was worried I would be late because I had too much work to do before leaving",
'S0279L01U05':"she was worried because there wasn't much time left to fix everything before I have to leave",
}
KT={
'S0065L02U14':("it is important to say something but I don't worry about making mistakes","Tá sé tábhachtach rud éigin a rá ach ní bhím buartha faoi bhotúin a dhéanamh"),
'S0097L02U07':(None,"tá mé réidh le dul ach tá beagán níos mó ama agam"),
'S0097L03U05':(None,"chomh luath agus is mian leat tá mé réidh le dul ach tá beagán níos mó ama agam"),
'S0111L03U06':("it changes our brain when we learn something new and I think it is good to keep working","athraíonn sé ár n-inchinn nuair a fhoghlaimíonn muid rud nua agus ceapaim go bhfuil sé maith leanúint ag obair"),
'S0156L04U10':("it is time to go home now but I'd like to meet again next week","tá sé in am dul abhaile anois ach ba mhaith liom bualadh le chéile arís an tseachtain seo chugainn"),
}
D={'S0112L05U09':"broken Irish (ceapaim bhí sé sin rud tábhachtach a thuigeann tú) under a different English",
   'S0147L02B03':"English said 'kind', Irish 'very kind'; corrected it would repeat S0147L02U01"}
ops=[];rec={}
for k,kn in K.items():
    r=R[k]; assert kn!=r['known_text'],k
    ops.append({"op":"phrase.update","phrase_id":r['id'],"set":{"known_text":kn},"expect":{"known_text":r['known_text'],"target_text":r['target_text']}}); rec[k]={"before":[r['known_text'],r['target_text']],"after":[kn,r['target_text']]}
for k,(kn,tg) in KT.items():
    r=R[k]; sd={}
    if kn: sd['known_text']=kn
    if tg!=r['target_text']: sd['target_text']=tg
    ops.append({"op":"phrase.update","phrase_id":r['id'],"set":sd,"expect":{"known_text":r['known_text'],"target_text":r['target_text']}}); rec[k]={"before":[r['known_text'],r['target_text']],"after":[kn or r['known_text'],tg]}
for k,w in D.items():
    r=R[k]; ops.append({"op":"phrase.delete","phrase_id":r['id'],"expect":{"target_text":r['target_text']}}); rec[k]={"before":[r['known_text'],r['target_text']],"deleted":w}
json.dump({"why":"job #253: English/Irish mismatches among the rows #241 touched, all read by hand","ops":ops,"rows":rec},open('mismatch-fix.json','w'),ensure_ascii=False,indent=1)
print(len(ops),'ops')
# one prompt, one answer: no new English may already exist with a different Irish
norm=lambda s:' '.join(''.join(ch for ch in s.lower() if ch.isalnum() or ch==' ').split())
new={norm(v['after'][0]):(k,norm(v['after'][1])) for k,v in rec.items() if 'after' in v}
for q,r in R.items():
    n=norm(r['known_text'])
    if r['phrase_role']!='component' and n in new and q!=new[n][0] and norm(r['target_text'])!=new[n][1]: print('ZUT',q,new[n][0],r['known_text'],'|',r['target_text'])
