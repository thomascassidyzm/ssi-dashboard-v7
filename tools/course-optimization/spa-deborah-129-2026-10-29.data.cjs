'use strict';
// spa_for_eng — Deborah's answers to the 129 naturalness questions (native Peninsular speaker who knows the method),
// applied as LANGUAGE guidance under Kai's framing of 2026-10-29 (job #425): an answer that clashes with the canon or
// with the rest of the course (an untaught form, a LEGO it would break, a duplicate) is NOT enacted — it is HELD with an
// alternative Deborah would also accept. The source is Kai's paste of her answers; item numbers below are hers.
//
// Three kinds of data:
//   RULES   — the course-wide items (1, 3, 7, 13, 16, 43, 44, 49, 53, 57, 69): a transform the tool runs over every row,
//             with the rows it must NOT touch listed by id. Every row a rule proposes was read before this file was
//             written; the rule only proposes, and the gates in the tool still decide.
//   FIXES   — the single sentences she ruled on: [phrase id, item, known (null = unchanged), target (null = unchanged)],
//             written as FINAL text (the course-wide rules already applied by hand, e.g. "Creo que").
//             null in place of the pair = delete the phrase (she said "remove").
//   HOLDS   — everything not enacted, one line each for Kai (published separately).

const COURSE = 'spa_for_eng';

// ── LEGOs whose target text changes, and why. Components follow the same rule. ─────────────────────────────────────
// Item 1: "I think that" is taught as "pienso que" (S0047L01); Deborah: everyday "I think" is "creo que". Every M-LEGO that
// carries it changes with it, so the course keeps ONE Spanish for "I think". "creo" stays taught as "I believe" (S0125L01):
// two Englishes over one Spanish is not a ZUT clash.
const G1_LEGOS = ['S0047L01', 'S0163L03', 'S0256L01', 'S0303L02', 'S0304L03', 'S0328L01', 'S0636L01', 'S0655L01'];
// Item 57: "definitely" → "sin duda" (definitivamente is too formal in Spain). The LEGO itself introduces "sin duda".
const G57_LEGOS = ['S0117L01', 'S0117L04'];
// Item 43: "lo más frecuentemente posible" → "lo más a menudo posible". "frequently" (S0003L02) moves to "a menudo" with it,
// so "as frequently as possible" (S0003L03) is still built up from the LEGO before it (LEGO order = build-up order, K47).
const G43_LEGOS = ['S0003L02', 'S0003L03'];
// Item 69: comparisons take "de lo que" ("mejor de lo que esperaba"); the LEGO "than what" (S0132L03) moves with them.
const G69_LEGOS = ['S0132L03'];
const LEGO_MANUAL = {
  // Item 53: "no siento como si estuviera listo" is clumsy; B "no me siento listo". English kept (not proposed).
  S0115L04: { item: 53, target_text: 'no me siento listo para tener una conversación',
    components: [{ known: "I don't feel", target: 'no me siento' }, { known: "as if I'm ready", target: 'listo' }, { known: 'to have a conversation', target: 'para tener una conversación' }] },
  // Item 69: "than what" is taught as "de lo que" (the comparisons it builds take de lo que).
  S0132L03: { item: 69, target_text: 'de lo que', components: [{ known: 'than what', target: 'de lo que' }] },
  // Item 23: teach "to understand" as "entender", not "a entender" ("a" belongs to "ayudarme a").
  S0074L02: { item: 23, target_text: 'entender', type: 'A', components: null },
};

// ── Seeds whose text changes outside the rules ────────────────────────────────────────────────────────────────────
const SEED_MANUAL = {
  // Item 70: A — keep the Spanish, the English becomes "this is where".
  138: { item: 70, known_text: 'this is where my friend wanted to meet us' },
};

// ── Rule exclusions (read, and deliberately left) ─────────────────────────────────────────────────────────────────
const EXCLUDE = {
  // "intentar" with an object already (a relative "que"), or a bare infinitive citation ("to try again"), or the LEGO.
  G16: ['S0007L01', 'S0061L03B04', 'S0464L01B04', 'S0131L02U03', 'S0131L04U05', 'S0272L02U03', 'S0291L02U03'],
  // Two things compared ("what we are doing" vs "what she said"): "que lo que" is right there.
  G69: ['S0230L04U06'],
  // "No sé si sin duda…" / "No creo que sin duda…" do not survive the swap: held (proposed delete), see HOLDS.
  ALL: ['S0117L04B06', 'S0117L04U06', 'S0104L01U14'],
  G57: ['S0117L04B06', 'S0117L04U06'],
  // Writing a letter "this evening": Deborah prefers "tonight" in the English (keeps esta noche) — see FIXES.
  // …and by the time cue: an evening meal (restaurant, eating) is after dark in Spain, so it stays "esta noche".
  G7: ['S0052L02U01', 'S0052L02U15', 'S0052L01U02', 'S0181L01U01', 'S0182L01U11', 'S0243L03U07'],
};

const FIXES = [
  // item 2
  ['S0055L01U06', 2, "I don't like waking up to give you something", 'No me gusta despertarme para darte algo'],
  ['S0055L01U02', 2, null], ['S0042L02U04', 2, null],
  // item 3
  ['S0045L01U02', 3, null, 'Ella quiere saber hablar bien español'],
  // item 6
  ['S0055L01U08', 6, "I don't feel like waking up this morning", 'No tengo ganas de despertarme esta mañana'],
  ['S0075L01U10', 6, null, 'Sé que tienes ganas de decir todo lo que quieres decir hoy'],
  // item 7
  ['S0052L02U01', 7, "I'd like to write a letter tonight", null],
  ['S0052L02U15', 7, "I'm going to write a letter tonight", null],
  ['S0052L01U02', 7, "I'd like to write something in Spanish tonight", null],
  ['S0227L02U07', 7, null, 'Quiero intentar algo nuevo esta tarde si tengo tiempo'], // said "este fin de semana" under "this evening"
  // item 8 (her "also OK" alternative; "temprano" is not taught until seed 139)
  ['S0055L01B06', 8, "I don't like waking up when I'm tired", 'No me gusta despertarme cuando estoy cansado'],
  // item 10, 11, 12
  ['S0061L02U13', 11, 'Could you explain that? We want to practise.', '¿Podrías explicar eso? Queremos practicar.'],
  ['S0061L01U08', 12, 'Could you help me remember what I need to say?', '¿Podrías ayudarme a recordar lo que necesito decir?'],
  // item 14 — impersonal "test you" reads as "test yourself"
  ['S0065L02B04', 14, "It's important to test yourself", null],
  ['S0065L02B05', 14, "It's good to test yourself", null],
  ['S0065L02U06', 14, "I think it's very important to test yourself frequently", 'Creo que es muy importante ponerte a prueba a menudo'],
  ['S0065L02U01', 14, "I think it's important to test yourself every day", 'Creo que es importante ponerte a prueba todos los días'],
  ['S0065L02U04', 14, "I think it's fun to test yourself in Spanish", 'Creo que es divertido ponerte a prueba en español'],
  // item 18, 19, 20
  ['S0069L03U12', 18, null, 'Creo que es difícil cuidar bien al perro'],
  ['S0070L02U04', 19, "I don't know where to start", 'No sé por dónde empezar'],
  ['S0070L02U13', 20, 'She wanted to know where to find the answer', 'Ella quería saber dónde encontrar la respuesta'],
  // item 22, 23
  // her "the suggestion is OK" ("entenderlo" would no longer hold the LEGO "entender")
  ['S0074L02U07', 22, 'I want to help you to understand as much as possible', 'Quiero ayudarte a entender lo más posible'],
  ['S0074L02B01', 23, null, 'Entender'],
  // item 24 (her second option: keep "he aprendido", drop "el mes pasado")
  ['S0076L03U09', 24, 'I have learned how to say a lot of things I wanted to say in Spanish', 'He aprendido cómo decir muchas cosas que quería decir en español'],
  // item 25, 26
  ['S0077L01U16', 25, 'It surprises me how much you want to speak Spanish', 'Me sorprende lo mucho que quieres hablar español'],
  ['S0077L01U14', 26, 'It surprises me how much I enjoy doing interesting things', 'Me sorprende lo mucho que disfruto haciendo cosas interesantes'],
  // item 28
  ['S0078L02U03', 28, null, 'Entiendo lo que dijiste pero es difícil de explicar'],
  ['S0211L04B05', 28, null, 'Es difícil de explicar'],
  // item 29
  ['S0078L01B06', 29, "I understand that it's difficult", 'Entiendo que es difícil'],
  ['S0078L02B05', 29, 'You said that you wanted', 'Dijiste que querías'],
  // item 31, 32
  ['S0080L01U04', 31, 'I think I will be better very soon', 'Creo que estaré mejor muy pronto'],
  ['S0080L01U10', 31, 'I think I will be ready to speak more very soon', 'Creo que estaré listo para hablar más muy pronto'],
  ['S0080L01B05', 31, 'I will be happy', 'Estaré contento'],
  ['S0080L01U13', 32, null],
  // item 34, 35, 36, 37
  ['S0085L02U09', 34, "I don't like talking with those people when I'm not ready", 'No me gusta hablar con esas personas cuando no estoy listo'],
  ['S0085L02U04', 35, null, 'Hoy no quiero hablar con esas personas que no conozco'],
  ['S0085L02U06', 36, "I don't know those people but my friend wants to meet people who speak Spanish", 'No conozco a esas personas pero mi amigo quiere conocer a personas que hablan español'],
  ['S0086L02B04', 37, "It wasn't possible to talk to her yesterday unfortunately", 'No fue posible hablar con ella ayer desafortunadamente'],
  ['S0086L02U02', 37, "It wasn't possible to talk to her yesterday unfortunately", 'No fue posible hablar con ella ayer desafortunadamente'],
  // item 39, 40
  ['S0090L05U13', 39, null, 'Si puedes hablar más eso sería genial para aprender español'],
  ['S0090L05U05', 40, 'Great, I can start learning Spanish with you now', 'Genial, puedo empezar a aprender español contigo ahora'],
  // item 44 (d) — the rest of 44 is the rule (with a partner) or held (no partner)
  ['S0158L01U04', 44, 'Let\'s talk in Spanish because I want to practise', 'Hablemos en español porque quiero practicar'],
  // item 47, 48
  ['S0100L01U10', 47, 'There is no need to worry', 'No hay por qué preocuparte'],
  ['S0100L02B01', 48, null],
  // item 49/50 — "disfrutando" + de + infinitive (under "enjoying", and outside the held "finding out" LEGO)
  ['S0101L01B02', 49, null, 'Estoy disfrutando de hablar'],
  ['S0101L01U05', 49, null, 'Estoy disfrutando de hacer cosas interesantes'],
  ['S0101L01U03', 49, null, 'Estoy disfrutando de hacer esto'],
  ['S0101L01U08', 49, null, 'Estoy disfrutando de aprender algo'],
  ['S0101L01U02', 49, null, 'Estoy disfrutando de aprender'],
  ['S0101L01U01', 49, null, 'Estoy disfrutando de hablar español'],
  ['S0101L01U04', 49, null, 'Estoy disfrutando de hablar español contigo'],
  ['S0101L01U06', 50, null, 'Estoy disfrutando de hacer esto por un rato'],
  ['S0101L03U04', 49, null, 'Estoy disfrutando de aprender este idioma'],
  ['S0111L01U09', 49, null, 'Puedo ver que cambia y estoy disfrutando de descubrir más sobre eso'],
  ['S0227L02U09', 49, null, 'Estoy disfrutando de descubrir algo nuevo sobre este idioma'],
  // item 50
  ['S0104L02U03', 50, "We need to change what I'm going to say", 'Necesitamos cambiar lo que voy a decir'],
  ['S0104L01U04', 50, null], ['S0104L01U06', 50, null], ['S0104L01U09', 50, null], ['S0104L01U11', 50, null],
  ['S0104L02U14', 50, null], ['S0104L02U12', 50, null],
  // item 51, 52
  ['S0103L02U11', 51, 'I would like to do many different things with you', 'Me gustaría hacer muchas cosas diferentes contigo'],
  ['S0111L01U12', 52, null],
  // item 56 (where "choice" is chosen, not "made": "hacer una opción" is item 54, held)
  ['S0116L01U05', 56, null, 'Creo que practicar todos los días es la mejor opción'],
  ['S0116L01B04', 56, null, 'Una mejor opción'],
  ['S0116L01U01', 56, null, 'Creo que hablar más es una mejor opción que estar callado'],
  // item 62, 63, 64, 65
  ['S0125L02U13', 62, 'It was a good idea and I want to keep doing this with you', 'Fue una buena idea y quiero seguir haciendo esto contigo'],
  ['S0125L02U02', 63, "Unfortunately it wasn't possible to do what I wanted today", 'Desafortunadamente, no fue posible hacer lo que quería hoy'],
  ['S0126L01U08', 64, null, 'Creo que esto es lo más importante que estoy haciendo en este momento'],
  ['S0126L01U11', 65, null, 'Creo que esta es una buena idea y quiero seguir haciendo esto'],
  // item 69 (English keeps "than what": it is the LEGO's gloss)
  ['S0132L03U18', 69, 'This was less exciting than what I thought when I was trying to listen to her', 'Esto fue menos emocionante de lo que pensé cuando estaba intentando escucharla'],
  ['S0132L03B01', 69, null, 'De lo que'],
  // item 73 (b)
  ['S0172L04U08', 73, null, 'Eso fue muy útil y gracias por ayudarme'],
  // item 75 (b)
  ['S0146L01U11', 75, 'I think it seems very important to learn that', 'Creo que parece muy importante aprender eso'],
  // item 79, 80
  ['S0151L02U07', 79, "It's interesting that you want to learn Spanish with me", 'Es interesante que quieras aprender español conmigo'],
  ['S0151L02U15', 80, null, 'Era algo importante en lo que quería pensar con cuidado'],
  // item 83 (a), (d: the English only; "nos quedan" is untaught, held)
  ['S0157L01U06', 83, "I'm going to wait there a few minutes before I leave", 'Voy a esperar allí unos minutos antes de irme'],
  ['S0155L02U06', 83, 'I think we only have a few minutes before starting', null],
  // item 84, 87, 89
  ['S0155L01U05', 84, 'I was thinking it would be better to wait a little longer', 'Estaba pensando que sería mejor esperar un poco más'],
  ['S0156L02U10', 87, "There is a problem when you don't know enough words", 'Hay un problema cuando no sabes suficientes palabras'],
  ['S0156L01U10', 89, null, 'Si quieres ir conmigo sería genial'],
  // item 91 — "before / not … anything" = "nada"
  ['S0178L01U01', 91, "I didn't have time to do anything", 'No tuve tiempo de hacer nada'],
  ['S0158L01U09', 91, null, 'Hablemos de eso con cuidado antes de hacer nada'],
  ['S0162L01U05', 91, null, 'Ella quería saber qué piensas de eso antes de hacer nada'],
  ['S0155L01U07', 91, "I think it's important to wait before doing anything", 'Creo que es importante esperar antes de hacer nada'],
  // item 92 — no "because" inside a question
  ['S0179L01U04', 92, 'I have time on Sunday afternoon, what do you want to do?', 'Tengo tiempo el domingo por la tarde, ¿qué quieres hacer?'],
  ['S0182L03U07', 92, 'This book is very interesting, have you seen it before?', 'Este libro es muy interesante, ¿lo has visto antes?'],
  ['S0161L01U15', 92, 'You speak Spanish very well, can you speak Spanish all day?', 'Hablas español muy bien, ¿puedes hablar español todo el día?'],
  ['S0162L01U04', 92, "I don't know what I want to do, what do you think about that?", 'No sé lo que quiero hacer, ¿qué piensas de eso?'],
  ['S0162L01U06', 92, "I'm not sure what's going to happen, what do you think about that?", 'No estoy seguro de lo que va a pasar, ¿qué piensas de eso?'],
  ['S0182L02U09', 92, 'Can you see my keys? I need them now.', '¿Puedes ver mis llaves? Las necesito ahora.'],
  ['S0182L02U15', 92, null, 'Mi amigo va a encontrar mis llaves porque las necesito hoy'],
  ['S0161L01U12', 92, 'Can you talk about what you want? I want to listen.', '¿Puedes hablar de lo que quieres? Quiero escuchar.'],
  // item 93, 94, 95, 96
  ['S0161L03U07', 93, 'That book is the one I wanted to read last month', 'Ese libro es el que quería leer el mes pasado'],
  ['S0161L04U14', 94, "This Sunday is when I want to talk about what's going to happen next month", 'Este domingo es cuando quiero hablar de lo que va a pasar el mes que viene'],
  ['S0161L02U14', 95, null, '¿Puedes darme algo que hacer después de que termines?'],
  ['S0163L01U09', 96, 'I think that that book is very good and I want to read more', 'Creo que ese libro es muy bueno y quiero leer más'],
  // item 98, 99
  ['S0166L03U13', 98, 'I think that my name is not very unusual but here it is a bit different', 'Creo que mi nombre no es muy raro pero aquí es un poco diferente'],
  ['S0166L03U15', 99, 'I think that my name is not very unusual and I like that', 'Creo que mi nombre no es muy raro y eso me gusta'],
  // item 101 — her B ("both are fine"): A's "ayudarte" would no longer hold the LEGO "ayudar"
  ['S0168L03U02', 101, 'I want to help my friend learn this language as soon as possible', 'Quiero ayudar a mi amigo a aprender este idioma lo antes posible'],
  ['S0168L03U09', 101, 'I want to help my friend practise this language', 'Quiero ayudar a mi amigo a practicar este idioma'],
  ['S0168L03U14', 101, 'I would like to help my friend understand what I am trying to say', 'Me gustaría ayudar a mi amigo a entender lo que estoy intentando decir'],
  ['S0168L03U15', 101, 'We want to help my friend learn this language as soon as possible', 'Queremos ayudar a mi amigo a aprender este idioma lo antes posible'],
  // item 102 (A), 103, 104
  ['S0168L04U08', 102, "I think I'll be able to come and help before I have to leave", 'Creo que podré venir a ayudar antes de que tenga que irme'],
  ['S0168L01U03', 103, 'I think that I will be able to speak better very soon', 'Creo que podré hablar mejor muy pronto'],
  ['S0168L04U05', 104, null, 'Después de que termines esto, podré venir a ayudarte'],
  // item 106, 108, 109 (Ese), 110
  ['S0169L02U04', 106, null, 'Puedo ver que quieres que lo haga de manera diferente esta vez'],
  ['S0169L02U08', 106, null, 'Sé exactamente lo que quieres que haga y voy a hacerlo'],
  ['S0172L03U03', 108, 'It would be better to start that again', 'Sería mejor empezar eso otra vez'],
  ['S0172L03U14', 109, null, 'Ese sería el momento perfecto para practicar hablando'],
  ['S0173L02U15', 110, "I'll manage it today but tomorrow I want to talk about it", 'Voy a hacerlo hoy pero mañana quiero hablar de eso'],
  // item 111, 112, 113
  ['S0174L02U03', 111, null],
  ['S0181L01U07', 112, null, 'Voy a llevar mis cosas a casa antes de irme'],
  ['S0181L04U05', 113, null, 'Tengo que llevar a mi madre al médico esta tarde porque el médico quiere verla'],
  // item 115, 116, 117
  ['S0183L01U05', 115, "I'm afraid I haven't seen your friend today", 'Me temo que no he visto a tu amigo hoy'],
  ['S0183L01U09', 116, "I'm afraid I still don't know enough words to talk about everything", 'Me temo que todavía no sé suficientes palabras para hablar de todo'],
  // her split question, keeping "at work" (it is the LEGO this row drills)
  ['S0185L02U05', 117, 'Can I ask you something before you leave? Where did you leave your book at work?', '¿Puedo preguntarte algo antes de que te vayas? ¿Dónde dejaste tu libro en el trabajo?'],
  // item 120, 122, 123
  ['S0188L02U15', 120, null, 'No estoy seguro de entender, así que ¿podrías explicarlo de nuevo un poco más despacio?'],
  ['S0191L01U08', 122, null, 'No, no me importa para nada, sé que es importante tomarte tu tiempo'],
  ['S0191L01U09', 123, null, 'No, no me importa para nada esperar unos minutos más antes de empezar'],
  // item 126, 128
  ['S0197L04U10', 126, 'Can you tell me if working as a teacher in Spanish is interesting?', '¿Puedes decirme si trabajar como profesor en español es interesante?'],
  ['S0200L03U07', 128, null, 'Es importante asegurarte de que lo entiendes todo antes de seguir'],
];

// An infinitive with an object pronoun attached (intentarlo, verla, explicarlo…) is two taught words, not a new one:
// the learner has met enclitics on infinitives from seed 11 (ayudarme, despertarme, ponerte, darte). The untaught-word
// gate treats such a token as taught when the infinitive and the pronoun both are (Kai named "intentarlo" himself).
const ENCLITICS = ['lo', 'la', 'los', 'las', 'te', 'me'];

module.exports = { COURSE, G1_LEGOS, G57_LEGOS, G43_LEGOS, G69_LEGOS, LEGO_MANUAL, SEED_MANUAL, EXCLUDE, FIXES, ENCLITICS };
