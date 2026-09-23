/**
 * All-review seeds: re-home, never pad (Kai's ruling 2026-09-23 19:40Z, job #932·H).
 *
 * The one test that proves the fix: the OLD rescue keyed its "newest word" lookup on extractVocab(), which returns
 * the whole normalised string, so for a real all-review seed ("Yes that's a good idea", pieces हाँ→yes and
 * यह अच्छा विचार है→that's a good idea) it found NO host and wrote nothing. The new rule tiles the sentence with
 * earlier LEGO pairs and homes it under the latest-taught piece. Offline: no DB; the LEGOs below are the live
 * eng_for_hin rows as of 2026-09-23.
 *
 * Run: npx vitest run services/course-builder/lib/all-review-seed
 */
import { describe, it, expect } from 'vitest';

const R = require('./all-review-seed.cjs');
const { extractVocab } = require('./text-normalization.cjs');

const L = (seed_number, lego_index, known_text, target_text) => ({ seed_number, lego_index, lego_id: `S${String(seed_number).padStart(4, '0')}L${String(lego_index).padStart(2, '0')}`, known_text, target_text });
const PRIOR = [
  L(10, 3, 'मुझे यक़ीन नहीं है कि', "I'm not sure if"),
  L(47, 1, 'मुझे लगता है कि', 'I think that'),
  L(62, 1, 'मैं आपकी मदद कर सकता हूँ', 'I can help you'),
  L(68, 1, 'आप क्या ढूँढ़ रहे हैं', 'what are you looking for'),
  L(97, 1, 'हाँ', 'yes'),
  L(123, 2, 'यह अच्छा विचार है', "that's a good idea"),
  L(156, 1, 'क्या आप जाना चाहते हैं', 'do you want to go'),
  L(177, 1, 'जाना', 'to go'),
  L(2, 1, 'सीखना', 'to learn'),
  L(20, 3, 'आप चाहते हैं', 'you want'),
  L(35, 1, 'वह चाहती है', 'she wants'),          // a feminine form met early (the live course has ~8 such LEGOs before 650)
  L(525, 2, 'आप पूरा कर पाए या नहीं', 'you were able to finish'),
  L(639, 2, 'सर', 'sir'),
  L(642, 2, 'मैडम', 'madam'),
  L(658, 1, 'क्या आप सब चाहते हैं', 'do you all want'),
];
const before = (n) => PRIOR.filter(l => l.seed_number < n);

/** The pre-fix lookup, verbatim in shape: newest LEGO that "introduced" a seed word, keyed on extractVocab(). */
function oldRescueHost(seedTarget, priorLegos) {
  const wordIntroducedBy = {};
  for (const l of priorLegos) for (const w of extractVocab(l.target_text, false)) if (!wordIntroducedBy[w]) wordIntroducedBy[w] = l;
  let best = null;
  for (const w of extractVocab(seedTarget, false)) { const i = wordIntroducedBy[w]; if (i && (!best || i.seed_number > best.seed_number)) best = i; }
  return best;
}

describe('all-review seed: re-home under the LEGO that completes its coverage', () => {
  it('pre-fix: the old rescue finds no host for seed 189 "Yes that\'s a good idea" (fails); the rule finds S0123L02 (passes)', () => {
    const seed = { known_text: 'हाँ, यह अच्छा विचार है।', target_text: "Yes that's a good idea." };
    expect(oldRescueHost(seed.target_text, before(189))).toBeNull();
    const f = R.findRehomeHost(seed, before(189));
    expect(f.host.lego_id).toBe('S0123L02');
    expect(f.coverage).toBe('both');
    expect(f.tiling.map(l => l.lego_id)).toEqual(['S0097L01', 'S0123L02']);
    expect(f.hostIsLastPiece).toBe(true);
  });

  it('the host is the LAST-taught piece, not the biggest: seed 665 goes under S0658L01, not S0177L01 "to go"', () => {
    const f = R.findRehomeHost({ known_text: 'क्या आप सब जाना चाहते हैं?', target_text: 'Do you all want to go?' }, before(665));
    expect(f.host.lego_id).toBe('S0658L01');
    expect(R.phraseContainsLego(f.host, { known: 'क्या आप सब जाना चाहते हैं?', target: 'Do you all want to go?' })).toBe(true);
  });

  it('the Hindi may carry a previously-met form the tiling does not supply verbatim (या नहीं, feminine चाहती): coverage "english"', () => {
    const s654 = { known_text: 'मुझे यक़ीन नहीं है कि मैं आपकी मदद कर सकता हूँ या नहीं, सर।', target_text: "I'm not sure if I can help you, sir." };
    const f = R.findRehomeHost(s654, before(654));
    expect(f.host.lego_id).toBe('S0639L02');
    expect(f.coverage).toBe('english');
    expect(f.knownSide.missing).toEqual(['या', 'नहीं']);
    const s650 = { known_text: 'क्या आप जाना चाहती हैं, मैडम?', target_text: 'Do you want to go madam?' };
    const g = R.findRehomeHost(s650, before(650));
    expect(g.host.lego_id).toBe('S0642L02');
    expect(g.tiling.map(l => l.lego_id)).toEqual(['S0156L01', 'S0642L02']);
  });

  it('a seed whose English no earlier LEGOs tile is NOT covered: nothing to re-home, say so', () => {
    const f = R.findRehomeHost({ known_text: 'क्या आपको और सीखना है?', target_text: 'Have you got more to learn?' }, before(75));
    expect(f.host).toBeNull();
    expect(f.reason).toMatch(/teaches something new/);
  });

  it('a Hindi word no earlier LEGO gave the learner is NOT covered either', () => {
    const prior = [L(1, 1, 'हाँ', 'yes'), L(2, 1, 'यह अच्छा विचार है', "that's a good idea")];
    const f = R.findRehomeHost({ known_text: 'हाँ, यह बिल्कुल अच्छा विचार है।', target_text: "yes that's a good idea" }, prior);
    expect(f.host).toBeNull();
    expect(f.reason).toMatch(/बिल्कुल/);
  });
});

describe('padded blocks: a "new" LEGO glued from taught pairs is not new', () => {
  it('demotes the only non-duplicate LEGO of a seed when both sides tile from earlier pairs', () => {
    const legos = [{ idx: 1, known: 'हाँ', target: 'yes' }, { idx: 2, known: 'मुझे लगता है कि यह अच्छा विचार है', target: "I think that that's a good idea" }];
    const dups = new Set(['S0300L01']);
    const out = R.paddedBlocksToDemote(legos.map(l => ({ ...l, seed_number: 300 })), dups, before(300));
    expect(out).toEqual([{ lego_id: 'S0300L02', pieces: ['S0047L01', 'S0123L02'] }]);
  });
  it('keeps a block whose words are all taught but whose PIECES are not (175 "what do you want to do"), and 549 "have got to"', () => {
    expect(R.paddedBlockPieces({ known: 'आप क्या करना चाहते हैं', target: 'what do you want to do' }, before(175))).toBeNull();
    expect(R.paddedBlockPieces({ known: 'मुझे चुप रहना है', target: 'I have got to be quiet' }, before(549))).toBeNull();
  });
  it('never demotes when the seed has another new LEGO — the block is then a cut question, not padding', () => {
    const legos = [{ idx: 1, known: 'नया शब्द', target: 'brand-new' }, { idx: 2, known: 'हाँ यह अच्छा विचार है', target: "yes that's a good idea" }].map(l => ({ ...l, seed_number: 300 }));
    expect(R.paddedBlocksToDemote(legos, new Set(), before(300))).toEqual([]);
  });
});

describe('the row and the never-twice rule', () => {
  it('the same English is never practised twice, punctuation and case aside', () => {
    expect(R.alreadyPractised("Yes that's a good idea.", ['yes that’s a good idea', 'other'])).toBe('yes that’s a good idea');
    expect(R.alreadyPractised('do you want to go madam?', ['do you want to go'])).toBeNull();
  });
  it('the re-homed sentence is one more use phrase at the end of the host basket, tagged with its source seed', () => {
    const host = PRIOR.find(l => l.lego_id === 'S0123L02');
    const row = R.seedSentenceRow({ course_code: 'eng_for_hin', seed_number: 189, known_text: 'हाँ, यह अच्छा विचार है।', target_text: "yes that's a good idea", host,
      existingPhrases: [{ position: 1, phrase_role: 'build' }, { position: 2, phrase_role: 'build' }, { position: 3, phrase_role: 'build' }, { position: 4, phrase_role: 'use' }, { position: 5, phrase_role: 'use' }], eventId: 'ev' });
    expect(row).toMatchObject({ id: 'eng_for_hin:S0123L02U03', seed_number: 123, lego_index: 2, position: 6, phrase_role: 'use', metadata: { source: 'seed_sentence', source_seed: 189 }, last_edit_event_id: 'ev' });
  });
});
