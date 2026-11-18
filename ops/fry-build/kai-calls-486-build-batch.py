# Builds the edit-batch for job #486 (Kai's 9 Nov rulings on fry_for_eng 301-668).
# Reads a fresh script-view dump (all.json) so every phrase/lego op carries an `expect` of its current text.
#   python3 ops/fry-build/kai-calls-486-build-batch.py all.json > batch.json
import json,sys
d=json.load(open(sys.argv[1]))
C='fry_for_eng'
legos={}; phrases={}
for s in d['seeds']:
    for l in s['legos']:
        legos[l['lego_id']]=l
        for p in l['phrases']: phrases[p['id'].split(':')[-1]]=p
ops=[]
def L(lid,known,target,comps):
    o=legos[lid]
    ops.append({"op":"lego.update","lego_id":lid,"expect":{"known_text":o['known_text'],"target_text":o['target_text']},
                "set":{"known_text":known,"target_text":target,"components":[{"known":k,"target":t} for k,t in comps]}})
def P(pid,known,target):
    o=phrases[pid]
    ops.append({"op":"phrase.update","phrase_id":f"{C}:{pid}","expect":{"known_text":o['known_text'],"target_text":o['target_text']},
                "set":{"known_text":known,"target_text":target}})
def D(pid):
    o=phrases[pid]
    ops.append({"op":"phrase.delete","phrase_id":f"{C}:{pid}","expect":{"known_text":o['known_text'],"target_text":o['target_text']}})

# ── F1 S0535L04: pronoun "it" for "the wrong job" → seed's own words, object gap (stage-1 shape)
L('S0535L04',"that he wouldn't choose","dat er net kieze soe",[("that","dat"),("he","er"),("not","net"),("to choose","kieze"),("would","soe")])
P('S0535L04C03','not','net'); P('S0535L04C04','to choose','kieze'); P('S0535L04C05','would','soe'); D('S0535L04C06')
W="dat er net it ferkearde wurk kieze soe"; w="that he wouldn't choose the wrong job"
P('S0535L04B01',f"he said {w}",f"hy sei {W}")
P('S0535L04B02',f"I'm sure {w}",f"ik bin der wis fan {W}")
P('S0535L04B03',f"the only real hope was {w}",f"de iennichste echte hoop wie {W}")
P('S0535L04B04',"he said that he wouldn't choose","hy sei dat er net kieze soe")
P('S0535L04U01',f"I couldn't imagine {w}",f"ik koe my net foarstelle {W}")
P('S0535L04U02',f"it's not very likely {w}",f"it is net hiel wierskynlik {W}")
P('S0535L04U03',f"did you hear {w}?",f"hastû heard {W}?")
P('S0535L04U04',f"I didn't know {w}",f"ik wist net {W}")
# knock-on: rows elsewhere that drilled the old LEGO
P('S0564L01U04',f"he promised {w} without your help",f"hy ûnthjitte {W} sûnder dyn help")
P('S0571L01U01',f"I'm not convinced {w}",f"ik bin der net fan oertsjûge {W}")
P('S0587L02B02',f"she used to insist {w}",f"sy stie der eartiids op oan {W}")

# ── F1 S0571L03: dropped "hiel" + overlapped L02 → the frame only; L02 carries "a very good idea"
L('S0571L03',"that would be","dat dat wêze soe",[("that","dat"),("that","dat"),("to be","wêze"),("would","soe")])
P('S0571L03C03','to be','wêze'); P('S0571L03C04','would','soe'); D('S0571L03C05')

# ── F1 S0573L03: pronoun "it" for "the holidays" → seed's own words
L('S0573L03',"that makes the holidays","dat de fakânsje makket",[("that","dat"),("the holidays","de fakânsje"),("makes","makket")])
P('S0573L03C02','the holidays','de fakânsje'); P('S0573L03C03','makes','makket'); D('S0573L03C04')
H="dat de fakânsje hiel bysûnder makket"; h="that makes the holidays very special"
P('S0573L03B01',f"the village {h}",f"it doarp {H}")
P('S0573L03B02',f"the meal {h}",f"it iten {H}")
P('S0573L03B03',f"it's the game {h}",f"it is it spul {H}")
P('S0573L03B04',f"the funny story {h}",f"it grappige ferhaal {H}")
P('S0573L03U01',f"maybe it's the village {h}",f"miskien is it it doarp {H}")
P('S0573L03U02',f"it isn't the game {h}",f"it is net it spul {H}")
P('S0573L03U03',f"I love the village {h}",f"ik hâld fan it doarp {H}")
P('S0573L03U04',f"it's the meal {h} and not the game",f"it is it iten {H} en net it spul")

# ── F1 S0590: L02 dropped "lêste" (and the 9-syllable seed-words cut breaks the cap) → re-cut both LEGOs
L('S0590L01',"leaving the station","fan it stasjon fuortgean",[("from the station","fan it stasjon"),("to leave","fuortgean")])
P('S0590L01C01','from the station','fan it stasjon'); P('S0590L01C02','to leave','fuortgean')
P('S0590L01B01',"we had to leave the station","wy moasten fan it stasjon fuortgean")
P('S0590L01B02',"do you have to leave the station?","moatstû fan it stasjon fuortgean?")
P('S0590L01B03',"I saw the train leaving the station","ik seach de trein fan it stasjon fuortgean")
P('S0590L01U01',"we had to leave the station late at night","wy moasten let yn 'e nacht fan it stasjon fuortgean")
P('S0590L01U02',"I want to leave the station because it's getting late","ik wol fan it stasjon fuortgean om't it let wurdt")
P('S0590L01U03',"they both had to leave the station","sy moasten beide fan it stasjon fuortgean")
P('S0590L01U04',"we can't leave the station without you","wy kinne net sûnder dy fan it stasjon fuortgean")
P('S0590L01U05',"the last bus has to leave the station at six o'clock","de lêste bus moat om seis oere fan it stasjon fuortgean")
L('S0590L02',"I saw the last bus","ik seach de lêste bus",[("I saw","ik seach"),("the last","de lêste"),("bus","bus")])
P('S0590L02C02','the last','de lêste'); P('S0590L02C03','bus','bus')
P('S0590L02B01',"I saw the last bus late at night","ik seach de lêste bus let yn 'e nacht")
P('S0590L02B02',"I was outside and I saw the last bus","ik wie bûten en ik seach de lêste bus")
P('S0590L02B03',"I saw the last bus in the village","ik seach de lêste bus yn it doarp")
P('S0590L02U01',"I saw the last bus because I was outside","ik seach de lêste bus om't ik bûten wie")
P('S0590L02U02',"I saw the last bus leaving and I was a bit sad","ik seach de lêste bus fuortgean en ik wie wat fertrietlik")
P('S0590L02U04',"I saw the last bus leaving without me","ik seach de lêste bus sûnder my fuortgean")
P('S0590L02U05',"I saw the last bus leaving at six o'clock","ik seach de lêste bus om seis oere fuortgean")
P('S0638L01U01',"hold on, I saw the last bus leaving","wachtsje, ik seach de lêste bus fuortgean")

# ── F2 S0491L03: English "that you try" → the seed's "the way you try" (grows over wêrop't, which needs its noun)
L('S0491L03',"the way you try","de manier wêrop'tstû besikest",[("the way in which you","de manier wêrop'tstû"),("try","besikest")])
P('S0491L03C01','the way in which you',"de manier wêrop'tstû")

# ── F2 S0545L03: no LEGO carried "om" → the om … te frame rides with its phrase
L('S0545L03',"to take upstairs","om nei boppen te bringen",[("upstairs","nei boppen"),("to take","om te bringen")])
P('S0545L03C02','to take','om te bringen')
P('S0545L03B02',"there are clean clothes to take upstairs","der binne skjinne klean om nei boppen te bringen")
P('S0545L03B03',"it's your turn to take everything upstairs","it is dyn beurt om alles nei boppen te bringen")

# ── F5 S0490L02 "never … again": English may split so the line reads naturally
P('S0490L02B02',"we could never fall again","wy koene nea wer falle")
P('S0490L02U02',"he can never build a new life for his sister again","hy kin nea wer in nij libben opbouwe foar syn suster")
P('S0490L02U03',"I think she can never open the door again","ik tink dat se de doar nea wer iepenje kin")
P('S0490L02U04',"I'm sure he can never run around the field again","ik bin der wis fan dat er nea wer om it fjild hinne drave kin")
P('S0490L02U05',"they never wanted to fight with each other again","sy woene nea wer mei inoar fjochtsje")
P('S0490L02U06',"your friend said that she could never reach the top again","dyn freon sei dat se nea wer de top berikke koe")
P('S0535L03U08',"then I will never choose the wrong job again","dan sil ik nea wer it ferkearde wurk kieze")

# ── F4 S0427: whole-chunk want-you-to LEGO (literal English, as S0015/S0432), after its pieces (K47)
ops.append({"op":"lego.insert","row":{"seed_number":427,"lego_index":4,"known_text":"they wouldn't like that you think","target_text":"sy woene net graach datstû tinkst","type":"M","is_new":True,
  "components":[{"known":"they wouldn't like","target":"sy woene net graach"},{"known":"that you think","target":"datstû tinkst"}]}})
rows=[("component","C01","they wouldn't like","sy woene net graach"),("component","C02","that you think","datstû tinkst"),
 ("build","B01","they wouldn't like that you think that they're bored","sy woene net graach datstû tinkst dat se har ferfele"),
 ("build","B02","they wouldn't like that you think it's very important","sy woene net graach datstû tinkst dat it hiel wichtich is"),
 ("build","B03","they wouldn't like that you think she was right","sy woene net graach datstû tinkst dat se gelyk hie"),
 ("use","U01","they wouldn't like that you think it will be okay","sy woene net graach datstû tinkst dat it goed komme sil"),
 ("use","U02","they wouldn't like that you think it's something important","sy woene net graach datstû tinkst dat it wat wichtichs is"),
 ("use","U03","they wouldn't like that you think that they won everything","sy woene net graach datstû tinkst dat se alles wûnen"),
 ("use","U04","they wouldn't like that you think that they're not ready yet","sy woene net graach datstû tinkst dat se noch net klear binne"),
 ("use","U05","they wouldn't like that you think he's going to be okay","sy woene net graach datstû tinkst dat it goed mei him komme sil")]
for i,(role,suf,k,t) in enumerate(rows,1):
    ops.append({"op":"phrase.insert","row":{"id":f"{C}:S0427L04{suf}","seed_number":427,"lego_index":4,"position":i,"known_text":k,"target_text":t,
      "word_count":len(t),"lego_count":1 if role=="component" else len(t.split()),"status":"draft","phrase_role":role,"connected_lego_ids":[],"introduce":True,"metadata":{"source":"job-486 Kai F4 9 Nov"}}})
json.dump({"ops":ops},sys.stdout,ensure_ascii=False,indent=1)
