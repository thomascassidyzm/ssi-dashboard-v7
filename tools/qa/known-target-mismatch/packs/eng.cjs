// English language pack. Used on whichever SIDE of the course is English.
const CONNECTIVES = new Set([
  'and', 'but', 'because', 'so', 'if', 'when', 'while', 'although', 'though',
  'before', 'after', 'until', 'unless', 'since', 'that', 'which', 'who', 'whether',
  'or', 'as', 'whenever', 'wherever'
]);

// Coarse tense/mood classes. Deliberately coarse: we compare CLASSES across the
// two sides, never surface forms, so a class we cannot read is better absent.
function tenses(toks) {
  const s = new Set();
  const j = ' ' + toks.join(' ') + ' ';
  if (/ (will|i'll|we'll|you'll|he'll|she'll|they'll|shall|won't) /.test(j)) s.add('FUT');
  if (/ going to /.test(j)) s.add('PROSP');
  if (/ (would|i'd|we'd|you'd|he'd|she'd|they'd|wouldn't) /.test(j)) s.add('COND');
  if (/ had (been|had|got|gone|done|said|seen|made|learned|learnt|left|told|taken|written|forgotten|finished|started|wanted|thought|been)\b/.test(j) ||
      /\bhad \w+ed\b/.test(j)) s.add('PLUP');
  if (/\b(have|has|'ve|'s) (been|had|got|gone|done|said|seen|made|taken|written|forgotten|finished|learnt|learned|told|left|spoken|heard)\b/.test(j) ||
      /\b(have|has|'ve|i've|you've|we've|they've) \w+ed\b/.test(j) ||
      / (i've|you've|we've|they've) /.test(j) || / (haven't|hasn't) /.test(j)) s.add('PERF');
  if (/\b(did|didn|was|were|went|said|told|saw|made|took|came|gave|wanted|thought|knew|met|sent|heard|began|started|asked|worked|talked|spoke)\b/.test(j) ||
      / didn t /.test(j)) s.add('PAST');
  return s;
}
module.exports = { CONNECTIVES, tenses, code: 'eng' };
