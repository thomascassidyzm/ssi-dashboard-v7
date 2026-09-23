// The one test that proves the change (Kai's rule, 2026-09-23 19:40Z, job #932·H): an all-review seed's sentence goes
// under the LEGO whose debut completes its coverage, as a phrase that contains that LEGO — never as a padded block.
// Pre-fix: the four seeds (189, 650, 654, 665) had NO row anywhere (every LEGO a duplicate, zero phrases, the old
// rescue keyed on the whole string found nothing). Post-fix: each has one use row under the latest-taught piece, and
// the shared rule computes the same host from the real earlier LEGOs. The near-empty 12 are untouched. Offline: no DB.
import { describe, it, expect } from 'vitest';
const T = require('./eng-for-hin-all-review-seeds-rehome-2026-09-23.cjs');
const R = require('../../services/course-builder/lib/all-review-seed.cjs');

const L = (seed_number, lego_index, known_text, target_text) => ({ seed_number, lego_index, lego_id: `S${String(seed_number).padStart(4, '0')}L${String(lego_index).padStart(2, '0')}`, known_text, target_text });
// The live pieces (2026-09-23) plus one earlier feminine form and one earlier या नहीं, as the course has them.
const PRIOR = [
  L(10, 3, 'मुझे यक़ीन नहीं है कि', "I'm not sure if"), L(35, 1, 'वह चाहती है', 'she wants'), L(62, 1, 'मैं आपकी मदद कर सकता हूँ', 'I can help you'),
  L(97, 1, 'हाँ', 'yes'), L(123, 2, 'यह अच्छा विचार है', "that's a good idea"), L(156, 1, 'क्या आप जाना चाहते हैं', 'do you want to go'),
  L(177, 1, 'जाना', 'to go'), L(525, 2, 'आप पूरा कर पाए या नहीं', 'you were able to finish'), L(639, 2, 'सर', 'sir'), L(642, 2, 'मैडम', 'madam'),
  L(658, 1, 'क्या आप सब चाहते हैं', 'do you all want'),
];

describe('eng_for_hin all-review seeds: re-homed, never padded', () => {
  it('pre-fix: the seeds had no row under any LEGO (fails); post-fix: one use row each, under the latest-taught piece (passes)', () => {
    expect(T.REHOMES.map(r => r.seed)).toEqual([189, 650, 654, 665]);
    expect(T.REHOMES.map(T.phraseId)).toEqual(['eng_for_hin:S0123L02U06', 'eng_for_hin:S0642L02U06', 'eng_for_hin:S0639L02U06', 'eng_for_hin:S0658L01U06']);
    for (const r of T.REHOMES) {
      const f = R.findRehomeHost({ known_text: r.seedKnown, target_text: r.seedTarget }, PRIOR.filter(l => l.seed_number < r.seed));
      expect(f.host.lego_id).toBe(r.host);
      expect(R.phraseContainsLego(T.hostLego(r.host), r)).toBe(true);
    }
    expect(T.offlineCheck()).toEqual([]);
  });
  it('no padded block: nothing is marked new, no LEGO row is written, and the 12 near-empty seeds are not touched', () => {
    expect(T.allRows().every(r => r.role === 'use')).toBe(true);
    const touched = new Set([...T.REHOMES.map(r => r.seed), ...T.NO_WRITE.map(n => n.seed)]);
    for (const n of [...T.NEAR_EMPTY_KEPT, ...T.UNTOUCHED]) expect(touched.has(n)).toBe(false);
  });
  it('the seven no-write seeds already reach the learner: two ARE an earlier LEGO, five are already a phrase', () => {
    expect(T.NO_WRITE.filter(n => n.why === 'bare-lego').map(n => n.seed)).toEqual([194, 543]);
    expect(T.NO_WRITE.filter(n => n.why === 'already-practised').map(n => n.seed)).toEqual([636, 645, 648, 649, 655]);
  });
  it('the live rule check refuses a phrase with a word the learner has not met', () => {
    const r = { ...T.REHOMES[0], known: 'हाँ, यह बिल्कुल अच्छा विचार है।', target: "yes that's a good idea" };
    expect(T.liveRuleCheck(r, PRIOR.filter(l => l.seed_number < 189)).problems).toEqual(['189: Hindi word "बिल्कुल" is not in any earlier LEGO']);
  });
});
