const fs = require('fs');

// Read the lego_baskets.json file
const filePath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/lego_baskets.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Seeds to analyze
const targetSeeds = ['S0271', 'S0272', 'S0273', 'S0274', 'S0275', 'S0276', 'S0277', 'S0278', 'S0279', 'S0280'];

// Helper function to check if Spanish translation is truncated
function isTruncated(english, spanish) {
  // Normalize strings for comparison
  const engWords = english.toLowerCase().trim().split(/\s+/);
  const spaWords = spanish.toLowerCase().trim().split(/\s+/);

  // Key English content words that must have Spanish representation
  // Note: "I" and "you" can be implicit in Spanish verb conjugation
  const keyWords = {
    'here': ['aquí', 'acá'],
    'there': ['allí', 'allá', 'ahí'],
    'when': ['cuándo'],
    'where': ['dónde'],
    'what': ['qué', 'lo que'],
    'who': ['quién'],
    'why': ['por qué'],
    'how': ['cómo'],
    'now': ['ahora'],
    'today': ['hoy'],
    'tomorrow': ['mañana'],
    'yesterday': ['ayer'],
    'with': ['con'],
    'us': ['nosotros', 'nos'],
    'them': ['ellos', 'ellas', 'los', 'las'],
  };

  // Check if significant location/time words in English have representation in Spanish
  let missingKeyWords = [];

  for (let i = 0; i < engWords.length; i++) {
    const word = engWords[i].replace(/[.,!?]/g, '');
    if (keyWords[word]) {
      // Check if any Spanish equivalent exists in the Spanish text
      const hasEquivalent = keyWords[word].some(spaEquiv =>
        spanish.toLowerCase().includes(spaEquiv)
      );

      if (!hasEquivalent) {
        missingKeyWords.push(word);
      }
    }
  }

  // Check for obvious truncation patterns:
  // 1. Missing critical location/time words
  // 2. Spanish significantly shorter with missing semantic content

  if (missingKeyWords.length > 0) {
    return { truncated: true, missing: missingKeyWords };
  }

  return { truncated: false, missing: [] };
}

// Analyze each seed
const results = [];

targetSeeds.forEach(seed => {
  // Find baskets for this seed
  const seedBaskets = Object.entries(data.baskets).filter(([basketId, _]) =>
    basketId.startsWith(seed)
  );

  if (seedBaskets.length === 0) {
    results.push({
      seed,
      basketId: 'NOT_FOUND',
      english: 'N/A',
      spanish: 'N/A',
      status: 'SEED_NOT_FOUND'
    });
    return;
  }

  // Get a random basket from this seed
  const randomBasket = seedBaskets[Math.floor(Math.random() * seedBaskets.length)];
  const [basketId, basketData] = randomBasket;

  // Get a random practice phrase
  if (basketData.practice_phrases && basketData.practice_phrases.length > 0) {
    const randomPhrase = basketData.practice_phrases[
      Math.floor(Math.random() * basketData.practice_phrases.length)
    ];

    const english = randomPhrase.known;
    const spanish = randomPhrase.target;

    const truncationCheck = isTruncated(english, spanish);

    results.push({
      seed,
      basketId,
      english,
      spanish,
      status: truncationCheck.truncated ? 'TRUNCATED' : 'OK',
      missing: truncationCheck.missing
    });
  } else {
    results.push({
      seed,
      basketId,
      english: 'N/A',
      spanish: 'N/A',
      status: 'NO_PHRASES'
    });
  }
});

// Print report
console.log('```');
results.forEach(r => {
  if (r.status === 'TRUNCATED') {
    console.log(`${r.seed}: [${r.basketId}] "${r.english}" → "${r.spanish}" - ${r.status} (missing: ${r.missing.join(', ')})`);
  } else {
    console.log(`${r.seed}: [${r.basketId}] "${r.english}" → "${r.spanish}" - ${r.status}`);
  }
});

console.log('');
const okCount = results.filter(r => r.status === 'OK').length;
const truncatedCount = results.filter(r => r.status === 'TRUNCATED').length;
console.log(`Summary: ${okCount}/10 OK, ${truncatedCount}/10 TRUNCATED`);
console.log('```');
