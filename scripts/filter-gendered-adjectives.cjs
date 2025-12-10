#!/usr/bin/env node
/**
 * Filter to find gendered adjectives that describe people
 * and classify by grammatical person (1st, 2nd, 3rd)
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'public', 'vfs', 'courses', 'spa_for_eng', 'course_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Known adjectives/past participles that can describe people and have gender
const PERSON_DESCRIBING_ADJECTIVES = new Set([
  // States/conditions
  'preparado', 'listo', 'cansado', 'contento', 'feliz', 'triste',
  'ocupado', 'preocupado', 'nervioso', 'tranquilo', 'callado', 'silencioso',
  'seguro', 'convencido', 'sorprendido', 'entusiasmado', 'agradecido',
  'enojado', 'enfadado', 'molesto', 'frustrado', 'confundido',
  'aburrido', 'interesado', 'emocionado', 'asustado',
  'enfermo', 'sano', 'vivo', 'muerto',
  'solo', 'perdido', 'sentado', 'parado', 'acostado',
  'dormido', 'despierto', 'lastimado', 'herido',
  'dispuesto', 'decidido', 'equivocado', 'correcto',

  // Physical descriptions
  'alto', 'bajo', 'gordo', 'delgado', 'flaco',
  'viejo', 'joven', 'nuevo', 'guapo', 'feo',
  'fuerte', 'débil', 'rápido', 'lento',

  // Character/behavior
  'bueno', 'malo', 'perfecto', 'loco', 'estúpido', 'sensato',
  'amable', 'simpático', 'antipático', 'tímido', 'atrevido',
  'serio', 'divertido', 'gracioso', 'aburrido',

  // Marital/relationship status
  'casado', 'soltero', 'divorciado', 'enamorado',

  // Past participles commonly used as adjectives
  'cansado', 'mojado', 'sucio', 'limpio', 'roto',
  'abierto', 'cerrado', 'encendido', 'apagado',
  'terminado', 'acabado', 'hecho', 'comprado',
]);

// Words to exclude (verbs, nouns, function words ending in -o)
const EXCLUDE_WORDS = new Set([
  // Function words
  'no', 'lo', 'eso', 'esto', 'pero', 'como', 'cómo', 'cuando', 'cuándo',
  'algo', 'poco', 'mucho', 'otro', 'todo', 'yo', 'ello', 'uno',
  'tanto', 'dentro', 'abajo', 'cuánto', 'cuanto', 'luego', 'pronto',

  // Verb forms (1st person present)
  'quiero', 'creo', 'tengo', 'puedo', 'conozco', 'siento', 'pienso',
  'necesito', 'espero', 'disfruto', 'llevo', 'comprendo', 'temo',
  'hago', 'busco', 'muevo', 'termino', 'debo', 'pregunto', 'sospecho',
  'hablo', 'odio',

  // Verb forms (3rd person past)
  'dijo', 'vio', 'hizo', 'vino', 'fue',

  // Gerunds
  'intentando', 'haciendo', 'comenzando', 'aprendiendo', 'esperando',
  'dando', 'funcionando', 'diciendo', 'buscando', 'jugando',
  'caminando', 'poniendo', 'perdiendo', 'planeando', 'sintiendo',
  'observando', 'saliendo', 'teniendo', 'hablando', 'deseando',
  'pensando', 'trabajando', 'disfrutando', 'cambiando', 'empezando',
  'pasando',

  // Nouns
  'tiempo', 'amigo', 'libro', 'trabajo', 'año', 'momento', 'dinero',
  'mundo', 'perro', 'cerebro', 'domingo', 'sábado', 'grupo', 'hermano',
  'hijo', 'consejo', 'vaso', 'gatito', 'campo', 'pelo', 'vestido',
  'ejemplo', 'vino', 'acercamiento', 'abuelo', 'muro', 'estacionamiento',
  'desafío', 'espectáculo', 'sentido', 'tipo', 'dormitorio', 'turno',
  'barro', 'juego', 'pueblo', 'camino', 'lado', 'carro', 'niño',
  'número', 'acuerdo', 'auto', 'medio', 'supuesto', 'rato',

  // Compound verb parts
  'contigo', 'conmigo', 'ponerlo', 'buscarlo', 'manejarlo', 'decirlo',
  'dárselo', 'lanzarlo', 'cambiarlo', 'arreglarlo', 'esperándolo',

  // Past participles that are auxiliary/compound
  'estado', 'sido', 'hecho', 'dicho', 'visto', 'ido', 'oído',
  'sabido', 'podido', 'querido', 'tenido',

  // Other
  'pasado', 'próximo', 'último', 'mismo', 'demasiado', 'segundo',
  'cuatro', 'cinco', 'mínimo', 'absoluto', 'tinto', 'negro', 'amarillo',
  'nuestro', 'mío',
]);

// Collect seed sentences with context
const seeds = [];
for (const slice of manifest.slices || []) {
  for (const seed of slice.seeds || []) {
    if (seed.node?.target?.text) {
      seeds.push({
        spanish: seed.node.target.text,
        english: seed.node.known?.text || '',
        seedId: seed.id,
        seedSentence: seed.seed_sentence?.canonical || ''
      });
    }
  }
}

// Find gendered adjectives with context classification
const results = {
  first_person: [],   // "I am tired" - estoy cansado
  second_person: [],  // "Are you ready?" - ¿Estás preparado?
  third_person: [],   // "He is tired" - Él está cansado
  unclear: []
};

const patternStats = new Map();

for (const seed of seeds) {
  const spanish = seed.spanish.toLowerCase();
  const words = spanish.replace(/[¿¡.,!?;:'"()]/g, '').split(/\s+/);

  for (const word of words) {
    // Skip if not in our adjective list or is excluded
    if (EXCLUDE_WORDS.has(word)) continue;
    if (!word.endsWith('o') && !word.endsWith('ado') && !word.endsWith('ido')) continue;

    // Check if it's a person-describing adjective
    const isKnownAdj = PERSON_DESCRIBING_ADJECTIVES.has(word);

    // Also catch -ado/-ido patterns that might describe people
    const isPastPart = word.endsWith('ado') || word.endsWith('ido');

    if (!isKnownAdj && !isPastPart) continue;

    // Determine grammatical person from context
    let person = 'unclear';

    // First person patterns
    if (/\bestoy\b/i.test(spanish) ||
        /\bme siento\b/i.test(spanish) ||
        /\bsoy\b/i.test(spanish) ||
        /\bhe estado\b/i.test(spanish) ||
        /\bestaba\b.*\byo\b/i.test(spanish) ||
        /\byo\b.*\bestaba\b/i.test(spanish) ||
        /^estoy\b/i.test(seed.spanish)) {
      // Check if this word follows "estoy/soy/me siento"
      if (new RegExp(`\\b(estoy|soy|me siento|he estado|estaba)\\b.*\\b${word}\\b`, 'i').test(spanish)) {
        person = 'first_person';
      }
    }

    // Second person patterns
    if (/\bestás\b/i.test(spanish) ||
        /\beres\b/i.test(spanish) ||
        /\bte sientes\b/i.test(spanish) ||
        /\?/.test(seed.spanish)) {
      if (new RegExp(`\\b(estás|eres|te sientes|has estado)\\b.*\\b${word}\\b`, 'i').test(spanish) ||
          new RegExp(`\\b${word}\\b.*\\?`, 'i').test(seed.spanish)) {
        person = 'second_person';
      }
    }

    // Third person patterns
    if (/\bél\b/i.test(spanish) ||
        /\bella\b/i.test(spanish) ||
        /\bestá\b/i.test(spanish) && !/\bestás\b/i.test(spanish) ||
        /\bes\b/i.test(spanish) && !/\beres\b/i.test(spanish)) {
      if (new RegExp(`\\b(él|ella)\\b.*\\b${word}\\b`, 'i').test(spanish) ||
          new RegExp(`\\bestá\\b.*\\b${word}\\b`, 'i').test(spanish)) {
        person = 'third_person';
      }
    }

    // Track pattern stats
    const key = `${word}:${person}`;
    const count = (patternStats.get(key) || 0) + 1;
    patternStats.set(key, count);

    const result = {
      word,
      feminineForm: word.slice(0, -1) + 'a',
      spanish: seed.spanish,
      english: seed.english,
      seedId: seed.seedId,
      occurrenceNumber: count,
      isFirst: count === 1,
      isSecond: count === 2
    };

    results[person].push(result);
  }
}

// Print results
console.log('='.repeat(80));
console.log('GENDERED ADJECTIVES DESCRIBING PEOPLE');
console.log('='.repeat(80));

console.log(`\n1ST PERSON (speaker) - ${results.first_person.length} instances`);
console.log('These should ALL change to feminine for target1:\n');

const firstPersonGroups = {};
for (const r of results.first_person) {
  if (!firstPersonGroups[r.word]) firstPersonGroups[r.word] = [];
  firstPersonGroups[r.word].push(r);
}

for (const [word, instances] of Object.entries(firstPersonGroups)) {
  console.log(`  ${word} → ${word.slice(0,-1)}a (${instances.length}x)`);
  for (const inst of instances.slice(0, 2)) {
    console.log(`    ${inst.isFirst ? '[1ST]' : inst.isSecond ? '[2ND]' : '     '} "${inst.spanish}"`);
    console.log(`         "${inst.english}"`);
  }
  if (instances.length > 2) console.log(`    ... and ${instances.length - 2} more`);
  console.log('');
}

console.log(`\n2ND PERSON (addressee) - ${results.second_person.length} instances`);
console.log('These could change to feminine for variety:\n');

const secondPersonGroups = {};
for (const r of results.second_person) {
  if (!secondPersonGroups[r.word]) secondPersonGroups[r.word] = [];
  secondPersonGroups[r.word].push(r);
}

for (const [word, instances] of Object.entries(secondPersonGroups)) {
  console.log(`  ${word} → ${word.slice(0,-1)}a (${instances.length}x)`);
  for (const inst of instances.slice(0, 2)) {
    console.log(`    ${inst.isFirst ? '[1ST]' : inst.isSecond ? '[2ND]' : '     '} "${inst.spanish}"`);
    console.log(`         "${inst.english}"`);
  }
  if (instances.length > 2) console.log(`    ... and ${instances.length - 2} more`);
  console.log('');
}

console.log(`\n3RD PERSON (fixed context) - ${results.third_person.length} instances`);
console.log('These stay as-is (context determines gender):\n');

for (const r of results.third_person.slice(0, 5)) {
  console.log(`  ${r.word}: "${r.spanish}"`);
}

console.log(`\nUNCLEAR (needs review) - ${results.unclear.length} instances\n`);

const unclearGroups = {};
for (const r of results.unclear) {
  if (!unclearGroups[r.word]) unclearGroups[r.word] = [];
  unclearGroups[r.word].push(r);
}

for (const [word, instances] of Object.entries(unclearGroups)) {
  console.log(`  ${word} (${instances.length}x)`);
  for (const inst of instances.slice(0, 2)) {
    console.log(`    "${inst.spanish}"`);
    console.log(`    "${inst.english}"`);
  }
  console.log('');
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`1st Person (change ALL):  ${results.first_person.length}`);
console.log(`2nd Person (change for variety): ${results.second_person.length}`);
console.log(`3rd Person (keep as-is): ${results.third_person.length}`);
console.log(`Unclear (review): ${results.unclear.length}`);

// Save full results
const outputPath = path.join(__dirname, 'gendered-adjectives-classified.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\nFull results saved to: ${outputPath}`);
