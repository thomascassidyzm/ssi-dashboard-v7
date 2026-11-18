import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
from gen import Course
C = Course('eng_for_fra'); L = C.L_
SHORT = 'Shortest cut (Kai 17 Nov): cut at the natural join, each piece the seed\'s own words. '

L('S0010L01', 9, cut=[("je ne suis pas sûr / de", "I'm not sure / if"), ("pouvoir / me souvenir", "I can / remember")], stay=0,
  add={1: [('b', "pouvoir me souvenir d'un mot", 'I can remember a word'), ('b', 'pouvoir me souvenir de quelque chose', 'I can remember something'),
           ('b', 'pouvoir me souvenir de ce que je veux dire', 'I can remember what I mean'),
           ('u', "je ne suis pas sûre de pouvoir me souvenir d'un mot maintenant", "I'm not sure if I can remember a word now"),
           ('u', "je ne suis pas sûre de pouvoir me souvenir de quelque chose aujourd'hui", "I'm not sure if I can remember something today"),
           ('u', 'je ne suis pas sûre de pouvoir me souvenir de ce que je veux dire maintenant', "I'm not sure if I can remember what I mean now"),
           ('u', "je ne suis pas sûre de pouvoir me souvenir d'un mot en anglais maintenant", "I'm not sure if I can remember a word in English now"),
           ('u', "je ne suis pas sûre de pouvoir me souvenir de quelque chose en anglais aujourd'hui", "I'm not sure if I can remember something in English today")]},
  why=SHORT + 'I\'m-not-sure-if-I-can-re-mem-ber. "remember | me souvenir" alone was not offered as the second piece: "me souvenir" already answers to "to remember" (seed 6), and one prompt must have one answer; so the second piece is "I can remember | pouvoir me souvenir".')

L('S0024L01', 9, cut=[("je ne / vais pas", "I'm not / going to"), ("pouvoir", "to be able to")], stay=0,
  add={1: [('b', 'pouvoir parler', 'to be able to speak'), ('b', 'pouvoir me souvenir', 'to be able to remember'), ('b', 'pouvoir essayer', 'to be able to try'),
           ('u', "j'aimerais pouvoir parler", "I'd like to be able to speak"),
           ('u', "j'aimerais pouvoir me souvenir", "I'd like to be able to remember"),
           ('u', 'je ne vais pas pouvoir parler demain', "I'm not going to be able to speak tomorrow"),
           ('u', "je ne vais pas pouvoir essayer aujourd'hui", "I'm not going to be able to try today"),
           ('u', "j'aimerais pouvoir parler en anglais", "I'd like to be able to speak in English")]},
  why=SHORT + 'English table cut: "I\'m not going to" + "to be able to" (the two share "to": overlap is normal). In French "to be able to | pouvoir" was only ever taught inside "I\'d like to be able to" (seed 11), so here it is a new LEGO with its own basket.')

L('S0035L01', 9, cut=[("elle / ne veut", "she / doesn't want"), ("rien / lire", "to read / anything")], stay=0,
  add={1: [('b', "rien lire aujourd'hui", 'to read anything today'), ('b', 'rien lire ce soir', 'to read anything this evening'), ('b', 'rien lire maintenant', 'to read anything now'),
           ('u', "elle ne veut rien lire aujourd'hui avec quelqu'un d'autre", "she doesn't want to read anything today with someone else"),
           ('u', "elle ne veut rien lire maintenant avec quelqu'un d'autre", "she doesn't want to read anything now with someone else"),
           ('u', "elle ne veut rien lire demain avec quelqu'un d'autre", "she doesn't want to read anything tomorrow with someone else"),
           ('u', "elle ne veut rien lire ce soir quand il y a d'autres personnes ici", "she doesn't want to read anything this evening when other people are here"),
           ('u', "elle ne veut rien lire aujourd'hui avant que je doive partir", "she doesn't want to read anything today before I have to go")]},
  why=SHORT + 'she-does-n\'t-want-to-read-a-ny-thing. The French "ne … rien" wraps the verb, so the cut that is whole on both sides is "elle ne veut | she doesn\'t want" + "rien lire | to read anything".')

L('S0143L02', 10, cut=[("dont / on parlait", "as / we were talking about"), ("tout à l'heure", "earlier")], stay=0,
  add={1: [('b', "pas la même chose dont on parlait tout à l'heure", 'not the same thing as we were talking about earlier'),
           ('b', "la même chose dont on parlait tout à l'heure", 'the same thing as we were talking about earlier'),
           ('b', "la même idée dont on parlait tout à l'heure", 'the same idea as we were talking about earlier'),
           ('u', "je pense que c'est la même idée dont on parlait tout à l'heure", "I think it's the same idea as we were talking about earlier"),
           ('u', "c'est pas la même idée dont on parlait tout à l'heure", "it's not the same idea as we were talking about earlier"),
           ('u', "bien sûr que c'est la même idée dont on parlait tout à l'heure", "of course it's the same idea as we were talking about earlier"),
           ('u', "je ne suis pas sûre que c'est la même idée dont on parlait tout à l'heure", "I'm not sure it's the same idea as we were talking about earlier"),
           ('u', "je suis surprise que c'est la même idée dont on parlait tout à l'heure", "I'm surprised it's the same idea as we were talking about earlier")]},
  why=SHORT + 'English table cut: "as we were talking about" + "earlier". KEPT AT 7 syllables: "as we were talking about" — the French "dont" carries both "as" and "about", which sit at the two ends of the English, so it cannot be cut smaller without a gap.')

L('S0152L01', 9, cut=[("je l'aurais / fait", "I would have / done it"), ("différemment", "differently")], stay=0,
  add={1: [('b', "je l'aurais fait différemment aujourd'hui", 'I would have done it differently today'),
           ('b', "je l'aurais fait différemment maintenant", 'I would have done it differently now'),
           ('b', "bien sûr je l'aurais fait différemment aujourd'hui", 'of course I would have done it differently today'),
           ('u', "je pense que je l'aurais fait différemment ce matin", 'I think I would have done it differently this morning'),
           ('u', "je ne sais pas si je l'aurais fait différemment aujourd'hui", "I don't know if I would have done it differently today"),
           ('u', "je suis désolée, je l'aurais fait différemment ce matin", "I'm sorry, I would have done it differently this morning"),
           ('u', "j'espère que tu comprends que je l'aurais fait différemment aujourd'hui", 'I hope you understand I would have done it differently today'),
           ('u', "je l'aurais fait différemment ce matin mais pas de problème", 'I would have done it differently this morning but no problem')]},
  why=SHORT + 'I-would-have-done-it-dif-fer-ent-ly. English table cut: "I would have done it" + "differently".')
C.notnew('S0082L01', 'S0024L01')
C.done()
