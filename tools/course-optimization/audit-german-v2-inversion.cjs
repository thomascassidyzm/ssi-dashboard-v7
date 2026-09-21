#!/usr/bin/env node
/**
 * READ-ONLY audit: German verb-second (V2) inversion vs the Zero-Uncertainty Test.
 *
 * Tom's case (2026-09-21): the course teaches "ich will" for "I want". A learner who owns
 * "ich will" and "jetzt" cannot predict "jetzt will ich" — fronting anything other than the
 * subject forces the finite verb in front of the subject. If the course never hands the
 * learner that inverted order as its own chunk, every phrase that uses it is composed from
 * something the learner was never given.
 *
 * What counts as a hit (both halves must hold):
 *   SYNTACTIC  — a MAIN clause whose first constituent is not the subject, with the finite
 *                verb immediately followed by a subject pronoun: [X] [Vfin] [ich|du|er|...].
 *                Questions ("Willst du…", clause-initial verb) and verb-final subordinate
 *                clauses ("…dass ich…") are not this class and are excluded.
 *   CURRICULAR — no LEGO at or before that point in the course carries the inverted order,
 *                so the learner is expected to derive it rather than having been handed it.
 *
 * Writes nothing. Prints a report; --json <path> for the full row dump.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COURSE = process.env.COURSE || 'deu_for_eng';

// --- lexicon -------------------------------------------------------------
// Subject pronouns that can sit immediately after a fronted finite verb.
const SUBJ = new Set(['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'man']);

// Subordinating conjunctions / relative+interrogative openers. A clause opening with one of
// these is verb-final (or a question), never V2-inverted, so it is not our class.
const SUBORD = new Set([
  'dass', 'wenn', 'weil', 'ob', 'als', 'bevor', 'nachdem', 'während', 'obwohl', 'damit',
  'seit', 'seitdem', 'solange', 'sobald', 'bis', 'falls', 'wie', 'wo', 'wohin', 'woher',
  'was', 'wer', 'wen', 'wem', 'wessen', 'warum', 'wann', 'weshalb', 'wieso', 'worüber',
  'wonach', 'woran', 'wofür', 'womit', 'worauf', 'wovon', 'statt', 'anstatt', 'um', 'ohne',
  'der', 'die', 'das', 'den', 'dem', 'deren', 'dessen', 'je', 'sodass', 'soweit', 'außer',
]);

// Finite verb forms observed in this course, hand-checked against the corpus (the set was
// derived by listing every token that ever precedes a subject pronoun in deu_for_eng and
// keeping the finite forms; past participles and bare infinitives after a 1st/2nd-person
// pronoun were dropped, -en forms kept because they ARE finite before wir/sie/Sie).
const FINITE = new Set([
  'bin','bist','ist','sind','seid','war','warst','waren','wäre','wären','wärst',
  'habe','hast','hat','haben','habt','hatte','hattest','hatten','hätte','hätten','hättest',
  'werde','wirst','wird','werden','werdet','würde','würdest','würden','würdet',
  'will','willst','wollen','wollt','wollte','wolltest','wollten',
  'kann','kannst','können','könnt','konnte','konntest','konnten','könnte','könntest','könnten','könntet',
  'muss','musst','müssen','müsst','musste','musstest','mussten','müsste','müssten',
  'soll','sollst','sollen','sollt','sollte','solltest','sollten',
  'mag','magst','mögen','möchte','möchtest','möchten','möchtet',
  'darf','darfst','dürfen','durfte','dürfte',
  'weiß','weißt','wissen','wusste','wusstest','wussten','wüsste',
  'denke','denkst','denkt','denken','dachte','dachtest','dachten',
  'sage','sagst','sagt','sagen','sagte','sagten',
  'spreche','sprichst','spricht','sprechen','sprecht','sprach',
  'mache','machst','macht','machen','machte','machten',
  'gehe','gehst','geht','gehen','ging','gingen',
  'lerne','lernst','lernt','lernen','lernte','lernten',
  'kenne','kennst','kennt','kennen','kannte','kannten',
  'finde','findest','findet','finden','fand','fanden',
  'fühle','fühlst','fühlt','fühlen','fühlte',
  'verstehe','verstehst','versteht','verstehen','verstand',
  'versuche','versuchst','versucht','versuchen','versuchte','versuchten',
  'brauche','brauchst','braucht','brauchen','brauchte',
  'hoffe','hoffst','hofft','hoffen','hoffte',
  'glaube','glaubst','glaubt','glauben','glaubte',
  'liebe','liebst','liebt','lieben','hasse','hasst','hassen',
  'suche','suchst','sucht','suchen','suchte',
  'erinnere','erinnerst','erinnert','erinnern',
  'bewege','bewegst','bewegt','bewegen',
  'gibt','gibst','geben','gab','gaben',
  'tue','tust','tut','tun','tat',
  'sehe','siehst','sieht','sehen','sah','sahen',
  'höre','hörst','hört','hören','hörte',
  'esse','isst','essen','trinke','trinkst','trinkt','trinken',
  'nehme','nimmst','nimmt','nehmen','nahm',
  'komme','kommst','kommt','kommen','kam','kamen',
  'bleibe','bleibst','bleibt','bleiben','blieb',
  'arbeite','arbeitest','arbeitet','arbeiten',
  'helfe','hilfst','hilft','helfen','half',
  'spiele','spielst','spielt','spielen',
  'erwarte','erwartest','erwartet','erwarten',
  'ändere','änderst','ändert','ändern','verändert','verändere','verändern',
  'wünsche','wünschst','wünscht','wünschen','wünschte',
  'scheint','scheinen','führt','führen','fing','fingen','hole','holst','holt',
  'meine','meinst','meint','meinen','streite','streitest','streitet','streiten',
  'sorge','sorgst','sorgt','sorgen','rufe','rufst','ruft','rufen',
  'setze','setzt','setzen','stelle','stellst','stellt','stellen',
  'lasse','lässt','lassen','ließ','bringe','bringst','bringt','bringen',
]);

// Coordinators that start a NEW main clause (so the clause after them is V2 territory).
const COORD = new Set(['und', 'aber', 'oder', 'denn', 'sondern']);

const ADVERBS = new Set([
  'jetzt','heute','morgen','gestern','dann','danach','hier','da','dort','vielleicht','oft',
  'immer','manchmal','normalerweise','natürlich','wirklich','endlich','bald','später','früher',
  'deshalb','deswegen','trotzdem','also','sonst','nie','niemals','einmal','plötzlich','schnell',
  'gerade','schon','noch','wieder','leider','hoffentlich','definitiv','sicher','eigentlich','auch',
]);
const PREPS = new Set([
  'in','an','auf','mit','bei','nach','vor','über','unter','für','von','zu','aus','seit','gegen',
  'ohne','um','während','wegen','durch','zwischen','neben','hinter','trotz','innerhalb','ab',
]);
const TIME_HEADS = new Set([
  'letzten','letzte','letztes','nächsten','nächste','nächstes','diesen','diese','dieses',
  'jeden','jede','jedes','vorgestern','übermorgen',
]);

// --- helpers -------------------------------------------------------------
const norm = (s) => (s || '').replace(/[«»„“”"()’]/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s) => norm(s).replace(/[.,;:!?…]/g, ' ').split(/\s+/).filter(Boolean);

/** Split a sentence into clauses at commas/semicolons and at coordinators. */
function clauses(text) {
  const out = [];
  for (const chunk of norm(text).split(/[,;:–—]| – /)) {
    const t = tokens(chunk);
    if (!t.length) continue;
    // a leading coordinator opens a fresh main clause; drop it so position 1 is the real first constituent
    let i = 0;
    while (i < t.length && COORD.has(t[i].toLowerCase())) i++;
    if (i < t.length) out.push(t.slice(i));
  }
  return out;
}

/**
 * Does this clause show fronted-element V2 inversion?
 * Returns {verb, pronoun, front:[...] } or null.
 */
function inversion(clauseTokens) {
  const t = clauseTokens;
  if (t.length < 3) return null;
  const first = t[0].toLowerCase();
  if (SUBJ.has(first)) return null;          // subject-initial: no inversion
  if (SUBORD.has(first)) return null;        // verb-final subordinate clause / relative / wh-question
  if (FINITE.has(first)) return null;        // verb-initial: yes/no question or imperative
  for (let k = 1; k < t.length - 1; k++) {
    const w = t[k].toLowerCase();
    if (FINITE.has(w)) {
      const nxt = t[k + 1].toLowerCase();
      if (SUBJ.has(nxt)) {
        const out = outOfClass(t.slice(0, k), t[k + 1]);
        return { verb: t[k], pronoun: t[k + 1], front: t.slice(0, k), outOfClass: out };
      }
      return null; // first finite verb of the clause is NOT followed by the subject → not this pattern
    }
  }
  return null;
}

// Two things the raw [X][Vfin][pron] shape catches that are NOT fronted-element inversion,
// both found by hand-reading the flags (see the pilot note at the foot of this file):
//  - a SUBJECT noun phrase in first position, with an object/complement pronoun after the
//    verb: "Mein Vater mag es nicht" — subject-initial V2, nothing inverted.
//  - a wh-question: "Welche deiner Ideen denkst du…" — a question, not a declarative with
//    something fronted, so the learner meets it as a question pattern.
const POSS = new Set(['mein', 'meine', 'meinen', 'dein', 'deine', 'deinen', 'sein', 'seine', 'ihr', 'ihre', 'unser', 'unsere', 'euer', 'eure', 'alle', 'niemand', 'jemand', 'leute']);
const WH = new Set(['welche', 'welcher', 'welches', 'welchen', 'wen', 'wem', 'wessen']);
const OBJ_PRON = new Set(['es', 'sie', 'er', 'wir']);

function outOfClass(front, pronoun) {
  const f0 = front[0].toLowerCase();
  if (WH.has(f0)) return 'wh-question';
  if (POSS.has(f0) && OBJ_PRON.has(pronoun.toLowerCase())) return 'subject-initial (not inversion)';
  return null;
}

function frontKind(front) {
  const f0 = front[0].toLowerCase();
  if (ADVERBS.has(f0)) return 'adverb';
  if (TIME_HEADS.has(f0)) return 'time phrase';
  if (PREPS.has(f0)) return 'prepositional phrase';
  if (front.length === 1) return 'single word (object/other)';
  return 'other (object / longer phrase)';
}

const OUT_OF_CLASS = [];

/** A row's inversion hits across all its clauses. */
function hits(text) {
  const res = [];
  for (const c of clauses(text)) {
    const inv = inversion(c);
    if (inv && inv.outOfClass) { OUT_OF_CLASS.push({ text, ...inv }); continue; }
    if (inv) res.push({ ...inv, kind: frontKind(inv.front), clause: c.join(' ') });
  }
  return res;
}

// --- load ----------------------------------------------------------------
function q(sql) {
  const envFile = path.join(__dirname, '..', '..', '.env.psql');
  const url = fs.readFileSync(envFile, 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)[1];
  const out = execFileSync('psql', [url, '-At', '-F', '\t', '-c', sql], { maxBuffer: 1 << 28 }).toString();
  return out.split('\n').filter((l) => l.trim()).map((l) => l.split('\t'));
}

const seeds = q(`select seed_number, known_text, target_text from course_seeds where course_code='${COURSE}' order by seed_number`)
  .map(([n, k, t]) => ({ seed: +n, known: k, target: t }));
const legos = q(`select seed_number, lego_index, lego_id, known_text, target_text from course_legos where course_code='${COURSE}' order by seed_number, lego_index`)
  .map(([n, i, id, k, t]) => ({ seed: +n, li: +i, id, known: k, target: t }));
const phrases = q(`select seed_number, lego_index, position, phrase_role, coalesce(known_text,''), target_text from course_practice_phrases where course_code='${COURSE}' order by seed_number, lego_index, position`)
  .map(([n, i, p, r, k, t]) => ({ seed: +n, li: +i, pos: +p, role: r, known: k, target: t }));

// --- curricular test -----------------------------------------------------
// The earliest point in the course at which the inverted order is handed to the learner as
// a chunk of its own: a LEGO, or a seed sentence (LEGOs are only allowed to come from seeds).
const legoTeaching = legos.filter((l) => hits(l.target).length).map((l) => ({ ...l, inv: hits(l.target) }));
const seedTeaching = seeds.filter((s) => hits(s.target).length).map((s) => ({ ...s, inv: hits(s.target) }));
const firstTaughtSeed = legoTeaching.length ? legoTeaching[0].seed : Infinity;

// --- run -----------------------------------------------------------------
const flagged = [];
for (const p of phrases) {
  const h = hits(p.target);
  if (!h.length) continue;
  const taught = p.seed > firstTaughtSeed || (p.seed === firstTaughtSeed && legoTeaching.some((l) => l.seed === p.seed && l.li <= p.li));
  flagged.push({ ...p, hits: h, taught });
}

const violations = flagged.filter((f) => !f.taught);

const bySeed = new Map();
for (const v of violations) bySeed.set(v.seed, (bySeed.get(v.seed) || 0) + 1);
const byRole = {}, byKind = {};
for (const v of violations) {
  byRole[v.role] = (byRole[v.role] || 0) + 1;
  for (const h of v.hits) byKind[h.kind] = (byKind[h.kind] || 0) + 1;
}

console.log(`course: ${COURSE}`);
console.log(`seeds ${seeds.length} | legos ${legos.length} | phrase rows ${phrases.length}`);
console.log(`\nSEED sentences that themselves show fronted-element inversion: ${seedTeaching.length}`);
seedTeaching.slice(0, 40).forEach((s) => console.log(`  S${String(s.seed).padStart(4, '0')}  ${s.target}   [${s.known}]`));
console.log(`\nLEGOs that hand the learner the inverted order: ${legoTeaching.length}`);
legoTeaching.slice(0, 40).forEach((l) => console.log(`  ${l.id}  ${l.target}   [${l.known}]`));
console.log(`\nrejected as out-of-class (subject-initial / wh-question): ${OUT_OF_CLASS.length} clause hits`);
console.log(`\nphrase rows showing inversion: ${flagged.length}`);
console.log(`  of which untaught at that point (VIOLATIONS): ${violations.length}`);
console.log(`  in ${bySeed.size} distinct seeds`);
console.log(`\nby phrase_role: ${JSON.stringify(byRole)}`);
console.log(`by fronted element: ${JSON.stringify(byKind)}`);
const buckets = { '1-10': 0, '11-50': 0, '51-100': 0, '101-200': 0, '201-400': 0, '401-668': 0 };
for (const [s, c] of bySeed) {
  if (s <= 10) buckets['1-10'] += c; else if (s <= 50) buckets['11-50'] += c;
  else if (s <= 100) buckets['51-100'] += c; else if (s <= 200) buckets['101-200'] += c;
  else if (s <= 400) buckets['201-400'] += c; else buckets['401-668'] += c;
}
console.log(`by seed band (rows): ${JSON.stringify(buckets)}`);
console.log(`\nper-seed counts:`);
console.log([...bySeed].sort((a, b) => a[0] - b[0]).map(([s, c]) => `${s}:${c}`).join(' '));

const jsonArg = process.argv.indexOf('--json');
if (jsonArg > -1) {
  fs.writeFileSync(process.argv[jsonArg + 1], JSON.stringify({ seedTeaching, legoTeaching, flagged, violations }, null, 2));
  console.log(`\nwrote ${process.argv[jsonArg + 1]}`);
}

/*
 * PILOT NOTE (2026-09-21, first run on deu_for_eng, 668 seeds / 13,926 phrase rows).
 * 244 phrase rows in 96 seeds show fronted-element inversion; 98 rows in 33 seeds appear
 * before the first LEGO that hands the learner the inverted order (S0168L01 "und dann werde
 * ich"). All 98 were read in full against their seed sentence and sibling rows: 98 of 99
 * initial flags were genuine, the one miss being "Mein Freund sagt wir waren glücklich" —
 * a subject-initial clause with a missing comma. That class and wh-questions are now
 * rejected by outOfClass() above, which is what took the raw count down to 244.
 * Tom's case is S0006 L02 p6, a USE row: "Jetzt will ich mich erinnern", built from
 * S0001L01 "ich will" and S0001L04 "jetzt", five seeds after both were introduced.
 */
