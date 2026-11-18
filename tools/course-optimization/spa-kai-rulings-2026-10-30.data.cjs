'use strict';
// tools/course-optimization/spa-kai-rulings-2026-10-30.data.cjs — spa_for_eng: Kai's rulings of 30 Oct 2026 on the items
// held from Deborah's answers (job #223; held docs d/8287a39d, d/c839a801). Every row is [id, known, target] AFTER the
// change; null keeps that side. The tool reads the live course for the BEFORE text and refuses a row that has drifted.
// Not here (Kai): 44a seeds 5-13 "el" (parked), 44b no-partner practicar rows (parked), 127 seed 200 (NO), 77 seed 148
// (a separate check is running).

const COURSE = 'spa_for_eng';
const APPROVAL = 'kai:2026-10-30:Kai ruled on Deborah held items';

// LEGO re-cuts. Each changed LEGO needs a new intro clip in the same pass (the DB trigger unlinks the old one).
const LEGOS = [
  // 49: "disfrutando DE descubrir". "to find out | descubrir" is S0017L02 on both sides, so this LEGO is not new any more
  // (both-sides duplicate rule) and its basket is no longer played; its rows still say what the LEGO says.
  { item: 49, lego_id: 'S0101L02', set: { known_text: 'to find out', target_text: 'descubrir', type: 'A', components: null, is_new: false } },
  // 61: option B — no sentirse, no resultarme.
  { item: 61, lego_id: 'S0122L02', set: { known_text: 'to get easier', target_text: 'ser más fácil', type: 'M', components: [{ known: 'to get', target: 'ser' }, { known: 'easier', target: 'más fácil' }] } },
  // 54: elegir is taught here (first met before as conditional elegiría at S0535). The seed English now says "option",
  // so L01 follows it ("option | opción" is what S0121-S0272 already say in English).
  { item: 54, lego_id: 'S0116L01', set: { known_text: 'option' } },
  { item: 54, lego_id: 'S0116L03', set: { known_text: 'I could choose', target_text: 'podría elegir', type: 'M', components: [{ known: 'I could', target: 'podría' }, { known: 'to choose', target: 'elegir' }] } },
  { item: 54, lego_id: 'S0116L04', set: { known_text: "this isn't the best option I could choose", target_text: 'esta no es la mejor opción que podría elegir',
    components: [{ known: "this isn't", target: 'esta no es' }, { known: 'the best option', target: 'la mejor opción' }, { known: 'I could choose', target: 'que podría elegir' }] } },
  // 76: sintiéndome goes; never delete a LEGO, so L03 is re-cut into its neighbour's territory: "she saw me | me vio"
  // (L02 "she saw | vio" + the clitic), which keeps build-up order (L04 "nervous" still comes after it).
  { item: 76, lego_id: 'S0147L03', set: { known_text: 'she saw me', target_text: 'me vio', type: 'M', components: [{ known: 'me', target: 'me' }, { known: 'she saw', target: 'vio' }] } },
  // 9: the seed teaches "no he dormido".
  { item: 9, lego_id: 'S0055L02', set: { known_text: "I haven't slept", target_text: 'no he dormido', type: 'M', components: [{ known: "I haven't", target: 'no he' }, { known: 'slept', target: 'dormido' }] } },
];

// 45: "jugar a" is new (every later jugar is intransitive: jugar con…, seguir jugando, jugando en el barro), so a pattern
// LEGO is added after "different", and given a full basket through the v2 phrases door (it validates counts, vocab, containment).
const NEW_LEGO = { item: 45, row: { seed_number: 98, lego_index: 5, known_text: 'to play something', target_text: 'jugar a algo', type: 'M', is_new: true,
  components: [{ known: 'to play', target: 'jugar a' }, { known: 'something', target: 'algo' }] } };
const NEW_BASKET = {
  build: [
    ['To play something different', 'Jugar a algo diferente'],
    ['I want to play something', 'Quiero jugar a algo'],
    ["I'd like to play something", 'Me gustaría jugar a algo'],
    ['We want to play something', 'Queremos jugar a algo'],
  ],
  use: [
    ['I want to play something different today', 'Quiero jugar a algo diferente hoy'],
    ["I'd like to play something with my friends", 'Me gustaría jugar a algo con mis amigos'],
    ['Do you want to play something this afternoon?', '¿Quieres jugar a algo esta tarde?'],
    ['I think I should play something different', 'Creo que debería jugar a algo diferente'],
    ['We want to play something with everyone else', 'Queremos jugar a algo con todos los demás'],
    ['I want to play something with you', 'Quiero jugar a algo contigo'],
    ["I'd like to play something interesting", 'Me gustaría jugar a algo interesante'],
    ["It's fun to play something with other people", 'Es divertido jugar a algo con otras personas'],
    ['I want to learn to play something different', 'Quiero aprender a jugar a algo diferente'],
    ['Do you want to play something with me tomorrow?', '¿Quieres jugar a algo conmigo mañana?'],
  ],
};

const SEEDS = [
  [101, 49, null, 'estoy disfrutando de descubrir más sobre este idioma'],
  [122, 61, "It's starting to get easier and I'm excited about how it's going", 'está empezando a ser más fácil y estoy emocionado con cómo va'],
  [116, 54, "this isn't the best option I could choose", 'esta no es la mejor opción que podría elegir'],
  [139, 71, "I'm sorry, but I need to leave so early", 'lo siento, pero necesito irme tan temprano'],
  [140, 71, "I'm sorry, but I can't see what you're trying to show me", 'lo siento, pero no puedo ver lo que intentas mostrarme'],
  [147, 76, null, 'ella fue muy amable cuando me vio nervioso'],
  [55, 9, "I don't like waking up when I haven't slept very well", 'no me gusta despertarme cuando no he dormido muy bien'],
  [98, 45, null, 'debería considerar jugar a algo diferente'],
  [206, '44-revert', 'I enjoy the chance to practise speaking with you', 'disfruto la oportunidad de practicar hablando contigo'],
];

// [id, known|null, target|null]
const PHRASES = {
  49: [
    ['S0101L03U01', null, 'Estoy disfrutando de descubrir más sobre este idioma'],
    ['S0101L02B01', 'To find out', 'Descubrir'],
    ['S0101L02B02', 'To find out something', 'Descubrir algo'],
    ['S0101L02B03', "I'm enjoying finding out", 'Estoy disfrutando de descubrir'],
    ['S0101L02U01', null, 'Estoy disfrutando de descubrir algo'],
    ['S0101L02U02', 'I want to find out something interesting', 'Quiero descubrir algo interesante'],
    ['S0101L02U03', null, 'Estoy disfrutando de descubrir más'],
    ['S0101L02U04', "I'm enjoying finding out how to do this", 'Estoy disfrutando de descubrir cómo hacer esto'],
    ['S0101L02U05', "I'm enjoying finding out how to speak", 'Estoy disfrutando de descubrir cómo hablar'],
    ['S0101L02U06', null, 'Estoy disfrutando de descubrir más sobre eso'],
    ['S0101L02U07', 'I need to find out how to do something', 'Necesito descubrir cómo hacer algo'],
    ['S0101L02U08', "I'd like to find out more", 'Me gustaría descubrir más'],
  ],
  61: [
    ['S0122L02B01', 'To get easier', 'Ser más fácil'],
    ['S0122L02B03', "It's starting to get easier", 'Está empezando a ser más fácil'],
    ['S0122L02B04', 'To start to get easier', 'Empezar a ser más fácil'],
    ['S0122L02B05', "I think it's starting to get easier", 'Creo que está empezando a ser más fácil'],
    ['S0122L02B06', "It's going to get easier", 'Va a ser más fácil'],
    ['S0122L02B07', 'Speaking is starting to get easier', 'Hablar está empezando a ser más fácil'],
    ['S0122L02U01', "It is starting to get easier because I'm learning a lot", 'Está empezando a ser más fácil porque estoy aprendiendo mucho'],
    ['S0122L02U02', 'I think it is starting to get easier now', 'Creo que está empezando a ser más fácil ahora'],
    ['S0122L02U03', 'It is starting to get easier when I speak with another person', 'Está empezando a ser más fácil cuando hablo con otra persona'],
    ['S0122L02U07', 'I think speaking Spanish is starting to get easier', 'Creo que hablar español está empezando a ser más fácil'],
    ['S0122L02U09', 'Learning this language is starting to get easier', 'Aprender este idioma está empezando a ser más fácil'],
    ['S0122L02U10', 'It is starting to get easier and I am very happy about it', 'Está empezando a ser más fácil y estoy muy contento con eso'],
    ['S0122L02U11', 'It is starting to get easier to speak with people', 'Está empezando a ser más fácil hablar con personas'],
    ['S0122L02U12', 'It is starting to get easier to understand what you want to say', 'Está empezando a ser más fácil entender lo que quieres decir'],
    // knock-on: "sentirse" was taught only by the old LEGO; L01 (before L02) and later rows that used it say it with taught words
    ['S0122L01U02', 'I think it is starting to work better now', 'Creo que está empezando a funcionar mejor ahora'],
    ['S0187L01U05', 'It is good to be happy when you are learning something new', 'Es bueno estar contento cuando estás aprendiendo algo nuevo'],
    ['S0212L01U11', "They didn't want to start before practising", 'No querían empezar antes de practicar'],
    ['S0212L01U15', 'They wanted to practise more to speak better', 'Querían practicar más para hablar mejor'],
    ['S0218L03U04', 'I want to feel much better now', 'Quiero sentirme mucho mejor ahora'],
    ['S0218L03U10', 'I want to feel much better today and talk with you', 'Quiero sentirme mucho mejor hoy y hablar contigo'],
    ['S0246L01U15', 'She was too busy to spend time with her friend', 'Estaba demasiado ocupada para pasar tiempo con su amiga'],
    ['S0122L04U08', 'It is starting to get easier and I am excited with how it is going', 'Está empezando a ser más fácil y estoy emocionado con cómo va'],
    ['S0122L04U13', 'I am very excited because I think it is starting to get easier', 'Estoy muy emocionado porque creo que está empezando a ser más fácil'],
    ['S0122L05U03', "It's starting to get easier and I'm excited about how it's going", 'está empezando a ser más fácil y estoy emocionado con cómo va'],
    ['S0122L05U07', 'It is starting to get easier and I am excited with how it goes', 'Está empezando a ser más fácil y estoy emocionado con cómo va'],
  ],
  54: [
    // L01: "choice" → "option"; "hacer una opción" is not Spanish, so those three rows say what they mean
    ['S0116L01B01', 'Option', null],
    ['S0116L01B03', 'An option', null],
    ['S0116L01B04', 'A better option', null],
    ['S0116L01B05', 'A different option', null],
    ['S0116L01U01', 'I think speaking more is a better option than staying silent', null],
    ['S0116L01U02', "I'd like to try a different option this afternoon", null],
    ['S0116L01U03', 'I think learning Spanish is the best option', null],
    ['S0116L01U04', "I know that isn't the best option but I want to try that", 'Sé que no es la mejor opción pero quiero intentar eso'], // + intentar plan
    ['S0116L01U05', 'I think practising every day is the best option', null],
    ['S0116L01U06', "I'd like a different option this time", 'Me gustaría una opción diferente esta vez'],
    ['S0116L01U07', 'I think having a conversation is a much better option than staying silent', null],
    ['S0116L01U08', 'I feel that learning this language was the best option', null],
    ['S0116L01U09', 'I want a better option today than yesterday', 'Quiero una opción mejor hoy que ayer'],
    ['S0116L01U10', 'I need a different option for how to practise', 'Necesito una opción diferente para practicar'],
    ['S0116L01U11', 'I feel like working hard every day is the best option', null],
    // L03: a fresh set on "podría elegir"
    ['S0116L03B01', 'I could choose', 'Podría elegir'],
    ['S0116L03B03', 'I could choose this', 'Podría elegir esto'],
    ['S0116L03B04', 'What I could choose', 'Lo que podría elegir'],
    ['S0116L03B05', 'I could choose something different', 'Podría elegir algo diferente'],
    ['S0116L03B06', 'I think I could choose', 'Creo que podría elegir'],
    ['S0116L03U01', 'I think this is the best option I could choose today', 'Creo que esta es la mejor opción que podría elegir hoy'],
    ['S0116L03U02', 'I want to know what I could choose this afternoon', 'Quiero saber lo que podría elegir esta tarde'],
    ['S0116L03U03', 'I feel I could choose something different with more time', 'Siento que podría elegir algo diferente con más tiempo'],
    ['S0116L03U04', 'I know I could choose a better option', 'Sé que podría elegir una opción mejor'],
    ['S0116L03U05', 'I think I could choose a better option for learning', 'Creo que podría elegir una opción mejor para aprender'],
    ['S0116L03U06', "I'd like to know what I could choose today", 'Me gustaría saber lo que podría elegir hoy'],
    ['S0116L03U07', "I'm not sure what I could choose right now", 'No estoy seguro de lo que podría elegir en este momento'],
    ['S0116L03U08', 'I could choose another option tomorrow', 'Podría elegir otra opción mañana'],
    ['S0116L03U10', "I don't know what I could choose", 'No sé lo que podría elegir'],
    ['S0116L03U11', 'I think I could choose to practise more', 'Creo que podría elegir practicar más'],
    ['S0116L03U12', 'I know what I could choose this time', 'Sé lo que podría elegir esta vez'],
    ['S0116L03U13', "I'd like to know what I could choose to do this afternoon", 'Me gustaría saber lo que podría elegir hacer esta tarde'],
    ['S0116L03U15', 'I feel like I could choose a different way of learning', 'Siento que podría elegir una manera diferente de aprender'],
    // L04: the whole seed, now "option … choose … elegir"
    ['S0116L04B01', "This isn't the best option I could choose", 'Esta no es la mejor opción que podría elegir'],
    ['S0116L04B02', "I know this isn't the best option I could choose", 'Sé que esta no es la mejor opción que podría elegir'],
    ['S0116L04B03', "I think this isn't the best option I could choose", 'Creo que esta no es la mejor opción que podría elegir'],
    ['S0116L04B04', "unfortunately this isn't the best option I could choose", 'desafortunadamente esta no es la mejor opción que podría elegir'],
    ['S0116L04B05', "I think that this isn't the best option I could choose but it's the only way", 'creo que esta no es la mejor opción que podría elegir pero es la única manera'],
    ['S0116L04C02', 'The best option', null],
    ['S0116L04U01', "I think this isn't the best option I could choose but I'm going to try that", 'Creo que esta no es la mejor opción que podría elegir pero voy a intentar eso'], // + intentar plan
    ['S0116L04U02', "I know that this isn't the best option I could choose right now", 'Sé que esta no es la mejor opción que podría elegir ahora'],
    ['S0116L04U03', "I feel that this isn't the best option I could choose because I need more time", 'Siento que esta no es la mejor opción que podría elegir porque necesito más tiempo'],
    ['S0116L04U04', "I think this isn't the best option I could choose to improve my Spanish", 'Creo que esta no es la mejor opción que podría elegir para mejorar mi español'],
    ['S0116L04U05', "I want to understand why this isn't the best option I could choose today", 'Quiero entender por qué esta no es la mejor opción que podría elegir hoy'],
    ['S0116L04U06', "I know this isn't the best option I could choose this afternoon but I'm ready to try that", 'Sé que esta no es la mejor opción que podría elegir esta tarde pero estoy listo para intentar eso'], // + intentar plan
    ['S0116L04U07', "I'd like to know why this isn't the best option I could choose right now", 'Me gustaría saber por qué esta no es la mejor opción que podría elegir en este momento'],
    ['S0116L04U08', "I think that this isn't the best option I could choose and I want to do better", 'Creo que esta no es la mejor opción que podría elegir y quiero hacer lo mejor posible'],
    ['S0116L04U09', "I think this isn't the best option I could choose this morning but I'll try that", 'Creo que esta no es la mejor opción que podría elegir esta mañana pero voy a intentar eso'], // + intentar plan
    ['S0116L04U10', "I feel this isn't the best option I could choose because I'm not ready yet", 'Siento que esta no es la mejor opción que podría elegir porque no estoy listo todavía'],
    ['S0116L04U11', "I know this isn't the best option I could choose but it's all I can do right now", 'Sé que esta no es la mejor opción que podría elegir pero es todo lo que puedo hacer ahora'],
    ['S0116L04U12', "I don't know why this isn't the best option I could choose at this moment", 'No sé por qué esta no es la mejor opción que podría elegir en este momento'],
    ['S0116L04U13', "I think this isn't the best option I could choose for learning Spanish well", 'Creo que esta no es la mejor opción que podría elegir para aprender español bien'],
    ['S0116L04U14', "I feel like this isn't the best option I could choose and I want to work harder", 'Siento que esta no es la mejor opción que podría elegir y quiero trabajar más duro'],
  ],
  71: [
    ['S0139L03U06', "I'm sorry, but I need to leave so early", 'lo siento, pero necesito irme tan temprano'],
    ['S0140L01U01', "I'm sorry, but I can't see what you try to show me", 'Lo siento, pero no puedo ver lo que intentas mostrarme'],
    ['S0140L01U09', "I'm sorry, but I can't see what you're trying to show me", 'lo siento, pero no puedo ver lo que intentas mostrarme'],
    ['S0235L02U13', "I'm sorry, but I couldn't tell you before because it's difficult to explain", 'Lo siento, pero no pude decirte antes porque es difícil de explicar'],
  ],
  76: [
    ['S0147L03B01', 'She saw me', 'Me vio'],
    ['S0147L03B02', 'She saw me here', 'Me vio aquí'],
    ['S0147L03B04', 'When she saw me', 'Cuando me vio'],
    ['S0147L03U01', 'I think she saw me yesterday', 'Creo que me vio ayer'],
    ['S0147L03U02', 'She saw me when I was speaking Spanish', 'Me vio cuando estaba hablando español'],
    ['S0147L03U04', 'She saw me and said nothing', 'Me vio y no dijo nada'],
    ['S0147L03U05', 'When she saw me she wanted to talk', 'Cuando me vio quería hablar'],
    ['S0147L03U08', 'She saw me with my friend last night', 'Me vio con mi amigo anoche'],
    ['S0147L03U09', 'She saw me speaking with you', 'Me vio hablando contigo'],
    ['S0147L03U10', 'She saw me when I was learning', 'Me vio cuando estaba aprendiendo'],
    ['S0147L03U11', "I don't know if she saw me", 'No sé si me vio'],
    ['S0147L03U15', 'When she saw me she was very happy', 'Cuando me vio estaba muy contento'],
    ['S0147L04B03', null, 'Ella fue muy amable cuando me vio nervioso'],
    ['S0147L04U03', null, 'Ella me vio nervioso'],
    ['S0147L04U11', 'I was nervous doing that', 'Estaba nervioso haciendo eso'],
  ],
  9: [
    ['S0055L02B01', "I haven't slept", 'No he dormido'],
    ['S0055L02B03', "I haven't slept well", 'No he dormido bien'],
    ['S0055L02B05', "I haven't slept very well", 'No he dormido muy bien'],
    ['S0055L02B06', "I haven't slept well today", 'No he dormido bien hoy'],
    ['S0055L02B07', "I'm tired because I haven't slept", 'Estoy cansado porque no he dormido'],
    ['S0055L02U02', "I haven't slept well this week", 'No he dormido bien esta semana'],
    ['S0055L02U04', "I don't like waking up when I haven't slept very well", 'no me gusta despertarme cuando no he dormido muy bien'],
    ['S0055L02U05', "I haven't slept well but I'm starting to feel better", 'No he dormido bien pero estoy empezando a sentirme mejor'],
    ['S0055L02U07', "I haven't slept well and I'm tired", 'No he dormido bien y estoy cansado'],
    ['S0055L02U09', "I haven't slept well and I don't want to speak now", 'No he dormido bien y no quiero hablar ahora'],
    ['S0055L02U10', "I haven't slept well because I was thinking too much", 'No he dormido bien porque estaba pensando demasiado'],
    ['S0055L02U13', "I'm tired because I haven't slept well", 'Estoy cansado porque no he dormido bien'],
    ['S0055L02U15', "I don't like waking up when I haven't slept well", 'No me gusta despertarme cuando no he dormido bien'],
    // knock-on: every later row that leaned on the old LEGO "I slept | dormí"
    ['S0057L01U02', "I can't remember how to say what I wanted to say because I haven't slept well", 'No puedo recordar cómo decir lo que quería decir porque no he dormido bien'],
    ['S0144L01U14', 'It surprises me how early I woke up this morning', 'Me sorprende lo temprano que me desperté esta mañana'],
    ['S0192L02U02', "I haven't slept very well at night so I feel tired this morning", 'No he dormido muy bien por la noche así que me siento cansado esta mañana'],
    ['S0192L02U10', "I don't like waking up at night when I haven't slept very well", 'No me gusta despertarme por la noche cuando no he dormido muy bien'],
    ['S0192L02U13', "I haven't slept well at night and that's why I'm so tired today", 'No he dormido bien por la noche y por eso estoy tan cansado hoy'],
    ['S0217L07U14', "I need a lot of water this morning because I haven't slept very well", 'Necesito mucha agua esta mañana porque no he dormido muy bien'],
  ],
  45: [
    ['S0098L04U10', null, 'debería considerar jugar a algo diferente'],
  ],
  // #219·AB plan (d/e3646832): before seed 146 the object clitic -lo is not taught, so "intentar" takes a taught object
  // (algo S4, eso S37, nada S35, hablar) or is bare where "again" completes it; from 146 on "intentarlo" stays and the
  // English says "it". The S0116 rows are in item 54 above.
  16: [
    ['S0007L01B01', "I'm going to try to speak", 'Voy a intentar hablar'],
    ['S0007L01B02', 'I want to try something', 'Quiero intentar algo'],
    ['S0007L02B03', 'I want to try something today', 'Quiero intentar algo hoy'],
    ['S0012L01B01', "I'm going to try something tomorrow", 'Voy a intentar algo mañana'],
    ['S0016L01B04', 'He wants to try something', 'Él quiere intentar algo'],
    ['S0017L01B05', 'She wants to try something', 'Ella quiere intentar algo'],
    ['S0047L01B05', 'I think that I want to try something', 'Creo que quiero intentar algo'],
    ['S0061L03U04', null, 'Voy a intentar otra vez porque quiero hablar bien'],
    ['S0066L01U05', "I think it's difficult but I'd like to try that", 'Creo que es difícil pero me gustaría intentar eso'],
    ['S0066L01U08', "I think it's difficult but important to try that", 'Creo que es difícil pero importante intentar eso'],
    ['S0067L01B03', "I know why you want to stop but it's important to try that", 'Sé por qué quieres parar pero es importante intentar eso'],
    ['S0088L02U03', 'I still want to try something', 'Todavía quiero intentar algo'],
    ['S0099L01B02', 'You should try something', 'Deberías intentar algo'],
    ['S0104L01B04', 'We need to try something', 'Necesitamos intentar algo'],
    ['S0115L04U07', "I don't feel as if I'm ready to have a conversation but I want to try that", 'No me siento listo para tener una conversación pero quiero intentar eso'],
    ['S0137L01U10', "It's more important to make mistakes than not to try anything", 'Es más importante cometer errores que no intentar nada'],
    ['S0141L02U05', null, 'Está bien intentar otra vez cuando algo no está funcionando'],
    ['S0147L04U05', "I feel nervous but I'm going to try it", null],
    ['S0172L01U03', "Yes, I know it's difficult but I'm going to try it", null],
    ['S0178L02B04', 'Although I wanted to try it', null],
    ['S0186L02B04', 'I will try it next week', null],
    ['S0200L02B04', 'They want to try it', null],
    ['S0244L03U04', "I already know that it's not going to be easy but I want to try it", null],
    ['S0252L01U04', 'I am not sure you will be ready in time but let us try it', null],
    ['S0295L03B06', "I didn't say that I wanted to finish in a day but I said I was going to try it", null],
    ['S0295L01U12', 'I already said that I wanted to try it again and I still want to', null],
    ['S0296L02U15', 'I said that I needed a little more time to feel ready to try it again', null],
    ['S0466L01B03', 'let me try it', null],
    ['S0531L01U02', 'anyone can try it', null],
    ['S0569L03U01', 'are you willing to try it?', null],
    ['S0587L01U05', 'she insisted on trying it again many times', null],
    ['S0631L01B03', "you'd like to try it", null],
  ],
  // #215·AB: put the 53 "practicar el español hablando" rows (and seed 206, in SEEDS) back to bare "practicar hablando",
  // pattern only — the other #425 edits on the same rows (creo que, a menudo) stay, and the English goes back to its own
  // "speaking with"/"talking with". Rows marked * also carry other #425 edits, so their exact pair never had a clip.
  '44-revert': [
  ["S0016L04U07", "He wants to practise speaking with everyone else later on today", "Él quiere practicar hablando con todos los demás más tarde hoy"],
  ["S0016L01U03", "He wants to practise speaking with someone else", "Él quiere practicar hablando con otra persona"],
  ["S0016L03U06", "He wants to practise speaking with everyone else today", "Él quiere practicar hablando con todos los demás hoy"],
  ["S0017L01U04", "She wants to practise speaking with someone else", "ella quiere practicar hablando con otra persona"],
  ["S0018L01U05", "We want to practise speaking with someone else", "queremos practicar hablando con otra persona"],
  ["S0020L01U05", "You want to practise speaking with someone else", "Quieres practicar hablando con otra persona"],
  ["S0021L01U03", "Why try to practise speaking with another person?", "¿Por qué intentar practicar hablando con otra persona?"],
  ["S0022L01U08", "Because I am going to practise speaking with another person", "Porque voy a practicar hablando con otra persona"],
  ["S0022L01U03", "Because I would like to practise speaking with another person", "Porque me gustaría practicar hablando con otra persona"],
  ["S0024L01U06", "I am not going to be able to practise speaking with another person today", "No voy a poder practicar hablando con otra persona hoy"],
  ["S0025L03U02", "He wants to practise speaking with you before I have to go", "Él quiere practicar hablando contigo antes de que tenga que irme"],
  ["S0025L01U01", "Are you going to practise speaking with another person today?", "¿Vas a practicar hablando con otra persona hoy?"],
  ["S0030L01U03", "I wanted to practise speaking with another person", "Quería practicar hablando con otra persona"],
  ["S0030L03U02", "I wanted to practise speaking with another person yesterday", "Quería practicar hablando con otra persona ayer"],
  ["S0031L02U07", "She wants to practise speaking with me today", "Ella quiere practicar hablando conmigo hoy"],
  ["S0041L01U08", "I feel well, I want to practise speaking with another person", "Me siento bien, quiero practicar hablando con otra persona"],
  ["S0041L03U04", "I'm starting to practise speaking with another person", "Estoy empezando a practicar hablando con otra persona"],
  ["S0042L01U05", "I was starting to practise speaking with another person", "Estaba empezando a practicar hablando con otra persona"],
  ["S0046L02U06", "I'm going to practise speaking with another person, I don't worry about making mistakes", "Voy a practicar hablando con otra persona, no me preocupo por cometer errores"],
  ["S0047L02U01", "I think that it's good to practise speaking with another person", "Creo que es bueno practicar hablando con otra persona"], // *
  ["S0047L01U02", "I think that I want to practise speaking with another person", "Creo que quiero practicar hablando con otra persona"], // *
  ["S0051L03U03", "I like to practise speaking with my friends", "Me gusta practicar hablando con mis amigos"],
  ["S0058L03U14", "She wants to remember enough words to practise speaking with you", "Ella quiere recordar suficientes palabras para practicar hablando contigo"],
  ["S0084L02U06", "I want to practise talking with my friend as often as possible", "Quiero practicar hablando con mi amigo lo más a menudo posible"], // *
  ["S0090L04U06", "It would be important to practise talking with another person", "Sería importante practicar hablando con otra persona"],
  ["S0098L01U13", "I think I should practise speaking with another person", "Creo que debería practicar hablando con otra persona"], // *
  ["S0099L01U15", "You should try to practise speaking with another person today", "Deberías intentar practicar hablando con otra persona hoy"],
  ["S0099L01U08", "You should practise speaking with other people", "Deberías practicar hablando con otras personas"],
  ["S0104L01U02", "We need to practise speaking with another person", "Necesitamos practicar hablando con otra persona"],
  ["S0106L04U12", "It is hard to practise speaking with another person as often as possible", "Es duro practicar hablando con otra persona lo más a menudo posible"], // *
  ["S0106L01U06", "We need to feel happy to practise speaking with another person", "Necesitamos sentirnos contentos para practicar hablando con otra persona"],
  ["S0107L01U05", "We were hoping to practise speaking with another person", "Esperábamos practicar hablando con otra persona"],
  ["S0108L01B05", "We just need to wake up to practise speaking with another person", "Solo necesitamos despertarnos para practicar hablando con otra persona"],
  ["S0108L01U05", "We just need to wake up to practise speaking with another person", "Solo necesitamos despertarnos para practicar hablando con otra persona"],
  ["S0109L02U03", "I think the best way to learn new words is to practise speaking with people as much as possible", "Creo que la mejor manera de aprender palabras nuevas es practicar hablando con personas lo más posible"], // *
  ["S0109L01U04", "We must find a way to practise speaking with people as much as possible", "Tenemos que encontrar una manera de practicar hablando con personas lo más posible"],
  ["S0115L01U09", "I should have more time to practise speaking with my friends", "Debería tener más tiempo para practicar hablando con mis amigos"],
  ["S0135L03U05", "It's so good to practise talking with another person", "Es tan bueno practicar hablando con otra persona"],
  ["S0151L02U12", "I thought it was a good idea to practise speaking with another person", "Pensé que era una buena idea practicar hablando con otra persona"],
  ["S0157L02U14", "So I'm going to practise talking with another person next month as much as possible", "Así que el mes que viene voy a practicar hablando con otra persona lo más a menudo posible"], // *
  ["S0157L02U06", "Next month I'm going to practise talking with another person", "El mes que viene voy a practicar hablando con otra persona"],
  ["S0161L04U03", "On Sunday I'm going to practise talking with another person", "El domingo voy a practicar hablando con otra persona"],
  ["S0161L05U14", "On Sunday morning I think it's useful to practise talking with another person", "El domingo por la mañana creo que es útil practicar hablando con otra persona"], // *
  ["S0161L05U03", "On Sunday morning I'm going to practise talking with another person", "El domingo por la mañana voy a practicar hablando con otra persona"],
  ["S0163L03U05", "I think that it is interesting to practise talking with them", "Creo que es interesante practicar hablando con ellos"], // *
  ["S0206L02B03", "I enjoy the opportunity to practise talking with you", "Disfruto la oportunidad de practicar hablando contigo"],
  ["S0206L02U01", "I enjoy the opportunity to practise talking with you as often as possible", "Disfruto la oportunidad de practicar hablando contigo lo más a menudo posible"], // *
  ["S0206L02U16", "I enjoy the chance to practise speaking with you", "disfruto la oportunidad de practicar hablando contigo"],
  ["S0206L02U06", "I had a good opportunity to practise talking with other people today", "Tuve una buena oportunidad de practicar hablando con otras personas hoy"],
  ["S0219L02U03", "It would be nice to practise speaking with you here", "Sería agradable practicar hablando contigo aquí"],
  ["S0259L01U17", "An idea would be to practise speaking with you tomorrow", "Una idea sería practicar hablando contigo mañana"],
  ["S0295L01U09", "I said that I wanted to practise talking with other people", "Dije que quería practicar hablando con otras personas"],
  ["S0296L02U11", "I said that I needed a little more time to practise speaking with other people", "Dije que necesitaba un poco más de tiempo para practicar hablando con otras personas"],
  ],
};

// Rows whose LEGO text is not found word-for-word in them, on purpose (the gate lists every other one as a failure).
const CONTAINMENT_OK = {
  'seed 101': 'Kai: "to find out | descubrir"; the seed English says "finding out"',
  'seed 98': 'the English says "playing something else": the gerund of "to play something", and "else" is diferente',
  'S0101L02': 'the English says "enjoying finding out": the gerund of "to find out" after "enjoying" (the LEGO is not new, so its basket is not played)',
  'seed 147': 'the English keeps "feeling nervous"; the Spanish is Deborah\'s "me vio nervioso"',
};

module.exports = { COURSE, APPROVAL, LEGOS, NEW_LEGO, NEW_BASKET, SEEDS, PHRASES, CONTAINMENT_OK };
