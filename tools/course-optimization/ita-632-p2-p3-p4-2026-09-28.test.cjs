'use strict';
// Proving tests for job #639·I's P2/P3 rules: the pre-fix 644 rows FAIL the formal rule and the post-fix ones PASS;
// the intervener exception accepts the P2 rows and still refuses a phrase missing a LEGO word.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('./ita-632-p2-p3-p4-2026-09-28.cjs');
const A = require('./ita-lego-downstream-audit-2026-09-28.cjs');

test('P3: 644 rows fail before the edit and pass after; other 644 rows already pass with the named core', () => {
  for (const e of T.EDITS.filter(e => e.pattern === 'P3')) {
    assert.equal(T.containsFormalLego(e.from, T.LEGO_644, 'S0644L01'), false, e.id + ' before');
    assert.equal(T.containsFormalLego(e.to, T.LEGO_644, 'S0644L01'), true, e.id + ' after');
  }
  assert.equal(T.containsFormalLego({ known: 'could you help me sir?', target: 'potrebbe aiutarmi, signore?' }, T.LEGO_644, 'S0644L01'), true);
  assert.equal(T.containsFormalLego({ known: 'could you help me?', target: 'potrebbe aiutarmi?' }, T.LEGO_644, 'S0644L01'), false, 'sir must close it');
  assert.equal(T.containsFormalLego({ known: 'could you help me sir?', target: 'potrebbe aiutarmi?' }, T.LEGO_644, 'S0644L01'), false, 'both sides');
});
test('P3: a bare sir|signore LEGO needs only the closing honorific; sir under a madam LEGO is a break', () => {
  assert.equal(T.containsFormalLego({ known: 'yes sir', target: 'sì, signore' }, { known: 'sir', target: 'signore' }, 'S0639L01'), true);
  assert.equal(T.containsFormalLego({ known: 'you speak it well sir', target: 'lei lo parla bene, signore' }, { known: 'you speak it madam', target: 'lei lo parla, signora' }, 'S0647L01'), false);
  assert.equal(T.containsFormalLego({ known: 'I heard what you said', target: 'ho sentito quello che ha detto' }, { known: 'what you said madam', target: 'quello che ha detto, signora' }, 'S0648L01'), false);
});
test('P4 edits change the English only and end in the LEGO gloss', () => {
  const problems = []; T.paperGuards(problems); assert.deepEqual(problems, []);
  for (const e of T.EDITS.filter(e => e.pattern === 'P4')) { assert.equal(e.from.target, e.to.target); assert.match(e.to.known, /what was going to happen$/); }
});
test('P2 (audit K31): interveners inside the LEGO are tolerated; a missing LEGO word is not', () => {
  assert.equal(A.containsLegoWithInterveners('non ho ancora visto il loro nuovo bambino', 'non ho visto', 'target'), true);
  assert.equal(A.containsLegoWithInterveners('lo avevano già rotto', 'lo avevano rotto', 'target'), true);
  assert.equal(A.containsLegoWithInterveners('they are not ready yet', 'they are ready', 'known'), true);
  assert.equal(A.containsLegoWithInterveners('I suspect that he has heard many of them', 'that he has heard them', 'known'), true);
  assert.equal(A.containsLegoWithInterveners('ho visto', 'non ho visto', 'target'), false, 'the LEGO\'s own non is never dropped');
  assert.equal(A.containsLegoWithInterveners('non ho ancora visto', 'non ho visto', 'target'), true);
  assert.equal(A.containsLegoWithInterveners('non ho visto', 'non ho visto', 'target'), false, 'plain containment is not this exception');
});
test('audit K32: the formal rule is applied to 644 through FORMAL_CORES', () => {
  const L = { known_text: 'could you say it sir?', target_text: 'potrebbe dirlo, signore?' };
  assert.deepEqual(A.containsFormalLego({ known_text: 'could you do that sir?', target_text: 'potrebbe farlo, signore?' }, L, 'S0644L01'), { known: true, target: true });
  assert.deepEqual(A.containsFormalLego({ known_text: 'could you', target_text: 'potrebbe' }, L, 'S0644L01'), { known: false, target: false });
});
