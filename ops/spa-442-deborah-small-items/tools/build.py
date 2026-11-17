import json,glob,os,sys
S=os.environ['CS_SCRATCH']
rows={}
for f in glob.glob(S+'/b_*.json'):
    for p in json.load(open(f))['phrases']: rows[p['id'].split(':')[1]]=p
E=[ # id, item, new_known (None=same), new_target (None=same), note
("S0206L02U03","1",None,"Disfruto teniendo la oportunidad de hablar contigo porque aprendemos mucho",""),
("S0206L02U09","1",None,"Disfruto teniendo esta oportunidad de practicar aunque es difícil de vez en cuando","4th disfrutar+inf row found in the same basket (not on #430's list); same fix"),
("S0214L02U06","1",None,"Disfruto hablando contigo el fin de semana",""),
("S0110L03U11","1",None,"Sé que necesito relajarme pero me es difícil parar cuando estoy disfrutando aprendiendo mucho","one-word change"),
("S0567L03B03","2",None,"me encanta ver a los niños jugar","ver taught S0107L02; me encanta S0491L01"),
("S0567L03B04","2","I'm watching the children play","estoy viendo a los niños jugar","fragment rewritten, not deleted: deleting both fragments would leave L03 at 2 BUILD (floor 3)"),
("S0567L03U03","2",None,"ha sido estupendo ver a los niños jugar",""),
("S0515L01U04","3","the first day of the challenge was good","el primer día del desafío fue bueno","rewritten not deleted: L01 has 4 USE, floor 5; desafío taught S0484L01"),
("S0515L01U05","3","on the first day of the month","el primer día del mes","rewritten not deleted (floor); mes taught S0037L04"),
("S0535L02B03","3","he wouldn't choose that","no elegiría eso","rewritten not deleted: L02 BUILD would fall to 2 (one a duplicate)"),
("S0535L01U04","4","she made a promise that it would be different","hizo la promesa de que sería diferente","rewritten not deleted: L01 has 3 USE (floor 5); own choice"),
("S0480L01U01","5",None,"diga lo que diga, ella sabe más","English 'she knows better' kept"),
("S0537L01U04","5",None,"pero estaba equivocado en todo",""),
("S0619L01U06","5","we don't see each other any more","ya no nos vemos","English moved to 'any more': 'any longer' is taught as por más tiempo (S0563L03), 'not any more' as ya no (S0145L01)"),
("S0144L01U06","6","I woke up this morning with the idea that I want to practise more","Me desperté esta mañana con la idea de que quiero practicar más",""),
("S0213L01U09","6","He told me I shouldn't explain anything about it",None,"English only"),
("S0647L01U05","6","I know that you speak it","sé que lo habla",""),
("S0662L01U03","6","I know that you all speak it","sé que lo habláis",""),
("S0427L01C01","7","you to think",None,"English only; the LEGO row itself still says 'you thought' (not touched)"),
("S0133L01U05","9",None,"Cuando llegas a conocer a alguien nuevo puede ser menos emocionante de lo que pensabas",""),
]
for pid in ["B02","B05","U04","U06","U07","U09","U10","U11","U15"]:
    i="S0231L02"+pid; k=rows[i]['known_text']
    E.append((i,"8",k.replace("elderly","old"),None,"English only" + ("; not one of the 7 'ese' rows but same basket, same word" if pid in("B02","U10") else "")))
D=[("S0567L03B02","2","fragment 'estoy seguro de que viendo…'"),("S0550L01B03","3","camino before S0559; B stays at 3"),
   ("S0535L01B02","4","exact duplicate of B01 (same clips)"),("S0197L03U10","4","'trabaja en el idioma'"),
   ("S0150L03U02","6","'recordar ahora'"),("S0623L01U07","6","'teníamos té'")]
dec={"edits":[],"deletes":[]}
for i,it,nk,nt,note in E:
    p=rows[i]; dec["edits"].append({"id":i,"item":it,"old_known":p['known_text'],"old_target":p['target_text'],
      "new_known":nk if nk is not None else p['known_text'],"new_target":nt if nt is not None else p['target_text'],
      "known_changed":nk is not None and nk!=p['known_text'],"target_changed":nt is not None and nt!=p['target_text'],"note":note,
      "old_audio":{"known":p['known_audio_id'],"target1":p['target1_audio_id'],"target2":p['target2_audio_id']}})
for i,it,note in D:
    p=rows[i]; dec["deletes"].append({"id":i,"item":it,"old_known":p['known_text'],"old_target":p['target_text'],"note":note})
json.dump(dec,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
print(len(dec['edits']),len(dec['deletes']), sum(e['known_changed'] for e in dec['edits']), sum(e['target_changed'] for e in dec['edits']))
