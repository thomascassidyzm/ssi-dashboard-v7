// Proves the Astra #935·H fix: the "from" line is the one the 651/653 tool wrote (pre-fix), the "to" line drops the
// demonstrative, keeps the English, and still contains the LEGO on both sides. Offline: no DB.
import { describe, it, expect } from 'vitest';
const T = require('./eng-for-hin-seed-651-film-tighten-2026-09-23.cjs');
describe('S0651L01B03 film tighten', () => {
  it('drops उस, keeps the English, passes the offline rules', () => {
    expect(T.FIX.from.known).toMatch(/^उस फ़िल्म/); expect(T.FIX.to.known).toBe('फ़िल्म के बारे में आपका क्या ख़्याल है?');
    expect(T.FIX.to.target).toBe(T.FIX.from.target); expect(T.offlineCheck()).toEqual([]);
  });
});
