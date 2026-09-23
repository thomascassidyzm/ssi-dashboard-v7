// Proves the tighten (job #914·H, after Astra #918·H): the three "from" lines are exactly what the never-lego tool wrote
// (pre-fix state), each "to" line contains कभी नहीं / never on both sides with matched counts, none duplicates the basket,
// and the basket after still drills never in 6+ English frames. Offline: no DB.
import { describe, it, expect } from 'vitest';
const T = require('./eng-for-hin-seed-490-never-drill-tighten-2026-09-23.cjs');
const N = require('./eng-for-hin-seed-490-never-lego-2026-09-23.cjs');
describe('S0490L01 never drill tightened', () => {
  it('the pre-fix lines are the ones Astra failed/odd-ed, and are in the applied basket', () => {
    expect(T.FIXES.map(f => f.id.split(':')[1])).toEqual(['S0490L01B03', 'S0490L01U04', 'S0490L01U05']);
    for (const f of T.FIXES) expect([...N.NEVER_BUILD, ...N.NEVER_USE].some(p => p.known === f.from.known)).toBe(true);
    expect(T.FIXES[2].from.known).toMatch(/^मैंने कहा था कि/); // the reported-speech line that failed
  });
  it('the replacements pass the offline rules and keep the drill', () => {
    const { problems, after } = T.offlineCheck();
    expect(problems).toEqual([]);
    expect(N.neverFrames(after).size).toBeGreaterThanOrEqual(6);
    expect(after.some(p => /^मैंने कहा था कि/.test(p.known))).toBe(false);
    expect(T.FIXES[0].to.known).toBe('मैं वहाँ कभी नहीं गया हूँ');
  });
});
