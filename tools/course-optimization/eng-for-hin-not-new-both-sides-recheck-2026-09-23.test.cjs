// The one test that proves the fix (job #875·F, 2026-09-23). Kai's rule: a LEGO is a duplicate
// only if BOTH its Hindi and its English match an earlier LEGO. This morning's sweep matched on
// English alone (`englishOnly` below is that pre-fix rule) and it calls S0240L02 a duplicate of
// S0019L02; the both-sides rule does not. Seed 41 is the control: same Hindi both times, so both
// rules agree it is a duplicate.
import { describe, it, expect } from 'vitest';
const { isDuplicateLego, findMismatchedNotNew, RESTORE } = require('./eng-for-hin-not-new-both-sides-recheck-2026-09-23.cjs');

const L = (lego_id, known_text, target_text, is_new = true) => ({
  lego_id, seed_number: +lego_id.slice(1, 5), lego_index: +lego_id.slice(6, 8), known_text, target_text, is_new,
});
const S0019L01 = L('S0019L01', 'लेकिन', 'but');
const S0019L02 = L('S0019L02', 'बात करना बंद करना', 'to stop talking');
const S0041L01 = L('S0041L01', 'लेकिन', 'but', false);
const S0240L02 = L('S0240L02', 'बोलना बंद करना', 'to stop talking', false);
const earlier = [S0019L01, S0019L02];

// The pre-fix rule, as #833 applied it: same English earlier ⇒ duplicate.
const englishOnly = (lego, all) => all.some(e => e.is_new && e.seed_number < lego.seed_number && e.target_text === lego.target_text);

describe('eng_for_hin: duplicate only when BOTH Hindi and English match', () => {
  it('the pre-fix English-only rule wrongly calls S0240L02 a duplicate (fails the ruling)', () => {
    expect(englishOnly(S0240L02, earlier)).toBe(true);
  });
  it('the both-sides rule keeps S0240L02 new: same English, different Hindi', () => {
    expect(isDuplicateLego(S0240L02, earlier)).toBe(false);
  });
  it('S0041L01 "but" is a duplicate under both rules: same Hindi, same English', () => {
    expect(englishOnly(S0041L01, earlier)).toBe(true);
    expect(isDuplicateLego(S0041L01, earlier)).toBe(true);
  });
  it('a twin must come EARLIER, and must itself be new', () => {
    expect(isDuplicateLego(S0019L02, [S0240L02])).toBe(false);
    expect(isDuplicateLego(L('S0300L01', 'लेकिन', 'but', false), [L('S0041L01', 'लेकिन', 'but', false)])).toBe(false);
  });
  it('matching ignores case and surrounding whitespace, not spelling', () => {
    expect(isDuplicateLego(L('S0050L01', ' लेकिन ', 'But', false), earlier)).toBe(true);
    expect(isDuplicateLego(L('S0654L01', 'मुझे यकीन नहीं है कि', "I'm not sure if", false), [L('S0010L03', 'मुझे यक़ीन नहीं है कि', "I'm not sure if")])).toBe(false);
  });
  it('the sweep lists S0240L02 with its same-English twin, and not S0041L01', () => {
    const out = findMismatchedNotNew([...earlier, S0041L01, S0240L02]);
    expect(out.map(m => m.lego_id)).toEqual(['S0240L02']);
    expect(out[0].earlier_same_english).toEqual([{ lego_id: 'S0019L02', known_text: 'बात करना बंद करना' }]);
  });
  it('the restore targets exactly the pair the ruling names', () => {
    expect(RESTORE).toMatchObject({ lego_id: 'S0240L02', twin: 'S0019L02', known: 'बोलना बंद करना', twin_known: 'बात करना बंद करना' });
  });
});
