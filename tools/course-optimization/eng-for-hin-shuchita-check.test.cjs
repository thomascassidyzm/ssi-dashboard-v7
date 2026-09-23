// The test that proves the substitute for Shuchita's eye (job #891·H, Kai, 2026-09-23).
//
// Calibration on a known positive: every deterministic rule must FLAG the line she was shown
// ("before", from the pre-redo snapshot) on the seed she ruled on, and PASS the line she wrote
// ("after", from her redo note). Seen to fail with the rules' check() bodies emptied (every
// `beforeFlagged` drops to 0) and to pass with them in place.
import { describe, it, expect } from 'vitest';
const { RULES, runDeterministic } = require('./eng-for-hin-shuchita-rulebook.cjs');
const { calibrate, normaliseInput, parseJudgeReply, crossSeedContext, judgePrompt } = require('./eng-for-hin-shuchita-check.cjs');

const det = RULES.filter(r => r.kind === 'deterministic');

describe('the published counts', () => {
  it('is 32 deterministic + 6 judged rules (the #891 page said 33; corrected by #900·H)', () => {
    expect(det).toHaveLength(32);
    expect(RULES.filter(r => r.kind === 'judged')).toHaveLength(6);
    expect(RULES).toHaveLength(38);
  });
});

describe('her own before/after pairs (474 lines from 221 redo notes)', () => {
  const rep = calibrate();
  it('flags at least a fifth of the lines she corrected on pattern alone; the rest are judged rules', () => {
    expect(rep.pairs).toBeGreaterThan(400);
    expect(rep.beforeCoveragePct).toBeGreaterThanOrEqual(20);
  });
  // Seen to fail (job #900·H) with the four note-fragment pairs un-marked in the fixture: H-SUBJECT-PRONOUN
  // flagged "and CPM सकता हूँ" and H-FRAMES flagged "later CMP में → on should be one phrase बाद में" —
  // her shorthand notes mis-aligned as lines, which the earlier ≤-before tolerance let through.
  for (const r of rep.rules) {
    it(`${r.rule} never contradicts her: no after-line it flags${r.rule === 'H-NUKTA' ? ' (except her un-dotted यकीन)' : ''}`, () => {
      expect(r.afterFlagged).toBe(r.rule === 'H-NUKTA' ? r.afterFlagged : 0);
    });
  }
  it('exactly the four note fragments are excluded, and they are named in the fixture', () => {
    expect(rep.excludedNoteFragments).toBe(4);
    expect(rep.pairs).toBe(470);
  });
  it('H-NUKTA false positives are only her own un-dotted typing of यकीन (the seed-99 ruling wins)', () => {
    const n = rep.rules.find(r => r.rule === 'H-NUKTA');
    expect(n.afterFlagged).toBeGreaterThan(0);
    expect(n.afterFalse.every(f => /यकीन/.test(f.known))).toBe(true);
  });
});

describe('each rule on its own precedent — before flagged, after clean', () => {
  const cases = [
    ['H-NUKTA', { known: 'मुझे यकीन नहीं है कि आपको ख़ुद से पूछना चाहिए।', target: "I'm not sure if you should ask yourself" }, { known: 'मुझे यक़ीन नहीं है कि आपको ख़ुद से पूछना चाहिए।', target: "I'm not sure if you should ask yourself" }],
    ['H-KE-BAJAY', { known: 'बोलने की बजाय सुनना', target: 'to listen instead of speaking' }, { known: 'बोलने के बजाय सुनना', target: 'to listen instead of speaking' }],
    ['H-ALREADY', { known: 'वे पहले जानते हैं', target: 'they already know' }, { known: 'वे पहले ही जानते हैं', target: 'they already know' }],
    ['H-A-QUESTION', { known: 'मैं सवाल पूछना चाहता हूँ', target: 'I want to ask a question' }, { known: 'मैं एक सवाल पूछना चाहता हूँ', target: 'I want to ask a question' }],
    ['H-SUBJECT-PRONOUN', { known: 'कोशिश कर रहा हूँ', target: "I'm trying" }, { known: 'मैं कोशिश कर रहा हूँ', target: "I'm trying" }],
    ['H-SUBJECT-PRONOUN', { known: 'जल्दी तैयार हो जाएँगे', target: "they'll be ready quickly" }, { known: 'वे जल्दी तैयार हो जाएँगे', target: "they'll be ready quickly" }],
    ['H-SIR-MADAM-AGREEMENT', { known: 'आप बहुत अच्छा कर रहे हैं, मैडम।', target: "you're doing very well madam" }, { known: 'आप बहुत अच्छा कर रही हैं, मैडम।', target: "you're doing very well madam" }],
    ['H-ADDRESS-WORDS', { known: 'मैं आपकी मदद कर सकता हूँ, श्रीमान।', target: 'I can help you sir' }, { known: 'मैं आपकी मदद कर सकता हूँ, सर।', target: 'I can help you sir' }],
    ['H-TOLD', { known: 'हम बात कर रहे थे कि मुझे किसने सुनाई।', target: 'we were talking about who told me' }, { known: 'हम बात कर रहे थे कि मुझे किसने बताया।', target: 'we were talking about who told me' }],
    ['H-SAME-TIME', { known: 'मैं एक साथ आपकी मदद कर सकता हूँ', target: 'I can help you at the same time' }, { known: 'मैं साथ के साथ आपकी मदद कर सकता हूँ', target: 'I can help you at the same time' }],
    ['H-ANYTHING', { known: 'वह कुछ भी नहीं पढ़ना चाहती', target: "she doesn't want to read something" }, { known: 'वह कुछ नहीं पढ़ना चाहती', target: "she doesn't want to read anything" }],
    ['H-EMBEDDED-TENSE', { known: 'मुझे नहीं पता वह क्या कर रही है।', target: "I don't know what she was doing" }, { known: 'मुझे नहीं पता वह क्या कर रही है।', target: "I don't know what she is doing" }],
    ['H-OBLIQUE-PLURAL', { known: 'मुझे सभी जवाब का पता लगाना है।', target: 'I have to find out all the answers' }, { known: 'मुझे सभी जवाबों का पता लगाना है।', target: 'I have to find out all the answers' }],
    ['H-OBLIQUE-PLURAL', { known: 'मैं तीन सबसे अहम तथ्यों जानना चाहता हूँ।', target: 'I want to find out the three most important facts' }, { known: 'मैं तीन सबसे अहम तथ्य जानना चाहता हूँ।', target: 'I want to find out the three most important facts' }],
    ['H-FEM-AGREEMENT', { known: 'मैंने उसे कहानी बताया था।', target: 'I told him the story' }, { known: 'मैंने उसे कहानी बताई थी।', target: 'I told him the story' }],
    ['H-THAT-IS-WHY', { known: 'इसीलिए नहीं', target: "that isn't why" }, { known: 'इसलिए नहीं', target: "that isn't why" }],
    ['H-USED-TO-ALWAYS', { known: 'वह हमेशा ज़ोर देती थी कि', target: 'she used to insist that' }, { known: 'वह ज़ोर देती थी कि', target: 'she used to insist that' }],
    ['H-KOI-KISI', { known: 'क्या आप किसी ज़्यादा गर्म जगह लेना चाहेंगे?', target: 'do you want somewhere warmer?' }, { known: 'क्या आप कोई ज़्यादा गर्म जगह लेना चाहेंगे?', target: 'do you want somewhere warmer?' }],
    ['H-MOVE-HEAD', { known: 'जब मैं अपना सिर करता हूँ', target: 'when I move my head' }, { known: 'जब मैं अपना सिर हिलाता हूँ', target: 'when I move my head' }],
    ['H-NOT-SURE', { known: 'मुझे पक्का नहीं पता कि कल क्या होगा।', target: "I'm not sure what's going to happen tomorrow" }, { known: 'मुझे यक़ीन नहीं है कि कल क्या होगा।', target: "I'm not sure what's going to happen tomorrow" }],
    ['H-FRAMES', { known: 'मुझे लगता है कि अब जाने का समय है।', target: "I feel as if it's time to go" }, { known: 'मुझे लग रहा है कि अब जाने का समय है।', target: "I feel as if it's time to go" }],
    ['E-TOO-LATE', { known: 'बहुत रात हो चुकी है', target: "it's so late" }, { known: 'बहुत रात हो चुकी है', target: "it's too late" }],
    ['E-EXPLAIN-TO', { known: 'मैं आपको अंग्रेज़ी में समझाना चाहता हूँ।', target: 'I want to explain in English with you' }, { known: 'मैं आपको अंग्रेज़ी में समझाना चाहता हूँ।', target: 'I want to explain in English to you' }],
    ['E-BECOMES-INTERESTING', { known: 'जब हम सीखते हैं तो यह दिलचस्प हो जाता है', target: "when we learn it's interesting" }, { known: 'जब हम सीखते हैं तो यह दिलचस्प हो जाता है', target: 'when we learn it becomes interesting' }],
    ['E-READY-NOW', { known: 'मैं तैयार हूँ', target: "I'll be ready" }, { known: 'मैं तैयार हूँ', target: "I'm ready" }],
    ['E-THAT-IT-WOULD', { known: 'कि यह बहुत अच्छा विचार होगा', target: 'that would be a very good idea' }, { known: 'कि यह बहुत अच्छा विचार होगा', target: 'that it would be a very good idea' }],
    ['E-SEEM-IT', { known: 'मैं नहीं चाहता कि ऐसा लगे कि वह ख़ुश है', target: "I don't want to seem as though he's happy" }, { known: 'मैं नहीं चाहता कि ऐसा लगे कि वह ख़ुश है', target: "I don't want it to seem as though he's happy" }],
    ['E-LONG-TIME-SINCE', { known: 'बहुत समय हो गया', target: "it's a long time since" }, { known: 'बहुत समय हो गया', target: "it's a long time" }],
    ['E-WHEN-WE-MEET', { known: 'हमारे मिलने पर मुझे देर हो जाएगी।', target: "I'm going to be late" }, { known: 'हमारे मिलने पर मुझे देर हो जाएगी।', target: "I'm going to be late when we meet" }],
    ['E-MONEY', { known: 'ज़्यादा से ज़्यादा राशि जुटाना', target: 'to raise as much as possible' }, { known: 'ज़्यादा से ज़्यादा राशि जुटाना', target: 'to raise as much money as possible' }],
    ['E-THOSE', { known: 'वे लोग टेलीविज़न देखना पसंद करते हैं।', target: 'people like watching television' }, { known: 'वे लोग टेलीविज़न देखना पसंद करते हैं।', target: 'those people like watching television' }],
    ['E-SUCH-A-SHOP', { known: 'मैं ऐसी दुकान ढूँढ़ रहा हूँ', target: "I'm looking for a shop" }, { known: 'मैं ऐसी दुकान ढूँढ़ रहा हूँ', target: "I'm looking for such a shop" }],
    ['E-ASK-IT', { known: 'उन्हें यह पूछने की ज़रूरत नहीं है', target: "they don't need to ask" }, { known: 'उन्हें यह पूछने की ज़रूरत नहीं है', target: "they don't need to ask it" }],
    ['E-SO-WELL', { known: 'आप इतना अच्छा कर रहे हैं', target: "you're doing so well" }, { known: 'आप बहुत अच्छा कर रहे हैं', target: "you're doing so well" }],
  ];
  for (const [id, before, after] of cases) {
    it(`${id}: flags "${before.known} → ${before.target}"`, () => {
      expect(runDeterministic({ ...before, role: 'phrase' }, { only: [id] }).map(h => h.rule)).toContain(id);
    });
    it(`${id}: passes her "${after.known} → ${after.target}"`, () => {
      expect(runDeterministic({ ...after, role: 'phrase' }, { only: [id] })).toEqual([]);
    });
  }
  it('every deterministic rule has at least one precedent-driven case above', () => {
    const covered = new Set(cases.map(c => c[0]));
    for (const r of det) expect(covered.has(r.id), r.id).toBe(true);
  });
});

describe('the ambiguities she left are reported, never auto-fixed', () => {
  it('उन लोगों against plain "people" (seed 286, her own line) is not a hit', () => {
    expect(runDeterministic({ known: 'क्या आप उन लोगों को जानते हैं?', target: 'do you know people?', role: 'phrase' }, { only: ['E-THOSE'] })).toEqual([]);
  });
  it('कृपया is not flagged (she wrote it six times at seed 414 after Phase 1 had removed it)', () => {
    expect(runDeterministic({ known: 'क्या हमें कृपया एक कहानी मिल सकती है?', target: 'could we have a story please?', role: 'phrase' })).toEqual([]);
  });
  it('विचार करना is not flagged (she wrote it herself at seed 98)', () => {
    expect(runDeterministic({ known: 'मुझे यक़ीन नहीं है कि मुझे खेलने पर विचार करना चाहिए।', target: "I'm not sure if I should consider playing", role: 'phrase' })).toEqual([]);
  });
  it('a component row may be a bare verb (she split "I can" into मैं + सकता हूँ at seed 10)', () => {
    expect(runDeterministic({ known: 'सकता हूँ', target: 'can', role: 'component' }, { only: ['H-SUBJECT-PRONOUN'] })).toEqual([]);
  });
  it('flag-severity rules carry no proposed text where her precedent was a choice for Kai', () => {
    const hits = runDeterministic({ known: 'वह हमेशा ज़ोर देती थी कि', target: 'she used to insist that', role: 'phrase' }, { only: ['H-USED-TO-ALWAYS'] });
    expect(hits[0].severity).toBe('flag');
    expect(hits[0].proposed).toBeNull();
  });
});

describe('batch input (the 92-cut LEGO batch and the gendered phrase design)', () => {
  it('accepts {legos, phrases} and bare arrays in the DB column names', () => {
    const rows = normaliseInput({ legos: [{ seed_number: 489, lego_id: 'S0489L01', known_text: 'एक कड़क कॉफ़ी', target_text: 'a strong cup of coffee' }], phrases: [{ seed: 489, id: 'x', phrase_role: 'use', known: 'मुझे यकीन है', target: "I'm sure" }] });
    expect(rows).toHaveLength(2);
    expect(rows[1].role).toBe('use');
    expect(runDeterministic(rows[1]).map(h => h.rule)).toContain('H-NUKTA');
  });
});

describe('the judged pass: silence is not approval (job #900·H, after Astra\'s cold verify)', () => {
  // Seen to fail on the #891 code, where `j.hits || []` read {} as a clean seed.
  it('an empty {} reply is an error, not a clean seed', () => {
    expect(parseJudgeReply(348, '{}').error).toMatch(/no "hits" array/);
  });
  it('prose with no JSON, truncated JSON, and hits of the wrong shape are errors', () => {
    expect(parseJudgeReply(1, 'The seed looks fine to me.').error).toMatch(/no JSON/);
    expect(parseJudgeReply(1, '{"hits":[{"id":"x"').error).toBeDefined();
    expect(parseJudgeReply(1, '{"hits":"none"}').error).toBeDefined();
    expect(parseJudgeReply(1, '{"hits":null}').error).toBeDefined();
  });
  it('only {"hits":[…]} is a verdict; an empty array is clean', () => {
    expect(parseJudgeReply(1, 'Here you go:\n{"hits":[]}')).toEqual({ seed: 1, hits: [] });
    expect(parseJudgeReply(1, '{"hits":[{"id":"S0348L02","rule":"J-FIDELITY","message":"m","proposed":null,"confidence":"high"}]}').hits).toHaveLength(1);
  });
});

describe('the judged pass sees other seeds (seed 348 vs seed 201)', () => {
  const seed348 = [
    { seed: 348, id: 'S0348L02', role: 'lego', known: 'क्या होने वाला है', target: 'what was going to happen' },
    { seed: 348, id: 'eng_for_hin:S0348L02B01', role: 'build', known: 'मुझे नहीं पता क्या होने वाला है', target: "I didn't know what was going to happen" },
  ];
  const course = [
    ...seed348,
    { seed: 201, id: 'S0201L03', role: 'lego', known: 'क्या होने वाला है', target: 'what is going to happen' },
    { seed: 201, id: 'eng_for_hin:S0201L03U02', role: 'use', known: 'मुझे यक़ीन नहीं है कि क्या होने वाला है।', target: "I'm not sure what is going to happen" },
    { seed: 12, id: 'eng_for_hin:S0012L01C01', role: 'component', known: 'क्या होने वाला है', target: 'what is going to happen' },
    { seed: 400, id: 'S0400L01', role: 'lego', known: 'क्या होगा', target: 'what was going to happen' },
  ];
  // Seen to fail on the #891 code: judgeSeed took the seed's rows only, so nothing outside seed 348 reached the judge.
  it('same Hindi with a different English elsewhere is surfaced as a fidelity clash, ignoring punctuation and case', () => {
    const ctx = crossSeedContext(seed348, course);
    const clash = ctx.filter(c => c.kind === 'same-hindi-different-english');
    expect(clash.map(c => c.id)).toEqual(['S0201L03']);
    expect(clash[0].seed).toBe(201);
  });
  it('same English under different Hindi elsewhere is shown too, but labelled as allowed', () => {
    const ctx = crossSeedContext(seed348, course);
    expect(ctx.filter(c => c.kind === 'same-english-different-hindi').map(c => c.id)).toEqual(['S0400L01']);
    expect(judgePrompt(348, seed348, ctx)).toMatch(/ELSEWHERE IN THE COURSE[\s\S]*seed 201 S0201L03 \[same-hindi-different-english\] क्या होने वाला है → what is going to happen/);
  });
  it('the seed\'s own rows and component rows never count as context', () => {
    expect(crossSeedContext(seed348, course).some(c => c.seed === 348 || c.role === 'component')).toBe(false);
  });
  it('the prompt says so when there is nothing elsewhere', () => {
    expect(judgePrompt(5, seed348.slice(0, 1), [])).toMatch(/no other seed shares/);
  });
});
