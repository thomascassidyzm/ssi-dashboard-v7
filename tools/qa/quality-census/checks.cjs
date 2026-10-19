'use strict';
// tools/qa/quality-census/checks.cjs — the scan-course checks as PURE functions over one course snapshot
// (snapshot.cjs). No I/O, no database, no model: every function takes the snapshot and returns CANDIDATES.
//
// THE STANDING RULE THESE OBEY (Kai, 2026-10-15): "regex may find candidates, never decides". A hit here is a row a
// person must read; a check's count is never a finding. The census report multiplies hits by a precision measured
// by hand-reading a sample of each check's hits on the course (run.cjs --sample), and a check whose target defect is
// not clear is SET ASIDE with a question for Kai rather than guessed at.
//
// Where the scan-course recipe (.claude/commands/scan-course.md) and the canon (course-methodology-canon.md)
// disagree, the canon wins and the entry below says which canon line it follows.
//
// Each check: { id, name, rule, blocks, run(snap) → hits[] }. `blocks` is the release consequence stated by the
// canon line in `rule` ('yes' | 'no' | 'ask'); a hit can carry `bucket` where the canon splits severities.
// Hit: { seed, ref, kind: 'seed'|'lego'|'tile'|'phrase', role, known, target, why, bucket? }.

const { normalizeForZUT } = require('../../../services/course-builder/lib/text-normalization.cjs');
const p26 = require('../../course-optimization/p26-early-placement-sweep-2026-10-06.cjs');

const CJK = new Set(['zho', 'cmn', 'yue', 'jpn', 'tha']); // unspaced target scripts: containment by substring
const sidOf = (snap, id) => String(id).startsWith(snap.course + ':') ? String(id).slice(snap.course.length + 1) : String(id);
const legoRef = (l) => l.lego_id || `S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`;

// ── the rows a learner can see or hear ────────────────────────────────────────────────────────────────────────
// Component phrase rows (phrase_role 'component') are never played (P25 / K29: a component is the LEGO's tile,
// course_legos.components), so they are not scanned as phrases; the tiles themselves are scanned as kind 'tile'.
function rows(snap, { tiles = false } = {}) {
  const out = [];
  for (const s of snap.seeds) out.push({ seed: s.seed_number, ref: s.seed_id || `S${String(s.seed_number).padStart(4, '0')}`, kind: 'seed', role: 'seed', known: s.known_text || '', target: s.target_text || '' });
  for (const l of snap.legos) {
    out.push({ seed: l.seed_number, ref: legoRef(l), kind: 'lego', role: l.is_new ? 'lego' : 'lego-not-new', known: l.known_text || '', target: l.target_text || '' });
    if (tiles && Array.isArray(l.components)) l.components.forEach((c, i) => c && out.push({ seed: l.seed_number, ref: `${legoRef(l)}T${i + 1}`, kind: 'tile', role: 'tile', known: c.known || '', target: c.target || '' }));
  }
  for (const p of snap.phrases) if (p.phrase_role !== 'component') out.push({ seed: p.seed_number, ref: sidOf(snap, p.id), kind: 'phrase', role: p.phrase_role, known: p.known_text || '', target: p.target_text || '' });
  return out;
}
const hit = (r, why, extra = {}) => ({ seed: r.seed, ref: r.ref, kind: r.kind, role: r.role, known: r.known, target: r.target, why, ...extra });
function sideScan(snap, test, opts) {
  const out = [];
  for (const r of rows(snap, opts)) {
    const k = test(r.known, 'known', snap.known_lang), t = test(r.target, 'target', snap.target_lang);
    if (k || t) out.push(hit(r, [k && `known: ${k}`, t && `target: ${t}`].filter(Boolean).join('; ')));
  }
  return out;
}

// word bag for spaced scripts; character string for unspaced ones
const words = (t) => p26.words(t);
const pairKey = (k, t) => `${words(k).join(' ')}|${words(t).join(' ')}`;
const squash = (t) => String(t || '').toLowerCase().replace(/[\s\p{P}]/gu, '');

// ── 1. parentheticals ─────────────────────────────────────────────────────────────────────────────────────────
// K11: NO PARENTHETICAL TAGS in courses, ever (HARD; read aloud in narration). The recipe looked at LEGO known_text
// only; K11 says "in courses", so every learner-visible text is scanned and the LEGO-known hits are bucketed first.
const PAREN = /\([^)]*\)|\[[^\]]*\]/;
const parentheticals = {
  id: 'C01', name: 'Bracketed tags', rule: 'K11 (no parenthetical tags, ever — HARD)', blocks: 'yes',
  run: (snap) => sideScan(snap, (t) => { const m = PAREN.exec(t); return m && `"${m[0]}"`; }, { tiles: true })
    .map((h) => ({ ...h, bucket: h.kind === 'lego' && /^known/.test(h.why) ? 'lego-known' : h.kind })),
};

// ── 2. slashes ────────────────────────────────────────────────────────────────────────────────────────────────
// L19: needing a slash is the diagnosis that the LEGO is under-contexted; the learner should hear one word. A slash
// between digits (24/7, 1/2) is a number, not an alternative.
const SLASH = /(?<!\d)\/|\/(?!\d)/;
const slashes = {
  id: 'C02', name: 'Slash alternatives (he/she)', rule: 'L19 (slash = under-contexted LEGO; one word, not alternatives)', blocks: 'yes',
  run: (snap) => sideScan(snap, (t) => SLASH.test(t) && `"${t.match(/\S*\/\S*/)[0]}"`, { tiles: true }),
};

// ── 3 + 4. wrong language ─────────────────────────────────────────────────────────────────────────────────────
// (a) SCRIPT: a letter outside the side's expected script. (b) SAME-SCRIPT: a word that exists only in the OTHER
// language of the pair (English "the" inside Italian). (b) needs a per-language list; a language without one is
// reported UNAVAILABLE by run.cjs, never as a clean zero ("a zero is a claim about your query first").
const SCRIPT = {
  eng: /\p{Script=Latin}/u, ita: /\p{Script=Latin}/u, fra: /\p{Script=Latin}/u, spa: /\p{Script=Latin}/u, por: /\p{Script=Latin}/u, deu: /\p{Script=Latin}/u,
  zho: /\p{Script=Han}/u, jpn: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u, kor: /[\p{Script=Hangul}\p{Script=Han}]/u, ara: /\p{Script=Arabic}/u,
};
function offScript(text, lang) {
  const ok = SCRIPT[lang]; if (!ok) return null;
  const letters = [...String(text)].filter((ch) => /\p{L}/u.test(ch));
  const bad = letters.filter((ch) => !ok.test(ch));
  if (!bad.length) return null;
  // A Latin name or brand inside a CJK/Arabic sentence is normal: there, Latin counts only when the text has
  // none of its own script at all. Any other foreign script always counts.
  const latinOnly = bad.every((ch) => SCRIPT.eng.test(ch));
  if (!SCRIPT[lang].test('a') && latinOnly && letters.some((ch) => ok.test(ch))) return null;
  return `letters outside the ${lang} script: ${[...new Set(bad)].join('')}`;
}
// Words that cannot be a word of the other language. Kept short on purpose: every entry must be impossible on the
// other side (Italian "do", "a", "come", "e", "fine" are real Italian, so they are not here).
const ONLY_IN = {
  eng: ['the', 'you', 'and', 'of', 'with', 'what', 'it', 'this', 'that', 'have', 'are', 'is', 'my', 'your', 'we', 'they', "i'm", "don't", "can't", 'would', 'will', 'should', 'there', 'their', 'been', 'was', 'were', 'just', 'know', 'want', 'think'],
  ita: ['che', 'sono', 'il', 'della', 'voglio', 'perché', 'anche', 'questo', 'quello', 'sei', 'siamo', 'non', 'molto', 'adesso', 'cosa', 'sto', 'devo', 'posso', 'gli', 'una', 'mi', 'ti', 'ci', 'qualcosa', 'già', 'più', 'fare', 'detto'],
};
function otherLanguageWords(text, otherLang) {
  const list = ONLY_IN[otherLang]; if (!list) return null;
  const ws = new Set(String(text).toLowerCase().replace(/[’‘]/g, "'").split(/[^\p{L}']+/u).filter(Boolean));
  const found = list.filter((w) => ws.has(w));
  return found.length ? `${otherLang} word(s): ${found.join(', ')}` : null;
}
function wrongLanguage(side) {
  return (snap) => {
    const lang = snap[`${side}_lang`], other = snap[side === 'known' ? 'target_lang' : 'known_lang'];
    const out = [];
    for (const r of rows(snap, { tiles: true })) {
      const t = r[side];
      const s = offScript(t, lang); if (s) { out.push(hit(r, s, { bucket: 'script' })); continue; }
      // proper names and the language's own name are not "the other language"
      const w = otherLanguageWords(t, other); if (w) out.push(hit(r, w, { bucket: 'same-script' }));
    }
    return out;
  };
}
const wrongKnown = { id: 'C03', name: 'Wrong language on the English side', rule: 'scan-course Check 3; the known side is a controlled language', blocks: 'yes', run: wrongLanguage('known'), needs: (snap) => ONLY_IN[snap.target_lang] ? null : `no ${snap.target_lang}-only word list: same-script half UNAVAILABLE` };
const wrongTarget = { id: 'C04', name: 'Wrong language on the target side', rule: 'scan-course Check 4', blocks: 'yes', run: wrongLanguage('target'), needs: (snap) => ONLY_IN[snap.known_lang] ? null : `no ${snap.known_lang}-only word list: same-script half UNAVAILABLE` };

// ── 5. more than one sentence ─────────────────────────────────────────────────────────────────────────────────
// P20: a USE phrase is never more than one sentence (HARD). The recipe's capital-letter test misses the lowercase
// house style ("are you ready? let's go"), so ANY text after a ? or ! — or after a full stop that is not an ellipsis
// or an abbreviation — is a candidate.
const ABBR = /\b(mr|mrs|ms|dr|st|sig|sr|sra|prof|etc|vs|ecc)\.$/i;
function secondSentence(t) {
  const s = String(t).trim();
  if ((s.match(/[?？]/g) || []).length >= 2) return 'two question marks';
  const re = /([.!?？！。])(\s+)(?=\S)/g; let m;
  while ((m = re.exec(s))) {
    const before = s.slice(0, m.index + 1);
    if (m[1] === '.' && (/\.\.$/.test(before) || ABBR.test(before))) continue;
    return `text continues after "${m[1]}"`;
  }
  if (s.indexOf('¿') > 0) return 'a second ¿';
  return null;
}
const multiSentence = { id: 'C05', name: 'Two sentences in one row', rule: 'P20 (never more than one sentence — HARD)', blocks: 'yes', run: (snap) => sideScan(snap, secondSentence) };

// ── 6. nothing to say ─────────────────────────────────────────────────────────────────────────────────────────
const unpronounceable = { id: 'C06', name: 'Nothing to say (empty or punctuation only)', rule: 'scan-course Check 6', blocks: 'yes', run: (snap) => sideScan(snap, (t) => !/[\p{L}\p{N}]/u.test(t) && `"${t}"`, { tiles: true }) };

// ── 7. wrapping speech marks ──────────────────────────────────────────────────────────────────────────────────
const QUOTES = [['"', '"'], ['“', '”'], ['„', '”'], ['„', '“'], ['«', '»'], ["'", "'"], ['‘', '’'], ['「', '」']];
const wrapped = (t) => { const s = String(t).trim(); return s.length > 1 && QUOTES.some(([a, b]) => s.startsWith(a) && s.endsWith(b)) && `wrapped in ${s[0]}…${s[s.length - 1]}`; };
const speechMarks = { id: 'C07', name: 'Text wrapped in speech marks', rule: 'scan-course Check 7 (shown as quotes on screen)', blocks: 'no', run: (snap) => sideScan(snap, wrapped, { tiles: true }) };

// ── 8. trailing full stops ────────────────────────────────────────────────────────────────────────────────────
// SET ASIDE BY DEFAULT (blocks: 'ask'). The recipe calls a trailing "." a TTS-pause and key-collision defect;
// canon A7 (Kai, 2026-08-17) says "Full stop makes no difference", and A8 warns that punctuation may have been added
// on purpose to make TTS say a short word. Whether Kai wants these caught at all is his question, not ours.
const trailingPeriod = { id: 'C08', name: 'Trailing full stop', rule: 'scan-course Check 8 vs canon A7/A8 — question for Kai', blocks: 'ask', run: (snap) => sideScan(snap, (t) => /[^.]\.\s*$|^\.\s*$/.test(t) && 'ends in "."') };

// ── 9. lowercase "i" in English ───────────────────────────────────────────────────────────────────────────────
const LOWER_I = /(^|[^\p{L}\p{N}'’.])i(?=$|['’]|[^\p{L}\p{N}.'’])/u;
const lowercaseI = {
  id: 'C09', name: 'Lowercase "i" in English', rule: 'scan-course Check 9 (K9: English must be grammatical)', blocks: 'no',
  run: (snap) => sideScan(snap, (t, side, lang) => lang === 'eng' && LOWER_I.test(t) && 'standalone lowercase i', { tiles: true }),
};

// ── 10. ZUT ───────────────────────────────────────────────────────────────────────────────────────────────────
// K2/K4/P16: one known prompt → one target. Keyed by the course builder's own normalizeForZUT (never a private
// normaliser — lane review #420). LEGO-level collisions are the seed's wiring (K4: hard); phrase-level ones are
// WARN (K4, Kai C7: "it shouldn't make it into the course… we don't know which one of the pair is the bad one", so
// each group names every side). K5: the checker is NOT widened, and a group whose targets differ only by a word-final
// vowel (Italian -o/-a agreement) is bucketed 'ending-variant', which Kai said may be left where it cannot easily
// be resolved.
function zut(snap) {
  const chinese = CJK.has(snap.target_lang) && snap.target_lang !== 'jpn';
  const key = (t) => normalizeForZUT(String(t || ''), chinese);
  const all = rows(snap).filter((r) => r.role !== 'lego-not-new' && r.kind !== 'seed');
  const byKnown = new Map();
  for (const r of all) { const k = key(r.known); if (k) (byKnown.get(k) || byKnown.set(k, []).get(k)).push(r); }
  const stem = (t) => key(t).split(' ').map((w) => w.replace(/[aeio]$/, '')).join(' ');
  const out = [];
  for (const [k, rs] of byKnown) {
    const targets = [...new Set(rs.map((r) => key(r.target)))];
    if (targets.length < 2) continue;
    const bucket = rs.some((r) => r.kind === 'lego') && new Set(rs.filter((r) => r.kind === 'lego').map((r) => key(r.target))).size > 1 ? 'lego'
      : 'phrase';
    const variant = new Set(targets.map(stem)).size === 1;
    const first = rs.slice().sort((a, b) => a.seed - b.seed)[0];
    out.push({ ...hit(first, `"${k}" → ${targets.map((t) => `"${t}"`).join(' / ')}`), bucket: variant ? 'ending-variant' : bucket, group: rs.map((r) => ({ ref: r.ref, seed: r.seed, role: r.role, target: r.target })) });
  }
  return out;
}
const zutCheck = { id: 'C10', name: 'ZUT: one English prompt, two different targets', rule: 'K2/K4/P16 (LEGO level HARD; phrase level WARN); K5 not widened', blocks: 'yes', run: zut };

// ── 13. capitalisation ────────────────────────────────────────────────────────────────────────────────────────
// (a) the same text in two cases anywhere in the course; (b) a first letter against the course's dominant case,
// where a word seen capitalised mid-sentence elsewhere (a name, "Italian", English "I") is evidence it is meant.
function capitalisation(snap) {
  const rs = rows(snap, { tiles: true });
  const out = [];
  for (const side of ['known', 'target']) {
    const groups = new Map();
    for (const r of rs) { const t = r[side].trim(); if (t) (groups.get(t.toLowerCase()) || groups.set(t.toLowerCase(), []).get(t.toLowerCase())).push(r); }
    for (const [, g] of groups) {
      const variants = [...new Set(g.map((r) => r[side].trim()))];
      if (variants.length > 1) out.push({ ...hit(g[0], `${side}: same text in ${variants.length} cases: ${variants.map((v) => `"${v}"`).join(' / ')}`), bucket: `${side}-case-pair` });
    }
    const meant = new Set(['i', "i'm", "i'd", "i've", "i'll"]);
    // a capital after . ? ! is a sentence start, not evidence of a name (#176 calibration: "aspetto. Perché no?"
    // made "Perché" look like a name and hid the #883·I known positive)
    for (const r of rs) { const ws = r[side].split(/\s+/); for (let i = 1; i < ws.length; i++) if (/^\p{Lu}/u.test(ws[i]) && !/[.?!]$/.test(ws[i - 1])) meant.add(ws[i].toLowerCase().replace(/[^\p{L}'’]/gu, '')); }
    const first = (t) => { const w = t.trim().replace(/^[\p{P}\s]+/u, '').split(/\s+/)[0] || ''; return w; };
    let up = 0, low = 0;
    for (const r of rs) { const w = first(r[side]); if (!/^\p{L}/u.test(w) || meant.has(w.toLowerCase().replace(/[^\p{L}'’]/gu, ''))) continue; /^\p{Lu}/u.test(w) ? up++ : /^\p{Ll}/u.test(w) && low++; }
    if (Math.max(up, low) / Math.max(1, up + low) <= 0.8) continue;
    const dominantUpper = up > low;
    for (const r of rs) {
      const w = first(r[side]); if (!/^\p{L}/u.test(w) || meant.has(w.toLowerCase().replace(/[^\p{L}'’]/gu, ''))) continue;
      const isUp = /^\p{Lu}/u.test(w);
      if (isUp !== dominantUpper && /^[\p{Lu}\p{Ll}]/u.test(w)) out.push({ ...hit(r, `${side}: starts "${w}" against the course's ${dominantUpper ? 'capital' : 'lowercase'} style`), bucket: `${side}-first-letter` });
    }
  }
  return out;
}
const capitalisationCheck = { id: 'C13', name: 'Capitalisation slips', rule: 'scan-course Check 13', blocks: 'no', run: capitalisation };

// ── 15. known == target ───────────────────────────────────────────────────────────────────────────────────────
const COGNATES = {
  'eng|spa': ['idea', 'ideas', 'bar', 'total', 'hotel', 'email', 'emails', 'radio', 'internet', 'taxi', 'me', 'yoga', 'pizza'],
  'deu|eng': ['bar', 'email', 'hotel', 'internet', 'okay', 'ok', 'taxi'],
  'eng|por': ['total', 'hotel', 'emails', 'internet', 'taxi', 'radio', 'um', 'yoga', 'me'],
  // ita additions, read on ita_for_eng 2026-10-19 (job #176): idea, in, no are the Italian words themselves
  'eng|ita': ['email', 'hotel', 'internet', 'okay', 'ok', 'taxi', 'radio', 'pizza', 'me', 'idea', 'in', 'no'],
  'eng|fra': ['taxi', 'hotel', 'email', 'internet'],
};
const identical = {
  id: 'C15', name: 'English and target identical', rule: 'scan-course Check 15 (target missing)', blocks: 'yes',
  run: (snap) => {
    // a capitalised identical pair is a name ("Africa | Africa"), not a missing target
    const allow = new Set(COGNATES[[snap.known_lang, snap.target_lang].sort().join('|')] || []);
    return rows(snap, { tiles: true }).filter((r) => { const k = r.known.toLowerCase().trim(), t = r.target.toLowerCase().trim(); return k && k === t && !allow.has(k.replace(/[.,!?¿¡]/g, '')) && !/^\p{Lu}/u.test(r.target.trim()); })
      .map((r) => hit(r, 'known text = target text'));
  },
};

// ── 16. thin baskets ──────────────────────────────────────────────────────────────────────────────────────────
// P30 (Tom, 2026-09-30): a debut LEGO (is_new) with no real practice phrase — no BUILD and no USE, the bare LEGO
// never counts — is a release blocker. P10: fewer than ~2 USE is SOFT (reported, never blocks). The phrase-quality
// lane's floor (Tom, 2026-10-11: "no LEGO can end up with < 4 USE phrases") is reported as its own bucket.
function thinBaskets(snap) {
  const basket = new Map();
  for (const p of snap.phrases) { const k = `${p.seed_number}/${p.lego_index}`; (basket.get(k) || basket.set(k, []).get(k)).push(p); }
  const out = [];
  for (const l of snap.legos) {
    if (!l.is_new) continue;
    const own = pairKey(l.known_text, l.target_text);
    const ps = (basket.get(`${l.seed_number}/${l.lego_index}`) || []).filter((p) => p.phrase_role !== 'component' && pairKey(p.known_text, p.target_text) !== own);
    const b = ps.filter((p) => p.phrase_role === 'build').length, u = ps.filter((p) => p.phrase_role === 'use').length;
    const bucket = b + u === 0 ? 'unpractised' : u === 0 ? 'no-use' : u < 2 ? 'use<2' : u < 4 ? 'use<4' : null;
    if (bucket) out.push({ seed: l.seed_number, ref: legoRef(l), kind: 'lego', role: 'lego', known: l.known_text, target: l.target_text, why: `${b} build, ${u} use`, bucket });
  }
  return out;
}
const thinCheck = { id: 'C16', name: 'New LEGOs with too little practice', rule: 'P30 (unpractised debut blocks); P10 (<2 use SOFT); lane floor <4 use', blocks: 'yes', run: thinBaskets };

// ── 17. language-specific grammar candidates ──────────────────────────────────────────────────────────────────
// Every pattern is a CANDIDATE list for a reader. Only the sub-check of the course's target language runs.
const LANG17 = {
  ita: [{ bucket: 'ita-subjunctive', why: 'indicative after penso/credo/sembra/è possibile che',
    re: /(?<!\p{L})(pens[oai]|cred[oai]|sembra|è possibile)\s+che\s+(\p{L}+\s+)?(ha|hanno|è|sono|può|possono|deve|devono|vuole|vogliono|fa|fanno|va|vanno|viene|vengono|sa|sanno|dice|dicono)(?!\p{L})/iu }],
  spa: [{ bucket: 'spa-llevar', why: 'llevar + gerund (time missing or after the gerund)', re: /(?<!\p{L})llev[oa]s?\s+\p{L}+ndo(?!\p{L})/iu }],
  deu: [{ bucket: 'deu-subordinate', why: 'subordinate clause: is the finite verb last?', re: /(?<!\p{L})(weil|dass|wenn|ob|als|nachdem|bevor|während|damit|obwohl|falls|sobald)(?!\p{L})/iu }],
  jpn: [{ bucket: 'jpn-ka', why: 'question particle か with no question mark', re: /か\s*$/u }],
  por: [{ bucket: 'por-voce', why: 'singular você in European Portuguese', re: /(?<!\p{L})você(?!\p{L})/iu, skip: (snap) => /_br/.test(snap.course) }],
};
const langSpecific = {
  id: 'C17', name: 'Language-specific grammar', rule: 'scan-course Check 17 (17b for Italian)', blocks: 'yes',
  needs: (snap) => LANG17[snap.target_lang] ? null : `no pattern for ${snap.target_lang}: UNAVAILABLE`,
  run: (snap) => {
    const out = [];
    for (const pat of LANG17[snap.target_lang] || []) {
      if (pat.skip && pat.skip(snap)) continue;
      for (const r of rows(snap)) if (pat.re.test(r.target)) out.push({ ...hit(r, `${pat.why}: "${r.target.match(pat.re)[0]}"`), bucket: pat.bucket });
    }
    return out;
  },
};

// ── duplicate LEGOs ───────────────────────────────────────────────────────────────────────────────────────────
// Kai, 2026-09-23: a LEGO is a duplicate ONLY if BOTH sides match an earlier LEGO (same English under different
// target stays new). 'duplicate-new': marked new although an earlier new LEGO already teaches the exact pair.
// 'not-new-unearned' (L31, HARD): marked not-new although no earlier new LEGO has its exact pair, so its basket is
// dark for no reason (P25). Pairs compare on the gate's word normaliser (case and punctuation folded, accents kept).
function duplicates(snap) {
  const firstNew = new Map(); const out = [];
  const order = snap.legos.slice().sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  for (const l of order) {
    const k = pairKey(l.known_text, l.target_text);
    const prior = firstNew.get(k);
    const r = { seed: l.seed_number, ref: legoRef(l), kind: 'lego', role: l.is_new ? 'lego' : 'lego-not-new', known: l.known_text, target: l.target_text };
    if (l.is_new) {
      if (prior && prior.seed_number < l.seed_number) out.push(hit(r, `same pair taught new at ${legoRef(prior)}`, { bucket: 'duplicate-new', earlier: legoRef(prior) }));
      else if (!prior) firstNew.set(k, l);
    } else if (!prior || prior.seed_number >= l.seed_number) out.push(hit(r, 'not new, but no earlier new LEGO has this exact pair', { bucket: 'not-new-unearned' }));
  }
  return out;
}
const duplicateCheck = { id: 'DUP', name: 'Duplicate / wrongly not-new LEGOs', rule: 'duplicate only if BOTH sides match (Kai 2026-09-23); L31; P25', blocks: 'yes', run: duplicates };

// ── English / target length mismatch ──────────────────────────────────────────────────────────────────────────
// A row whose two sides differ in length far more than the course's own rows do — a candidate for a dropped or an
// added clause. Length ratio across languages is a false-positive machine (see
// tools/qa/known-target-mismatch/detect-mismatch.cjs), so the yardstick is THIS course's own distribution: robust z
// of log(target letters / known letters) against the course median and MAD, on rows whose longer side has at least
// MIN_LETTERS letters. LETTERS, NOT WORDS — measured on ita_for_eng 2026-10-19 (job #176): by word count all 33 hits
// were Italian clitic packing ("to give it to him | darglielo", "do you all want to go | volete andare"), 0 real; by
// letters the same course gives real added/dropped material ("to set | dare un buon esempio").
const MIN_LETTERS = 15, Z = 3.5;
function lengthMismatch(snap) {
  const rs = rows(snap).filter((r) => r.kind !== 'tile').map((r) => ({ r, k: squash(r.known).length, t: squash(r.target).length })).filter((x) => x.k && x.t);
  if (!rs.length) return [];
  const lr = rs.map((x) => Math.log(x.t / x.k)).sort((a, b) => a - b);
  const med = lr[Math.floor(lr.length / 2)];
  const mad = lr.map((v) => Math.abs(v - med)).sort((a, b) => a - b)[Math.floor(lr.length / 2)] || 0.1;
  const out = [];
  for (const x of rs) {
    if (Math.max(x.k, x.t) < MIN_LETTERS) continue;
    const z = (Math.log(x.t / x.k) - med) / (1.4826 * mad);
    if (Math.abs(z) >= Z) out.push(hit(x.r, `${x.k} English vs ${x.t} target letters (z ${z.toFixed(1)})`, { bucket: z < 0 ? 'target-short' : 'target-long', z }));
  }
  return out.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
}
const lengthCheck = { id: 'LEN', name: 'English and target lengths do not match', rule: 'brief #176 (candidate for a dropped or added clause)', blocks: 'yes', run: lengthMismatch };

// ── seed sentence in a played basket (P26) ────────────────────────────────────────────────────────────────────
// P26 (HARD): every seed sentence is a phrase under a NEW LEGO it contains. 'missing': no non-component row under
// any new LEGO says the seed on both sides. 'early' / 'foreign-*': the P26 row sits under a LEGO that plays before
// the seed's last new LEGO (the #363 defect), judged by that sweep's own plan(), run here in memory. Round order is
// (seed, lego_index) — the snapshot carries no course_round_index, and the sweep falls back to exactly that.
function seedPlacement(snap) {
  const cjk = CJK.has(snap.target_lang);
  const isNew = new Map(snap.legos.map((l) => [`${l.seed_number}/${l.lego_index}`, !!l.is_new]));
  const norm = (t) => (cjk ? squash(t) : words(t).join(' '));
  const played = new Set(snap.phrases.filter((p) => p.phrase_role !== 'component' && isNew.get(`${p.seed_number}/${p.lego_index}`)).map((p) => `${norm(p.known_text)}|${norm(p.target_text)}`));
  const decomposed = new Set(snap.legos.map((l) => l.seed_number));
  const out = [];
  for (const s of snap.seeds) {
    if (!decomposed.has(s.seed_number)) continue;
    if (!played.has(`${norm(s.known_text)}|${norm(s.target_text)}`))
      out.push({ seed: s.seed_number, ref: s.seed_id, kind: 'seed', role: 'seed', known: s.known_text, target: s.target_text, why: 'the seed sentence is not a phrase under any new LEGO', bucket: 'missing' });
  }
  const phrases = snap.phrases.map((p) => ({ ...p, id: sidOf(snap, p.id) }));
  const refs = new Set(snap.legos.map(legoRef));
  const rows26 = phrases.filter((p) => p.phrase_role === 'use' && p.metadata && p.metadata.seed_sentence_of != null && refs.has(p.id.slice(0, 8)))
    .map((p) => ({ ...p, seed_sentence_of: Number(p.metadata.seed_sentence_of) }));
  if (!cjk) {
    const res = p26.plan({ course: snap.course, legos: snap.legos, phrases, p26: rows26, seeds: new Map(snap.seeds.map((s) => [s.seed_number, s.target_text])) });
    // A seed with no NEW LEGO of its own has no home of its own: P26's second and third clauses send its sentence to
    // another seed's new LEGO on purpose (#635·I did 610/624/638/96 that way), so that placement is compliant.
    const ownNew = new Set(snap.legos.filter((l) => l.is_new).map((l) => l.seed_number));
    for (const f of [...res.moves, ...res.held]) if (ownNew.has(f.seed)) out.push({ seed: f.seed, ref: f.id, kind: 'phrase', role: 'use', known: f.known, target: f.target, why: `seed ${f.seed}'s sentence sits under ${f.from} (${f.kind})${f.why ? ` — held: ${f.why}` : ''}`, bucket: f.kind });
  }
  return out;
}
const placementCheck = {
  id: 'P26', name: 'Seed sentence not where the learner says it', rule: 'P26 (HARD); #363 early placement', blocks: 'yes', run: seedPlacement,
  needs: (snap) => CJK.has(snap.target_lang) ? 'placement half is word-based: only the missing half runs on an unspaced script' : null,
};

// ── phrase missing its own LEGO (CANDIDATE SCAN, needs reading) ───────────────────────────────────────────────
// P17 (HARD): every phrase under a LEGO, BUILD and USE, contains the WHOLE LEGO on the target side. Kai, 2026-10-19:
// "we do a regex-based scan to flag candidates, and then read through to find real offenders — I have found quite a
// few exceptions to the rule over the years, so there's nothing automatic". So this is deliberately LOOSE (a missed
// offender is worse than an extra candidate) and its count is NOT a finding. It is reported as 'candidate scan,
// needs reading', never as a pass/fail number. Only Italian has a matcher; any other target is UNAVAILABLE.
//
// A LEGO token matches a phrase token when, after folding case and accents and splitting at apostrophes (l'avrei →
// l + avrei), they are: equal; in one article/preposition family (lo/la/l/il/gli/le/un/una/uno, di/d/del…);
// sharing a stem (a prefix of ≥ 4 letters covering all but 3 of the LEGO's letters — inflection, mi piace/piacere);
// or the L28 stem+clitic spelling (dire ↔ dirlo, mettere ↔ metterlo, fare ↔ farlo). K31 interveners (non, ancora,
// già, solo) are tolerated inside the phrase because tokens need not be adjacent. Buckets: 'content-missing' (a
// content word of the LEGO has no counterpart in the phrase — the P17 break), 'function-missing' (only a small
// word such as di/a/non/che is absent — often an elision or the K31 family, read it), 'scattered' (every token is
// present but not in one run — word order or a split LEGO, read it), 'inflected' (the LEGO is there but a long word of it only
// by shared stem — the phrase may say another FORM of the verb, read it).
const ITA_FAMILY = [['il', 'lo', 'la', 'l', 'i', 'gli', 'le', 'un', 'uno', 'una'], ['di', 'd', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'dell'], ['a', 'ad', 'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'all'], ['da', 'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle', 'dall'], ['in', 'nel', 'nello', 'nella', 'nei', 'negli', 'nelle', 'nell'], ['su', 'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle', 'sull'], ['e', 'ed'], ['o', 'od'], ['mi', 'me', 'm'], ['ti', 'te', 't'], ['ci', 'ce', 'c'], ['vi', 've', 'v'], ['si', 'se', 's'], ['lo', 'glielo', 'gliela', 'glieli', 'gliele', 'gli', 'le', 'li', 'la', 'l']];
const ITA_FUNCTION = new Set(['il', 'lo', 'la', 'l', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'd', 'a', 'ad', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'e', 'ed', 'o', 'non', 'ci', 'mi', 'ti', 'si', 'vi', 'ne', 'che', 'se', 'ma', 'del', 'al', 'nel', 'dal', 'sul', 'è']);
const fold = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
// preposition+article contractions are read as two tokens, so dell'ultima volta contains l'ultima volta but alla maggior parte (a + la) is NOT per la maggior parte
const CONTRACTION = {};
for (const [prep, stems] of [['di', 'de'], ['a', 'a'], ['da', 'da'], ['in', 'ne'], ['su', 'su']])
  for (const [suffix, art] of [['l', 'il'], ['llo', 'lo'], ['lla', 'la'], ['i', 'i'], ['gli', 'gli'], ['lle', 'le'], ['ll', 'l']]) CONTRACTION[stems + suffix] = [prep, art];
const itaTokens = (t) => fold(t).replace(/[’‘`]/g, "'").split(/[^\p{L}\p{N}]+/u).filter(Boolean).flatMap((w) => CONTRACTION[w] || [w]);
function itaTokenMatches(lt, pt) {
  if (lt === pt) return true;
  if (ITA_FAMILY.some((f) => f.includes(lt) && f.includes(pt))) return true;
  let cp = 0; while (cp < lt.length && cp < pt.length && lt[cp] === pt[cp]) cp++;
  const short = Math.min(lt.length, pt.length);
  // shared stem: inflection, subjunctive, plural (felici/felice, va/vada, ha/hanno). Short words (≤3 letters) must be a prefix of the other.
  if (cp >= 2 && cp >= (short <= 3 ? short : short - 2) && Math.abs(lt.length - pt.length) <= (short <= 3 ? 2 : 5)) return true;
  if (cp >= 4 && cp >= lt.length - 3) return true;
  // L28 stem + clitic spelling: dire → dirlo, mettere → metterlo, aiutare → aiutarlo
  const inf = lt.replace(/(are|ere|ire|rre|re)$/, '');
  return inf !== lt && inf.length >= 2 && pt.startsWith(inf.slice(0, Math.max(2, inf.length - 1))) && /(lo|la|li|le|mi|ti|ci|vi|gli|ne|si|melo|telo|glielo|gliela|cela)$/.test(pt) && pt.length > inf.length - 1;
}
// the LEGO's tokens in one unbroken run of the phrase, a K31 intervener (non, ancora, già, solo) allowed between
const ITA_INTERVENERS = new Set(['non', 'ancora', 'gia', 'solo']);
function runIn(lt, pt) {
  for (let i = 0; i < pt.length; i++) {
    let j = i, k = 0;
    while (k < lt.length && j < pt.length) {
      if (itaTokenMatches(lt[k], pt[j])) { k++; j++; } else if (k > 0 && ITA_INTERVENERS.has(pt[j]) && !ITA_INTERVENERS.has(lt[k])) j++; else break;
    }
    if (k === lt.length) return true;
  }
  return false;
}
function legoInPhrase(legoTarget, phraseTarget) {
  const lt = itaTokens(legoTarget), pt = itaTokens(phraseTarget);
  if (runIn(lt, pt)) {
    // every token is there, but a long content word only by shared stem: the phrase may say another FORM of the LEGO's word
    // (prendersi → prendermi, funziona → funzioni). Lane precedent: S0077L03U06 sto → stia was confirmed BAD.
    const exact = new Set(pt), inflected = lt.filter((t) => t.length >= 5 && !exact.has(t));
    return inflected.length ? { bucket: 'inflected', missing: inflected } : null;
  }
  const used = new Set(), missing = [];
  for (const t of lt) {
    let j = -1;
    for (let i = 0; i < pt.length && j < 0; i++) if (!used.has(i) && itaTokenMatches(t, pt[i])) j = i;
    if (j < 0) missing.push(t); else used.add(j);
  }
  const content = missing.filter((t) => !ITA_FUNCTION.has(t));
  if (content.length) return { bucket: 'content-missing', missing: content };
  if (missing.length) return { bucket: 'function-missing', missing };
  return { bucket: 'scattered', missing: [] };
}
function phraseMissingLego(snap) {
  if (snap.target_lang !== 'ita') return [];
  const legoOf = new Map(snap.legos.map((l) => [`${l.seed_number}/${l.lego_index}`, l]));
  const out = [];
  for (const p of snap.phrases) {
    if (p.phrase_role === 'component') continue;
    const l = legoOf.get(`${p.seed_number}/${p.lego_index}`);
    if (!l || !l.target_text) continue;
    const r = legoInPhrase(l.target_text, p.target_text || '');
    if (!r) continue;
    out.push({ seed: p.seed_number, ref: sidOf(snap, p.id), kind: 'phrase', role: p.phrase_role, known: p.known_text || '', target: p.target_text || '', bucket: r.bucket,
      lego: legoRef(l), lego_known: l.known_text || '', lego_target: l.target_text, lego_is_new: !!l.is_new,
      why: `candidate scan, needs reading: LEGO "${l.known_text} | ${l.target_text}"${r.bucket === 'inflected' ? ` — only another form of: ${r.missing.join(', ')}` : r.missing.length ? ` — no counterpart for: ${r.missing.join(', ')}` : ' — words present but not in one run'}` });
  }
  return out;
}
const ownLegoCheck = {
  id: 'P17', name: 'Phrase may be missing its own LEGO (CANDIDATE SCAN, needs reading — not a pass/fail count)', rule: 'P17 (HARD) with the L28 / K31 exceptions; Kai 2026-10-19: flag by scan, find real offenders by reading', blocks: 'ask',
  run: phraseMissingLego, candidateScan: true,
  needs: (snap) => snap.target_lang === 'ita' ? null : `no matcher for ${snap.target_lang}: UNAVAILABLE`,
};

const CHECKS = [parentheticals, slashes, wrongKnown, wrongTarget, multiSentence, unpronounceable, speechMarks, trailingPeriod, lowercaseI, zutCheck, capitalisationCheck, identical, thinCheck, langSpecific, duplicateCheck, lengthCheck, placementCheck, ownLegoCheck];

module.exports = { CHECKS, legoInPhrase, phraseMissingLego, rows, secondSentence, offScript, otherLanguageWords, wrapped, LOWER_I, PAREN, SLASH, zut, capitalisation, thinBaskets, duplicates, lengthMismatch, seedPlacement };
