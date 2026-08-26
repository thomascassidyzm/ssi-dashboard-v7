// Spanish language pack.
// NOTE ON \b: JavaScript's word boundary is ASCII-only, so /\bmandó\b/ never
// matches — the boundary after "ó" does not exist. Every pattern here is
// anchored on literal spaces instead; `tenses` is handed a space-padded string.
const CONNECTIVES = new Set([
  'y', 'e', 'pero', 'porque', 'así', 'entonces', 'si', 'cuando', 'mientras',
  'aunque', 'antes', 'después', 'hasta', 'desde', 'que', 'quien', 'cual',
  'o', 'u', 'como', 'donde', 'siempre',
]);

const W = '[a-záéíóúüñ]';
const IRREG = {
  FUT: / (será|seré|serán|serás|seremos|habrá|haré|harás|hará|haremos|harán|tendré|tendrá|tendrás|tendremos|podré|podrá|podrás|querré|vendrá|diré|dirá|saldrá|pondré|pondrá) /,
  COND: / (sería|serían|serías|seríamos|habría|haría|harías|haríamos|harían|tendría|tendrías|tendríamos|podría|podrías|podríamos|podrían|querría|vendría|diría|gustaría|gustarían|debería|deberías|deberíamos|deberían) /,
  PAST: / (fui|fue|fuiste|fuimos|fueron|era|eras|éramos|eran|estaba|estabas|estábamos|estaban|estuve|estuvo|tuve|tuvo|tuviste|tenía|tenías|teníamos|tenían|hice|hizo|hiciste|hacía|dije|dijo|dijiste|decía|vi|vio|viste|veía|iba|ibas|íbamos|iban|quise|quiso|quería|querías|queríamos|querían|pude|pudo|podía|podías|podíamos|podían|supe|supo|sabía|sabías|sabían|conocí|conoció|vine|vino|di|dio|puse|puso|quedaba|había|habías|habíamos|habían) /,
};

function tenses(toks) {
  const s = new Set();
  const j = ' ' + toks.join(' ') + ' ';
  if (/ (voy|vas|va|vamos|van) a /.test(j)) s.add('PROSP');
  if (new RegExp(` (he|has|ha|hemos|han) ${W}+(ado|ido|cho|sto|to|so) `).test(j)) s.add('PERF');
  if (new RegExp(` (había|habías|habíamos|habían) ${W}+(ado|ido|cho|sto|to|so) `).test(j)) s.add('PLUP');
  // conditional is tested before future: -ría must not be read as -rá
  // -emos is dropped from the future pattern: "queremos"/"podemos" are present.
  if (IRREG.COND.test(j) || (new RegExp(` ${W}+[aei]r(ía|ías|íamos|ían) `).test(j) && !IRREG.PAST.test(j))) s.add('COND');
  if (IRREG.FUT.test(j) || new RegExp(` ${W}+[aei]r(é|ás|á|án) `).test(j)) s.add('FUT');
  if (IRREG.PAST.test(j) ||
      new RegExp(` ${W}+(aba|abas|ábamos|aban) `).test(j) ||
      new RegExp(` ${W}+(é|ó|aste|asteis|aron|í|ió|iste|isteis|ieron) `).test(j)) s.add('PAST');
  return s;
}
// -amos/-imos are the same in the present and the preterite (hablamos, vivimos).
// A row whose only past evidence would be one of these is not evidence either way.
const AMBIGUOUS_PAST = new RegExp(` ${W}+(amos|imos) `);
module.exports = { CONNECTIVES, tenses, ambiguousPast: toks => AMBIGUOUS_PAST.test(' ' + toks.join(' ') + ' '), code: 'spa' };
