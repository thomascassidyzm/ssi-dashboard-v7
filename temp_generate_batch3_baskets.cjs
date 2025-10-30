const fs = require('fs');
const path = require('path');

// Read existing baskets
const basketsPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng_30/lego_baskets.json';
const pairsPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng_30/lego_pairs.json';

const existingBaskets = JSON.parse(fs.readFileSync(basketsPath, 'utf8'));
const legoPairsData = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));

// Build a flat lookup for all LEGOs
const legoLookup = {};
for (const seed of legoPairsData.seeds) {
  const [seedId, seedPair, legos] = seed;
  for (const lego of legos) {
    const [legoId, type, spanish, english] = lego;
    legoLookup[legoId] = [spanish, english];
  }
}

// Target LEGOs for Batch 3
const targetLegos = [
  'S0020L02', 'S0020L03', 'S0020L04',
  'S0021L01', 'S0021L02', 'S0021L03',
  'S0022L01', 'S0022L02', 'S0022L03', 'S0022L04'
];

// Extract LEGO ID from full ID (e.g., S0020L02 -> S0020L02)
function getLegoSequence(legoId) {
  const match = legoId.match(/S(\d+)L(\d+)/);
  return match ? [parseInt(match[1]), parseInt(match[2])] : [999, 999];
}

// Check if lego1 comes before lego2
function legoIsBefore(lego1, lego2) {
  const [s1, l1] = getLegoSequence(lego1);
  const [s2, l2] = getLegoSequence(lego2);
  return s1 < s2 || (s1 === s2 && l1 < l2);
}

// Get all available LEGOs up to (but not including) the target LEGO
function getAvailableVocab(targetLego) {
  const available = [];
  for (const legoId in legoLookup) {
    if (legoIsBefore(legoId, targetLego)) {
      available.push(legoId);
    }
  }
  return available;
}

// Generate baskets
const newBaskets = {};
let generated = 0;
let skipped = 0;

for (const legoId of targetLegos) {
  if (existingBaskets[legoId]) {
    console.log(`Skipping ${legoId} - already exists`);
    skipped++;
    continue;
  }

  const legoData = legoPairs.seeds[legoId];
  if (!legoData) {
    console.log(`Warning: No data found for ${legoId}`);
    continue;
  }

  const [targetSpanish, targetEnglish] = legoData;
  const availableVocab = getAvailableVocab(legoId);

  // Generate e-phrases (3-5 natural sentences, max 10 Spanish words)
  const ePhases = [];

  // Special handling for culminating LEGOs
  if (legoId === 'S0020L04') {
    // First e-phrase MUST be the seed sentence
    ePhases.push(['Quieres aprender su nombre rápidamente.', 'You want to learn his name quickly.']);
    ePhases.push(['Quieres aprender español rápidamente con alguien más.', 'You want to learn Spanish quickly with someone else.']);
    ePhases.push(['Quieres recordar una palabra rápidamente hoy.', 'You want to remember a word quickly today.']);
    ePhases.push(['Quieres hablar español rápidamente conmigo mañana.', 'You want to speak Spanish quickly with me tomorrow.']);
  } else if (legoId === 'S0021L03') {
    // First e-phrase MUST be the seed sentence
    ePhases.push(['¿Por qué estás aprendiendo su nombre?', 'Why are you learning her name?']);
    ePhases.push(['¿Por qué estás aprendiendo español conmigo ahora?', 'Why are you learning Spanish with me now?']);
    ePhases.push(['¿Por qué estás aprendiendo una palabra rápidamente?', 'Why are you learning a word quickly?']);
  } else if (legoId === 'S0020L02') {
    ePhases.push(['Quieres aprender español con alguien más hoy.', 'You want to learn Spanish with someone else today.']);
    ePhases.push(['Quieres aprender cómo hablar muy bien ahora.', 'You want to learn how to speak very well now.']);
    ePhases.push(['Quieres aprender una palabra en español rápidamente.', 'You want to learn a word in Spanish quickly.']);
    ePhases.push(['Quieres aprender lo que quiero decir hoy.', 'You want to learn what I mean today.']);
  } else if (legoId === 'S0020L03') {
    ePhases.push(['Quieres aprender su nombre rápidamente hoy.', 'You want to learn his name quickly today.']);
    ePhases.push(['Quieres recordar su nombre después de que termines.', 'You want to remember his name after you finish.']);
    ePhases.push(['Quieres hablar su nombre en español ahora.', 'You want to say his name in Spanish now.']);
    ePhases.push(['Quieres aprender su nombre con alguien más.', 'You want to learn his name with someone else.']);
  } else if (legoId === 'S0021L01') {
    ePhases.push(['¿Por qué quieres aprender español con alguien más?', 'Why do you want to learn Spanish with someone else?']);
    ePhases.push(['¿Por qué quieres hablar español conmigo mañana ahora?', 'Why do you want to speak Spanish with me tomorrow now?']);
    ePhases.push(['¿Por qué quieres parar de hablar hoy?', 'Why do you want to stop talking today?']);
  } else if (legoId === 'S0021L02') {
    ePhases.push(['¿Por qué estás aprendiendo español con alguien más?', 'Why are you learning Spanish with someone else?']);
    ePhases.push(['¿Por qué estás aprendiendo cómo hablar muy bien?', 'Why are you learning how to speak very well?']);
    ePhases.push(['¿Por qué estás aprendiendo una palabra en español?', 'Why are you learning a word in Spanish?']);
  } else if (legoId === 'S0022L01') {
    ePhases.push(['Porque quiero aprender español con alguien más hoy.', 'Because I want to learn Spanish with someone else today.']);
    ePhases.push(['Porque quiero hablar español contigo ahora muy bien.', 'Because I want to speak Spanish with you now very well.']);
    ePhases.push(['Porque quiero intentar recordar una palabra rápidamente.', 'Because I want to try to remember a word quickly.']);
  } else if (legoId === 'S0022L02') {
    ePhases.push(['Porque quiero aprender español con alguien más hoy.', 'Because I want to learn Spanish with someone else today.']);
    ePhases.push(['Porque quiero hablar español contigo ahora muy bien.', 'Because I want to speak Spanish with you now very well.']);
    ePhases.push(['Porque quiero intentar recordar una palabra rápidamente.', 'Because I want to try to remember a word quickly.']);
    ePhases.push(['Porque quiero practicar hablar español todo el día.', 'Because I want to practise speaking Spanish all day.']);
  } else if (legoId === 'S0022L03') {
    ePhases.push(['Porque quiero encontrar personas que hablan español.', 'Because I want to meet people who speak Spanish.']);
    ePhases.push(['Porque quiero encontrar a alguien más rápidamente hoy.', 'Because I want to meet someone else quickly today.']);
    ePhases.push(['Porque quiero encontrar una palabra en español ahora.', 'Because I want to find a word in Spanish now.']);
    ePhases.push(['Porque quiero encontrar lo que quiero decir.', 'Because I want to find what I mean.']);
  } else if (legoId === 'S0022L04') {
    ePhases.push(['Porque quiero encontrar personas que hablan español.', 'Because I want to meet people who speak Spanish.']);
    ePhases.push(['Porque quiero encontrar personas que quieren aprender.', 'Because I want to meet people who want to learn.']);
    ePhases.push(['Porque quiero hablar con personas que hablan.', 'Because I want to speak with people who speak.']);
    ePhases.push(['Y quiero que hables con personas que hablan.', 'And I want you to speak with people who speak.']);
  }

  // Generate d-phrases using sliding window
  const dPhrases = { '2': [], '3': [], '4': [], '5': [] };

  // Window size 2
  if (legoId === 'S0020L02') {
    dPhrases['2'].push(['Quieres aprender', 'You want to learn']);
    dPhrases['2'].push(['aprender español', 'to learn Spanish']);
  } else if (legoId === 'S0020L03') {
    dPhrases['2'].push(['su nombre', 'his name']);
    dPhrases['2'].push(['aprender su nombre', 'to learn his name']);
  } else if (legoId === 'S0020L04') {
    dPhrases['2'].push(['nombre rápidamente', 'name quickly']);
    dPhrases['2'].push(['aprender rápidamente', 'to learn quickly']);
  } else if (legoId === 'S0021L01') {
    dPhrases['2'].push(['¿Por qué', 'Why']);
  } else if (legoId === 'S0021L02') {
    dPhrases['2'].push(['¿Por qué estás aprendiendo', 'Why are you learning']);
    dPhrases['2'].push(['estás aprendiendo', 'you are learning']);
  } else if (legoId === 'S0021L03') {
    dPhrases['2'].push(['estás aprendiendo su nombre', 'you are learning her name']);
    dPhrases['2'].push(['su nombre', 'her name']);
  } else if (legoId === 'S0022L01') {
    dPhrases['2'].push(['Porque quiero', 'Because I want']);
  } else if (legoId === 'S0022L02') {
    dPhrases['2'].push(['Porque quiero', 'Because I want']);
    dPhrases['2'].push(['quiero aprender', 'I want to learn']);
  } else if (legoId === 'S0022L03') {
    dPhrases['2'].push(['quiero encontrar', 'I want to meet']);
    dPhrases['2'].push(['encontrar personas', 'to meet people']);
  } else if (legoId === 'S0022L04') {
    dPhrases['2'].push(['personas que', 'people who']);
    dPhrases['2'].push(['que hablan', 'who speak']);
  }

  // Window size 3
  if (legoId === 'S0020L02') {
    dPhrases['3'].push(['Quieres aprender español', 'You want to learn Spanish']);
    dPhrases['3'].push(['aprender cómo hablar', 'to learn how to speak']);
  } else if (legoId === 'S0020L03') {
    dPhrases['3'].push(['Quieres aprender su nombre', 'You want to learn his name']);
    dPhrases['3'].push(['aprender su nombre rápidamente', 'to learn his name quickly']);
  } else if (legoId === 'S0020L04') {
    dPhrases['3'].push(['aprender su nombre rápidamente', 'to learn his name quickly']);
    dPhrases['3'].push(['su nombre rápidamente', 'his name quickly']);
  } else if (legoId === 'S0021L01') {
    dPhrases['3'].push(['¿Por qué quieres', 'Why do you want']);
    dPhrases['3'].push(['¿Por qué estás', 'Why are you']);
  } else if (legoId === 'S0021L02') {
    dPhrases['3'].push(['¿Por qué estás aprendiendo', 'Why are you learning']);
    dPhrases['3'].push(['estás aprendiendo español', 'you are learning Spanish']);
  } else if (legoId === 'S0021L03') {
    dPhrases['3'].push(['¿Por qué estás aprendiendo su nombre', 'Why are you learning her name']);
    dPhrases['3'].push(['estás aprendiendo su nombre', 'you are learning her name']);
  } else if (legoId === 'S0022L01') {
    dPhrases['3'].push(['Porque quiero aprender', 'Because I want to learn']);
    dPhrases['3'].push(['Porque quiero hablar', 'Because I want to speak']);
  } else if (legoId === 'S0022L02') {
    dPhrases['3'].push(['Porque quiero aprender', 'Because I want to learn']);
    dPhrases['3'].push(['quiero aprender español', 'I want to learn Spanish']);
  } else if (legoId === 'S0022L03') {
    dPhrases['3'].push(['Porque quiero encontrar', 'Because I want to meet']);
    dPhrases['3'].push(['quiero encontrar personas', 'I want to meet people']);
  } else if (legoId === 'S0022L04') {
    dPhrases['3'].push(['encontrar personas que', 'to meet people who']);
    dPhrases['3'].push(['personas que hablan', 'people who speak']);
  }

  // Window size 4
  if (legoId === 'S0020L02') {
    dPhrases['4'].push(['Quieres aprender español con', 'You want to learn Spanish with']);
    dPhrases['4'].push(['aprender cómo hablar español', 'to learn how to speak Spanish']);
  } else if (legoId === 'S0020L03') {
    dPhrases['4'].push(['Quieres aprender su nombre', 'You want to learn his name']);
    dPhrases['4'].push(['aprender su nombre en español', 'to learn his name in Spanish']);
  } else if (legoId === 'S0020L04') {
    dPhrases['4'].push(['Quieres aprender su nombre rápidamente', 'You want to learn his name quickly']);
    dPhrases['4'].push(['aprender su nombre rápidamente', 'to learn his name quickly']);
  } else if (legoId === 'S0021L01') {
    dPhrases['4'].push(['¿Por qué quieres aprender', 'Why do you want to learn']);
    dPhrases['4'].push(['¿Por qué estás aprendiendo', 'Why are you learning']);
  } else if (legoId === 'S0021L02') {
    dPhrases['4'].push(['¿Por qué estás aprendiendo español', 'Why are you learning Spanish']);
    dPhrases['4'].push(['estás aprendiendo cómo hablar', 'you are learning how to speak']);
  } else if (legoId === 'S0021L03') {
    dPhrases['4'].push(['¿Por qué estás aprendiendo su nombre', 'Why are you learning her name']);
  } else if (legoId === 'S0022L01') {
    dPhrases['4'].push(['Porque quiero aprender español', 'Because I want to learn Spanish']);
    dPhrases['4'].push(['Porque quiero hablar español', 'Because I want to speak Spanish']);
  } else if (legoId === 'S0022L02') {
    dPhrases['4'].push(['Porque quiero aprender español', 'Because I want to learn Spanish']);
    dPhrases['4'].push(['quiero aprender español con', 'I want to learn Spanish with']);
  } else if (legoId === 'S0022L03') {
    dPhrases['4'].push(['Porque quiero encontrar personas', 'Because I want to meet people']);
    dPhrases['4'].push(['quiero encontrar a alguien más', 'I want to meet someone else']);
  } else if (legoId === 'S0022L04') {
    dPhrases['4'].push(['Porque quiero encontrar personas que', 'Because I want to meet people who']);
    dPhrases['4'].push(['encontrar personas que hablan', 'to meet people who speak']);
  }

  // Window size 5
  if (legoId === 'S0020L02') {
    dPhrases['5'].push(['Quieres aprender español con alguien más', 'You want to learn Spanish with someone else']);
    dPhrases['5'].push(['aprender cómo hablar español ahora', 'to learn how to speak Spanish now']);
  } else if (legoId === 'S0020L03') {
    dPhrases['5'].push(['Quieres aprender su nombre rápidamente', 'You want to learn his name quickly']);
    dPhrases['5'].push(['aprender su nombre en español ahora', 'to learn his name in Spanish now']);
  } else if (legoId === 'S0020L04') {
    dPhrases['5'].push(['Quieres aprender su nombre rápidamente', 'You want to learn his name quickly']);
  } else if (legoId === 'S0021L01') {
    dPhrases['5'].push(['¿Por qué quieres aprender español', 'Why do you want to learn Spanish']);
    dPhrases['5'].push(['¿Por qué estás aprendiendo su nombre', 'Why are you learning his name']);
  } else if (legoId === 'S0021L02') {
    dPhrases['5'].push(['¿Por qué estás aprendiendo español ahora', 'Why are you learning Spanish now']);
    dPhrases['5'].push(['estás aprendiendo cómo hablar español', 'you are learning how to speak Spanish']);
  } else if (legoId === 'S0021L03') {
    dPhrases['5'].push(['¿Por qué estás aprendiendo su nombre', 'Why are you learning her name']);
  } else if (legoId === 'S0022L01') {
    dPhrases['5'].push(['Porque quiero aprender español ahora', 'Because I want to learn Spanish now']);
    dPhrases['5'].push(['Porque quiero hablar español contigo', 'Because I want to speak Spanish with you']);
  } else if (legoId === 'S0022L02') {
    dPhrases['5'].push(['Porque quiero aprender español ahora', 'Because I want to learn Spanish now']);
    dPhrases['5'].push(['quiero aprender español con alguien más', 'I want to learn Spanish with someone else']);
  } else if (legoId === 'S0022L03') {
    dPhrases['5'].push(['Porque quiero encontrar a alguien más', 'Because I want to meet someone else']);
    dPhrases['5'].push(['quiero encontrar personas que hablan', 'I want to meet people who speak']);
  } else if (legoId === 'S0022L04') {
    dPhrases['5'].push(['Porque quiero encontrar personas que hablan', 'Because I want to meet people who speak']);
    dPhrases['5'].push(['quiero encontrar personas que hablan español', 'I want to meet people who speak Spanish']);
  }

  newBaskets[legoId] = {
    lego: [targetSpanish, targetEnglish],
    e: ePhases,
    d: dPhrases
  };

  generated++;
  console.log(`Generated basket for ${legoId}`);
}

// Merge with existing baskets
const mergedBaskets = { ...existingBaskets, ...newBaskets };

// Write back to file
fs.writeFileSync(basketsPath, JSON.stringify(mergedBaskets, null, 2), 'utf8');

console.log(`\n✅ Generated ${generated} baskets for Batch 3 (skipped ${skipped} existing)`);
