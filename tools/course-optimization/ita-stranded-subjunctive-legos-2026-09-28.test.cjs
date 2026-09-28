/**
 * Job #520 — stranded subjunctive LEGOs in ita_for_eng (Kai's ruling, 2026-09-28).
 * Run: npx vitest run tools/course-optimization/ita-stranded-subjunctive-legos-2026-09-28
 *
 * The detector names seed 115's "fossi pronto" on the live pre-fix rows and is silent once
 * the spec is applied; the projected LEGO carries its trigger and its gloss matches.
 */
import { describe, it, expect } from 'vitest';
import { SEEDS, project, findStrandedSubjunctives } from './ita-stranded-subjunctive-legos-2026-09-28.cjs';

// Live rows read 2026-09-28, exactly as the tool's guard expects them.
const seeds = [
  { seed_number: 115, target_text: 'non mi sento come se fossi pronto a fare una conversazione' },
  { seed_number: 114, target_text: 'mi sento come se stessi andando peggio oggi di ieri' },
  { seed_number: 90, target_text: 'se puoi parlare più lentamente, sarebbe fantastico' },
];
const legos = [
  { seed_number: 115, lego_index: 1, lego_id: 'S0115L01', known_text: "I'm ready", target_text: 'fossi pronto', components: [] },
  { seed_number: 115, lego_index: 2, lego_id: 'S0115L02', known_text: 'to have a conversation', target_text: 'a fare una conversazione', components: [] },
  { seed_number: 114, lego_index: 1, lego_id: 'S0114L01', known_text: "I'm doing", target_text: 'stessi andando', components: [] },
  { seed_number: 114, lego_index: 2, lego_id: 'S0114L02', known_text: 'worse', target_text: 'peggio', components: null },
  { seed_number: 114, lego_index: 3, lego_id: 'S0114L03', known_text: 'as if', target_text: 'come se', components: [] },
  { seed_number: 90, lego_index: 2, lego_id: 'S0090L02', known_text: 'that would be great', target_text: 'sarebbe fantastico', components: null },
];

describe('the sweep names the specimen before the fix and is silent after', () => {
  it('pre-fix: S0115L01 "fossi pronto" and S0114L01 "stessi andando" are stranded; the conditional is reported, not a hit', () => {
    const r = findStrandedSubjunctives(seeds, legos);
    expect(r.read).toBe(legos.length);
    expect(r.hits.map(h => h.legoId).sort()).toEqual(['S0114L01', 'S0115L01']);
    expect(r.conditionals.map(h => h.legoId)).toEqual(['S0090L02']);
  });

  it('post-fix: the projected LEGOs carry their trigger, and nothing is stranded', () => {
    const only = SEEDS.filter(S => [114, 115].includes(S.seed));
    const spec = { seeds, legos, phrases: [] };
    // project() reads the module's SEEDS; restrict it to the two fixture seeds by filtering afterwards.
    const proj = project(spec, only);
    const l115 = proj.legos.find(l => l.lego_id === 'S0115L01');
    expect(l115.target_text).toBe('come se fossi pronto');
    expect(l115.known_text).toBe('as if I were ready');
    expect(proj.legos.find(l => l.lego_id === 'S0114L03')).toBeUndefined(); // merged into S0114L01
    expect(proj.legos.find(l => l.lego_id === 'S0114L01').target_text).toBe('come se stessi andando');
    expect(findStrandedSubjunctives(seeds, proj.legos).hits).toEqual([]);
  });
});
