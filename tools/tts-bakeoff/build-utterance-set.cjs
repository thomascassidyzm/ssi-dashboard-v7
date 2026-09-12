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
// CJK full-width punctuation is added to the strip class so a Chinese sentence tokenises at all.
// Latin-script corpora contain none of these characters, so eng/cym output is unaffected.
// NOT in the class: ’ U+2019. It is punctuation in English but the APOSTROPHE inside Welsh words
// (chi’n, efo’ch) — stripping it splits one word into two and silently rewrites every Welsh
// word count. Verified: adding it changed the committed cym set.
const stripPunct = (s) => lower(s)
  .replace(/[.,!?;:—–…"“”«»()¿¡。，、？！：；（）《》〈〉「」【】·～]/g, ' ')
  .replace(/\s+/g, ' ').trim();

/**
 * Tokenisation is a LANGUAGE property, not a universal. The default splits on whitespace, which
 * is right for every Latin/Cyrillic/Greek-script course in the estate. Chinese writes no word
 * boundaries at all, so the default would score every Chinese sentence as ONE token and every
 * size-banded category would come out empty. A pack may therefore supply its own tokeniser.
 */
const WHITESPACE_TOKENISER = (s) => stripPunct(s).split(' ').filter(Boolean);
let TOKENISER = WHITESPACE_TOKENISER;

/** Han/kana characters are their own tokens; runs of Latin letters or digits stay whole. */
const CJK_CHAR = /[㐀-䶿一-鿿豈-﫿぀-ヿㇰ-ㇿ]/;
function cjkTokeniser(s) {
  const out = [];
  let buf = '';
  const flush = () => { if (buf.trim()) out.push(buf.trim()); buf = ''; };
  for (const ch of stripPunct(s)) {
    if (CJK_CHAR.test(ch)) { flush(); out.push(ch); }
    else if (/\s/.test(ch)) flush();
    else buf += ch;
  }
  flush();
  return out;
}

const words = (s) => TOKENISER(s);
const wordCount = (s) => words(s).length;

/** Category size bands, in TOKENS. A pack may override any of them — see zho, which counts Han
 *  characters rather than whitespace-delimited words, so its bands are numerically different. */
const DEFAULT_BANDS = {
  isolated_word: [1, 1],
  very_short_lego: [2, 3],
  medium_chunk: [4, 8],
  full_sentence: [6, 16],
  question: [3, 12],
  hard_pronunciation: [1, 9],
  proper_noun: [1, 8],
  numbers_word: [1, 12],
  numbers_digit: [1, 30],
  flagged_hard: [2, 14],
  repeat_probe: [7, 12],
};

/** Diacritic-blind comparison — used to name an accent-only minimal pair (esta / está). */
const stripDia = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

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

  spa: {
    label: 'Spanish',
    // spa_for_eng is voiced es-ES and spa_mx_for_eng es-MX. The courses.dialect column says
    // "standard" for BOTH, so it carries no variety information: the variety has to be tagged
    // from the course code, which is what this map does. Every spa utterance therefore states
    // which variety it came from, and a peninsular/Mexican split can be made later.
    varietyByCourse: {
      spa_for_eng: 'es-ES (peninsular)',
      spa_mx_for_eng: 'es-MX (Mexican)',
    },
    hard: [
      { id: 'seseo', test: (t) => /(c[eéií]|z)/i.test(t), note: 'contains "ce/ci/z" — the distinción/seseo split. Peninsular Spanish says /θ/ (cerca ≈ "therca"), Mexican and all of Latin America say /s/. A voice must pick ONE and hold it: a model that drifts between /θ/ and /s/ inside a course teaches the learner an accent that no human has.' },
      { id: 'yeismo', test: (t) => /ll/i.test(t), note: '"ll" — /ʎ/ historically, merged to /ʝ/ (and in some varieties /ʒ/ or /ʃ/) by yeísmo. Anglophone-trained models fall back to an English /l/ and the word stops being Spanish.' },
      { id: 'rr-trill', test: (t) => /(rr|(^|\s)r)/i.test(t), note: 'trilled /r/ — written "rr" between vowels or "r-" word-initially, and phonemically distinct from the tap /ɾ/. The single most common Spanish TTS failure: the trill is rendered as an English approximant /ɹ/, or as a single tap, which collapses pero/perro.' },
      { id: 'jota', test: (t) => /(j|g[eéií])/i.test(t), note: '"j" and "g" before e/i are the voiceless velar (peninsular uvular) fricative /x/. Models trained on English read "j" as /dʒ/ ("jam") and the word is unrecognisable.' },
      { id: 'enye', test: (t) => /ñ/i.test(t), note: '"ñ" is the palatal nasal /ɲ/ — one segment, not /n/+/j/. Models that decompose it produce "an-yo" for año, and models that ignore the tilde produce ano, which is a different and unfortunate word.' },
      { id: 'written-accent', test: (t) => /[áéíóú]/i.test(t), note: 'carries a written accent, which in Spanish marks LEXICAL STRESS and nothing else. Put the stress on the wrong syllable and you get a different word (hablo/habló, esta/está) — this is a pure test of whether the model reads the diacritic or discards it.' },
      { id: 'intervocalic-d', test: (t) => /[aeiouáéíóú](d)[aeiouáéíóú]/i.test(t), note: 'intervocalic "d" is the approximant [ð] and in -ado/-ido endings is heavily reduced or dropped in ordinary speech. A model giving it a hard English /d/ sounds over-enunciated on every past participle in the course.' },
      { id: 'b-v', test: (t) => /v/i.test(t), note: '"b" and "v" are the SAME phoneme in Spanish (/b/, approximant [β] between vowels). A model that renders "v" as an English labiodental /v/ has imported a distinction Spanish does not have.' },
      { id: 'inverted-punct', test: (t) => /[¿¡]/.test(t), note: 'opens with "¿" or "¡". This is a text-normalisation probe as much as a phonetic one: listen for the mark being read aloud, for the model choking on it, and for whether the question contour actually starts where the mark says it does.' },
      { id: 'synalepha', test: (t) => /[aeoáéó]\s+[haeiouáéíóú]/i.test(t), note: 'vowel meeting a vowel across a word boundary (with an optional silent "h"). Spanish runs them together into one syllable — synalepha. A model that inserts a glottal stop or a pause between the words sounds like it is reading a list.' },
      { id: 'silent-h', test: (t) => /(^|\s)h[aeiouáéíóú]/i.test(t), note: 'word-initial "h" is completely silent in Spanish. A model leaking an English /h/ is audible immediately on hablar, hacer, hay, hora.' },
      { id: 'x', test: (t) => /x/i.test(t), note: '"x" is /ks/ in most words but /x/ in México and a class of Nahuatl-derived names — a lexicon test, not a letter-to-sound test.' },
    ],
    mutationPairs: false,
    minimalPairContrasts: true,
    vowels: 'aeiouáéíóú',
    wordCharRe: /[^a-záéíóúüñ]/,
    doubleLetterContrasts: {
      r: 'tap /ɾ/ vs trill /r/ — the pero/perro contrast, the one Spanish minimal pair every learner is taught and the one most TTS voices flatten',
      l: 'single "l" /l/ vs "ll" /ʝ/ — collapsing these erases yeísmo entirely',
    },
    contrastRank: (contrast) => {
      if (/^doubled r/.test(contrast)) return 10;   // pero/perro — the contrast Spanish is built on
      if (/^written stress accent/.test(contrast)) return 9;  // esta/está — pure stress
      if (/^doubled l/.test(contrast)) return 8;
      if (/consonant [szc]\/[szc]/.test(contrast)) return 7;  // seseo/distinción
      if (/^consonant/.test(contrast)) return 4;
      return 1;  // a bare vowel alternation is usually morphology (mueve/muevo), not phonology
    },
    // Pod rows spliced from several turns ("Estupendo. … La habitación …") and multi-sentence
    // narration are real rows, but as a benchmark utterance they test splicing, not the voice.
    // Digit rows are exempt: they are the ONLY place digits occur in this corpus.
    qualityPenalty: (c, category) => {
      if (category === 'numbers' && /[0-9]/.test(c.text)) return 0;
      // The rarest Spanish names in this corpus sit in one-word pod drill rows ("Junio."), so
      // rarity-first selection fills the whole category with bare month names. A name in a
      // sentence is the better probe — it tests the name AND whether the surrounding phonology
      // survives it. 1000 exceeds the rarity priority's 500 cap, so context always wins; a bare
      // name still gets in when nothing else carries that name.
      if (category === 'proper_noun' && wordCount(c.text) < 3) return 1000;
      return /…|\.\s+\S/.test(c.text) ? 6 : 0;
    },
    contrastNote: (contrast) => {
      if (/^written stress accent/.test(contrast)) return 'The two forms differ ONLY by the written accent, i.e. only by which syllable is stressed. If both render with the same stress the model is ignoring the diacritic, and the course teaches the wrong word.';
      if (/consonant [szc]\/[szc]/.test(contrast)) return 'An s/z/c contrast — live in peninsular Spanish (/s/ vs /θ/) and merged in Mexican. Whichever variety the voice claims, it must be CONSISTENT: hearing both members the same way in an es-ES voice is a distinción failure.';
      if (/^doubled r/.test(contrast)) return 'Tap versus trill. If both members sound the same the voice has no trill, which disqualifies it for Spanish course work.';
      return '';
    },
    coreNumerals: ['uno', 'una', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'cien', 'ciento', 'mil', 'millón', 'medio', 'media', 'mitad', 'primero', 'primera', 'segundo', 'segunda', 'tercero'],
    numberWords: ['uno', 'una', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'cien', 'ciento', 'mil', 'millón', 'medio', 'media', 'mitad', 'primero', 'primera', 'segundo', 'segunda', 'tercero', 'hora', 'horas', 'minuto', 'minutos', 'día', 'días', 'semana', 'semanas', 'mes', 'meses', 'año', 'años', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    properNouns: ['español', 'española', 'inglés', 'inglesa', 'francés', 'alemán', 'italiano', 'españa', 'méxico', 'madrid', 'barcelona', 'londres', 'inglaterra', 'gales', 'estados', 'unidos', 'europa', 'américa', 'josé', 'maría', 'juan', 'carlos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre', 'navidad'],
  },

  zho: {
    label: 'Mandarin Chinese',
    // Chinese writes no spaces. Without this tokeniser every Chinese string scores one token and
    // every size-banded category comes out empty — the Latin-script assumption this pack exists
    // to break. Bands below are therefore in HAN CHARACTERS, not words.
    tokenise: cjkTokeniser,
    script: CJK_CHAR,
    // as for Spanish: splice-marked and multi-sentence pod rows are poor probes, but the digit
    // rows — of which this corpus has twelve, all pod number drills — must not be penalised away
    qualityPenalty: (c, category) => {
      if (category === 'numbers' && /[0-9]/.test(c.text)) return 0;
      // as for Spanish: the rarest names sit in one-word pod drill rows (星期一。), so require a
      // name to appear inside something sentence-sized. 1000 exceeds the rarity priority's cap.
      if (category === 'proper_noun' && wordCount(c.text) < 6) return 1000;
      return /…|。\s*\S/.test(c.text) ? 6 : 0;
    },
    categoryNotes: {
      isolated_word: 'Single word spoken alone, with no sentence to lean on. Mandarin has no lexical stress, so what to listen for instead is TONE: each syllable must carry its full citation contour, and a two-syllable word must not be flattened into one shape. Listen too for a neutral-toned second syllable being given a full tone it should not have.',
      very_short_lego: 'Three-to-five-character LEGO. Too short for the model to settle into a rhythm, so clipped onsets, a swallowed first syllable and a truncated final tone all surface here. Check that the last syllable actually completes its tone contour rather than being cut off.',
      medium_chunk: 'BUILD-phrase fragment — deliberately incomplete. Listen for a false final cadence (a dropped, statement-final pitch on a phrase that has not ended), and for whether the sandhi across the internal word boundaries is applied at all.',
      full_sentence: 'Complete USE sentence — the baseline for naturalness. Listen for phrasing and breath placement, and above all for whether tone survives the sentence: many models render tones correctly on isolated words and then flatten them into an English-like intonation contour once a sentence gets long.',
      question: 'Interrogative. Mandarin marks most questions LEXICALLY (吗, 呢, an A-not-A frame, a question word), so a question does NOT need a rising contour — over-applying an English rise is as wrong as flattening it. Listen for the particle staying neutral and short, and for the sentence tones surviving underneath whatever contour is applied.',
      proper_noun: 'Listen for the wrong reading of a name character, tones dropped on the name, or the name given a foreign phonology — place and month names are where a Mandarin voice most often reverts to a per-character reading.',
    },
    bands: {
      isolated_word: [1, 2],
      very_short_lego: [3, 5],
      medium_chunk: [5, 9],
      full_sentence: [8, 18],
      question: [4, 14],
      hard_pronunciation: [2, 12],
      proper_noun: [1, 12],
      numbers_word: [1, 20],
      numbers_digit: [1, 40],
      flagged_hard: [2, 20],
      repeat_probe: [9, 16],
    },
    hard: [
      { id: 'bu-sandhi', test: (t) => /不[是要会对去看错够用太大做快见慢累在上下后但话]/.test(t), note: '不 (bù) before a FOURTH-tone syllable becomes second tone: 不是 is bú shì, not bù shì. It is a mandatory sandhi that no orthography records, so a model must know the rule rather than read the character. Getting it wrong is audible to any Mandarin speaker in the first second.' },
      { id: 'yi-sandhi', test: (t) => /一[个点起下样定块些直]/.test(t), note: '一 (yī) is first tone alone, second tone (yí) before a fourth-tone syllable — 一个 is yí ge — and fourth tone (yì) before first, second or third. Three readings of one character, decided entirely by what follows. Listen especially to 一个 and 一点.' },
      { id: 'v-bu-v', test: (t) => /(.)不\1/.test(t), note: 'the A-不-A question frame (是不是, 能不能, 好不好). Here 不 loses its tone entirely and goes neutral, and the whole frame is delivered as one prosodic unit. Models routinely give the 不 a full fourth tone and a pause on each side, which turns a question into three stressed words.' },
      { id: 't3-sandhi', test: (t) => /[我你很好想可以早请老少手五九起走买也有每里姐懂给]{2}/.test(t), note: 'two third tones in a row: the FIRST becomes second tone. 你好 is ní hǎo, 我想 is wó xiǎng. Another rule invisible in the text. A model that renders both syllables with the full dipping third tone sounds laboured and foreign, and this pattern is everywhere in the course.' },
      { id: 'neutral-tone', test: (t) => /(什么|东西|朋友|谢谢|时候|意思|喜欢|知道|明白|舒服|漂亮|事情|我们|他们|你们)/.test(t), note: 'lexical NEUTRAL tone on the second syllable (shén me, péng you, xiè xie). Neutral syllables are short, unstressed and pitch-determined by what precedes them. A model that gives every character its dictionary tone produces the classic robotic character-by-character Mandarin.' },
      { id: 'erhua', test: (t) => /儿/.test(t), note: 'erhua — the 儿 suffix is not a syllable, it retroflexes the vowel of the syllable before it (一点儿 is yìdiǎnr, two syllables not three). A model that reads 儿 as a separate "ér" has added a syllable that is not there.' },
      { id: 'retroflex-vs-alveolar', test: (t) => /[是知这只中真出车说十师生]/.test(t) && /[四三思算色早在做走坐]/.test(t), note: 'this string contains BOTH a retroflex sibilant (zh/ch/sh/r) and an alveolar one (z/c/s) — 四 sì versus 十 shí being the textbook case. The pair is merged in much of southern China and routinely merged by TTS. A voice that cannot hold the contrast within one sentence is unusable for a course that teaches it.' },
      { id: 'final-particle', test: (t) => /[吗呢吧啊]\s*[?？]?\s*$/.test(t), note: 'ends in a sentence-final particle (吗/呢/吧/啊). These are toneless and carry the sentence\'s pragmatic force through pitch on the particle itself. Getting the contour wrong turns a question into a statement or a suggestion into a demand.' },
      { id: 'de-triple', test: (t) => /[的得地]/.test(t), note: 'contains one of 的/得/地 — three characters, all pronounced neutral "de" in this use, but 得 is ALSO děi ("must") and dé ("obtain"). The commonest heteronym trap in the language, and the model has to disambiguate from syntax alone.' },
      { id: 'tone4-run', test: (t) => /[是要会对去看错够用太大做快见慢累在下后但认站]{2}/.test(t), note: 'two or more fourth tones in a row — a sharp falling contour repeated. Models tend to flatten the second one, or add a spurious pause between them to "reset". Listen for whether both falls are actually there.' },
    ],
    mutationPairs: false,
    // Chinese minimal pairs are not phoneme swaps: they are HETERONYMS — one character, two
    // readings chosen by meaning — and tone-only pairs. Both are mined from real corpus rows.
    heteronyms: [
      { char: '行', a: { pinyin: 'xíng', gloss: 'to be OK / to go', test: /不行|行吗|旅行|自行车|进行|行了/ }, b: { pinyin: 'háng', gloss: 'a row / a line of business', test: /银行|一行|行业/ } },
      { char: '长', a: { pinyin: 'cháng', gloss: 'long', test: /很长|长时间|多长|长的|长一点/ }, b: { pinyin: 'zhǎng', gloss: 'to grow / senior', test: /长大|校长|家长|成长|长得/ } },
      { char: '了', a: { pinyin: 'le', gloss: 'completed-action particle, neutral tone', test: /了。|好了|来了|了$/ }, b: { pinyin: 'liǎo', gloss: 'to understand / to be able to finish', test: /了解|受不了/ } },
      { char: '得', a: { pinyin: 'de', gloss: 'complement marker, neutral tone', test: /说得|做得|得很|得好/ }, b: { pinyin: 'děi', gloss: 'must / have to', test: /我得|你得|得走|得去/ } },
      { char: '乐', a: { pinyin: 'lè', gloss: 'happy', test: /快乐|可乐/ }, b: { pinyin: 'yuè', gloss: 'music', test: /音乐/ } },
      { char: '为', a: { pinyin: 'wèi', gloss: 'for / for the sake of', test: /为什么|为了/ }, b: { pinyin: 'wéi', gloss: 'to be / to consider', test: /认为|以为|成为/ } },
      { char: '只', a: { pinyin: 'zhǐ', gloss: 'only', test: /只是|只有|只能/ }, b: { pinyin: 'zhī', gloss: 'classifier for animals', test: /一只|两只/ } },
      { char: '分', a: { pinyin: 'fēn', gloss: 'minute / to divide', test: /分钟|十分|分开/ }, b: { pinyin: 'fèn', gloss: 'a portion / a share', test: /部分|一份|身分/ } },
      { char: '应', a: { pinyin: 'yīng', gloss: 'ought to', test: /应该/ }, b: { pinyin: 'yìng', gloss: 'to answer / to cope', test: /答应|应付/ } },
      { char: '数', a: { pinyin: 'shù', gloss: 'a number', test: /数字|大多数/ }, b: { pinyin: 'shǔ', gloss: 'to count', test: /数一数|数不清/ } },
      { char: '地', a: { pinyin: 'dì', gloss: 'ground / place', test: /地方|地址|地上/ }, b: { pinyin: 'de', gloss: 'adverbial marker, neutral tone', test: /地说|地做|慢慢地/ } },
    ],
    tonePairs: [
      { a: '买', b: '卖', pa: 'mǎi (to buy)', pb: 'mài (to sell)', note: 'identical segments, opposite meanings, distinguished ONLY by third tone versus fourth. The most consequential tone pair in the language for a learner.' },
      { a: '问', b: '文', pa: 'wèn (to ask)', pb: 'wén (writing / language)', note: 'fourth tone versus second on the same syllable.' },
      { a: '想', b: '像', pa: 'xiǎng (to want / to think)', pb: 'xiàng (to resemble)', note: 'third versus fourth tone on xiang — and 想 is one of the highest-frequency words in the whole course.' },
      { a: '找', b: '照', pa: 'zhǎo (to look for)', pb: 'zhào (to shine / photograph)', note: 'third versus fourth tone on zhao.' },
      { a: '里', b: '力', pa: 'lǐ (inside)', pb: 'lì (strength)', note: 'third versus fourth tone on li.' },
      { a: '马', b: '妈', pa: 'mǎ (horse)', pb: 'mā (mother)', note: 'third versus first tone — the textbook mā/má/mǎ/mà demonstration, with both members attested in this corpus.' },
      { a: '睡', b: '水', pa: 'shuì (to sleep)', pb: 'shuǐ (water)', note: 'fourth versus third tone on shui.' },
    ],
    coreNumerals: ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '零', '两', '半'],
    numberWords: ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '零', '两', '半', '点', '分', '号', '月', '日', '年', '次', '岁', '小', '时', '钟', '星', '期', '周', '天'],
    // Chinese proper nouns are not whitespace-delimited words, so they are matched as substrings
    // rather than as tokens: a single-character token list would match 中 inside 中间 and call it
    // a name.
    properNounPhrases: ['中文', '中国', '英文', '英语', '英国', '美国', '北京', '上海', '西班牙', '法国', '法语', '德国', '德语', '意大利', '日本', '伦敦', '威尔士', '汉语', '广东', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期天', '星期日', '一月', '二月', '三月', '十二月'],
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

/** Pipe/arrow annotation rows ("deja | me → me") are authoring debris, not speakable text. */
const ANNOTATION = /[|→]/;

function buildPool(courses, homoglyphSink, opts = {}) {
  const script = opts.script || null;
  const annotationSink = opts.annotationSink || null;
  const wrongScriptSink = opts.wrongScriptSink || null;
  const variety = opts.varietyByCourse || null;
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
  const defect = (sink, cand) => {
    if (sink) sink.push({ text: cand.text, course_code: cand.course_code, table: cand.table, row_id: cand.row_id, seed_number: cand.seed_number });
  };
  for (const cand of pool) {
    if (HOMOGLYPH.test(cand.text)) { defect(homoglyphSink, cand); continue; }
    if (ANNOTATION.test(cand.text)) { defect(annotationSink, cand); continue; }
    // A row whose LETTERS are none of them in the target script is not target-language speech, so
    // it never belongs in the benchmark. Two things it is NOT: a digits-only row ("19。") carries
    // no letters at all and is a perfectly good target clip — keep it, it is the purest number
    // probe the corpus has; and a pod_explainer row is in the KNOWN language by design, so it is
    // out of scope rather than broken. Only a target-role row in the wrong script is a defect.
    if (script && /\p{L}/u.test(cand.text) && !script.test(cand.text)) {
      const role = (cand.extra && cand.extra.role) || '';
      if (!/explainer/.test(role)) defect(wrongScriptSink, cand);
      else if (opts.knownLanguageSink) opts.knownLanguageSink.push({ text: cand.text, row_id: cand.row_id, role });
      continue;
    }
    if (variety && variety[cand.course_code]) cand.variety = variety[cand.course_code];
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

function editPairsFrom(pool, contrasts, pack) {
  if (!contrasts) return [];
  // the set of characters a "word" may contain is language-specific: an ASCII-only filter throws
  // away every accented Spanish word, which is most of them
  const badChar = (pack && pack.wordCharRe) || /[^a-z’']/;
  const freq = new Map();
  const holder = new Map();
  for (const c of pool) {
    for (const w of words(c.text)) {
      if (w.length < 3 || badChar.test(w)) continue;
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
      const diff = describeDiff(a, b, pack);
      if (!diff) continue;
      pairs.push({ a, b, contrast: diff });
    }
  }
  // Not every one-letter difference is equally worth a listener's time: a pack may rank the
  // contrasts it actually cares about (Spanish puts tap-vs-trill and written stress at the top,
  // and a bare vowel alternation — which is usually morphology, not phonology — at the bottom).
  const rank = (pack && pack.contrastRank) || (() => 0);
  return pairs.sort((x, y) => (rank(y.contrast) - rank(x.contrast)) || (fnv(x.a + x.b) - fnv(y.a + y.b)));
}

function describeDiff(a, b, pack) {
  // find the single differing position and name the contrast
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    // an accent-only difference is a STRESS contrast, not a segment one, and in Spanish it is
    // the sharpest probe there is: esta/está, hablo/habló
    if (stripDia(a) === stripDia(b)) return `written stress accent ${a}/${b}`;
    const ca = a[i], cb = b[i];
    if (!ca || !cb) return null;
    const vowels = (pack && pack.vowels) || 'aeiou';
    if (vowels.includes(ca) && vowels.includes(cb)) return `vowel ${ca}/${cb}`;
    if (!vowels.includes(ca) && !vowels.includes(cb)) return `consonant ${ca}/${cb}`;
    return null;
  }
  // A doubled letter is normally an insertion, and insertions are not nameable contrasts — except
  // where the doubling IS the phoneme, as with Spanish r/rr and l/ll. Pack-gated, so no other
  // language picks this up by accident.
  const dl = pack && pack.doubleLetterContrasts;
  if (dl && Math.abs(a.length - b.length) === 1) {
    const [sh, lo] = a.length < b.length ? [a, b] : [b, a];
    let k = 0;
    while (k < sh.length && sh[k] === lo[k]) k++;
    const ch = lo[k];
    if (ch && dl[ch] && lo.slice(0, k) + lo.slice(k + 1) === sh && (lo[k - 1] === ch || lo[k + 1] === ch)) {
      return `doubled ${ch} (${sh}/${lo})`;
    }
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

  const pack = LANG_PACKS[language] || null;
  // Tokenisation and category size bands are set BEFORE the pool is built, because both the pool
  // and every category filter measure length in tokens.
  TOKENISER = (pack && pack.tokenise) || WHITESPACE_TOKENISER;
  const BAND = { ...DEFAULT_BANDS, ...((pack && pack.bands) || {}) };
  const inBand = (text, band) => { const n = wordCount(text); return n >= band[0] && n <= band[1]; };

  const homoglyphRows = [];
  const annotationRows = [];
  const wrongScriptRows = [];
  const knownLanguageRows = [];
  const pool = buildPool(courses, homoglyphRows, {
    script: pack && pack.script,
    annotationSink: annotationRows,
    wrongScriptSink: wrongScriptRows,
    knownLanguageSink: knownLanguageRows,
    varietyByCourse: pack && pack.varietyByCourse,
  });
  console.error(`[${language}] candidate rows after dedupe: ${pool.length}`);

  const gaps = [];
  if (annotationRows.length) {
    gaps.push(`DATA DEFECT, not a benchmark gap: ${annotationRows.length} row(s) contain pipe/arrow authoring annotation inside speakable text and were excluded — e.g. ${annotationRows.slice(0, 3).map((r) => `${r.course_code} ${r.table} ${r.row_id} "${r.text}"`).join('; ')}. These would be spoken aloud to a learner if they were ever rendered.`);
  }
  if (wrongScriptRows.length) {
    gaps.push(`DATA DEFECT, not a benchmark gap: ${wrongScriptRows.length} TARGET-role row(s) in a ${language} course contain no ${language} script at all and were excluded as wrong-language rows — ${wrongScriptRows.slice(0, 4).map((r) => `${r.course_code} ${r.table} ${r.row_id} "${r.text}"`).join('; ')}. These are target slots holding known-language text, and any audio against them is a ${language} voice speaking the wrong language.`);
  }
  if (knownLanguageRows.length) {
    gaps.push(`Scope note, NOT a defect: ${knownLanguageRows.length} pod-explainer row(s) filed under language=${language} are in the KNOWN language by design (e.g. "${knownLanguageRows[0].text}"). They are excluded from a TARGET-voice benchmark for that reason, not because anything is wrong with them.`);
  }
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
        ...(cand.variety ? { variety: cand.variety } : {}),
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
  const penalty = (pack && pack.qualityPenalty) || (() => 0);
  /**
   * The default per-utterance listening notes are written in terms English and the Romance and
   * Celtic languages share — lexical stress, consonant release. Mandarin has neither, and telling
   * a listener to check "stress on the wrong syllable" in Chinese points them at nothing. A pack
   * may therefore replace the note for any generic category. Packs that don't get the default.
   */
  const gnote = (category, fallback) => ((pack && pack.categoryNotes && pack.categoryNotes[category]) || fallback);
  const take = (category, cands, n, noteFn, opts = {}) => {
    const prio = (c) => (opts.priority ? opts.priority(c) : 0) - penalty(c, category);
    const ordered = spread(cands, cands.length, prio);
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
    const flaggedCands = pool.filter((c) => flaggedTexts.has(lower(c.text)) && inBand(c.text, BAND.flagged_hard));
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
        return inBand(c.text, BAND.hard_pronunciation) && rule.test(c.text);
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
      const flaggedCands = pool.filter((c) => flaggedTexts.has(lower(c.text)) && wordCount(c.text) <= BAND.flagged_hard[1]);
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
  } else if (pack && (pack.heteronyms || pack.tonePairs)) {
    // Chinese has no phoneme-swap minimal pairs worth mining from an orthography that does not
    // write phonemes. The two contrasts that matter are HETERONYMS — one character, two readings
    // chosen by meaning — and TONE, so the category is built from those instead.
    let got = 0;
    const shortest = (test) => {
      const hits = pool.filter((c) => test.test(c.text) && inBand(c.text, BAND.hard_pronunciation));
      hits.sort((x, y) => x.text.length - y.text.length || fnv(x.key) - fnv(y.key));
      return hits[0];
    };
    for (const h of pack.heteronyms || []) {
      if (got >= QUOTA.minimal_pair) break;
      const a = shortest(h.a.test), b = shortest(h.b.test);
      if (!a || !b) continue;
      const note = (self, other) => `HETERONYM pair on 「${h.char}」: read ${self.pinyin} (${self.gloss}) here, but ${other.pinyin} (${other.gloss}) in the partner utterance. Same character, two readings, and NOTHING in the writing says which — only the meaning does. A model that picks the wrong reading produces a word the learner has never heard; it is the single most audible Chinese TTS failure. Play the two members back to back: they must differ.`;
      if (emit({ ...a, extra: { ...a.extra, heteronym: h.char, reading: h.a.pinyin, pair_partner_text: b.text, pair_partner_reading: h.b.pinyin } }, 'minimal_pair', note(h.a, h.b))) got++;
      if (got >= QUOTA.minimal_pair) break;
      if (emit({ ...b, extra: { ...b.extra, heteronym: h.char, reading: h.b.pinyin, pair_partner_text: a.text, pair_partner_reading: h.a.pinyin } }, 'minimal_pair', note(h.b, h.a))) got++;
    }
    for (const p of pack.tonePairs || []) {
      if (got >= QUOTA.minimal_pair) break;
      const a = shortest(new RegExp(p.a)), b = shortest(new RegExp(p.b));
      if (!a || !b) continue;
      const note = `TONE-ONLY pair: 「${p.a}」${p.pa} versus 「${p.b}」${p.pb}. ${p.note} Identical segments, different tone. If both members come out with the same pitch contour the voice has no usable tone and is dead for Mandarin.`;
      if (emit({ ...a, extra: { ...a.extra, tone_pair: `${p.a}/${p.b}`, reading: p.pa, pair_partner_text: b.text, pair_partner_reading: p.pb } }, 'minimal_pair', note)) got++;
      if (got >= QUOTA.minimal_pair) break;
      if (emit({ ...b, extra: { ...b.extra, tone_pair: `${p.a}/${p.b}`, reading: p.pb, pair_partner_text: a.text, pair_partner_reading: p.pa } }, 'minimal_pair', note)) got++;
    }
    if (got < QUOTA.minimal_pair) gaps.push(`minimal_pair: wanted ${QUOTA.minimal_pair}, filled ${got} from attested heteronym/tone pairs. Not padded.`);
  } else if (pack && pack.minimalPairContrasts) {
    const pairs = editPairsFrom(pool, pack.minimalPairContrasts, pack);
    let got = 0;
    for (const p of pairs) {
      if (got >= QUOTA.minimal_pair) break;
      const a = pool.find((c) => words(c.text).includes(p.a));
      const b = pool.find((c) => words(c.text).includes(p.b));
      if (!a || !b) continue;
      const extra = pack.contrastNote ? pack.contrastNote(p.contrast) : '';
      const note = `Minimal pair (${p.contrast}): "${p.a}" vs "${p.b}". Both words occur in the live corpus. If the two render identically the model has collapsed the contrast.` + (extra ? ` ${extra}` : '');
      if (emit({ ...a, text: p.a, extra: { ...a.extra, pair_partner: p.b, contrast: p.contrast, attested_in: a.text } }, 'minimal_pair', note)) got++;
      if (got >= QUOTA.minimal_pair) break;
      if (emit({ ...b, text: p.b, extra: { ...b.extra, pair_partner: p.a, contrast: p.contrast, attested_in: b.text } }, 'minimal_pair', note)) got++;
    }
    if (got < QUOTA.minimal_pair) gaps.push(`minimal_pair: wanted ${QUOTA.minimal_pair}, filled ${got}.`);
  } else {
    gaps.push('minimal_pair: EMPTY — no contrast definition for this language.');
  }

  // ---- 3. proper_noun
  if (pack && (pack.properNouns || pack.properNounPhrases)) {
    // A language that writes no word boundaries cannot match names as tokens — a single-character
    // token list would find 中 inside 中间 and call it "China". Such packs give phrases instead,
    // matched as substrings, longest first so 星期一 beats 星期.
    const phrases = pack.properNounPhrases
      ? [...pack.properNounPhrases].sort((a, b) => b.length - a.length)
      : null;
    const set = new Set(pack.properNouns || []);
    const hits = phrases
      ? (c) => { const t = c.text; const out = []; for (const p of phrases) if (t.includes(p) && !out.some((o) => o.includes(p))) out.push(p); return out; }
      : (c) => words(c.text).filter((w) => set.has(w));
    const cands = pool.filter((c) => wordCount(c.text) <= BAND.proper_noun[1] && hits(c).length);
    const nameFreq = new Map();
    for (const c of pool) for (const w of hits(c)) nameFreq.set(w, (nameFreq.get(w) || 0) + 1);
    take('proper_noun', cands, QUOTA.proper_noun,
      (c) => `Contains a proper noun / name-class word (${hits(c).join(', ')}). ` + gnote('proper_noun', "Listen for anglicisation, wrong stress, or the name being read with the wrong language's phonology."),
      // one utterance per distinct name, so the category is not eight ways of saying "Cymraeg"
      { diversityKey: (c) => hits(c).sort().join('+'),
        // rarer names first, so the category is not eight days of the week
        priority: (c) => -Math.min(nameFreq.get(hits(c)[0]) || 0, 500) });
  } else {
    gaps.push('proper_noun: EMPTY — no proper-noun list for this language.');
  }

  // ---- 4. numbers
  {
    const digitCands = pool.filter((c) => /[0-9]/.test(c.text) && wordCount(c.text) <= BAND.numbers_digit[1]);
    const wordCands = pack && pack.numberWords
      ? pool.filter((c) => wordCount(c.text) <= BAND.numbers_word[1] && words(c.text).some((w) => pack.numberWords.includes(w)))
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
    const qTest = (pack && pack.questionTest) || /[?？]\s*$/;
    const cands = pool.filter((c) => qTest.test(c.text) && inBand(c.text, BAND.question));
    take('question', cands, QUOTA.question,
      () => gnote('question', 'Interrogative. Listen for a genuine question contour rather than a statement read with a full stop, and for the rise landing on the right word.'));
  }

  // ---- 6. isolated_word — single-word A-LEGOs
  {
    const cands = pool.filter((c) => c.kind === 'lego' && inBand(c.text, BAND.isolated_word));
    take('isolated_word', cands, QUOTA.isolated_word,
      () => gnote('isolated_word', 'Single word spoken alone. Listen for a dead flat citation tone, a missing final consonant release, and lexical stress on the wrong syllable.'),
      // a two-letter function word says nothing about prosody; prefer real polysyllables
      { priority: (c) => Math.min(c.text.replace(/[^\p{L}]/gu, '').length, 9) });
  }

  // ---- 7. very_short_lego — 2-3 word LEGOs
  {
    const cands = pool.filter((c) => c.kind === 'lego' && inBand(c.text, BAND.very_short_lego));
    take('very_short_lego', cands, QUOTA.very_short_lego,
      () => gnote('very_short_lego', 'Two-to-three-word LEGO. Too short to settle into a rhythm — this is where clipped onsets and truncated tails show up.'));
  }

  // ---- 8. medium_chunk — BUILD phrases
  {
    const cands = pool.filter((c) => c.kind === 'build' && inBand(c.text, BAND.medium_chunk) && !/[?？]$/.test(c.text));
    take('medium_chunk', cands, QUOTA.medium_chunk,
      () => gnote('medium_chunk', 'BUILD-phrase fragment — deliberately incomplete. Listen for a false final cadence, or for the model trailing off as if the text were broken.'));
  }

  // ---- 9. full_sentence — USE phrases
  {
    const cands = pool.filter((c) => c.kind === 'use' && inBand(c.text, BAND.full_sentence) && !/[?？]$/.test(c.text));
    take('full_sentence', cands, QUOTA.full_sentence,
      () => gnote('full_sentence', 'Complete USE sentence — the baseline for naturalness. Listen for phrasing, breath placement and whether it sounds like a person saying something they mean.'));
  }

  // ---- 10. repeat_probe — exactly one
  {
    const cands = pool.filter((c) => c.kind === 'use' && inBand(c.text, BAND.repeat_probe) && !used.has(lower(c.text)));
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
