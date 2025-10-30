const fs = require('fs');

// Load lego_pairs.json
const data = JSON.parse(fs.readFileSync('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.json', 'utf8'));

// Extract all LEGOs in canonical order
const allLegos = [];
const legoIndex = new Map();

for (const seed of data.seeds) {
  const seedId = seed[0];
  const seedSentence = seed[1];
  const legos = seed[2];

  for (const lego of legos) {
    const index = allLegos.length;
    const legoData = {
      lego_id: lego[0],
      type: lego[1],
      target: lego[2],
      known: lego[3],
      breakdown: lego[4],
      seed_id: seedId,
      seed_sentence: seedSentence
    };
    allLegos.push(legoData);
    legoIndex.set(lego[0], index);
  }
}

// Target LEGOs for Agent 8
const targetLegoIds = [
  'S0108L01', 'S0108L02', 'S0108L03', 'S0108L04',
  'S0109L01', 'S0109L03', 'S0109L04',
  'S0110L01', 'S0110L02', 'S0110L03', 'S0110L04', 'S0110L06',
  'S0111L02', 'S0111L03', 'S0111L04', 'S0111L05',
  'S0112L01', 'S0112L02', 'S0112L03', 'S0112L04'
];

// Helper: Get available LEGOs for a given LEGO
function getAvailableLegos(legoId) {
  const currentIndex = legoIndex.get(legoId);
  return allLegos.slice(0, currentIndex);
}

// Helper: Extract d-phrases from e-phrase
function extractDPhrases(ePhraseSpanish, ePhraseEnglish, legoSequence, operativeLegoId) {
  const dPhrases = { "2": [], "3": [], "4": [], "5": [] };

  const opIndex = legoSequence.findIndex(l => l.lego_id === operativeLegoId);
  if (opIndex === -1) return dPhrases;

  for (let windowSize = 2; windowSize <= 5; windowSize++) {
    const windows = [];

    for (let start = Math.max(0, opIndex - windowSize + 1); start <= opIndex && start + windowSize <= legoSequence.length; start++) {
      const window = legoSequence.slice(start, start + windowSize);

      const spanishParts = window.map(l => l.target);
      const englishParts = window.map(l => l.known);

      const spanish = spanishParts.join(' ');
      const english = englishParts.join(' ');

      if (!windows.some(w => w[0] === spanish)) {
        windows.push([spanish, english]);
      }
    }

    dPhrases[windowSize.toString()] = windows;
  }

  return dPhrases;
}

// Helper: Check if LEGO is culminating
function isCulminating(legoId) {
  const seedId = allLegos.find(l => l.lego_id === legoId)?.seed_id;
  if (!seedId) return false;

  const seed = data.seeds.find(s => s[0] === seedId);
  if (!seed) return false;

  const legos = seed[2];
  return legos[legos.length - 1][0] === legoId;
}

// Generate baskets
const baskets = {};

for (const legoId of targetLegoIds) {
  const currentIndex = legoIndex.get(legoId);
  const currentLego = allLegos[currentIndex];
  const availableLegos = getAvailableLegos(legoId);

  console.log(`Generating basket for ${legoId} (index ${currentIndex}, ${availableLegos.length} available LEGOs)`);

  const basket = {
    lego: [currentLego.target, currentLego.known],
    e: [],
    d: { "2": [], "3": [], "4": [], "5": [] }
  };

  const ePhrases = [];

  // Check if culminating - if so, first e-phrase must be seed sentence
  if (isCulminating(legoId)) {
    const seed = data.seeds.find(s => s[0] === currentLego.seed_id);
    ePhrases.push({
      spanish: seed[1][0],
      english: seed[1][1],
      legoSequence: seed[2].map(l => ({
        lego_id: l[0],
        target: l[2],
        known: l[3]
      }))
    });
  }

  // Generate additional e-phrases based on LEGO
  switch(legoId) {
    case 'S0108L01':
      ePhrases.push(
        { spanish: "No esperábamos despertar en el medio de la noche", english: "We didn't hope to wake in the middle of the night.",
          legoSequence: [{lego_id: 'S0108L01', target: 'No esperábamos', known: "We didn't hope"}, {lego_id: 'S0108L02', target: 'despertar', known: 'to wake'}, {lego_id: 'S0108L03', target: 'en el medio de', known: 'in the middle of'}, {lego_id: 'S0108L04', target: 'la noche', known: 'the night'}] },
        { spanish: "No esperábamos hablar contigo hoy pero estamos felices", english: "We didn't hope to speak with you today but we're happy.",
          legoSequence: [{lego_id: 'S0108L01', target: 'No esperábamos', known: "We didn't hope"}, {lego_id: 'S0001L02', target: 'hablar', known: 'to speak'}, {lego_id: 'S0001L04', target: 'contigo', known: 'with you'}, {lego_id: 'S0004L04', target: 'hoy', known: 'today'}, {lego_id: 'S0103L02', target: 'pero', known: 'but'}, {lego_id: 'S0103L03', target: 'estamos felices', known: "we're happy"}] },
        { spanish: "No esperábamos aprender algo nuevo esta semana porque estábamos ocupados", english: "We didn't hope to learn something new this week because we were busy.",
          legoSequence: [{lego_id: 'S0108L01', target: 'No esperábamos', known: "We didn't hope"}, {lego_id: 'S0028L01', target: 'aprender', known: 'to learn'}, {lego_id: 'S0040L03', target: 'algo nuevo', known: 'something new'}, {lego_id: 'S0095L02', target: 'esta semana', known: 'this week'}, {lego_id: 'S0100L03', target: 'porque', known: 'because'}, {lego_id: 'S0107L02', target: 'estábamos ocupados', known: 'we were busy'}] }
      );
      break;

    case 'S0108L02':
      ePhrases.push(
        { spanish: "Quiero despertar temprano mañana para trabajar en mi proyecto", english: "I want to wake early tomorrow to work on my project.",
          legoSequence: [{lego_id: 'S0001L01', target: 'Quiero', known: 'I want'}, {lego_id: 'S0108L02', target: 'despertar', known: 'to wake'}, {lego_id: 'S0076L03', target: 'temprano', known: 'early'}, {lego_id: 'S0006L05', target: 'mañana', known: 'tomorrow'}, {lego_id: 'S0069L05', target: 'para', known: 'to'}, {lego_id: 'S0073L01', target: 'trabajar', known: 'to work'}, {lego_id: 'S0079L01', target: 'en', known: 'on'}, {lego_id: 'S0098L04', target: 'mi proyecto', known: 'my project'}] },
        { spanish: "Me gustaría despertar en una casa grande cerca del mar", english: "I'd like to wake in a big house near the sea.",
          legoSequence: [{lego_id: 'S0003L02', target: 'Me gustaría', known: "I'd like"}, {lego_id: 'S0108L02', target: 'despertar', known: 'to wake'}, {lego_id: 'S0079L01', target: 'en', known: 'in'}, {lego_id: 'S0106L01', target: 'una casa', known: 'a house'}, {lego_id: 'S0105L04', target: 'grande', known: 'big'}, {lego_id: 'S0098L01', target: 'cerca de', known: 'near'}, {lego_id: 'S0098L02', target: 'el mar', known: 'the sea'}] },
        { spanish: "No esperábamos despertar en el medio de la noche", english: "We didn't hope to wake in the middle of the night.",
          legoSequence: [{lego_id: 'S0108L01', target: 'No esperábamos', known: "We didn't hope"}, {lego_id: 'S0108L02', target: 'despertar', known: 'to wake'}, {lego_id: 'S0108L03', target: 'en el medio de', known: 'in the middle of'}, {lego_id: 'S0108L04', target: 'la noche', known: 'the night'}] }
      );
      break;

    case 'S0108L03':
      ePhrases.push(
        { spanish: "Estaba trabajando en el medio de mi proyecto cuando llamaste", english: "I was working in the middle of my project when you called.",
          legoSequence: [{lego_id: 'S0002L01', target: 'Estaba', known: 'I was'}, {lego_id: 'S0073L01', target: 'trabajar', known: 'working'}, {lego_id: 'S0108L03', target: 'en el medio de', known: 'in the middle of'}, {lego_id: 'S0098L04', target: 'mi proyecto', known: 'my project'}, {lego_id: 'S0088L01', target: 'cuando', known: 'when'}, {lego_id: 'S0097L04', target: 'llamaste', known: 'you called'}] },
        { spanish: "Me gustaría estar en el medio de la ciudad para caminar", english: "I'd like to be in the middle of the city to walk.",
          legoSequence: [{lego_id: 'S0003L02', target: 'Me gustaría', known: "I'd like"}, {lego_id: 'S0017L02', target: 'estar', known: 'to be'}, {lego_id: 'S0108L03', target: 'en el medio de', known: 'in the middle of'}, {lego_id: 'S0083L02', target: 'la ciudad', known: 'the city'}, {lego_id: 'S0069L05', target: 'para', known: 'to'}, {lego_id: 'S0094L04', target: 'caminar', known: 'walk'}] },
        { spanish: "No esperábamos despertar en el medio de la noche", english: "We didn't hope to wake in the middle of the night.",
          legoSequence: [{lego_id: 'S0108L01', target: 'No esperábamos', known: "We didn't hope"}, {lego_id: 'S0108L02', target: 'despertar', known: 'to wake'}, {lego_id: 'S0108L03', target: 'en el medio de', known: 'in the middle of'}, {lego_id: 'S0108L04', target: 'la noche', known: 'the night'}] }
      );
      break;

    case 'S0108L04':
      if (ePhrases.length === 0) {
        ePhrases.push(
          { spanish: "No esperábamos despertar en el medio de la noche", english: "We didn't hope to wake in the middle of the night.",
            legoSequence: [{lego_id: 'S0108L01', target: 'No esperábamos', known: "We didn't hope"}, {lego_id: 'S0108L02', target: 'despertar', known: 'to wake'}, {lego_id: 'S0108L03', target: 'en el medio de', known: 'in the middle of'}, {lego_id: 'S0108L04', target: 'la noche', known: 'the night'}] }
        );
      }
      ePhrases.push(
        { spanish: "Quiero hablar contigo sobre el plan para la noche", english: "I want to speak with you about the plan for the night.",
          legoSequence: [{lego_id: 'S0001L01', target: 'Quiero', known: 'I want'}, {lego_id: 'S0001L02', target: 'hablar', known: 'to speak'}, {lego_id: 'S0001L04', target: 'contigo', known: 'with you'}, {lego_id: 'S0009L02', target: 'sobre', known: 'about'}, {lego_id: 'S0099L02', target: 'el plan', known: 'the plan'}, {lego_id: 'S0069L05', target: 'para', known: 'for'}, {lego_id: 'S0108L04', target: 'la noche', known: 'the night'}] },
        { spanish: "Estábamos caminando por la ciudad durante la noche cuando lo vimos", english: "We were walking through the city during the night when we saw it.",
          legoSequence: [{lego_id: 'S0107L01', target: 'Estábamos', known: 'We were'}, {lego_id: 'S0094L04', target: 'caminar', known: 'walking'}, {lego_id: 'S0097L02', target: 'por', known: 'through'}, {lego_id: 'S0083L02', target: 'la ciudad', known: 'the city'}, {lego_id: 'S0092L04', target: 'durante', known: 'during'}, {lego_id: 'S0108L04', target: 'la noche', known: 'the night'}, {lego_id: 'S0088L01', target: 'cuando', known: 'when'}, {lego_id: 'S0090L03', target: 'lo vimos', known: 'we saw it'}] }
      );
      break;

    case 'S0109L01':
      ePhrases.push(
        { spanish: "Debemos trabajar duro para aprender muchas palabras nuevas", english: "We must work hard to learn a lot of new words.",
          legoSequence: [{lego_id: 'S0109L01', target: 'Debemos', known: 'We must'}, {lego_id: 'S0109L02', target: 'trabajar duro', known: 'work hard'}, {lego_id: 'S0109L03', target: 'para aprender', known: 'to learn'}, {lego_id: 'S0109L04', target: 'muchas palabras nuevas', known: 'a lot of new words'}] },
        { spanish: "Debemos estar listos para hablar con ellos mañana temprano", english: "We must be ready to speak with them tomorrow early.",
          legoSequence: [{lego_id: 'S0109L01', target: 'Debemos', known: 'We must'}, {lego_id: 'S0017L02', target: 'estar', known: 'be'}, {lego_id: 'S0081L04', target: 'listos', known: 'ready'}, {lego_id: 'S0069L05', target: 'para', known: 'to'}, {lego_id: 'S0001L02', target: 'hablar', known: 'speak'}, {lego_id: 'S0079L04', target: 'con', known: 'with'}, {lego_id: 'S0080L02', target: 'ellos', known: 'them'}, {lego_id: 'S0006L05', target: 'mañana', known: 'tomorrow'}, {lego_id: 'S0076L03', target: 'temprano', known: 'early'}] },
        { spanish: "Debemos pensar en el futuro y hacer un plan bueno", english: "We must think about the future and make a good plan.",
          legoSequence: [{lego_id: 'S0109L01', target: 'Debemos', known: 'We must'}, {lego_id: 'S0007L01', target: 'pensar', known: 'think'}, {lego_id: 'S0079L01', target: 'en', known: 'about'}, {lego_id: 'S0089L03', target: 'el futuro', known: 'the future'}, {lego_id: 'S0019L01', target: 'y', known: 'and'}, {lego_id: 'S0024L01', target: 'hacer', known: 'make'}, {lego_id: 'S0099L02', target: 'el plan', known: 'a plan'}, {lego_id: 'S0087L04', target: 'bueno', known: 'good'}] }
      );
      break;

    case 'S0109L03':
      ePhrases.push(
        { spanish: "Quiero leer un libro bueno para aprender sobre la historia", english: "I want to read a good book to learn about the history.",
          legoSequence: [{lego_id: 'S0001L01', target: 'Quiero', known: 'I want'}, {lego_id: 'S0072L02', target: 'leer', known: 'to read'}, {lego_id: 'S0085L01', target: 'un libro', known: 'a book'}, {lego_id: 'S0087L04', target: 'bueno', known: 'good'}, {lego_id: 'S0109L03', target: 'para aprender', known: 'to learn'}, {lego_id: 'S0009L02', target: 'sobre', known: 'about'}, {lego_id: 'S0095L04', target: 'la historia', known: 'the history'}] },
        { spanish: "Me gustaría viajar a otro país para aprender su idioma", english: "I'd like to travel to another country to learn its language.",
          legoSequence: [{lego_id: 'S0003L02', target: 'Me gustaría', known: "I'd like"}, {lego_id: 'S0093L02', target: 'viajar', known: 'to travel'}, {lego_id: 'S0100L04', target: 'a otro', known: 'to another'}, {lego_id: 'S0101L01', target: 'país', known: 'country'}, {lego_id: 'S0109L03', target: 'para aprender', known: 'to learn'}, {lego_id: 'S0102L03', target: 'su idioma', known: 'its language'}] },
        { spanish: "Debemos trabajar duro para aprender muchas palabras nuevas", english: "We must work hard to learn a lot of new words.",
          legoSequence: [{lego_id: 'S0109L01', target: 'Debemos', known: 'We must'}, {lego_id: 'S0109L02', target: 'trabajar duro', known: 'work hard'}, {lego_id: 'S0109L03', target: 'para aprender', known: 'to learn'}, {lego_id: 'S0109L04', target: 'muchas palabras nuevas', known: 'a lot of new words'}] }
      );
      break;

    case 'S0109L04':
      if (ePhrases.length === 0) {
        ePhrases.push(
          { spanish: "Debemos trabajar duro para aprender muchas palabras nuevas", english: "We must work hard to learn a lot of new words.",
            legoSequence: [{lego_id: 'S0109L01', target: 'Debemos', known: 'We must'}, {lego_id: 'S0109L02', target: 'trabajar duro', known: 'work hard'}, {lego_id: 'S0109L03', target: 'para aprender', known: 'to learn'}, {lego_id: 'S0109L04', target: 'muchas palabras nuevas', known: 'a lot of new words'}] }
        );
      }
      ePhrases.push(
        { spanish: "Estoy tratando de recordar muchas palabras nuevas cada día", english: "I'm trying to remember a lot of new words every day.",
          legoSequence: [{lego_id: 'S0002L01', target: 'Estaba', known: "I'm"}, {lego_id: 'S0013L01', target: 'tratando de', known: 'trying to'}, {lego_id: 'S0075L03', target: 'recordar', known: 'remember'}, {lego_id: 'S0109L04', target: 'muchas palabras nuevas', known: 'a lot of new words'}, {lego_id: 'S0085L04', target: 'cada día', known: 'every day'}] },
        { spanish: "Quiero escribir muchas palabras nuevas en mi libro para practicar", english: "I want to write a lot of new words in my book to practice.",
          legoSequence: [{lego_id: 'S0001L01', target: 'Quiero', known: 'I want'}, {lego_id: 'S0072L01', target: 'escribir', known: 'to write'}, {lego_id: 'S0109L04', target: 'muchas palabras nuevas', known: 'a lot of new words'}, {lego_id: 'S0079L01', target: 'en', known: 'in'}, {lego_id: 'S0091L02', target: 'mis', known: 'my'}, {lego_id: 'S0085L01', target: 'un libro', known: 'book'}, {lego_id: 'S0069L05', target: 'para', known: 'to'}, {lego_id: 'S0082L03', target: 'practicar', known: 'practice'}] }
      );
      break;

    case 'S0110L01':
      ePhrases.push(
        { spanish: "Somos amigos, y después de que terminemos me gustaría relajarme", english: "We're friends, and after we finish I'd like to relax.",
          legoSequence: [{lego_id: 'S0110L01', target: 'Somos', known: "We're"}, {lego_id: 'S0110L02', target: 'amigos', known: 'friends'}, {lego_id: 'S0110L03', target: 'y después de que', known: 'and after'}, {lego_id: 'S0110L04', target: 'terminemos', known: 'we finish'}, {lego_id: 'S0110L05', target: 'me gustaría', known: "I'd like"}, {lego_id: 'S0110L06', target: 'relajarme', known: 'to relax'}] },
        { spanish: "Somos estudiantes y queremos aprender español juntos cada semana", english: "We're students and we want to learn Spanish together every week.",
          legoSequence: [{lego_id: 'S0110L01', target: 'Somos', known: "We're"}, {lego_id: 'S0083L04', target: 'estudiantes', known: 'students'}, {lego_id: 'S0019L01', target: 'y', known: 'and'}, {lego_id: 'S0077L01', target: 'queremos', known: 'we want'}, {lego_id: 'S0028L01', target: 'aprender', known: 'to learn'}, {lego_id: 'S0001L03', target: 'español', known: 'Spanish'}, {lego_id: 'S0086L02', target: 'juntos', known: 'together'}, {lego_id: 'S0085L04', target: 'cada día', known: 'every week'}] },
        { spanish: "Somos felices aquí porque tenemos mucho trabajo interesante y buenas oportunidades", english: "We're happy here because we have a lot of interesting work and good opportunities.",
          legoSequence: [{lego_id: 'S0110L01', target: 'Somos', known: "We're"}, {lego_id: 'S0103L04', target: 'felices', known: 'happy'}, {lego_id: 'S0005L05', target: 'aquí', known: 'here'}, {lego_id: 'S0100L03', target: 'porque', known: 'because'}, {lego_id: 'S0077L03', target: 'tenemos', known: 'we have'}, {lego_id: 'S0073L02', target: 'mucho trabajo', known: 'a lot of work'}, {lego_id: 'S0104L03', target: 'interesante', known: 'interesting'}, {lego_id: 'S0019L01', target: 'y', known: 'and'}, {lego_id: 'S0106L03', target: 'buenas oportunidades', known: 'good opportunities'}] }
      );
      break;

    case 'S0110L02':
      ePhrases.push(
        { spanish: "Quiero conocer a tus amigos cuando vengas a la ciudad", english: "I want to meet your friends when you come to the city.",
          legoSequence: [{lego_id: 'S0001L01', target: 'Quiero', known: 'I want'}, {lego_id: 'S0096L01', target: 'conocer', known: 'to meet'}, {lego_id: 'S0096L02', target: 'a', known: 'to'}, {lego_id: 'S0091L03', target: 'tus', known: 'your'}, {lego_id: 'S0110L02', target: 'amigos', known: 'friends'}, {lego_id: 'S0088L01', target: 'cuando', known: 'when'}, {lego_id: 'S0097L03', target: 'vengas', known: 'you come'}, {lego_id: 'S0096L02', target: 'a', known: 'to'}, {lego_id: 'S0083L02', target: 'la ciudad', known: 'the city'}] },
        { spanish: "Me gustaría hablar con mis amigos sobre el plan para mañana", english: "I'd like to speak with my friends about the plan for tomorrow.",
          legoSequence: [{lego_id: 'S0003L02', target: 'Me gustaría', known: "I'd like"}, {lego_id: 'S0001L02', target: 'hablar', known: 'to speak'}, {lego_id: 'S0079L04', target: 'con', known: 'with'}, {lego_id: 'S0091L02', target: 'mis', known: 'my'}, {lego_id: 'S0110L02', target: 'amigos', known: 'friends'}, {lego_id: 'S0009L02', target: 'sobre', known: 'about'}, {lego_id: 'S0099L02', target: 'el plan', known: 'the plan'}, {lego_id: 'S0069L05', target: 'para', known: 'for'}, {lego_id: 'S0006L05', target: 'mañana', known: 'tomorrow'}] },
        { spanish: "Somos amigos, y después de que terminemos me gustaría relajarme", english: "We're friends, and after we finish I'd like to relax.",
          legoSequence: [{lego_id: 'S0110L01', target: 'Somos', known: "We're"}, {lego_id: 'S0110L02', target: 'amigos', known: 'friends'}, {lego_id: 'S0110L03', target: 'y después de que', known: 'and after'}, {lego_id: 'S0110L04', target: 'terminemos', known: 'we finish'}, {lego_id: 'S0110L05', target: 'me gustaría', known: "I'd like"}, {lego_id: 'S0110L06', target: 'relajarme', known: 'to relax'}] }
      );
      break;

    case 'S0110L03':
      ePhrases.push(
        { spanish: "Quiero hablar contigo y después de que termine voy a casa", english: "I want to speak with you and after I finish I'm going home.",
          legoSequence: [{lego_id: 'S0001L01', target: 'Quiero', known: 'I want'}, {lego_id: 'S0001L02', target: 'hablar', known: 'to speak'}, {lego_id: 'S0001L04', target: 'contigo', known: 'with you'}, {lego_id: 'S0110L03', target: 'y después de que', known: 'and after'}, {lego_id: 'S0084L04', target: 'termine', known: 'I finish'}, {lego_id: 'S0005L01', target: 'voy', known: "I'm going"}, {lego_id: 'S0005L02', target: 'a casa', known: 'home'}] },
        { spanish: "Estaba trabajando en el proyecto y después de que llamaste pensé en ti", english: "I was working on the project and after you called I thought about you.",
          legoSequence: [{lego_id: 'S0002L01', target: 'Estaba', known: 'I was'}, {lego_id: 'S0073L01', target: 'trabajar', known: 'working'}, {lego_id: 'S0079L01', target: 'en', known: 'on'}, {lego_id: 'S0099L02', target: 'el plan', known: 'the project'}, {lego_id: 'S0110L03', target: 'y después de que', known: 'and after'}, {lego_id: 'S0097L04', target: 'llamaste', known: 'you called'}, {lego_id: 'S0007L01', target: 'pensar', known: 'I thought'}, {lego_id: 'S0079L01', target: 'en', known: 'about'}, {lego_id: 'S0007L02', target: 'ti', known: 'you'}] },
        { spanish: "Somos amigos, y después de que terminemos me gustaría relajarme", english: "We're friends, and after we finish I'd like to relax.",
          legoSequence: [{lego_id: 'S0110L01', target: 'Somos', known: "We're"}, {lego_id: 'S0110L02', target: 'amigos', known: 'friends'}, {lego_id: 'S0110L03', target: 'y después de que', known: 'and after'}, {lego_id: 'S0110L04', target: 'terminemos', known: 'we finish'}, {lego_id: 'S0110L05', target: 'me gustaría', known: "I'd like"}, {lego_id: 'S0110L06', target: 'relajarme', known: 'to relax'}] }
      );
      break;

    case 'S0110L04':
      ePhrases.push(
        { spanish: "Quiero que terminemos el proyecto hoy porque mañana tengo otro trabajo", english: "I want that we finish the project today because tomorrow I have other work.",
          legoSequence: [{lego_id: 'S0001L01', target: 'Quiero', known: 'I want'}, {lego_id: 'S0038L01', target: 'que', known: 'that'}, {lego_id: 'S0110L04', target: 'terminemos', known: 'we finish'}, {lego_id: 'S0099L02', target: 'el plan', known: 'the project'}, {lego_id: 'S0004L04', target: 'hoy', known: 'today'}, {lego_id: 'S0100L03', target: 'porque', known: 'because'}, {lego_id: 'S0006L05', target: 'mañana', known: 'tomorrow'}, {lego_id: 'S0077L02', target: 'tengo', known: 'I have'}, {lego_id: 'S0100L04', target: 'a otro', known: 'other'}, {lego_id: 'S0073L02', target: 'mucho trabajo', known: 'work'}] },
        { spanish: "Debemos trabajar juntos para que terminemos antes de la noche", english: "We must work together so that we finish before the night.",
          legoSequence: [{lego_id: 'S0109L01', target: 'Debemos', known: 'We must'}, {lego_id: 'S0073L01', target: 'trabajar', known: 'work'}, {lego_id: 'S0086L02', target: 'juntos', known: 'together'}, {lego_id: 'S0069L05', target: 'para', known: 'so'}, {lego_id: 'S0038L01', target: 'que', known: 'that'}, {lego_id: 'S0110L04', target: 'terminemos', known: 'we finish'}, {lego_id: 'S0071L01', target: 'antes de', known: 'before'}, {lego_id: 'S0108L04', target: 'la noche', known: 'the night'}] },
        { spanish: "Somos amigos, y después de que terminemos me gustaría relajarme", english: "We're friends, and after we finish I'd like to relax.",
          legoSequence: [{lego_id: 'S0110L01', target: 'Somos', known: "We're"}, {lego_id: 'S0110L02', target: 'amigos', known: 'friends'}, {lego_id: 'S0110L03', target: 'y después de que', known: 'and after'}, {lego_id: 'S0110L04', target: 'terminemos', known: 'we finish'}, {lego_id: 'S0110L05', target: 'me gustaría', known: "I'd like"}, {lego_id: 'S0110L06', target: 'relajarme', known: 'to relax'}] }
      );
      break;

    case 'S0110L06':
      if (ePhrases.length === 0) {
        ePhrases.push(
          { spanish: "Somos amigos, y después de que terminemos me gustaría relajarme", english: "We're friends, and after we finish I'd like to relax.",
            legoSequence: [{lego_id: 'S0110L01', target: 'Somos', known: "We're"}, {lego_id: 'S0110L02', target: 'amigos', known: 'friends'}, {lego_id: 'S0110L03', target: 'y después de que', known: 'and after'}, {lego_id: 'S0110L04', target: 'terminemos', known: 'we finish'}, {lego_id: 'S0110L05', target: 'me gustaría', known: "I'd like"}, {lego_id: 'S0110L06', target: 'relajarme', known: 'to relax'}] }
        );
      }
      ePhrases.push(
        { spanish: "Después de trabajar todo el día quiero relajarme en casa", english: "After working all day I want to relax at home.",
          legoSequence: [{lego_id: 'S0071L01', target: 'antes de', known: 'After'}, {lego_id: 'S0073L01', target: 'trabajar', known: 'working'}, {lego_id: 'S0070L04', target: 'todo el día', known: 'all day'}, {lego_id: 'S0001L01', target: 'Quiero', known: 'I want'}, {lego_id: 'S0110L06', target: 'relajarme', known: 'to relax'}, {lego_id: 'S0079L01', target: 'en', known: 'at'}, {lego_id: 'S0106L01', target: 'una casa', known: 'home'}] },
        { spanish: "Me gustaría ir a la playa para relajarme y pensar", english: "I'd like to go to the beach to relax and think.",
          legoSequence: [{lego_id: 'S0003L02', target: 'Me gustaría', known: "I'd like"}, {lego_id: 'S0005L03', target: 'ir', known: 'to go'}, {lego_id: 'S0096L02', target: 'a', known: 'to'}, {lego_id: 'S0098L03', target: 'la playa', known: 'the beach'}, {lego_id: 'S0069L05', target: 'para', known: 'to'}, {lego_id: 'S0110L06', target: 'relajarme', known: 'to relax'}, {lego_id: 'S0019L01', target: 'y', known: 'and'}, {lego_id: 'S0007L01', target: 'pensar', known: 'think'}] }
      );
      break;

    case 'S0111L02':
      ePhrases.push(
        { spanish: "Cuando aprendemos algo nuevo cambia nuestro cerebro", english: "When we learn something new it changes our brain.",
          legoSequence: [{lego_id: 'S0111L01', target: 'Cuando', known: 'When'}, {lego_id: 'S0111L02', target: 'aprendemos', known: 'we learn'}, {lego_id: 'S0111L03', target: 'algo nuevo', known: 'something new'}, {lego_id: 'S0111L04', target: 'cambia', known: 'it changes'}, {lego_id: 'S0111L05', target: 'nuestro cerebro', known: 'our brain'}] },
        { spanish: "Cuando aprendemos juntos es más fácil recordar las palabras nuevas", english: "When we learn together it's easier to remember the new words.",
          legoSequence: [{lego_id: 'S0111L01', target: 'Cuando', known: 'When'}, {lego_id: 'S0111L02', target: 'aprendemos', known: 'we learn'}, {lego_id: 'S0086L02', target: 'juntos', known: 'together'}, {lego_id: 'S0104L02', target: 'es importante', known: "it's"}, {lego_id: 'S0107L04', target: 'más fácil', known: 'easier'}, {lego_id: 'S0075L03', target: 'recordar', known: 'to remember'}, {lego_id: 'S0091L04', target: 'las', known: 'the'}, {lego_id: 'S0040L04', target: 'nuevas', known: 'new words'}] },
        { spanish: "Cada día aprendemos algo diferente en la clase y practicamos mucho", english: "Every day we learn something different in the class and we practice a lot.",
          legoSequence: [{lego_id: 'S0085L04', target: 'cada día', known: 'Every day'}, {lego_id: 'S0111L02', target: 'aprendemos', known: 'we learn'}, {lego_id: 'S0040L03', target: 'algo nuevo', known: 'something'}, {lego_id: 'S0105L03', target: 'diferente', known: 'different'}, {lego_id: 'S0079L01', target: 'en', known: 'in'}, {lego_id: 'S0106L04', target: 'la clase', known: 'the class'}, {lego_id: 'S0019L01', target: 'y', known: 'and'}, {lego_id: 'S0082L03', target: 'practicar', known: 'we practice'}, {lego_id: 'S0073L02', target: 'mucho trabajo', known: 'a lot'}] }
      );
      break;

    case 'S0111L03':
      ePhrases.push(
        { spanish: "Quiero probar algo nuevo en el restaurante cuando vayamos esta noche", english: "I want to try something new at the restaurant when we go tonight.",
          legoSequence: [{lego_id: 'S0001L01', target: 'Quiero', known: 'I want'}, {lego_id: 'S0031L01', target: 'probar', known: 'to try'}, {lego_id: 'S0111L03', target: 'algo nuevo', known: 'something new'}, {lego_id: 'S0079L01', target: 'en', known: 'at'}, {lego_id: 'S0101L03', target: 'el restaurante', known: 'the restaurant'}, {lego_id: 'S0088L01', target: 'cuando', known: 'when'}, {lego_id: 'S0077L04', target: 'vayamos', known: 'we go'}, {lego_id: 'S0095L01', target: 'esta', known: 'this'}, {lego_id: 'S0108L04', target: 'la noche', known: 'night'}] },
        { spanish: "Me gustaría hacer algo nuevo cada semana para practicar mi español", english: "I'd like to do something new every week to practice my Spanish.",
          legoSequence: [{lego_id: 'S0003L02', target: 'Me gustaría', known: "I'd like"}, {lego_id: 'S0024L01', target: 'hacer', known: 'to do'}, {lego_id: 'S0111L03', target: 'algo nuevo', known: 'something new'}, {lego_id: 'S0095L02', target: 'esta semana', known: 'every week'}, {lego_id: 'S0069L05', target: 'para', known: 'to'}, {lego_id: 'S0082L03', target: 'practicar', known: 'practice'}, {lego_id: 'S0091L02', target: 'mis', known: 'my'}, {lego_id: 'S0001L03', target: 'español', known: 'Spanish'}] },
        { spanish: "Cuando aprendemos algo nuevo cambia nuestro cerebro", english: "When we learn something new it changes our brain.",
          legoSequence: [{lego_id: 'S0111L01', target: 'Cuando', known: 'When'}, {lego_id: 'S0111L02', target: 'aprendemos', known: 'we learn'}, {lego_id: 'S0111L03', target: 'algo nuevo', known: 'something new'}, {lego_id: 'S0111L04', target: 'cambia', known: 'it changes'}, {lego_id: 'S0111L05', target: 'nuestro cerebro', known: 'our brain'}] }
      );
      break;

    case 'S0111L04':
      ePhrases.push(
        { spanish: "El mundo cambia cada día y debemos aprender cosas nuevas siempre", english: "The world changes every day and we must learn new things always.",
          legoSequence: [{lego_id: 'S0089L02', target: 'el mundo', known: 'The world'}, {lego_id: 'S0111L04', target: 'cambia', known: 'changes'}, {lego_id: 'S0085L04', target: 'cada día', known: 'every day'}, {lego_id: 'S0019L01', target: 'y', known: 'and'}, {lego_id: 'S0109L01', target: 'Debemos', known: 'we must'}, {lego_id: 'S0028L01', target: 'aprender', known: 'learn'}, {lego_id: 'S0078L02', target: 'cosas', known: 'things'}, {lego_id: 'S0040L04', target: 'nuevas', known: 'new'}, {lego_id: 'S0006L04', target: 'siempre', known: 'always'}] },
        { spanish: "Todo cambia cuando empezamos a pensar en el futuro de manera diferente", english: "Everything changes when we start to think about the future differently.",
          legoSequence: [{lego_id: 'S0070L03', target: 'todo', known: 'Everything'}, {lego_id: 'S0111L04', target: 'cambia', known: 'changes'}, {lego_id: 'S0088L01', target: 'cuando', known: 'when'}, {lego_id: 'S0084L01', target: 'empezamos', known: 'we start'}, {lego_id: 'S0096L02', target: 'a', known: 'to'}, {lego_id: 'S0007L01', target: 'pensar', known: 'think'}, {lego_id: 'S0079L01', target: 'en', known: 'about'}, {lego_id: 'S0089L03', target: 'el futuro', known: 'the future'}, {lego_id: 'S0105L03', target: 'diferente', known: 'differently'}] },
        { spanish: "Cuando aprendemos algo nuevo cambia nuestro cerebro", english: "When we learn something new it changes our brain.",
          legoSequence: [{lego_id: 'S0111L01', target: 'Cuando', known: 'When'}, {lego_id: 'S0111L02', target: 'aprendemos', known: 'we learn'}, {lego_id: 'S0111L03', target: 'algo nuevo', known: 'something new'}, {lego_id: 'S0111L04', target: 'cambia', known: 'it changes'}, {lego_id: 'S0111L05', target: 'nuestro cerebro', known: 'our brain'}] }
      );
      break;

    case 'S0111L05':
      if (ePhrases.length === 0) {
        ePhrases.push(
          { spanish: "Cuando aprendemos algo nuevo cambia nuestro cerebro", english: "When we learn something new it changes our brain.",
            legoSequence: [{lego_id: 'S0111L01', target: 'Cuando', known: 'When'}, {lego_id: 'S0111L02', target: 'aprendemos', known: 'we learn'}, {lego_id: 'S0111L03', target: 'algo nuevo', known: 'something new'}, {lego_id: 'S0111L04', target: 'cambia', known: 'it changes'}, {lego_id: 'S0111L05', target: 'nuestro cerebro', known: 'our brain'}] }
        );
      }
      ePhrases.push(
        { spanish: "Es importante usar nuestro cerebro cada día para aprender cosas nuevas", english: "It's important to use our brain every day to learn new things.",
          legoSequence: [{lego_id: 'S0104L02', target: 'es importante', known: "It's important"}, {lego_id: 'S0074L04', target: 'usar', known: 'to use'}, {lego_id: 'S0111L05', target: 'nuestro cerebro', known: 'our brain'}, {lego_id: 'S0085L04', target: 'cada día', known: 'every day'}, {lego_id: 'S0069L05', target: 'para', known: 'to'}, {lego_id: 'S0028L01', target: 'aprender', known: 'learn'}, {lego_id: 'S0078L02', target: 'cosas', known: 'things'}, {lego_id: 'S0040L04', target: 'nuevas', known: 'new'}] },
        { spanish: "Debemos trabajar duro porque nuestro cerebro necesita práctica para recordar bien", english: "We must work hard because our brain needs practice to remember well.",
          legoSequence: [{lego_id: 'S0109L01', target: 'Debemos', known: 'We must'}, {lego_id: 'S0109L02', target: 'trabajar duro', known: 'work hard'}, {lego_id: 'S0100L03', target: 'porque', known: 'because'}, {lego_id: 'S0111L05', target: 'nuestro cerebro', known: 'our brain'}, {lego_id: 'S0077L02', target: 'tengo', known: 'needs'}, {lego_id: 'S0082L03', target: 'practicar', known: 'practice'}, {lego_id: 'S0069L05', target: 'para', known: 'to'}, {lego_id: 'S0075L03', target: 'recordar', known: 'remember'}, {lego_id: 'S0087L03', target: 'bien', known: 'well'}] }
      );
      break;

    case 'S0112L01':
      ePhrases.push(
        { spanish: "Eso fue muy interesante, y no estaba esperándolo", english: "That was very interesting, and I wasn't expecting it.",
          legoSequence: [{lego_id: 'S0112L01', target: 'Eso fue', known: 'That was'}, {lego_id: 'S0112L02', target: 'muy interesante', known: 'very interesting'}, {lego_id: 'S0112L03', target: 'y no estaba', known: "and I wasn't"}, {lego_id: 'S0112L04', target: 'esperándolo', known: 'expecting it'}] },
        { spanish: "Eso fue difícil de hacer pero aprendí mucho sobre mi trabajo", english: "That was hard to do but I learned a lot about my work.",
          legoSequence: [{lego_id: 'S0112L01', target: 'Eso fue', known: 'That was'}, {lego_id: 'S0086L03', target: 'difícil', known: 'hard'}, {lego_id: 'S0031L02', target: 'de hacer', known: 'to do'}, {lego_id: 'S0103L02', target: 'pero', known: 'but'}, {lego_id: 'S0028L01', target: 'aprender', known: 'I learned'}, {lego_id: 'S0073L02', target: 'mucho trabajo', known: 'a lot'}, {lego_id: 'S0009L02', target: 'sobre', known: 'about'}, {lego_id: 'S0091L02', target: 'mis', known: 'my'}, {lego_id: 'S0073L02', target: 'mucho trabajo', known: 'work'}] },
        { spanish: "Eso fue una buena oportunidad para conocer a gente nueva en la ciudad", english: "That was a good opportunity to meet new people in the city.",
          legoSequence: [{lego_id: 'S0112L01', target: 'Eso fue', known: 'That was'}, {lego_id: 'S0106L02', target: 'una', known: 'a'}, {lego_id: 'S0106L03', target: 'buenas oportunidades', known: 'good opportunity'}, {lego_id: 'S0069L05', target: 'para', known: 'to'}, {lego_id: 'S0096L01', target: 'conocer', known: 'meet'}, {lego_id: 'S0096L02', target: 'a', known: 'to'}, {lego_id: 'S0101L04', target: 'gente', known: 'people'}, {lego_id: 'S0040L04', target: 'nuevas', known: 'new'}, {lego_id: 'S0079L01', target: 'en', known: 'in'}, {lego_id: 'S0083L02', target: 'la ciudad', known: 'the city'}] }
      );
      break;

    case 'S0112L02':
      ePhrases.push(
        { spanish: "El libro que leí era muy interesante y aprendí mucho sobre la historia", english: "The book that I read was very interesting and I learned a lot about history.",
          legoSequence: [{lego_id: 'S0085L01', target: 'un libro', known: 'The book'}, {lego_id: 'S0038L01', target: 'que', known: 'that'}, {lego_id: 'S0072L02', target: 'leer', known: 'I read'}, {lego_id: 'S0017L03', target: 'era', known: 'was'}, {lego_id: 'S0112L02', target: 'muy interesante', known: 'very interesting'}, {lego_id: 'S0019L01', target: 'y', known: 'and'}, {lego_id: 'S0028L01', target: 'aprender', known: 'I learned'}, {lego_id: 'S0073L02', target: 'mucho trabajo', known: 'a lot'}, {lego_id: 'S0009L02', target: 'sobre', known: 'about'}, {lego_id: 'S0095L04', target: 'la historia', known: 'history'}] },
        { spanish: "Quiero ir a ese lugar porque parece muy interesante y diferente", english: "I want to go to that place because it seems very interesting and different.",
          legoSequence: [{lego_id: 'S0001L01', target: 'Quiero', known: 'I want'}, {lego_id: 'S0005L03', target: 'ir', known: 'to go'}, {lego_id: 'S0096L02', target: 'a', known: 'to'}, {lego_id: 'S0094L02', target: 'ese', known: 'that'}, {lego_id: 'S0093L04', target: 'lugar', known: 'place'}, {lego_id: 'S0100L03', target: 'porque', known: 'because'}, {lego_id: 'S0101L02', target: 'parece', known: 'it seems'}, {lego_id: 'S0112L02', target: 'muy interesante', known: 'very interesting'}, {lego_id: 'S0019L01', target: 'y', known: 'and'}, {lego_id: 'S0105L03', target: 'diferente', known: 'different'}] },
        { spanish: "Eso fue muy interesante, y no estaba esperándolo", english: "That was very interesting, and I wasn't expecting it.",
          legoSequence: [{lego_id: 'S0112L01', target: 'Eso fue', known: 'That was'}, {lego_id: 'S0112L02', target: 'muy interesante', known: 'very interesting'}, {lego_id: 'S0112L03', target: 'y no estaba', known: "and I wasn't"}, {lego_id: 'S0112L04', target: 'esperándolo', known: 'expecting it'}] }
      );
      break;

    case 'S0112L03':
      ePhrases.push(
        { spanish: "Quería ir a la fiesta pero no estaba listo a tiempo", english: "I wanted to go to the party but I wasn't ready on time.",
          legoSequence: [{lego_id: 'S0003L01', target: 'Quería', known: 'I wanted'}, {lego_id: 'S0005L03', target: 'ir', known: 'to go'}, {lego_id: 'S0096L02', target: 'a', known: 'to'}, {lego_id: 'S0100L01', target: 'la fiesta', known: 'the party'}, {lego_id: 'S0103L02', target: 'pero', known: 'but'}, {lego_id: 'S0112L03', target: 'y no estaba', known: "I wasn't"}, {lego_id: 'S0081L04', target: 'listos', known: 'ready'}, {lego_id: 'S0096L02', target: 'a', known: 'on'}, {lego_id: 'S0020L03', target: 'tiempo', known: 'time'}] },
        { spanish: "Estaba trabajando mucho en el proyecto y no estaba pensando en descansar", english: "I was working a lot on the project and I wasn't thinking about resting.",
          legoSequence: [{lego_id: 'S0002L01', target: 'Estaba', known: 'I was'}, {lego_id: 'S0073L01', target: 'trabajar', known: 'working'}, {lego_id: 'S0073L02', target: 'mucho trabajo', known: 'a lot'}, {lego_id: 'S0079L01', target: 'en', known: 'on'}, {lego_id: 'S0099L02', target: 'el plan', known: 'the project'}, {lego_id: 'S0112L03', target: 'y no estaba', known: "and I wasn't"}, {lego_id: 'S0007L01', target: 'pensar', known: 'thinking'}, {lego_id: 'S0079L01', target: 'en', known: 'about'}, {lego_id: 'S0105L02', target: 'descansar', known: 'resting'}] },
        { spanish: "Eso fue muy interesante, y no estaba esperándolo", english: "That was very interesting, and I wasn't expecting it.",
          legoSequence: [{lego_id: 'S0112L01', target: 'Eso fue', known: 'That was'}, {lego_id: 'S0112L02', target: 'muy interesante', known: 'very interesting'}, {lego_id: 'S0112L03', target: 'y no estaba', known: "and I wasn't"}, {lego_id: 'S0112L04', target: 'esperándolo', known: 'expecting it'}] }
      );
      break;

    case 'S0112L04':
      if (ePhrases.length === 0) {
        ePhrases.push(
          { spanish: "Eso fue muy interesante, y no estaba esperándolo", english: "That was very interesting, and I wasn't expecting it.",
            legoSequence: [{lego_id: 'S0112L01', target: 'Eso fue', known: 'That was'}, {lego_id: 'S0112L02', target: 'muy interesante', known: 'very interesting'}, {lego_id: 'S0112L03', target: 'y no estaba', known: "and I wasn't"}, {lego_id: 'S0112L04', target: 'esperándolo', known: 'expecting it'}] }
        );
      }
      ePhrases.push(
        { spanish: "Estaba trabajando en el proyecto y no estaba esperándolo terminar hoy", english: "I was working on the project and wasn't expecting it to finish today.",
          legoSequence: [{lego_id: 'S0002L01', target: 'Estaba', known: 'I was'}, {lego_id: 'S0073L01', target: 'trabajar', known: 'working'}, {lego_id: 'S0079L01', target: 'en', known: 'on'}, {lego_id: 'S0099L02', target: 'el plan', known: 'the project'}, {lego_id: 'S0019L01', target: 'y', known: 'and'}, {lego_id: 'S0112L04', target: 'esperándolo', known: 'expecting it'}, {lego_id: 'S0084L03', target: 'terminar', known: 'to finish'}, {lego_id: 'S0004L04', target: 'hoy', known: 'today'}] },
        { spanish: "Llamaste en el medio de la noche y no estaba esperándolo", english: "You called in the middle of the night and I wasn't expecting it.",
          legoSequence: [{lego_id: 'S0097L04', target: 'llamaste', known: 'You called'}, {lego_id: 'S0108L03', target: 'en el medio de', known: 'in the middle of'}, {lego_id: 'S0108L04', target: 'la noche', known: 'the night'}, {lego_id: 'S0112L03', target: 'y no estaba', known: "and I wasn't"}, {lego_id: 'S0112L04', target: 'esperándolo', known: 'expecting it'}] }
      );
      break;
  }

  basket.e = ePhrases.map(ep => [ep.spanish, ep.english]);

  for (const ePhrase of ePhrases) {
    const dPhrases = extractDPhrases(ePhrase.spanish, ePhrase.english, ePhrase.legoSequence, legoId);

    for (const size of ['2', '3', '4', '5']) {
      for (const phrase of dPhrases[size]) {
        if (!basket.d[size].some(p => p[0] === phrase[0])) {
          basket.d[size].push(phrase);
        }
      }
    }
  }

  baskets[legoId] = basket;
}

const output = JSON.stringify(baskets);
fs.writeFileSync('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/phase5_segments/segment_01/orch_02/agent_08_baskets.json', output);

console.log(`\n✅ Generated ${Object.keys(baskets).length} baskets`);
