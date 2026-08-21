/**
 * Celtic initial-consonant mutations — shared rule table.
 *
 * In Irish, Welsh, Scottish Gaelic and Breton the FIRST consonant of a word
 * changes in certain grammatical contexts. `bean` → `bhean` (lenition) or
 * `mbean` (eclipsis) is the SAME WORD, not a different one.
 *
 * Tom's rule (see phrase-decomposer.cjs): mutations are NOT errors — you cannot
 * introduce every mutated form as its own LEGO. We forward-mutate the LEGO's
 * initial into each grammatical variant and retry the match. Forward mutation is
 * exact and bounded; de-mutation would be ambiguous (many-to-one).
 *
 * Rules are [originalInitial, mutatedInitial] pairs.
 *
 * This table was lifted verbatim out of services/phrase-decomposer.cjs so that
 * the decomposer and the containment gate agree about what "the same word" means.
 */
const MUTATION_RULES = {
  cym: [ // Welsh: soft / nasal / aspirate
    ['ll', 'l'], ['rh', 'r'],
    ['c', 'g'], ['p', 'b'], ['t', 'd'], ['g', ''], ['b', 'f'], ['d', 'dd'], ['m', 'f'], // soft
    ['c', 'ngh'], ['p', 'mh'], ['t', 'nh'], ['g', 'ng'], ['b', 'm'], ['d', 'n'],        // nasal
    ['c', 'ch'], ['p', 'ph'], ['t', 'th'],                                              // aspirate
  ],
  gle: [ // Irish: lenition + eclipsis
    ['b', 'bh'], ['c', 'ch'], ['d', 'dh'], ['f', 'fh'], ['g', 'gh'], ['m', 'mh'], ['p', 'ph'], ['s', 'sh'], ['t', 'th'], // lenition
    ['b', 'mb'], ['c', 'gc'], ['d', 'nd'], ['f', 'bhf'], ['g', 'ng'], ['p', 'bp'], ['t', 'dt'],                          // eclipsis
  ],
  gla: [ // Scottish Gaelic: lenition
    ['b', 'bh'], ['c', 'ch'], ['d', 'dh'], ['f', 'fh'], ['g', 'gh'], ['m', 'mh'], ['p', 'ph'], ['s', 'sh'], ['t', 'th'],
  ],
  bre: [ // Breton: soft + spirant (best-effort)
    ['gw', 'w'], ['k', 'g'], ['p', 'b'], ['t', 'd'], ['g', "c'h"], ['b', 'v'], ['d', 'z'], ['m', 'v'], // soft
    ['k', "c'h"], ['p', 'f'], ['t', 'z'],                                                              // spirant
  ],
};

/** 'gle_cn_for_eng' → 'gle'; 'gle' → 'gle'; anything else → ''. */
function mutationLangPrefix(courseCodeOrLang) {
  const s = String(courseCodeOrLang || '').toLowerCase();
  if (!s) return '';
  const prefix = s.split('_')[0];
  return MUTATION_RULES[prefix] ? prefix : '';
}

/** True when this course's target language has initial mutations at all. */
function hasInitialMutations(courseCodeOrLang) {
  return mutationLangPrefix(courseCodeOrLang) !== '';
}

/**
 * Every grammatically mutated form of a single WORD.
 * Returns [] (never the word itself) when the language has no mutations.
 */
function mutatedWordForms(word, courseCodeOrLang) {
  const rules = MUTATION_RULES[mutationLangPrefix(courseCodeOrLang)];
  if (!rules || !word) return [];
  const lower = String(word).toLowerCase();
  const out = new Set();
  for (const [from, to] of rules) {
    if (from.length > 0 && lower.startsWith(from)) out.add(to + lower.slice(from.length));
  }
  out.delete(lower);
  return [...out];
}

/**
 * Every mutated form of a multi-word surface, mutating the FIRST word only.
 * Mutation only ever rewrites the word-initial, so the rest keeps its surface
 * and casing; a mutated initial is inherently lower-case.
 */
function mutationVariants(parentTarget, courseCodeOrLang) {
  const rules = MUTATION_RULES[mutationLangPrefix(courseCodeOrLang)];
  if (!rules) return [];
  const m = String(parentTarget || '').match(/^(\s*)(\S+)([\s\S]*)$/);
  if (!m) return [];
  const [, lead, firstWord, rest] = m;
  const lower = firstWord.toLowerCase();
  const variants = new Set();
  for (const [from, to] of rules) {
    if (from.length > 0 && lower.startsWith(from)) {
      variants.add(lead + to + firstWord.slice(from.length) + rest);
    }
  }
  variants.delete(parentTarget);
  return [...variants];
}

module.exports = {
  MUTATION_RULES,
  mutationLangPrefix,
  hasInitialMutations,
  mutatedWordForms,
  mutationVariants,
};
