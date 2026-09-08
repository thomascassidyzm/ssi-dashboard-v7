// French language pack.
//
// NOTE ON \b: JavaScript's word boundary is ASCII-only, so /\bétait\b/ is
// unreliable around accented letters. Every pattern here is anchored on
// literal spaces instead; `tenses` is handed a space-padded string.
//
// TWO FRENCH FACTS THIS PACK ENCODES, because they are what makes the
// English/French tense comparison honest rather than noisy:
//
// 1. The passé composé IS the ordinary French past. English "I worked" ->
//    "j'ai travaillé" is correct, not a defect. So every PERF reading also
//    adds PAST, which switches off the detector's "known past, target has no
//    past form" conflict for the whole compound-perfect family. The Spanish
//    pack needs an anchored-past exception for the same territory; French
//    does not, because there is nothing to except.
// 2. French says several English PAST/PERFECT meanings with a PRESENT verb,
//    and those are correct too: "depuis" ("je travaille ici depuis deux ans"
//    = I have been working here for two years) and the recent past "venir de"
//    ("je viens de finir" = I have just finished). Both are declared
//    ambiguousPast, so a present-tense target carrying either is not scored.
//
// The endings below are deliberately narrower than the full paradigm. French
// -er verbs whose stem ends in r (entrer, montrer, rentrer) make the naive
// future/conditional/imparfait endings collide with the present and the
// imparfait: "nous entrons" is not a future, "j'entrais" is not a
// conditional, " questions " is not an imparfait. Where a paradigm slot
// cannot be read without that collision it is dropped and the irregulars are
// listed by hand, because a missed tense costs one recall and a false tense
// costs the reader's trust in the whole list.

const CONNECTIVES = new Set([
  'et', 'mais', 'parce', 'car', 'donc', 'alors', 'si', 'quand', 'lorsque',
  'pendant', 'bien', 'quoique', 'avant', 'après', 'jusqu', 'depuis',
  'que', 'qui', 'quoi', 'dont', 'où', 'ou', 'comme', 'puisque', 'tandis',
]);

const W = "[a-zàâäçéèêëîïôöùûüÿœæ']";

// Words that end in -ais/-ait/-ions/-iez but are not an imparfait.
// Every one of these was found in the fra_for_eng corpus itself.
const NOT_IMPARFAIT = new Set([
  'mais', 'jamais', 'français', 'française', 'anglais', 'anglaise', 'irlandais',
  'frais', 'désormais', 'vais', 'sais', 'sait', 'fait', 'faits', 'lait',
  'parfait', 'parfaite', 'plaît', 'vrais', 'essais', 'quais', 'délais',
  'attrait', 'souhait', 'extrait', 'portrait', 'trait', 'lais', 'biais',
  'satisfait', 'refait', 'défait', 'malfait', 'balais', 'palais', 'relais',
  'tais', 'distrait', 'endroit', 'droit',
  // present tense forms that happen to end -ais / -ait / -aient
  'fais', 'connais', 'parais', 'plais', 'sais', 'vais',
  'essaient', 'paient', 'envoient', 'emploient', 'croient', 'voient',
  'nettoient', 'ennuient', 'appuient', 'essuient', 'aboient', 'assoient',
]);

// Auxiliary forms, present (-> passé composé) and imparfait (-> plus-que-parfait).
// AVOIR and ÊTRE are split because they do not license the same participle.
// Avoir + anything participle-shaped is a perfect; être + a participle-shaped
// word usually is NOT — "je suis fatigué" is an adjective, not a past. Only
// the closed set of être-verbs (and the reflexives) form a perfect with être,
// so ÊTRE is restricted to that set. This single split removed the largest
// false-positive class in the pack's calibration on fra_for_eng.
const AUX_PRES_AVOIR = new Set(['ai','as','a','avons','avez','ont']);
const AUX_IMPF_AVOIR = new Set(['avais','avait','avions','aviez','avaient']);
const AUX_PRES_ETRE = new Set(['suis','es','est','sommes','êtes','sont']);
const AUX_IMPF_ETRE = new Set(['étais','était','étions','étiez','étaient']);
// conditionnel passé: "j'aurais fait" answers English "I would have done",
// which the English pack reads as COND + PERF + PAST. Without this the whole
// third-conditional family reads as a bare conditional and every one of them
// fires a spurious past conflict.
const AUX_COND_AVOIR = new Set(['aurais','aurait','aurions','auriez','auraient']);
const AUX_COND_ETRE = new Set(['serais','serait','serions','seriez','seraient']);
const ETRE_PART = new Set([
  'allé','allée','allés','allées','venu','venue','venus','venues','revenu','revenue','revenus','devenu','devenue',
  'parti','partie','partis','parties','sorti','sortie','sortis','sorties','resté','restée','restés','restées',
  'rentré','rentrée','rentrés','arrivé','arrivée','arrivés','arrivées','entré','entrée','entrés','monté','montée',
  'descendu','descendue','tombé','tombée','tombés','né','née','nés','mort','morte','morts','retourné','retournée','passé','passés','passée',
]);
// Only these may sit between the auxiliary and the participle. Anything else
// means the "participle" is really a noun: "j'ai une idée" is not a perfect.
// Anything else means the "participle" is really a noun.
// The inverted subject pronouns are here because the shared tokeniser strips
// the hyphen: "as-tu dit" arrives as "as tu dit", and without "tu" on this
// list every inversion question in the course read as a present tense.
const AUX_INFIX = new Set([
  'pas', 'jamais', 'déjà', 'bien', 'toujours', 'beaucoup', 'vraiment', 'enfin', 'encore', 'presque',
  'souvent', 'tout', 'tous', 'toutes', 'seulement', 'peut', 'trop', 'même', 'aussi', 'peu', 'plus',
  'ne', 'y', 'en', 'me', 'te', 'se', 'nous', 'vous', "l'", 'le', 'la', 'les', 'lui', 'leur',
  'je', 'tu', 'il', 'elle', 'ils', 'elles', 'on', 't',
]);
// Irregular past participles, listed rather than derived: no ending rule can
// separate "dit" from "petit" or "pris" from "français".
const PART_IRREG = new Set([
  'fait','faite','faits','dit','dite','pris','prise','mis','mise','vu','vue','vus','su','pu','voulu','dû','eu','eue','été',
  'allé','allée','allés','allées','venu','venue','venus','tenu','connu','cru','lu','écrit','écrite','ouvert','ouverte',
  'offert','compris','comprise','appris','apprise','mort','morte','né','née','assis','permis','promis','répondu',
  'entendu','entendue','attendu','attendue','perdu','perdue','vendu','rendu','descendu','bu','couru','reçu','aperçu',
  'senti','parti','partie','sorti','sortie','dormi','fini','finie','choisi','réussi','servi','suivi','ri','souri','suffi',
  'conduit','produit','construit','traduit','détruit','peint','atteint','craint','joint','remis','soumis','transmis',
  'décrit','inscrit','vécu','plu','rentré','resté',
]);
// -é/-ée/-és words that are NOT participles in this course's French.
const NOT_PART_E = new Set([
  'café','thé','idée','idées','clé','clés','télé','santé','qualité','difficulté','université','beauté','société',
  'journée','journées','année','années','soirée','soirées','matinée','armée','marée','purée','musée','lycée',
  'côté','côtés','moitié','pitié','amitié','vérité','liberté','réalité','activité','quantité','priorité','café',
]);
// -i is only tested in a position that already has an auxiliary in front of
// it, which is what makes it safe enough to allow beyond the irregular list.
const NOT_PART_I = new Set([
  'aussi', 'ainsi', 'parmi', 'merci', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
  'midi', 'demi', 'ennui', 'celui', 'oui', 'ici', 'lui', 'aujourd', 'minuit', 'gentil', 'voici', 'voilà',
]);
const NOT_PART_U = new Set(['menu', 'tissu', 'issu', 'aperçu'].filter(x => x === 'menu' || x === 'tissu'));
function isParticiple(t) {
  if (PART_IRREG.has(t)) return true;
  if (NOT_PART_E.has(t) || NOT_PART_I.has(t)) return false;
  if (t.length >= 5 && /i$/.test(t)) return true;
  if (t.length >= 4 && /u$/.test(t) && !NOT_PART_U.has(t)) return true;
  return t.length >= 4 && /(é|és|ée|ées)$/.test(t);
}
// aux + (at most two permitted infix words) + participle
function hasCompound(toks, auxSet, partTest, raw) {
  for (let i = 0; i < toks.length; i++) {
    if (!auxSet.has(toks[i])) continue;
    // "il s'est battu" — the reflexive pronoun is elided onto the auxiliary
    // ("s'est"), so it is invisible after de-elision. Read it off the raw token.
    const r = (raw && raw[i]) || '';
    const prev = (raw && raw[i - 1]) || '';
    const reflexive = /^(m|t|s)'/.test(r) || ['me', 'te', 'se', 'nous', 'vous'].includes(prev);
    for (let j = i + 1; j <= i + 3 && j < toks.length; j++) {
      if (partTest(toks[j]) || (reflexive && isParticiple(toks[j]))) return true;
      if (!AUX_INFIX.has(toks[j])) break;
    }
  }
  return false;
}

// Imparfait forms that end -rais/-rait/-raient and are therefore NOT conditionals.
const IMPF_RER = new Set([
  'entrais','entrait','entraient','montrais','montrait','montraient','rentrais','rentrait','rentraient',
  'préparais','préparait','préparaient','réparait','tirais','tirait','tiraient','courais','courait','couraient',
  'mourais','mourait','mouraient','ouvrais','ouvrait','ouvraient','offrais','offrait','offraient',
  'souffrais','souffrait','espérais','espérait','préférais','préférait','considérait','adorais','adorait',
  'séparait','pleurait','durait','serrait','opérait','attirait','retirait','inspirait','désirait','admirait',
  // the nous/vous imparfait of the same verbs ends -rions/-riez, which the
  // conditional rule would otherwise swallow: "nous n'espérions pas" is a past.
  'espérions','espériez','espérais','espérait','espéraient','entrions','entriez','montrions','montriez',
  'préparions','prépariez','courions','couriez','ouvrions','ouvriez','offrions','offriez','préférions','préfériez',
  'adorions','adoriez','tirions','tiriez','rentrions','rentriez','séparions','pleurions','durions','serrions',
]);

const IRREG = {
  // Futures that are not caught by the narrow ending patterns below.
  FUT: / (serons|serez|aurons|aurez|ferons|ferez|irons|irez|pourrons|pourrez|voudrons|voudrez|devrons|devrez|saurons|saurez|viendrons|viendrez|verrons|verrez|enverrons|enverrez) /,
  // Conditionals whose stem is irregular, so -erais/-irais never fires.
  COND: / (serais|serait|serions|seriez|seraient|aurais|aurait|aurions|auriez|auraient|ferais|ferait|ferions|feriez|feraient|pourrais|pourrait|pourrions|pourriez|pourraient|voudrais|voudrait|voudrions|voudriez|voudraient|devrais|devrait|devrions|devriez|devraient|saurais|saurait|sauraient|viendrais|viendrait|viendraient|verrais|verrait|verraient|faudrait|vaudrait|irions|iriez) /,
  // Imparfait forms whose ending is on the NOT_IMPARFAIT list or otherwise
  // unreadable, plus the very common irregular stems.
  PAST: / (étais|était|étions|étiez|étaient|avais|avait|avions|aviez|avaient|faisais|faisait|faisions|faisiez|faisaient|disais|disait|disaient|allais|allait|allaient|savais|savait|savaient|voulais|voulait|voulaient|pouvais|pouvait|pouvaient|devais|devait|devaient|fallait|venais|venait|venaient|prenais|prenait|prenaient|voyais|voyait|voyaient|croyais|croyait|croyaient|connaissais|connaissait|connaissaient|mettais|mettait|buvais|buvait|écrivais|écrivait|lisais|lisait|vivais|vivait|dormais|dormait|sortais|sortait|partais|partait|attendais|attendait|entendais|entendait|répondais|répondait|perdais|perdait|vendais|vendait|voulions|vouliez|pouvions|pouviez|devions|deviez|faisions|faisiez|allions|alliez|savions|saviez|venions|veniez|prenions|preniez|disions|disiez|entrais|entrait|entraient|montrais|montrait|montraient|rentrais|rentrait|préparais|préparait|réparait|tirais|tirait|courais|courait|couraient|mourait|ouvrais|ouvrait|offrait|souffrait|espérais|espérait|préférais|préférait|considérait|adorais|adorait|séparait|pleurait|durait|serrait|opérait) /,
};

// The shared tokeniser does not split elision, so "j'ai" arrives as ONE token
// and every auxiliary test that matches on a whole word silently misses it.
// That bug made the pack blind to the passé composé in the first person —
// the single commonest past in the course — so elision is stripped here.
// Only the real elidable prefixes are stripped: "aujourd'hui" and "quelqu'un"
// must survive intact.
const ELIDABLE = new Set(['j', 'l', 'd', 'c', 'n', 'm', 't', 's', 'qu', 'jusqu', 'lorsqu', 'puisqu']);
function deelide(t) {
  const i = t.indexOf("'");
  if (i <= 0 || i === t.length - 1) return t;
  return ELIDABLE.has(t.slice(0, i)) ? t.slice(i + 1) : t;
}

function tenses(rawToks) {
  const toks = rawToks.map(deelide).filter(Boolean);
  const s = new Set();
  const j = ' ' + toks.join(' ') + ' ';

  // aller + infinitive
  // "je vais VOUS aider", "on va EN parler", "je NE vais PAS avoir l'air ..."
  if (/ (vais|vas|va|allons|allez|vont) ((ne|pas|plus|y|en|me|te|se|le|la|les|lui|leur|nous|vous) )*[a-zà-ÿ']+(er|ir|re|oir) /.test(j)) s.add('PROSP');

  // compound perfect and pluperfect
  const etrePart = t => ETRE_PART.has(t);
  if (hasCompound(toks, AUX_IMPF_AVOIR, isParticiple, rawToks) || hasCompound(toks, AUX_IMPF_ETRE, etrePart, rawToks)) { s.add('PLUP'); s.add('PAST'); }
  if (hasCompound(toks, AUX_PRES_AVOIR, isParticiple, rawToks) || hasCompound(toks, AUX_PRES_ETRE, etrePart, rawToks)) { s.add('PERF'); s.add('PAST'); }
  if (hasCompound(toks, AUX_COND_AVOIR, isParticiple, rawToks) || hasCompound(toks, AUX_COND_ETRE, etrePart, rawToks)) { s.add('COND'); s.add('PERF'); s.add('PAST'); }

  // conditional BEFORE future: -rais must not be read as -ra
  // Every French conditional stem ends in -r, so -rais/-rait/-raient IS the
  // conditional — except for the imparfait of verbs whose own stem ends in r
  // (entrer, montrer, courir...). Those are listed, because no ending rule
  // can tell "rendrait" (conditional) from "montrait" (imparfait).
  if (IRREG.COND.test(j) || toks.some(t => /(rais|rait|raient|rions|riez)$/.test(t) && t.length >= 6 && !IMPF_RER.has(t))) s.add('COND');

  // future: only the paradigm slots that cannot collide with the present
  if (IRREG.FUT.test(j) ||
      / [a-zà-ÿ']*(erai|eras|era|eront|erons|erez|irai|iras|ira|iront|irons|irez|rrai|rras|rra|rront) /.test(j)) s.add('FUT');

  // imparfait: -ais/-ait/-aient once the non-verbs are removed, and
  // -ions/-iez only after nous/vous, because " questions " is a noun.
  if (IRREG.PAST.test(j)) s.add('PAST');
  else {
    for (const t of toks) {
      if (NOT_IMPARFAIT.has(t)) continue;
      if (/(ais|ait|aient)$/.test(t) && t.length >= 5 && !/(rais|rait|raient)$/.test(t)) { s.add('PAST'); break; }
    }
    // "nous ne voulions pas", "si vous le vouliez" — nous/vous is not adjacent
    // to its verb. A determiner in front means the -ions word is a plural noun
    // ("des questions"), which is the only thing this relaxation could catch.
    const DET = new Set(['les', 'des', 'ces', 'mes', 'tes', 'ses', 'nos', 'vos', 'leurs', 'quelques', 'plusieurs', 'certaines', 'deux', 'trois']);
    if (toks.includes('nous') || toks.includes('vous')) {
      for (let i = 0; i < toks.length; i++) {
        if (!/(ions|iez)$/.test(toks[i]) || toks[i].length < 6) continue;
        if (i > 0 && DET.has(toks[i - 1])) continue;
        if (/(rions|riez)$/.test(toks[i]) && !IMPF_RER.has(toks[i])) continue; // conditional, handled above
        s.add('PAST'); break;
      }
    }
  }
  return s;
}

// French renders two English past/perfect meanings with a PRESENT verb, and
// both are correct: duration with "depuis"/"ça fait ... que", and the recent
// past "venir de". A present-tense target carrying either is not a conflict.
function ambiguousPast(rawToks) {
  const j = ' ' + rawToks.map(deelide).join(' ') + ' ';
  return / depuis /.test(j) || / ça fait /.test(j) ||
         / (viens|vient|venons|venez|viennent) de /.test(j);
}

module.exports = { CONNECTIVES, tenses, ambiguousPast, code: 'fra' };
