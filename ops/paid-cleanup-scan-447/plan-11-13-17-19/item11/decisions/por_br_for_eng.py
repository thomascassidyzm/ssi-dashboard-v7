#!/usr/bin/env python3
"""por_br_for_eng item-11 decisions (cs #805), hand-authored per LEGO. PLAN ONLY. 27 scan rows in 12 baskets; three
baskets (S0617L01, S0618L01, S0659L01) no longer hold the rows the scan named: already fixed, dropped."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import Course
C = Course('por_br_for_eng')
D = C.D
P17 = "P17 (every practice phrase under a LEGO contains the whole LEGO)"
CLASH = "Kai 12 Nov (no labels: a would-be clash stays inside the bigger LEGO)"

D('S0122L04', 'rebuild-rows', ack=['known'], why=f"One stray row: U03 says 'este trabalho', not 'progresso'; rewritten. {P17}.",
  b={'U03': ("I'm excited about the progress", 'estou entusiasmado com o progresso')})

D('S0134L04', 'rebuild-rows',
  why=f"Four rows use bare 'eles' or other prepositions (para eles, sobre eles); rewritten with 'com eles'. Same fix as the "
      f"sister course por_for_eng seed 134. {P17}.",
  b={'B01': ('not with them', 'não com eles'), 'B03': ('to work with them', 'trabalhar com eles'),
     'U02': ('I want to talk with them', 'quero falar com eles'),
     'U03': ('this is a problem with them', 'isso é um problema com eles')})

D('S0146L02', 'rebuild-rows', why=f"One stray row: U03 says 'parece ser', not the LEGO's 'parece estar'; rewritten. {P17}.",
  b={'U03': ('I think it seems to be working', 'acho que parece estar funcionando')})

D('S0155L02', 'rebuild-rows',
  why=f"Six rows drill 'uns minutos' without 'esperar'. 'a few minutes | uns minutos' would clash with 'a few minutes | "
      f"poucos minutos' (seed 253): {CLASH}. LEGO kept (7 syllables: es-pe-rar-uns-mi-nu-tos); rows rewritten with "
      f"'esperar', and two use rows added (the basket had three). 'wait' for 'waiting' is the same word inflected (K6). {P17}.",
  b={'B01': ('waiting a few minutes here', 'esperar uns minutos aqui'),
     'B02': ('I want to wait a few minutes', 'quero esperar uns minutos'),
     'B03': ('I need to wait a few minutes to think', 'preciso esperar uns minutos para pensar'),
     'B04': ('I need to wait a few minutes before I go', 'preciso esperar uns minutos antes de ir'),
     'U04': ('she can wait a few minutes', 'ela pode esperar uns minutos'),
     'U05': ("I don't mind waiting a few minutes tomorrow", 'não me importo de esperar uns minutos amanhã')},
  add=[('u', 'can you wait a few minutes here?', 'pode esperar uns minutos aqui?'),
       ('u', "I don't mind waiting a few minutes tomorrow morning", 'eu não me importo de esperar uns minutos amanhã de manhã')])

D('S0162L01', 'rebuild-rows',
  why=f"Every row holds the LEGO 'disso', so not a basket miss. The scan named U04 because its English ('I was hoping we "
      f"could talk about that') says more than its Portuguese ('esperava falar disso com você'): the English is brought "
      f"into line, Portuguese unchanged.",
  b={'U04': ('I was hoping to talk about that with you', 'esperava falar disso com você')})

D('S0216L01', 'rebuild-rows',
  why=f"Two build rows ('a few | alguns', 'alguns mais') drop 'amigos'; rewritten. Four rows hold the Portuguese but say "
      f"'some friends' where the LEGO says 'a few friends' (a different word, K6): their English moves to the LEGO's. {P17}.",
  b={'B01': ('a few friends here', 'alguns amigos aqui'), 'B02': ('a few friends', 'alguns amigos'),
     'B03': ('with a few friends', 'com alguns amigos'),
     'U02': ('I have a few friends here', 'tenho alguns amigos aqui'),
     'U04': ('I was with a few friends', 'estava com alguns amigos'),
     'U05': ('I want to see a few friends', 'quero ver alguns amigos')})

D('S0229L02', 'rebuild-rows',
  why=f"Six of seven rows say 'ela ajudaria' without 'te', or 'me ajudaria', or change the person (he, I). The LEGO is the "
      f"seed's 'te ajudaria'. All six rewritten to 'she would help you'; one build row added (the basket had two). {P17}; "
      f"K26 (the person matches on both sides).",
  b={'B02': ('she would help you', 'ela te ajudaria'), 'B03': ('she would help you now', 'ela te ajudaria agora'),
     'U02': ('she would help you if she could', 'ela te ajudaria se pudesse'),
     'U03': ('she would help you tomorrow', 'ela te ajudaria amanhã'),
     'U04': ('she would help you with that', 'ela te ajudaria com isso'),
     'U05': ('I think she would help you', 'acho que ela te ajudaria')},
  add=[('b', 'yes, she would help you', 'sim, ela te ajudaria')])

D('S0290L01', 'rebuild-rows', ack=['known'],
  why=f"One row (U05) uses 'conhece', a different verb; rewritten with 'sabe'. The rows that say 'he knows' keep: 'sabe' is "
      f"both he and she, and the seed itself says 'he knows'. NOTE, not planned here: the LEGO's English is 'she knows' "
      f"under a seed that says 'he knows' — that is the 'LEGO says what its seed does not' family. {P17}.",
  b={'U02': 'k', 'U04': 'k', 'U06': 'k', 'U05': ('I think she knows the answer', 'acho que ela sabe a resposta')})

D('S0438L01', 'rebuild-rows',
  why=f"The scan named three rows; the whole basket is broken Portuguese: 'eles não servir / reservar / liderar' puts a bare "
      f"infinitive after 'they didn't', which is not Portuguese. The LEGO 'they didn't | eles não' is the seed's opening. All "
      f"seven rows are rebuilt with the seed's own verb form 'queriam' (they didn't want). {P17}; R0.3 (rewording a phrase "
      f"is legitimate).",
  b={'B02': ("they didn't want to", 'eles não queriam'),
     'B03': ("they didn't want to decide", 'eles não queriam decidir'),
     'U01': ("no, they didn't want to", 'não, eles não queriam'),
     'U02': ("they didn't want to do that", 'eles não queriam fazer isso'),
     'U03': ("yes, they didn't want to decide", 'sim, eles não queriam decidir'),
     'U04': ("they didn't want to decide what he should do", 'eles não queriam decidir o que ele devia fazer'),
     'U05': ("I think they didn't want to decide", 'acho que eles não queriam decidir')})

for lid, row in (('S0617L01', "we know, you thought that"), ('S0618L01', "we know, it doesn't feel like"), ('S0659L01', 'we know, you all could say')):
    D(lid, 'keep', why=f"Already fixed: the row the scan named ('{row}') is no longer in the live basket, and every row "
                       f"that is there holds the LEGO. Dropped, nothing to do.")

C.write()
