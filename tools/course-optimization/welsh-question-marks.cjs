#!/usr/bin/env node
'use strict';
// welsh-question-marks.cjs — Aran's ruling, 2026-10-21 (job #504).
//
// Recording artists read a Welsh line as a statement unless it SAYS it is a
// question, and colloquial Welsh often doesn't ("fedri di ddod" = "can you come"
// or "you can come"). So every row whose English is a question carries a '?' on
// BOTH the Welsh and the English. This file decides, per row, from the text alone:
//
//   CERTAIN_Q  — the English is a question and the Welsh is a question form (or
//                at least a form a question can take): add '?' to whichever side lacks it.
//   CERTAIN_S  — neither side reads as a question: leave it.
//   UNSURE     — the sides disagree, or the Welsh opens with a verb that could be a
//                question with no particle (Aran's specimen S1466L02B03, North:
//                "she will be able to throw some postcards | fedrith hi daflu …").
//                These go to Aran's tap review; nothing here guesses them.
//
// Read-only on the database: it reads Popty's GET /api/production/:course/seeds
// (seeds → LEGOs → phrases) and writes nothing. The apply goes through Popty's
// edit-batch door (see --plan below), text-only: each linked clip is relabelled
// to the new text FIRST, then the row, in one batch, so the take stays linked and
// nothing lands on a Re-record card (the trailing '?' is part of the clip key since
// 20261013_audio_key_keeps_question_mark.sql, so a row-only edit would unlink it).

// ---------- English ----------
const E_AUX = new Set(('do does did don\'t doesn\'t didn\'t is isn\'t are aren\'t am was wasn\'t were weren\'t ' +
  'can can\'t could couldn\'t will won\'t would wouldn\'t shall should shouldn\'t have haven\'t has hasn\'t had hadn\'t ' +
  'may might must mustn\'t').split(' '));
const E_PRON = new Set('i you he she it we they there this that these those anyone anybody someone somebody everyone everybody'.split(' '));
const E_DET = new Set('the a an my your his her our their its any some all both every each no one people'.split(' '));
const E_WH = new Set('what why where when who whom whose which how'.split(' '));
// "it's", "they're", "I've": a subject, not an auxiliary ("why it's not working" is a relative)
const E_PRON_CONTRACTION = /^(?:i|you|he|she|it|we|they|there|that)'(?:s|re|m|ve|ll|d)$/;
// "do this", "have it", "don't go": imperative, not a question
const E_IMPERATIVE_AUX = new Set(['do', 'have', 'don\'t']);
const E_DISCOURSE = /^(?:(?:yes|no|yeah|okay|ok|well|so|and|but|oh|right|then|now|hey|please|sorry|excuse me|of course|thank you(?: very much)?|thanks|hello|hi)\b[,!.]?\s+)+/;
const E_TAG = /,\s*(?:(?:is|are|was|were|do|does|did|will|would|can|could|should|have|has|had|won|isn|aren|wasn|weren|don|doesn|didn|wouldn|can|couldn|shouldn|haven|hasn|hadn)(?:n't|'t)?\s+(?:it|he|she|they|we|you|i|there)|right|eh)\s*\??$/;

function normE(s) {
  return String(s || '').toLowerCase().replace(/[’‘]/g, '\'').replace(/\s+/g, ' ').trim();
}
function words(s) { return s.replace(/[^a-z' ]+/g, ' ').trim().split(/\s+/).filter(Boolean); }

/** Does this English clause open as a question? */
function englishClauseIsQuestion(clause) {
  const c = clause.replace(E_DISCOURSE, '');
  const w = words(c);
  if (!w.length) return false;
  const [a, b, c2] = w;
  // wh- openers
  const wh = a.replace(/'s$|'re$|'ll$|'d$/, '');
  if (E_WH.has(wh)) {
    if (a !== wh) return true;                        // what's, where's, who's, how's
    if (w.length === 1) return true;                  // "why", "when?"
    if (b === 'not' || b === 'about' || b === 'come' || b === 'else') return true; // why not, what about X, how come
    if (b === 'a' || b === 'an') return false;        // what a day
    if (E_PRON.has(b) && b !== 'that' && b !== 'this' && b !== 'there') return false; // when I was young, what you need
    // wh + up to 3 words (how many children, which one, what time) then an aux / finite verb
    if (E_PRON_CONTRACTION.test(b)) return false;
    for (let i = 1; i < Math.min(w.length, 5); i++) {
      if (E_PRON_CONTRACTION.test(w[i])) return false;
      if (E_AUX.has(w[i]) || /'s$|'re$/.test(w[i])) {
        // "what time I leave" → aux must come before any subject pronoun
        const before = w.slice(1, i);
        if (before.some((x) => E_PRON.has(x) && x !== 'that' && x !== 'this')) return false;
        return true;
      }
      if (E_PRON.has(w[i]) && w[i] !== 'that' && w[i] !== 'this') return false;
    }
    // who/what as subject + finite verb: "who wants coffee", "what happened"
    if ((wh === 'who' || wh === 'what' || wh === 'which') && b && /(?:s|ed)$/.test(b) && !E_DET.has(b)) return true;
    if (wh === 'how' && w.length <= 3 && !E_AUX.has(b)) return false; // how nice, how lovely
    return false;
  }
  if (E_AUX.has(a)) {
    if (!b) return false;
    if (E_IMPERATIVE_AUX.has(a)) {
      // do you / have you / don't you → question; do it / have some tea / don't go → imperative
      return E_PRON.has(b) && !['it', 'this', 'that', 'these', 'those'].includes(b);
    }
    // "is that they're not…" / "is that we don't know": a complement clause, not a question
    if ((b === 'that' || b === 'this') && c2 && (E_PRON.has(c2) || E_PRON_CONTRACTION.test(c2))) return false;
    if (E_PRON.has(b) || E_DET.has(b)) return true;
    if (b === 'not' && c2 && E_PRON.has(c2)) return true; // "is not that…" rare
    // proper names: "is Mary coming" — capitalised in the source; handled by caller passing raw case
    return false;
  }
  if (a === 'shall' || a === 'how') return true;
  return false;
}

function englishSignal(raw) {
  const s = normE(raw);
  const mark = /\?/.test(s);
  if (E_TAG.test(s)) return { q: true, mark, form: 'tag', wh: false };
  // the opening clause, or a clause after a comma / "but" ("thank you, but why", "when I go, can you call")
  const clauses = s.replace(/[?!.]+$/, '').split(/,\s*|\s+but\s+|;\s*/);
  for (let i = 0; i < clauses.length; i++) {
    if (englishClauseIsQuestion(clauses[i])) {
      const first = words(clauses[i].replace(E_DISCOURSE, ''))[0].replace(/'s$|'re$|'ll$|'d$/, '');
      return { q: true, mark, form: i === 0 ? 'open' : 'later', wh: E_WH.has(first) };
    }
  }
  // proper-name subject: "Is Mary coming", "Will Siân be there"
  const rawW = String(raw || '').replace(E_DISCOURSE, '').trim().split(/\s+/);
  if (rawW.length > 1 && E_AUX.has(normE(rawW[0])) && !E_IMPERATIVE_AUX.has(normE(rawW[0])) && /^[A-Z]/.test(rawW[1]) && rawW[1] !== 'I') {
    return { q: true, mark, form: 'open' };
  }
  return { q: mark, mark, form: mark ? 'mark' : null };
}

// ---------- Welsh ----------
function normW(s) {
  return String(s || '').toLowerCase().replace(/[’‘ʼ]/g, '\'').replace(/\s+/g, ' ').trim();
}
const W_DISCOURSE = /^(?:(?:wrth gwrs|diolch(?: yn fawr)?|ond|felly|iawn|reit|wel|ok|oce|ocê|helo|sori|esgusodwch fi|ac wedyn|wedyn|yna|ac|a|ia|ie|yndw|ydw|rŵan|nawr|dim problem|plîs|plis|tro nesa'?|a dweud y gwir)\b[,!.]?\s+)+/;
// An answer word standing alone before a comma ("oes, mae gynnon ni…") answers a question; it isn't one.
const W_ANSWER = /^(?:oes|nac oes|ydy|ydi|ydyn|ydan|ydach|ydych|ydw|wyt|do|naddo|ie|ia|na|nage|nage|medra|medran|gallaf|byddaf|bydda|baswn|yndi|yndy)$/;
// Openers that only a question takes — and only with something after them ("ydy" alone is a fragment).
const W_STRONG = [
  // (South "ŷn ni'n" / "ŷch chi'n" are statements, so they are not here.)
  // ...and not the copula before a clause ("ydy nad ydyn nhw…" = "is that they're not…").
  /^(?:ydy|ydi|ydyn|ydan|ydach|ydych|ydw|ydyw|yw|wyt|oes|on'd|onid|ai|nag wyt|nag ŷch|nag ydy|nag yw|nag oes|nag ydych|a ydy|a oes|a wyt|a fydd|a ga|a fedr|a all|a wnaeth|a wnei) (?!nad\b|nag\b|bod\b|fod\b|mai\b|taw\b)\S/,
  /^oni (?!bai)\S/,
  /^(?:ga i|gaf i|ga' i)\b/,
  /^(?:beth am|be' am|be am)\b/,
];
// Question words; a free relative ("what I want is") opens the same way, so the English decides.
const W_WH = /^(?:pam|beth|be'|be|ble|lle|sut|pryd|pwy|faint|pa|sawl|ers pryd|i ble|o ble|i lle|o lle|efo pwy|gyda pwy|am faint|at bwy|i bwy|gan bwy|o bwy|am beth|am be'|am be|efo be'|gyda beth|i beth|i be')(?=$|[\s,?])/;
// Welsh that opens a relative or a "when" clause: never a question.
const W_RELATIVE = /^(?:pan|sydd|sy'n|sy|sy wedi|lle mae|nad|bod|fod|y|yr|a fydd|unrhyw)\b/;
// A verb that opens a sentence with no affirmative particle (mi / fe) and could be a
// question: modal, future, conditional, and 2nd-person past. Colloquially this is BOTH
// "can she…?" and "she can…": Aran's specimen S1466L02B03 "fedrith hi daflu…". With a
// statement English these go to Aran (UNSURE) unless the line is negative or first person.
const W_AMBIG_VERB = /^(?:fedr\w*|feder\w*|alla\w*|alli|allwch|allet|allech|allen|allai|gawn|gei|gewch|geith|gaiff|fyddi|fyddwch|fydd|fyddet|fyddech|fydden|fyddan|fyddai|fyddi|fasa\w*|fase\w*|fysa\w*|ddylet|ddylech|ddylen|ddylai|ddylwn|hoffet|hoffech|licet|liciet|licech|leiciet|leicech|garet|garech|wnei|wnewch|wnân|wnaiff|wneith|wnawn|ddoi|ddowch|ddaw|ddôn|wnest|wnaethoch|welest|welaist|welsoch|glywest|glywaist|glywsoch|est|aethoch|gest|gaethoch|ddest|ddaethoch|roist|roddaist|roesoch|oeddet|oeddat|oeddech|oeddach|wyddost|wyddoch|wyddet|gofiest|ffeindiest|ddechreuest|ddysgest|brynest|gollest|siaradest|deimlest|feddyliest|newidiest|ofynnest|dalest|gysgest|gwrddest|gyfarfuest|fwytest|yfest|wisgest|gofiest|sylwest|ddarllenest|dreuliest|dreiest|drïest)\b/;
// Colloquial forms a question CAN take, but that read as statements by default: they
// let an English question through as CERTAIN, and never send a statement to Aran.
// South radical "gallen nhw / gallet ti" and reported speech "ddudest ti / ddwedest ti" (you said) read as statements.
const W_COLLOQ = /^(?:gall\w*|ddudest|ddwedest|oedd|o'n|oeddwn|oeddan|oeddech|wnaeth|wnaethon|wnes|wnaethoch|welodd|welon|glywodd|glywon|aeth|aethon|gafodd|gaeth|gath|ges|gaethon|ddaeth|ddudodd|ddwedodd|ddaru|ga|gaf|dach|dych|ych|ŷch|ŷn|ti'n|ti|chi'n|fyddan|wna|fedra|alla|ddylwn|faswn|fyswn|liciwn|hoffwn|gallwn)\b/;
const W_TAG = /,\s*(?:(?:on'd|onid|yn|nag) )?(?:ydy|ydi|yw|oes|wyt|ydach|ydyn|oedd|do|naddo|ie|ia|ynde|yndê|e|yw e|tydi|tydy|dydy|dydi)(?: (?:o|hi|e|fe|fo|nhw|ti|chi|ni|i))?\s*\??$/;

function welshSignal(raw) {
  const s = normW(raw);
  const mark = /\?/.test(s);
  const body = s.replace(/[?!.]+$/, '');
  const clauses = body.split(/,\s*|\s+ond\s+/);
  let best = null;
  const rank = { strong: 4, wh: 3, ambig_verb: 2, colloq: 1 };
  const take = (f) => { if (!best || rank[f] > rank[best]) best = f; };
  for (let i = 0; i < clauses.length; i++) {
    const c = clauses[i].replace(W_DISCOURSE, '').trim();
    if (!c || (W_ANSWER.test(c) && i < clauses.length - 1)) continue;
    if (W_RELATIVE.test(c)) { if (i === 0) best = best || 'relative'; continue; }
    if (W_STRONG.some((re) => re.test(c))) { take('strong'); break; }
    if (W_WH.test(c)) { take('wh'); continue; }
    if (W_AMBIG_VERB.test(c)) {
      // negative ("fyddan ni ddim", "wnest ti'm") or first person ("fedra i") reads as a statement
      const neg = /^\S+ (?:\S+ )?(?:ddim|dim|'m)\b|^\S+'m\b/.test(c);
      const first = /^\S+ (?:i|ni)\b/.test(c);
      take(neg || first ? 'colloq' : 'ambig_verb'); continue;
    }
    if (W_COLLOQ.test(c)) { take('colloq'); continue; }
  }
  if (W_TAG.test(body) && rank[best || 'colloq'] < rank.strong) best = 'strong';
  return { mark, form: best };
}

// A fragment that stops on a word that needs more after it ("do you mind if") is not a
// question a reader can voice; Aran decides those.
const E_DANGLING = /\b(?:if|that|the|a|an|and|but|or|because|than|of|whether)\s*\??$/;
const W_DANGLING = /(?:^|\s)(?:os|bod|fod|mai|y|yr|a|ac|ond|nag|achos|na|â|ag)\s*\??$/;

/**
 * Classify one row. `seedKnown` (the seed's English) lets a wh-fragment that sits INSIDE
 * its seed ("what was going to happen" in "I didn't know what was going to happen") be
 * recognised as a possible relative clause rather than a question.
 */
function classify(known, target, { seedKnown = null } = {}) {
  const e = englishSignal(known);
  const w = welshSignal(target);
  if (e.q && !e.mark && !w.mark && w.form !== 'relative') {
    if (e.wh && words(normE(known)).length === 1) {
      return { cls: 'UNSURE', why: 'a single question word; it is also used inside statements', e, w };
    }
    if (E_DANGLING.test(normE(known)) || W_DANGLING.test(normW(target))) {
      return { cls: 'UNSURE', why: 'a fragment that stops mid-clause; a question mark may not belong on it', e, w };
    }
    if (e.wh && seedKnown) {
      const k = normE(known).replace(/[?.!]+$/, ''), sk = normE(seedKnown);
      if (k && sk.indexOf(k) > 0) return { cls: 'UNSURE', why: 'the wh-words sit inside the seed, so this may be a relative clause, not a question', e, w };
    }
  }
  const wQ = w.mark || w.form === 'strong';
  // An English wh-question needs a Welsh wh-word (or a '?' / question opener): "who wants |
  // sydd isio" and "when | pan" are relatives, not questions.
  const eWh = e.q && e.wh && !e.mark;
  const wCan = wQ || w.form === 'wh' || (!eWh && (w.form === 'ambig_verb' || w.form === 'colloq'));
  let cls, why;
  if (e.q && wCan) {
    cls = 'CERTAIN_Q'; why = `en:${e.form} cy:${w.mark ? 'mark' : w.form}`;
  } else if (e.q && w.form === 'relative' && !e.mark) {
    cls = 'CERTAIN_S'; why = 'English wh-word is a relative/"when" clause, as the Welsh shows';
  } else if (e.q) {
    cls = 'UNSURE'; why = 'the English reads as a question; the Welsh has no question form';
  } else if (wQ) {
    cls = 'UNSURE'; why = w.mark ? 'the Welsh has a "?" but the English is not a question' : 'the Welsh opens as a question; the English is not one';
  } else if (w.form === 'ambig_verb' && !/^(?:yes|no|of course|sure|okay|ok)\b/.test(normE(known))) {
    cls = 'UNSURE'; why = 'the Welsh opens with a verb and no mi/fe, so it can be a question; the English is a statement';
  } else {
    cls = 'CERTAIN_S'; why = '';
  }
  return { cls, why, e, w };
}

/** The text with exactly one '?' at the end and no space before it. */
function withQuestionMark(text) {
  const t = String(text).replace(/\s+$/, '');
  if (/\?\s*$/.test(t)) return t.replace(/\s+\?$/, '?');
  return t.replace(/[\s.!…]+$/, '') + '?';
}

module.exports = { classify, englishSignal, welshSignal, withQuestionMark };

// ---------- CLI: classify a course read from Popty ----------
if (require.main === module) {
  const fs = require('fs');
  const args = process.argv.slice(2);
  const course = args[0];
  if (!course) { console.error('usage: welsh-question-marks.cjs <course> [--from file.json] [--out classified.json]'); process.exit(64); }
  const fromI = args.indexOf('--from');
  const outI = args.indexOf('--out');
  (async () => {
    let data;
    if (fromI >= 0) data = JSON.parse(fs.readFileSync(args[fromI + 1], 'utf8'));
    else {
      const r = await fetch(`${process.env.POPTY_URL || 'http://localhost:3470'}/api/production/${course}/seeds?status=all`, { headers: { 'x-agent-id': 'welsh-question-marks' } });
      data = await r.json();
    }
    const rows = [];
    const push = (kind, id, row, extra = {}) => rows.push({ kind, id, known: row.known_text, target: row.target_text,
      audio: { known: row.known_audio_id || null, target1: row.target1_audio_id || null, target2: row.target2_audio_id || null },
      ...extra, ...classify(row.known_text, row.target_text, { seedKnown: extra.seedKnown }) });
    for (const s of data.seeds) {
      push('seed', s.seed_number, s);
      for (const l of s.legos || []) {
        push('lego', l.lego_id, l, { seedKnown: s.known_text });
        (l.components || []).forEach((c, i) => {
          if (c && typeof c === 'object') rows.push({ kind: 'lego_component', id: `${l.lego_id}#${i}`, lego_id: l.lego_id, index: i,
            known: c.known, target: c.target, audio: {}, ...classify(c.known, c.target, { seedKnown: s.known_text }) });
        });
        for (const p of l.basket_phrases || []) push('phrase', p.id, p, { role: p.phrase_role, seedKnown: s.known_text });
      }
    }
    const counts = {};
    for (const r of rows) { counts[r.kind] = counts[r.kind] || { CERTAIN_Q: 0, CERTAIN_S: 0, UNSURE: 0, CERTAIN_Q_needs_edit: 0 };
      counts[r.kind][r.cls]++;
      if (r.cls === 'CERTAIN_Q' && (withQuestionMark(r.known) !== r.known || withQuestionMark(r.target) !== r.target)) counts[r.kind].CERTAIN_Q_needs_edit++; }
    console.log(JSON.stringify({ course, counts }, null, 1));
    if (outI >= 0) fs.writeFileSync(args[outI + 1], JSON.stringify(rows));
  })().catch((e) => { console.error(e); process.exit(1); });
}
