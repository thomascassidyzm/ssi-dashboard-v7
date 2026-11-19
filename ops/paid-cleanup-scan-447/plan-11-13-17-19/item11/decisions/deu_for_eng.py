#!/usr/bin/env python3
"""deu_for_eng item-11 decisions (cs #805), hand-authored per LEGO. PLAN ONLY. Writes deu_for_eng.json for tools/plan.py.
Verdicts: recut-small (the LEGO shrinks to the piece its basket drills; rows stay) · rebuild-rows (the LEGO is right; rows
that miss it are rewritten to contain it, or deleted where the basket stays full) · regloss-rebuild (the LEGO's English is
brought back to the seed's own word, rows rebuilt) · grow-rebuild · notnew (the piece is an exact earlier pair).
Basket: 'k' keep, 'd' delete, (known, target) rewrite. Every rewritten row contains the whole LEGO (P17)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import Course
C = Course('deu_for_eng')
D = C.D
P17 = "P17 (every practice phrase under a LEGO contains the whole LEGO)"
CLASH = "Kai 12 Nov (no labels: a would-be clash stays inside the bigger LEGO)"
SHORT = "Kai 17 Nov (shortest LEGO cut: re-cut to the piece the basket drills, rows stay)"
K32 = ("K32 (a formal LEGO keeps sir/madam; in its phrases the LEGO is treated as cut, and sir/madam is always added back at "
       "the end of every phrase on both sides)")

# ---- 91 "it's difficult to think quickly enough to answer in time"
D('S0091L01', 'rebuild-rows',
  why=f"The LEGO 'to think | denken' is the seed's own word. Four rows drill a different verb, nachdenken, which no LEGO "
      f"teaches. Rewritten with denken. {P17}; P1 (no untaught words). U09 'I cannot think' keeps: after a modal English "
      f"drops 'to' (K54).",
  b={'B01': ('to think quickly', 'schnell denken'), 'B02': 'k',
     'U01': ('I need to think quickly before I can answer you', 'Ich muss schnell denken, bevor ich dir antworten kann'),
     'U02': ("I'd like to think quickly enough", 'Ich möchte schnell genug denken'),
     'U08': ("It's difficult to think because I am too tired", 'Es ist schwierig zu denken, weil ich zu müde bin'),
     'U09': 'k'},
  add=[('u', "it's difficult to think quickly enough", 'es ist schwierig, schnell genug zu denken'), ('b', 'to think quickly enough', 'schnell genug zu denken')])

# ---- 103 "we're not trying to hear many more words"
D('S0103L01', 'rebuild-rows',
  why=f"Six rows drill 'viel' alone (a lot), which is taught later (seed 244). The LEGO 'many more words | viel mehr Wörter' "
      f"is the seed's own span; a re-cut to 'viel' would need the gloss 'a lot', which the seed does not say (L26). Rows "
      f"rewritten around the whole LEGO, keeping their other words. {P17}.",
  b={'B02': ('many more words to learn', 'viel mehr Wörter zu lernen'),
     'B03': ('to hear many more words', 'viel mehr Wörter zu hören'),
     'U02': ('I would like to practise many more words to get better', 'Ich möchte viel mehr Wörter üben, um besser zu werden'),
     'U03': ('You learned many more words today', 'Du hast heute viel mehr Wörter gelernt'),
     'U04': ("I'd like to learn many more words this week", 'Ich möchte diese Woche viel mehr Wörter lernen'),
     'U05': ('I have learned many more words today', 'Ich habe heute viel mehr Wörter gelernt'),
     'U06': 'k'},
  add=[('b', 'not many more words', 'nicht viel mehr Wörter')])

# ---- 110 "we're friends, and after we finish I'd like to relax"
D('S0110L02', 'recut-small', known='after', target='nachdem', type='A', comps=[],
  why=f"All five rows drill 'after | nachdem' with other clauses; none says 'nachdem wir fertig sind'. {SHORT}. 'nachdem' is "
      f"a seed word, no other LEGO has 'after' or 'nachdem', so no clash and no duplicate. The basket had only 1 build + 4 use rows, so four rows are added (two build, two use, the seed sentence among them). The rest of the old LEGO (wir, "
      f"fertig, sind) is taught earlier; 'finished | fertig' (seed 11) is added back as a not-new LEGO (Kai 12 Nov: every "
      f"seed part is a LEGO). All rows stay. Structural: one not-new LEGO appended.",
  add=[('b', 'after we finish', 'nachdem wir fertig sind'), ('b', 'after I speak with you', 'nachdem ich mit dir spreche'),
       ('u', "I'd like to relax after we finish", 'Ich möchte mich entspannen, nachdem wir fertig sind'),
       ('u', "we're friends, and after we finish I'd like to relax", 'wir sind Freunde, und nachdem wir fertig sind, möchte ich mich entspannen')],
  extra=[C.notnew(110, 'finished', 'fertig')])

# ---- 171 "do you want me to help you look for it?"
D('S0171L02', 'rebuild-rows',
  why=f"Rows drill 'ich helfe / helfen' in main clauses; none has 'dass ich dir helfe'. A re-cut to 'help | helfe' would "
      f"clash with 'help | Hilfe' (seed 564): {CLASH}. LEGO kept (5 syllables); rows rewritten. {P17}.",
  b={'B01': ('you want me to help you', 'du willst, dass ich dir helfe'),
     'B02': ('do you want me to help you?', 'willst du, dass ich dir helfe?'),
     'U11': ('Do you want me to help you understand that?', 'Willst du, dass ich dir helfe, das zu verstehen?'),
     'U12': ('Do you want me to help you find it?', 'Willst du, dass ich dir helfe, es zu finden?'),
     'U13': ('Do you want me to help you learn German?', 'Willst du, dass ich dir helfe, Deutsch zu lernen?'),
     'U14': ('Do you want me to help you if I can?', 'Willst du, dass ich dir helfe, wenn ich kann?')},
  add=[('u', 'I think she wants me to help you', 'ich denke, sie will, dass ich dir helfe'), ('b', 'she wants me to help you', 'sie will, dass ich dir helfe')])

# ---- 232 "I know an old woman who can remember the answer"
D('S0232L02', 'recut-small', known='woman who', target='Frau, die', type='M', comps=[['woman', 'Frau'], ['who', 'die']],
  why=f"The LEGO 'a woman who | eine Frau, die' is not a span of the seed (the seed says 'eine alte Frau, die'), and every "
      f"row drills 'die Frau, die'. {SHORT}: the piece all rows share and the seed says is 'woman who | Frau, die'. L26 (a "
      f"LEGO holds only words its seed says, in the seed's order). 'eine alte Frau' is the seed's own first LEGO. All six "
      f"rows stay; U17's English gains the 'who' its German already has.",
  b={'U17': ('The woman who I know speaks very good German', 'Die Frau die ich kenne spricht sehr gut Deutsch')},
  add=[('b', 'a woman who', 'eine Frau, die'), ('b', 'an old woman who', 'eine alte Frau, die')])

# ---- 263 "I don't know who you mean"
D('S0263L01', 'rebuild-rows',
  why=f"Rows drill 'wen' as a question word (Wen hast du gesehen?). A re-cut to 'who | wen' would clash with 'who | wer' "
      f"(seed 527) and double 'whom | wen' (seed 453): {CLASH}. LEGO kept (4 syllables); rows rewritten. {P17}.",
  b={'B01': ('I know who you mean', 'Ich weiß, wen du meinst'),
     'B02': ('I think I know who you mean', 'Ich glaube, ich weiß, wen du meinst'),
     'U01': ("I'd like to know who you mean", 'Ich möchte wissen, wen du meinst'),
     'U02': ("I'm not sure who you mean", 'Ich bin mir nicht sicher, wen du meinst'),
     'U07': ('Can you tell me who you mean?', 'Kannst du mir sagen, wen du meinst?'),
     'U08': ("I can't remember who you mean", 'Ich kann mich nicht erinnern, wen du meinst'),
     'U09': 'k'},
  add=[('b', 'do you know who you mean?', 'weißt du, wen du meinst?')])

# ---- 409 "no it doesn't matter what we do"
D('S0409L03', 'rebuild-rows',
  why=f"Seven rows drill 'machen / etwas machen' without 'was wir'. 'machen' is already taught twice (seed 48 'to make', "
      f"seed 438 'to do'), so a re-cut would only make a third copy. LEGO kept (4 syllables); rows rewritten. {P17}.",
  b={'B01': ('what we do is important', 'was wir machen, ist wichtig'), 'B02': 'k',
     'B03': ("it doesn't matter what we do", 'es ist egal, was wir machen'),
     'U01': 'k', 'U07': 'k',
     'U02': ("I think it doesn't matter what we do", 'ich denke, dass es egal ist, was wir machen'),
     'U03': ("I don't know what we do", 'ich weiß nicht, was wir machen'),
     'U04': ("she told me it doesn't matter what we do", 'sie hat mir gesagt, dass es egal ist, was wir machen'),
     'U05': ('I think it is important what we do', 'ich denke, dass es wichtig ist, was wir machen'),
     'U06': ('that is what we do', 'das ist, was wir machen')},
  add=[('b', 'I know what we do', 'ich weiß, was wir machen')])

# ---- 440 "they want to travel while they're still young"
D('S0440L02', 'rebuild-rows',
  why=f"Six rows say 'solange wir' (we), not the LEGO's 'solange sie' (they). A re-cut to 'while | solange' would clash with "
      f"'while | während' (seed 512): {CLASH}. LEGO kept; the six rows move from 'we' to 'they'. B02, B03, U05 keep: "
      f"'they are / they were' for 'they're' is the same word inflected (K6). {P17}; K26 (the person matches on both sides).",
  b={'B01': ("while they're here", 'solange sie hier sind'), 'B02': 'k', 'B03': 'k', 'U05': 'k',
     'U01': ("I think they should travel while they're still here", 'ich denke, dass sie reisen sollten, solange sie noch hier sind'),
     'U02': ("I thought they had to travel while they're still here", 'ich dachte, dass sie reisen müssen, solange sie noch hier sind'),
     'U03': ("she told me they want to travel while they're still young", 'sie hat mir gesagt, dass sie reisen wollen, solange sie noch jung sind'),
     'U04': ("I knew they had to travel while they're still young", 'ich wusste, dass sie reisen müssen, solange sie noch jung sind'),
     'U06': ("please could they travel while they're still here", 'bitte könnten sie reisen, solange sie noch hier sind')})

# ---- 463 "my room number"
D('S0463L01', 'rebuild-rows',
  why=f"Eight rows drill 'meins' (mine) and 'mein Zimmer', not the LEGO's 'meine'. The LEGO is the seed's own word. Rows "
      f"rewritten with 'meine' before feminine nouns already taught. {P17}; K8 (target side: exactly the taught form).",
  b={'B01': 'k', 'B02': ('my room number', 'meine Zimmernummer'),
     'B03': ('this is my room number', 'das ist meine Zimmernummer'),
     'U01': ('I think that is my room number', 'ich denke, dass das meine Zimmernummer ist'),
     'U02': ('I thought that was my room number', 'ich dachte, dass das meine Zimmernummer war'),
     'U03': ('I believe that is my answer', 'ich glaube, dass das meine Antwort ist'),
     'U04': ('I want to know if that is my room number', 'ich will wissen, ob das meine Zimmernummer ist'),
     'U05': ('I think my idea is important', 'ich denke, dass meine Idee wichtig ist'),
     'U06': ('I knew that was my answer', 'ich wusste, dass das meine Antwort war')},
  add=[('b', 'that is my answer', 'das ist meine Antwort')])

# ---- 465 "next time I will ask her what her name is"
D('S0465L02', 'rebuild-rows',
  why=f"Nine rows drill 'werde / ich werde' in other word orders. A re-cut to 'will | werde' would clash with 'will | wird' "
      f"(seed 94), and 'I will | werde ich' keeps none of the nine: {CLASH}. LEGO kept (6 syllables); seven rows rewritten, "
      f"the two 'I would' rows deleted (the basket keeps 5 build + 6 use). {P17}.",
  b={'B01': ('next time I will try it', 'nächstes Mal werde ich es versuchen'),
     'B02': ('next time I will ask her', 'nächstes Mal werde ich sie fragen'),
     'B03': ('next time I will do it', 'nächstes Mal werde ich es machen'),
     'B04': 'k', 'B05': 'k', 'U07': 'k', 'U08': 'k', 'U02': 'd', 'U06': 'd',
     'U01': ('I think next time I will do it', 'ich denke, nächstes Mal werde ich es machen'),
     'U03': ('I believe next time I will stay at home', 'ich glaube, nächstes Mal werde ich zu Hause bleiben'),
     'U04': ('next time I will ask her what she wants', 'nächstes Mal werde ich sie fragen, was sie will'),
     'U05': ('next time I will understand it', 'nächstes Mal werde ich es verstehen')})

# ---- 472 "part of the problem is that we don't know the facts"
D('S0472L02', 'rebuild-rows',
  why=f"Rows drill 'kennen' and 'die Fakten kennen' without 'nicht'. A re-cut to 'to know | kennen' would clash with "
      f"'to know | wissen': {CLASH}. LEGO kept (6 syllables); rows rewritten as verb-last clauses, which is where this word "
      f"order lives. U01 is the same sentence as U07 ('do not' for 'don't'), which the builder refuses as a duplicate once the basket is clean, so U01 is deleted. {P17}.",
  b={'B01': ("that we don't know the facts", 'dass wir die Fakten nicht kennen'),
     'B02': ("because we don't know the facts", 'weil wir die Fakten nicht kennen'),
     'B03': ("if we don't know the facts", 'wenn wir die Fakten nicht kennen'),
     'U01': 'd', 'U07': 'k',
     'U02': ("I think that we don't know the facts", 'ich denke, dass wir die Fakten nicht kennen'),
     'U03': ("she says that they don't know the facts", 'sie sagt, dass sie die Fakten nicht kennen'),
     'U04': ("I believe the problem is that we don't know the facts", 'ich glaube, das Problem ist, dass wir die Fakten nicht kennen'),
     'U05': ("it's a problem if we don't know the facts", 'es ist ein Problem, wenn wir die Fakten nicht kennen'),
     'U06': ("we can't help because we don't know the facts", 'wir können nicht helfen, weil wir die Fakten nicht kennen')})

# ---- 501 "if only I could trust you to play together without arguing"
D('S0501L05', 'recut-small', known='could trust', target='vertrauen könnte', type='M',
  comps=[['to trust', 'vertrauen'], ['could', 'könnte']], closes=['19'],
  why=f"The LEGO is 9 syllables (wenn-ich-dir-nur-ver-trau-en-könn-te), over the cap of 8 (L3, hard), and nine rows drill "
      f"only 'könnte'. 'could | könnte' alone would clash with 'could | konnte' (seed 518): {CLASH}. The shortest cut "
      f"without a clash is 'could trust | vertrauen könnte' (5 syllables), a span of the seed on both sides. wenn, ich, dir, "
      f"nur are taught earlier; 'if | wenn' (seed 413) is added back as a not-new LEGO. Rows rebuilt around the new LEGO. "
      f"Also closes this LEGO for item 19. Structural: one not-new LEGO appended.",
  b={'B01': ('if I could trust you', 'wenn ich dir vertrauen könnte'),
     'B02': ('if only I could trust you', 'wenn ich dir nur vertrauen könnte'),
     'B03': ('if only I could trust him', 'wenn ich ihm nur vertrauen könnte'),
     'U01': 'k',
     'U02': ('she asked if she could trust you', 'sie hat gefragt, ob sie dir vertrauen könnte'),
     'U03': ('if only I could trust her', 'wenn ich ihr nur vertrauen könnte'),
     'U04': ('if only she could trust me', 'wenn sie mir nur vertrauen könnte'),
     'U05': ('if only I could trust you to play without arguing', 'wenn ich dir nur vertrauen könnte, zu spielen, ohne zu streiten'),
     'U06': ("I don't know if I could trust him", 'ich weiß nicht, ob ich ihm vertrauen könnte'),
     'U07': ('if only he could trust us', 'wenn er uns nur vertrauen könnte')},
  extra=[C.notnew(501, 'if', 'wenn')])

# ---- 504 "I'm going to run across the grass"
D('S0504L01', 'rebuild-rows',
  why=f"Nine rows drill 'darüber' (over it), a different word from the LEGO's 'über', and say 'over' where the LEGO says "
      f"'across'. The LEGO is the seed's own word. Rows rewritten with 'über' + a noun. {P17}; K8 (exactly the taught form).",
  b={'B01': ('across', 'über'), 'B02': ('across the grass', 'über das Gras'),
     'B03': ('to run across the grass', 'über das Gras rennen'),
     'U01': ('she can run across the grass', 'sie kann über das Gras rennen'),
     'U02': ('I want to go across the grass', 'ich will über das Gras gehen'),
     'U03': ('can you run across the grass?', 'kannst du über das Gras rennen?'),
     'U04': ('she wants to go across the grass', 'sie will über das Gras gehen'),
     'U05': ('he went across the grass', 'er ist über das Gras gegangen'),
     'U06': ('why did you go across the grass?', 'warum bist du über das Gras gegangen?'),
     'U07': ('she can go across the grass too', 'sie kann auch über das Gras gehen')},
  add=[('b', 'to go across the grass', 'über das Gras gehen')])

# ---- 510 "she's gone to look for somewhere safe to park"
D('S0510L02', 'rebuild-rows',
  why=f"Six rows drill 'einen Platz' (a place) without 'sicheren'; 'einen Platz' is not a span of the seed, so no re-cut. "
      f"Four more have the German but say 'a safe place' where the LEGO says 'somewhere safe' (a different word, K6). All "
      f"ten rewritten: 'sicheren' goes in, the English says 'somewhere safe'. {P17}.",
  b={'B01': ('somewhere safe to park', 'einen sicheren Platz zum Parken'),
     'B02': ('to look for somewhere safe', 'einen sicheren Platz suchen'),
     'B03': ('they need somewhere safe', 'sie brauchen einen sicheren Platz'),
     'U01': ('I need somewhere safe', 'ich brauche einen sicheren Platz'),
     'U02': ('is there somewhere safe nearby?', 'gibt es einen sicheren Platz in der Nähe?'),
     'U03': ('she wants somewhere safe', 'sie will einen sicheren Platz'),
     'U04': ('there is somewhere safe here', 'es gibt einen sicheren Platz hier'),
     'U05': ('she has somewhere safe', 'sie hat einen sicheren Platz'),
     'U06': ('he has somewhere safe too', 'er hat auch einen sicheren Platz'),
     'U07': ('do you want somewhere safe to park?', 'willst du einen sicheren Platz zum Parken?'),
     'U08': 'k'})

# ---- 515 "on the first day of the new year"
D('S0515L03', 'recut-small', known='new', target='neuen', type='A', comps=[],
  why=f"Seven rows drill 'neuen' alone (einen neuen). {SHORT}: 'new | neuen' is a seed word, no other LEGO has 'new' as its "
      f"English, and the rest of the old LEGO is already the seed's own LEGOs ('of the | des', 'year | Jahres'). All ten "
      f"rows stay, the three seed-sentence rows included.",
  add=[('b', 'of the new year', 'des neuen Jahres')])

# ---- 521 "I'm afraid that you'll forget why we needed to stay here"
D('S0521L05', 'recut-small', known='needed to', target='mussten', type='A', comps=[],
  why=f"Nine of ten rows drill 'mussten' alone. {SHORT}: the LEGO becomes 'needed to | mussten', the seed's own words (L26). "
      f"No LEGO has 'needed to'; 'had to' is 'musste' at seed 353, so the rows' English moves from 'had to' to the seed's "
      f"'needed to' (German unchanged). The rest (warum, wir, hier, bleiben) is taught earlier: 'why' is already the seed's "
      f"LEGO, 'here | hier' and 'to stay | bleiben' are added back as not-new LEGOs. Structural: two not-new LEGOs appended.",
  b={'B01': ('needed to', 'mussten'), 'B02': ('we needed to', 'wir mussten'),
     'B03': ('they needed to stay', 'sie mussten bleiben'), 'U01': 'k',
     'U02': ('we needed to stay here', 'wir mussten hier bleiben'),
     'U03': ('they needed to stay here', 'sie mussten hier bleiben'),
     'U04': ('we needed to try', 'wir mussten versuchen'),
     'U05': ('we needed to do that', 'wir mussten das machen'),
     'U06': ('why did we need to stay?', 'warum mussten wir bleiben?'),
     'U07': ('did we need to stay?', 'mussten wir bleiben?')},
  extra=[C.notnew(521, 'here', 'hier'), C.notnew(521, 'to stay', 'bleiben')],
  add=[('b', 'we needed to stay', 'wir mussten bleiben')])

# ---- 527 "guess who told me that funny story"
D('S0527L04', 'regloss-rebuild', known='that funny story',
  why=f"The seed says 'that funny story'; the LEGO says 'this funny story' (L26: a LEGO holds only words its seed says). "
      f"Eight rows drill 'diese Geschichte' without 'lustige'. 'that | diese' alone would clash with 'that | dass': {CLASH}. "
      f"LEGO kept at 8 syllables (die-se-lus-ti-ge-Ge-schich-te, at the cap), English corrected to the seed's word, rows "
      f"rebuilt with 'lustige' in. {P17}.",
  b={'B01': ('told that funny story', 'diese lustige Geschichte erzählt'),
     'B02': ('who told that funny story', 'wer diese lustige Geschichte erzählt hat'),
     'B03': ('that funny story', 'diese lustige Geschichte'),
     'U01': ('she told that funny story', 'sie hat diese lustige Geschichte erzählt'),
     'U02': ('guess who told that funny story', 'rate mal, wer diese lustige Geschichte erzählt hat'),
     'U03': ('I like that funny story', 'ich mag diese lustige Geschichte'),
     'U04': ('he told her that funny story', 'er hat ihr diese lustige Geschichte erzählt'),
     'U05': ('she told me that funny story', 'sie hat mir diese lustige Geschichte erzählt'),
     'U06': ('what is that funny story?', 'was ist diese lustige Geschichte?'),
     'U07': ('do you know that funny story?', 'kennst du diese lustige Geschichte?')},
  add=[('b', 'told me that funny story', 'mir diese lustige Geschichte erzählt')])

# ---- 528 "I'm probably supposed to keep those things in another room"
D('S0528L02', 'regloss-rebuild', known='those things',
  why=f"The seed says 'those things'; the LEGO says 'these things' (L26), and 'those | diese' is the course's own pair (seed "
      f"417). Seven rows drill 'die Sachen / alle Sachen' without 'diese'. A re-cut to 'things | Sachen' would clash with "
      f"'things | Dinge' (seed 607): {CLASH}. LEGO kept, English corrected, rows rebuilt. {P17}.",
  b={'B01': ('to keep those things', 'diese Sachen aufbewahren'),
     'B02': ('those things there', 'diese Sachen da'),
     'B03': ('all those things', 'alle diese Sachen'),
     'U01': ('she has those things here', 'sie hat diese Sachen hier'),
     'U02': ('those things are here', 'diese Sachen sind hier'),
     'U03': ('all those things are here', 'alle diese Sachen sind hier'),
     'U04': ('she found all those things', 'sie hat alle diese Sachen gefunden'),
     'U05': ('she has those things', 'sie hat diese Sachen'),
     'U06': ('where are those things?', 'wo sind diese Sachen?'),
     'U07': ('can you find those things?', 'kannst du diese Sachen finden?')})

# ---- 553 "I think the small church is very ugly"
D('S0553L03', 'rebuild-rows',
  why=f"Nine rows drill 'ich finde' alone, which is already its own LEGO ('I find | ich finde', seed 486). Here the seed's "
      f"English is 'I think', and 'I think | ich finde' would clash with 'I think | ich denke' (seed 47): {CLASH}. So the "
      f"LEGO is kept at 8 syllables (ich-fin-de-die-klei-ne-Kir-che, at the cap) and the rows are rebuilt around it. {P17}.",
  b={'B01': ('I think the small church is ugly', 'ich finde die kleine Kirche hässlich'),
     'B02': ('I think the small church is good', 'ich finde die kleine Kirche gut'),
     'B03': ('I think the small church is very good', 'ich finde die kleine Kirche sehr gut'),
     'U01': 'k',
     'U02': ('I think the small church is very old', 'ich finde die kleine Kirche sehr alt'),
     'U03': ('I think the small church is very interesting', 'ich finde die kleine Kirche sehr interessant'),
     'U04': ('yes, I think the small church is ugly', 'ja, ich finde die kleine Kirche hässlich'),
     'U05': ('I think the small church is too old', 'ich finde die kleine Kirche zu alt'),
     'U06': ('I think the small church is very bad', 'ich finde die kleine Kirche sehr schlecht'),
     'U07': ('I think the small church is very sad', 'ich finde die kleine Kirche sehr traurig')})

# ---- 562 "I just want to get there safely"
D('S0562L01', 'rebuild-rows',
  why=f"Ten of 18 rows drill 'nur' or 'sie will nur' (she), not 'ich will nur'. 'just | nur' alone would clash with "
      f"'just | gerade' (seed 224): {CLASH}. LEGO kept. The three build rows are rewritten; the seven 'she only wants' use "
      f"rows are deleted, because the basket still holds eight good use rows (U08 to U15). {P17}.",
  b={'B01': ('I just want that', 'ich will nur das'), 'B02': ('I just want to go', 'ich will nur gehen'),
     'B03': ('I just want to try once', 'ich will nur einmal versuchen'),
     'U01': 'd', 'U02': 'd', 'U03': 'd', 'U04': 'd', 'U05': 'd', 'U06': 'd', 'U07': 'd'})

# ---- 569 "have you decided how much you are willing to pay?"
D('S0569L04', 'grow-rebuild', known='you are willing to pay', target='du bereit bist zu zahlen', type='M',
  comps=[['you', 'du'], ['willing', 'bereit'], ['are', 'bist'], ['to pay', 'zu zahlen']],
  why=f"No row holds the LEGO: they drill 'zahlen' and 'ist bereit zu zahlen'. The LEGO's German has 'bist' (you are) but "
      f"its English does not (L26). 'to pay | zahlen' alone would clash with 'to pay | bezahlen' (seed 299): {CLASH}. So the "
      f"LEGO grows by one seed word to say on both sides what the seed says, 'you are willing to pay | du bereit bist zu "
      f"zahlen' (7 syllables), and the rows are rebuilt as the verb-last clauses this order lives in. {P17}.",
  b={'B01': ('if you are willing to pay', 'wenn du bereit bist zu zahlen'),
     'B02': ('how much you are willing to pay', 'wie viel du bereit bist zu zahlen'),
     'B03': ('that you are willing to pay', 'dass du bereit bist zu zahlen'),
     'U01': ('I know that you are willing to pay', 'ich weiß, dass du bereit bist zu zahlen'),
     'U02': ('she said that you are willing to pay', 'sie hat gesagt, dass du bereit bist zu zahlen'),
     'U03': ("I'd like to know how much you are willing to pay", 'ich möchte wissen, wie viel du bereit bist zu zahlen'),
     'U04': ('do you know how much you are willing to pay?', 'weißt du, wie viel du bereit bist zu zahlen?'),
     'U05': ("it's good if you are willing to pay", 'es ist gut, wenn du bereit bist zu zahlen'),
     'U06': ('she asked if you are willing to pay', 'sie hat gefragt, ob du bereit bist zu zahlen'),
     'U07': ('have you decided how much you are willing to pay?', 'hast du entschieden, wie viel du bereit bist zu zahlen?')})

# ---- 573 "it's the kind of thing that makes the holidays very special"
D('S0573L03', 'rebuild-rows',
  why=f"No row holds the LEGO: they drill 'diese Sache' and 'eine Art von Sache'. A re-cut to 'thing | Sache' would clash "
      f"with 'thing | Ding' (seed 257): {CLASH}. LEGO kept (5 syllables); rows rebuilt. {P17}.",
  b={'B01': ("that's the kind of thing", 'das ist die Art von Sache'),
     'B02': ('the kind of thing that I like', 'die Art von Sache, die ich mag'),
     'B03': ("it's the kind of thing", 'es ist die Art von Sache'),
     'U01': ("it's the kind of thing that makes me happy", 'es ist die Art von Sache, die mich glücklich macht'),
     'U02': ("that's the kind of thing I'd like to do", 'das ist die Art von Sache, die ich machen möchte'),
     'U03': ("it's not the kind of thing that I like", 'es ist nicht die Art von Sache, die ich mag'),
     'U04': ('is that the kind of thing you want?', 'ist das die Art von Sache, die du willst?'),
     'U05': ('she wants the kind of thing that is special', 'sie will die Art von Sache, die besonders ist'),
     'U06': ("it's the kind of thing that makes the holidays special", 'es ist die Art von Sache, die die Feiertage besonders macht'),
     'U07': ("she said it's the kind of thing that is good", 'sie hat gesagt, es ist die Art von Sache, die gut ist')})

# ---- 581 "he'd like to know a little more about what it's like"
D('S0581L01', 'rebuild-rows',
  why=f"Eight rows say 'sie möchte / ich möchte / möchte' (she, I), not the LEGO's 'er möchte' (he). 'would like | möchte' "
      f"is not the seed's wording and 'I'd like | ich möchte' is taught at seed 11, so the LEGO stays and the rows move to "
      f"'he'. Rows that say 'he would like' for 'he'd like' keep (K6). {P17}; K26 (the person matches on both sides).",
  b={'B01': ("he'd like to know", 'er möchte wissen'), 'B02': ("he'd like more", 'er möchte mehr'),
     'B03': 'k', 'U01': 'k', 'U08': 'k', 'U09': 'k', 'U10': 'k',
     'U02': ("he'd like to stay", 'er möchte bleiben'),
     'U03': ("he'd like to try", 'er möchte versuchen'),
     'U04': ("he'd like to know more", 'er möchte mehr wissen'),
     'U05': ("he'd like to be here", 'er möchte hier sein'),
     'U06': ("she said he'd like to", 'sie hat gesagt, er möchte'),
     'U07': ("he'd like a little more", 'er möchte ein bisschen mehr')})

# ---- 582 "what's it like to grow up here?"
D('S0582L01', 'rebuild-rows',
  why=f"Five rows say 'dort aufzuwachsen' (there), not 'hier aufzuwachsen'. A re-cut to 'to grow up | aufzuwachsen' would "
      f"clash with 'to grow up | aufwachsen' (seed 588): {CLASH}. LEGO kept (5 syllables); the five rows move from 'there' "
      f"to 'here'. {P17}.",
  b={'B01': ('lovely to grow up here', 'schön, hier aufzuwachsen'),
     'B02': ('it is upsetting to grow up here', 'es ist beunruhigend, hier aufzuwachsen'),
     'B03': ('what was it like to grow up here?', 'wie war es, hier aufzuwachsen?'),
     'U03': ('it was upsetting to grow up here', 'es war beunruhigend, hier aufzuwachsen'),
     'U06': ('it was lovely to grow up here', 'es war schön, hier aufzuwachsen')})

# ---- 587 "she used to insist that we had eggs for supper"
D('S0587L04', 'recut-small', known='had', target='hatten', type='A', comps=[], closes=['19'],
  why=f"The LEGO is 11 syllables (dass-wir-Ei-er-zum-A-bend-es-sen-hat-ten), over the cap of 8 (L3, hard), and nine rows "
      f"drill 'hatten' alone. {SHORT}: the LEGO becomes 'had | hatten'. Precedent in this course: seed 603 already lists "
      f"'had | hatten' as a not-new LEGO, which only makes sense if it is taught here first. 'had | hatte' (seed 363, "
      f"not-new) is the same English for the singular; this course carries person pairs that way throughout (want | wollen "
      f"/ wollt). The rest is taught earlier: 'supper' is the seed's own LEGO, 'that | dass' and 'eggs | Eier' are added "
      f"back as not-new LEGOs. Eight rows stay; B02 and U06 are deleted because they use 'dort', which no LEGO teaches (P1), and two build rows are added. Also closes this LEGO for item 19. Structural: two not-new LEGOs appended.",
  b={'U05': 'k', 'B02': 'd', 'U06': 'd'},
  extra=[C.notnew(587, 'that', 'dass'), C.notnew(587, 'eggs', 'Eier')],
  add=[('b', 'we had eggs', 'wir hatten Eier'), ('b', 'we had eggs for supper', 'wir hatten Eier zum Abendessen')])

# ---- 599 "I'd have been happy to drive if you'd told me"
D('S0599L02', 'rebuild-rows',
  why=f"Nine rows drill 'glücklich' without 'gewesen'. A re-cut to 'happy | glücklich' would clash with 'happy | zufrieden' "
      f"(seed 245): {CLASH}. LEGO kept (5 syllables); rows rebuilt. {P17}.",
  b={'B01': ('would have been happy', 'wäre glücklich gewesen'),
     'B02': ('she would also have been happy', 'sie wäre auch glücklich gewesen'),
     'B03': ('I would have been happy', 'ich wäre glücklich gewesen'),
     'U01': ('she has been happy', 'sie ist glücklich gewesen'),
     'U02': ('she said she has been happy', 'sie hat gesagt, sie ist glücklich gewesen'),
     'U03': ("I'd have been happy to drive", 'ich wäre glücklich gewesen zu fahren'),
     'U04': ('he would have been happy', 'er wäre glücklich gewesen'),
     'U05': ('she said she would have been happy', 'sie hat gesagt, sie wäre glücklich gewesen'),
     'U06': 'k',
     'U07': ('she has also been happy', 'sie ist auch glücklich gewesen')})

# ---- 605 "because we needed help"
D('S0605L01', 'notnew', known='help', target='Hilfe', type='A', comps=[], is_new=False,
  why=f"All ten rows drill 'Hilfe' alone, and 'help | Hilfe' is already taught with its own basket at seed 564. {SHORT}: the "
      f"LEGO shrinks to 'help | Hilfe', which is an exact earlier pair, so it becomes NOT-NEW (L17/L27: introduced once). A "
      f"not-new LEGO's basket is never played (P25), so its ten rows are deleted; they duplicate seed 564's drill. The seed "
      f"sentence keeps a played home: it is row U01 of the seed's other LEGO 'needed | gebraucht' (P26). weil, wir, haben "
      f"are taught earlier. No audio.",
  b={k: 'd' for k in ['B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07']})

# ---- 630 "can I have something to drink please?"
D('S0630L01', 'rebuild-rows',
  why=f"Six rows say 'kann sie / sie kann' (she), not the LEGO's 'kann ich'. The LEGO is the seed's own piece. The six rows "
      f"move to 'can I'. {P17}; K26 (the person matches).",
  b={'U02': ('can I do it now?', 'kann ich das jetzt machen?'),
     'U03': ('can I stay here?', 'kann ich hier bleiben?'),
     'U04': ('can I have something to drink?', 'kann ich etwas zu trinken haben?'),
     'U05': ('can I help?', 'kann ich helfen?'),
     'U06': ('can I try it?', 'kann ich es versuchen?'),
     'U07': ('can I have that?', 'kann ich das haben?')},
  add=[('b', 'can I go?', 'kann ich gehen?')])

# ---- 643-651: the formal block (sir / madam)
D('S0643L01', 'rebuild-rows',
  why=f"Nine rows drill 'wollen' in statements ('Sie wollen', 'sie wollen' = they) with no 'sir'. {K32}. The cut LEGO is "
      f"'wollen Sie'; every row now holds it and ends in 'sir | mein Herr'. The checker's 'does not contain the LEGO' on "
      f"these rows is this rule at work, not a miss. Precedent: Italian seed 644 under the same rule.",
  b={'B01': ('do you want that sir?', 'wollen Sie das, mein Herr?'),
     'B02': ('do you want to stay sir?', 'wollen Sie bleiben, mein Herr?'),
     'B03': ('do you want to do it sir?', 'wollen Sie das machen, mein Herr?'),
     'U01': 'k',
     'U02': ('do you also want to stay sir?', 'wollen Sie auch bleiben, mein Herr?'),
     'U03': ('what do you want sir?', 'was wollen Sie, mein Herr?'),
     'U04': ('do you want that too sir?', 'wollen Sie das auch, mein Herr?'),
     'U05': ('do you want to go sir?', 'wollen Sie gehen, mein Herr?'),
     'U06': ('do you want to try it sir?', 'wollen Sie es versuchen, mein Herr?'),
     'U07': ('why do you want that sir?', 'warum wollen Sie das, mein Herr?')})

D('S0644L01', 'rebuild-rows',
  why=f"Nine rows drill 'könnten' in other shapes ('ob Sie … könnten', 'könnten sie' = they) with no 'sir'. {K32}. The canon's "
      f"own worked case is this seed in Italian: the LEGO is NOT re-cut, its phrases drill the core 'could you' and every "
      f"one ends in 'sir'. Same here: core 'könnten Sie', rest of the seed ('to say | sagen', seed 4) added back as a "
      f"not-new LEGO so the core is licensed the way the canon describes. The checker's 'does not contain the LEGO' on "
      f"these rows is that rule at work. Structural: one not-new LEGO appended.",
  b={'B01': ('could you sir?', 'könnten Sie, mein Herr?'),
     'B02': ('could you do it sir?', 'könnten Sie das machen, mein Herr?'),
     'B03': ('could you stay sir?', 'könnten Sie bleiben, mein Herr?'),
     'U01': 'k',
     'U02': ('could you help me sir?', 'könnten Sie mir helfen, mein Herr?'),
     'U03': ('could you also stay sir?', 'könnten Sie auch bleiben, mein Herr?'),
     'U04': ('could you say that again sir?', 'könnten Sie das noch einmal sagen, mein Herr?'),
     'U05': ('could you say that slowly sir?', 'könnten Sie das langsam sagen, mein Herr?'),
     'U06': ('could you try it sir?', 'könnten Sie es versuchen, mein Herr?'),
     'U07': ('could you also do it sir?', 'könnten Sie das auch machen, mein Herr?')},
  extra=[C.notnew(644, 'to say', 'sagen')])

D('S0647L01', 'rebuild-rows',
  why=f"Nine rows drill 'sprechen' with other subjects and no 'madam'. {K32}. The cut LEGO is 'Sie sprechen es'; every row "
      f"now holds it and ends in 'madam | gnädige Frau'. The checker's 'does not contain the LEGO' on these rows is this "
      f"rule at work.",
  b={'B01': ('you speak it well madam', 'Sie sprechen es gut, gnädige Frau'),
     'B02': ('you speak it very well madam', 'Sie sprechen es sehr gut, gnädige Frau'),
     'B03': ('I think you speak it madam', 'ich denke, Sie sprechen es, gnädige Frau'),
     'U01': 'k',
     'U02': ('you speak it better now madam', 'Sie sprechen es jetzt besser, gnädige Frau'),
     'U03': ('you speak it too madam', 'Sie sprechen es auch, gnädige Frau'),
     'U04': ('she said you speak it madam', 'sie hat gesagt, Sie sprechen es, gnädige Frau'),
     'U05': ('you speak it every day madam', 'Sie sprechen es jeden Tag, gnädige Frau'),
     'U06': ('I know you speak it well madam', 'ich weiß, Sie sprechen es gut, gnädige Frau'),
     'U07': ('you speak it here madam', 'Sie sprechen es hier, gnädige Frau')})

D('S0649L01', 'rebuild-rows',
  why=f"Nine rows drill 'sind' in other shapes ('ob Sie bereit sind', 'sind sie' = they) with no 'sir'. {K32}. The cut LEGO "
      f"is 'sind Sie bereit'; every row now holds it and ends in 'sir | mein Herr'. The checker's 'does not contain the "
      f"LEGO' on these rows is this rule at work.",
  b={'B01': ('are you ready to go sir?', 'sind Sie bereit zu gehen, mein Herr?'),
     'B02': ('are you ready to try it sir?', 'sind Sie bereit, es zu versuchen, mein Herr?'),
     'B03': ('and are you ready sir?', 'und sind Sie bereit, mein Herr?'),
     'U01': 'k',
     'U02': ('are you ready to say that sir?', 'sind Sie bereit, das zu sagen, mein Herr?'),
     'U03': ('are you ready to pay sir?', 'sind Sie bereit zu zahlen, mein Herr?'),
     'U04': ('are you ready to help sir?', 'sind Sie bereit zu helfen, mein Herr?'),
     'U05': ('are you ready to stay here sir?', 'sind Sie bereit, hier zu bleiben, mein Herr?'),
     'U06': ('are you ready to do it sir?', 'sind Sie bereit, das zu machen, mein Herr?'),
     'U07': ('are you ready to speak German sir?', 'sind Sie bereit, Deutsch zu sprechen, mein Herr?')})

D('S0651L01', 'rebuild-rows',
  why=f"Nine rows drill 'denken' with other subjects and no 'madam'. {K32}. The cut LEGO is 'was denken Sie'; every row now "
      f"holds it and ends in 'madam | gnädige Frau'. The checker's 'does not contain the LEGO' on these rows is this rule "
      f"at work.",
  b={'B01': ('what do you think about it madam?', 'was denken Sie darüber, gnädige Frau?'),
     'B02': ('and what do you think madam?', 'und was denken Sie, gnädige Frau?'),
     'B03': ('what do you think now madam?', 'was denken Sie jetzt, gnädige Frau?'),
     'U01': 'k',
     'U02': ('what do you think today madam?', 'was denken Sie heute, gnädige Frau?'),
     'U03': ('what do you think about the answer madam?', 'was denken Sie über die Antwort, gnädige Frau?'),
     'U04': ('what do you think about the problem madam?', 'was denken Sie über das Problem, gnädige Frau?'),
     'U05': ('what do you think about the story madam?', 'was denken Sie über die Geschichte, gnädige Frau?'),
     'U06': ('but what do you think madam?', 'aber was denken Sie, gnädige Frau?'),
     'U07': ('what do you think about the idea madam?', 'was denken Sie über die Idee, gnädige Frau?')})

# ---- 658-666: the "you all" block
D('S0658L01', 'rebuild-rows',
  why=f"Nine rows say 'wollt ihr / ihr wollt' without 'alle', though their English already says 'you all'. The LEGO is the "
      f"whole seed and already the shortest piece. 'alle' goes into each row. Precedent: seed 660 in this block, rebuilt the "
      f"same way on 18 Nov. {P17}.",
  b={'B01': ('do you all want that?', 'wollt ihr alle das?'),
     'B02': ('do you all want to try?', 'wollt ihr alle versuchen?'),
     'B03': ('do you all want to do it?', 'wollt ihr alle das machen?'),
     'U01': 'k', 'U08': 'k',
     'U02': ('do you all want to stay?', 'wollt ihr alle bleiben?'),
     'U03': ('do you all want to help?', 'wollt ihr alle helfen?'),
     'U04': ('do you all want to stay here?', 'wollt ihr alle hier bleiben?'),
     'U05': ('do you all also want to stay?', 'wollt ihr alle auch bleiben?'),
     'U06': ('what do you all want?', 'was wollt ihr alle?'),
     'U07': ('do you all also want to do it?', 'wollt ihr alle das auch machen?')})

D('S0659L01', 'recut-small', known='could you all', target='könntet ihr alle', type='M',
  comps=[['could', 'könntet'], ['you all', 'ihr'], ['all', 'alle']],
  why=f"Nine rows drill 'könntet ihr' + other verbs; none says 'das sagen'. {SHORT}: the LEGO becomes 'could you all | "
      f"könntet ihr alle', a span of the seed, matching its formal twin at seed 644 (core 'could you'). 'das' is taught "
      f"earlier and 'to say | sagen' (seed 4) is added back as a not-new LEGO. Rows gain 'alle', which their English "
      f"already says. Structural: one not-new LEGO appended.",
  b={'B01': ('could you all do it?', 'könntet ihr alle das machen?'),
     'B02': ('could you all stay?', 'könntet ihr alle bleiben?'),
     'B03': ('could you all help?', 'könntet ihr alle helfen?'),
     'U01': 'k',
     'U02': ('could you all try it?', 'könntet ihr alle es versuchen?'),
     'U03': ('could you all also do it?', 'könntet ihr alle das auch machen?'),
     'U04': ('could you all stay here?', 'könntet ihr alle hier bleiben?'),
     'U05': ('could you all come?', 'könntet ihr alle kommen?'),
     'U06': ('could you all say that again?', 'könntet ihr alle das noch einmal sagen?'),
     'U07': ('could you all also stay?', 'könntet ihr alle auch bleiben?')},
  extra=[C.notnew(659, 'to say', 'sagen')])

D('S0660L01', 'rebuild-rows',
  why=f"The three build rows were rebuilt on 18 Nov (proofreader pass) and now hold the LEGO; six use rows still drill "
      f"'helfen' alone with 'she'. They are rebuilt the same way, around the whole LEGO. {P17}.",
  b={'B01': 'k', 'B02': 'k', 'B03': 'k', 'U01': 'k', 'U08': 'k',
     'U02': ('I can help you all if you want', 'ich kann euch allen helfen, wenn ihr wollt'),
     'U03': ('she said I can help you all', 'sie hat gesagt, ich kann euch allen helfen'),
     'U04': ("I'm sure I can help you all", 'ich bin mir sicher, ich kann euch allen helfen'),
     'U05': ('I can help you all to learn German', 'ich kann euch allen helfen, Deutsch zu lernen'),
     'U06': ('I can help you all to find it', 'ich kann euch allen helfen, es zu finden'),
     'U07': ('I can help you all, but not today', 'ich kann euch allen helfen, aber nicht heute')})

D('S0662L01', 'rebuild-rows',
  why=f"Nine rows say 'ihr sprecht / sprecht ihr es' without 'alle' and in other orders. The LEGO is the whole seed (5 "
      f"syllables). Rows rebuilt around it. {P17}.",
  b={'B01': ('you all speak it well', 'ihr alle sprecht es gut'),
     'B02': ('I think you all speak it', 'ich denke, ihr alle sprecht es'),
     'B03': ('you all speak it very well', 'ihr alle sprecht es sehr gut'),
     'U01': 'k',
     'U02': ('you all speak it better now', 'ihr alle sprecht es jetzt besser'),
     'U03': ('you all speak it too', 'ihr alle sprecht es auch'),
     'U04': ('she said you all speak it', 'sie hat gesagt, ihr alle sprecht es'),
     'U05': ('you all speak it every day', 'ihr alle sprecht es jeden Tag'),
     'U06': ('I know you all speak it well', 'ich weiß, ihr alle sprecht es gut'),
     'U07': ('you all speak it here', 'ihr alle sprecht es hier')})

D('S0664L01', 'recut-small', known='are you all', target='seid ihr alle', type='M',
  comps=[['are', 'seid'], ['you all', 'ihr'], ['all', 'alle']],
  why=f"Rows drill 'seid ihr alle' + other words (hier, auch bereit) or the verb-last 'ob ihr alle … seid'. {SHORT}: the LEGO "
      f"becomes 'are you all | seid ihr alle', a span of the seed; 'ready | bereit' (seed 26) is added back as a not-new "
      f"LEGO. Four rows stay as they are; six are rewritten to the question order. Structural: one not-new LEGO appended.",
  b={'B01': ('are you all there?', 'seid ihr alle da?'),
     'B02': ('are you all ready to go?', 'seid ihr alle bereit zu gehen?'),
     'B03': ('are you all tired?', 'seid ihr alle müde?'),
     'U01': 'k', 'U02': 'k', 'U03': 'k', 'U05': 'k',
     'U04': ('are you all happy?', 'seid ihr alle glücklich?'),
     'U06': ('are you all at home?', 'seid ihr alle zu Hause?'),
     'U07': ('are you all friends?', 'seid ihr alle Freunde?')},
  extra=[C.notnew(664, 'ready', 'bereit')])

D('S0666L01', 'rebuild-rows',
  why=f"Nine rows drill 'denkt' with 'she' or in verb-last order. The LEGO is the whole seed (4 syllables). Six rows rebuilt "
      f"around it; three 'she also thinks' rows deleted (the basket keeps 3 build + 6 use). {P17}.",
  b={'B01': ('and what do you all think?', 'und was denkt ihr alle?'),
     'B02': ('what do you all think about it?', 'was denkt ihr alle darüber?'),
     'B03': ('what do you all think now?', 'was denkt ihr alle jetzt?'),
     'U01': 'k', 'U08': 'k', 'U09': 'k',
     'U02': ('what do you all think about the idea?', 'was denkt ihr alle über die Idee?'),
     'U03': ('what do you all think about the problem?', 'was denkt ihr alle über das Problem?'),
     'U04': ('but what do you all think?', 'aber was denkt ihr alle?'),
     'U05': 'd', 'U06': 'd', 'U07': 'd'})

C.write()
