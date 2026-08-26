#!/usr/bin/env node
/**
 * build-utterance-set.cjs — build a TTS voice-benchmark utterance set for ONE language
 * straight out of the live course DB (Supabase/PostgREST). Nothing is invented: every
 * utterance carries provenance back to a real row in course_seeds / course_legos /
 * course_practice_phrases / course_audio.
 *
 *   node tools/tts-bakeoff/build-utterance-set.cjs --language cym
 *   node tools/tts-bakeoff/build-utterance-set.cjs --language eng --out /tmp/eng.json
 *   node tools/tts-bakeoff/build-utterance-set.cjs --courses cym_n_for_eng,cym_s_for_eng
 *
 * Re-runnable and deterministic: no randomness, no clock in the output beyond --date,
 * so two runs over an unchanged DB produce a byte-identical file.
 *
 * Language packs live in LANG_PACKS below. A language with no pack still builds — it just
 * loses the pack-driven categories (hard_pronunciation, minimal_pair, some numbers), and
 * the run REPORTS those as explicit gaps rather than padding them with invented text.
 *
 * Generates no audio and spends nothing.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------- env + PostgREST

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*=/.test(line)) continue;
    const i = line.indexOf('=');
    out[line.slice(0, i)] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const ENV = loadEnv();
const SUPABASE_URL = ENV.SUPABASE_URL;
const SUPABASE_KEY = ENV.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FATAL: SUPABASE_URL / SUPABASE_SERVICE_KEY missing from repo-root .env');
  process.exit(1);
}

async function rest(pathAndQuery) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status} on ${pathAndQuery}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** Paged read. PostgREST offset paging needs an explicit ORDER BY or rows repeat/vanish. */
async function restAll(table, select, filters, order, pageSize = 1000) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await rest(
      `${table}?select=${select}&${filters}&order=${order}&limit=${pageSize}&offset=${offset}`
    );
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

// ---------------------------------------------------------------- helpers

const norm = (s) => (s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
const lower = (s) => norm(s).toLowerCase();
const stripPunct = (s) => lower(s).replace(/[.,!?;:—–…"“”«»()¿¡]/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => stripPunct(s).split(' ').filter(Boolean);
const wordCount = (s) => words(s).length;

/** Deterministic 32-bit FNV-1a — used only for stable ordering, never for randomness. */
function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Deterministic spread: hash order, not seed order, so a category samples across the whole
 * course instead of clumping on the first five seeds (where every phrase is a variant of the
 * same three words). Optional priority puts better candidates first without losing the spread.
 */
function spread(cands, n, priority) {
  const scored = [...cands].map((c) => ({ c, p: priority ? priority(c) : 0, h: fnv(c.key) }));
  scored.sort((a, b) => (b.p - a.p) || (a.h - b.h) || (a.c.key < b.c.key ? -1 : 1));
  return scored.slice(0, n).map((s) => s.c);
}

/** First-three-words prefix, used to stop a category filling with near-identical phrases. */
const prefixOf = (t) => words(t).slice(0, 3).join(' ');

function levDist1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = a.length - 1, k = b.length - 1;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  while (j >= i && k >= i && a[j] === b[k]) { j--; k--; }
  return (j - i) <= 0 && (k - i) <= 0;
}

// ---------------------------------------------------------------- language packs

const CY_MUTATIONS = [
  // [radical initial, mutated initial, mutation name]
  ['c', 'g', 'soft'], ['p', 'b', 'soft'], ['t', 'd', 'soft'],
  ['g', '', 'soft'], ['b', 'f', 'soft'], ['d', 'dd', 'soft'],
  ['m', 'f', 'soft'], ['ll', 'l', 'soft'], ['rh', 'r', 'soft'],
  ['c', 'ch', 'aspirate'], ['p', 'ph', 'aspirate'], ['t', 'th', 'aspirate'],
  ['c', 'ngh', 'nasal'], ['p', 'mh', 'nasal'], ['t', 'nh', 'nasal'],
  ['g', 'ng', 'nasal'], ['b', 'm', 'nasal'], ['d', 'n', 'nasal'],
];

const LANG_PACKS = {
  cym: {
    label: 'Welsh',
    // Each rule matches REAL corpus strings; the note explains why the string is hard.
    hard: [
      { id: 'll', test: (t) => /(^|[\s’'])ll/i.test(t), note: 'word-initial "ll" — the voiceless alveolar lateral fricative /ɬ/. English-trained models render it as /l/ or /kl/; it is the single most common Welsh giveaway.' },
      { id: 'rh', test: (t) => /(^|[\s’'])rh/i.test(t), note: 'word-initial "rh" — voiceless trilled /r̥/. Usually collapsed to a plain English /r/ or read as an /r/+/h/ sequence.' },
      { id: 'ch', test: (t) => /ch/i.test(t), note: '"ch" — voiceless velar fricative /χ/. Frequently anglicised to /tʃ/ (as in "church") or dropped to /k/.' },
      { id: 'dd-th', test: (t) => /(dd|th)/i.test(t), note: '"dd" is voiced /ð/ and "th" voiceless /θ/ — models that read Welsh through English orthography swap or merge the pair.' },
      { id: 'w-vowel', test: (t) => /\b[bcdfghjlmnprstw]{1,3}w[bcdfghlmnprstw]/i.test(t), note: '"w" used as a VOWEL /u/ (cwm, bwrdd, dwr). A model treating w as a glide produces an English /w/ consonant and destroys the syllable.' },
      { id: 'y-schwa', test: (t) => /\by[a-zâêîôûŵŷ]{2,}/i.test(t), note: '"y" is schwa /ə/ in non-final syllables but clear /ɪ/~/ɨ/ finally — the classic Welsh vowel split that models collapse to one value.' },
      { id: 'circumflex', test: (t) => /[âêîôûŵŷ]/.test(t), note: 'circumflex (to bach) marks a LONG vowel. Ignoring it shortens the vowel and changes the word.' },
      { id: 'nasal-mut', test: (t) => /(^|\s)(ngh|mh|nh|ng)[a-z]/i.test(t), note: 'voiceless-nasal onset — nasal mutation (ngh/mh/nh) or the pronoun "nhw". These onsets do not exist in English; models insert an epenthetic vowel, drop the nasal, or voice it.' },
      { id: 'si-sh', test: (t) => /\bsi[aeiouâêîôûŵŷ]/i.test(t), note: '"si" before a vowel is /ʃ/ (siarad, siwr). Read letter-by-letter it becomes /si/ and the word stops being Welsh.' },
      { id: 'ff-ph', test: (t) => /(ff|ph)/i.test(t), note: '"ff"/"ph" are /f/ while single "f" is /v/ — the inverse of the English convention, so single-f words get devoiced.' },
    ],
    mutationPairs: true,
    coreNumerals: ['un', 'dau', 'ddau', 'dwy', 'tri', 'tair', 'pedwar', 'pedair', 'pump', 'chwech', 'chwe', 'saith', 'wyth', 'naw', 'deg', 'ddeg', 'ugain', 'cant', 'can', 'mil', 'hanner', 'gloch', 'cyntaf', 'ail', 'trydydd'],
    numberWords: ['un', 'dau', 'ddau', 'dwy', 'tri', 'tair', 'pedwar', 'pedair', 'pump', 'chwech', 'chwe', 'saith', 'wyth', 'naw', 'deg', 'ddeg', 'ugain', 'cant', 'can', 'mil', 'hanner', 'gloch', 'awr', 'munud', 'dydd', 'wythnos', 'mis', 'blwyddyn', 'cyntaf', 'ail', 'trydydd'],
    properNouns: ['cymraeg', 'gymraeg', 'nghymraeg', 'chymraeg', 'cymru', 'gymru', 'nghymru', 'lloegr', 'loegr', 'llundain', 'caerdydd', 'gaerdydd', 'llun', 'mawrth', 'mercher', 'iau', 'gwener', 'sadwrn', 'sul', 'ionawr', 'chwefror', 'ebrill', 'mehefin', 'gorffennaf', 'awst', 'medi', 'hydref', 'tachwedd', 'rhagfyr', 'sbaeneg', 'saesneg', 'ffrangeg'],
  },

  eng: {
    label: 'English',
    hard: [
      { id: 'th-pair', test: (t) => /\bth/i.test(t), note: 'word-initial "th" is voiced /ð/ in function words (the, this, that) and voiceless /θ/ in content words (think, thing) — a model that picks one value for both sounds foreign on every other sentence.' },
      { id: 'ough', test: (t) => /ough/i.test(t), note: '"-ough" is the worst grapheme-to-phoneme set in English (through/though/thought/enough) — a direct test of whether the model has a real lexicon or is guessing from letters.' },
      { id: 'contraction', test: (t) => /\b\w+[’']\w+/.test(t), note: 'apostrophe contraction. The estate has repeatedly been bitten by the typographic apostrophe U+2019 vs ASCII \' — a model that tokenises on ASCII only will spell the word out or split it.' },
      { id: 'weak-form', test: (t) => /\b(to|of|for|at|a|that|can|and|have|was|are|from)\b/i.test(t), note: 'function words must reduce to schwa in connected speech; a model that gives every word its citation form sounds like a list, not a sentence — the failure mode that most often reads as "robotic".' },
      { id: 'cluster', test: (t) => /\b\w*(str|scr|spr|thr|ngth|nds|sks|lfth|xt)\w*\b/i.test(t), note: 'heavy consonant cluster — where clipping, epenthesis and swallowed onsets show up.' },
      { id: 'heteronym', test: (t) => /\b(read|live|lives|lead|close|use|used|record|present|object|content|wind|tear|row|minute|bow|wound|does|sow|refuse|separate|invalid|desert|excuse|permit)\b/i.test(t), note: 'contains an English heteronym — one spelling, two pronunciations chosen by part of speech. Only a model doing real syntactic disambiguation gets it right; the rest coin-flip.' },
      { id: 'long-vowel-pair', test: (t) => /\b(been|bean|seat|sit|ship|sheep|full|fool|pull|pool|leave|live|feel|fill)\b/i.test(t), note: 'tense/lax vowel pair (/iː/ vs /ɪ/, /uː/ vs /ʊ/) — the contrast a length-insensitive model collapses.' },
    ],
    mutationPairs: false,
    minimalPairContrasts: [
      ['th', 't'], ['th', 'd'], ['th', 's'], ['th', 'f'],
      ['v', 'w'], ['v', 'b'], ['v', 'f'], ['s', 'z'], ['s', 'sh'],
      ['i', 'e'], ['i', 'a'], ['a', 'o'], ['a', 'u'], ['e', 'a'], ['o', 'u'],
      ['n', 'm'], ['l', 'r'], ['p', 'b'], ['k', 'g'], ['t', 'd'],
    ],
    coreNumerals: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'twenty', 'thirty', 'forty', 'fifty', 'hundred', 'thousand', 'million', 'half', 'quarter', "o'clock", '’clock', 'first', 'second', 'third'],
    numberWords: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'twenty', 'thirty', 'forty', 'fifty', 'hundred', 'thousand', 'million', 'half', 'quarter', "o'clock", '’clock', 'first', 'second', 'third', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
    properNouns: ['english', 'welsh', 'spanish', 'french', 'german', 'italian', 'london', 'wales', 'england', 'britain', 'cardiff', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'christmas'],
  },
};

const CATEGORIES = {
  isolated_word: { label: 'Isolated word', purpose: 'Single words rendered with no sentence around them — the hardest case for prosody. Exposes flat citation-form delivery, wrong lexical stress and a missing final release.' },
  very_short_lego: { label: 'Very short LEGO (2-3 words)', purpose: 'The learning unit at its shortest. Too short for a model to settle into a rhythm, so clipped onsets, swallowed first syllables and truncated tails all surface here.' },
  medium_chunk: { label: 'Medium chunk (BUILD-phrase sized)', purpose: 'A phrase fragment, not a sentence. Tests whether the model can deliver an incomplete thought without either falling off a cliff at the end or inventing a full-stop cadence.' },
  full_sentence: { label: 'Full sentence (USE phrase)', purpose: 'A complete natural sentence — what most of the course actually is. The baseline for naturalness, phrasing and breath placement.' },
  question: { label: 'Question', purpose: 'Interrogative intonation. Many models flatten questions to statements, or apply a generic rise regardless of question type.' },
  numbers: { label: 'Numbers, dates and times', purpose: 'Where text normalisation fails. Listen for wrong number forms, a counted noun in the wrong gender/mutation, and dates or clock times read as bare digits or as the wrong quantity.' },
  hard_pronunciation: { label: 'Hard pronunciation', purpose: 'Strings selected because they carry a phoneme, cluster or grapheme this language is known to break on. Mined from real course rows, never written by hand. Each carries a difficulty_note saying what to listen for.' },
  proper_noun: { label: 'Proper noun', purpose: 'Names, places, languages, days and months — the class most often anglicised. A model that reads "Cymraeg" as an English word is instantly disqualified for course work.' },
  minimal_pair: { label: 'Minimal pair', purpose: 'Two real corpus words differing in one contrast. If the model renders both members identically it has collapsed a distinction the learner is being taught, and the course teaches a mistake.' },
  repeat_probe: { label: 'Repeat probe', purpose: 'Exactly one utterance per language, synthesised many times over. Measures intra-voice consistency and repeatability (Tom axes D and E) — does the same input give the same output today, and again next month?' },
};

// per-category target counts (sums to 99, inside the 50-100 band)
const QUOTA = {
  isolated_word: 12,
  very_short_lego: 12,
  medium_chunk: 12,
  full_sentence: 12,
  question: 10,
  numbers: 8,
  hard_pronunciation: 14,
  proper_noun: 8,
  minimal_pair: 10,
  repeat_probe: 1,
};

// ---------------------------------------------------------------- course selection

async function pickCourses(language, explicit) {
  if (explicit) return explicit.split(',').map((s) => s.trim()).filter(Boolean);
  const rows = await rest(
    `courses?select=course_code,target_lang,new_app_status,seed_count,dialect&target_lang=eq.${language}&order=course_code`
  );
  const rank = { live: 0, beta: 1, draft: 2, not_available: 3 };
  const usable = rows.filter((r) => (rank[r.new_app_status] ?? 9) <= 1);
  usable.sort((a, b) => (rank[a.new_app_status] - rank[b.new_app_status]) || (a.course_code < b.course_code ? -1 : 1));
  // 4 courses is plenty: within a target language the seed corpus is largely shared.
  return usable.slice(0, 4).map((r) => r.course_code);
}

async function loadCourse(code, language) {
  const [meta] = await rest(`courses?select=course_code,target_lang,dialect,new_app_status&course_code=eq.${code}`);
  const seeds = await restAll('course_seeds', 'id,seed_id,seed_number,known_text,target_text',
    `course_code=eq.${code}`, 'seed_number.asc,id.asc');
  const legos = await restAll('course_legos', 'id,lego_id,seed_number,lego_index,type,known_text,target_text',
    `course_code=eq.${code}`, 'seed_number.asc,lego_index.asc,id.asc');
  const phrases = await restAll('course_practice_phrases', 'id,seed_number,lego_index,phrase_role,known_text,target_text',
    `course_code=eq.${code}`, 'seed_number.asc,id.asc');
  // course_audio carries pod / instruction / encouragement text that never appears in the
  // seed corpus — this is where number words and multi-sentence material actually live.
  let audio = [];
  try {
    audio = await restAll('course_audio', 'id,text,role,language,rerecord_wanted',
      `course_code=eq.${code}&language=eq.${language}`, 'id.asc');
  } catch (e) {
    audio = [];
  }
  let flagged = [];
  try {
    flagged = await rest(`course_audio?select=id,text,role,rerecord_wanted&course_code=eq.${code}&language=eq.${language}&rerecord_wanted=not.is.null&limit=1000`);
  } catch (e) {
    flagged = [];
  }
  return { code, meta, seeds, legos, phrases, audio, flagged };
}

// ---------------------------------------------------------------- candidate pool

/**
 * Cyrillic/Greek letters sitting inside otherwise-Latin course text are a data defect, not a
 * pronunciation case: the row looks right on screen and is a different string underneath.
 * We drop such rows from the benchmark and report them separately — a benchmark that tests a
 * homoglyph tests the database, not the voice.
 */
const HOMOGLYPH = /[Ѐ-ӿͰ-Ͽ]/;

function buildPool(courses, homoglyphSink) {
  const pool = [];
  for (const c of courses) {
    const dialect = c.meta && c.meta.dialect ? c.meta.dialect : null;
    for (const s of c.seeds) {
      if (!norm(s.target_text)) continue;
      pool.push({ text: norm(s.target_text), table: 'course_seeds', row_id: s.id, seed_number: s.seed_number,
        extra: { seed_id: s.seed_id }, course_code: c.code, dialect, kind: 'seed' });
    }
    for (const l of c.legos) {
      if (!norm(l.target_text)) continue;
      pool.push({ text: norm(l.target_text), table: 'course_legos', row_id: l.id, seed_number: l.seed_number,
        extra: { lego_id: l.lego_id, lego_type: l.type }, course_code: c.code, dialect, kind: 'lego' });
    }
    for (const p of c.phrases) {
      if (!norm(p.target_text)) continue;
      pool.push({ text: norm(p.target_text), table: 'course_practice_phrases', row_id: p.id, seed_number: p.seed_number,
        extra: { phrase_role: p.phrase_role }, course_code: c.code, dialect, kind: p.phrase_role });
    }
    for (const a of c.audio) {
      const raw = norm(a.text);
      if (!raw) continue;
      // pod explainer rows carry a leading control marker, e.g. "[atom] 11 o'clock". The marker
      // is not content and must not be spoken; it is stripped and the raw text recorded, so the
      // trace back to the row still holds.
      const marker = /^\[([a-z_]+)\]\s*/i.exec(raw);
      const text = marker ? raw.slice(marker[0].length) : raw;
      if (!text) continue;
      pool.push({ text, table: 'course_audio', row_id: a.id, seed_number: null,
        extra: {
          role: a.role,
          rerecord_wanted: !!a.rerecord_wanted,
          ...(marker ? { source_text: raw, transform: `stripped leading "${marker[0].trim()}" control marker` } : {}),
        },
        course_code: c.code, dialect, kind: 'audio' });
    }
  }
  // Dedupe on normalised text. Where the SAME string exists in several sibling courses
  // (the two Welsh dialects share a lot of corpus), attribute it deterministically by hash
  // rather than always to the first course, so provenance does not skew to one dialect.
  const byText = new Map();
  for (const cand of pool) {
    if (HOMOGLYPH.test(cand.text)) {
      if (homoglyphSink) homoglyphSink.push({ text: cand.text, course_code: cand.course_code, table: cand.table, row_id: cand.row_id, seed_number: cand.seed_number });
      continue;
    }
    const k = lower(cand.text);
    if (!byText.has(k)) byText.set(k, []);
    byText.get(k).push(cand);
  }
  const out = [];
  for (const [k, variants] of byText) {
    const pick = variants[fnv(k) % variants.length];
    pick.key = `${pick.table}:${pick.row_id}`;
    out.push(pick);
  }
  return out;
}

// ---------------------------------------------------------------- category fillers

function mutationPairsFrom(pool, packHasMutations) {
  if (!packHasMutations) return [];
  const byWord = new Map(); // word -> candidate that contains it (shortest wins)
  for (const c of pool) {
    for (const w of words(c.text)) {
      if (w.length < 3) continue;
      const prev = byWord.get(w);
      if (!prev || c.text.length < prev.text.length) byWord.set(w, c);
    }
  }
  const pairs = [];
  for (const [w] of byWord) {
    // apostrophes glue clitics onto the stem ("chi’n") and make the mutation arithmetic lie
    if (/[’']/.test(w)) continue;
    for (const [rad, mut, name] of CY_MUTATIONS) {
      if (!w.startsWith(mut === '' ? '' : mut)) continue;
      const stem = mut === '' ? w : w.slice(mut.length);
      const radical = rad + stem;
      if (radical === w) continue;
      if (!byWord.has(radical)) continue;
      if (stem.length < 3) continue;
      pairs.push({ a: radical, b: w, mutation: name });
    }
  }
  // dedupe by unordered pair
  const seen = new Set();
  return pairs.filter((p) => {
    const k = [p.a, p.b].sort().join('|');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).sort((x, y) => fnv(x.a + x.b) - fnv(y.a + y.b));
}

function editPairsFrom(pool, contrasts) {
  if (!contrasts) return [];
  const freq = new Map();
  const holder = new Map();
  for (const c of pool) {
    for (const w of words(c.text)) {
      if (w.length < 3 || /[^a-z’']/.test(w)) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
      const prev = holder.get(w);
      if (!prev || c.text.length < prev.text.length) holder.set(w, c);
    }
  }
  const list = [...freq.keys()].filter((w) => freq.get(w) >= 3).sort();
  const pairs = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (Math.abs(a.length - b.length) > 1) continue;
      if (!levDist1(a, b)) continue;
      // only keep pairs whose single difference is a real phonetic contrast
      const diff = describeDiff(a, b);
      if (!diff) continue;
      pairs.push({ a, b, contrast: diff });
    }
  }
  return pairs.sort((x, y) => fnv(x.a + x.b) - fnv(y.a + y.b));
}

function describeDiff(a, b) {
  // find the single differing position and name the contrast
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    const ca = a[i], cb = b[i];
    if (!ca || !cb) return null;
    const vowels = 'aeiou';
    if (vowels.includes(ca) && vowels.includes(cb)) return `vowel ${ca}/${cb}`;
    if (!vowels.includes(ca) && !vowels.includes(cb)) return `consonant ${ca}/${cb}`;
    return null;
  }
  return null; // insertions/deletions are not minimal phonetic contrasts we can name honestly
}

// ---------------------------------------------------------------- main build

async function main() {
  const argv = process.argv.slice(2);
  const arg = (name, def) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : def;
  };
  let language = arg('language');
  const coursesArg = arg('courses');
  const date = arg('date', new Date().toISOString().slice(0, 10));
  if (!language && coursesArg) {
    const [first] = coursesArg.split(',');
    const [meta] = await rest(`courses?select=target_lang&course_code=eq.${first.trim()}`);
    language = meta && meta.target_lang;
  }
  if (!language) {
    console.error('usage: build-utterance-set.cjs --language <iso639-3> [--courses a,b] [--out file] [--date YYYY-MM-DD]');
    process.exit(1);
  }
  const outPath = arg('out', path.resolve(__dirname, `data/utterances-${language}.json`));

  const codes = await pickCourses(language, coursesArg);
  if (!codes.length) {
    console.error(`No live/beta course found with target_lang=${language}. Pass --courses explicitly.`);
    process.exit(1);
  }
  console.error(`[${language}] courses: ${codes.join(', ')}`);
  const courseCodes = codes;

  const courses = [];
  for (const code of codes) courses.push(await loadCourse(code, language));
  const homoglyphRows = [];
  const pool = buildPool(courses, homoglyphRows);
  console.error(`[${language}] candidate rows after dedupe: ${pool.length}`);

  const pack = LANG_PACKS[language] || null;
  const gaps = [];
  if (homoglyphRows.length) {
    gaps.push(`DATA DEFECT, not a benchmark gap: ${homoglyphRows.length} row(s) in this corpus contain Cyrillic/Greek homoglyphs inside otherwise-Latin text and were excluded — e.g. ${homoglyphRows.slice(0, 3).map((r) => `${r.course_code} ${r.table} ${r.row_id} "${r.text}"`).join('; ')}. Worth a separate fix pass.`);
  }
  if (!pack) gaps.push(`No language pack for "${language}": hard_pronunciation, minimal_pair and number-word mining are unavailable. Add an entry to LANG_PACKS to fill them.`);

  const used = new Set();
  const utterances = [];
  let n = 0;
  const emit = (cand, category, note, repeat = 1, extraProv = {}) => {
    const k = lower(cand.text);
    if (used.has(k)) return false;
    used.add(k);
    n += 1;
    utterances.push({
      id: `${language}-${String(n).padStart(4, '0')}`,
      category,
      text: cand.text,
      language,
      provenance: {
        course_code: cand.course_code,
        table: cand.table,
        row_id: String(cand.row_id),
        seed_number: cand.seed_number,
        ...(cand.dialect ? { dialect: cand.dialect } : {}),
        ...cand.extra,
        ...extraProv,
      },
      difficulty_note: note || '',
      repeat_count: repeat,
    });
    return true;
  };

  /**
   * Pick n candidates for a category. Two passes: the first refuses near-duplicates (same
   * three opening words, same dominant keyword), the second relaxes that rather than leave
   * the category short. Picks are emitted in seed order so the file reads course-forwards.
   */
  const take = (category, cands, n, noteFn, opts = {}) => {
    const ordered = spread(cands, cands.length, opts.priority);
    const picks = [];
    const prefixes = new Set();
    const keys = new Set();
    // keep sibling courses (e.g. the two Welsh dialects) roughly level within a category
    const perCourse = new Map();
    const courseCap = Math.ceil(n / Math.max(1, courseCodes.length));
    for (const pass of [1, 2]) {
      for (const c of ordered) {
        if (picks.length >= n) break;
        if (picks.includes(c) || used.has(lower(c.text))) continue;
        if (pass === 1) {
          const pfx = prefixOf(c.text);
          const dk = opts.diversityKey ? opts.diversityKey(c) : null;
          if (prefixes.has(pfx)) continue;
          if (dk && keys.has(dk)) continue;
          if ((perCourse.get(c.course_code) || 0) >= courseCap) continue;
          prefixes.add(pfx);
          if (dk) keys.add(dk);
          perCourse.set(c.course_code, (perCourse.get(c.course_code) || 0) + 1);
        }
        picks.push(c);
      }
      if (picks.length >= n) break;
    }
    picks.sort((a, b) => (a.seed_number || 0) - (b.seed_number || 0));
    let got = 0;
    for (const c of picks) if (emit(c, category, noteFn ? noteFn(c) : '')) got++;
    if (got < n) gaps.push(`${category}: wanted ${n}, filled ${got} from the DB for ${language}. Not padded.`);
    return got;
  };

  // ---- 1. hard_pronunciation (pack-driven; first, so it gets the best strings)
  const flaggedTexts = new Map();
  for (const c of courses) {
    for (const f of c.flagged) {
      const reason = f.rerecord_wanted && (f.rerecord_wanted.reason || '');
      if (reason) flaggedTexts.set(lower(norm(f.text)), reason);
    }
  }
  let hardGot = 0;
  {
    // Rows the estate has ALREADY had to flag for re-record are the strongest evidence there
    // is, so they get the first seats — up to 3, kept short enough to be a usable probe.
    const flaggedCands = pool.filter((c) => flaggedTexts.has(lower(c.text)) && wordCount(c.text) >= 2 && wordCount(c.text) <= 14);
    // a flag naming a SPECIFIC defect beats a blanket whole-set re-record commission
    const specificity = (c) => {
      const reason = flaggedTexts.get(lower(c.text)) || '';
      const blanket = /\b(ALL|whole set|full re-record)\b/i.test(reason);
      return blanket ? 0 : 5;
    };
    const ordered = spread(flaggedCands, flaggedCands.length, specificity);
    const reasonsSeen = new Set();
    for (const pass of [1, 2]) {
      for (const c of ordered) {
        if (hardGot >= 3) break;
        const reason = flaggedTexts.get(lower(c.text));
        // one seat per distinct defect, so three seats mean three defects, not three clips
        // of the same one
        if (pass === 1 && reasonsSeen.has(reason)) continue;
        reasonsSeen.add(reason);
        const note = `DEFECT PROVENANCE — this exact string is flagged in course_audio.rerecord_wanted: "${reason.slice(0, 300)}"`;
        if (emit(c, 'hard_pronunciation', note)) hardGot++;
      }
      if (hardGot >= 3) break;
    }
  }
  if (pack) {
    const perRule = pack.hard.map((rule) => {
      const matches = pool.filter((c) => {
        const wc = wordCount(c.text);
        return wc >= 1 && wc <= 9 && rule.test(c.text);
      });
      return spread(matches, 4).map((m) => ({ ...m, _rule: rule }));
    });
    // round-robin: every hard class gets a seat before any class gets a second one
    const hardCands = [];
    for (let round = 0; round < 4; round++) for (const list of perRule) if (list[round]) hardCands.push(list[round]);
    let got = hardGot;
    for (const c of hardCands) {
      if (got >= QUOTA.hard_pronunciation) break;
      const defect = flaggedTexts.get(lower(c.text));
      const note = `[${c._rule.id}] ${c._rule.note}` + (defect ? ` PROVENANCE OF DEFECT: this exact clip carries a rerecord_wanted flag — "${defect.slice(0, 220)}"` : '');
      if (emit(c, 'hard_pronunciation', note)) got++;
    }
    // top up from re-record-flagged rows regardless of rule match — these are the strings
    // the estate has already had to re-record, which is the strongest evidence there is.
    if (got < QUOTA.hard_pronunciation) {
      const flaggedCands = pool.filter((c) => flaggedTexts.has(lower(c.text)) && wordCount(c.text) <= 14);
      // a flag naming a SPECIFIC defect beats a blanket whole-set re-record commission
    const specificity = (c) => {
      const reason = flaggedTexts.get(lower(c.text)) || '';
      const blanket = /\b(ALL|whole set|full re-record)\b/i.test(reason);
      return blanket ? 0 : 5;
    };
    for (const c of spread(flaggedCands, flaggedCands.length, specificity)) {
        if (got >= QUOTA.hard_pronunciation) break;
        const note = `Flagged for re-record in the live DB — "${flaggedTexts.get(lower(c.text)).slice(0, 260)}"`;
        if (emit(c, 'hard_pronunciation', note)) got++;
      }
    }
    if (got < QUOTA.hard_pronunciation) gaps.push(`hard_pronunciation: wanted ${QUOTA.hard_pronunciation}, filled ${got}.`);
  } else {
    gaps.push('hard_pronunciation: EMPTY — no language pack, and inventing hard cases is forbidden.');
  }

  // ---- 2. minimal_pair
  if (pack && pack.mutationPairs) {
    const pairs = mutationPairsFrom(pool, true);
    let got = 0;
    for (const p of pairs) {
      if (got >= QUOTA.minimal_pair) break;
      const a = pool.find((c) => words(c.text).includes(p.a) && wordCount(c.text) <= 6)
        || pool.find((c) => words(c.text).includes(p.a));
      const b = pool.find((c) => words(c.text).includes(p.b) && wordCount(c.text) <= 6)
        || pool.find((c) => words(c.text).includes(p.b));
      if (!a || !b) continue;
      const noteA = `Minimal pair (${p.mutation} mutation): "${p.a}" vs "${p.b}". Both forms occur in the live corpus. Listen for whether the initial consonant genuinely changes; a model that renders both members identically has erased a mutation the learner is being taught.`;
      if (emit({ ...a, text: p.a, extra: { ...a.extra, pair_partner: p.b, contrast: `${p.mutation} mutation`, attested_in: a.text } }, 'minimal_pair', noteA)) got++;
      if (got >= QUOTA.minimal_pair) break;
      if (emit({ ...b, text: p.b, extra: { ...b.extra, pair_partner: p.a, contrast: `${p.mutation} mutation`, attested_in: b.text } }, 'minimal_pair', noteA)) got++;
    }
    if (got < QUOTA.minimal_pair) gaps.push(`minimal_pair: wanted ${QUOTA.minimal_pair}, filled ${got}.`);
  } else if (pack && pack.minimalPairContrasts) {
    const pairs = editPairsFrom(pool, pack.minimalPairContrasts);
    let got = 0;
    for (const p of pairs) {
      if (got >= QUOTA.minimal_pair) break;
      const a = pool.find((c) => words(c.text).includes(p.a));
      const b = pool.find((c) => words(c.text).includes(p.b));
      if (!a || !b) continue;
      const note = `Minimal pair (${p.contrast}): "${p.a}" vs "${p.b}". Both words occur in the live corpus. If the two render identically the model has collapsed the contrast.`;
      if (emit({ ...a, text: p.a, extra: { ...a.extra, pair_partner: p.b, contrast: p.contrast, attested_in: a.text } }, 'minimal_pair', note)) got++;
      if (got >= QUOTA.minimal_pair) break;
      if (emit({ ...b, text: p.b, extra: { ...b.extra, pair_partner: p.a, contrast: p.contrast, attested_in: b.text } }, 'minimal_pair', note)) got++;
    }
    if (got < QUOTA.minimal_pair) gaps.push(`minimal_pair: wanted ${QUOTA.minimal_pair}, filled ${got}.`);
  } else {
    gaps.push('minimal_pair: EMPTY — no contrast definition for this language.');
  }

  // ---- 3. proper_noun
  if (pack && pack.properNouns) {
    const set = new Set(pack.properNouns);
    const hits = (c) => words(c.text).filter((w) => set.has(w));
    const cands = pool.filter((c) => wordCount(c.text) <= 8 && hits(c).length);
    const nameFreq = new Map();
    for (const c of pool) for (const w of words(c.text)) if (set.has(w)) nameFreq.set(w, (nameFreq.get(w) || 0) + 1);
    take('proper_noun', cands, QUOTA.proper_noun,
      (c) => `Contains a proper noun / name-class word (${hits(c).join(', ')}). Listen for anglicisation, wrong stress, or the name being read with the wrong language's phonology.`,
      // one utterance per distinct name, so the category is not eight ways of saying "Cymraeg"
      { diversityKey: (c) => hits(c).sort().join('+'),
        // rarer names first, so the category is not eight days of the week
        priority: (c) => -Math.min(nameFreq.get(hits(c)[0]) || 0, 500) });
  } else {
    gaps.push('proper_noun: EMPTY — no proper-noun list for this language.');
  }

  // ---- 4. numbers
  {
    const digitCands = pool.filter((c) => /[0-9]/.test(c.text) && wordCount(c.text) <= 30);
    const wordCands = pack && pack.numberWords
      ? pool.filter((c) => wordCount(c.text) <= 12 && words(c.text).some((w) => pack.numberWords.includes(w)))
      : [];
    const core = new Set((pack && pack.coreNumerals) || []);
    const coreHits = (c) => words(c.text).filter((w) => core.has(w));
    const cands = [...digitCands, ...wordCands];
    const got = take('numbers', cands, QUOTA.numbers,
      (c) => /[0-9]/.test(c.text)
        ? 'Contains DIGITS — the text-normalisation path. Listen for the digit read as the wrong quantity, in the wrong language, or spelled out letter-by-letter.'
        : 'Number, date or clock-time words. Listen for the wrong numeral form, a counted noun taking the wrong shape, and clock times mangled into a plain count.',
      // real numerals beat bare time-unit words; digits beat everything
      { priority: (c) => (/[0-9]/.test(c.text) ? 10 : 0) + coreHits(c).length,
        // digit rows are the scarce, valuable ones — never squeeze them out on diversity
        diversityKey: (c) => (/[0-9]/.test(c.text) ? null : (coreHits(c).sort().join('+') || null)) });
    if (!digitCands.length) {
      gaps.push(`numbers: the ${language} course corpus contains NO digit strings at all (checked course_seeds, course_legos, course_practice_phrases and course_audio for ${codes.join(', ')}). Digit/date/ordinal normalisation therefore cannot be tested from real course content — the category is filled with number WORDS instead, and digit normalisation is an explicit uncovered gap.`);
    }
    void got;
  }

  // ---- 5. question
  {
    const cands = pool.filter((c) => /\?\s*$/.test(c.text) && wordCount(c.text) >= 3 && wordCount(c.text) <= 12);
    take('question', cands, QUOTA.question,
      () => 'Interrogative. Listen for a genuine question contour rather than a statement read with a full stop, and for the rise landing on the right word.');
  }

  // ---- 6. isolated_word — single-word A-LEGOs
  {
    const cands = pool.filter((c) => c.kind === 'lego' && wordCount(c.text) === 1);
    take('isolated_word', cands, QUOTA.isolated_word,
      () => 'Single word spoken alone. Listen for a dead flat citation tone, a missing final consonant release, and lexical stress on the wrong syllable.',
      // a two-letter function word says nothing about prosody; prefer real polysyllables
      { priority: (c) => Math.min(c.text.replace(/[^\p{L}]/gu, '').length, 9) });
  }

  // ---- 7. very_short_lego — 2-3 word LEGOs
  {
    const cands = pool.filter((c) => c.kind === 'lego' && wordCount(c.text) >= 2 && wordCount(c.text) <= 3);
    take('very_short_lego', cands, QUOTA.very_short_lego,
      () => 'Two-to-three-word LEGO. Too short to settle into a rhythm — this is where clipped onsets and truncated tails show up.');
  }

  // ---- 8. medium_chunk — BUILD phrases
  {
    const cands = pool.filter((c) => c.kind === 'build' && wordCount(c.text) >= 4 && wordCount(c.text) <= 8 && !/\?$/.test(c.text));
    take('medium_chunk', cands, QUOTA.medium_chunk,
      () => 'BUILD-phrase fragment — deliberately incomplete. Listen for a false final cadence, or for the model trailing off as if the text were broken.');
  }

  // ---- 9. full_sentence — USE phrases
  {
    const cands = pool.filter((c) => c.kind === 'use' && wordCount(c.text) >= 6 && wordCount(c.text) <= 16 && !/\?$/.test(c.text));
    take('full_sentence', cands, QUOTA.full_sentence,
      () => 'Complete USE sentence — the baseline for naturalness. Listen for phrasing, breath placement and whether it sounds like a person saying something they mean.');
  }

  // ---- 10. repeat_probe — exactly one
  {
    const cands = pool.filter((c) => c.kind === 'use' && wordCount(c.text) >= 7 && wordCount(c.text) <= 12 && !used.has(lower(c.text)));
    const [pick] = spread(cands, 1);
    if (pick) {
      emit(pick, 'repeat_probe',
        'THE repeat probe. Synthesise this one utterance repeat_count times in a single run, and again on a later date. Measures intra-voice consistency (axis D) and repeatability over time (axis E): duration spread, pitch drift, and whether any single render is audibly a different take.',
        20);
    } else {
      gaps.push('repeat_probe: could not select one — no unused USE sentence of 7-12 words.');
    }
  }

  const dialects = [...new Set(courses.map((c) => c.meta && c.meta.dialect).filter(Boolean))];
  const doc = {
    schema_version: 1,
    language,
    dialect: dialects.length > 1 ? 'mixed' : (dialects[0] || 'standard'),
    generated_at: date,
    source: 'live Supabase course DB',
    source_courses: codes,
    generator: 'tools/tts-bakeoff/build-utterance-set.cjs',
    categories: CATEGORIES,
    gaps,
    utterances,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');

  const byCat = {};
  for (const u of utterances) byCat[u.category] = (byCat[u.category] || 0) + 1;
  console.error(`[${language}] wrote ${utterances.length} utterances -> ${outPath}`);
  console.error(`[${language}] ${JSON.stringify(byCat)}`);
  if (gaps.length) {
    console.error(`[${language}] GAPS:`);
    for (const g of gaps) console.error('  - ' + g);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
