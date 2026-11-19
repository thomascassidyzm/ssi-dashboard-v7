import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
from gen import Course
C = Course('eng_for_spa'); L = C.L_
SHORT = 'Shortest cut (Kai 17 Nov): the over-long LEGO is cut at the join its own component rows already mark; each piece is the seed\'s own words. '

L('S0024L02', 9, cut=[("no / voy a", "I'm not / going to"), ("poder", "to be able to")], stay=0,
  why=SHORT + 'English table cut: "I\'m not going to" + "to be able to" (the two share the word "to": overlap between LEGOs is normal). All 10 rows keep: each still contains "no voy a" / "I\'m not going to".')

L('S0115L02', 9, cut=[("no me / siento", "I don't feel / as if I'm"), ("lista / para", "ready / to")], stay=0,
  add={1: [('b', 'lista para practicar', 'ready to practise'), ('b', 'lista para hablar', 'ready to speak'), ('b', 'lista para aprender más', 'ready to learn more'),
           ('u', 'no me siento lista para practicar', "I don't feel as if I'm ready to practise"),
           ('u', 'no me siento lista para hablar inglés hoy', "I don't feel as if I'm ready to speak English today"),
           ('u', 'no me siento lista para aprender más ahora', "I don't feel as if I'm ready to learn more now"),
           ('u', 'no me siento lista para tener una conversación todavía', "I don't feel as if I'm ready to have a conversation yet"),
           ('u', 'no me siento lista para practicar inglés ahora', "I don't feel as if I'm ready to practise English now")]},
  why=SHORT + 'Sister course precedent: eng_for_ita S0115L01 "non mi sento come se fossi | I don\'t feel as if I\'m". "ready | listo" is taught at seed 26; "ready to | lista para" is new and gets its own basket. (The LEGO says "lista" where the seed says "listo": left as it is, not this family.)')

L('S0122L02', 10, cut=[("me alegra / mucho", "I'm excited / about"), ("cómo / va", "how / it's going")], stay=0,
  add={1: [('b', 'cómo va ahora', "how it's going now"), ('b', 'cómo va hoy', "how it's going today"), ('b', 'cómo va esto', "how it's going with this"),
           ('u', 'me alegra mucho cómo va hoy', "I'm excited about how it's going today"),
           ('u', 'me alegra mucho cómo va ahora', "I'm excited about how it's going now"),
           ('u', 'me alegra mucho cómo va el inglés', "I'm excited about how it's going with English"),
           ('u', 'me alegra mucho cómo va la conversación', "I'm excited about how it's going in the conversation"),
           ('u', 'me alegra mucho cómo va esto hoy', "I'm excited about how it's going with this today")]},
  why=SHORT + 'English table cut: "I\'m excited about" + "how it\'s going".')

L('S0131L03', 10, cut=[("demasiadas / ideas", "too many / ideas"), ("dando / vueltas", "going / around")], stay=0,
  add={1: [('b', 'ideas dando vueltas en mi cabeza', 'ideas going around in my head'), ('b', 'ideas dando vueltas', 'ideas going around'), ('b', 'dando vueltas en mi cabeza', 'going around in my head'),
           ('u', 'hay demasiadas ideas dando vueltas hoy', 'there are too many ideas going around today'),
           ('u', 'hay ideas dando vueltas en mi cabeza', 'there are ideas going around in my head'),
           ('u', 'no quiero ideas dando vueltas en mi cabeza', "I don't want ideas going around in my head"),
           ('u', 'hay demasiadas ideas dando vueltas ahora', 'there are too many ideas going around now'),
           ('u', 'hay ideas dando vueltas en mi cabeza cuando hablo inglés', 'there are ideas going around in my head when I speak English')]},
  why=SHORT + 'too-ma-ny-i-de-as-go-ing-a-round. English table cut: "too many ideas" + "going around".')

L('S0295L01', 9, cut=[("no / dije", "I didn't / say"), ("que / quisiera", "that I / wanted to")], stay=0,
  add={1: [('b', 'que quisiera hacerlo', 'that I wanted to do it'), ('b', 'que quisiera terminar', 'that I wanted to finish'), ('b', 'que quisiera empezar hoy', 'that I wanted to start today'),
           ('u', 'no dije que quisiera terminar hoy', "I didn't say that I wanted to finish today"),
           ('u', 'no dije que quisiera empezar mañana', "I didn't say that I wanted to start tomorrow"),
           ('u', 'no dije que quisiera hablar con él ahora', "I didn't say that I wanted to speak to him now"),
           ('u', 'no dije que quisiera hacerlo en un día', "I didn't say that I wanted to do it in a day"),
           ('u', 'no dije que quisiera irme hoy', "I didn't say that I wanted to leave today")]},
  why=SHORT + 'English table cut: "I didn\'t say" + "that I wanted to".')

C.done()
