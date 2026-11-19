#!/usr/bin/env python3
"""fra_for_eng item-11 decisions (cs #805), hand-authored per LEGO. PLAN ONLY. Writes fra_for_eng.json for tools/plan.py.
99 scan rows in 25 baskets (the list said 21). Verdicts as in deu_for_eng.py."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import Course
C = Course('fra_for_eng')
D = C.D
P17 = "P17 (every practice phrase under a LEGO contains the whole LEGO)"
CLASH = "Kai 12 Nov (no labels: a would-be clash stays inside the bigger LEGO)"
SHORT = "Kai 17 Nov (shortest LEGO cut: re-cut to the piece the basket drills, rows stay)"
K32 = ("K32 (a formal LEGO keeps sir/madam; in its phrases the LEGO is treated as cut, or as a named core where the seed's "
       "other LEGO carries the rest, and sir/madam is always added back at the end of every phrase on both sides)")
ONE = "One stray row; the rest of the basket holds the LEGO."

D('S0059L03', 'rebuild-rows', why=f"{ONE} B03 'the next | la prochaine' drops 'semaine'; rewritten. {P17}.",
  b={'B03': ('before next week', 'avant la semaine prochaine')})

D('S0067L02', 'rebuild-rows',
  why=f"Two rows say 'tu pourrais t'arrêter' and 'je veux t'arrêter' (a different meaning: stop YOU), not the LEGO 'veux-tu "
      f"t'arrêter'. Rewritten to hold it; the basket had only 1 build + 4 use rows, so two build rows and one use row are added. {P17}.",
  b={'U06': ('do you want to stop now?', "veux-tu t'arrêter maintenant ?"),
     'U07': ('how do you want to stop?', "comment veux-tu t'arrêter ?")},
  add=[('b', 'and do you want to stop?', "et veux-tu t'arrêter ?"), ('b', 'do you want to stop here?', "veux-tu t'arrêter ici ?"),
       ('u', 'do you want to stop or not?', "veux-tu t'arrêter ou pas ?")])

D('S0126L01', 'rebuild-rows',
  why=f"{ONE} U09 'I've got too much work' belongs to another seed and has no 'travail change'; deleted (12 rows stay). {P17}.",
  b={'U09': 'd'})

D('S0147L02', 'recut-small', known='kind', target='gentille', type='A', comps=[],
  why=f"Seven rows drill 'gentille' without the full 'elle a été très gentille'. {SHORT}: 'kind | gentille' is a seed word, "
      f"no other LEGO has 'kind' on its own, so no clash and no duplicate. The rest is covered: 'was | a été' is the seed's "
      f"own first LEGO, 'elle' is taught, and 'very | très' is added back as a not-new LEGO. All ten rows stay. Structural: "
      f"one not-new LEGO appended.",
  extra=[C.notnew(147, 'very', 'très')])

D('S0152L03', 'rebuild-rows',
  why=f"{ONE} U09 'I said that I needed a little more time' has no 'si j'avais su'; deleted (8 rows stay). {P17}.",
  b={'U09': 'd'})

D('S0168L02', 'rebuild-rows',
  why=f"{ONE} U03 uses 'revenir' (to come back), a different verb from the LEGO 'venir'; rewritten. {P17}; K8 (exactly the "
      f"taught form).",
  b={'U03': ('I need to come later', 'je dois venir plus tard')})

D('S0170L01', 'rebuild-rows',
  why=f"Two rows (U09 'I'd like to read my book', U10 'would you like to come with us') drill 'voudrais' alone, not 'je "
      f"voudrais que vous me disiez'; deleted (11 rows stay). LEGO kept at 8 syllables (je-vou-drais-que-vous-me-di-siez): it "
      f"is one subjunctive frame and all 11 other rows drill it whole. {P17}.",
  b={'U09': 'd', 'U10': 'd'})

D('S0246L01', 'rebuild-rows',
  why=f"Seven rows say 'veux qu'elle t'aide' (want) or only 'qu'elle t'aide', not the LEGO's 'voulais qu'elle t'aide'. The "
      f"small piece 'her to help you | qu'elle t'aide' is already taught at seed 204, so a re-cut would only make a not-new "
      f"copy with an unplayed basket. LEGO kept (5 syllables); five rows moved to 'wanted', two deleted (the basket keeps 4 "
      f"build + 7 use). {P17}.",
  b={'B01': ('I wanted her to help you now', "je voulais qu'elle t'aide maintenant"),
     'B02': ('yes I wanted her to help you', "oui je voulais qu'elle t'aide"),
     'B03': ('but I wanted her to help you', "mais je voulais qu'elle t'aide"),
     'U01': ('I wanted her to help you tomorrow', "je voulais qu'elle t'aide demain"),
     'U02': 'd', 'U04': 'd',
     'U05': ('I think I wanted her to help you', "je pense que je voulais qu'elle t'aide")})

D('S0325L04', 'rebuild-rows', why=f"{ONE} B01 'possible | possibles' drops 'problèmes'; rewritten. {P17}.",
  b={'B01': ('the possible problems', 'les problèmes possibles')})

D('S0330L01', 'rebuild-rows',
  why=f"Two rows ask 'penses-tu que ce soit' (do you think it's), not the LEGO 'je ne pense pas que ce soit'; rewritten. LEGO "
      f"kept at 7 syllables (je-ne-pense-pas-que-ce-soit): 'ce soit' only exists after the negative, so the frame is the "
      f"teaching unit. {P17}.",
  b={'U03': ("I don't think it's difficult", 'je ne pense pas que ce soit difficile'),
     'U06': ("I don't think it's useful", 'je ne pense pas que ce soit utile')})

D('S0393L01', 'rebuild-rows', why=f"{ONE} B01 'that | ce' drops 'garçon'; rewritten. {P17}.",
  b={'B01': ('with that boy', 'avec ce garçon')})

D('S0414L06', 'rebuild-rows',
  why=f"Six rows drill 's'il vous plaît' without 'vin rouge'. A re-cut to 'please | s'il vous plaît' would clash with "
      f"'please | s'il te plaît' (seed 624): {CLASH}. LEGO kept (5 syllables); the six rows gain 'rouge'. {P17}.",
  b={'B01': ('the red wine please', "le vin rouge s'il vous plaît"),
     'B02': ('more red wine please', "plus de vin rouge s'il vous plaît"),
     'B03': ('a little red wine please', "un peu de vin rouge s'il vous plaît"),
     'U01': ('could we have some red wine please?', "pourrions-nous avoir du vin rouge s'il vous plaît ?"),
     'U02': ('I would like some red wine please', "je voudrais du vin rouge s'il vous plaît"),
     'U04': ('could we have the red wine please?', "pourrions-nous avoir le vin rouge s'il vous plaît ?")})

D('S0423L02', 'rebuild-rows',
  why=f"Four rows stop at 'poser' without 'une question' (in French 'poser' alone does not mean 'ask'). They gain the "
      f"object. The LEGO itself is unchanged (the checker's note that 'a' is not in the seed is the seed's 'an obvious "
      f"question': same article). {P17}.",
  b={'B01': ('to ask a question now', 'poser une question maintenant'),
     'B03': ('need to ask a question', 'besoin de poser une question'),
     'U02': ('do they need to ask a question?', 'ont-ils besoin de poser une question ?'),
     'U04': ('they also need to ask a question', 'ils ont aussi besoin de poser une question')})

D('S0429L03', 'rebuild-rows', why=f"{ONE} B02 'with them | avec eux' is a different preposition; rewritten. {P17}.",
  b={'B02': ('perfect for them', 'parfait pour eux')})

D('S0431L03', 'rebuild-rows',
  why=f"Six of seven rows drill 'prêts' or 'pas encore prêts' without the full LEGO. 'ready | prêts' would clash with "
      f"'ready | prêt' (seed 345) and 'not ready yet | pas encore prêts' with 'not ready yet | pas encore prêt' (seed 345): "
      f"{CLASH}. LEGO kept at 7 syllables (ils-ne-sont-pas-en-core-prêts); rows rebuilt and two use rows added (the basket "
      f"had only four), the seed sentence among them. {P17}.",
  b={'B01': ("no they're not ready yet", 'non ils ne sont pas encore prêts'),
     'B02': ("but they're not ready yet", 'mais ils ne sont pas encore prêts'),
     'B03': ("they're not ready to leave yet", 'ils ne sont pas encore prêts à partir'),
     'U01': 'k',
     'U02': ("they're not ready yet but they want to leave", 'ils ne sont pas encore prêts mais ils veulent partir'),
     'U03': ("they want to leave but they're not ready yet", 'ils veulent partir mais ils ne sont pas encore prêts'),
     'U04': ("yes but they're not ready yet", 'oui mais ils ne sont pas encore prêts')},
  add=[('u', "they're not ready yet but they'll be ready soon", 'ils ne sont pas encore prêts mais ils seront bientôt prêts'),
       ('u', "I know, they're not ready yet", 'je sais, ils ne sont pas encore prêts')])

D('S0440L03', 'rebuild-rows',
  why=f"Five rows drill 'jeunes' without 'encore'. 'young | jeunes' would clash with 'young | jeune' (seed 69): {CLASH}. "
      f"LEGO kept; rows gain 'encore'. {P17}.",
  b={'B01': ("while they're still young", "pendant qu'ils sont encore jeunes"),
     'B03': ('my friends are still young', 'mes amis sont encore jeunes'),
     'U03': ('I think they are still young', "je pense qu'ils sont encore jeunes"),
     'U04': ('they want to travel because they are still young', "ils veulent voyager parce qu'ils sont encore jeunes"),
     'U05': ('while they are still young they want to travel', "pendant qu'ils sont encore jeunes ils veulent voyager")})

D('S0448L02', 'rebuild-rows',
  why=f"Seven rows drill 'contents' with 'ils sont' or alone. 'happy | contents' would clash with 'happy | content' (seed "
      f"344) and 'happy | heureuse' (seed 408): {CLASH}. LEGO kept (5 syllables); rows rebuilt. U01 'they will be happy' "
      f"keeps (K6). {P17}.",
  b={'B01': ("yes they'll be happy", 'oui ils seront contents'),
     'B02': ("they'll be happy to help", "ils seront contents d'aider"),
     'B03': ("but they'll be happy", 'mais ils seront contents'),
     'U01': 'k',
     'U02': ("they'll be happy to see you", 'ils seront contents de te voir'),
     'U03': ("they'll be happy tomorrow", 'ils seront contents demain'),
     'U04': ("they'll be happy to come", 'ils seront contents de venir'),
     'U05': ("they'll be happy to learn French", "ils seront contents d'apprendre le français")},
  add=[('u', "yes they'll be happy to help", "oui ils seront contents d'aider")])

D('S0457L04', 'recut-small', known='different', target='différentes', type='A', comps=[],
  why=f"Seven rows drill 'différentes' without 'zones'. {SHORT}: 'different | différentes' is a seed word, no other LEGO has "
      f"'different', and 'areas | zones' is already the seed's own LEGO. All nine rows stay.")

D('S0478L03', 'rebuild-rows',
  why=f"Seven rows drill 'gentil' (très gentil, si gentil) without 'un cœur'. 'so kind | si gentil' is not the seed's "
      f"wording ('such a kind heart'), and 'kind | gentil' would clash with 'kind | gentille' (seed 147, this plan): "
      f"{CLASH}. LEGO kept (5 syllables); rows rebuilt. {P17}.",
  b={'B01': ('has such a kind heart', 'a un cœur si gentil'),
     'B02': ('he has such a kind heart', 'il a un cœur si gentil'),
     'B03': ('you have such a kind heart', 'tu as un cœur si gentil'),
     'U01': ('my friend has such a kind heart', 'mon ami a un cœur si gentil'),
     'U02': ('I think she has such a kind heart', "je pense qu'elle a un cœur si gentil"),
     'U03': ('I know he has such a kind heart', "je sais qu'il a un cœur si gentil"),
     'U05': ('she said you have such a kind heart', "elle a dit que tu as un cœur si gentil")})

D('S0481L01', 'rebuild-rows',
  why=f"Eight rows drill 'le seul' with other nouns. 'the only | le seul' would clash with 'the only | la seule' (seed 94): "
      f"{CLASH}. LEGO kept (5 syllables); rows rebuilt. {P17}.",
  b={'B01': ("it's the only real hope", "c'est le seul vrai espoir"),
     'B02': ('the only real hope we have', 'le seul vrai espoir que nous avons'),
     'B03': ('the only real hope here', 'le seul vrai espoir ici'),
     'U01': ("I think it's the only real hope", "je pense que c'est le seul vrai espoir"),
     'U02': ("yes it's the only real hope", "oui c'est le seul vrai espoir"),
     'U03': ("It's the only real hope we have left", "C'est le seul vrai espoir qu'il nous reste"),
     'U04': ("she said it's the only real hope", "elle a dit que c'est le seul vrai espoir"),
     'U05': ("it's the only real hope for them", "c'est le seul vrai espoir pour eux")})

D('S0493L02', 'rebuild-rows',
  why=f"Six rows drill 'ensuite' alone, and two have the German-style gloss 'to arrive next' where the LEGO says 'to come "
      f"next'. 'next | ensuite' would clash with 'next | prochain' (seed 395): {CLASH}. LEGO kept; rows rebuilt, U04/U05 "
      f"English corrected to the LEGO's word. {P17}.",
  b={'B01': ('going to come next', 'va arriver ensuite'),
     'B02': ("it's going to come next", 'ça va arriver ensuite'),
     'B03': ('who is going to come next', 'qui va arriver ensuite'),
     'U01': ("what's going to come next?", "qu'est-ce qui va arriver ensuite ?"),
     'U02': ("do you know what's going to come next?", "sais-tu ce qui va arriver ensuite ?"),
     'U03': ("so what's going to come next?", "alors qu'est-ce qui va arriver ensuite ?"),
     'U04': ("he's going to come next", 'il va arriver ensuite'),
     'U05': ("she's going to come next", 'elle va arriver ensuite')})

D('S0527L04', 'recut-small', known='guess', target='devine', type='A', comps=[],
  why=f"Seven rows drill 'devine' without 'qui'. {SHORT}: 'guess | devine' is a seed word, no other LEGO has 'guess', and "
      f"'qui' is carried by the seed's own LEGO 'who told me | qui m'a raconté'. All eight rows stay.")

D('S0580L03', 'rebuild-rows',
  why=f"Six rows drill 'voulu' with other subjects. 'wanted | voulu' would clash with 'wanted | voulait' (seed 52): {CLASH}. "
      f"LEGO kept at 7 syllables (nous-a-vons-sou-vent-vou-lu); rows rebuilt. U03 'we have often wanted' keeps (K6). {P17}.",
  b={'B01': ("we've often wanted that", 'nous avons souvent voulu ça'),
     'B02': ("we've often wanted to go", 'nous avons souvent voulu aller'),
     'B03': ("we've often wanted to help", 'nous avons souvent voulu aider'),
     'U01': ("we've often wanted to travel", 'nous avons souvent voulu voyager'),
     'U02': ("we've often wanted to take the children", 'nous avons souvent voulu emmener les enfants'),
     'U03': 'k',
     'U04': ("we've often wanted to go somewhere a little warmer", "nous avons souvent voulu aller quelque part d'un peu plus chaud")},
  add=[('u', "we've often wanted to learn French", 'nous avons souvent voulu apprendre le français')])

D('S0615L03', 'rebuild-rows', why=f"{ONE} B01 'j'ai trouvé' drops 'que'; rewritten. {P17}.",
  b={'B01': ('I thought it was', "j'ai trouvé que c'était")})

D('S0644L01', 'rebuild-rows',
  why=f"Eight rows drill 'cela' alone with no 'sir'. {K32}. This seed's other LEGO is 'could you sir? | pourriez-vous "
      f"monsieur ?', so the core here is 'say that | dire cela', and every row ends in 'sir | monsieur'. The checker's 'does "
      f"not contain the LEGO' on these rows is that rule at work. Precedent: the canon's worked case, Italian seed 644.",
  b={'B01': ('to say that sir', 'dire cela monsieur'),
     'B02': ('I think I can say that sir', 'je pense que je peux dire cela monsieur'),
     'B03': ('yes I want to say that sir', 'oui je veux dire cela monsieur'),
     'U01': ('I can say that sir', 'je peux dire cela monsieur'),
     'U02': ('I would like to say that sir', 'je voudrais dire cela monsieur'),
     'U03': ('she wanted to say that sir', 'elle voulait dire cela monsieur'),
     'U04': ('I want to say that sir', 'je veux dire cela monsieur'),
     'U05': ('we all want to say that sir', 'nous voulons tous dire cela monsieur')})

C.write()
