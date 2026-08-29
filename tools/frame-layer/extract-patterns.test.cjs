#!/usr/bin/env node
/** Cheap self-test for the pattern matchers. No DB, no network, single process. */
const PATTERNS = require('./patterns.cjs');
const by = Object.fromEntries(PATTERNS.map(p => [p.id, p]));
let fail = 0;
const t = (id, text, want) => {
  const got = by[id].test(text);
  if (got !== want) { fail++; console.log(`FAIL ${id} ${want ? 'should' : 'should not'} match: ${text}`); }
};
// P1 want-chain
t('P1', 'I want to speak Spanish with you now', true);
t('P1', 'and I want you to speak Spanish with me tomorrow', true);
t('P1', 'you speak Spanish very well', false);
// P16 relative clause — must not fire on complementiser-that or interrogative who
t('P16', 'because I want to meet people who speak Spanish', true);
t('P16', 'I think that he needs to consider ten possible problems', false);
t('P16', 'who said that she\'s worried about the economy', false);
// P17 counterfactual
t('P17', "I'd have driven if you'd told me how tired you were", true);
t('P17', 'I want to speak Spanish with you now', false);
// P20 / P21
t('P20', 'Do you speak Spanish all day?', true);
t('P20', 'I speak a little Spanish now', false);
t('P21', 'Why are you learning her name?', true);
// P27
t('P27', "what's it like to live there?", true);
// ids unique, ordered, and each carries a shape
const ids = PATTERNS.map(p => p.id);
if (new Set(ids).size !== ids.length) { fail++; console.log('FAIL duplicate pattern ids'); }
for (const p of PATTERNS) if (!p.shape || !p.name) { fail++; console.log('FAIL missing shape/name', p.id); }
console.log(fail ? `${fail} failing assertion(s)` : `ok — ${PATTERNS.length} patterns, all assertions pass`);
process.exit(fail ? 1 : 0);
