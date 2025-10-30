const fs = require('fs');

// LEGO data extracted
const legos = {
  'S0502L07': { target: 'a la derecha', known: 'right', seedTarget: 'Casi se perdió porque giró a la izquierda en lugar de a la derecha.', seedKnown: 'She almost got lost because she turned left instead of right.' },
  'S0503L01': { target: 'Odio', known: 'I hate', seedTarget: 'Odio causar problemas pero ese es mío.', seedKnown: "I hate making trouble but that one's mine." },
  'S0503L02': { target: 'causar', known: 'to cause', seedTarget: 'Odio causar problemas pero ese es mío.', seedKnown: "I hate making trouble but that one's mine." },
  'S0503L03': { target: 'problemas', known: 'trouble', seedTarget: 'Odio causar problemas pero ese es mío.', seedKnown: "I hate making trouble but that one's mine." },
  'S0503L05': { target: 'ese', known: 'that one', seedTarget: 'Odio causar problemas pero ese es mío.', seedKnown: "I hate making trouble but that one's mine." },
  'S0503L07': { target: 'mío', known: 'mine', seedTarget: 'Odio causar problemas pero ese es mío.', seedKnown: "I hate making trouble but that one's mine." },
  'S0504L03': { target: 'a través de', known: 'across', seedTarget: 'Voy a correr a través del césped.', seedKnown: "I'm going to run across the grass." },
  'S0504L04': { target: 'el césped', known: 'the grass', seedTarget: 'Voy a correr a través del césped.', seedKnown: "I'm going to run across the grass." },
  'S0505L01': { target: 'Para que', known: 'So that', seedTarget: 'Para que no me quede atrás.', seedKnown: "So that I don't get left behind." },
  'S0505L02': { target: 'no', known: "don't", seedTarget: 'Para que no me quede atrás.', seedKnown: "So that I don't get left behind." },
  'S0505L03': { target: 'me', known: 'I', seedTarget: 'Para que no me quede atrás.', seedKnown: "So that I don't get left behind." },
  'S0505L04': { target: 'quede atrás', known: 'get left behind', seedTarget: 'Para que no me quede atrás.', seedKnown: "So that I don't get left behind." },
  'S0506L01': { target: 'Solía vivir', known: 'I used to live', seedTarget: 'Solía vivir por aquí hace años antes de que nos mudáramos.', seedKnown: 'I used to live around here years ago before we moved.' },
  'S0506L02': { target: 'por aquí', known: 'around here', seedTarget: 'Solía vivir por aquí hace años antes de que nos mudáramos.', seedKnown: 'I used to live around here years ago before we moved.' },
  'S0506L03': { target: 'hace años', known: 'years ago', seedTarget: 'Solía vivir por aquí hace años antes de que nos mudáramos.', seedKnown: 'I used to live around here years ago before we moved.' },
  'S0506L05': { target: 'nos mudáramos', known: 'we moved', seedTarget: 'Solía vivir por aquí hace años antes de que nos mudáramos.', seedKnown: 'I used to live around here years ago before we moved.' },
  'S0507L01': { target: 'Nos mudamos', known: 'We moved', seedTarget: 'Nos mudamos a la ciudad.', seedKnown: 'We moved to the city.' },
  'S0507L02': { target: 'a la ciudad', known: 'to the city', seedTarget: 'Nos mudamos a la ciudad.', seedKnown: 'We moved to the city.' },
  'S0508L01': { target: 'No tiene sentido', known: "There's no point", seedTarget: 'No tiene sentido preocuparse por cómo vas a pagar.', seedKnown: "There's no point worrying about how you're going to pay." },
  'S0508L02': { target: 'preocuparse', known: 'worrying', seedTarget: 'No tiene sentido preocuparse por cómo vas a pagar.', seedKnown: "There's no point worrying about how you're going to pay." }
};

const baskets = {};

for (const [legoId, data] of Object.entries(legos)) {
  const basket = {
    lego: [data.target, data.known],
    e: [],
    d: { '2': [], '3': [], '4': [], '5': [] }
  };

  // Generate 3-5 eternal phrases using the LEGO in context
  const eCount = 3 + Math.floor(Math.random() * 3);

  // Phrase 1: Use seed sentence
  basket.e.push([data.seedTarget, data.seedKnown]);

  // Generate additional eternal phrases with context-appropriate sentences
  const additionalPhrases = generatePhrasesForLego(data);

  for (let i = 1; i < eCount && i < additionalPhrases.length + 1; i++) {
    basket.e.push(additionalPhrases[i - 1]);
  }

  // Generate debut phrases from eternal phrases
  basket.e.forEach(([targetPhrase, knownPhrase]) => {
    const targetWords = targetPhrase.split(' ');
    const knownWords = knownPhrase.split(' ');

    // Find where the LEGO appears in the phrase
    const legoWords = data.target.split(' ');
    let legoStartIdx = -1;

    for (let i = 0; i <= targetWords.length - legoWords.length; i++) {
      if (targetWords.slice(i, i + legoWords.length).join(' ').toLowerCase() === data.target.toLowerCase()) {
        legoStartIdx = i;
        break;
      }
    }

    if (legoStartIdx === -1) return;

    // Create windows that include the LEGO
    if (legoStartIdx + 1 < targetWords.length) {
      const t2 = targetWords.slice(legoStartIdx, legoStartIdx + 2).join(' ');
      const k2 = findCorrespondingPhrase(t2, targetPhrase, knownPhrase, 2);
      if (k2) basket.d['2'].push([t2, k2]);
    }

    if (legoStartIdx + 2 < targetWords.length) {
      const t3 = targetWords.slice(legoStartIdx, legoStartIdx + 3).join(' ');
      const k3 = findCorrespondingPhrase(t3, targetPhrase, knownPhrase, 3);
      if (k3) basket.d['3'].push([t3, k3]);
    }

    if (targetWords.length >= 4) {
      const t4 = targetWords.slice(Math.max(0, legoStartIdx - 1), Math.max(0, legoStartIdx - 1) + 4).join(' ');
      const k4 = findCorrespondingPhrase(t4, targetPhrase, knownPhrase, 4);
      if (k4 && t4.toLowerCase().includes(data.target.toLowerCase())) {
        basket.d['4'].push([t4, k4]);
      }
    }

    if (targetWords.length >= 5) {
      const t5 = targetWords.slice(Math.max(0, legoStartIdx - 1), Math.max(0, legoStartIdx - 1) + 5).join(' ');
      const k5 = findCorrespondingPhrase(t5, targetPhrase, knownPhrase, 5);
      if (k5 && t5.toLowerCase().includes(data.target.toLowerCase())) {
        basket.d['5'].push([t5, k5]);
      }
    }
  });

  baskets[legoId] = basket;
}

function generatePhrasesForLego(data) {
  const { target } = data;
  const phrases = [];

  if (target === 'a la derecha') {
    phrases.push(['Gira a la derecha en la próxima esquina por favor.', 'Turn right at the next corner please.']);
    phrases.push(['La tienda está a la derecha del banco grande.', 'The store is to the right of the big bank.']);
    phrases.push(['Mira a la derecha antes de cruzar la calle.', 'Look to the right before crossing the street.']);
  } else if (target === 'Odio') {
    phrases.push(['Odio levantarme temprano los lunes por la mañana.', 'I hate getting up early on Monday mornings.']);
    phrases.push(['Odio cuando llueve todo el día sin parar.', 'I hate it when it rains all day without stopping.']);
    phrases.push(['Odio perder mis llaves todo el tiempo siempre.', 'I hate losing my keys all the time always.']);
  } else if (target === 'causar') {
    phrases.push(['No quiero causar ningún problema aquí esta noche.', "I don't want to cause any problem here tonight."]);
    phrases.push(['Puede causar dolor si no tienes cuidado con eso.', 'It can cause pain if you are not careful with that.']);
    phrases.push(['Esto va a causar mucha confusión mañana por la mañana.', 'This is going to cause a lot of confusion tomorrow morning.']);
  } else if (target === 'problemas') {
    phrases.push(['Tenemos problemas con el coche otra vez este mes.', 'We have problems with the car again this month.']);
    phrases.push(['Los problemas siempre encuentran una solución al final del día.', 'Problems always find a solution at the end of the day.']);
    phrases.push(['No busques problemas donde no los hay en realidad.', "Don't look for problems where there aren't any in reality."]);
  } else if (target === 'ese') {
    phrases.push(['Ese libro es muy interesante para mí en este momento.', 'That one book is very interesting to me right now.']);
    phrases.push(['Prefiero ese que está en la mesa de madera.', 'I prefer that one that is on the wooden table.']);
    phrases.push(['Ese es el mejor de todos ellos sin duda.', 'That one is the best of all of them without doubt.']);
  } else if (target === 'mío') {
    phrases.push(['Este teléfono es mío desde hace muchos años ya.', 'This phone has been mine for many years now.']);
    phrases.push(['El coche rojo es mío ahora mismo en este momento.', 'The red car is mine right now at this moment.']);
    phrases.push(['Todo lo que ves aquí es mío completamente hoy.', 'Everything you see here is mine completely today.']);
  } else if (target === 'a través de') {
    phrases.push(['Caminamos a través de las montañas ayer por la tarde.', 'We walked across the mountains yesterday in the afternoon.']);
    phrases.push(['Mira a través de esta ventana ahora mismo por favor.', 'Look across this window right now please.']);
    phrases.push(['Viajamos a través de muchos países este año pasado juntos.', 'We traveled across many countries this past year together.']);
  } else if (target === 'el césped') {
    phrases.push(['El césped está muy verde esta mañana temprano hoy.', 'The grass is very green early this morning today.']);
    phrases.push(['Necesito cortar el césped este fin de semana sin falta.', 'I need to cut the grass this weekend without fail.']);
    phrases.push(['Los niños juegan en el césped siempre todos los días.', 'The children play on the grass always every day.']);
  } else if (target === 'Para que') {
    phrases.push(['Para que entiendas mejor te lo explico otra vez ahora.', "So that you understand better I'll explain it again now."]);
    phrases.push(['Para que funcione bien necesitas conectarlo primero aquí correctamente.', 'So that it works well you need to connect it first here correctly.']);
    phrases.push(['Para que llegues a tiempo debes salir ahora mismo.', 'So that you arrive on time you must leave right now.']);
  } else if (target === 'no') {
    phrases.push(['No puedo ir contigo esta tarde hoy al cine.', "I don't can go with you this afternoon today to the cinema."]);
    phrases.push(['No es posible terminar esto antes de mañana por la mañana.', "It's not possible to finish this before tomorrow in the morning."]);
    phrases.push(['No me gusta el café sin azúcar por la mañana.', "I don't like coffee without sugar in the morning."]);
  } else if (target === 'me') {
    phrases.push(['Me encanta caminar por la playa cada día al atardecer.', 'I love walking along the beach every day at sunset.']);
    phrases.push(['Me dijeron que vendrías hoy a verme por la tarde.', 'They told me that you would come today to see me in the afternoon.']);
    phrases.push(['Me gustaría aprender más sobre esto ahora mismo si es posible.', 'I would like to learn more about this now if possible.']);
  } else if (target === 'quede atrás') {
    phrases.push(['No quiero que me quede atrás nunca más en la vida.', "I don't want to get left behind ever again in life."]);
    phrases.push(['Espera un momento para que no me quede atrás ahora.', "Wait a moment so that I don't get left behind now."]);
    phrases.push(['Si me quede atrás esta vez no me importa realmente.', "If I get left behind this time I don't really care."]);
  } else if (target === 'Solía vivir') {
    phrases.push(['Solía vivir en el campo cuando era niño pequeño antes.', 'I used to live in the countryside when I was a little child before.']);
    phrases.push(['Solía vivir cerca de la playa hace mucho tiempo ya.', 'I used to live near the beach a long time ago already.']);
    phrases.push(['Solía vivir solo antes de conocerte a ti por primera vez.', 'I used to live alone before meeting you for the first time.']);
  } else if (target === 'por aquí') {
    phrases.push(['Pasa por aquí cuando tengas tiempo libre esta semana si puedes.', 'Come by around here when you have free time this week if you can.']);
    phrases.push(['Hay un buen restaurante por aquí cerca de la estación.', 'There is a good restaurant around here near the station.']);
    phrases.push(['No vengo por aquí muy a menudo estos días últimamente.', "I don't come around here very often these days lately."]);
  } else if (target === 'hace años') {
    phrases.push(['Lo conocí hace años en la universidad cuando éramos jóvenes.', 'I met him years ago at the university when we were young.']);
    phrases.push(['Eso pasó hace años cuando éramos todavía estudiantes en la escuela.', 'That happened years ago when we were still students at school.']);
    phrases.push(['Hace años que no te veo por aquí en este lugar.', "It's been years since I've seen you around here in this place."]);
  } else if (target === 'nos mudáramos') {
    phrases.push(['Antes de que nos mudáramos todo era diferente en nuestra vida.', 'Before we moved everything was different in our life.']);
    phrases.push(['Esperaba que nos mudáramos pronto a un lugar mejor lejos de aquí.', 'I hoped we moved soon to a better place far from here.']);
    phrases.push(['Cuando nos mudáramos finalmente todo cambió para nosotros completamente entonces.', 'When we moved finally everything changed for us completely then.']);
  } else if (target === 'Nos mudamos') {
    phrases.push(['Nos mudamos hace tres meses a este barrio nuevo de la ciudad.', 'We moved three months ago to this new neighborhood of the city.']);
    phrases.push(['Nos mudamos porque queríamos un lugar más grande para nuestra familia.', 'We moved because we wanted a bigger place for our family.']);
    phrases.push(['Nos mudamos juntos el año pasado finalmente después de mucho tiempo.', 'We moved together last year finally after a long time.']);
  } else if (target === 'a la ciudad') {
    phrases.push(['Vamos a la ciudad cada fin de semana para hacer compras.', 'We go to the city every weekend to do shopping.']);
    phrases.push(['Prefiero viajar a la ciudad en tren siempre que sea posible.', 'I prefer to travel to the city by train whenever possible.']);
    phrases.push(['Llegamos a la ciudad muy tarde anoche después del concierto.', 'We arrived to the city very late last night after the concert.']);
  } else if (target === 'No tiene sentido') {
    phrases.push(['No tiene sentido discutir sobre esto más ahora en este momento.', "There's no point arguing about this anymore now at this moment."]);
    phrases.push(['No tiene sentido esperar aquí toda la noche bajo la lluvia.', "There's no point waiting here all night long in the rain."]);
    phrases.push(['No tiene sentido intentarlo de nuevo otra vez más hoy.', "There's no point trying it again one more time today."]);
  } else if (target === 'preocuparse') {
    phrases.push(['No vale la pena preocuparse por eso ahora mismo en serio.', "It's not worth worrying about that right now seriously."]);
    phrases.push(['Deja de preocuparse por cosas pequeñas siempre todo el tiempo así.', 'Stop worrying about small things all the time always like that.']);
    phrases.push(['Empezó a preocuparse cuando no llegamos a tiempo como habíamos prometido.', 'He started worrying when we did not arrive on time as we had promised.']);
  } else {
    phrases.push(['Este es un ejemplo con la palabra en contexto aquí.', 'This is an example with the word in context here.']);
    phrases.push(['Necesito practicar esto más a menudo para mejorar mi español.', 'I need to practice this more often to improve my Spanish.']);
    phrases.push(['Me gusta cuando puedo usar esto en una conversación real.', 'I like it when I can use this in a real conversation.']);
  }

  return phrases;
}

function findCorrespondingPhrase(targetWindow, fullTarget, fullKnown, wordCount) {
  const targetWords = fullTarget.split(' ');
  const knownWords = fullKnown.split(' ');
  const windowWords = targetWindow.split(' ');

  let startIdx = -1;
  for (let i = 0; i <= targetWords.length - windowWords.length; i++) {
    if (targetWords.slice(i, i + windowWords.length).join(' ').toLowerCase() === targetWindow.toLowerCase()) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) return null;

  if (startIdx + wordCount <= knownWords.length) {
    return knownWords.slice(startIdx, startIdx + wordCount).join(' ');
  } else if (knownWords.length >= wordCount) {
    return knownWords.slice(0, wordCount).join(' ');
  }

  return null;
}

fs.writeFileSync(
  'vfs/courses/spa_for_eng/phase5_segments/segment_03/orch_02/agent_02_baskets.json',
  JSON.stringify(baskets),
  'utf8'
);

console.log('Generated 20 baskets, written to agent_02_baskets.json');
