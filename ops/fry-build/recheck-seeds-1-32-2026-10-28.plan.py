import json,sys
rows={r['id'].split(':')[1]:r for r in json.load(open('rows.json'))}
ops=[]; seeds=set()
def P(pid,known,target):
    r=rows[pid]; seeds.add(r['seed_number'])
    ops.append({"op":"phrase.update","phrase_id":"fry_for_eng:"+pid,
      "expect":{"known_text":r['known_text'],"target_text":r['target_text']},
      "set":{"known_text":known,"target_text":target}})
def D(pid):
    r=rows[pid]; seeds.add(r['seed_number'])
    ops.append({"op":"phrase.delete","phrase_id":"fry_for_eng:"+pid,
      "expect":{"known_text":r['known_text'],"target_text":r['target_text']}})
def L(lid,bk,bt,k,t,typ,comps):
    seeds.add(int(lid[1:5]))
    ops.append({"op":"lego.update","lego_id":lid,"expect":{"known_text":bk,"target_text":bt},
      "set":{"known_text":k,"target_text":t,"type":typ,"components":[{"known":a,"target":b} for a,b in comps]}})
def I(pid,seed,li,role,pos,known,target):
    seeds.add(seed)
    ops.append({"op":"phrase.insert","row":{"id":"fry_for_eng:"+pid,"course_code":"fry_for_eng","seed_number":seed,
      "lego_index":li,"position":pos,"phrase_role":role,"known_text":known,"target_text":target,"status":"draft"}})

# --- S3: 'can speak | prate kin' was a verb-final tail without its trigger (K48). Re-cut to the modal itself,
#     matching seed 4's 'must | moat'; its rows become main-clause rows, plus USE rows it never had (P30).
L("S0003L02","can speak","prate kin","can","kin","A",[])
P("S0003L02B01","I can speak Frisian","ik kin Frysk prate")
P("S0003L02B02","I can speak with you","ik kin mei dy prate")
I("S0003L02U01",3,2,"use",1,"I can speak Frisian with you now","ik kin no Frysk mei dy prate")
I("S0003L02U02",3,2,"use",2,"can I speak Frisian with you","kin ik Frysk mei dy prate")
I("S0003L02U03",3,2,"use",3,"can I speak with you now","kin ik no mei dy prate")
# --- S4
P("S0004L02B01","I can speak in Frisian","ik kin yn it Frysk prate")
D("S0004L04U06")   # the seed itself under 'must': English has no 'must' (P17 known side)
# --- S6 lower-case 'i' / 'frisian' / 'frysk'
P("S0006L01B02","to say a word in Frisian","in wurd yn it Frysk sizze")
P("S0006L01B03","I'm going to practise a word","ik sil in wurd oefenje")
P("S0006L01B04","I'm trying to learn a word","ik besykje in wurd te learen")
P("S0006L01U01","I want to practise a word with someone else","ik wol in wurd oefenje mei in oar")
P("S0006L01U02","I'm going to practise a word with you","ik sil in wurd mei dy oefenje")
P("S0006L01U03","I'm trying to learn a word in Frisian","ik besykje in wurd yn it Frysk te learen")
P("S0006L01U04","can I say a word in Frisian","kin ik in wurd yn it Frysk sizze")
P("S0006L01U05","I must practise a word as often as possible","ik moat safolle mooglik in wurd oefenje")
P("S0006L01U06","I'm going to say a word in Frisian now","ik sil no in wurd yn it Frysk sizze")
# S6 Auke: adverbials before te + verb
P("S0006L02B01","to remember a word in Frisian","yn it Frysk op in wurd te kommen")
P("S0006L02U01","I'm trying to remember a word in Frisian","ik besykje yn it Frysk op in wurd te kommen")
P("S0006L02U05","I'm trying to remember a word in Frisian now","ik besykje no yn it Frysk op in wurd te kommen")
P("S0006L02U06","I'm trying to remember a word in Frisian with you","ik besykje mei dy yn it Frysk op in wurd te kommen")
# --- S7 stilted English 'with speaking'
P("S0007L03B04","to try as hard as I can at speaking","hurd myn bêst dwaan mei it praten")
P("S0007L03U01","I'm going to try as hard as I can at speaking","ik sil hurd myn bêst dwaan mei it praten")
# --- S8 Auke: yn it Frysk before út te lizzen
P("S0008L02B04","I want to try to explain in Frisian","ik wol besykje yn it Frysk út te lizzen")
P("S0008L02U01","I'm going to try to explain in Frisian","ik sil besykje yn it Frysk út te lizzen")
P("S0008L02U02","can I try to explain in Frisian","kin ik besykje yn it Frysk út te lizzen")
P("S0008L02U05","try to explain in Frisian","besykje yn it Frysk út te lizzen")
# --- S10: L04 tail grows to its trigger oft (K48); the B01 row becomes the bare LEGO, so it goes
L("S0010L04","I can remember the whole sentence","ik de hiele sin noch wit",
  "if I can remember the whole sentence","oft ik de hiele sin noch wit","M",
  [("if","oft"),("I","ik"),("the whole sentence","de hiele sin"),("can remember","noch wit")])
D("S0010L04B01")
# --- S12
P("S0012L02B01","I can guess","ik kin riede")
P("S0012L02B02","I can't guess","ik kin net riede")   # was 'ik besykje te riede': after te it must be rieden, which is not this LEGO's form
# --- S13: 'oft dû praatst' lacks the -st clitic after oft and/or extraposes; drop
D("S0013L01B04"); D("S0013L01U04"); D("S0013L01U06")
P("S0013L03B01","I can speak very well","ik kin hiel goed prate")
# --- S15: first want-you-to; L04 'you to speak with me | mei my praatst' had no trigger and the banned English.
#     Kai 21 Oct: first occurrence = the whole chunk.
L("S0015L04","you to speak with me","mei my praatst",
  "I want you to speak with me","ik wol datstû mei my praatst","M",
  [("I want you to","ik wol datstû"),("with me","mei my"),("speak","praatst")])
# --- S19: 'ik besykje mar' / 'ik sil besykje mar' read as 'I'll just try' in Frisian
D("S0019L01B02"); D("S0019L01B04")
# --- S21
P("S0021L03B01","she can say her name","sy kin har namme sizze")
# --- S22: bare 'because' rows given their whole clause (K48: the trigger never dangles)
P("S0022L01B01","I'm going to practise because I want to learn","ik sil oefenje om't ik leare wol")
P("S0022L01B03","I don't want to stop talking because I'm trying to learn","ik wol net ophâlde mei praten om't ik besykje te learen")
P("S0022L01B04","he wants to come back because he must say something","hy wol weromkomme om't hy wat sizze moat")
# --- S23
P("S0023L03U03","he wants to try to talk more with people","hy wol besykje mei minsken mear te praten")
D("S0023L03U08")   # seed itself: 'talking more' does not contain 'to talk more'
# --- S24: 'I'm not going to … it | ik sil it net' is an ellipsis LEGO; grows to its verb cluster
L("S0024L04","I'm not going to … it","ik sil it net",
  "I'm not going to be able to remember","ik sil it net ûnthâlde kinne","M",
  [("I'm going to","ik sil"),("it","it"),("not","net"),("to be able to remember","ûnthâlde kinne")])
P("S0024L04B01","but I'm not going to be able to remember","mar ik sil it net ûnthâlde kinne")
P("S0024L04B02","I'm not going to be able to remember today","ik sil it hjoed net ûnthâlde kinne")
P("S0024L04B03","and I'm not going to be able to remember","en ik sil it net ûnthâlde kinne")
P("S0024L04B04","I'm not going to be able to remember quickly","ik sil it net fluch ûnthâlde kinne")
P("S0024L04U01","I'm trying to learn but I'm not going to be able to remember","ik besykje te learen mar ik sil it net ûnthâlde kinne")
P("S0024L04U02","she's going to say it but I'm not going to be able to remember","sy sil it sizze mar ik sil it net ûnthâlde kinne")
P("S0024L04U03","I'm going to practise speaking but I'm not going to be able to remember","ik sil it praten oefenje mar ik sil it net ûnthâlde kinne")
P("S0024L04U04","I'm not going to be able to remember very well","ik sil it net hiel goed ûnthâlde kinne")
P("S0024L04U05","I wouldn't like to guess, I'm not going to be able to remember","ik soe net graach riede wolle, ik sil it net ûnthâlde kinne")
P("S0024L04U06","I'm not going to be able to remember this evening","ik sil it fan 'e jûn net ûnthâlde kinne")
D("S0024L03U03")   # 'ûnthâlde kinne sil': the cluster Auke shortens
# --- S26
P("S0026L01U02","you want to learn quickly and I like it when we speak Frisian","dû wolst fluch leare en ik fyn it noflik as wy Frysk prate")
L("S0026L02","I have the feeling that","ik it gefoel ha dat",
  "when I have the feeling that","as ik it gefoel ha dat","M",
  [("when","as"),("I","ik"),("the feeling","it gefoel"),("have","ha"),("that","dat")])
P("S0026L02B01","when I have the feeling that I can speak Frisian","as ik it gefoel ha dat ik Frysk prate kin")
P("S0026L02B02","when I have the feeling that I can say something","as ik it gefoel ha dat ik wat sizze kin")
P("S0026L02B04","I'm going to stop talking when I have the feeling that I must go","ik sil ophâlde mei praten as ik it gefoel ha dat ik gean moat")
P("S0026L02U01","I'm going to try to explain what I mean when I have the feeling that I can remember the whole sentence","ik sil besykje út te lizzen wat ik bedoel as ik it gefoel ha dat ik de hiele sin noch wit")
P("S0026L02U02","I like it when I have the feeling that she's going to come back later on","ik fyn it noflik as ik it gefoel ha dat sy letter weromkomme sil")
P("S0026L02U03","are you going to help me when I have the feeling that I can't speak","silstû my helpe as ik it gefoel ha dat ik net prate kin")
P("S0026L02U04","I'm going to try as hard as I can when I have the feeling that she's going to help me","ik sil hurd myn bêst dwaan as ik it gefoel ha dat sy my helpe sil")
P("S0026L02U05","I like it when I have the feeling that I can remember easily","ik fyn it noflik as ik it gefoel ha dat ik maklik ûnthâlde kin")
P("S0026L02U06","I like it when I have the feeling that we can speak Frisian","ik fyn it noflik as ik it gefoel ha dat wy Frysk prate kinne")
L("S0026L04","I'm nearly ready to go","ik hast klear bin om te gean",
  "that I'm nearly ready to go","dat ik hast klear bin om te gean","M",
  [("that","dat"),("I","ik"),("nearly","hast"),("ready","klear"),("am","bin"),("to go","om te gean")])
P("S0026L04B01","I'm going to say that I'm nearly ready to go","ik sil sizze dat ik hast klear bin om te gean")
P("S0026L04B02","I have the feeling that I'm nearly ready to go","ik ha it gefoel dat ik hast klear bin om te gean")
P("S0026L04B03","I want to say that I'm nearly ready to go","ik wol sizze dat ik hast klear bin om te gean")
P("S0026L04U01","I'm not sure but I have the feeling that I'm nearly ready to go","ik bin der net wis fan mar ik ha it gefoel dat ik hast klear bin om te gean")
P("S0026L04U02","I want to stop talking because I have the feeling that I'm nearly ready to go","ik wol ophâlde mei praten om't ik it gefoel ha dat ik hast klear bin om te gean")
P("S0026L04U03","he wants to come back later on but I'm going to say that I'm nearly ready to go","hy wol letter weromkomme mar ik sil sizze dat ik hast klear bin om te gean")
P("S0026L04U04","I must say that I'm nearly ready to go","ik moat sizze dat ik hast klear bin om te gean")
P("S0026L04U05","I'm going to try to explain that I'm nearly ready to go","ik sil besykje út te lizzen dat ik hast klear bin om te gean")
# --- S27: L03 'too much time | te lang oer' was not a unit; grows to the whole main clause its rows already carry
L("S0027L03","too much time","te lang oer",
  "I don't like taking too much time","ik doch der net graach te lang oer","M",
  [("I don't like taking","ik doch der net graach"),("too much time","te lang oer")])
P("S0027L04B03","nearly ready to answer in Frisian","hast klear om yn it Frysk te antwurdzjen")
P("S0027L04U04","I'm going to do my best to answer in Frisian","ik sil myn bêst dwaan om yn it Frysk te antwurdzjen")
# --- S28
D("S0028L03U06")   # 'om't dû … wolst' lacks the -st clitic after om't
P("S0028L04U03","are you going to try to start talking in Frisian","silstû besykje yn it Frysk te begjinnen mei praten")
# --- S29
P("S0029L02U06","I'm trying to learn and I'm looking forward to talking with people who speak Frisian","ik besykje te learen en ik sjoch dernei út om mei minsken te praten dy't Frysk prate")
P("S0029L04B03","and I'm looking forward to speaking better","en ik sjoch dernei út om better te praten")
P("S0029L04U04","I'm looking forward to speaking better with you","ik sjoch dernei út om better mei dy te praten")
D("S0029L04U05")   # 'to speak better' does not contain the LEGO's English 'speaking better'
# --- S32
P("S0032L03B04","he can show me something","hy kin my wat sjen litte")
for s in sorted(seeds):
    ops.append({"op":"seed.update","seed_number":s,"set":{"approved_at":None}})
json.dump({"ops":ops},open('ops.json','w'),ensure_ascii=False,indent=0)
print(len(ops),'ops; seeds',sorted(seeds))
