#!/usr/bin/env python3
"""por_for_eng item-11 decisions (cs #805), hand-authored per LEGO. PLAN ONLY. 43 scan rows in 14 baskets."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import Course
C = Course('por_for_eng')
D = C.D
P17 = "P17 (every practice phrase under a LEGO contains the whole LEGO)"
CLASH = "Kai 12 Nov (no labels: a would-be clash stays inside the bigger LEGO)"
SHORT = "Kai 17 Nov (shortest LEGO cut: re-cut to the piece the basket drills, rows stay)"
L28 = "L28 (a bound spelling still contains the LEGO: record it, do not reword)"

D('S0109L02', 'rebuild-rows', why=f"Two stray rows ('new | novas', 'coisas novas') drop 'palavras'; rewritten. {P17}.",
  b={'B01': ('to learn new words', 'aprender palavras novas'), 'U05': ('I want to try new words', 'quero tentar palavras novas')})

D('S0125L02', 'rebuild-rows',
  why=f"Two build rows ('your | tua', 'a tua boa ideia') break the LEGO; rewritten. U02 'gosto da tua ideia' is NOT a "
      f"defect: 'da' is 'de' + the LEGO's own 'a' written as one word. {L28}. {P17}.",
  b={'B01': ('with your idea', 'com a tua ideia'), 'B03': ('your idea is very good', 'a tua ideia é muito boa'), 'U02': 'k'})

D('S0134L03', 'rebuild-rows',
  why=f"Four rows use other prepositions (para eles, sobre eles). Two rewritten, two deleted (3 build + 7 use stay). {P17}.",
  b={'B02': ('not with them', 'não com eles'), 'B03': ('to work with them', 'trabalhar com eles'), 'U06': 'd', 'U07': 'd'})

D('S0140L01', 'recut-small', known="that I can't", target='que não consiga', type='M',
  comps=[['that', 'que'], ['not', 'não'], ['I can', 'consiga']],
  why=f"Nine rows drill '(que não) consiga' + other verbs; only two say 'ver'. {SHORT}: 'that I can't | que não consiga' is a "
      f"seed span, no other LEGO has that English, and 'to see | ver' (seed 107) is added back as a not-new LEGO. Six rows "
      f"stay; five that lack 'que não' are rewritten. Structural: one not-new LEGO appended.",
  b={'B01': ("that I can't do it", 'que não consiga fazer isso'),
     'B02': ("that I can't see", 'que não consiga ver'),
     'B03': ("that I can't leave early", 'que não consiga sair cedo'),
     'U03': ("I'm sorry that I can't help", 'lamento que não consiga ajudar'),
     'U04': ("I'm sorry that I can't work", 'lamento que não consiga trabalhar')},
  extra=[C.notnew(140, 'to see', 'ver')])

D('S0147L03', 'rebuild-rows',
  why=f"Eight rows drill 'simpática' without the full LEGO. 'kind | simpática' would clash with 'kind | simpático' (seed "
      f"142): {CLASH}. LEGO kept at 8 syllables (e-la-foi-mui-to-sim-pá-ti-ca is 9 written, 'muito' often 2: listed as a "
      f"long LEGO); five rows rewritten, three deleted (3 build + 7 use stay). {P17}.",
  b={'B01': ('yes she was very kind', 'sim ela foi muito simpática'),
     'B02': ('but she was very kind', 'mas ela foi muito simpática'),
     'B03': ('she was very kind today', 'ela foi muito simpática hoje'),
     'U02': ('she was very kind when she saw me', 'ela foi muito simpática quando me viu'),
     'U05': ('I think she was very kind to everyone', 'acho que ela foi muito simpática para todos'),
     'U03': 'd', 'U04': 'd', 'U07': 'd'})

D('S0182L02', 'rebuild-rows',
  why=f"All eleven rows drill 'as minhas' + 'coisas' (things); none says 'chaves'. 'my | as minhas' would clash with 'my | "
      f"minha' (seed 131): {CLASH}. LEGO kept (6 syllables); nine rows move from 'things' to 'keys', two deleted. {P17}.",
  b={'B01': ('I have my keys', 'tenho as minhas chaves'), 'B02': ('where are my keys', 'onde estão as minhas chaves'),
     'B03': ('I want my keys', 'quero as minhas chaves'), 'B04': 'd',
     'U01': ('I have my keys here', 'tenho as minhas chaves aqui'),
     'U02': ('have you seen my keys?', 'viste as minhas chaves?'),
     'U03': ("I can't find my keys", 'não consigo encontrar as minhas chaves'),
     'U04': ('do you have my keys?', 'tens as minhas chaves?'), 'U05': 'd',
     'U06': ('I think I have my keys', 'acho que tenho as minhas chaves'),
     'U07': ('my keys are here', 'as minhas chaves estão aqui')})

D('S0325L04', 'rebuild-rows', why=f"One stray row: B01 'possible | possíveis' drops 'problemas'; rewritten. {P17}.",
  b={'B01': ('the possible problems', 'os problemas possíveis')})

D('S0332L01', 'rebuild-rows',
  why=f"All nine rows drill 'uma nova' + other nouns (empresa, maneira), in the other word order too. The LEGO is the seed's "
      f"'a new life | uma vida nova' and 'life | vida' is the seed's other LEGO. Rows rebuilt with 'uma vida nova'. {P17}.",
  b={'B01': ('a new life here', 'uma vida nova aqui'), 'B02': ('to build a new life', 'construir uma vida nova'),
     'B03': ('a new life for her', 'uma vida nova para ela'),
     'U01': ('she needs to build a new life', 'ela precisa de construir uma vida nova'),
     'U02': ("she couldn't offer a new life", 'ela não conseguia oferecer uma vida nova'),
     'U03': ('I think a new life is most important', 'acho que uma vida nova é mais importante'),
     'U04': ('do you want to build a new life?', 'queres construir uma vida nova?'),
     'U05': ('she needs to read about a new life', 'ela precisa de ler sobre uma vida nova'),
     'U06': ('I think she ought to consider a new life', 'acho que ela devia considerar uma vida nova')})

D('S0343L01', 'rebuild-rows',
  why=f"Four rows drop 'está' or put a word inside the LEGO (está muito preocupada); rewritten. {P17}.",
  b={'B01': ("I think she's worried", 'acho que está preocupada'),
     'B03': ("she's worried about the economy", 'está preocupada com a economia'),
     'U05': ("she's worried about this", 'ela está preocupada com isto'),
     'U06': ("I think she's worried about school", 'acho que ela está preocupada com a escola')})

D('S0403L02', 'rebuild-rows',
  why=f"Three rows say 'calados' with another verb (estávamos calados); rewritten. The four rows that say 'we should remain "
      f"quiet' keep: after 'should' English drops 'to' (K54). {P17}.",
  b={'B01': ('to remain quiet tonight', 'ficar calados esta noite'),
     'B03': ('we want to remain quiet', 'queremos ficar calados'),
     'U01': 'k', 'U04': 'k', 'U05': 'k', 'U06': 'k',
     'U02': ('we tried to remain quiet for a while', 'tentámos ficar calados algum tempo')})

D('S0408L02', 'recut-small', known="that's", target='essa é', type='M', comps=[['that', 'essa'], ['is', 'é']],
  why=f"All eight rows drill 'essa é' + other things; none says 'a melhor maneira', which is this seed's own next LEGO ('the "
      f"best way | a melhor maneira'). {SHORT}: 'that's | essa é' is a seed span and no other LEGO has 'that's'. Six rows "
      f"stay; two that lack 'é' are rewritten.",
  b={'B01': ("that's the best way", 'essa é a melhor maneira'), 'B02': ("that's a good way", 'essa é uma boa maneira')})

D('S0514L02', 'rebuild-rows',
  why=f"Five rows drill 'perfeita' alone. 'perfect | perfeita' would clash with 'perfect | perfeito' (seed 137): {CLASH}. "
      f"LEGO kept (6 syllables); rows rewritten. {P17}.",
  b={'B01': ('the perfect house for us', 'a casa perfeita para nós'),
     'B03': ('not the perfect house', 'não a casa perfeita'),
     'U01': ('she said it was the perfect house', 'ela disse que era a casa perfeita'),
     'U02': ('he said it was the perfect house', 'ele disse que era a casa perfeita'),
     'U03': ('they said it was the perfect house', 'disseram que era a casa perfeita')})

D('S0552L02', 'rebuild-rows', ack=['target'],
  why=f"Five rows say 'no outro extremo': NOT a defect, 'no' is 'em' + the LEGO's own 'o' written as one word, and it is "
      f"how the seed itself says it. {L28}. One row (B01 'the far end | extremo') drops 'o outro'; rewritten. {P17}.",
  b={'B01': ('the other end of the village', 'o outro extremo da aldeia'),
     'B03': 'k', 'U01': 'k', 'U02': 'k', 'U04': 'k', 'U05': 'k'})

D('S0570L02', 'rebuild-rows', ack=['target'],
  why=f"Six rows say bare 'teu' / 'teu bilhete' without the article, some of them not sentences ('she said your | ela disse "
      f"teu'); rewritten. The two rows with 'pelo teu bilhete' are NOT a defect: 'pelo' is 'por' + the LEGO's own 'o', and "
      f"it is how the seed says it. {L28}. {P17}.",
  b={'B01': ('your ticket is here', 'o teu bilhete está aqui'), 'B02': ('this is your ticket', 'este é o teu bilhete'),
     'B03': 'k', 'U04': 'k',
     'U01': ('she has your ticket', 'ela tem o teu bilhete'),
     'U02': ('he said your ticket is here', 'ele disse que o teu bilhete está aqui'),
     'U03': ('I want your ticket', 'quero o teu bilhete'),
     'U05': ('is it your ticket?', 'é o teu bilhete?')})

C.write()
