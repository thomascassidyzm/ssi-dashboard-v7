#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-missing-subject-2026-09-28.cjs
//
// ita_for_eng — KAI'S RULING (2026-09-28, job #573·I): THE PERSON MUST MATCH ON BOTH SIDES.
// Where the Italian has a FINITE verb that marks person (volevamo, sarei, faresti, sarebbe …) and
// no other expressed subject, the English must carry the subject pronoun (I / you / he / she / it /
// we / they). Found missing in S0599L01C01 "would have been | sarebbe stato" (fixed by #544) and
// S0201L01 "wanted | volevamo" (fixed by #572) — Kai noticed it more than once.
//
// THE DETECTOR (pure functions, exercised by the test file beside this one):
//   English side: after leading conjunctions/adverbs, the first word is a finite verb (modal,
//     auxiliary, past tense, 3rd-singular -s) and is NOT followed by a subject (which would be an
//     inverted question: "could you say it?"), or a bare verb / -ing form (decided by the Italian).
//   Italian side: after leading clitics / negation / question words / adverbs, the first word is a
//     finite, person-marked verb — by list (aux, modals, common irregulars) or by ending — and no
//     subject pronoun (io/tu/lui/lei/noi/voi/loro) or subject noun phrase is expressed.
//   EXCLUDED (never flagged): Italian infinitives, imperatives, gerunds and participles; impersonal
//     si / ci constructions; English inverted questions; English whose subject is a noun phrase or
//     a wh-word; rows where the Italian carries its own subject. A bare English verb against an
//     Italian form that could be an imperative (vieni, aspetta, indovina …) is BORDERLINE and is
//     listed, never edited ("come here | vieni qui" is the calibration case for this exclusion).
//     A subjunctive Italian fragment (fosse, potesse, possa, chiedessi …) is listed, never edited.
//
// WHAT GETS FIXED (English only; the Italian is never touched):
//   R1 A build/use phrase that is a subject-less fragment gets the pronoun. The person comes from
//      the Italian; for the 3rd singular, from the LEGO it practises (its own pronoun) or the seed.
//   R2 A LEGO without a subject gets the pronoun. For the 3rd singular the pronoun is the one the
//      LEGO's own phrases already put before that chunk (he will tell me ×10 → "he"); if no single
//      pronoun stands before the chunk in more than half of those phrases, or the SEED's subject
//      for that chunk is a NOUN PHRASE ("the children were tired", "my grandfather fought") or a
//      wh-word ("what was happening"), the LEGO is LISTED FOR KAI with its sentence — a pronoun there
//      would be invented, and the seed's own phrases would stop containing the LEGO.
//   R3 A component is a tiling gloss, never played (Tom, 2026-08-06). It is flagged only when its
//      LEGO's English has no subject either, and it changes only alongside its LEGO, only when the
//      components tile the LEGO's English today, so that they still do afterwards (S0218L01C01
//      "didn't do" → "I didn't do"). Components that do not tile today are left as they are and
//      listed. Where a sibling component carries the subject ("she | lei"), nothing is flagged.
//   Phrases that already carry a DIFFERENT subject before the chunk ("she didn't need to" under a
//      LEGO that becomes "he didn't need to") are NOT edited: they are reported as containment
//      exceptions for Kai (two Englishes → one Italian is not a defect; Kai's standing rule).
//   Seeds 201 and 203 are OUT OF SCOPE for edits (jobs #572·I and the seed-203 job hold them).
//
// AFTER THE EDIT: every seed touched is unapproved; the English clip of every changed row is
// detached (known_audio_id = NULL) so the temporary-Sonia fill (ita-sonia-temporary-fill SCOPE=ids)
// re-voices it — every Sonia clip is on the Charlotte re-voice list by construction; intros that
// quote a changed LEGO are re-mirrored by ita-intro-mirror-fix (run by this tool after APPLY, with
// the in-flight seed-201 actor held out); an audio-pass request is queued; the round index is
// refreshed; recordContentEdit's exit hook runs the intro-mirror check over the seeds named.
//
//   node tools/course-optimization/ita-missing-subject-2026-09-28.cjs                # census + plan (dry run, no writes)
//   node tools/course-optimization/ita-missing-subject-2026-09-28.cjs --calibrate    # prove the detector on the OLD 599/201 text from content_edit_events
//   APPLY=1 node tools/course-optimization/ita-missing-subject-2026-09-28.cjs        # write, unapprove, re-mirror intros, queue audio pass
//   node tools/course-optimization/ita-missing-subject-2026-09-28.cjs --report-from <applied.json> --out <file.md> [--zut-before <audit.json> --zut-after <audit.json>] [--sonia <fill.json>]
//       # the phone-readable before→after markdown, built from the APPLIED evidence file (the live text is already fixed by then)

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#573·I';
const SWEEP = 'ita-missing-subject-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-28 (job #573·I): the person must match on both sides — where the Italian has a person-marked finite verb and no expressed subject, the English carries the subject pronoun';
const HELD_SEEDS = [201, 203];              // other jobs' seeds this evening: never edited here
const HELD_ACTOR = 'ita-seed-201-recut-2026-09-28';   // the intro re-mirror holds this actor's seeds

// ── Text helpers ─────────────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const squash = (s) => norm(s).replace(/\s+/g, '');
const tokIta = (s) => norm(s).replace(/([a-z]')(?=[a-z])/g, '$1 ').split(' ').filter(Boolean);
/** Live gate's phrase-contains-LEGO rule: word multiset. */
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
const containsSeq = (hay, needle) => (' ' + norm(hay) + ' ').includes(' ' + norm(needle) + ' ');

// ── English side ─────────────────────────────────────────────────────────────────────────
const ENG_FILLERS = new Set(['and', 'but', 'so', 'because', 'if', 'when', 'then', 'now', 'maybe', 'also', 'still', 'already', 'just', 'really', 'yes', 'no', 'well', 'not', 'never', 'always', 'often', 'sometimes', 'usually', 'perhaps', 'probably', 'of', 'course', 'or', 'while', 'since', 'before', 'after', 'as', 'until', 'though', 'although', 'even', 'only', 'again', 'today', 'tomorrow', 'yesterday', 'tonight', 'here', 'soon', 'luckily', 'unfortunately', 'actually', 'honestly', 'clearly', 'obviously', 'definitely', 'certainly', 'finally', 'first', 'later', 'please']);
const ENG_PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);
const SUBJ_PRONOUN_CLASS = new Set([...ENG_PRONOUNS, 'that', 'this']); // demonstratives: a LEGO may take them when its seed and phrases already do
const ENG_SUBJ = new Set([...ENG_PRONOUNS, 'who', 'what', 'that', 'this', 'there', 'someone', 'somebody', 'nobody', 'no-one', 'everyone', 'everybody', 'anyone', 'anybody', 'something', 'nothing', 'everything', 'anything', 'people', 'one', 'which', 'whoever', 'whatever', 'the', 'a', 'an', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'these', 'those', 'some', 'any', 'every', 'each', 'both', 'all', 'several', 'most', 'none', 'neither', 'either', 'another', 'other', 'such', "what's", "that's", "it's", "he's", "she's", "there's", "who's", "i'm", "i'd", "i'll", "i've", "you're", "you'd", "you'll", "you've", "we're", "we'd", "we'll", "we've", "they're", "they'd", "they'll", "they've", "let's", 'let', 'thank', 'thanks', 'how', 'why', 'where', 'whose', 'half', 'more', 'less', 'enough', 'lots', 'plenty', 'part', 'two', 'three', 'life', 'time', 'things', 'whatever']);
const MODAL = new Set(['would', 'could', 'should', 'will', 'can', 'might', 'must', 'shall', 'may', "won't", "can't", "couldn't", "wouldn't", "shouldn't", "mustn't", 'cannot']);
const AUX = new Set(['am', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't", "don't", "doesn't", "didn't"]);
const IRREG_PAST = new Set('went came said told knew thought saw took gave made got found felt left kept met began heard put ran sat spoke stood understood wrote lost paid sent spent won forgot brought bought caught taught slept ate drank drove fell held hit lay became broke chose built blew drew flew grew threw hid led lent meant rode rose shook shut sang sold sought swam tore woke wore fed fought cut set cost quit beat bent burnt learnt dreamt spelt smelt lit wound'.split(' '));
const NOT_A_VERB_ED = new Set('need indeed tired bored married worried interested excited scared red bed confused used surprised pleased allowed supposed embarrassed naked wicked sacred beloved crowded closed satisfied prepared relaxed stressed disappointed frightened organised organized determined complicated exhausted educated limited involved concerned boiled'.split(' '));
// base verbs = every word the course itself uses after "to " (derived once from the live English, minus the non-verbs that slip in)
let BASE_VERBS = new Set();
function learnBaseVerbs(knownTexts) {
  const s = new Set();
  for (const k of knownTexts) for (const m of norm(k).matchAll(/\bto ([a-z']+)/g)) s.add(m[1]);
  for (const w of ['the', 'you', 'me', 'him', 'her', 'a', 'his', 'each', 'that', 'your', 'school', 'africa', 'anyone', 'book', 'part', 'park', 'somewhere', 'someone', 'somebody', 'something', 'nothing', 'nobody', 'everyone', 'work', 'answer', 'show']) s.delete(w);
  BASE_VERBS = s;
  return s;
}
const isPastEd = (w) => /^[a-z]{2,}ed$/.test(w) && !NOT_A_VERB_ED.has(w);
const isThirdS = (w) => /^[a-z]{3,}s$/.test(w) && !/ss$/.test(w) && ((/ies$/.test(w) && BASE_VERBS.has(w.replace(/ies$/, 'y'))) || (/(sh|ch|x|o)es$/.test(w) && BASE_VERBS.has(w.replace(/es$/, ''))) || BASE_VERBS.has(w.replace(/s$/, '')));
const isGerund = (w) => /ing$/.test(w) && (BASE_VERBS.has(w.replace(/ing$/, '')) || BASE_VERBS.has(w.replace(/ing$/, 'e')) || BASE_VERBS.has(w.replace(/(.)\1ing$/, '$1')));

function engHead(known) {
  const t = words(known);
  let i = 0;
  while (i < t.length && ENG_FILLERS.has(t[i])) i++;
  if (i >= t.length) return { kind: 'none' };
  const w = t[i];
  if (ENG_SUBJ.has(w)) return { kind: 'subject', w };
  const raw = String(known).trim().split(/\s+/)[i] || '';
  if (/^[A-Z]/.test(raw) && w !== 'i') return { kind: 'subject', w }; // a name
  if (MODAL.has(w) || AUX.has(w)) {
    let j = i + 1;
    if (j < t.length && t[j] === 'not') j++;
    if (j < t.length && ENG_SUBJ.has(t[j])) return { kind: 'question', w };
    return { kind: 'finite', w, tense: 'aux' };
  }
  if (IRREG_PAST.has(w) || isPastEd(w)) return { kind: 'finite', w, tense: 'past' };
  if (isThirdS(w)) return { kind: 'finite', w, tense: '3s' };
  if (BASE_VERBS.has(w)) return { kind: 'base', w };
  if (isGerund(w)) return { kind: 'gerund', w };
  return { kind: 'other', w };
}

// ── Italian side ─────────────────────────────────────────────────────────────────────────
const ITA_LEAD = new Set("non mi ti ci vi lo la li le gli ne si me te se glielo gliela gliele glieli ce ve che cosa come quando dove perché quanto quanti quante chi e ma però allora adesso ora anche ancora già mai sempre forse poi così davvero oggi domani ieri stasera stamattina qui presto solo proprio quasi di a nuovo magari no sì purtroppo fortunatamente veramente sicuramente certamente finalmente prima dopo più meno tanto molto poco bene male subito l' appena tutto spesso".split(' '));
const ITA_SUBJ = new Set("io tu lui lei noi voi loro il la lo i gli le l' un una uno un' mio mia miei mie tuo tua tuoi tue suo sua suoi sue nostro nostra nostri nostre vostro vostra vostri vostre questo questa questi queste quello quella quelli quelle quell' nessuno qualcuno tutti tutte niente nulla qualcosa ognuno chiunque molti molte alcuni alcune ogni qualche tanti tante troppi troppe pochi poche c'è".split(' '));
const ITA_PRON = ['io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro'];
const ITA_PREP = new Set('a con per di da su tra fra in anche che e come senza'.split(' '));
const SUBJUNCTIVE = new Set('sia siano fossi fosse fossimo foste fossero avessi avesse avessimo aveste avessero abbia abbiano possa possano stia stesse potesse volesse dovesse sapesse facesse andasse venisse dicesse'.split(' '));
const IRREG_NONFINITE = new Set("visto detto fatto fatta fatti fatte successo chiesto messo preso scritto letto rotto aperto chiuso morto nato vissuto scelto deciso perso persa risposto rimasto stato stata stati state offerto corso speso vinto convinto piaciuto voluto potuto dovuto saputo sentite sentito accaduto sode d'accordo sinistra destra lavoro spettacolo resta".split(' '));
const NONFINITE_END = /(are|ere|ire|urre|orre|arre|arsi|ersi|irsi|arlo|erlo|irlo|arla|erla|irla|arli|erli|irli|arle|erle|irle|armi|ermi|irmi|arti|erti|irti|arci|erci|irci|arvi|ervi|irvi|arne|erne|irne|ando|endo|ato|ata|ati|ate|uto|uta|uti|ute|ito|ita|iti|ite)$/;
const FIN = {};
const addFin = (p, ws) => ws.split(/\s+/).forEach((w) => { FIN[w] = p; });
addFin('1s', 'ho ero avevo sarò avrò sarei avrei sto stavo posso potevo potrei voglio volevo vorrei devo dovevo dovrei so sapevo saprei faccio facevo farei vado andavo andrei vengo venivo verrei dico dicevo direi do davo darei esco uscivo uscirei riesco riuscivo riuscirei tengo tenevo terrei rimango rimanevo rimarrei');
addFin('2s', 'hai sei eri avevi sarai avrai saresti avresti stavi puoi potevi potresti vuoi volevi vorresti devi dovevi dovresti sai sapevi sapresti facevi faresti andavi andresti venivi verresti dicevi diresti davi daresti uscivi usciresti riesci riuscivi riusciresti tenevi terresti rimanevi rimarresti');
addFin('2s?', 'stai fai vai vieni dici dai esci tieni rimani'); // indicative OR imperative
addFin('3s', 'ha è era aveva sarà avrà sarebbe avrebbe sta stava può poteva potrebbe vuole voleva vorrebbe deve doveva dovrebbe sa sapeva saprebbe fa faceva farebbe va andava andrebbe viene veniva verrebbe dice diceva direbbe dà dava darebbe esce usciva uscirebbe riesce riusciva riuscirebbe tiene teneva terrebbe rimane rimaneva rimarrebbe piace piaceva piacerebbe dispiace dispiaceva dispiacerebbe sembra sembrava sembrerebbe succede succedeva succederebbe basta serve serviva bisogna vale valeva');
addFin('1p', 'abbiamo siamo eravamo avevamo saremo avremo saremmo avremmo fossimo avessimo stiamo stavamo possiamo potevamo potremmo vogliamo volevamo vorremmo dobbiamo dovevamo dovremmo sappiamo sapevamo sapremmo facciamo facevamo faremmo andiamo andavamo andremmo veniamo venivamo verremmo diciamo dicevamo diremmo diamo davamo daremmo usciamo uscivamo usciremmo riusciamo riuscivamo riusciremmo teniamo rimaniamo');
addFin('2p', 'avete siete eravate avevate sarete avrete sareste avreste siate stavate potete potevate potreste volete volevate vorreste dovete dovevate dovreste sapete sapevate sapreste fate facevate fareste andate andavate andreste venite venivate verreste dite dicevate direste date davate dareste uscite riuscite tenete rimanete');
addFin('3p', 'hanno erano avevano saranno avranno sarebbero avrebbero stanno stavano possono potevano potrebbero vogliono volevano vorrebbero devono dovevano dovrebbero sanno sapevano saprebbero fanno facevano farebbero vanno andavano andrebbero vengono venivano verrebbero dicono dicevano direbbero danno davano darebbero escono uscivano uscirebbero riescono riuscivano riuscirebbero tengono rimangono piacciono sembrano succedono servono');
// endings: "?" = form is ambiguous (noun / imperative / other person), "~" = subjunctive
const ENDINGS = [
  [/(av|ev|iv)o$/, '1s'], [/(av|ev|iv)i$/, '2s'], [/(av|ev|iv)a$/, '3s'], [/(av|ev|iv)amo$/, '1p'], [/(av|ev|iv)ate$/, '2p'], [/(av|ev|iv)ano$/, '3p'],
  [/(er|ir|ar)ei$/, '1s'], [/(er|ir|ar)esti$/, '2s'], [/(er|ir|ar)ebbe$/, '3s'], [/(er|ir|ar)emmo$/, '1p'], [/(er|ir|ar)este$/, '2p'], [/(er|ir|ar)ebbero$/, '3p'],
  [/(er|ir|ar)ò$/, '1s'], [/(er|ir|ar)ai$/, '2s'], [/(er|ir|ar)à$/, '3s'], [/(er|ir|ar)emo$/, '1p'], [/(er|ir|ar)ete$/, '2p'], [/(er|ir|ar)anno$/, '3p'],
  [/(ass|ess|iss)i$/, '1s~'], [/(ass|ess|iss)e$/, '3s~'], [/(ass|ess|iss)imo$/, '1p~'], [/(ass|ess|iss)ero$/, '3p~'],
  [/iamo$/, '1p?'], [/(a|e|i)te$/, '2p?'], [/ano$/, '3p'], [/ono$/, '3p'], [/isco$/, '1s'], [/isci$/, '2s?'], [/isce$/, '3s'], [/iscono$/, '3p'],
  [/o$/, '1s?'], [/i$/, '2s?'], [/a$/, '3s?'], [/e$/, '3s?'],
];
const DATIVE = { mi: 'I', ti: 'you', ci: 'we', vi: 'you', gli: 'he', le: 'she' };
const PIACE_LIKE = /^(dis)?piac|^sembr|^serv|^manc|^bast|^interess/;
const PERSON_PRONOUN = { '1s': 'I', '2s': 'you', '1p': 'we', '2p': 'you', '3p': 'they', '3s': null };

function itaHead(target) {
  const t = tokIta(target);
  for (let k = 0; k < t.length; k++) if (ITA_PRON.includes(t[k]) && !ITA_PREP.has(t[k - 1])) return { kind: 'subject', w: t[k] };
  let i = 0;
  while (i < t.length && ITA_LEAD.has(t[i])) i++;
  if (i >= t.length) return { kind: 'none' };
  const w = t[i];
  const rawFirst = String(target).trim().split(/\s+/)[i] || '';
  if (ITA_SUBJ.has(w) || (/^[A-Z]/.test(rawFirst) && i > 0)) return { kind: 'subject', w };
  let head = null;
  if (w === 'sono') { // io sono / loro sono: the word after decides (sono uscito = I, sono usciti / sono pronti = they)
    const nx = t[i + 1] || '';
    const person = /(o|a)$/.test(nx) && !/(mo|ano)$/.test(nx) ? '1s' : /(i|e)$/.test(nx) && !ITA_LEAD.has(nx) ? '3p' : null;
    head = person ? { kind: 'finite', w, person, sure: true } : { kind: 'finite', w, person: '1s', sure: false };
  } else if (SUBJUNCTIVE.has(w)) head = { kind: 'finite', w, person: /(imo)$/.test(w) ? '1p' : /(ero|ano|iano)$/.test(w) ? '3p' : /(ssi)$/.test(w) ? '1s' : '3s', sure: true, subjunctive: true };
  else if (FIN[w]) head = { kind: 'finite', w, person: FIN[w].replace('?', ''), sure: !FIN[w].endsWith('?') };
  else if (IRREG_NONFINITE.has(w)) return { kind: 'nonfinite', w };
  else if (NONFINITE_END.test(w)) return { kind: 'nonfinite', w };
  else { for (const [re, p] of ENDINGS) if (re.test(w)) { head = { kind: 'finite', w, person: p.replace(/[?~]/, ''), sure: !p.endsWith('?'), subjunctive: p.endsWith('~') }; break; } }
  if (!head) return { kind: 'other', w };
  if (PIACE_LIKE.test(w)) { const cl = t.find((x) => DATIVE[x]); if (cl) head.dative = DATIVE[cl]; }
  return head;
}

/** One row → verdict. */
function classify(known, target) {
  const e = engHead(known), it = itaHead(target);
  const r = { e, it };
  if (!['finite', 'base', 'gerund'].includes(e.kind)) return { ...r, verdict: 'ok:eng-' + e.kind };
  if (it.kind !== 'finite') return { ...r, verdict: 'ok:ita-' + it.kind };
  if (it.subjunctive) return { ...r, verdict: 'borderline:subjunctive' };
  if (e.kind === 'base') {
    if (it.sure && (it.person === '1s' || it.person === '2s' || it.person === '3p')) return { ...r, verdict: 'flag', pronoun: PERSON_PRONOUN[it.person] };
    return { ...r, verdict: it.sure ? 'borderline:base-vs-' + it.person : 'noise' };
  }
  if (!it.sure) return { ...r, verdict: e.kind === 'gerund' ? 'noise' : 'flag?', pronoun: it.dative || PERSON_PRONOUN[it.person] };
  if (e.kind === 'gerund') return { ...r, verdict: 'flag:gerund', pronoun: it.dative || PERSON_PRONOUN[it.person] };
  return { ...r, verdict: 'flag', pronoun: it.dative || PERSON_PRONOUN[it.person] };
}

// ── Decisions ────────────────────────────────────────────────────────────────────────────
const legoOf = (id) => id.replace(/^ita_for_eng:/, '').replace(/[BUC]\d\d$/, '');
const short = (id) => id.replace(/^ita_for_eng:/, '');

/** Pronoun a LEGO's phrases put immediately before the LEGO chunk: {pronoun, count, total, noun} */
function pronounBeforeChunk(legoKnown, phrases) {
  const chunk = words(legoKnown);
  const counts = {}; let total = 0, nounish = 0;
  for (const p of phrases) {
    const w = words(p.known);
    for (let i = 0; i + chunk.length <= w.length; i++) {
      if (chunk.every((c, k) => w[i + k] === c)) {
        if (i === 0) break; // fragment: no subject in front
        const prev = w[i - 1];
        total++;
        if (SUBJ_PRONOUN_CLASS.has(prev)) counts[prev] = (counts[prev] || 0) + 1; else nounish++;
        break;
      }
    }
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { pronoun: best ? best[0] : null, count: best ? best[1] : 0, total, nounish, counts };
}
/** The subject of the seed for this chunk: a pronoun, a noun phrase, a wh-word, or none. */
function seedSubjectFor(legoKnown, seedKnown) {
  const chunk = words(legoKnown), w = words(seedKnown);
  for (let i = 0; i + chunk.length <= w.length; i++) if (chunk.every((c, k) => w[i + k] === c)) {
    if (i === 0) return { kind: 'none' };
    const prev = w[i - 1];
    if (SUBJ_PRONOUN_CLASS.has(prev)) return { kind: 'pronoun', w: prev };
    if (['what', 'who', 'which', 'whoever', 'whatever', 'nobody', 'nothing', 'something', 'someone', 'everything', 'everyone', 'anyone', 'anything'].includes(prev)) return { kind: 'wh', w: prev };
    return { kind: 'noun', w: w.slice(Math.max(0, i - 3), i).join(' ') };
  }
  return { kind: 'absent' };
}
const cap = (p) => (p === 'i' ? 'I' : p);
const withPronoun = (pronoun, known) => `${cap(pronoun)} ${known}`;

/**
 * Hand rows (rule cited): fragments whose repair is more than a bare prefix — the gerund fragments
 * take their LEGO's own finite form; the two seed-153 fragments carry the conditional perfect the
 * Italian has (l'avrei detto = I would have said it), which the English was missing along with the
 * pronoun. Every row here is re-asserted against the live text before it is written.
 */
const HAND = {
  'S0068L01B01': { to: "you're looking for", why: 'gerund fragment takes its LEGO S0068L01 form "you\'re looking for" (stai = you)' },
  'S0205L02B04': { to: 'I was trying to', why: 'gerund fragment takes its LEGO S0205L02 form (stavo = I was)' },
  'S0372L03B02': { to: 'she was trying to create', why: 'gerund fragment takes the seed-372 form (stava = she was; seed "what she was trying to create")' },
  'S0501L03B03': { to: "I'm trying not to argue", why: 'gerund fragment: sto provando = I\'m trying' },
  'S0568L02B03': { to: "I'm not expecting to see much", why: 'gerund fragment takes its LEGO S0568L02 form "I\'m expecting to see" (mi aspetto)' },
  'S0153L02B03': { to: 'I would have said it exactly', why: 'l\'avrei detto = I would have said it: pronoun AND the conditional perfect were missing (tense corrected too — flagged for Kai)' },
  'S0153L03B04': { to: 'I would have said it in the same way', why: 'as S0153L02B03' },
};

function decide(rows) {
  const seeds = {}; for (const r of rows) if (r.kind === 'seed') seeds[r.sn] = r;
  const legos = {}; for (const r of rows) if (r.kind === 'lego') legos[r.id] = r;
  const phrasesOf = (lid) => rows.filter((r) => (r.kind === 'build' || r.kind === 'use') && legoOf(r.id) === lid);
  const compsOf = (lid) => rows.filter((r) => r.kind === 'component' && legoOf(r.id) === lid);
  const tally = {}; const hits = [];
  for (const r of rows) {
    const c = classify(r.known, r.target);
    tally[c.verdict] = (tally[c.verdict] || 0) + 1;
    if (!c.verdict.startsWith('ok') && c.verdict !== 'noise') hits.push({ ...r, ...c });
  }
  const changes = [], kai = [], borderline = [], exceptions = [], skipped = [];
  const legoDecision = {};
  // R2: LEGOs first — their decision governs their phrases and components
  for (const h of hits.filter((h) => h.kind === 'lego')) {
    const lid = h.id; const seed = seeds[h.sn]; const ph = phrasesOf(lid);
    if (HELD_SEEDS.includes(h.sn)) { skipped.push({ ...h, why: `seed ${h.sn} held (another job)` }); legoDecision[lid] = 'held'; continue; }
    if (h.verdict !== 'flag') { kai.push({ ...h, why: h.verdict === 'flag?' ? 'Italian form is ambiguous (could be a noun or another person) — your read' : h.verdict }); legoDecision[lid] = 'kai'; continue; }
    const ss = seedSubjectFor(h.known, seed.known);
    const before = pronounBeforeChunk(h.known, ph);
    let pronoun = h.pronoun ? h.pronoun.toLowerCase() : null;
    if (!pronoun) { // 3rd singular: the LEGO's own phrases decide
      if (before.pronoun && before.count * 2 > before.total) pronoun = before.pronoun;
    }
    if (ss.kind === 'noun' || ss.kind === 'wh') { kai.push({ ...h, why: `the seed's subject for this chunk is ${ss.kind === 'noun' ? 'a noun phrase' : 'a wh-word'} ("${ss.w}") — a pronoun here would be invented, and the seed's own phrases would stop containing the LEGO`, suggest: pronoun ? withPronoun(pronoun, h.known) : null, before }); legoDecision[lid] = 'kai'; continue; }
    if (before.total && before.nounish * 2 >= before.total) { kai.push({ ...h, why: `its phrases put a noun phrase before the chunk in ${before.nounish} of ${before.total} (${JSON.stringify(before.counts)}) — a fixed pronoun would be invented`, suggest: pronoun ? withPronoun(pronoun, h.known) : null, before }); legoDecision[lid] = 'kai'; continue; }
    if (!pronoun) { kai.push({ ...h, why: `3rd singular with no single pronoun before the chunk in its phrases (${JSON.stringify(before.counts)}) — he/she/it undecidable`, before }); legoDecision[lid] = 'kai'; continue; }
    const to = withPronoun(pronoun, h.known);
    changes.push({ id: lid, kind: 'lego', seed: h.sn, rule: 'R2', from: h.known, to, target: h.target, pronoun, why: `${h.it.w} is ${h.it.person}${h.it.person === '3s' ? `; phrases put "${pronoun}" before the chunk ${before.count}/${before.total}` : ''}` });
    legoDecision[lid] = pronoun;
    // phrases under it that already carry a different subject: containment exceptions (not edited)
    for (const p of ph) if (!containsWords(p.known, to) && engHead(p.known).kind === 'subject') exceptions.push({ id: short(p.id), lego: lid, legoTo: to, known: p.known, target: p.target });
    // components: change the head component only if the components tile the LEGO's English today
    const comps = compsOf(lid); const lego = legos[lid];
    const jsonComps = lego.components || [];
    const tileNow = comps.length && squash(comps.map((c) => c.known).join(' ')) === squash(h.known) && squash(comps.map((c) => c.target).join(' ')) === squash(h.target);
    const jsonTile = jsonComps.length && squash(jsonComps.map((c) => c.known).join(' ')) === squash(h.known);
    if (tileNow && (jsonTile || !jsonComps.length)) {
      const head = comps[0];
      changes.push({ id: short(head.id), kind: 'component', seed: h.sn, rule: 'R3', from: head.known, to: withPronoun(pronoun, head.known), target: head.target, pronoun, why: `components tile ${lid}; head component follows the LEGO`, jsonIndex: jsonComps.length ? 0 : null });
    } else if (comps.length) {
      exceptions.push({ id: comps.map((c) => short(c.id)).join('+'), lego: lid, legoTo: to, known: comps.map((c) => c.known).join(' + '), target: comps.map((c) => c.target).join(' + '), note: 'components do not tile the LEGO today; left as they are' });
    }
  }
  // R1: phrases
  for (const h of hits.filter((h) => h.kind === 'build' || h.kind === 'use')) {
    const lid = legoOf(h.id); const lego = legos[lid]; const seed = seeds[h.sn];
    if (HELD_SEEDS.includes(h.sn)) { skipped.push({ ...h, why: `seed ${h.sn} held (another job)` }); continue; }
    if (HAND[short(h.id)]) { changes.push({ id: short(h.id), kind: h.kind, seed: h.sn, rule: 'R1-hand', from: h.known, to: HAND[short(h.id)].to, target: h.target, why: HAND[short(h.id)].why }); continue; }
    if (h.verdict.startsWith('borderline')) { borderline.push(h); continue; }
    if (h.verdict === 'flag?') { kai.push({ ...h, why: 'Italian form is ambiguous — your read' }); continue; }
    if (h.verdict === 'flag:gerund') { borderline.push({ ...h, why: 'English -ing fragment against a finite Italian; no hand form given' }); continue; }
    const ld = legoDecision[lid];
    if (ld === 'kai' || ld === 'held') { kai.push({ ...h, why: `follows its LEGO ${lid} (${ld === 'held' ? 'held' : 'listed for you'})` }); continue; }
    let pronoun = h.pronoun ? h.pronoun.toLowerCase() : null;
    const ssFrag = seedSubjectFor(h.known, seed.known);
    if (!pronoun && (ssFrag.kind === 'noun' || ssFrag.kind === 'wh')) { kai.push({ ...h, why: `the seed's subject for this chunk is ${ssFrag.kind === 'noun' ? 'a noun phrase' : 'a wh-word'} ("${ssFrag.w}")` }); continue; }
    if (!pronoun) { // 3rd singular: the LEGO's own pronoun, else the LEGO decision, else the seed's pronoun
      const lh = lego ? engHead(lego.known) : { kind: 'none' };
      if (lh.kind === 'subject' && ENG_PRONOUNS.has(lh.w)) pronoun = lh.w;
      else if (ld && SUBJ_PRONOUN_CLASS.has(ld)) pronoun = ld;
      else { const ss = seedSubjectFor(h.known, seed.known); if (ss.kind === 'pronoun') pronoun = ss.w; else { const bs = seedSubjectFor(words(h.known).slice(0, 2).join(' '), seed.known); if (bs.kind === 'pronoun') pronoun = bs.w; } }
      if (!pronoun && lego) { const b = pronounBeforeChunk(h.known, phrasesOf(lid)); if (b.pronoun && b.count * 2 > b.total) pronoun = b.pronoun; }
    }
    if (!pronoun) { kai.push({ ...h, why: 'he/she/it undecidable from the LEGO and the seed' }); continue; }
    changes.push({ id: short(h.id), kind: h.kind, seed: h.sn, rule: 'R1', from: h.known, to: withPronoun(pronoun, h.known), target: h.target, pronoun, why: `${h.it.w} is ${h.it.person}${h.it.person === '3s' ? `; pronoun from ${lego && engHead(lego.known).kind === 'subject' ? 'LEGO ' + lid : ld && ENG_PRONOUNS.has(ld) ? 'LEGO decision' : 'the seed'}` : ''}` });
  }
  // R3: components flagged on their own — only those whose LEGO has no subject and was not changed above
  for (const h of hits.filter((h) => h.kind === 'component')) {
    const lid = legoOf(h.id); const lego = legos[lid];
    if (!lego) continue;
    const lh = engHead(lego.known);
    if (lh.kind === 'subject' || lh.kind === 'question') continue; // the LEGO (or a sibling) carries the subject
    if (changes.some((c) => c.id === short(h.id))) continue;
    if (legoDecision[lid]) continue; // reported with its LEGO
    if (h.verdict.startsWith('borderline')) { borderline.push(h); continue; }
    kai.push({ ...h, why: `component of ${lid}, which has no English subject either; not changed on its own` });
  }
  // seeds flagged directly
  for (const h of hits.filter((h) => h.kind === 'seed')) { if (h.verdict === 'flag') kai.push({ ...h, why: 'seed sentence itself lacks a subject' }); else borderline.push(h); }
  const coverage = { scanned: rows.length, byKind: rows.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {}), verdicts: tally };
  return { coverage, hits, changes, kai, borderline, exceptions, skipped };
}

// ── Live data ────────────────────────────────────────────────────────────────────────────
async function loadRows(pg) {
  const { rows } = await pg.query(
    `SELECT * FROM (
       SELECT 'seed' AS kind, seed_number AS sn, 'S'||lpad(seed_number::text,4,'0') AS id, known_text AS known, target_text AS target, NULL::jsonb AS components, known_audio_id
         FROM course_seeds WHERE course_code=$1
       UNION ALL SELECT 'lego', seed_number, lego_id, known_text, target_text, components, known_audio_id FROM course_legos WHERE course_code=$1
       UNION ALL SELECT phrase_role, seed_number, id, known_text, target_text, NULL, known_audio_id FROM course_practice_phrases WHERE course_code=$1
     ) x ORDER BY sn, id`, [COURSE]);
  return rows.map((r) => ({ ...r, sn: Number(r.sn), id: short(r.id), fullId: r.id }));
}

/** Calibration: the detector must flag the OLD text of S0599L01C01 and S0201L01 as recorded in content_edit_events. */
async function calibrate(pg) {
  const { rows } = await pg.query(`SELECT detail FROM content_edit_events WHERE course_code=$1 AND (detail::text ILIKE '%sarebbe stato%' OR detail::text ILIKE '%volevamo%') ORDER BY occurred_at`, [COURSE]);
  const olds = [];
  for (const { detail } of rows) {
    for (const c of detail.changes || []) if (/S0599L01C01$/.test(c.id)) olds.push({ id: 'S0599L01C01', known: c.known_from, target: c.target_from });
    if (detail.from && detail.from.known === 'wanted') olds.push({ id: 'S0201L01', known: detail.from.known, target: detail.from.target });
  }
  if (!olds.find((o) => o.id === 'S0599L01C01')) olds.push({ id: 'S0599L01C01 (from the brief; no event row carried it)', known: 'would have been', target: 'sarebbe stato' });
  if (!olds.find((o) => o.id === 'S0201L01')) olds.push({ id: 'S0201L01 (from the brief; no event row carried it)', known: 'wanted', target: 'volevamo' });
  const out = olds.map((o) => ({ ...o, ...pick(classify(o.known, o.target)) }));
  const controls = [['come here', 'vieni qui', 'imperative: excluded'], ['I would have been', 'sarei stato', 'subject present'], ['to say it', 'dirlo', 'infinitive'], ['is going', 'sta andando', '3s finite → flag'], ['wanted', 'volevamo', 'flag we']].map(([k, t, note]) => ({ known: k, target: t, note, ...pick(classify(k, t)) }));
  return { olds: out, controls };
}
const pick = (c) => ({ verdict: c.verdict, pronoun: c.pronoun || null, engHead: c.e.w, itaHead: c.it.w, person: c.it.person });

async function zutAgainstCourse(pg, changes) {
  const ours = new Set(changes.map((c) => c.id));
  const clashes = [];
  const held = [];
  for (const c of changes.filter((c) => c.kind !== 'component')) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND id<>$4 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$5 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))`,
      [COURSE, c.to, c.target, `${COURSE}:${c.id}`, c.id]);
    const outside = rows.filter((r) => !ours.has(short(r.id)));
    for (const r of outside) clashes.push(`${c.id} "${c.to}" → "${c.target}" vs ${short(r.id)} "${r.known_text}" → "${r.target_text}"`);
    if (outside.length) {
      const { rows: same } = await pg.query(`SELECT 1 FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND id<>$4 AND lower(trim(known_text))=lower($2) AND lower(trim(target_text))=lower($3) UNION ALL SELECT 1 FROM course_legos WHERE course_code=$1 AND lego_id<>$5 AND lower(trim(known_text))=lower($2) AND lower(trim(target_text))=lower($3) LIMIT 1`, [COURSE, c.to, c.target, `${COURSE}:${c.id}`, c.id]);
      if (!same.length) held.push({ change: c, vs: outside.map((r) => `${short(r.id)} "${r.known_text}" → "${r.target_text}"`) });
      else c.zutPreexisting = outside.map((r) => short(r.id));
    }
  }
  return { clashes, held };
}

async function guards(pg, rows, D, problems) {
  const byId = {}; for (const r of rows) byId[r.id] = r;
  for (const c of D.changes) {
    const live = byId[c.id];
    if (!live) { problems.push(`${c.id}: not live`); continue; }
    if (live.known !== c.from || live.target !== c.target) problems.push(`${c.id}: live text moved ("${live.known}" | "${live.target}")`);
    if (c.to === c.from) problems.push(`${c.id}: no change`);
    if (norm(c.to).replace(/^(i|you|he|she|it|we|they|i'm|you're|i would have|she was|i was|i'm not|i was trying to|she was trying to) ?/, '') !== norm(c.from).replace(/^(looking|trying|not expecting|said it)?/, '') && !HAND[c.id] && !norm(c.to).endsWith(norm(c.from))) problems.push(`${c.id}: change is more than a leading pronoun`);
    if (HELD_SEEDS.includes(c.seed)) problems.push(`${c.id}: seed ${c.seed} is held`);
  }
  // every changed phrase still contains its LEGO (as it will read after this pass) on both sides
  const legoTo = {}; for (const c of D.changes.filter((c) => c.kind === 'lego')) legoTo[c.id] = c.to;
  const legos = {}; for (const r of rows) if (r.kind === 'lego') legos[r.id] = r;
  for (const c of D.changes.filter((c) => c.kind === 'build' || c.kind === 'use')) {
    const lid = legoOf(c.id); const l = legos[lid]; if (!l) continue;
    const lk = legoTo[lid] || l.known;
    if (!containsWords(c.to, lk)) problems.push(`${c.id}: "${c.to}" no longer contains its LEGO ${lid} "${lk}"`);
    if (!containsWords(c.target, l.target)) D.exceptions.push({ id: c.id, lego: lid, legoTo: lk, known: c.to, target: c.target, note: 'Italian did not contain its LEGO before this pass either (untouched)' });
  }
  // a LEGO's B01 (its own copy) must end up identical to the LEGO
  for (const c of D.changes.filter((c) => c.kind === 'lego')) {
    const b01 = D.changes.find((x) => x.id === `${c.id}B01`); const liveB01 = byId[`${c.id}B01`];
    if (liveB01 && liveB01.known === c.from && !b01) problems.push(`${c.id}B01 mirrors the old LEGO text and is not in the change list`);
  }
}

// ── Apply ────────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, rows, D, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const legoChanges = D.changes.filter((c) => c.kind === 'lego');
  const phraseChanges = D.changes.filter((c) => c.kind !== 'lego');
  const seedsTouched = [...new Set(D.changes.map((c) => c.seed))].sort((a, b) => a - b);
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const legoEvent = legoChanges.length ? await ev('lego-edit', { seed_numbers: [...new Set(legoChanges.map((c) => c.seed))], lego_ids: legoChanges.map((c) => c.id), rows: legoChanges.length }, { ruling: RULING, job: JOB, changes: legoChanges.map((c) => ({ id: c.id, known_from: c.from, known_to: c.to, target: c.target, why: c.why })) }) : null;
  const phraseEvent = phraseChanges.length ? await ev('phrase-edit', { seed_numbers: [...new Set(phraseChanges.map((c) => c.seed))], phrase_ids: phraseChanges.map((c) => `${COURSE}:${c.id}`), rows: phraseChanges.length }, { ruling: RULING, job: JOB, changes: phraseChanges.map((c) => ({ id: `${COURSE}:${c.id}`, rule: c.rule, known_from: c.from, target_from: c.target, known_to: c.to, target_to: c.target, why: c.why })) }) : null;
  const unapproveEvent = await ev('unapprove', { seed_numbers: seedsTouched, rows: seedsTouched.length }, { why: 'English subject pronouns added under Kai\'s ruling of 2026-09-28; need his read', job: JOB });
  log.events = { legoEvent, phraseEvent, unapproveEvent };
  const legos = {}; for (const r of rows) if (r.kind === 'lego') legos[r.id] = r;
  await pg.query('BEGIN');
  try {
    for (const c of legoChanges) {
      const live = legos[c.id];
      let comps = live.components;
      const headComp = D.changes.find((x) => x.kind === 'component' && legoOf(x.id) === c.id && x.jsonIndex === 0);
      if (headComp && Array.isArray(comps) && comps.length) { comps = comps.map((x, i) => (i === 0 ? { ...x, known: headComp.to } : x)); }
      const u = await pg.query(`UPDATE course_legos SET known_text=$1, components=$2, known_audio_id=NULL, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND lego_id=$5 AND known_text=$6 AND target_text=$7`,
        [c.to, comps === null || comps === undefined ? null : JSON.stringify(comps), legoEvent, COURSE, c.id, c.from, c.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows`);
      c.componentsJson = comps;
    }
    for (const c of phraseChanges) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, known_audio_id=NULL, qa_checked=NULL, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND id=$4 AND known_text=$5 AND target_text=$6`,
        [c.to, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.from, c.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, seedsTouched]);
    log.unapproved = { seeds: seedsTouched, rows: un.rowCount };
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: English subject pronouns added on ${D.changes.length} rows (Kai's person-match ruling); English prompts on temporary Sonia (ita-sonia-temporary-fill SCOPE=ids), intros re-mirrored by ita-intro-mirror-fix`, metadata: { job: JOB, seeds: seedsTouched, rows: D.changes.length } });
}

/** Intros that quote a changed LEGO: the #557·I fix tool re-authors them on temporary Sonia; the in-flight seed-201 actor's seeds are held. */
function reMirrorIntros(log) {
  const { spawnSync } = require('child_process');
  const script = path.join(__dirname, 'ita-intro-mirror-fix-2026-09-28.cjs');
  const r = spawnSync(process.execPath, [script, '--exclude-actor', HELD_ACTOR], { encoding: 'utf8', env: { ...process.env, APPLY: '1', INTRO_MIRROR_AT_EXIT: '0' }, timeout: 20 * 60 * 1000 });
  log.introFix = { status: r.status, tail: String(r.stdout || '').split('\n').slice(-40).join('\n'), stderr: String(r.stderr || '').slice(-4000) };
  return r.status;
}

// ── Report ───────────────────────────────────────────────────────────────────────────────
const NOTICED = [
  'S0372L03B03 "she was trying to create | stava provando a creare qualcosa": the Italian carries *qualcosa* that the English never had; now that B02 and B03 read the same English this is the one new strict ZUT group (57 → 57 overall). Suggest English "she was trying to create something", or drop *qualcosa* — your call.',
  'S0396L05 "are ready | sono pronti": four of its five phrases read "everybody else are ready" (pre-existing English agreement slip); the LEGO itself is in your list because the seed subject is "everybody else".',
  'S0281L02B03 "it doesn\'t mind me | non mi dispiace": a pre-existing row that clashes with S0155L01 "I don\'t mind"; seen while checking ZUT, not in this ruling.',
  'The ten LEGOs whose intros were re-authored had their OLD Sonia intro clips still keyed to the LEGO by course_audio.lego_id after the re-mirror; those keys were cleared (assets kept) so phase8 cannot count the old line as the intro.',
  'The S0151L01 / S0159L01 hold: "that wasn\'t | non era" would sit beside S0151L01B03 "that wasn\'t | quello non era" (and S0086L01 "it wasn\'t | non era"); "that isn\'t | non è" beside S0159L01B03 "that isn\'t | quello non è" and S0282L01 "that\'s not | non è". One known, two Italians — held rather than created; the B03 rows with *quello* are the ones to rule on.',
];
function report(D, extra) {
  const L = [];
  L.push(`# ita_for_eng — missing English subject pronouns: before → after (job ${JOB}, 2026-09-28)`, '');
  L.push(`**Kai's ruling:** the person must match on both sides. Where the Italian has a person-marked finite verb (volevamo, sarei, sarebbe, faresti …) and no expressed subject, the English carries the subject pronoun. Italian never changed.`, '');
  L.push(`**Coverage:** ${D.coverage.scanned} rows scanned — ${Object.entries(D.coverage.byKind).map(([k, v]) => `${v} ${k}`).join(', ')}. Flagged sure: ${D.hits.filter((h) => h.verdict === 'flag').length}; unsure: ${D.hits.filter((h) => h.verdict === 'flag?').length}; borderline (listed, not edited): ${D.hits.filter((h) => h.verdict.startsWith('borderline') || h.verdict === 'flag:gerund').length}. Changed: ${D.changes.length} rows (${D.changes.filter((c) => c.kind === 'lego').length} LEGOs, ${D.changes.filter((c) => c.kind === 'component').length} components, ${D.changes.filter((c) => c.kind === 'build' || c.kind === 'use').length} phrases). For Kai: ${D.kai.length}. Seeds 201 and 203 held for their own jobs.`, '');
  if (extra.calibration) L.push(`**Calibration:** ${extra.calibration.olds.map((o) => `${o.id} "${o.known} | ${o.target}" → ${o.verdict} ${o.pronoun || ''}`).join('; ')}. Controls: ${extra.calibration.controls.map((c) => `"${c.known} | ${c.target}" → ${c.verdict}${c.pronoun ? ' ' + c.pronoun : ''}`).join('; ')}.`, '');
  if (extra.zut) L.push(`**ZUT (strict bidirectional, audit-phrase-zut):** ${extra.zut.before} → ${extra.zut.after}. ${extra.zut.newly.length ? 'New: ' + extra.zut.newly.join('; ') : 'None new.'} ${extra.zut.resolved.length ? 'Resolved: ' + extra.zut.resolved.join('; ') : ''}`, '');
  if (extra.unapproved) L.push(`**Seeds unapproved:** ${extra.unapproved.join(', ')}.`, '');
  L.push('## Changed rows (English only)', '', '| Seed | Row | Before | After | Italian |', '|---|---|---|---|---|');
  for (const c of D.changes.sort((a, b) => a.seed - b.seed || a.id.localeCompare(b.id))) L.push(`| ${c.seed} | ${c.id}${c.kind === 'lego' ? ' (LEGO)' : c.kind === 'component' ? ' (component)' : ''} | ${c.from} | **${c.to}** | ${c.target} |`);
  const tense = D.changes.filter((c) => /tense/.test(c.why || ''));
  if (tense.length) L.push('', `Two rows got more than a pronoun: ${tense.map((c) => c.id).join(', ')} read "said it …" over *l'avrei detto …* — the conditional perfect was missing along with the "I". Your call if you want them back to a bare pronoun.`);
  if (D.exceptions.length) {
    L.push('', '## Containment exceptions (not edited — your call)', '', 'A LEGO now carries a pronoun, and one of its phrases already carried a different subject before the same chunk (or its components do not tile it). Two Englishes over one Italian is not a defect by your rule; listed so you can see them.', '', '| Row | LEGO now | Phrase / components | Italian |', '|---|---|---|---|');
    for (const e of D.exceptions) L.push(`| ${e.id} | ${e.legoTo} | ${e.known}${e.note ? ' — ' + e.note : ''} | ${e.target} |`);
  }
  L.push('', '## For Kai — undecidable or invented pronoun (not edited)', '', '| Seed | Row | English | Italian | Why | Suggestion |', '|---|---|---|---|---|---|');
  for (const k of D.kai.sort((a, b) => a.sn - b.sn || a.id.localeCompare(b.id))) L.push(`| ${k.sn} | ${k.id}${k.kind === 'lego' ? ' (LEGO)' : k.kind === 'component' ? ' (component)' : ''} | ${k.known} | ${k.target} | ${k.why} | ${k.suggest || (k.pronoun ? cap(k.pronoun.toLowerCase()) + ' ' + k.known : '')} |`);
  L.push('', '## Borderline — excluded by your rule, listed for the record', '', 'Imperative-shaped Italian against a bare English verb, subjunctive fragments, and -ing fragments with no hand form.', '', '| Seed | Row | English | Italian | Class |', '|---|---|---|---|---|');
  for (const b of D.borderline.sort((a, b) => a.sn - b.sn || a.id.localeCompare(b.id))) L.push(`| ${b.sn} | ${b.id} | ${b.known} | ${b.target} | ${b.verdict.replace('borderline:', '')}${b.why ? ' — ' + b.why : ''} |`);
  if (D.skipped.length) { L.push('', '## Held (another job owns the seed)', ''); for (const s of D.skipped) L.push(`- ${s.id}: ${s.known} | ${s.target} — ${s.why}`); }
  if (extra.sonia) L.push('', '## English re-voiced on temporary Sonia — Charlotte re-voice list', '', extra.sonia);
  L.push('', '## Noticed on the way, not touched', '', ...NOTICED.map((n) => `- ${n}`));
  return L.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────────────────
async function main() {
  const APPLY = process.env.APPLY === '1';
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  if (arg('--report-from')) {
    const applied = JSON.parse(fs.readFileSync(arg('--report-from'), 'utf8'));
    const extra = {};
    if (arg('--zut-before') && arg('--zut-after')) {
      const b = JSON.parse(fs.readFileSync(arg('--zut-before'), 'utf8')), a = JSON.parse(fs.readFileSync(arg('--zut-after'), 'utf8'));
      const key = (g) => g.known_norm; const bk = new Set(b.bidirectionalStrict.map(key)), ak = new Set(a.bidirectionalStrict.map(key));
      const show = (g) => `"${g.known_norm}" → ${g.distinct_targets.map((t) => `"${t.example.target}" (${t.example.seed} ${t.example.phrase_role || 'lego'})`).join(' / ')}`;
      extra.zut = { before: b.counts.bidirectional.strict, after: a.counts.bidirectional.strict, newly: a.bidirectionalStrict.filter((g) => !bk.has(key(g))).map(show), resolved: b.bidirectionalStrict.filter((g) => !ak.has(key(g))).map(show) };
    }
    if (arg('--sonia')) {
      const f = JSON.parse(fs.readFileSync(arg('--sonia'), 'utf8'));
      extra.sonia = ['| Row | English | Clip |', '|---|---|---|', ...(f.filled || []).map((x) => `| ${short(x.id)} | ${x.text} | ${x.result || x.audioId || ''} |`)].join('\n');
    }
    extra.unapproved = applied.unapproved?.seeds;
    const { Client } = require('pg'); const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
    try { learnBaseVerbs((await loadRows(pg)).map((r) => r.known)); extra.calibration = await calibrate(pg); } finally { await pg.end(); }
    const D = applied.plan; D.changes = D.changes || [];
    const md = report(D, extra);
    fs.writeFileSync(arg('--out'), md); console.log(`report → ${arg('--out')} (${md.length} chars)`); return;
  }
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, apply: APPLY, started: new Date().toISOString(), problems: [] };
  try {
    const rows = await loadRows(pg);
    learnBaseVerbs(rows.map((r) => r.known));
    if (argv.includes('--calibrate')) {
      const cal = await calibrate(pg);
      console.log('CALIBRATION (old text from content_edit_events):'); for (const o of cal.olds) console.log(`  ${o.id}: "${o.known}" | "${o.target}" → ${o.verdict} ${o.pronoun || ''}  [${o.engHead}/${o.itaHead}:${o.person}]`);
      console.log('CONTROLS:'); for (const c of cal.controls) console.log(`  "${c.known}" | "${c.target}" → ${c.verdict} ${c.pronoun || ''}   (${c.note})`);
      const ok = cal.olds.every((o) => o.verdict === 'flag') && !cal.controls[0].verdict.startsWith('flag') && cal.controls[1].verdict.startsWith('ok') && cal.controls[2].verdict.startsWith('ok');
      console.log(ok ? 'calibration holds' : 'CALIBRATION FAILS');
      process.exitCode = ok ? 0 : 1; return;
    }
    const D = decide(rows);
    log.coverage = D.coverage;
    console.log(`\n══ ${COURSE} — missing English subject — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
    console.log(`coverage: ${D.coverage.scanned} rows (${Object.entries(D.coverage.byKind).map(([k, v]) => `${v} ${k}`).join(', ')}); verdicts ${JSON.stringify(D.coverage.verdicts)}`);
    console.log(`plan: ${D.changes.length} changes, ${D.kai.length} for Kai, ${D.borderline.length} borderline, ${D.exceptions.length} containment exceptions, ${D.skipped.length} held`);
    for (const c of D.changes) console.log(`  ${c.rule.padEnd(7)} ${c.kind.padEnd(9)} ${c.id.padEnd(12)} "${c.from}" → "${c.to}"   (${c.target})   ${c.why}`);
    console.log('for Kai:'); for (const k of D.kai) console.log(`  ${k.kind.padEnd(9)} ${k.id.padEnd(12)} "${k.known}" | "${k.target}" — ${k.why}`);
    console.log('borderline:'); for (const b of D.borderline) console.log(`  ${b.verdict.padEnd(24)} ${b.id.padEnd(12)} "${b.known}" | "${b.target}"`);
    console.log('exceptions:'); for (const e of D.exceptions) console.log(`  ${e.id.padEnd(24)} LEGO→"${e.legoTo}"  "${e.known}" | "${e.target}"${e.note ? ' — ' + e.note : ''}`);
    // ZUT: a change that would CREATE a one-known-two-targets clash is held for Kai (machine verifies, Kai judges — never hand him a gate failure); a clash the exact pair already lives with is reported, not held
    const Z = await zutAgainstCourse(pg, D.changes);
    log.zutInTool = Z.clashes;
    for (const hld of Z.held) {
      const lid = hld.change.kind === 'lego' ? hld.change.id : null;
      const idx = D.changes.indexOf(hld.change); if (idx >= 0) D.changes.splice(idx, 1);
      D.kai.push({ id: hld.change.id, sn: hld.change.seed, kind: hld.change.kind, known: hld.change.from, target: hld.change.target, why: `adding the pronoun would create a ZUT clash (one known, two targets): "${hld.change.to}" vs ${hld.vs.join('; ')} — your call on which Italian stays`, suggest: hld.change.to });
      if (lid) { // its fragments and components follow the LEGO
        for (const c of D.changes.filter((c) => c.id.startsWith(lid) && c.id !== lid)) { D.changes.splice(D.changes.indexOf(c), 1); D.kai.push({ id: c.id, sn: c.seed, kind: c.kind, known: c.from, target: c.target, why: `follows its LEGO ${lid} (held for the ZUT clash)`, suggest: c.to }); }
        D.exceptions = D.exceptions.filter((e) => e.lego !== lid);
      }
    }
    await guards(pg, rows, D, log.problems);
    console.log(`ZUT against the course (new pairs vs live rows): ${Z.clashes.length ? '\n  ' + Z.clashes.join('\n  ') : 'no clash'}\n  held for Kai (clash would be NEW): ${Z.held.map((h) => h.change.id).join(', ') || 'none'}; pre-existing for the exact pair: ${D.changes.filter((c) => c.zutPreexisting).map((c) => c.id + '↔' + c.zutPreexisting.join('/')).join(', ') || 'none'}`);
    log.plan = D;
    if (log.problems.length) console.log('\nPROBLEMS:\n  ' + log.problems.join('\n  ')); else console.log('\nguards hold: live text matches, every change is a leading pronoun (or a listed hand row), every changed phrase contains its LEGO, no held seed touched');
    if (APPLY && !log.problems.length) {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
      await applyContent(pg, supabase, rows, D, log);
      console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)} audioPass=${JSON.stringify(log.audioPass)}`);
      const st = reMirrorIntros(log);
      console.log(`intro re-mirror (ita-intro-mirror-fix, APPLY, held actor ${HELD_ACTOR}): exit ${st}\n${log.introFix.tail}`);
      const ids = D.changes.map((c) => (c.kind === 'lego' ? c.id : `${COURSE}:${c.id}`));
      console.log(`\nENGLISH prompts to fill on temporary Sonia (${ids.length}):\n  SCOPE=ids IDS=${ids.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
      log.soniaIds = ids;
    }
    const ri = argv.indexOf('--report');
    if (ri >= 0) { const cal = await calibrate(pg); fs.writeFileSync(argv[ri + 1], report(D, { calibration: cal })); console.log(`report → ${argv[ri + 1]}`); }
    const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 2));
    console.log(`Wrote ${f}`);
  } finally { await pg.end(); }
}

module.exports = { classify, engHead, itaHead, decide, learnBaseVerbs, pronounBeforeChunk, seedSubjectFor, containsWords, report, HAND, HELD_SEEDS };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
