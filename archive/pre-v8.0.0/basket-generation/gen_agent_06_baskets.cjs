const fs = require('fs');

// Load the full lego_pairs.json file
const legoPairsPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.json';
const legoPairsData = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Target LEGOs for Agent 6
const targetLegoIds = [
  'S0095L01', 'S0095L03', 'S0095L04',
  'S0096L01', 'S0096L05',
  'S0097L01', 'S0097L02', 'S0097L04',
  'S0098L01', 'S0098L02', 'S0098L03',
  'S0099L01', 'S0099L02', 'S0099L04', 'S0099L05',
  'S0100L01', 'S0100L02', 'S0100L03', 'S0100L04',
  'S0101L01'
];

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

  // For these LEGOs (positions 370-404), we have 370+ prior LEGOs available
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

  // Helper to build common LEGO lookups
  const legoMap = {};
  availableLegos.forEach(l => {
    legoMap[l.targetChunk] = l;
  });

  // For culminating LEGOs, first phrase is the seed sentence
  if (isCulminating && seedSentence) {
    phrases.push([seedSentence[0], seedSentence[1]]);
  }

  // Generate contextually appropriate phrases based on the LEGO
  switch (legoId) {
    case 'S0095L01': // "Estás preparado" / "Are you ready"
      phrases.push(
        ["¿Estás preparado para hablar español con nosotros ahora?", "Are you ready to speak Spanish with us now?"],
        ["¿Estás preparado para intentar algo nuevo?", "Are you ready to try something new?"],
        ["Creo que estás preparado para hacer esto.", "I think you are ready to do this."]
      );
      break;

    case 'S0095L03': // "a casa" / "home"
      phrases.push(
        ["Quiero ir a casa después de trabajar esta noche.", "I want to go home after working tonight."],
        ["¿Puedes venir a casa para hablar sobre esto?", "Can you come home to talk about this?"],
        ["Voy a casa tan pronto como termine.", "I'm going home as soon as I finish."]
      );
      break;

    case 'S0095L04': // "en el próximo autobús" / "on the next bus"
      phrases.push(
        ["Voy a ir en el próximo autobús que llegue.", "I'm going to go on the next bus that arrives."],
        ["¿Puedes venir en el próximo autobús?", "Can you come on the next bus?"],
        ["Creo que puedo estar en el próximo autobús.", "I think I can be on the next bus."]
      );
      break;

    case 'S0096L01': // "No" / "No"
      phrases.push(
        ["No, no quiero intentar hacer eso ahora.", "No, I don't want to try to do that now."],
        ["No, no puedo recordar lo que dijiste.", "No, I can't remember what you said."],
        ["No, no estoy preparado para hablar sobre esto.", "No, I'm not ready to talk about this."]
      );
      break;

    case 'S0096L05': // "un poco más de tiempo" / "a little more time"
      phrases.push(
        ["Necesito un poco más de tiempo para pensar sobre esto.", "I need a little more time to think about this."],
        ["¿Puedes darme un poco más de tiempo?", "Can you give me a little more time?"],
        ["Creo que necesitamos un poco más de tiempo para aprender.", "I think we need a little more time to learn."]
      );
      break;

    case 'S0097L01': // "Sí" / "Yes"
      phrases.push(
        ["Sí, creo que puedo hacer eso ahora.", "Yes, I think I can do that now."],
        ["Sí, estoy intentando aprender español cada día.", "Yes, I'm trying to learn Spanish every day."],
        ["Sí, me gustaría hablar contigo sobre esto.", "Yes, I'd like to talk with you about this."]
      );
      break;

    case 'S0097L02': // "estoy preparado" / "I'm ready"
      phrases.push(
        ["Creo que estoy preparado para intentar algo nuevo.", "I think I'm ready to try something new."],
        ["No estoy preparado para hacer esto todavía.", "I'm not ready to do this yet."],
        ["Estoy preparado para hablar español contigo ahora.", "I'm ready to speak Spanish with you now."]
      );
      break;

    case 'S0097L04': // "tan pronto como quieras" / "as soon as you want"
      phrases.push(
        ["Puedo empezar tan pronto como quieras.", "I can start as soon as you want."],
        ["Voy a venir tan pronto como quieras.", "I'm going to come as soon as you want."],
        ["Podemos hablar sobre esto tan pronto como quieras.", "We can talk about this as soon as you want."]
      );
      break;

    case 'S0098L01': // "Debería" / "I should"
      phrases.push(
        ["Debería intentar hablar español más cada día.", "I should try to speak Spanish more every day."],
        ["Creo que debería pensar sobre esto antes de decidir.", "I think I should think about this before deciding."],
        ["Debería preguntarte algo importante sobre tu trabajo.", "I should ask you something important about your work."]
      );
      break;

    case 'S0098L02': // "considerar jugar" / "consider playing"
      phrases.push(
        ["Deberías considerar jugar con nosotros esta noche.", "You should consider playing with us tonight."],
        ["Voy a considerar jugar algo diferente mañana.", "I'm going to consider playing something different tomorrow."],
        ["¿Quieres considerar jugar esto con tus amigos?", "Do you want to consider playing this with your friends?"]
      );
      break;

    case 'S0098L03': // "otra cosa" / "something else"
      phrases.push(
        ["Creo que deberías intentar hacer otra cosa.", "I think you should try to do something else."],
        ["¿Puedes pensar en otra cosa para decir?", "Can you think of something else to say?"],
        ["Quiero hablar sobre otra cosa ahora.", "I want to talk about something else now."]
      );
      break;

    case 'S0099L01': // "Deberías" / "You should"
      phrases.push(
        ["Deberías intentar hablar más lentamente con ellos.", "You should try to speak more slowly with them."],
        ["Creo que deberías pensar sobre esto antes de empezar.", "I think you should think about this before starting."],
        ["Deberías venir a casa para hablar sobre esto.", "You should come home to talk about this."]
      );
      break;

    case 'S0099L02': // "preguntarte" / "to ask yourself"
      phrases.push(
        ["Necesitas preguntarte por qué estás haciendo esto.", "You need to ask yourself why you're doing this."],
        ["Deberías preguntarte si estás preparado para esto.", "You should ask yourself if you're ready for this."],
        ["Voy a preguntarte algo importante sobre tu trabajo.", "I'm going to ask yourself something important about your work."]
      );
      break;

    case 'S0099L04': // "no está" / "it's not"
      phrases.push(
        ["Creo que no está trabajando como debería.", "I think it's not working as it should."],
        ["No está claro por qué esto está pasando.", "It's not clear why this is happening."],
        ["No está aquí todavía, necesitamos esperar más.", "It's not here yet, we need to wait more."]
      );
      break;

    case 'S0099L05': // "trabajando" / "working"
      phrases.push(
        ["Estoy trabajando cada día para aprender español.", "I'm working every day to learn Spanish."],
        ["¿Estás trabajando en algo nuevo ahora?", "Are you working on something new now?"],
        ["No está trabajando, necesito considerar hacer otra cosa.", "It's not working, I need to consider doing something else."]
      );
      break;

    case 'S0100L01': // "No deberías" / "You shouldn't"
      phrases.push(
        ["No deberías intentar hacer eso tan rápido.", "You shouldn't try to do that so quickly."],
        ["Creo que no deberías preocuparte sobre esto ahora.", "I think you shouldn't worry about this now."],
        ["No deberías hablar sobre esto con ellos.", "You shouldn't talk about this with them."]
      );
      break;

    case 'S0100L02': // "preocuparte por" / "to worry about"
      phrases.push(
        ["No deberías preocuparte por hacer esto perfectamente.", "You shouldn't worry about doing this perfectly."],
        ["No necesitas preocuparte por lo que piensan.", "You don't need to worry about what they think."],
        ["Voy a dejar de preocuparme por esto.", "I'm going to stop worrying about this."]
      );
      break;

    case 'S0100L03': // "hacer" / "to do"
      phrases.push(
        ["¿Qué quieres hacer después de terminar esto?", "What do you want to do after finishing this?"],
        ["Necesito hacer algo diferente para aprender mejor.", "I need to do something different to learn better."],
        ["Voy a hacer esto tan pronto como pueda.", "I'm going to do this as soon as I can."]
      );
      break;

    case 'S0100L04': // "algo similar" / "something similar"
      phrases.push(
        ["¿Puedes intentar hacer algo similar mañana?", "Can you try to do something similar tomorrow?"],
        ["Creo que deberías considerar jugar algo similar.", "I think you should consider playing something similar."],
        ["No quiero hacer algo similar otra vez.", "I don't want to do something similar again."]
      );
      break;

    case 'S0101L01': // "Estoy disfrutando" / "I'm enjoying"
      phrases.push(
        ["Estoy disfrutando aprender español con todos ustedes.", "I'm enjoying learning Spanish with all of you."],
        ["Estoy disfrutando esto más de lo que pensaba.", "I'm enjoying this more than I thought."],
        ["¿Estás disfrutando trabajar en esto cada día?", "Are you enjoying working on this every day."]
      );
      break;

    default:
      // Fallback generic phrases
      phrases.push(
        [`Quiero usar ${targetChunk} en una conversación.`, `I want to use ${knownChunk} in a conversation.`],
        [`${targetChunk} es importante para aprender.`, `${knownChunk} is important to learn.`]
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
const outputPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/phase5_segments/segment_01/orch_02/agent_06_baskets.json';
fs.mkdirSync(require('path').dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(baskets, null, 2));

console.log(`✅ Agent 6 complete: ${Object.keys(baskets).length} baskets written to agent_06_baskets.json`);
