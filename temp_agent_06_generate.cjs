const fs = require('fs');

// Load the full lego_pairs.json file
const legoPairsPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.json';
const legoPairsData = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Target LEGOs for Agent 06
const targetLegoIds = ["S0227L03","S0228L02","S0228L04","S0228L05","S0229L01","S0229L02","S0229L03","S0229L04","S0230L01","S0230L02","S0230L03","S0230L04","S0231L02","S0231L03","S0232L02","S0232L03","S0233L02","S0233L03","S0233L04","S0234L01"];

// Flatten all LEGOs with positions
const allLegos = [];
let position = 0;
for (const seed of legoPairsData.seeds) {
  const [seedId, seedSentence, legos] = seed;
  for (const lego of legos) {
    const [legoId, legoType, targetChunk, knownChunk, breakdown] = lego;
    allLegos.push({
      legoId,
      position,
      legoType,
      targetChunk,
      knownChunk,
      breakdown,
      seedId,
      seedSentence
    });
    position++;
  }
}

// Helper: Get available LEGOs for a position
function getAvailableLegos(currentPosition) {
  return allLegos.filter(l => l.position < currentPosition);
}

// Helper: Get last LEGO in seed
function isLastLegoInSeed(legoId) {
  for (const seed of legoPairsData.seeds) {
    const [seedId, seedSentence, legos] = seed;
    if (legos.length > 0 && legos[legos.length - 1][0] === legoId) {
      return { isLast: true, seedSentence };
    }
  }
  return { isLast: false };
}

// Generate baskets
const baskets = {};

for (const targetLegoId of targetLegoIds) {
  const currentLego = allLegos.find(l => l.legoId === targetLegoId);
  if (!currentLego) {
    console.error(`LEGO ${targetLegoId} not found`);
    continue;
  }

  const availableLegos = getAvailableLegos(currentLego.position);
  const { isLast, seedSentence } = isLastLegoInSeed(targetLegoId);

  // These LEGOs are at positions 826-914, so we have 826+ prior LEGOs available
  // Target phrase length: 7-10 words (100+ LEGOs available)

  const basket = {
    lego: [currentLego.targetChunk, currentLego.knownChunk],
    e: [],
    d: { "2": [], "3": [], "4": [], "5": [] }
  };

  // Generate e-phrases based on the LEGO
  const ePhrases = generateEPhrases(currentLego, availableLegos, isLast, seedSentence);
  basket.e = ePhrases;

  // Extract d-phrases from e-phrases
  const dPhrases = extractDPhrases(ePhrases, currentLego.targetChunk);
  basket.d = dPhrases;

  baskets[targetLegoId] = basket;
}

function generateEPhrases(currentLego, availableLegos, isCulminating, seedSentence) {
  const phrases = [];
  const { targetChunk, knownChunk, legoId } = currentLego;

  // For culminating LEGOs, first phrase is the seed sentence
  if (isCulminating && seedSentence) {
    phrases.push([seedSentence[0], seedSentence[1]]);
  }

  // Generate contextually appropriate phrases based on the LEGO
  switch (legoId) {
    case 'S0227L03': // "a veces" / "sometimes"
      phrases.push(
        ["A veces necesito un poco más de tiempo para pensar sobre las cosas.", "Sometimes I need a little more time to think about things."],
        ["Creo que a veces deberías intentar hacer algo diferente.", "I think sometimes you should try to do something different."],
        ["A veces me gusta hablar español con mis amigos.", "Sometimes I like to speak Spanish with my friends."]
      );
      break;

    case 'S0228L02': // "acaba de" / "has just"
      phrases.push(
        ["Ese hombre acaba de empezar a practicar el habla.", "That man has just started to practise speaking."],
        ["Ella acaba de terminar su trabajo para hoy.", "She has just finished her work for today."],
        ["Mi amigo acaba de llegar a casa ahora.", "My friend has just arrived home now."]
      );
      break;

    case 'S0228L04': // "practicar el" / "practise"
      phrases.push(
        ["Quiero practicar el español con ustedes cada día.", "I want to practise Spanish with you every day."],
        ["Necesito practicar el habla más lentamente al principio.", "I need to practise speaking more slowly at first."],
        ["¿Puedes practicar el inglés conmigo mañana?", "Can you practise English with me tomorrow?"]
      );
      break;

    case 'S0228L05': // "habla" / "speaking"
      phrases.push(
        ["El habla es la parte más importante de aprender.", "Speaking is the most important part of learning."],
        ["Me gusta el habla más que la escritura.", "I like speaking more than writing."],
        ["Necesito mejorar mi habla antes de viajar.", "I need to improve my speaking before travelling."]
      );
      break;

    case 'S0229L01': // "Le pregunté" / "I asked him"
      phrases.push(
        ["Le pregunté si pudiera ayudarme con esto mañana.", "I asked him if he could help me with this tomorrow."],
        ["Le pregunté algo importante sobre su trabajo ayer.", "I asked him something important about his work yesterday."],
        ["Le pregunté por qué necesita un poco más de tiempo.", "I asked him why he needs a little more time."]
      );
      break;

    case 'S0229L02': // "te" / "you"
      phrases.push(
        ["Quiero preguntarte algo importante sobre tu familia.", "I want to ask you something important about your family."],
        ["¿Puedo decirte lo que pienso sobre esto?", "Can I tell you what I think about this?"],
        ["Necesito hablarte de algo que pasó ayer.", "I need to talk to you about something that happened yesterday."]
      );
      break;

    case 'S0229L03': // "ayudarme con" / "help me with"
      phrases.push(
        ["¿Puedes ayudarme con esto cuando termines tu trabajo?", "Can you help me with this when you finish your work?"],
        ["Necesito que alguien me ayude con algo importante.", "I need someone to help me with something important."],
        ["Mi amigo va a ayudarme con el español mañana.", "My friend is going to help me with Spanish tomorrow."]
      );
      break;

    case 'S0229L04': // "si pudiera" / "if she could"
      phrases.push(
        ["Le pregunté si pudiera venir a casa esta noche.", "I asked him if she could come home tonight."],
        ["No sé si pudiera hacer esto tan rápido.", "I don't know if she could do this so quickly."],
        ["Quería saber si pudiera ayudarme con el trabajo.", "I wanted to know if she could help me with the work."]
      );
      break;

    case 'S0230L01': // "Conozco a" / "I know"
      phrases.push(
        ["Conozco a un hombre joven que quiere trabajar aquí.", "I know a young man who wants to work here."],
        ["Conozco a alguien que puede ayudarte con eso.", "I know someone who can help you with that."],
        ["Conozco a una mujer que habla español muy bien.", "I know a woman who speaks Spanish very well."]
      );
      break;

    case 'S0230L02': // "un hombre joven" / "a young man"
      phrases.push(
        ["Vi a un hombre joven que estaba intentando aprender español.", "I saw a young man who was trying to learn Spanish."],
        ["Hay un hombre joven aquí que necesita hablar contigo.", "There's a young man here who needs to talk with you."],
        ["Un hombre joven acaba de empezar a trabajar en esta empresa.", "A young man has just started to work at this company."]
      );
      break;

    case 'S0230L03': // "que quiere" / "who wants"
      phrases.push(
        ["Conozco a alguien que quiere aprender español contigo.", "I know someone who wants to learn Spanish with you."],
        ["Hay una persona aquí que quiere preguntarte algo.", "There's a person here who wants to ask you something."],
        ["Tengo un amigo que quiere venir a casa mañana.", "I have a friend who wants to come home tomorrow."]
      );
      break;

    case 'S0230L04': // "trabajar" / "to work"
      phrases.push(
        ["Necesito trabajar más cada día para mejorar mi español.", "I need to work more every day to improve my Spanish."],
        ["¿Quieres trabajar conmigo en esto mañana?", "Do you want to work with me on this tomorrow?"],
        ["Voy a trabajar en algo diferente la próxima semana.", "I'm going to work on something different next week."]
      );
      break;

    case 'S0231L02': // "un hombre viejo" / "an old man"
      phrases.push(
        ["Conozco a un hombre viejo que quería trabajar aquí.", "I know an old man who wanted to work here."],
        ["Hay un hombre viejo en mi familia que habla español.", "There's an old man in my family who speaks Spanish."],
        ["Vi a un hombre viejo que estaba caminando muy lentamente.", "I saw an old man who was walking very slowly."]
      );
      break;

    case 'S0231L03': // "que quería" / "who wanted"
      phrases.push(
        ["Conozco a alguien que quería preguntarte algo importante.", "I know someone who wanted to ask you something important."],
        ["Había una persona aquí que quería hablar contigo ayer.", "There was a person here who wanted to talk with you yesterday."],
        ["Tengo un amigo que quería aprender español conmigo.", "I have a friend who wanted to learn Spanish with me."]
      );
      break;

    case 'S0232L02': // "un poco triste" / "a bit sad"
      phrases.push(
        ["Me siento un poco triste cuando no puedo hablar español bien.", "I feel a bit sad when I can't speak Spanish well."],
        ["Estoy un poco triste porque mi amigo no puede venir.", "I'm a bit sad because my friend can't come."],
        ["Ella parece un poco triste sobre lo que pasó ayer.", "She seems a bit sad about what happened yesterday."]
      );
      break;

    case 'S0232L03': // "porque pensaba que" / "because I thought"
      phrases.push(
        ["Me sentía un poco triste porque pensaba que no podía hacerlo.", "I felt a bit sad because I thought I couldn't do it."],
        ["Estaba preocupado porque pensaba que iba a ser difícil.", "I was worried because I thought it was going to be difficult."],
        ["No dije nada porque pensaba que no era importante.", "I didn't say anything because I thought it wasn't important."]
      );
      break;

    case 'S0233L02': // "está feliz" / "is happy"
      phrases.push(
        ["Mi amigo está feliz porque acaba de terminar su trabajo.", "My friend is happy because he has just finished his work."],
        ["Ella está feliz de poder hablar español con nosotros.", "She is happy to be able to speak Spanish with us."],
        ["Todo el mundo está feliz de que estés aquí hoy.", "Everyone is happy that you're here today."]
      );
      break;

    case 'S0233L03': // "porque puede" / "because he can"
      phrases.push(
        ["Está feliz porque puede empezar a trabajar mañana.", "He is happy because he can start to work tomorrow."],
        ["Mi hermano está contento porque puede venir a casa.", "My brother is happy because he can come home."],
        ["Ella está emocionada porque puede hablar español ahora.", "She is excited because she can speak Spanish now."]
      );
      break;

    case 'S0233L04': // "empezar a trabajar" / "start to work"
      phrases.push(
        ["Voy a empezar a trabajar en algo nuevo la próxima semana.", "I'm going to start to work on something new next week."],
        ["¿Cuándo puedes empezar a trabajar en esto conmigo?", "When can you start to work on this with me?"],
        ["Necesito empezar a trabajar más temprano cada día.", "I need to start to work earlier every day."]
      );
      break;

    case 'S0234L01': // "Estaba triste" / "I was sad"
      phrases.push(
        ["Estaba triste porque pensaba que no podía aprender español.", "I was sad because I thought I couldn't learn Spanish."],
        ["Estaba triste cuando mi amigo no pudo venir ayer.", "I was sad when my friend couldn't come yesterday."],
        ["Estaba un poco triste sobre lo que dijiste la semana pasada.", "I was a bit sad about what you said last week."]
      );
      break;

    default:
      // Fallback generic phrases
      phrases.push(
        [`Quiero usar ${targetChunk} en una conversación natural.`, `I want to use ${knownChunk} in a natural conversation.`],
        [`${targetChunk} es algo que necesito practicar más.`, `${knownChunk} is something I need to practise more.`]
      );
  }

  return phrases;
}

function extractDPhrases(ePhrases, operativeTargetChunk) {
  const dPhrases = { "2": [], "3": [], "4": [], "5": [] };
  const seen = { "2": new Set(), "3": new Set(), "4": new Set(), "5": new Set() };

  for (const [targetPhrase, knownPhrase] of ePhrases) {
    // Simple word-based segmentation for extraction
    const targetWords = targetPhrase.replace(/[¿?.,]/g, '').split(' ');
    const knownWords = knownPhrase.replace(/[?.,]/g, '').split(' ');

    // Find operative chunk position (simplified - looks for any word match)
    let operativePos = -1;
    for (let i = 0; i < targetWords.length; i++) {
      if (targetWords.slice(i).join(' ').toLowerCase().startsWith(operativeTargetChunk.toLowerCase())) {
        operativePos = i;
        break;
      }
    }

    if (operativePos === -1) continue;

    // Extract windows of size 2-5 containing the operative
    for (let windowSize = 2; windowSize <= 5; windowSize++) {
      for (let start = Math.max(0, operativePos - windowSize + 1);
           start <= operativePos && start + windowSize <= targetWords.length;
           start++) {
        const targetWindow = targetWords.slice(start, start + windowSize).join(' ');
        const knownWindow = knownWords.slice(start, start + windowSize).join(' ');

        const key = targetWindow.toLowerCase();
        if (!seen[windowSize].has(key)) {
          seen[windowSize].add(key);
          dPhrases[windowSize].push([targetWindow, knownWindow]);
        }
      }
    }
  }

  return dPhrases;
}

// Write output
const outputPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/phase5_segments/segment_02/orch_01/agent_06_baskets.json';
fs.mkdirSync(require('path').dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(baskets));

console.log(`✅ Agent 6 complete: ${Object.keys(baskets).length} baskets written`);
