// The one test that proves the fix (job #181·I, 2026-09-25): every row in the table carries a named defect BEFORE
// (a phrase without its LEGO, "कि तो मैं", a जो-clause without its correlative, a prompt that drops "lucky enough",
// stranded सुरक्षित, English that is not English, क्यों for "Why not?", a seed without its LEGO) and NONE after; the
// gender-aware transform reproduces the table on both the male and the female side so the pair rows move with the
// phrases; and the rewrite is idempotent. Offline: no DB.
import { describe, it, expect } from 'vitest';
const T = require('./eng-for-hin-final-checks-fix-2026-09-25.cjs');

describe('eng_for_hin final checks fix', () => {
  it('pre-fix: every one of the rows carries a defect', () => {
    const d = T.defects(T.oldRows());
    expect(d.length).toBeGreaterThanOrEqual(T.oldRows().length);
    for (const r of T.oldRows()) expect(d.some(x => x.startsWith(r.id + ':'))).toBe(true);
  });
  it('post-fix: no defect remains and every phrase contains its LEGO', () => {
    expect(T.defects(T.newRows())).toEqual([]);
    for (const r of T.newRows()) if (r.lego) expect(r.known).toContain(r.lego);
  });
  it('the transform reproduces the table and is idempotent on both gender forms', () => {
    for (const p of T.PHRASES) { expect(T.transformKnown(p.known)).toBe(p.newKnown); expect(T.transformKnown(p.newKnown)).toBe(p.newKnown); }
    for (const s of T.SEEDS) expect(T.transformKnown(s.known)).toBe(s.newKnown);
    // male twins of the female rows move the same way
    expect(T.transformKnown('मैं अफ़्रीका जा सका लेकिन मेरे पास काफ़ी पैसे नहीं थे।')).toBe('मैं भाग्यशाली था कि अफ़्रीका जा सका लेकिन मेरे पास काफ़ी पैसे नहीं थे।');
    expect(T.transformKnown('मैं सुरक्षित आपको वापस कॉल करूँगा।')).toBe('मैं वहाँ सुरक्षित पहुँच जाऊँगा।');
    expect(T.transformKnown('मैं आपका इंतज़ार नहीं करूँगा। क्यों?')).toBe('मैं आपका इंतज़ार नहीं करूँगा। क्यों नहीं?');
    expect(T.transformKnown('मैं किसी से मिला जिसने कुछ कहा था।')).toBe('मैं किसी से मिला था जिसने कुछ कहा था।');
    expect(T.transformKnown('जो मैं कहना चाहता था मुझे याद नहीं आ रहा')).toBe('जो मैं कहना चाहता था वह मुझे याद नहीं आ रहा');
  });
  it('rows this tool must not touch are untouched by the transform', () => {
    for (const k of ['मैं ज़्यादा से ज़्यादा बार बात करना चाहती हूँ।', 'मुझे इसे दीवार के पार फेंकने दें', 'मैं मेरी चाबियाँ ढूँढ़ना चाहती हूँ।', 'हम कल नहीं चाहती थीं कि कोई कहानी सुने।']) expect(T.transformKnown(k)).toBe(k);
  });
});
