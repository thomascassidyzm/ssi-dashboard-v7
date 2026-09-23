// The one test that proves Check 10 reads Italian (job #834, 2026-09-23).
//
// Calibration case: the ita_for_eng sapere/conoscere pass of 2026-09-10
// (tools/ita-know-sense-split-2026-09-10.cjs). Before it, S0370L01's BUILD rows
// prompted a bare "I knew" for "conoscevo" while S0375L01 teaches "I knew" =
// "sapevo": one known prompt, two target answers. The pass renamed the prompts
// to "I used to know". The rows below are the live ones as read 2026-09-23 and
// the `from` sides recorded in content_edit_events for that pass — not invented.
//
// Against the pre-fix picture the check MUST flag "i knew"; against the post-fix
// picture it MUST NOT; and a nonsense control proves the flag is the rows'
// doing, not the harness's. The check's rules are deliberately unchanged
// (Kai: the ZUT checker is good enough, do not widen it).
import { describe, it, expect } from 'vitest';
const { auditRows, applyOverlay } = require('./audit-phrase-zut.cjs');

const LEGOS = [
  { id: 'ita_for_eng:S0370L01', known_text: 'I used to know', target_text: 'conoscevo', seed_number: 370 },
  { id: 'ita_for_eng:S0375L01', known_text: 'I knew', target_text: 'sapevo', seed_number: 375 },
  { id: 'ita_for_eng:S0375L02', known_text: 'the answer', target_text: 'la risposta', seed_number: 375 },
];
const PHRASES_LIVE = [
  { id: 'ita_for_eng:S0370L01B01', known_text: 'I used to know', target_text: 'conoscevo', seed_number: 370, phrase_role: 'build' },
  { id: 'ita_for_eng:S0370L01B02', known_text: 'that I used to know', target_text: 'che conoscevo', seed_number: 370, phrase_role: 'build' },
  { id: 'ita_for_eng:S0375L01B01', known_text: 'I knew the answer', target_text: 'sapevo la risposta', seed_number: 375, phrase_role: 'build' },
  { id: 'ita_for_eng:S0375L01C01', known_text: 'knew', target_text: 'sapevo', seed_number: 375, phrase_role: 'component' },
  { id: 'ita_for_eng:S0375L01C02', known_text: 'the', target_text: '', seed_number: 375, phrase_role: 'component' },
];
const SEEDS = [{ seed_number: 375, target_text: 'Sapevo la risposta.' }];
// content_edit_events.detail for tools:ita-know-sense-split-2026-09-10, the two rows that matter here
const PRE_FIX_OVERLAY = { changes: [
  { id: 'ita_for_eng:S0370L01B01', known_from: 'I knew', known_to: 'I used to know', target_from: null, target_to: null },
  { id: 'ita_for_eng:S0370L01B02', known_from: 'that I knew', known_to: 'that I used to know', target_from: null, target_to: null },
] };

const strictKnowns = r => r.bidirectional.violationsStrict.map(v => v.known_norm);

describe('Check 10 on the sapere/conoscere calibration case', () => {
  it('flags "I knew" → conoscevo / sapevo on the pre-fix rows', () => {
    const { phrases, applied } = applyOverlay(PHRASES_LIVE, PRE_FIX_OVERLAY);
    expect(applied).toBe(2);
    const r = auditRows({ legos: LEGOS, phrases, seeds: SEEDS });
    expect(strictKnowns(r)).toEqual(['i knew']);
    const hit = r.bidirectional.violationsStrict[0];
    expect(hit.distinct_targets.map(t => t.target_norm).sort()).toEqual(['conoscevo', 'sapevo']);
  });

  it('is clean on the post-fix (live) rows', () => {
    const r = auditRows({ legos: LEGOS, phrases: PHRASES_LIVE, seeds: SEEDS });
    expect(strictKnowns(r)).toEqual([]);
  });

  it('nonsense control: a made-up known collides with nothing', () => {
    const phrases = [...PHRASES_LIVE, { id: 'x', known_text: 'zzq wibble', target_text: 'frob', seed_number: 1, phrase_role: 'build' }];
    const r = auditRows({ legos: LEGOS, phrases, seeds: SEEDS });
    expect(strictKnowns(r)).toEqual([]);
    // ...and the same made-up known with two targets DOES collide, so the harness can see
    phrases.push({ id: 'y', known_text: 'zzq wibble', target_text: 'frobnicate', seed_number: 2, phrase_role: 'build' });
    expect(strictKnowns(auditRows({ legos: LEGOS, phrases, seeds: SEEDS }))).toEqual(['zzq wibble']);
  });

  it('prints its coverage: every row read is scanned, skipped, or exempt', () => {
    const r = auditRows({ legos: LEGOS, phrases: PHRASES_LIVE, seeds: SEEDS });
    const c = r.coverage;
    expect(c.legosRead + c.phrasesRead).toBe(8);
    expect(c.rowsScanned + c.skippedEmptySide).toBe(8);
    expect(c.skippedEmptySide).toBe(1);        // the empty-target component
    expect(c.componentRows).toBe(1);           // exempt on the known side by ruling
    expect(c.knownSideRows).toBe(6);
  });

  it('component rows are exempt on the known side but must sit inside their seed', () => {
    const phrases = [...PHRASES_LIVE, { id: 'c', known_text: 'I knew', target_text: 'conoscevo', seed_number: 375, phrase_role: 'component' }];
    const r = auditRows({ legos: LEGOS, phrases, seeds: SEEDS });
    expect(strictKnowns(r)).toEqual([]);                       // known-side exempt
    expect(r.membershipFailures.map(f => f.target)).toEqual(['conoscevo']); // not in seed 375's sentence
  });
});
