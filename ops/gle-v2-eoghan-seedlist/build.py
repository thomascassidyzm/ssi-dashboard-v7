# Rebuilds the Irish seed list for Eoghan (gle_v2_for_eng) from: base-2026-11-10.csv (the 10 Nov draft, with its
# hand-written notes), the live seed texts (seeds_all.json from Popty GET /api/production/gle_v2_for_eng/seeds),
# and the hand-written notes below for every row that changed since 10 Nov. Writes csv, md and a minimal xlsx.
import csv,json,re,sys,zipfile
from xml.sax.saxutils import escape
live={s['seed_number']:s for s in json.load(open(sys.argv[1]))['seeds']}
old={int(r['Seed']):r for r in csv.DictReader(open('base-2026-11-10.csv'))}
nrm=lambda s: ' '.join(re.sub(r'[^\w ]','',(s or '').lower()).split())
EN="We kept our English (the English sentences are shared by all our courses, so we only change them when the Irish can't follow)."
TA="We use 'tá mé / níl mé' rather than 'táim / nílim'. Both are standard; this matches 'tá tú, tá sé', which learners already have."
MU="We use the verb + 'muid' for 'we' in every tense. The official standard gives it equal status with the one-word forms, and it means one new word for the learner instead of a new verb ending in each tense."
RE="We kept 'réidh' ('ready'): both 'réidh' and 'ullamh' are standard, and 'réidh' is used throughout the course."
AB="We kept 'ábalta' ('able'): both it and 'in ann' are standard, and 'ábalta' is used throughout the course."
CH="We kept 'ba cheart' ('should'): both it and 'ba chóir' are standard."
GT="The English says 'going to', which the course teaches as 'tá … chun'; the future tense is kept for 'will'."
WA="We kept 'want' in the English and used 'mian': 'would like' ('ba mhaith liom') is taught separately."
WC="'want someone to' is 'is mian liom go' + the conditional throughout, as you write it at 171 and 237, so learners meet one pattern."
OK="Ours is correct as far as we know and uses words learners already have, so we kept it. Yours is a nice alternative."
S='Same as yours'; D='Different'; O='Same as one of your options'; P='Pending Kai'
# seed -> (status, why, question). Rows changed in the course since 10 Nov.
N={
12:(D,"We took your 'faoin rud'. We wrote 'a tharlóidh' ('that will happen') rather than 'a tharlófar', which we read as a slip because it is the impersonal form.","Did you mean the impersonal 'a tharlófar' on purpose?"),
15:(D,WC,"Is 'is mian liom go labhrófá Gaeilge liom amárach' natural, or does this one need the future ('go labhróidh tú')?"),
24:(D,EN+" We added your 'air sin' ('that'). We kept 'Ní bheidh mé ábalta', because the course already teaches those pieces.",""),
25:(D,EN+" We took 'dul' for 'go', as you use it. "+GT,""),
26:(D,"We took your 'le dul'. "+RE+" We kept 'a bheith ag mothú' for 'feeling', which is how this seed teaches it.",""),
30:(S,"",""),
41:(D,TA,""),
43:(S,"",""),
46:(D,"We took your 'ní bhím buartha'. We kept 'a dhéanamh' at the end because the English says 'making mistakes'.",""),
60:(D,"We took your fix: singular 'focal éagsúil' after 'go leor'. We kept 'go leor' and 'fós' rather than 'dóthain' and 'go fóill': both pairs are standard and the course uses ours throughout.",""),
67:(D,"We wrote 'ar mian' rather than 'an mian'.","Should it be 'Cén fáth ar mian leat stopadh?' (we think 'an' was a slip)?"),
69:(D,"We kept 'an tráthnóna ar fad' for 'all afternoon'.","Is 'an tráthnóna ar fad' fine for 'all afternoon', or does it need 'um tráthnóna'?"),
71:(S,"",""),73:(S,"The course teaches this in two pieces: first 'thank you | go raibh maith agat', then 'thank you very much | go raibh míle maith agat'.",""),74:(S,"",""),
77:(D,"We added your object ('tuiscint á fáil agam air'). We kept our opening 'Tá ionadh orm' rather than 'Cuireann sé ionadh orm', because 'Tá ionadh orm' is already taught as a piece that later seeds build on. We kept 'tapa'.","You write 'ionadh' here and 'iontas' at seed 130 for 'surprise'. Could one of them serve in both places?"),
92:(S,"",""),
93:(O,"We took your first option, 'in am dul'. 'imeacht' is now kept for 'leave'.",""),
97:(D,"We took your 'le dul'. "+RE,""),
99:(D,"We took your 'ceist a chur ort féin'. "+CH+" We kept 'cén fáth' for 'why', the form the course teaches for 'why' everywhere, rather than 'faoin bhfáth'.","Is 'ceist a chur ort féin cén fáth nach bhfuil sé ag obair' acceptable?"),
100:(D,CH+" We kept 'duit a bheith buartha', built from pieces already taught.",""),
111:(D,MU+" We kept 'athraíonn sé' ('it changes') to follow the English; your 'athraítear' is the passive.",""),
113:(D,"We took your 'an rud a dúirt tú' ('what you said'). We kept 'cuimhneamh ar', the form the course teaches for 'remember' from seed 6 onwards.",""),
115:(D,RE+" We kept 'fós' ('yet'); 'go fóill' is equally good.",""),
119:(D,"We took your 'ceist a chur ort'. We used 'faoi' rather than 'maidir le', as you do at seeds 30 and 609, so that 'about' has one Irish form for the learner; our English is now 'can I ask you about something before you leave?'. We kept 'imeacht' for 'leave'; you mention 'fág' is also fine.","Is 'ceist a chur ort faoi rud éigin' as natural as your 'maidir le rud éigin'?"),
122:(S,"",""),
141:(S,"",""),
142:(D,TA+" We took your 'cineálta' for 'kind', inside the sentence shape the course already teaches ('Tá sé sin … uait'). We kept 'as cabhrú' ('for helping').","Is 'Tá sé sin an-chineálta uait' natural for 'that's very kind of you'?"),
147:(D,"We took your 'cineálta'. We kept the plain 'bhí sí …' shape, 'chonaic' ('saw') and 'neirbhíseach', which learners already have.",""),
148:(D,EN+" We added your 'liom' and 'dó'. We kept 'an-fhoighneach' ('very patient') because the course already teaches that piece. "+AB,""),
151:(D,"We took your 'go dtarlódh'. We kept 'Ní hé sin…' for 'That wasn't what…'.","Is 'Ní hé sin a raibh mé ag súil go dtarlódh' correct, or do you prefer your 'Ní mar sin…'?"),
152:(D,"We took your plain conditional ('Dhéanfainn'). We kept 'ar bhealach difriúil' and 'dá mbeadh' (your own note at 606 gives 'Dá mbeadh').","Is 'Dhéanfainn é ar bhealach difriúil' (with 'é' straight after the verb) acceptable?"),
153:(D,"We took your plain conditional ('Ní déarfainn'). We kept 'ar an mbealach céanna'.","For 'the way' you use 'slí' (94, 122, 408), 'bealach' (152, 327, 607) and 'caoi' (153, 208, 491). Could one word serve in all of them, and which?"),
159:(D,TA+" We kept 'Ní hé sin atá…' without 'an rud'.",""),
168:(D,EN+" "+AB,""),
169:(D,EN+" "+WA+" "+WC,"Is 'cad is mian leat go ndéanfainn?' correct for 'what do you want me to do?'"),
172:(S,"",""),
173:(D,"We wrote 'Ní mian' without the h, which we read as a slip. Otherwise this is yours.",""),
175:(D,"We kept 'Dé' before the day name; both ways are fine.",""),
176:(D,AB,""),
177:(D,EN+" "+WA,""),
183:(D,EN+" We took your echo answer 'Ní fhaca'. We kept 'tá brón orm' for 'I'm afraid' and 'ní fhaca mé iad' for 'I haven't seen them'.",""),
189:(D,EN+" We took your 'Is ea'.",""),
204:(D,EN+" "+WC,""),
211:(D,"We use 'dúirt siad' rather than 'dúradar', to match 'siad' everywhere else.",""),
232:(D,"We took your 'a bheidh'. "+AB+" We kept 'cuimhneamh ar', the form the course teaches for 'remember'.","Should 'sheanbean' be 'sheanbhean'?"),
235:(D,EN+" We use 'mian' for 'wanted' ('gur mhian leis').",""),
236:(D,EN+" "+GT,""),
237:(S,"",""),
238:(D,"Your version changes the meaning: in the English, he wanted YOU to tell me. So we kept 'go n-inseofá'.",""),
243:(D,EN+" "+GT,""),
246:(D,"We kept 'go gcabhródh sí leat', which uses 'cabhrú' as the course teaches it. Yours is a nice alternative.",""),
249:(D,EN+" We took your 'sula rachaidh tú'. "+WC,""),
250:(S,"",""),
251:(D,EN+" We wrote 'Ní mian' without the h. We kept 'fáil amach' and 'go dtí tar éis dúinn críochnú', pieces the learner already has.",""),
267:(D,OK,""),
269:(D,"Your version drops 'want'. We kept 'nach mian leat'.",""),
270:(S,"",""),
272:(D,EN+" We took your 'Ba mhaith'. We kept 'sin smaoineamh iontach'.",""),
273:(D,"We took your 'Níor mhaith'. We kept 'tá an iomarca oibre agam' ('I've got too much work'), without 'le déanamh'.",""),
276:(S,"",""),277:(S,"",""),
295:(D,EN+" 'want' is 'is mian liom' (and its forms) throughout, as you suggested.",""),
299:(D,OK,"You write 'íoc as' here and at 508 and 509. Is 'leath den chostas a íoc' wrong without 'as'?"),
317:(D,"We kept 'dá mba mhian léi' for 'if she wanted to'; 'más mian léi' is 'if she wants to'.",""),
318:(D,EN+" "+OK,""),
328:(D,CH,"For 'find' you use 'aimsiú' (17, 327, 328, 460, 559) and 'fáil' (66, 510, 514). Could 'aimsiú' serve at 66 and 514 too?"),
337:(S,"Thank you for the note on imirt / seinnt / súgradh.",""),
342:(S,"",""),343:(S,"",""),352:(S,"",""),353:(S,"",""),354:(S,"",""),355:(S,"",""),367:(S,"",""),
380:(D,EN+" "+WA+" We kept 'cad' for 'what'.",""),
381:(D,EN+" Your version changes the meaning ('they intended'). We kept 'ar mhian leis'.",""),
382:(D,EN+" "+WA,""),
393:(D,"We took your 'uaine'. We kept 'sin', because the English says 'that boy'.",""),
405:(D,CH+" "+MU,""),
408:(D,"We took your 'teaghlach'. Our question at 407 is 'nár cheart…?', so the answer echoes it with 'Ba cheart'. We kept 'bealach' and 'a dhéanamh' ('to make').",""),
409:(D,"The answer echoes 'nár cheart…?' at 407. "+MU,""),
412:(D,MU,""),413:(D,MU,""),414:(D,EN+" "+MU,""),
419:(D,EN+" "+WC,""),
420:(D,EN+" "+OK,""),
432:(D,EN+" (Your version changes the English.) "+WC,""),
435:(D,"We use 'mian' for 'want' ('dá mba mhian leo').",""),
470:(D,EN+" "+WA+" "+MU,""),
491:(D,EN+" 'try' is 'iarracht a dhéanamh' throughout, as you suggested. We kept 'is breá liom'.",""),
508:(S,"",""),510:(S,"",""),
520:(D,"We took your 'teaghlach'. We kept 'a bheith tarlaithe'.",""),
527:(S,"",""),
542:(D,EN+" We took your 'bíonn fearg ort'.","Should it be 'aon uair a mbíonn fearg ort' or 'aon uair a bhíonn fearg ort'?"),
548:(D,"You suggested 'Tá brón orm faoi láthair'. This course already uses 'Tá brón orm' for 'I'm sorry' (seeds 139, 140, 183 and 193), so we couldn't also use it for 'I'm sad'. We used 'Tá mé brónach faoi láthair'.","Is 'Tá mé brónach faoi láthair' natural to you?"),
557:(S,"",""),
563:(D,AB,""),564:(D,AB,""),
565:(D,"We took your plain conditional. We kept 'smaoineamh' ('think'), which learners already have; 'machnamh' is a nice alternative.",""),
566:(D,"We took your plain conditional. We kept 'smaoineamh' ('think'), which learners already have; 'machnamh' is a nice alternative.",""),
568:(D,TA+" "+MU+" We kept 'ag súil le feabhas a fheiceáil'.",""),
569:(D,"We took your 'toilteanach'. We kept 'cé mhéad' for 'how much'.",""),
570:(D,"We took your 'toilteanach'.","Is 'a íoc ar do thicéad' wrong for 'pay for your ticket'? You wrote 'i leith do thicéid', and 'íoc as' elsewhere."),
577:(S,"",""),
581:(D,"We took your 'eolais' fix and kept 'beagán'.",""),
593:(D,EN+" "+OK,""),
597:(D,EN+" We took your 'na céadta scéal'. We kept 'Is é mo thuairim', as at 318.",""),
598:(S,"",""),
599:(D,"We took your plain conditional. We kept 'sásta' for 'happy', which the course uses throughout.","You note at 344 that 'sásta' means 'satisfied'. Is 'Bheinn sásta tiomáint' wrong for 'I'd have been happy to drive'?"),
600:(S,"",""),
606:(D,EN+" We took your plain conditional, and 'dá mbeadh' as in your own note.",""),
607:(D,EN+" We took your plain conditional, with 'dá mbeadh' as in your note at 606.",""),
609:(S,"",""),
611:(D,RE,""),
612:(D,MU,""),
613:(D,MU+" We kept 'is dócha' for 'probably'.","You note that 'is dócha' is 'I suppose'. What would you say for 'probably' here?"),
614:(D,"We took your 'teaghlach' and 'ina chónaí'. We kept 'in aice leis an áit a bhfuil'.",""),
643:(D,"'want' is 'is mian' throughout, as you suggested elsewhere.",""),
665:(D,"We kept 'ar fad' for 'you all': both it and 'uile / go léir' are standard, and 'ar fad' is used consistently.",""),
}
# Unchanged rows whose note needed fixing, and rows waiting for Kai (unruled items from the #228 report).
FIX={139:(None,"We use 'imeacht' for 'leave'; you mention either is fine.",None),
 330:(D,"'Níl' answers the statement 'Tá sé tábhachtach' at 329, and you kept 'Níl' too. We kept 'an-tábhachtach'.",""),
 531:(None,None,"For 'nobody / anything' you use 'ar bith' in some seeds (141, 146, 202) and 'aon' in others (35, 71, 267). Is there a rule we can follow, or are they interchangeable?")}
PEND=[13,53,618,538,199,371,575,576,132,511,395,619,620,522,261,127,138,562,104,186,531,146,433,434,315,659,384,139,285,22,297,390,154,112,399,150,344,281,494,533,27,55,120,121,239,240,456]

# Job #253 (11 Nov, later): Kai's standing rulings applied to the 24 seeds that were waiting, plus 105.
YO="Otherwise this is yours."
N.update({
104:(D,MU+" "+YO+" ('caithfinid' and 'ata' read as typing slips.)",""),
105:(S,"",""),
127:(D,EN+" We took your 'an chúis'. 'wanted' is 'mian' throughout the course (past 'ba mhian', here 'ar mhian'), and we kept 'to see you'.","Is 'Ní hé sin an chúis ar mhian liom tú a fheiceáil' correct for 'that isn't why I wanted to see you'?"),
132:(S,"","You wrote 'chomh hiontach' for 'as exciting'. The course teaches 'iontach' as 'great' (seeds 90, 272). Is there a closer word for 'exciting', or is 'iontach' what you would say?"),
138:(D,EN+" 'wanted' is 'mian' throughout the course, so we wrote 'ar mhian le mo chara' in your sentence shape.","Is 'seo an áit ar mhian le mo chara bualadh linn' correct for 'this was where my friend wanted to meet us'?"),
146:(D,MU+" "+YO,""),
186:(D,EN+" "+WA+" We took your 'éagsúil', here and in every 'something different' in the course.",""),
199:(S,"Thank you for the note on 'fadó'; it is gone from the course.",""),
261:(S,"We spelt it 'b'fhéidir', as you do at 456.",""),
27:(None,None,"You write 'taitin' for 'like' here and at 55, 120, 121, 239 and 240, and 'is maith le' at 26, 257, 288 and 628. Is 'is maith liom' + a verb wrong for 'I like doing', or only less natural?"),
315:(S,"",""),
371:(S,"",""),
395:(D,MU+" We took your 'ag an gcéad choirnéal eile'.",""),
433:(S,"",""),434:(S,"",""),
511:(S,"",""),522:(S,"",""),
531:(S,"",None),
538:(D,"We wrote 'Ní mian' without the h, which we read as a slip. "+YO+" Our English is now 'I don't want you to think that I don't care'.",""),
562:(D,"We took your first option. We left out the second 'ach' and spelt it 'shroicheadh'.","Is 'Níl ann ach gur mian liom an áit a shroicheadh slán sábháilte' right, or did you mean the second 'ach' to stay?"),
575:(S,"",""),
576:(D,MU+" "+YO+" Our English follows yours.",""),
618:(S,"We wrote 'I mo thuairim' ('mó' read as a typing slip).",""),
619:(D,MU+" "+YO,""),
620:(D,MU+" "+YO,""),
659:(D,"We took your 'Arbh fhéidir libh'. We kept 'ar fad' for 'you all', as at 529 and 656 to 667: both it and 'uile' are standard, and 'ar fad' is used throughout.",""),
})
DONE253={618,538,199,371,575,576,132,511,395,619,620,522,261,127,138,562,104,186,531,146,433,434,315,659}
# Job #253 follow-up on the clash forecast #251: his majority form where his own rows differ; 433/434 not applied;
# the keep-ours style choices (an fáth, Dé + day, a bhaint amach) left as ours until Kai rules.
FD="Not changed yet: 'níorbh fhéidir leo / arbh fhéidir leo' would give 'could / couldn't' a second form (311 is 'ní fhéadfadh sé'), and 435 answers 434 with 'd'fhéadfadh'."
N.update({
105:(D,"We kept 'an fáth' for 'the reason / why', as in 'cén fáth'.",""),
127:(D,EN+" 'wanted' is 'mian' throughout the course (past 'ba mhian', here 'ar mhian'), and we kept 'to see you'. We kept 'an fáth', as at 105.","Is 'Ní hé sin an fáth ar mhian liom tú a fheiceáil' correct for 'that isn't why I wanted to see you'?"),
146:(D,MU+" We wrote 'ag obair' for 'working', as you do at 99 ('nach bhfuil sé ag obair'), so that a thing 'working' has one form. "+YO,"You write 'ag obair' at 99 and 'ag feidhmiú' at 146 for a thing that is working. Can 'ag obair' serve in both?"),
371:(D,"We took your 'chun scannán a fheiceáil'. We kept 'Dé' before the day name; both ways are fine.",""),
433:(P,FD,""),434:(P,FD,""),
562:(D,"We took your second option ('mo cheann scríbe a bhaint amach'), without the second 'ach'.","Is 'Níl ann ach gur mian liom mo cheann scríbe a bhaint amach slán sábháilte' right, or did you mean the second 'ach' to stay?"),
659:(D,"We kept 'an bhféadfadh sibh': you write 'could' with 'féad-' in most seeds (311 to 314, 358, 412 to 414, 435, 644), so we use that form throughout. We kept 'ar fad' for 'you all'.","'couldn't' is 'ní fhéadfadh' at 311 and 'níorbh fhéidir leo' at 433; 'could' is 'an bhféadfadh' at 358 and 'arbh fhéidir' at 434 and 659. Can it be the 'féad-' form throughout?"),
})
DONE253-={433,434}
PEND=[n for n in PEND if n not in DONE253]

# Job #403 (12 Nov): Kai's rulings on the 15 open questions (d/7e7ff563), applied to the course. Only the 'taitin' seeds still wait.
HV="For 'speaks Irish' we now say 'tá Gaeilge ag' in every seed (9, 13, 22, 283, 285, 297), following your 13 and 22. Our English still says 'speak'."
HP="We took your point that 'sásta' is 'satisfied': 'happy' is now 'áthas ar' in every seed (76, 106, 129, 145, 187, 245, 344, 448, 599), and 'happy with' is 'áthas … as'."
FQ="'couldn't' is 'ní fhéadfadh' at 311 and 'níorbh fhéidir leo' at 433; 'could' is 'an bhféadfadh' at 358 and 'arbh fhéidir' at 434 and 659. Can it be the 'féad-' form throughout?"
N.update({
9:(D,HV,"Is 'Tá beagán Gaeilge agam anois' right for 'I speak a little Irish now'?"),
13:(S,HV,""),
14:(None,None,"We kept 'an labhraíonn tú Gaeilge an lá ar fad?' here because it is about the act of speaking all day, not about being able to speak. Is that right, next to 'Tá Gaeilge agat'?"),
22:(S,HV,""),
283:(D,HV,"Is 'cé acu de do chairde a bhfuil Gaeilge acu?' right?"),
285:(D,"We took the form you name as the usual one, 'Tá Gaeilge aici'. "+HV,""),
297:(D,"We took your second version and kept 'daoine'. "+HV,"Is 'ar mhórán daoine a bhfuil Gaeilge acu' right with 'daoine' kept?"),
76:(S,HP,""),
106:(D,MU+" The course uses 'caithfidh' for 'need to'. "+HP,"Is 'Ní chaithfidh muid áthas a bheith orainn' correct for 'we don't need to feel happy'?"),
129:(D,HP+" We kept our 'ag déanamh chomh maith sin' for 'doing so well'.","Is 'Tá an-áthas orm go bhfuil tú ag déanamh chomh maith sin' natural, or does 'doing so well' need 'ag éirí go maith leat'?"),
145:(S,HP,""),
187:(S,HP,""),
245:(D,HP+" We kept 'in am gearr'.","Is 'in am gearr' acceptable here, or should it be 'in achar gearr'?"),
344:(S,HP,""),
448:(D,EN+" "+HP,""),
599:(D,HP+" We left out 'an-' so that 'happy' and 'very happy' stay apart for the learner.",""),
107:(D,"We took your 'á dhéanamh agat' form. We kept 'bhí muid ag súil le' and 'cad a' for 'what', which the course teaches.","Is 'bhí muid ag súil le feiceáil cad a bhí á dhéanamh agat' correct?"),
174:(S,EN,""),
281:(D,EN+" The English is 'do you mind', so we kept 'an miste leat'. We took your 'sula dtosóidh tú'.",""),
494:(S,EN,""),
533:(S,EN,""),
384:(S,"",""),
390:(S,"",""),
391:(None,None,"You write 'an té' at 390 and 'an duine' here, both for 'the one who'. Should this one be 'an té atá ag siúl' too?"),
399:(D,EN+" "+WA+" We took your 'ár misneach'.",""),
154:(D,EN+" "+WA+" We kept 'leat', for one person, and took your 'oíche' without 'Dé'.","Is 'leat' fine for one person? And is the spelling 'oíche Shathairn' right?"),
215:(D,"We took your 'oíche' without 'Dé', spelt 'oíche Shathairn' as at 154.",""),
150:(S,"",""),
53:(D,"Thank you for the point about 'a litir'. We kept 'a litir' so that the learner does not meet a new mutation here.",""),
112:(D,"Thank you for the idiom. We kept the plainer 'ní raibh mé ag súil leis', which follows the English.","Are you OK with 'ní raibh mé ag súil leis'? We can put 'tháinig sé aniar aduaidh orm' in the listening exercises."),
139:(D,"We use 'imeacht' for 'leave' in every seed; you mention either is fine.","Would you prefer 'fág' for 'leave' throughout? We would switch all of them."),
119:(None,None,"Is 'faoi' OK here, or does it need 'maidir le'?"),
99:(None,None,"Is 'faoin bhfáth' needed, or is 'ceist a chur ort féin cén fáth nach bhfuil sé ag obair' acceptable?"),
433:(D,"We kept 'ní fhéadfadh siad': you write 'could' with 'féad-' in most seeds (311 to 314, 358, 412 to 414, 435, 644), and 435 answers 434 with 'd'fhéadfadh'.",FQ),
434:(D,"We kept 'an bhféadfadh siad': you write 'could' with 'féad-' in most seeds, and 435 answers 434 with 'd'fhéadfadh'.",FQ),
456:(O,EN+" Ours matches your first option.",""),
})
FIX.pop(139,None)
# Job #403, K1-K14 (Kai's rulings on the keep-ours style list, 12 Nov): we now follow you on enough / a lot / many, yet / still,
# instead of, able, should, the reason, a short time, take time, reach, group, go deas / go hálainn and Sunday. The stale "we kept" notes
# are removed below (KSTALE) and a row whose Irish now equals yours is marked Same.
N.update({
137:(None,None,"You write 'seachas' for 'than' here and for 'despite' at 593. 'than' is 'ná' in every other seed (42, 87, 117). Can we keep 'ná' for 'than' and use 'seachas' only for 'instead of' (502, 523)?"),
593:(None,None,"Your 'Seachas m'argóintí go léir' uses 'seachas' for 'despite'. We use 'seachas' for 'instead of' (502, 523). Is there another way to say 'however much I argued' so that 'seachas' keeps one meaning?"),
649:(None,None,"You wrote 'réidh' here and 'ullamh' in the other 'ready' seeds. We use 'réidh' throughout because it is taught early and is easy. Is 'réidh' fine in every one of them?"),
475:(D,"We use 'mórán' for 'many' in every seed (103, 297, 475) and 'a lán' for 'a lot'.","Is 'Tá mórán cúiseanna ann' fine for 'there are many reasons', or does a positive sentence need 'a lán'?"),
562:(D,"We took your first option, 'an áit a shroicheadh', without the second 'ach'.","Is 'Níl ann ach gur mian liom an áit a shroicheadh slán sábháilte' right, or did you mean the second 'ach' to stay?"),
374:(None,None,"You write 'go hálainn' here; we kept 'an-álainn' because the English says 'very beautiful'. Is 'go raibh sé an-álainn' right?"),
})
PEND=[n for n in PEND if n in (27,55,120,121,239,240)]   # 'taitin': held for Eoghan's answer at seed 27
import os,glob
KSEEDS=set()
for f in glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','gle-v2-403','decisions-k*.json')): KSEEDS|={int(x) for x in json.load(open(f))['seeds']}
KSTALE=[r"We kept 'ábalta' \('able'\)[^.]*\.",r"We kept 'ba cheart' \('should'\)[^.]*\.",r"We kept 'go leor' \('enough / a lot'\)[^.]*\.",r"We kept 'fós' \('yet'\)[^.]*\.",
 r"We kept 'go leor' and 'fós'[^.]*\.",r"'am a thógáil' is used throughout the course\.",r"We kept 'an fáth' for 'the reason / why', as in 'cén fáth'\.",r"We kept 'an fáth', as at 105\.",r"We kept 'in am gearr'\.",
 r"We kept 'Ní bheidh mé ábalta', because the course already teaches those pieces\.",r"We took your second option \('mo cheann scríbe a bhaint amach'\), without the second 'ach'\."]
def his_main(t): return nrm(re.split(r"\s*[\(\[/]",t.strip())[0])
rows=[];unnoted=[]
for n in sorted(old):
    r=dict(old[n]); s=live[n]
    changed = nrm(r['Irish now (our draft)'])!=nrm(s['target_text']) or nrm(r['English (ours)'])!=nrm(s['known_text'])
    r['English (ours)']=s['known_text']; r['Irish now (our draft)']=s['target_text']
    if n in N:
        st,w,q=N[n]
        if st is not None: r['Same as yours?']=st
        if w is not None: r['Why we differ']=w
        if q is not None: r['Our question for you']=q
    elif changed and n not in KSEEDS: unnoted.append(n)
    if n in FIX:
        st,w,q=FIX[n]
        if st: r['Same as yours?']=st
        if w is not None: r['Why we differ']=w
        if q is not None: r['Our question for you']=q
    w0=r['Why we differ']
    for rx in KSTALE: w0=re.sub(rx,'',w0)
    if ' Dé ' not in ' '+s['target_text']+' ': w0=w0.replace("We kept 'Dé' before the day name; both ways are fine.",'')
    r['Why we differ']=' '.join(w0.split())
    if n in KSEEDS and r['Same as yours?']==D and his_main(r['Your Irish'])==nrm(s['target_text']) and not r['Your English (only if different)'].strip(): r['Same as yours?']=S; r['Why we differ']=''
    elif r['Same as yours?']==D and not r['Why we differ'] and his_main(r['Your Irish'])==nrm(s['target_text']): r['Same as yours?']=S
    if n in KSEEDS and re.search(r"in am gearr|after 'go leor'",r['Our question for you']+r['Why we differ']):
        if 'in am gearr' in r['Our question for you']: r['Our question for you']=''
        r['Why we differ']=r['Why we differ'].replace("We took your fix: singular 'focal éagsúil' after 'go leor'.",'').strip()
    if n in PEND: r['Same as yours?']=P
    if r['Same as yours?']==S: r['Your English (only if different)']=r['Your English (only if different)'] if nrm(r['Your English (only if different)'])!=nrm(s['known_text']) else ''
    rows.append(r)
assert not unnoted, unnoted
H=list(rows[0].keys())
w=csv.writer(open('irish-seed-list-for-eoghan.csv','w',newline='')); w.writerow(H); [w.writerow([r[h] for h in H]) for r in rows]
from collections import Counter
cnt=Counter(r['Same as yours?'] for r in rows); qs=[r for r in rows if r['Our question for you']]
print(cnt,len(qs))
# minimal xlsx: inline strings, header bold, yellow = Different, pink = Pending Kai, green = has a question
def col(i): return chr(65+i)
FILL={D:2,P:3}
sheet=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="6" customWidth="1"/><col min="2" max="5" width="42" customWidth="1"/><col min="6" max="6" width="16" customWidth="1"/><col min="7" max="8" width="60" customWidth="1"/></cols><sheetData>']
def cell(ci,ri,v,st): return f'<c r="{col(ci)}{ri}" t="inlineStr" s="{st}"><is><t xml:space="preserve">{escape(str(v))}</t></is></c>'
sheet.append('<row r="1">'+''.join(cell(i,1,h,1) for i,h in enumerate(H))+'</row>')
for ri,r in enumerate(rows,2):
    base=FILL.get(r['Same as yours?'],5)
    sheet.append(f'<row r="{ri}">'+''.join(cell(i,ri,r[h],4 if (h=='Our question for you' and r[h]) else base) for i,h in enumerate(H))+'</row>')
sheet.append('</sheetData></worksheet>')
styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2A8"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFD1DC"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC8F0C8"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="6"><xf/><xf fontId="1" applyFont="1"><alignment wrapText="1" vertical="top"/></xf><xf fillId="2" applyFill="1"><alignment wrapText="1" vertical="top"/></xf><xf fillId="3" applyFill="1"><alignment wrapText="1" vertical="top"/></xf><xf fillId="4" applyFill="1"><alignment wrapText="1" vertical="top"/></xf><xf><alignment wrapText="1" vertical="top"/></xf></cellXfs></styleSheet>'
z=zipfile.ZipFile('irish-seed-list-for-eoghan.xlsx','w',zipfile.ZIP_DEFLATED)
z.writestr('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>')
z.writestr('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
z.writestr('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Seeds 1-668" sheetId="1" r:id="rId1"/></sheets></workbook>')
z.writestr('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
z.writestr('xl/styles.xml',styles); z.writestr('xl/worksheets/sheet1.xml',''.join(sheet)); z.close()
json.dump({'counts':cnt,'questions':[(r['Seed'],r['English (ours)'],r['Irish now (our draft)'],r['Our question for you']) for r in qs],'pending':[(r['Seed'],r['English (ours)'],r['Irish now (our draft)'],r['Your Irish']) for r in rows if r['Same as yours?']==P]},open('summary.json','w'),ensure_ascii=False,indent=1)
