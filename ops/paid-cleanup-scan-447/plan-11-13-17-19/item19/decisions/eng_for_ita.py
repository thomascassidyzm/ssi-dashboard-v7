import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
from gen import Course
C = Course('eng_for_ita'); L = C.L_
SHORT = 'Shortest cut (Kai 17 Nov): cut at the natural join, each piece the seed\'s own words. '

L('S0024L01', 9, hold='Italian says "I\'m not going to be able" in ONE word (riuscirò, the future of riuscire), so the shared English cut '
  '("I\'m not going to" + "to be able to") has no Italian piece to sit on. The only cut that is whole on both sides is '
  '"non riuscirò | I\'m not going to be able" (8 syllables) + "a ricordare | to remember", which leaves an English LEGO ending on "be able" '
  'and has no precedent in the course. Recommendation: keep this one LEGO at 9 as a stated exception. Yes / no?')

L('S0026L02', 9, cut=[("sentirmi / come se fossi", "feeling / as if I'm"), ("quasi / pronto", "nearly / ready")], stay=0,
  add={1: [('b', 'quasi pronto ad imparare', 'nearly ready to learn'), ('b', 'quasi pronto a parlare', 'nearly ready to speak'), ('b', 'quasi pronto a tornare', 'nearly ready to come back'),
           ('u', 'mi piace sentirmi come se fossi quasi pronto a parlare', "I like feeling as if I'm nearly ready to speak"),
           ('u', 'mi piace sentirmi come se fossi quasi pronto a iniziare a parlare', "I like feeling as if I'm nearly ready to start talking"),
           ('u', 'mi piace sentirmi come se fossi quasi pronto a spiegare', "I like feeling as if I'm nearly ready to explain"),
           ('u', 'mi piace sentirmi come se fossi quasi pronto a incontrare persone', "I like feeling as if I'm nearly ready to meet people"),
           ('u', 'mi piace sentirmi come se fossi quasi pronto a parlare inglese molto bene', "I like feeling as if I'm nearly ready to speak English very well")]},
  why=SHORT + 'fee-ling-as-if-I\'m-near-ly-rea-dy. Cut on the LEGO\'s own component rows: "feeling as if I\'m" + "nearly ready".')

L('S0115L02', 9, cut=[("pronto / ad", "ready / to"), ("avere / una conversazione", "have / a conversation")], stay=1,
  add={0: [('b', 'pronto ad imparare', 'ready to learn'), ('b', 'pronto ad andare', 'ready to go'), ('b', 'quasi pronto ad andare', 'nearly ready to go'),
           ('u', 'non mi sento come se fossi pronto ad andare', "I don't feel as if I'm ready to go"),
           ('u', 'non mi sento come se fossi pronto ad imparare oggi', "I don't feel as if I'm ready to learn today"),
           ('u', 'non mi sento come se fossi pronto ad andare oggi', "I don't feel as if I'm ready to go today"),
           ('u', 'ecco perché mi piacerebbe essere pronto ad andare', "that is why I'd like to be ready to go"),
           ('u', 'ecco perché mi piacerebbe essere pronto ad imparare', "that is why I'd like to be ready to learn")]},
  why=SHORT + 'rea-dy-to-have-a-con-ver-sa-tion. English table cut: "ready to" + "have a conversation" (the Spanish sister course already teaches "have a conversation" as its own LEGO in this seed). All rows stay under "have a conversation".')

L('S0143L02', 10, cut=[("di cui / stavamo parlando", "as / we were talking about"), ("prima", "earlier")], stay=0,
  add={1: [('b', 'la stessa cosa di cui stavamo parlando prima', 'the same thing as we were talking about earlier'),
           ('b', 'la stessa idea di cui stavamo parlando prima', 'the same idea as we were talking about earlier'),
           ('b', 'non è la stessa cosa di cui stavamo parlando prima', "it's not the same thing as we were talking about earlier"),
           ('u', 'è la stessa idea di cui stavamo parlando prima', "it's the same idea as we were talking about earlier"),
           ('u', 'penso che sia la stessa idea di cui stavamo parlando prima', "I think it's the same idea as we were talking about earlier"),
           ('u', 'credo che sia la stessa idea di cui stavamo parlando prima', "I believe it's the same idea as we were talking about earlier"),
           ('u', 'nessun problema, è la stessa idea di cui stavamo parlando prima', "no problem it's the same idea as we were talking about earlier"),
           ('u', 'sono così contento che sia la stessa idea di cui stavamo parlando prima', "I'm so happy that it's the same idea as we were talking about earlier")]},
  why=SHORT + 'English table cut: "as we were talking about" + "earlier". KEPT AT 7 syllables: "as we were talking about" — the Italian "di cui" carries both "as" and "about", which sit at the two ends of the English, so it cannot be cut smaller without a gap.')

L('S0273L01', 9, cut=[("purtroppo", "unfortunately"), ("ho / troppo", "I've got / too much")], stay=1,
  add={1: [('u', 'purtroppo ho troppo lavoro oggi', "unfortunately I've got too much work today")]},
  why=SHORT + 'un-for-tu-nate-ly-I\'ve-got-too-much. "unfortunately | purtroppo" is already taught (seed 86), so it joins this seed as a not-new LEGO and the LEGO shrinks to "I\'ve got too much | ho troppo". Every row stays; one use row is added because the basket had only 4.')
C.done()
