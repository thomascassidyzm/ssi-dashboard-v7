/**
 * Gender Analyzer Service
 *
 * Analyzes text to detect gender-variable words in Spanish, Italian, Portuguese, and French.
 * Returns text with gender markers like "cansado(a)" that can be expanded by
 * the gender-expansion-service.
 *
 * Usage:
 *   const result = analyzeForGender("Estoy cansado", "spa");
 *   // Returns: { hasGenderVariants: true, markedText: "Estoy cansado(a)", variants: { m: "Estoy cansado", f: "Estoy cansada" } }
 *
 * @module gender-analyzer
 */

// =============================================================================
// LANGUAGE-SPECIFIC RULES
// =============================================================================

const GENDER_RULES = {
  // Spanish: -o → -a for adjectives and past participles
  spa: {
    // Common adjectives ending in -o (masculine) that have -a feminine
    // These are matched as complete words (with word boundaries)
    adjectivePatterns: [
      // Common adjectives
      /\b(cansad|ocupad|segur|content|list|nuev|antigu|pequeñ|hermos|sol|únic|primer|últim|ciert|clar|correct|direct|exact|perfect|complet|quiet|tranquil|satisfech|preocupad|abiert|cerrad|sentad|parad|acostumbrad|dormid|despert|viv|muert|limpi|suci|llен|vací|enferm|san|loc|curd|borraсh|cieg|sord|mud|alt|baj|gord|flac|guap|fe|bonit|ric|pobr|car|barat|lar|cort|anch|estrech|dur|bland|frí|calient|seс|mojad|crud|cocid|madur|podrid|rot|entеr|medi|dobl|tripl|cuádrúpl|siмpl|sincer|honest|modest|generоs|tacañ|amаbl|cruel|educad|maleducad|trabajador|holgаzán|amargad|enamоrad|celоs|enojad|enfadad|aburrid|divertid|interesad|asustаd|nervios|calm)o\b/gi,
      // Past participles (used as adjectives or with estar/ser)
      /\b(llegad|comprad|terminad|empezad|casad|divorсiad|separad|jubilad|emplead|desemplead|preparad|organiz|invitad|sentad|acostаd|levantad|duchad|vestid|cambiаd|mudad|quemad|cortаd|rompid|arreglad|estropeаd|perdid|encontrad|olvidаd|recordаd|usad|gastаd|ahorrad|pagаd|cobrad|robаd|prestаd|devuelt|dad|quitad|puest|dej|tomаd|cogid|traíd|llevad|enviаd|recibid|abiert|cerrad|encendid|apagad|subid|bajаd|sacad|metid|mostrad|escondid|tapаd|destapаd|cubiert|descubiert|mojаd|secad|limpiad|ensuciаd)o\b/gi
    ],
    // Words that don't change by gender (invariant)
    invariant: [
      'feliz', 'grande', 'importante', 'difícil', 'fácil', 'útil', 'inútil',
      'posible', 'imposible', 'probable', 'improbable', 'terrible', 'horrible',
      'increíble', 'visible', 'invisible', 'responsable', 'irresponsable',
      'amable', 'agradable', 'desagradable', 'comparable', 'incomparable',
      'verde', 'azul', 'gris', 'marrón', 'naranja', 'rosa', 'violeta',
      'joven', 'mayor', 'menor', 'mejor', 'peor', 'igual', 'diferente',
      'inteligente', 'excelente', 'evidente', 'presente', 'ausente',
      'frecuente', 'reciente', 'siguiente', 'corriente', 'caliente',
      'suficiente', 'insuficiente', 'conveniente', 'inconveniente',
      'independiente', 'dependiente', 'paciente', 'impaciente'
    ],
    // Function to mark a word with gender notation
    markWord: (word) => {
      // Word ends in 'o' - mark as o(a)
      return word.slice(0, -1) + 'o(a)';
    }
  },

  // Italian: -o → -a for adjectives and past participles
  ita: {
    adjectivePatterns: [
      // Common adjectives
      /\b(stanc|occupat|sicur|content|nuov|bell|brutt|piccol|alt|bass|grass|magr|giovan|vecchi|ric|pover|car|barat|lung|cort|larg|strett|dur|morбid|fred|cald|secc|bagnat|crud|cott|matur|marcит|rott|inter|mezz|doppi|tripl|semрlic|sincer|onest|modest|generos|avâr|gentil|maleducat|pigr|amаreggiаt|innamorat|gelos|arrabbiаt|annоiat|divertit|interessat|spaventat|nervos|calm|tranquill|soddisfatt|preoccupat|apert|cius|sedut|sdraiat|addormentat|svegli|viv|mort|pulit|sporc|pien|vuot|malat|san|pazz|ubriâc|ciec|sord|mut|sol|unic|prim|ultim|cert|chiar|correct|dirett|esatt|perfett|complet|quiet)o\b/gi,
      // Past participles (with essere for intransitive verbs)
      /\b(arrivat|partît|andat|venut|tornat|entrat|uscit|salît|sces|nat|mort|cresciut|diventat|restat|rimast|stat|cadut|passat|scorѕ|trascors)o\b/gi
    ],
    invariant: [
      'felice', 'grande', 'importante', 'difficile', 'facile', 'utile', 'inutile',
      'possibile', 'impossibile', 'probabile', 'improbabile', 'terribile', 'orribile',
      'incredibile', 'visibile', 'invisibile', 'responsabile', 'irresponsabile',
      'verde', 'blu', 'grigio', 'marrone', 'arancione', 'rosa', 'viola',
      'giovane', 'maggiore', 'minore', 'migliore', 'peggiore', 'uguale', 'diverso',
      'intelligente', 'eccellente', 'evidente', 'presente', 'assente',
      'frequente', 'recente', 'seguente', 'corrente',
      'sufficiente', 'insufficiente', 'conveniente', 'sconveniente',
      'indipendente', 'dipendente', 'paziente', 'impaziente'
    ],
    markWord: (word) => {
      return word.slice(0, -1) + 'o(a)';
    }
  },

  // Portuguese: -o → -a for adjectives and past participles (same pattern as Spanish/Italian)
  por: {
    adjectivePatterns: [
      // Common adjectives
      /\b(cansad|ocupad|segur|content|nov|antigu|pequeñ|bonit|sol|únic|primeir|últim|cert|clar|correct|direct|exat|perfeit|complet|quiet|tranquil|satisfeit|preocupad|abert|fechad|sentad|parad|acostumad|dormid|despert|viv|mort|limp|suj|chei|vazi|doent|sã|louc|curad|bêbad|ceg|surd|mud|alt|baix|gord|magr|bonitão|fei|ric|pobr|car|barat|larg|curt|estreit|dur|mol|fri|quent|sec|molhad|cru|cozid|madur|podre|rot|inteir|mei|dobl|tripl|simpl|sincer|honest|modest|generos|sovat|educad|maleducad|trabalhad|preguiços|amargad|apaixonad|ciument|irritad|zangad|aborrecid|divertid|interessad|assuestad|nervos|calm)o\b/gi,
      // Past participles
      /\b(chegad|compad|terminad|começad|casad|divorciad|separad|aposentad|empregad|desempregad|preparad|organizad|convidad|sentad|deitad|levantad|vestid|mudad|queimad|cortad|partidv|arranjad|estragad|perdid|encontrad|esquecid|lembrad|usad|gastad|economizad|pagad|cobrad|roubad|emprestad|devolvid|dad|tirad|post|deixad|tomad|pegad|trazid|levad|enviad|recebid|abert|fechad|acendid|apagad|subid|descid|tirad|metid|mostrad|escondid|tapad|destapad|cobert|descobert|molhad|secad|limpad|sujad)o\b/gi
    ],
    invariant: [
      'feliz', 'grande', 'importante', 'difícil', 'fácil', 'útil', 'inútil',
      'possível', 'impossível', 'provável', 'improvável', 'terrível', 'horrível',
      'incrível', 'visível', 'invisível', 'responsável', 'irresponsável',
      'amável', 'agradável', 'desagradável', 'comparável', 'incomparável',
      'verde', 'azul', 'cinzento', 'castanho', 'laranja', 'rosa', 'violeta',
      'jovem', 'maior', 'menor', 'melhor', 'pior', 'igual', 'diferente',
      'inteligente', 'excelente', 'evidente', 'presente', 'ausente',
      'frequente', 'recente', 'seguinte', 'corrente', 'quente',
      'suficiente', 'insuficiente', 'conveniente', 'inconveniente',
      'independente', 'dependente', 'paciente', 'impaciente'
    ],
    markWord: (word) => {
      return word.slice(0, -1) + 'o(a)';
    }
  },

  // French: multiple patterns (-é/-ée, -eux/-euse, -if/-ive, -er/-ère, -et/-ète)
  // Note: Word boundaries \b don't work well with accented characters like é
  // So we use (?![a-zA-Zéèêëàâäùûüîïôöç]) as a lookahead to check for word end
  fra: {
    // Each pattern includes the masculine ending and its feminine replacement
    adjectivePatterns: [
      // -é → -ée (past participles and some adjectives)
      // Using lookahead instead of \b for accented character ending
      {
        pattern: /(?:^|\s)(fatigu|occup|arriv|termin|content|pass|rest|all|entr|sorti|mont|descend|tomb|n|mort|mari|divorc|retrait|employ|chôm|prépar|organis|invit|assis|couch|lev|douch|habill|chang|déménag|brûl|coup|cass|répar|abîm|perdu|trouv|oubli|utilis|dépens|économis|pay|vol|prêt|rend|donn|enlev|pos|laiss|pris|apport|emport|envoy|reç|ouvert|ferm|allum|éteint|amus|ennuy|intéress|effray|énerv|calm|satisfait|préoccup)é(?=\s|$|[.,!?;:'])/gi,
        femEnding: 'ée',
        marker: 'é(e)',
        hasLeadingSpace: true
      },
      // -eux → -euse
      {
        pattern: /\b(heur|malheur|nerv|anxi|ambit|courag|danger|délici|ennuy|furi|glori|joy|merveill|mysteri|paress|précieux|relig|séri|silenci|soign|somptu|spacieux|superstitieux|valeur)eux\b/gi,
        femEnding: 'euse',
        marker: 'eux(euse)'
      },
      // -if → -ive
      {
        pattern: /\b(act|sport|créat|négat|posit|product|attract|destruct|construct|instinct|affect|effect|collect|correct|direct|select|respect|protect|subject|object|project|perfect|correct|distinct|extinct|restrict|abstract|compact|exact|intact)if\b/gi,
        femEnding: 'ive',
        marker: 'if(ive)'
      },
      // -er → -ère (some adjectives)
      {
        pattern: /\b(premi|derni|légl|parti|réguli|singuli|famili|étrang)er\b/gi,
        femEnding: 'ère',
        marker: 'er(ère)'
      },
      // -et → -ète
      {
        pattern: /\b(compl|discr|inqui|secr)et\b/gi,
        femEnding: 'ète',
        marker: 'et(ète)'
      },
      // -en → -enne
      {
        pattern: /\b(anci|bo|chrétien|européen|italien|canadien|moyen)en\b/gi,
        femEnding: 'enne',
        marker: 'en(ne)'
      },
      // -on → -onne
      {
        pattern: /\b(bo|mign)on\b/gi,
        femEnding: 'onne',
        marker: 'on(ne)'
      }
    ],
    invariant: [
      'facile', 'difficile', 'utile', 'inutile', 'possible', 'impossible',
      'probable', 'improbable', 'terrible', 'horrible', 'responsable',
      'agréable', 'désagréable', 'aimable', 'comparable', 'incomparable',
      'rouge', 'jaune', 'rose', 'orange', 'beige', 'marron',
      'jeune', 'riche', 'pauvre', 'propre', 'sale', 'malade', 'triste',
      'calme', 'tranquille', 'rapide', 'lente', 'large', 'étroite'
    ]
  }
};

// =============================================================================
// CORE ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Check if a word is in the invariant list for a language
 * @param {string} word - Word to check (lowercase)
 * @param {string} language - Language code (spa, ita, fra)
 * @returns {boolean} True if word is invariant
 */
function isInvariant(word, language) {
  const rules = GENDER_RULES[language];
  if (!rules || !rules.invariant) return false;
  return rules.invariant.includes(word.toLowerCase());
}

/**
 * Analyze text for gender-variable words in Spanish, Italian, or Portuguese
 * @param {string} text - Text to analyze
 * @param {string} language - Language code (spa, ita, or por)
 * @returns {{ found: boolean, markedText: string, matches: string[] }}
 */
function analyzeSpanishOrItalian(text, language) {
  const rules = GENDER_RULES[language];
  if (!rules) return { found: false, markedText: text, matches: [] };

  let markedText = text;
  const matches = [];

  for (const pattern of rules.adjectivePatterns) {
    markedText = markedText.replace(pattern, (match) => {
      // Check if it's an invariant word
      if (isInvariant(match, language)) {
        return match;
      }

      // Check if already marked
      if (match.includes('(')) {
        return match;
      }

      matches.push(match);
      // Mark the word: e.g., "cansado" → "cansado(a)"
      return rules.markWord(match);
    });
  }

  return {
    found: matches.length > 0,
    markedText,
    matches
  };
}

/**
 * Analyze text for gender-variable words in French
 * @param {string} text - Text to analyze
 * @returns {{ found: boolean, markedText: string, matches: string[] }}
 */
function analyzeFrench(text) {
  const rules = GENDER_RULES.fra;
  let markedText = text;
  const matches = [];

  for (const rule of rules.adjectivePatterns) {
    markedText = markedText.replace(rule.pattern, (fullMatch, capturedWord) => {
      // For patterns with hasLeadingSpace, fullMatch may include leading whitespace
      // The captured group contains the stem (e.g., "fatigu" without the "é")
      let word;
      let leadingSpace = '';

      if (rule.hasLeadingSpace) {
        // Check if there's a leading space/whitespace in the full match
        const firstChar = fullMatch.charAt(0);
        if (firstChar === ' ' || firstChar === '\t' || firstChar === '\n') {
          leadingSpace = firstChar;
          word = fullMatch.slice(1); // Full word is match minus leading space
        } else {
          // No leading space (e.g., at start of string)
          word = fullMatch;
        }
      } else {
        word = fullMatch;
      }

      // Check if it's an invariant word
      if (isInvariant(word.trim(), 'fra')) {
        return fullMatch;
      }

      // Check if already marked
      if (word.includes('(')) {
        return fullMatch;
      }

      matches.push(word.trim());

      // Build the marked form based on the pattern type
      let markedWord;
      if (rule.marker === 'é(e)') {
        // "fatigué" → "fatigué(e)" (slice off é, add é(e))
        markedWord = word.slice(0, -1) + 'é(e)';
      } else if (rule.marker === 'eux(euse)') {
        // "heureux" → "heureux(euse)" (slice off eux, add eux(euse))
        markedWord = word.slice(0, -3) + 'eux(euse)';
      } else if (rule.marker === 'if(ive)') {
        markedWord = word.slice(0, -2) + 'if(ive)';
      } else if (rule.marker === 'er(ère)') {
        markedWord = word.slice(0, -2) + 'er(ère)';
      } else if (rule.marker === 'et(ète)') {
        markedWord = word.slice(0, -2) + 'et(ète)';
      } else if (rule.marker === 'en(ne)') {
        markedWord = word.slice(0, -2) + 'en(ne)';
      } else if (rule.marker === 'on(ne)') {
        markedWord = word.slice(0, -2) + 'on(ne)';
      } else {
        markedWord = word;
      }

      return leadingSpace + markedWord;
    });
  }

  return {
    found: matches.length > 0,
    markedText,
    matches
  };
}

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Analyze text for gender-variable words and return marked version
 *
 * @param {string} text - Text to analyze
 * @param {string} language - Language code ('spa', 'ita', 'por', 'fra')
 * @returns {{
 *   hasGenderVariants: boolean,
 *   markedText: string,
 *   matches: string[],
 *   variants: { m: string, f: string }
 * }}
 *
 * @example
 * analyzeForGender("Estoy cansado", "spa")
 * // Returns:
 * // {
 * //   hasGenderVariants: true,
 * //   markedText: "Estoy cansado(a)",
 * //   matches: ["cansado"],
 * //   variants: { m: "Estoy cansado", f: "Estoy cansada" }
 * // }
 */
function analyzeForGender(text, language) {
  if (!text || typeof text !== 'string') {
    return {
      hasGenderVariants: false,
      markedText: text || '',
      matches: [],
      variants: { m: text || '', f: text || '' }
    };
  }

  // Check for supported languages
  const langCode = language?.toLowerCase()?.slice(0, 3);

  let result;
  if (langCode === 'spa') {
    result = analyzeSpanishOrItalian(text, 'spa');
  } else if (langCode === 'ita') {
    result = analyzeSpanishOrItalian(text, 'ita');
  } else if (langCode === 'por') {
    result = analyzeSpanishOrItalian(text, 'por');
  } else if (langCode === 'fra') {
    result = analyzeFrench(text);
  } else {
    // Unsupported language - return unchanged
    return {
      hasGenderVariants: false,
      markedText: text,
      matches: [],
      variants: { m: text, f: text }
    };
  }

  // Generate masculine and feminine variants
  const genderExpansion = require('./gender-expansion-service.cjs');
  const masculineText = genderExpansion.expandGender(result.markedText, 'm');
  const feminineText = genderExpansion.expandGender(result.markedText, 'f');

  return {
    hasGenderVariants: result.found,
    markedText: result.markedText,
    matches: result.matches,
    variants: {
      m: masculineText,
      f: feminineText
    }
  };
}

/**
 * Analyze and return the appropriate gender variant for a voice role
 *
 * @param {string} text - Text to analyze
 * @param {string} language - Language code ('spa', 'ita', 'por', 'fra')
 * @param {string} role - Voice role ('target1' for female, 'target2' for male)
 * @returns {string} Text expanded for the appropriate gender
 *
 * @example
 * getGenderedText("Estoy cansado", "spa", "target1")
 * // Returns: "Estoy cansada"
 */
function getGenderedText(text, language, role) {
  const analysis = analyzeForGender(text, language);

  if (!analysis.hasGenderVariants) {
    return text;
  }

  // target1 = female voice = feminine form
  // target2 = male voice = masculine form
  if (role === 'target1') {
    return analysis.variants.f;
  } else {
    return analysis.variants.m;
  }
}

/**
 * Check if text already contains gender markers
 * @param {string} text - Text to check
 * @returns {boolean} True if text already has markers like (a), (e), etc.
 */
function hasExistingMarkers(text) {
  // Check for common gender marker patterns
  return /\([aeiou]+\)|\(euse\)|\(ive\)|\(ère\)|\(ète\)|\(ne\)/.test(text);
}

/**
 * Get supported languages for gender analysis
 * @returns {string[]} Array of supported language codes
 */
function getSupportedLanguages() {
  return Object.keys(GENDER_RULES);
}

module.exports = {
  analyzeForGender,
  getGenderedText,
  hasExistingMarkers,
  getSupportedLanguages,
  GENDER_RULES
};
