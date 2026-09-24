// The one test that proves the change (Kai, job #20·I, 2026-09-24): an eng_for_hin introduction line passes only when it
// quotes its LEGO's current known_text byte-for-byte AND does not end in the machine template's dangling "में :".
// Pre-fix: the live shapes (a stale-chunk intro, a right-chunk intro with the defect tail, the old template rendered
// through presentation-author) all FAIL lineProblems. Post-fix: the same LEGOs rendered through the corrected template
// pass, in Frame A, Frame B, the gendered both-forms line and the human-authored line whose tail follows. Offline: no DB.
import { describe, it, expect } from 'vitest';
const T = require('./eng-for-hin-reauthor-intros-2026-09-24.cjs');
const { renderIntro, introChunk } = require('../../services/phases/presentation-author.cjs');

const OLD = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :";
const NEW = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — है :";
const L = 'अंग्रेज़ी';
const row = (o) => ({ human: false, chunkForms: null, seed: null, ...o });

describe('eng_for_hin intros mirror their LEGOs and end in "is:"', () => {
  it('pre-fix: the live shapes fail', () => {
    // S0041L01 "but" presented 'बात करना' (stale chunk) — the #833·F specimen
    expect(T.lineProblems(row({ known_text: 'लेकिन', frame: 'B', seed: 'x', text: "अंग्रेज़ी में — 'बात करना' — जैसे — 'मैं किसी और के साथ बात करना की कोशिश करने वाला हूँ।' — में :" }), introChunk))
      .toEqual(expect.arrayContaining([expect.stringContaining("quotes 'बात करना' not 'लेकिन'"), expect.stringContaining('defect')]));
    // right chunk, defect tail — the 239 "mirror" rows
    expect(T.lineProblems(row({ known_text: 'जल्द ही', frame: 'A', text: "अंग्रेज़ी में — 'जल्द ही' — में :" }), introChunk)).toEqual(['ends in the defect "में :"']);
    // the old template rendered through the shared renderer still ends in the defect
    const oldA = renderIntro({ frame: 'A', template: OLD, targetLangName: L, chunk: 'लेकिन', seed: '' });
    expect(T.DEFECT_TAIL.test(oldA)).toBe(true);
  });

  it('post-fix: the corrected template renders lines that pass, in every frame', () => {
    const a = renderIntro({ frame: 'A', template: NEW, targetLangName: L, chunk: 'लेकिन', seed: '' });
    expect(a).toBe("अंग्रेज़ी में — 'लेकिन' — है :");
    expect(T.lineProblems(row({ known_text: 'लेकिन', frame: 'A', text: a }), introChunk)).toEqual([]);

    const seed = 'मैं कल आपसे कुछ पूछना चाहता था।';
    const b = renderIntro({ frame: 'B', template: NEW, targetLangName: L, chunk: 'कल', seed });
    expect(b).toBe(`अंग्रेज़ी में — 'कल' — जैसे — '${seed}' — है :`);
    expect(T.lineProblems(row({ known_text: 'कल', frame: 'B', seed, text: b }), introChunk)).toEqual([]);
    expect(T.isKalFamily('कल')).toBe(true);
    expect(T.isKalFamily('कल रात के मुक़ाबले')).toBe(true);
    expect(T.isKalFamily('कलम')).toBe(false);

    const chunkForms = { f: 'मैं चाहती हूँ', m: 'मैं चाहता हूँ' };
    const g = renderIntro({ frame: 'A', template: NEW, targetLangName: L, chunk: chunkForms.f, seed: '', chunkForms, knownLang: 'hin' });
    expect(g).toBe("अंग्रेज़ी में — 'मैं चाहती हूँ' या 'मैं चाहता हूँ' — है :");
    expect(T.quotedChunk(g)).toBe('मैं चाहती हूँ');   // the female form is the LEGO's known_text, quoted first
    expect(T.lineProblems(row({ known_text: chunkForms.f, frame: 'A', chunkForms, text: g }), introChunk)).toEqual([]);
  });

  it("a human-authored line keeps Kai's sentences byte-for-byte; only the ordinary bare tail follows the template", () => {
    const explanation = "अंग्रेज़ी में 'उसका नाम' कहने का तरीक़ा थोड़ा बदल जाता है, इस हिसाब से कि आप किसी आदमी के बारे में बात कर रहे हैं या किसी औरत के बारे में। दोनों तरीक़े सिखाने के लिए, महिला आवाज़ एक औरत के बारे में बात करेगी और पुरुष आवाज़ एक आदमी के बारे में। ";
    const mark = explanation + "अंग्रेज़ी में — 'उसका नाम' — में :";
    const oldBare = renderIntro({ frame: 'A', template: OLD, targetLangName: L, chunk: 'उसका नाम', seed: '' });
    const newBare = renderIntro({ frame: 'A', template: NEW, targetLangName: L, chunk: 'उसका नाम', seed: '' });
    const out = T.humanLineWithNewTail(mark, oldBare, newBare);
    expect(out).toBe(explanation + "अंग्रेज़ी में — 'उसका नाम' — है :");
    expect(out.startsWith(explanation)).toBe(true);
    expect(T.lineProblems(row({ known_text: 'उसका नाम', frame: 'human', human: true, text: out }), introChunk)).toEqual([]);
    // already followed → unchanged; a line with some other ending is left alone (null), never rewritten
    expect(T.humanLineWithNewTail(out, oldBare, newBare)).toBe(out);
    expect(T.humanLineWithNewTail(explanation + 'कुछ और।', oldBare, newBare)).toBeNull();
  });

  it('an earlier intro decides the frame it keeps', () => {
    expect(T.priorFrame("अंग्रेज़ी में — 'कल' — जैसे — 'x' — में :")).toBe('B');
    expect(T.priorFrame("अंग्रेज़ी में — 'जल्द ही' — में :")).toBe('A');
  });
});
