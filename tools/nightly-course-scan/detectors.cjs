'use strict'
/**
 * Nightly course scan (cs #237·AL, Kai approved 24 Nov 2026) — the detectors this scan ADDS on top of
 * ops/paid-cleanup-scan-447/detect.cjs, run over the same dump (copy-read.cjs dump, from the nightly QA copy).
 * NO DATABASE, NO NETWORK: input is the dump object, output is candidate hits. A hit is a CANDIDATE to read,
 * never a defect (canon R0.9); the night worker hand-checks a sample of every family before Kai sees it.
 *
 * WHY EACH ONE EXISTS AND WHAT IT DELIBERATELY DOES NOT FLAG
 *  untaught_target  P1 + K29 (Aran/Tom 13 Oct): a played phrase may use any word, in that EXACT form, taught by a LEGO
 *                   EARLIER IN RUNNING ORDER — every LEGO of an earlier seed, and in its OWN seed the LEGOs up to and
 *                   including the phrase's own LEGO (Kai 24 Nov, Welsh S117: "a seed's own LEGOs are where its words get
 *                   taught, at that seed"). Words inside a chunk count (K29). The seed SENTENCE teaches nothing by itself.
 *                   Welsh only: a soft-mutated form counts as the same word (K29). Spaceless targets: NOT RUN.
 *                   Breton (cs #342·AL): soft, spirant, hard and mixed mutation all count as the same word
 *                   (bretonRadicals) — Kai's brief for the Breton scan; K29 names Welsh alone, so the hit carries
 *                   mutation_only=true when it would have been a hit WITHOUT this tolerance, for Kai to rule on.
 *                   Breton c'h / C'H is one letter: never split at its apostrophe (c'hoant was read as "hoant").
 *                   detect.cjs's own untaught_target counts every LEGO of the phrase's seed (including later ones) and
 *                   the seed sentence; this one is the stricter running-order reading the brief asks for.
 *  untaught_known   P1 on the KNOWN side, English and (cs #342·AL) French known. K6: the known side is controlled by LEXEME, not form, so
 *                   an inflection, case or contraction of a taught word is NOT a hit (lexKeys below); only a genuinely
 *                   new word is. K7: a known-side hit is never serious by definition — the hand-check asks "can the
 *                   learner still produce the answer?". French known (#342·AL, bre_for_fra): frLexKeys below — elided
 *                   clitics split (j'ai = j + ai), accents folded, a small irregular table (être/avoir/aller/faire/
 *                   pouvoir/vouloir/savoir/devoir/dire/venir/voir/prendre) and inflection endings stripped to a stem.
 *                   Every other known language: NOT RUN, and the sheet says so.
 *  gloss_absent     known/target mismatch: the row's target DOES contain its own LEGO (P17 holds) but its English does
 *                   not carry that LEGO's English (lexeme-tolerant, ignoring to/a/an/the). Calibrated on C0108
 *                   (hope -> expect) and the jpn と話して rows where the English says "mentioned".
 *                   cs #342·AL: also run over a FRENCH known (bre_for_fra) with frLexKeys and FR_GLOSS_IGNORE.
 *  digits_mismatch  both sides carry digits and the digits differ.
 *  garble_tail      the same row ENDING (last two words; last 5 chars for spaceless targets) recurs across many
 *                   LEGOs that do not contain it, while the English of those rows has no common word — the shape a
 *                   generator leaves when it bolts one tail onto unrelated rows (jpn ~と話してた, d/0fc0fa6f).
 *  garble_doubled   the same word twice in a row (target or known). garble_script: Latin letters inside a non-Latin
 *                   target, or non-Latin letters in an English known. cs #342·AL: for a Latin/Latin pair (bre_for_fra)
 *                   a non-Latin letter on EITHER side fires too — the old rule could never see a Japanese word inside
 *                   a Breton target or a French known.
 *  wrong_side       cs #342·AL, Breton/French only (WRONG_SIDE below): a Breton target that reads as French (>= 2
 *                   French-only function words), or a French/English known that reads as Breton (c'h / zh / ñ, or
 *                   >= 2 Breton-only words). A CANDIDATE list: loanwords and names are read out by hand.
 *                   side 'target_spelling': a Breton target word spelled with letters peurunvan Breton does not use
 *                   (q x ç é è à â ô î ï ë œ, c not in ch/c'h, or -tion-): French or German leaking into the Breton.
 *                   Known positive: bre_for_fra seed 94 "evit ma funktionno" (German funktionieren), 25 Nov copy.
 *  bre_grammar      cs #342·AL, Breton targets only, three spelling-level rules with no judgement in them (breGrammar):
 *                   article — "an" before a vowel or h/n/d/t, "al" before l, "ar" otherwise (positive: S0094 "ar hent");
 *                   hag — "hag" only before a vowel ("hag ma zad" -> "ha ma zad"); da_ma — "da ma"/"da da" contract to
 *                   "d'am"/"d'az". Read by hand: a capital, a quoted word or a name can sit behind any of them. garble_punct: ",," ".." " ," leading
 *                   punctuation, empty text.
 *  lego_absent      P17/K8: a played row whose target does not contain its own LEGO, by the builder's own
 *                   containment (separable verbs included). Classed: "near" = every missing LEGO word has a close
 *                   variant in the row (inflection: K8 says exact form, minor softening OK — read by hand), "absent" =
 *                   a LEGO word is simply not there (the strong class). Welsh soft mutation is not a miss.
 *  silent_lego      a NEW LEGO with no audio on any slot (the dump only carries a lego_debut row when a slot is set).
 *                   Null slots on played rows are detect.cjs's empty_audio.
 * Calibrations (each detector's known positive) live in calibration.json beside this file.
 */
const path = require('path')
const R = path.resolve(__dirname, '../..')
const { normalizeForContainment } = require(R + '/services/course-builder/lib/text-normalization.cjs')
const { phraseContainsLego } = require(R + '/services/course-builder/lib/separable-verbs.cjs')
const { isChinese } = require(R + '/services/course-builder/lib/language-config.cjs')

const SPACELESS_EXTRA = new Set(['tha', 'lao', 'mya', 'khm'])
const toks = (t) => (String(t || '').toLowerCase().normalize('NFC').replace(/[ً-ْ]/g, '').replace(/[’‘]/g, "'")
  .match(/[\p{L}\p{M}\p{N}]+(?:'[\p{L}\p{M}]+)*/gu) || [])
const isNum = (w) => /^\p{N}+$/u.test(w)

// ── Welsh soft mutation (K29: Welsh alone counts a soft-mutated form as the same word) ──
function welshRadicals(w) {
  const out = new Set([w])
  const add = (x) => out.add(x)
  if (w.startsWith('dd')) add('d' + w.slice(2))
  else if (w.startsWith('d')) add('t' + w.slice(1))
  if (w.startsWith('b')) add('p' + w.slice(1))
  if (w.startsWith('g')) add('c' + w.slice(1))
  if (w.startsWith('f') && !w.startsWith('ff')) { add('b' + w.slice(1)); add('m' + w.slice(1)) }
  if (w.startsWith('l') && !w.startsWith('ll')) add('ll' + w.slice(1))
  if (w.startsWith('r') && !w.startsWith('rh')) add('rh' + w.slice(1))
  if (/^[aeiouwyâêîôûŵŷ]/.test(w)) add('g' + w)
  return out
}

// ── Breton mutation (cs #342·AL): from a possibly-mutated form back to every radical it could come from ──
function bretonRadicals(w) {
  const out = new Set([w]), add = (x) => out.add(x)
  if (w.startsWith("c'h")) { add('g' + w.slice(3)); add('k' + w.slice(3)) }              // soft g->c'h, spirant k->c'h
  else if (w.startsWith('gw')) add('kw' + w.slice(2))                                   // hard? (kw<-gw) rare; kept symmetric
  else if (w.startsWith('g')) add('k' + w.slice(1))                                     // soft k->g
  if (w.startsWith('w')) add('gw' + w.slice(1))                                         // soft/mixed gw->w
  if (w.startsWith('d')) add('t' + w.slice(1))                                          // soft t->d
  if (w.startsWith('z')) { add('d' + w.slice(1)); add('t' + w.slice(1)) }              // soft d->z, spirant t->z
  if (w.startsWith('b')) add('p' + w.slice(1))                                          // soft p->b
  if (w.startsWith('v')) { add('b' + w.slice(1)); add('m' + w.slice(1)) }              // soft/mixed b->v, m->v
  if (w.startsWith('f')) add('p' + w.slice(1))                                          // spirant p->f
  if (w.startsWith('p')) add('b' + w.slice(1))                                          // hard b->p
  if (w.startsWith('t')) add('d' + w.slice(1))                                          // hard/mixed d->t
  if (w.startsWith('k') && !w.startsWith('kw')) add('g' + w.slice(1))                   // hard g->k
  if (w.startsWith('kw')) add('gw' + w.slice(2))                                        // hard gw->kw
  return out
}
// Breton tokens: split elisions (m'am = m + am, n'eo = n + eo) but never the c'h letter.
const bretonSplit = (ws) => ws.flatMap((w) => w.replace(/c'h/g, 'c\u02bch').split("'").map((x) => x.replace(/c\u02bch/g, "c'h"))).filter((w) => w.length > 1)

// ── English lexeme keys (K6: known side controlled by lexeme, not form) ──
const IRREG = Object.fromEntries(Object.entries({
  be: 'am is are was were been being', have: 'has had having', do: 'does did done doing', go: 'goes went gone going',
  say: 'said says', make: 'made', get: 'got gotten', come: 'came', see: 'saw seen', know: 'knew known', think: 'thought',
  take: 'took taken', give: 'gave given', tell: 'told', feel: 'felt', leave: 'left', find: 'found', buy: 'bought',
  bring: 'brought', can: 'could', will: 'would', shall: 'should', i: 'me my mine myself', he: 'him his himself',
  she: 'her hers herself', we: 'us our ours ourselves', they: 'them their theirs themselves', you: 'your yours yourself yourselves',
  it: 'its itself', child: 'children', man: 'men', woman: 'women', person: 'people', good: 'better best', bad: 'worse worst',
  write: 'wrote written', speak: 'spoke spoken', eat: 'ate eaten', drink: 'drank drunk', begin: 'began begun', run: 'ran',
  forget: 'forgot forgotten', understand: 'understood', stand: 'stood', sit: 'sat', meet: 'met', pay: 'paid', send: 'sent',
  spend: 'spent', lose: 'lost', hear: 'heard', keep: 'kept', sleep: 'slept', mean: 'meant', put: 'puts', let: 'lets',
  become: 'became', choose: 'chose chosen', fall: 'fell fallen', break: 'broke broken', wake: 'woke woken', drive: 'drove driven',
  ride: 'rode ridden', fly: 'flew flown', grow: 'grew grown', throw: 'threw thrown', sing: 'sang sung', swim: 'swam swum',
  teach: 'taught', catch: 'caught', fight: 'fought', sell: 'sold', hold: 'held', read: 'reads', lie: 'lay lain', lay: 'laid',
  wear: 'wore worn', win: 'won', hang: 'hung', build: 'built', lend: 'lent', light: 'lit', show: 'shown', steal: 'stole stolen',
  much: 'more most', many: 'more most', little: 'less least', far: 'further farther', not: "n't",
}).flatMap(([base, forms]) => forms.split(' ').map((f) => [f, base])))
const CONTRACT = { cannot: ['can', 'not'], "i'm": ['i', 'am'], "won't": ['will', 'not'], "can't": ['can', 'not'], "shan't": ['shall', 'not'], "let's": ['let', 'us'] }
function expandEn(w) {
  if (CONTRACT[w]) return CONTRACT[w]
  let m
  if ((m = /^(.+)n't$/.exec(w))) return [m[1], 'not']
  if ((m = /^(.+)'(re|ll|ve|d|s|m)$/.exec(w))) return [m[1], { re: 'are', ll: 'will', ve: 'have', d: 'would', s: 'is', m: 'am' }[m[2]]]
  return [w]
}
function lexKeys(w) {
  const k = new Set([w])
  if (IRREG[w]) k.add(IRREG[w])
  const strip = (re, rep = '') => { if (re.test(w)) k.add(w.replace(re, rep)) }
  strip(/ies$/, 'y'); strip(/ied$/, 'y'); strip(/es$/); strip(/s$/); strip(/ed$/); strip(/d$/); strip(/ing$/); strip(/ing$/, 'e')
  strip(/er$/); strip(/est$/); strip(/ly$/); strip(/ier$/, 'y'); strip(/iest$/, 'y'); strip(/ily$/, 'y')
  for (const x of [...k]) { if (/([b-df-hj-np-tv-z])\1$/.test(x)) k.add(x.slice(0, -1)) } // stopped -> stopp -> stop
  return k
}
// ── French lexeme keys (cs #342·AL: untaught_known for a French known side, K6 lexeme tolerance) ──
const FR_IRREG = Object.fromEntries(Object.entries({
  etre: 'suis es est sommes etes sont etais etait etions etiez etaient ete serai sera serons seront serais serait soit sois soient',
  avoir: 'ai as a avons avez ont avais avait avions aviez avaient eu aurai aura aurons auront aurais aurait aie ait',
  aller: 'vais vas va allons allez vont allait irai ira iront irais irait aille', faire: 'fais fait faisons faites font faisait fera ferai ferais ferait fasse',
  pouvoir: 'peux peut pouvons pouvez peuvent pouvait pu pourrai pourra pourrais pourrait puisse', vouloir: 'veux veut voulons voulez veulent voulait voulu voudrais voudrait voudrai veuille',
  savoir: 'sais sait savons savez savent savait su saurai saurais saurait sache', devoir: 'dois doit devons devez doivent devait du dus devrais devrait devrai',
  dire: 'dis dit disons dites disent disait dirai dirait', venir: 'viens vient venons venez viennent venait venu viendrai viendrait vienne',
  voir: 'vois voit voyons voyez voient voyait vu verrai verrait', prendre: 'prends prend prenons prenez prennent prenait pris prendrai prendrait',
  je: 'j me m moi', tu: 'te t toi', il: 'lui le', elle: 'la', ce: 'c cet cette ces ca cela', ne: 'n', que: 'qu', se: 's', de: 'd du des',
  mon: 'ma mes', ton: 'ta tes', son: 'sa ses', notre: 'nos', votre: 'vos', le: 'l la les',
}).flatMap(([base, forms]) => forms.split(' ').map((f) => [f, base])))
const FR_ENDINGS = ['issaient', 'eraient', 'assent', 'issons', 'issez', 'aient', 'erais', 'erait', 'erons', 'eront', 'ement', 'ions', 'iez', 'ons', 'ent', 'ais', 'ait', 'ant', 'ees', 'ez', 'er', 'ir', 're', 'ee', 'es', 'is', 'it', 'e', 's', 'x']
const fold = (w) => w.normalize('NFD').replace(/\p{M}/gu, '')
const FR_GLOSS_IGNORE = new Set('je j tu il elle on nous vous ils elles me m te t se s le la les l un une des de d du a au aux en y que qu qui ce c ca cela et ou ne n pas plus moi toi lui eux mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs est etre avoir faire'.split(' '))
function frLexKeys(w) {
  const f = fold(w), k = new Set([f])
  if (FR_IRREG[f]) k.add(FR_IRREG[f])
  for (const e of FR_ENDINGS) if (f.endsWith(e) && f.length - e.length >= 3) k.add(f.slice(0, -e.length))
  for (const x of [...k]) { if (/([b-df-hj-np-tv-z])\1$/.test(x)) k.add(x.slice(0, -1)) }
  return k
}
const frLex = (text) => toks(text).flatMap((w) => w.split("'")).filter((w) => w && !isNum(w))

// ── wrong_side (cs #342·AL): Breton/French only. Word lists hold words that are NOT also ordinary in the other language
// (en, a, da, e, ma, ne, un, an are in both, so they are left out). Calibrated by hand on bre_for_fra (25 Nov copy).
const WRONG_SIDE = {
  fra: new Set("le la les des du est je tu nous vous elle ils elles avec pour dans pas que qui mais très c'est j'ai suis sont être avoir une mon mes ton son leur aussi bien".split(' ')),
  bre: new Set("eo ket ar ur emaon emañ eus gant evit hag ha'n zo bezañ c'hoant brezhoneg ober gallout mont dont kalz hiziv bremañ warc'hoazh dec'h ganit din dit dezhañ".split(' ')),
}
const BRE_LETTERS = /c'h|zh|ñ/iu
const BRE_FOREIGN = /[qxçéèàâôîïëœ]|c(?!'?h)|tion/u
function breGrammar(t) {
  const w = toks(t), out = []
  for (let i = 0; i + 1 < w.length; i++) {
    const a = w[i], b = w[i + 1], vowelish = /^[aeiouyêùh]/.test(b) && !/^y[aeiou]/.test(b)
    if (a === 'ar' && (vowelish || /^[ndt]/.test(b))) out.push('article:' + a + ' ' + b)
    if (a === 'an' && /^[bcfgjklmprsvwz]/.test(b) && i > 0 && !/^(en|o)$/.test(w[i - 1])) out.push('article:' + a + ' ' + b)
    if (a === 'ar' && /^l/.test(b)) out.push('article:' + a + ' ' + b)
    if (a === 'hag' && !/^[aeiouyh]/.test(b)) out.push('hag:' + a + ' ' + b)
    if (a === 'da' && (b === 'ma' || b === 'da')) out.push('da_ma:' + a + ' ' + b)
  }
  return out
}
const bretonForeignWords = (t) => toks(t).filter((w) => BRE_FOREIGN.test(w))
const enLex = (text) => toks(text).flatMap(expandEn).filter((w) => !isNum(w))

// "Close variant" = an inflection of the same word: both >= 4 letters and they share all but the last two letters of the
// shorter (diferente/diferentes, entendo/entende). A short word (eu, te, a) is never "close" to anything: a dropped
// pronoun is the strong class, not the near one (calibrated on por_br "eu não entendo" -> "não entendo").
function editClose(a, b) {
  if (a === b) return true
  if (a.length < 4 || b.length < 4) return false
  const n = Math.min(a.length, b.length); let p = 0
  while (p < n && a[p] === b[p]) p++
  return p >= 3 && p >= n - 2
}
// Target-side tokens for availability: elided / clitic forms are split at the apostrophe on BOTH sides (taught and used),
// so Welsh mae'r = mae + 'r and French j'ai = j + ai; one-letter pieces are dropped. English targets keep contractions whole
// (don't is a form of its own). Calibrated on cym_sv2: mae'r, fi'n, gyda'r were the top false positives before this.
const splitClitics = (ws, keepWhole) => keepWhole ? ws : ws.flatMap((w) => w.split("'")).filter((w) => w.length > 1)
// Languages where full reduplication is ordinary grammar (ધીમે ધીમે, 慢慢, pelan-pelan): a doubled word there is not a garble.
const REDUPLICATING = new Set(['hin', 'guj', 'ben', 'mar', 'pan', 'urd', 'tam', 'tel', 'kan', 'mal', 'sin', 'nep', 'ind', 'msa', 'tha', 'zho', 'jpn', 'kor', 'swa', 'yor', 'vie', 'fas', 'tur', 'heb', 'ara'])

const STOP_EN = new Set('i you he she it we they a an the to of in on at and or but is am are was were be do does did not that this my your for with me him her us them have has had will would can could what so just'.split(' '))
// gloss_absent compares CONTENT words only: pronouns, auxiliaries, "that", prepositions shift legitimately between a LEGO's
// gloss and a phrase's English (pro-drop targets, relative clauses). Calibrated on spa_for_eng: before this list 857
// candidates were mostly he/she/that/it/do; after it the list is synonym swaps (talked/spoke, shape/way) — the real question.
const GLOSS_IGNORE = new Set([...STOP_EN, ...'there here who whom which what when where why how if as by from about up out into over some any no yes all each other one ones him her his hers its our ours their theirs us them me my mine your yours myself yourself herself himself itself ourselves themselves sir madam'.split(' ')])

function run(D) {
  const course = D.course
  const [tgt, known] = course.split('_for_'); const tlang = tgt.split('_')[0]
  const welsh = tlang === 'cym'
  const spaceless = isChinese(course) || SPACELESS_EXTRA.has(tlang)
  const englishKnown = known === 'eng'
  const H = {}; const add = (k, o) => (H[k] ||= []).push(o)
  const short = (id) => String(id).replace(course + ':', '')
  const seeds = D.seeds.slice().sort((a, b) => a.n - b.n)
  const rows = [] // played rows with their place in running order
  for (const s of seeds) for (const l of s.legos) for (const p of l.phrases) {
    if (l.is_new && (p.type === 'build' || p.type === 'use')) rows.push({ p, l, s })
  }
  const notes = []

  // ── untaught_target / untaught_known: running order = (seed, lego index) ──
  const rk = (s, i) => s * 1000 + i
  if (!spaceless) {
    const first = new Map()
    const breton = tlang === 'bre'
    const keys = (w) => (welsh ? welshRadicals(w) : breton ? bretonRadicals(w) : [w])
    const tt = (t) => breton ? bretonSplit(toks(t)) : splitClitics(toks(t), tlang === 'eng')
    for (const s of seeds) for (const l of s.legos) for (const w of tt(l.target)) for (const k of keys(w)) { if (!first.has(k)) first.set(k, rk(s.n, l.idx)) }
    const firstStrict = new Map() // exact forms only: tells a mutation-tolerated word from a really taught one
    for (const s of seeds) for (const l of s.legos) for (const w of tt(l.target)) { if (!firstStrict.has(w)) firstStrict.set(w, rk(s.n, l.idx)) }
    for (const { p, l, s } of rows) {
      const here = rk(s.n, l.idx)
      const bad = tt(p.target).filter((w) => !isNum(w) && ![...keys(w)].some((k) => first.get(k) <= here))
      if (bad.length || breton) {
        const strict = breton ? tt(p.target).filter((w) => !isNum(w) && !(firstStrict.get(w) <= here)) : []
        if (!bad.length) { if (strict.length) add('untaught_target_mutation_only', { id: short(p.id), seed: s.n, lego: l.id, words: strict, known: p.known, target: p.target }); continue }
        const when = (w) => { const t = Math.min(...[...keys(w)].map((k) => first.get(k) ?? Infinity)); return t === Infinity ? 'never' : 'S' + Math.floor(t / 1000) + 'L' + (t % 1000) }
        add('untaught_target', { id: short(p.id), seed: s.n, lego: l.id, lego_target: l.target, words: bad.map((w) => w + '@' + when(w)), known: p.known, target: p.target })
      }
    }
  } else notes.push('untaught_target NOT RUN: spaceless target script')
  if (englishKnown) {
    const first = new Map()
    for (const s of seeds) for (const l of s.legos) for (const w of enLex(l.known)) for (const k of lexKeys(w)) { if (!first.has(k)) first.set(k, rk(s.n, l.idx)) }
    for (const { p, l, s } of rows) {
      const here = rk(s.n, l.idx)
      const bad = enLex(p.known).filter((w) => ![...lexKeys(w)].some((k) => first.get(k) <= here))
      if (bad.length) {
        const later = bad.map((w) => { const t = Math.min(...[...lexKeys(w)].map((k) => first.get(k) ?? Infinity)); return w + '@' + (t === Infinity ? 'never' : 'S' + Math.floor(t / 1000)) })
        // K7: when the target side is fully taught the learner can usually still produce the answer, so these read as the
        // weak tier; a row also in untaught_target is the strong one.
        const strong = (H.untaught_target || []).some((h) => h.id === short(p.id))
        add('untaught_known', { id: short(p.id), seed: s.n, lego: l.id, words: later, target_also_untaught: strong, known: p.known, target: p.target })
      }
    }
  } else if (known === 'fra') {
    const first = new Map()
    for (const s of seeds) for (const l of s.legos) for (const w of frLex(l.known)) for (const k of frLexKeys(w)) { if (!first.has(k)) first.set(k, rk(s.n, l.idx)) }
    for (const { p, l, s } of rows) {
      const here = rk(s.n, l.idx)
      const bad = frLex(p.known).filter((w) => ![...frLexKeys(w)].some((k) => first.get(k) <= here))
      if (bad.length) {
        const later = bad.map((w) => { const t = Math.min(...[...frLexKeys(w)].map((k) => first.get(k) ?? Infinity)); return w + '@' + (t === Infinity ? 'never' : 'S' + Math.floor(t / 1000)) })
        const strong = (H.untaught_target || []).some((h) => h.id === short(p.id))
        add('untaught_known', { id: short(p.id), seed: s.n, lego: l.id, words: later, target_also_untaught: strong, known: p.known, target: p.target })
      }
    }
    notes.push('untaught_known on FRENCH known: frLexKeys stem tolerance (cs #342·AL) — read every sampled row; stems are rough')
  } else notes.push(`untaught_known NOT RUN: known language ${known} (lexeme tolerance is English and French only)`)

  // ── lego_absent (P17/K8) and gloss_absent (known/target mismatch) ──
  const tw = (t) => spaceless ? null : normalizeForContainment(t).split(/\s+/).filter(Boolean)
  for (const { p, l, s } of rows) {
    if (!l.target) continue
    let has = phraseContainsLego({ courseCode: course, seedNumber: s.n, legoTarget: l.target, phraseTarget: p.target,
      baseline: (lt, pt) => spaceless ? normalizeForContainment(pt).replace(/\s/g, '').includes(normalizeForContainment(lt).replace(/\s/g, '')) : (() => {
        const pw = tw(pt); return tw(lt).every((w) => pw.includes(w) || (welsh && pw.some((x) => welshRadicals(x).has(w) || welshRadicals(w).has(x))))
      })() })
    if (!has) {
      let cls = 'absent'
      if (!spaceless) { const pw = tw(p.target); const miss = tw(l.target).filter((w) => !pw.includes(w)); if (miss.every((w) => pw.some((x) => editClose(w, x)))) cls = 'near' }
      add('lego_absent_' + cls, { id: short(p.id), seed: s.n, lego: l.id, lego_known: l.known, lego_target: l.target, known: p.known, target: p.target })
      continue
    }
    if (englishKnown && l.known) {
      const pk = new Set(enLex(p.known).flatMap((w) => [...lexKeys(w)]))
      const miss = enLex(l.known).filter((w) => !GLOSS_IGNORE.has(w) && ![...lexKeys(w)].some((k) => pk.has(k)))
      if (miss.length) add('gloss_absent', { id: short(p.id), seed: s.n, lego: l.id, lego_known: l.known, lego_target: l.target, missing: miss, known: p.known, target: p.target })
    }
    if (known === 'fra' && l.known) { // cs #342·AL: the same check over a French known side, frLexKeys tolerance
      const pk = new Set(frLex(p.known).flatMap((w) => [...frLexKeys(w)]))
      // a slashed gloss ("finir / terminer") is satisfied by ANY alternative; a bracketed tag is K11's business, not this one's
      const alts = String(l.known).replace(/\([^)]*\)/g, ' ').split('/').map((a) => frLex(a).filter((w) => !FR_GLOSS_IGNORE.has(fold(w)) && ![...frLexKeys(w)].some((k) => pk.has(k))))
      const miss = alts.reduce((a, b) => (b.length < a.length ? b : a))
      if (miss.length) add('gloss_absent', { id: short(p.id), seed: s.n, lego: l.id, lego_known: l.known, lego_target: l.target, missing: miss, known: p.known, target: p.target })
    }
    const dk = (String(p.known || '').match(/\d+/g) || []).sort().join(','), dt = (String(p.target || '').match(/\d+/g) || []).sort().join(',')
    if (dk && dt && dk !== dt) add('digits_mismatch', { id: short(p.id), known: p.known, target: p.target })
  }

  // ── garble_tail: one ending bolted onto rows of many unrelated LEGOs ──
  {
    const tail = (t) => { const x = normalizeForContainment(t); if (spaceless) { const c = x.replace(/\s/g, ''); return c.length >= 8 ? c.slice(-5) : null } const w = x.split(' '); return w.length >= 3 ? w.slice(-2).join(' ') : null }
    const groups = new Map()
    for (const r of rows) { const t = tail(r.p.target); if (!t) continue; const lt = normalizeForContainment(r.l.target).replace(spaceless ? /\s/g : /$^/, ''); if (lt.includes(t)) continue; (groups.get(t) || groups.set(t, []).get(t)).push(r) }
    for (const [t, g] of groups) {
      const legosN = new Set(g.map((r) => r.l.id)).size
      if (g.length < 12 || legosN < 8) continue
      const wc = new Map(); for (const r of g) for (const w of new Set(toks(r.p.known))) if (!STOP_EN.has(w)) wc.set(w, (wc.get(w) || 0) + 1)
      const top = [...wc].sort((a, b) => b[1] - a[1])[0] || ['', 0]
      const share = top[1] / g.length
      if (share >= 0.5) continue // the English carries a common word for the tail: most likely a real, taught ending
      add('garble_tail', { tail: t, rows: g.length, legos: legosN, english_top_word: top[0], english_top_share: +share.toFixed(2),
        sample: g.slice(0, 40).map((r) => ({ id: short(r.p.id), lego: r.l.id, lego_target: r.l.target, known: r.p.known, target: r.p.target })) })
    }
  }

  // ── garble_doubled / garble_script / garble_punct ──
  const latinInTarget = !['eng', 'spa', 'fra', 'deu', 'ita', 'por', 'cym', 'gle', 'gla', 'nld', 'afr', 'cat', 'eus', 'glg', 'dan', 'swe', 'nor', 'isl', 'fin', 'est', 'lav', 'lit', 'pol', 'ces', 'hrv', 'hun', 'ron', 'tur', 'swa', 'fry', 'srp', 'slk', 'slv', 'mlt', 'ind', 'vie', 'cor', 'bre', 'pdc', 'roh', 'fur', 'lmo', 'nap', 'scn', 'vec', 'sme', 'yor', 'sbx', 'rgn'].includes(tlang)
  const LATIN_KNOWN = new Set(['eng', 'fra', 'spa', 'deu', 'ita', 'por', 'nld', 'cym'])
  const taughtPairs = new Set()
  for (const s of seeds) for (const l of s.legos) for (const t of [l.target, l.known]) { const w = toks(t); for (let i = 1; i < w.length; i++) taughtPairs.add(w[i - 1] + ' ' + w[i]) }
  for (const s of seeds) for (const l of s.legos) for (const p of l.phrases) {
    if (!(l.is_new && ['lego_debut', 'build', 'use'].includes(p.type))) continue
    const id = short(p.id)
    for (const [side, text, lang] of [['target', p.target, tlang], ['known', p.known, known]]) {
      const w = toks(text)
      if (!REDUPLICATING.has(lang)) for (let i = 1; i < w.length; i++) if (w[i] === w[i - 1] && w[i].length > 1 && !isNum(w[i]) && !taughtPairs.has(w[i] + ' ' + w[i])) { add('garble_doubled', { id, side, word: w[i], known: p.known, target: p.target }); break }
      const raw = String(text || '')
      if (!raw.trim() || /,,|\.\.(?!\.)|\s[,.;:!?](?!\.)|^[\s,.;:!?、。，]/.test(raw.replace(/…/g, ''))) add('garble_punct', { id, side, known: p.known, target: p.target })
    }
    if (latinInTarget && /[a-zA-Z]{2,}/.test(String(p.target || ''))) add('garble_script', { id, side: 'target', known: p.known, target: p.target })
    const nonLatin = (t) => /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}\p{N}\p{P}\p{Z}\p{S}]/u.test(String(t || '').replace(/\s/g, ''))
    if ((englishKnown || (!latinInTarget && LATIN_KNOWN.has(known))) && nonLatin(p.known)) add('garble_script', { id, side: 'known', known: p.known, target: p.target })
    if (!latinInTarget && LATIN_KNOWN.has(known) && nonLatin(p.target)) add('garble_script', { id, side: 'target', known: p.known, target: p.target })
    if (tlang === 'bre') {
      const gr = breGrammar(p.target)
      if (gr.length) add('bre_grammar', { id, rules: gr, known: p.known, target: p.target })
      const fw = bretonForeignWords(p.target)
      if (fw.length) add('wrong_side', { id, side: 'target_spelling', words: fw, known: p.known, target: p.target })
      const fr = toks(p.target).filter((w) => WRONG_SIDE.fra.has(w))
      if (fr.length >= 2) add('wrong_side', { id, side: 'target', words: fr, known: p.known, target: p.target })
      const kw = toks(p.known), br = kw.filter((w) => WRONG_SIDE.bre.has(w))
      if (BRE_LETTERS.test(String(p.known || '')) || br.length >= 2) add('wrong_side', { id, side: 'known', words: br, known: p.known, target: p.target })
    }
  }

  // ── silent_lego ──
  for (const s of seeds) for (const l of s.legos) if (l.is_new && !l.phrases.some((p) => p.type === 'lego_debut')) add('silent_lego', { id: l.id, known: l.known, target: l.target })

  return { notes, hits: H }
}

module.exports = { run, bretonForeignWords, breGrammar, welshRadicals, bretonRadicals, lexKeys, enLex, toks, frLexKeys }
