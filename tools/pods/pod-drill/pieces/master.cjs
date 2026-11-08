// THE ONE CUT MASTER (job #577, Tom r-2026-11-07-ssi-pod-drill-cuts-one-canonical: "they should be - ideally across
// all languages - else we are going to have to start making multiple pod recordings, depending on where the cuts are").
// _eng-shared/split.txt is FROZEN: one line per English turn, both English texts (15- and 22-scene pods), pieces
// split by " || ". It folds in the 11 cuts every X_for_eng course that split the line had made (job #577).
// The rule, enforced by check.cjs and wire-staging.cjs alike: a course's ENGLISH pieces for a turn are exactly the
// master's pieces, or joins of neighbouring master pieces. A course may never add a cut or reword the English.
// Every join is listed in the plan with a reason: plan.joins[turnId] = "why", or a whole turn's own "whole" reason.
// The English side is the KNOWN side of an X_for_eng course and the TARGET side of an eng_for_X course.
const fs = require('fs'), path = require('path');
const letters = (t) => String(t || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '');
const squash = (t) => String(t || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
// Keyed by letters; one key can hold several written forms (an em dash and a hyphen version of one line), and the
// form whose text matches the live line wins.
const MASTER = new Map();
const addLine = (ps) => { const k = letters(ps.join('')); MASTER.set(k, [...(MASTER.get(k) || []), ps]); };
// Lines that name the learner's own language ("I'm learning English") are ONE line with the language as a slot: an
// X_for_eng course says the target language there (job #577), with the same cuts.
const LANGUAGE_NAMES = ['Brazilian Portuguese', 'Arabic', 'German', 'French', 'Italian', 'Spanish', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Mandarin', 'Welsh', 'Bengali', 'Gujarati', 'Hindi', 'Punjabi', 'Sinhala', 'Tamil', 'Urdu'];
for (const line of fs.readFileSync(path.join(require('./paths.cjs').DATA, '_eng-shared/split.txt'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const ps = line.split(' || ').map((p) => p.trim());
  addLine(ps);
  if (/\bEnglish\b/.test(line)) for (const name of LANGUAGE_NAMES) addLine(ps.map((p) => p.replace(/\bEnglish\b/g, name)));
}
const englishSide = (course) => (course.startsWith('eng_for_') ? 0 : 1);

/** The master pieces for a turn's live English text, or null. */
const masterFor = (english) => {
  const forms = MASTER.get(letters(english))
  if (!forms) return null
  return forms.find((ps) => squash(ps.join(' ')) === squash(english)) || forms[0]
};

/**
 * Check one plan turn against the master. `english` is the turn's live English text.
 * Returns { red: [...], joins: n } — red names every added cut, reworded English, or unlisted join.
 */
function checkTurn(course, plan, turn, english) {
  const red = [];
  const m = masterFor(english);
  if (!m) return { red: [`${turn.id}: English "${english}" is not a line of the master split.txt`], joins: 0 };
  if (turn.whole) return { red, joins: m.length > 1 ? 1 : 0 }; // a whole turn is the join of all its pieces, its reason given
  const eng = turn.pieces.map((p) => p[englishSide(course)]);
  if (letters(eng.join('')) !== letters(m.join(''))) return { red: [`${turn.id}: English pieces are reworded, not the master's\n    master: ${m.join(' || ')}\n    plan:   ${eng.join(' || ')}`], joins: 0 };
  let at = 0, joined = 0;
  for (const piece of eng) {
    let acc = '', n = 0;
    while (at < m.length && letters(acc).length < letters(piece).length) { acc += (acc ? ' ' : '') + m[at++]; n++; }
    if (letters(acc) !== letters(piece)) {
      red.push(`${turn.id}: the plan cuts "${piece}" where the master does not\n    master: ${m.join(' || ')}\n    plan:   ${eng.join(' || ')}`);
      return { red, joins: joined };
    }
    if (squash(acc) !== squash(piece)) red.push(`${turn.id}: "${piece}" is worded differently from the master's "${acc}"`);
    if (n > 1) joined++;
  }
  if (joined && !(plan.joins && plan.joins[turn.id])) red.push(`${turn.id}: joins ${joined} master cut(s) with no reason in plan.joins\n    master: ${m.join(' || ')}\n    plan:   ${eng.join(' || ')}`);
  return { red, joins: joined };
}

module.exports = { MASTER, masterFor, checkTurn, englishSide, letters };
