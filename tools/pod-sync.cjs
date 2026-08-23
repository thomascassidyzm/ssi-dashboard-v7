#!/usr/bin/env node
/**
 * Pod sync — parse a listening-pod markdown file and upsert to
 * listening_pods + listening_pod_sentences.
 *
 * Handles both shapes currently in use:
 *   1. Pod 0 core (spanish-pods.md): scene → sentence, minimal frontmatter
 *   2. Discursive choice (spanish-podcast-music.md): segment → beat → sentence,
 *      host profiles + design notes → listening_pods.metadata
 *
 * Usage:
 *   node tools/pod-sync.cjs <markdown-file> --course=spa_for_eng --type=core --slug=pod-0
 *   node tools/pod-sync.cjs ~/Desktop/spanish-pods.md --course=spa_for_eng --type=core --slug=pod-0
 *   node tools/pod-sync.cjs ~/Desktop/spanish-podcast-music.md --course=spa_for_eng --type=choice --slug=music
 *   node tools/pod-sync.cjs <file> --dry-run   # parse + print summary, don't write
 *
 * Upsert semantics:
 *   - Pod row is upserted by (course_code, slug) — safe to re-run on edits.
 *   - Sentences are replaced wholesale per re-sync (DELETE then INSERT by pod_id).
 *     Audio IDs on course_audio survive because the sentences table has ON DELETE
 *     SET NULL on those FKs — but once sentences are re-inserted, audio links must
 *     be re-established by the Phase 8 pod-audio step (matches on text+role hash).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// LAZY on purpose. This module is the one implementation of pod casting
// (assignVoices), so it is imported by things that must not open a DB
// connection — unit tests, and the Vercel function api/pod-cast-voices.js,
// where the service key is named SUPABASE_SERVICE_ROLE_KEY and a top-level
// createClient() with an undefined key throws at import and 500s the route.
// Nothing else changes: every call site below goes through db().
let _supabase = null;
function db() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
    );
  }
  return _supabase;
}

// ---------------------------------------------------------------------------
// Voice assignment
// ---------------------------------------------------------------------------
// Name-based heuristic: known female/male names get matched voices; unknown
// or generic names fall through to 'sal' (neutral). Each distinct speaker
// within a pod gets a stable assignment so the same speaker name always maps
// to the same voice. Overridable in the dashboard later.

const FEMALE_NAMES = new Set([
  // Spanish
  'ana', 'elena', 'maría', 'maria', 'amiga', 'sofía', 'sofia', 'lucía', 'lucia',
  'marta', 'pilar', 'carmen', 'teresa', 'isabel', 'laura', 'clara', 'rosa',
  'vecina', 'camarera', 'cliente femenina', 'amiga', 'cajera', 'recepcionista',
  // English / mixed European
  'sarah', 'anna', 'emma', 'olivia', 'sophie', 'jessica', 'rachel', 'hannah',
  'chloe', 'lucy', 'lily', 'amy', 'kate', 'katie', 'eve', 'mary', 'jane',
  'ellie', 'grace', 'nadia', 'rosie', 'ruth',
  'nurse', 'receptionist', 'barista', 'greengrocer', 'florist', 'cashier',
  'shopkeeper', 'host', 'hostess', 'mum', 'mother', 'sister', 'daughter',
  'waitress',
  // German / Italian / French / Portuguese common
  'frau', 'signora', 'signorina', 'madame', 'senhora', 'mademoiselle',
  'giulia', 'francesca', 'sofia', 'alessia', 'chiara',
  'claire', 'marie', 'sophie', 'amélie', 'amelie', 'camille',
  'catarina', 'inês', 'ines', 'mariana', 'beatriz',
  // French roles (-e / -euse / -ière / -ère / -trice)
  'voisine', 'serveuse', 'amie', 'cliente', 'vendeuse', 'pharmacienne',
  'touriste', 'locale', 'passagère', 'réceptionniste',
  'boulangère', 'bouchère', 'pâtissière', 'patissière', 'fromagère',
  'caissière', 'coiffeuse', 'infirmière', 'institutrice', 'employée',
  'directrice', 'commerçante', 'épicière', 'fleuriste',
  // Italian roles
  'cameriera', 'amica', 'vicina', 'cliente', 'commessa', 'farmacista',
  'turista', 'passeggera',
  // Slavic feminine roles + names (Croatian/Polish/Czech/Slovak/Russian/Ukrainian/Bulgarian/Slovene)
  'ivana', 'jana', 'mira', 'zofia', 'magdalena', 'olga', 'anya', 'anja',
  'tatiana', 'natasha', 'ksenija', 'milena', 'svetlana', 'irina', 'natalia',
  'konobarica', 'recepcionarka', 'ljekarnica', 'putnica', 'lokalka',
  'klijentica', 'prijateljica', 'susjeda', 'turistkinja', 'prodavačica',
  'kasiranka', 'liječnica',
  'kelnerka', 'sąsiadka', 'klientka', 'sprzedawczyni', 'turystka',
  'farmaceutka', 'recepcjonistka', 'pasażerka', 'przyjaciółka',
  'sousedka', 'klientka', 'prodavačka',
  'соседка', 'клиентка', 'официантка', 'продавщица', 'туристка',
  // Greek
  'σερβιτόρα', 'γείτονα', 'πελάτισσα', 'τουρίστρια',
  // Nordic
  'nabo', 'kvinde', 'kvinna', 'kona', 'flicka', 'pige', 'jente',
  // Welsh
  'cymdoges', 'gweinyddes', 'ffrind', 'cwsmer benyw',
  // Generic feminine role keywords (catches "Customer (woman)", "Vendor — F", etc.)
  'woman', 'female', 'lady', 'girl',
  // Hindi
  'priya', 'diya', 'sita', 'aarti', 'rani',
  // Japanese (limited names; Japanese typically uses honorifics)
  'sakura', 'yuki', 'mei', 'aiko', 'mayu',
  // Korean
  'sun-hi', 'yujin', 'mi-rae',
  // Hebrew
  'sara', 'rachel', 'noa', 'shira', 'hila',
  // Arabic
  'fatima', 'aisha', 'zariyah', 'salma', 'amany', 'layla', 'yasmin',
]);
const MALE_NAMES = new Set([
  // Spanish
  'pablo', 'dani', 'javier', 'juan', 'carlos', 'miguel', 'jose', 'josé',
  'antonio', 'luis', 'manuel', 'francisco', 'david', 'sergio',
  'vecino', 'camarero', 'cliente masculino', 'cajero', 'recepcionista varón',
  // English / mixed European
  'james', 'tom', 'thomas', 'jack', 'henry', 'oliver', 'william', 'george',
  'harry', 'charlie', 'daniel', 'liam', 'lucas', 'ethan', 'sam', 'mark',
  'paul', 'peter', 'john', 'alex', 'matt', 'ben', 'andrew', 'simon',
  'adam', 'dan', 'josh', 'leo', 'owen', 'ryan', 'tim', 'will',
  'bartender', 'waiter', 'driver', 'pharmacist', 'vendor', 'local', 'guest',
  'neighbour', 'neighbor', 'friend', 'colleague', 'dad', 'father', 'brother', 'son',
  'taxi driver', 'shopkeeper male', 'tourist',
  // Other European
  'herr', 'signore', 'monsieur', 'senhor',
  'felix', 'leon', 'marco', 'pedro', 'pierre', 'michel', 'leonardo',
  // French roles (-eur / -ier)
  'voisin', 'serveur', 'ami', 'client', 'vendeur', 'pharmacien',
  'touriste-h', 'taxi', 'chauffeur', 'passager', 'réceptionniste-h',
  // Italian roles
  'cameriere', 'amico', 'vicino', 'cliente-m', 'commesso', 'tassista',
  // Slavic masculine roles + names
  'marko', 'ivan', 'pavel', 'dmitry', 'aleksandr', 'nikolai', 'vladimir',
  'piotr', 'tomasz', 'wojciech', 'andrzej', 'krzysztof',
  'borislav', 'dragan', 'goran', 'stjepan', 'tomislav', 'mladen',
  'susjed', 'konobar', 'prijatelj', 'prodavač', 'ljekarnik', 'klijent',
  'taksist', 'putnik', 'lokalac', 'recepcionar', 'turist', 'kupac',
  'kelner', 'sąsiad', 'klient', 'sprzedawca', 'kierowca', 'farmaceuta',
  'recepcjonista', 'pasażer', 'przyjaciel',
  'soused', 'řidič', 'lékárník',
  'сосед', 'клиент', 'официант', 'продавец', 'турист', 'таксист',
  // Greek
  'σερβιτόρος', 'γείτονας', 'πελάτης', 'τουρίστας', 'οδηγός',
  // Nordic
  'nabo', 'mand', 'man', 'pojke', 'gut', 'gutt', 'dreng',
  // Welsh
  'cymydog', 'gweinydd', 'ffrind', 'cwsmer gwryw',
  // Generic masculine role keywords
  'man', 'male', 'gentleman', 'boy',
  // Hindi
  'vihaan', 'rahul', 'arjun', 'kunal', 'rohan', 'amit',
  // Japanese (limited; honorific-driven)
  'taro', 'haruto', 'ren', 'naoki', 'tomohiro',
  // Korean
  'min-jun', 'gookmin', 'hyun-woo',
  // Hebrew
  'avi', 'david', 'noam', 'avri',
  // Arabic
  'mohammed', 'ahmed', 'youssef', 'omar', 'hamed', 'laith', 'rami', 'ali',
]);

// Voice pools live in app_config.pod_voice_pools (JSONB). See migration
// 20260505_app_config_pod_voice_pools.sql for shape and policy.
async function loadVoicePools() {
  const { data, error } = await db()
    .from('app_config').select('value').eq('key', 'pod_voice_pools').single();
  if (error) throw new Error(`load pod_voice_pools: ${error.message}`);
  return data.value;
}

function normaliseName(speaker) {
  return speaker.toLowerCase().replace(/\s*\([^)]*\)\s*/g, '').trim();
}

// Canonical speaker name = original case, all parens stripped.
// "Susjed (08:00) (M)" → "Susjed". Used as the stable key so timed/marked
// variants of the same character collapse to one voice assignment.
function canonicalSpeakerName(speaker) {
  return speaker.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

// Explicit gender marker in speaker column: "Konobar (M)", "Susjeda (F)".
// Standalone paren group required — "Susjed (08:00) (M)" works, "(08:00, M)" doesn't.
// Returns 'f' | 'm' | 'n' | null.
function extractGenderMarker(speakerRaw) {
  const m = speakerRaw.match(/\(\s*([FMN])\s*\)/);
  return m ? m[1].toLowerCase() : null;
}

// Canonical pod-0 roles the name heuristic cannot read, because they are job
// titles and abstractions rather than names. They used to fall through to 'n',
// which the voice picker treats as male.
//
// That was survivable while every speaker got its own pool slot. Under the
// two-voice rule it is not: 'n' → male means EVERY ungendered character in
// EVERY course lands on the one male voice. Measured on the canonical 231-line
// pod-0 (cym_n_for_eng:pod-0-unrecorded), 143 of 232 lines belong to ungendered
// speakers, so the split came out 196 male / 36 female — a monologue with
// occasional guests, not the two-hander the rule is for.
//
// The Learner alone is 79 lines, and casting it female brings the pod to
// 115 female / 117 male. It also matches what the estate already does on the
// human side, where Catrin voices the Learner in the Welsh recording.
//
// An explicit (F)/(M) marker in the markdown still wins over this map.
const POD0_SPEAKER_GENDER = new Map([
  ['learner', 'f'],
]);

function inferGenderFromName(speaker) {
  // Try the full canonical name first, then with trailing index stripped
  // ("Klijentica 1" → "klijentica") so numbered variants of the same role
  // resolve via the role's gender.
  const clean = normaliseName(speaker);
  const stripped = clean.replace(/\s+\d+$/, '').trim();
  if (POD0_SPEAKER_GENDER.has(clean))    return POD0_SPEAKER_GENDER.get(clean);
  if (POD0_SPEAKER_GENDER.has(stripped)) return POD0_SPEAKER_GENDER.get(stripped);
  if (FEMALE_NAMES.has(clean) || FEMALE_NAMES.has(stripped)) return 'f';
  if (MALE_NAMES.has(clean)   || MALE_NAMES.has(stripped))   return 'm';
  return null;
}

function langKey(lang) {
  return (lang || '').toLowerCase().split(/[_-]/)[0];
}

// Pick a pool by the MOST SPECIFIC key that exists: exact code first, base
// language only as a fallback.
//
// The pools carry genuinely distinct regional casts — ara_sy is Amany/Laith
// where ara is Yasmin/Youssef, and fra_ca, por_br and spa_mx likewise. Reducing
// the code to its base language before the lookup made every one of those
// unreachable, so a Syrian Arabic course was cast in Modern Standard Arabic and
// a Quebec French one in metropolitan French. Silently: the base pool exists,
// so nothing errored.
function poolKeyFor(pools, lang) {
  const exact = (lang || '').toLowerCase();
  if (exact && pools[exact]) return exact;
  return langKey(exact);
}

// A pool key as stored in courses.voice_pool_key: 'deu_at', 'ara_eg', 'spa_mx'.
// Deliberately narrow — the whole point of the column is that it is an explicit
// human ruling, so anything that isn't obviously a pool key is a typo.
const POOL_KEY_RE = /^[a-z]{2,3}(_[a-z0-9]{2,4})?$/;

// The pool keys for a COURSE, target and known.
//
// Why this exists (2026-08-17, T-21): `courses.target_lang` carries the BASE tag
// for a regional-variant course — deu_at_for_eng is target_lang 'deu',
// ara_eg_for_eng is 'ara', spa_mx_for_eng is 'spa'. So a variant course and its
// base share ONE casting slot, and Tom has now ruled OPPOSITE pairs either side
// of that slot: German on Moritz + Lena, Austrian German on Felix + Sonja.
// Locking one silently recast the other.
//
// The fix is an explicit per-course key rather than a new tag in target_lang,
// because target_lang is read by ~105 files across this repo and
// ssi-learning-app — syllable counting, i18n, entitlement, pricing — and none of
// them want to learn about regions. `voice_pool_key` is read HERE and nowhere
// else, so the blast radius is exactly the casting path.
//
// Resolution order for the target track:
//   1. courses.voice_pool_key, when set — the human's ruling, and it WINS.
//   2. otherwise the region carried by the COURSE CODE ('deu_at_for_eng' →
//      'deu_at'), but only when the pools actually have that key. This is what
//      tools/pod-sync.cjs and tools/pod-recast.cjs already did before this
//      column existed, so keeping it as tier 2 means no course they cast
//      correctly today can regress — and it is what lifts api/pod-cast-voices.js
//      onto the same answer those two tools were already giving.
//   3. otherwise courses.target_lang, resolved exact-then-base by poolKeyFor()
//      exactly as before. A course with no variant sibling therefore resolves
//      byte-identically to how it did before this column existed.
//
// Tier 1 above tier 2 is the whole point: the estate's standing lesson from
// spa_mx_for_eng is "read the column, never the course code", and a stored
// human ruling must be able to overrule what the code string happens to spell.
//
// An explicit key that is malformed, or that names a pool which does not exist,
// THROWS. It must not fall back to the base language: falling back is precisely
// the miscast this column was added to stop, and it would be silent.
// The known track has no explicit key — no known language on the estate has a
// regional variant in play — so it keeps tiers 2 and 3 only.
function codeParts(courseCode) {
  const [target, known] = String(courseCode || '').split('_for_');
  return { target: target || '', known: known || '' };
}

function poolKeysForCourse(pools, course) {
  if (!course || typeof course !== 'object') {
    throw new Error('poolKeysForCourse: a course row is required');
  }
  const where = course.course_code || '(unknown course)';
  const parts = codeParts(course.course_code);
  const raw = course.voice_pool_key == null ? '' : String(course.voice_pool_key).trim();

  let target;
  if (raw) {
    const key = raw.toLowerCase();
    if (!POOL_KEY_RE.test(key)) {
      throw new Error(`${where}: courses.voice_pool_key "${raw}" is not a pool key (expected e.g. "deu_at")`);
    }
    if (!pools[key]) {
      throw new Error(`${where}: courses.voice_pool_key "${key}" has no pod_voice_pools entry — refusing to fall back to "${langKey(key)}", which would silently miscast`);
    }
    target = key;
  } else if (parts.target && pools[parts.target.toLowerCase()]) {
    target = parts.target.toLowerCase();
  } else {
    target = poolKeyFor(pools, course.target_lang);
  }

  const known = parts.known && pools[parts.known.toLowerCase()]
    ? parts.known.toLowerCase()
    : poolKeyFor(pools, course.known_lang);

  return { target, known };
}

// Aran's rule (2026-08-07): a pod is a TWO-HANDER — one male voice and one
// female voice for the whole cast, however many speaker labels the markdown
// carries. Canonical pod-0 has 26 labels; without this they fan out across the
// pool and a course ends up a 6-voice patchwork.
//
// Pool depth is not deleted, it is parked: POD_VOICES_PER_GENDER stays as
// opt-in headroom for pod 1/2 ("additional voices may come later"). Raise it
// via the env var and the old round-robin behaviour returns unchanged.
// Mirrors the human-recording side, which already has this rule as
// DEFAULT_POD_VOICES = 2 in services/voice-engine/pods-cast.cjs.
const POD_VOICES_PER_GENDER = Math.max(1, parseInt(process.env.POD_VOICES_PER_GENDER || '1', 10) || 1);

// A MANUAL voice choice, as picked in PodLab's casting panel.
//
// Shape: { target: { m: <voice>, f: <voice> }, known: { m, f } }, every key
// optional; <voice> is { provider, voice_id, name?, locale? }. An override
// replaces the pool pick for that (track, gender) and NOTHING else — gender
// resolution, variant collapsing, known-rank locking and the two-voice rule all
// run exactly as they do without it. A voice with no voice_id is ignored, so a
// half-filled dropdown can never blank a track.
//
// ⚠️ This choice lives ONLY in listening_pods.speakers. Re-running
// tools/pod-sync.cjs on the pod's markdown re-casts from the pool and will
// silently stomp a manual pick back to the pool default — re-apply the choice
// in PodLab (or pass overrides here) after any re-sync.
function normaliseOverrides(overrides) {
  const out = { target: {}, known: {} };
  if (!overrides || typeof overrides !== 'object') return out;
  for (const track of ['target', 'known']) {
    const t = overrides[track];
    if (!t || typeof t !== 'object') continue;
    for (const g of ['m', 'f']) {
      const v = t[g];
      if (!v || typeof v !== 'object' || !v.voice_id) continue;
      const picked = { provider: v.provider || 'xai', voice_id: v.voice_id, name: v.name || v.voice_id };
      // locale is carried only when the picker supplied one. Pool entries may
      // now carry one too (see poolVoice below), and an override still wins
      // outright: it replaces the pool pick whole, locale included.
      if (v.locale) picked.locale = v.locale;
      out[track][g] = picked;
    }
  }
  return out;
}

// A voice pool entry, rendered as a cast voice.
//
// Pool entries MAY carry an optional `locale` (Tom, 2026-08-16). They did not
// before: the Spanish recast of 2026-08-14 put xAI Manuel on the male target
// seats at an explicit es-ES — the Iberian-vs-Mexican steering tag Tom picked
// by ear — and the pool could not express that, so the approved cast lived only
// in listening_pods.speakers and any re-sync from markdown would have stomped
// it back to Azure Alvaro, self-invalidating his own approval.
// (docs/pods/spa-t17-cast-approval-2026-08-14.md.)
//
// Backwards compatibility is the whole safety argument: an entry with no
// `locale` produces exactly the object this code has always produced, so the
// ~145 locale-less entries on the estate cast byte-identically to today.
//
// A malformed locale THROWS rather than being dropped: a silently dropped
// locale is precisely the bug this change exists to fix. Same BCP-47 shape the
// PodLab casting route validates against (api/pod-cast-voices.js#readVoice).
const BCP47_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

function poolVoice(entry, where) {
  const out = { provider: entry.provider, voice_id: entry.voice_id, name: entry.name };
  const raw = entry.locale == null ? '' : String(entry.locale).trim();
  if (raw) {
    if (!BCP47_RE.test(raw)) {
      throw new Error(`${where}: pool entry "${entry.voice_id}" has locale "${raw}", which is not a BCP-47 tag`);
    }
    out.locale = raw;
  }
  return out;
}

// assignVoices = load the live pools, then resolve. The two halves are split so
// that the resolution — the part with all the rules in it — can be tested
// without a database (tools/pod-sync-cast-overrides.test.cjs). There is still
// exactly ONE implementation of casting: this wrapper does nothing but fetch.
async function assignVoices(rawSpeakers, targetLang, knownLang, overrides = null) {
  const pools = await loadVoicePools();
  return resolveCast(rawSpeakers, targetLang, knownLang, pools, overrides);
}

function resolveCast(rawSpeakers, targetLang, knownLang, pools, overrides = null) {
  // rawSpeakers: array of speaker-name strings as written in the markdown
  //   (e.g. ["Susjed (08:00)", "Susjed (M)", "Ana (F)", "Ana"]).
  //   Variants of the same character collapse to one canonical key.
  // pools: app_config.pod_voice_pools, as loaded.
  // overrides: manual voice choice, see normaliseOverrides above. Omit it and
  //   this function behaves exactly as it always has.
  // returns: {
  //   [canonicalSpeaker]: {
  //     gender, target: { provider, voice_id, name }, known: { ... }
  //   }
  // }
  const ov = normaliseOverrides(overrides);
  const tk = poolKeyFor(pools, targetLang);
  const kk = poolKeyFor(pools, knownLang);
  const targetPool = pools[tk] || { f: [], m: [] };
  const knownPool  = pools[kk] || { f: [], m: [] };

  // Group raw variants by canonical name, preserving first-seen order.
  const variantsByCanon = new Map();  // canonical → [raw, raw, ...]
  for (const raw of rawSpeakers) {
    const canon = canonicalSpeakerName(raw);
    if (!variantsByCanon.has(canon)) variantsByCanon.set(canon, []);
    variantsByCanon.get(canon).push(raw);
  }

  const counters = { f: 0, m: 0 };
  const ungendered = [];
  const assignments = {};

  for (const [canon, variants] of variantsByCanon) {
    // Gender resolution: any variant with an explicit (F)/(M)/(N) marker wins;
    // else fall through to the name heuristic on the canonical form; else 'n'.
    let gender = null;
    for (const v of variants) {
      gender = extractGenderMarker(v);
      if (gender) break;
    }
    if (!gender) gender = inferGenderFromName(canon) || 'n';
    if (gender === 'n') ungendered.push(canon);
    // 'n' → male default for voice picking; override with explicit marker.
    const pickGender = gender === 'n' ? 'm' : gender;
    const idx = counters[pickGender]++;
    const tPool = targetPool[pickGender] || [];
    const kPool = knownPool[pickGender] || [];
    // A manual override supplies the voice itself, so an empty pool is no
    // longer a blocker for that gender — it is exactly how a language whose
    // pool has only one gender gets cast as a two-hander by hand.
    if (tPool.length === 0 && !ov.target[pickGender]) {
      throw new Error(`No target voice available: pod_voice_pools["${tk}"]["${pickGender}"] is empty (speaker "${canon}")`);
    }
    if (kPool.length === 0 && !ov.known[pickGender]) {
      throw new Error(`No known voice available: pod_voice_pools["${kk}"]["${pickGender}"] is empty (speaker "${canon}")`);
    }
    // Known voice rank is locked to target rank: characters who share a target
    // voice (same Croatian Gabrijela in hrv, where there's only 1 F target
    // voice) must share the same known voice. Otherwise listeners hear the
    // same "person" in Croatian but different people in English.
    // Two-voice rule: every speaker of a gender lands on the same voice, so
    // `idx` is confined to the first POD_VOICES_PER_GENDER entries of the pool
    // (1 by default → always index 0). Set POD_VOICES_PER_GENDER > 1 to get the
    // old round-robin across the full pool back.
    const tIdx = tPool.length ? (idx % Math.min(POD_VOICES_PER_GENDER, tPool.length)) : 0;
    const kIdx = kPool.length ? (tIdx % kPool.length) : 0;
    const t = tPool[tIdx];
    const k = kPool[kIdx];
    assignments[canon] = {
      gender,
      variants,
      // Cloned, never aliased: every speaker gets its own voice object, so the
      // stored cast can be edited per speaker later without one edit moving all.
      target: ov.target[pickGender] ? { ...ov.target[pickGender] } : poolVoice(t, `pod_voice_pools["${tk}"]["${pickGender}"]`),
      known:  ov.known[pickGender]  ? { ...ov.known[pickGender] }  : poolVoice(k, `pod_voice_pools["${kk}"]["${pickGender}"]`),
    };
  }

  // _default for re-run safety (markdown adds a speaker between re-syncs).
  // It is the MALE slot, so a male override governs it too — otherwise a new
  // speaker would arrive on the pool voice the manual choice replaced.
  const defT = ov.target.m || (targetPool.m || [])[0];
  const defK = ov.known.m  || (knownPool.m  || [])[0];
  if (defT && defK) {
    assignments._default = {
      gender: 'n',
      target: defT === ov.target.m ? { ...defT } : poolVoice(defT, `pod_voice_pools["${tk}"]["m"][0]`),
      known:  defK === ov.known.m  ? { ...defK } : poolVoice(defK, `pod_voice_pools["${kk}"]["m"][0]`),
    };
  }

  if (ungendered.length) {
    console.warn(`⚠️  Speakers without explicit (F)/(M) marker, defaulted to male: ${ungendered.join(', ')}`);
    console.warn(`   Add (F) or (M) in the markdown speaker column to override, then re-sync.`);
  }
  return assignments;
}

// ---------------------------------------------------------------------------
// Markdown parsing
// ---------------------------------------------------------------------------

const RE_H1 = /^#\s+(.+?)\s*$/;
const RE_H2 = /^##\s+(.+?)\s*$/;
const RE_H3 = /^###\s+(.+?)\s*$/;
// Two markdown shapes supported:
//   Legacy (4 cols):  | # | Speaker | Target | Known |
//   Chunked (5 cols): | # | Speaker | Target | Known | + |
//
// In the chunked shape, `#` allows a sub-letter (1, 2a, 2b, 3a) and the
// trailing `+` column carries the glue-to-next marker (presence of any
// non-whitespace token in that cell = glued; empty = end of utterance).
const RE_TABLE_ROW_LEGACY  = /^\|\s*(\d+[a-z]?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/;
const RE_TABLE_ROW_CHUNKED = /^\|\s*(\d+[a-z]?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*([^|]*?)\s*\|\s*$/;
const RE_TABLE_HEADER = /^\|\s*#\s*\|/i;
const RE_TABLE_SEPARATOR = /^\|[\s-|]+\|\s*$/;

/**
 * Match a content row in either legacy or chunked shape.
 * Returns { num, speaker, target, known, glueToNext } or null.
 * glueToNext is undefined for legacy rows (4 cols), boolean for chunked.
 */
function matchTableRow(line) {
  const chunked = line.match(RE_TABLE_ROW_CHUNKED);
  if (chunked) {
    const [, num, speaker, target, known, glueCell] = chunked;
    return {
      num,
      speaker: speaker.trim(),
      target: target.trim(),
      known: known.trim(),
      glueToNext: /\S/.test(glueCell),
    };
  }
  const legacy = line.match(RE_TABLE_ROW_LEGACY);
  if (legacy) {
    const [, num, speaker, target, known] = legacy;
    return {
      num,
      speaker: speaker.trim(),
      target: target.trim(),
      known: known.trim(),
      glueToNext: undefined,
    };
  }
  return null;
}

/**
 * Extract frontmatter (the narrative block above the first `---`) as text.
 * Also extracts labelled key:value-like lines into a dict for easy consumption.
 */
function extractFrontmatter(lines) {
  const frontmatter = { raw: '', fields: {} };
  let inside = false;
  let sawFirstHr = false;
  const collected = [];
  for (const line of lines) {
    if (line.trim() === '---') {
      if (sawFirstHr) break;
      sawFirstHr = true;
      continue;
    }
    if (line.match(RE_H1)) { inside = true; continue; }
    if (inside) collected.push(line);
  }
  frontmatter.raw = collected.join('\n').trim();

  // Pull labelled lines like "**Hosts**: Elena (...) + Dani (...)"
  for (const line of collected) {
    const m = line.match(/^\*\*([A-Za-z\s]+?)\*\*\s*[:：]\s*(.+?)\s*$/);
    if (m) {
      const key = m[1].trim().toLowerCase().replace(/\s+/g, '_');
      frontmatter.fields[key] = m[2].trim();
    }
  }
  return frontmatter;
}

/**
 * Parse hosts from a frontmatter `hosts` field of the form:
 *   "Elena (30s, journalist, reflective, analytical) + Dani (20s, enthusiast, pop-culture-fluent, emotional)"
 * Returns: [{ name: 'Elena', description: '...' }, ...]
 */
function parseHosts(hostsField) {
  if (!hostsField) return [];
  const hosts = [];
  // Split on " + " or " & " or ","
  const parts = hostsField.split(/\s*\+\s*|\s*&\s*/);
  for (const part of parts) {
    const m = part.trim().match(/^([^\(]+?)(?:\s*\(([^)]+)\))?\s*$/);
    if (m) {
      hosts.push({ name: m[1].trim(), description: (m[2] || '').trim() });
    }
  }
  return hosts;
}

/**
 * Parse H2 header into { scene_number, title, subtitle, raw_label }.
 * Accepts all three observed shapes:
 *   "## 1. Introductions — *Mucho gusto*"             (old Pod 0 numbered)
 *   "## Pod 0 · A Day of Greetings — *De la mañana...*" (Pod 0 labelled)
 *   "## Segment 1 · La música que nos marcó — *the music that shaped us*"
 */
function parseH2(text) {
  // Strip leading "Pod N · ", "Segment N · ", or "N. "
  let label = null;
  let body = text;

  const prefixLabel = text.match(/^(Pod|Segment|Scene|Cluster|Chapter|Part|Ep\.?|Episode)\s+(\S+)\s*·\s*(.+)$/i);
  const numberedDot = text.match(/^(\d+)\.\s+(.+)$/);

  if (prefixLabel) {
    label = prefixLabel[1] + ' ' + prefixLabel[2];
    body = prefixLabel[3];
  } else if (numberedDot) {
    label = numberedDot[1];
    body = numberedDot[2];
  }

  // Now body looks like "Title — *Subtitle*" (em dash + italics subtitle)
  const titleSubtitle = body.match(/^(.+?)\s+[—–-]\s*\*(.+?)\*\s*$/);
  if (titleSubtitle) {
    return { label, title: titleSubtitle[1].trim(), subtitle: titleSubtitle[2].trim() };
  }
  return { label, title: body.trim(), subtitle: null };
}

/**
 * Main parser. Returns a structured pod object.
 */
function parseMarkdown(markdown) {
  const lines = markdown.split('\n');

  // H1 title
  let podTitle = null;
  for (const line of lines) {
    const m = line.match(RE_H1);
    if (m) { podTitle = m[1].trim(); break; }
  }

  // Frontmatter
  const frontmatter = extractFrontmatter(lines);

  // Walk lines and build sections
  const sections = [];  // [{number, title, subtitle, label, beats: [{label, sentences: [...]}]}]
  let currentSection = null;
  let currentBeat = null;
  let sawFirstH2 = false;
  let globalOrder = 0;
  let sentenceNumInSection = 0;

  for (const line of lines) {
    const h2 = line.match(RE_H2);
    const h3 = line.match(RE_H3);
    const row = (RE_TABLE_HEADER.test(line) || RE_TABLE_SEPARATOR.test(line))
      ? null
      : matchTableRow(line);

    if (h2) {
      // ONLY treat an H2 as a real section if it matches the expected shape:
      //   "## N. Title ..." | "## Pod N ..." | "## Segment N ..."
      // Anything else (## Design notes, ## Segment counts, ## Outline, ## Total
      // wordcount & register summary, etc.) is meta and gets ignored.
      const text = h2[1].trim();
      const isSectionShape = /^(Segment|Pod|Scene|Ep\.?|Episode|Cluster|Chapter|Part)\s+\S+\s*[·:—–-]/i.test(text) ||
                             /^\d+\.\s+/.test(text);
      if (!isSectionShape) {
        currentSection = null;
        currentBeat = null;
        continue;
      }
      const parsed = parseH2(text);
      sawFirstH2 = true;
      sentenceNumInSection = 0;
      currentSection = {
        number: sections.length + 1,
        label: parsed.label,
        title: parsed.title,
        subtitle: parsed.subtitle,
        sentences: [],
      };
      sections.push(currentSection);
      currentBeat = null;
    } else if (h3 && currentSection) {
      // Could be a beat ("### Beat 1 — Opening *(1–4)*") or an outline bullet
      const text = h3[1].trim();
      if (/^beat\b/i.test(text) || /^[✦•*]/.test(text)) {
        currentBeat = text;
      } else {
        // Other H3 inside a section — treat as additional label only if it's
        // clearly part of content structure, otherwise ignore.
        currentBeat = text;
      }
    } else if (row && currentSection) {
      const { speaker, target, known, glueToNext } = row;
      // Skip stray rows where speaker cell looks like header/separator content
      if (!speaker || speaker === '#') continue;

      globalOrder++;
      sentenceNumInSection++;
      currentSection.sentences.push({
        sentence_number: sentenceNumInSection,
        global_order: globalOrder,
        speaker,
        target_text: target,
        known_text: known,
        beat_label: currentBeat,
        // glueToNext is undefined for legacy 4-col files; let the writer
        // default it. For chunked 5-col files, carry the explicit boolean.
        glue_to_next: glueToNext,
      });
    }
  }

  // Build metadata JSONB from frontmatter
  const metadata = {};
  if (frontmatter.fields.hosts) {
    metadata.hosts = parseHosts(frontmatter.fields.hosts);
  }
  for (const key of ['register', 'format', 'target_size', 'status', 'design_notes', 'purpose']) {
    if (frontmatter.fields[key]) metadata[key] = frontmatter.fields[key];
  }
  if (frontmatter.raw) metadata._frontmatter_raw = frontmatter.raw;

  // Summarise sections into metadata.sections for outline preservation
  metadata.sections = sections.map(s => ({
    number: s.number,
    label: s.label,
    title: s.title,
    subtitle: s.subtitle,
    sentence_count: s.sentences.length,
  }));

  // Collect unique speakers across all sections
  const uniqueSpeakers = [];
  const seen = new Set();
  for (const s of sections) {
    for (const sent of s.sentences) {
      if (!seen.has(sent.speaker)) {
        seen.add(sent.speaker);
        uniqueSpeakers.push(sent.speaker);
      }
    }
  }

  return {
    pod_title: podTitle,
    metadata,
    sections,
    uniqueSpeakers,
    totalSentences: globalOrder,
  };
}

// ---------------------------------------------------------------------------
// DB upsert
// ---------------------------------------------------------------------------

async function syncPod(markdownPath, options) {
  const { courseCode, podType, slug, dryRun = false, verbose = false } = options;
  if (!fs.existsSync(markdownPath)) throw new Error(`File not found: ${markdownPath}`);

  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const parsed = parseMarkdown(markdown);

  const podId = `${courseCode}:${slug}`;
  // courseCode shape: "<target>_for_<known>" or "<target>_<region>_for_<known>"
  // e.g. "hrv_for_eng" → target=hrv, known=eng
  //      "fra_ca_for_eng" → target=fra (region stripped to ISO 639-3), known=eng
  const [targetPart, knownPart] = courseCode.split('_for_');
  if (!targetPart || !knownPart) {
    throw new Error(`Course code "${courseCode}" is not in <target>_for_<known> form`);
  }
  // Pool keys come from the COURSE ROW, not from the code, so that
  // courses.voice_pool_key — the human's regional-variant ruling — governs.
  // The code-derived parts stay as the fallback for a pod whose course row is
  // missing (test fixtures), where the FULL code, region and all, is passed so
  // assignVoices still resolves the most specific pool that exists.
  const pools = await loadVoicePools();
  const { data: course } = await db()
    .from('courses').select('course_code, target_lang, known_lang, voice_pool_key')
    .eq('course_code', courseCode).maybeSingle();
  const keys = course
    ? poolKeysForCourse(pools, course)
    : { target: poolKeyFor(pools, targetPart), known: poolKeyFor(pools, knownPart) };
  const targetLang = keys.target;
  const knownLang = keys.known;
  const speakers = resolveCast(parsed.uniqueSpeakers, targetLang, knownLang, pools);

  console.log(`\n🎧 Pod Sync: ${markdownPath}`);
  console.log(`   Target:   ${podId}  (type=${podType})`);
  console.log(`   Title:    ${parsed.pod_title || '(none)'}`);
  console.log(`   Sections: ${parsed.sections.length}`);
  console.log(`   Sentences: ${parsed.totalSentences}`);
  console.log(`   Speakers: ${parsed.uniqueSpeakers.length} (${parsed.uniqueSpeakers.join(', ')})`);

  if (verbose) {
    console.log('\n   Voice assignments:');
    for (const [sp, v] of Object.entries(speakers)) {
      if (sp === '_default') continue;
      const t = `${v.target.provider}/${v.target.name}`;
      const k = `${v.known.provider}/${v.known.name}`;
      console.log(`     ${sp.padEnd(22)} (${v.gender})  target=${t.padEnd(20)} known=${k}`);
    }
    console.log('\n   Sections:');
    for (const s of parsed.sections) {
      console.log(`     [${s.number}] ${s.label || '-'}  "${s.title}"  (${s.sentences.length} sentences)`);
    }
  }

  if (dryRun) {
    console.log('\n   (dry-run) no DB writes performed');
    return { parsed, speakers, podId };
  }

  // 1. Upsert the pod
  const podRow = {
    id: podId,
    course_code: courseCode,
    pod_type: podType,
    slug,
    title: parsed.pod_title,
    speakers,
    metadata: parsed.metadata,
    source_file: path.basename(markdownPath),
    updated_at: new Date().toISOString(),
  };
  // A POD IS BORN HELD (Tom, 2026-08-23). Syncing a markdown file into a pod
  // that does not exist yet CREATES it, and the column's DB default is 'live' —
  // so without this, running pod-sync on a new file would put unproofread,
  // unrecorded content in front of learners the instant it landed. `visibility`
  // is set on creation ONLY; on a re-sync it is left out of the row entirely,
  // and PostgREST's merge-duplicates update touches only the columns it is
  // sent, so a live pod stays live and a held pod stays held.
  //
  // Release is a human act: POST /api/admin/pods/:course/:slug/visibility.
  const { data: existingPod } = await db()
    .from('listening_pods').select('id').eq('id', podId).maybeSingle();
  if (!existingPod) podRow.visibility = 'held';
  const { error: podErr } = await db().from('listening_pods').upsert(podRow, { onConflict: 'id' });
  if (podErr) throw new Error(`Pod upsert failed: ${podErr.message}`);

  // 2. Wipe + reinsert sentences (wholesale replace semantics on re-sync)
  const { error: delErr } = await db().from('listening_pod_sentences').delete().eq('pod_id', podId);
  if (delErr) throw new Error(`Sentence delete failed: ${delErr.message}`);

  const sentenceRows = [];
  for (const section of parsed.sections) {
    for (const sent of section.sentences) {
      sentenceRows.push({
        id: `${podId}:SC${String(section.number).padStart(2, '0')}-S${String(sent.sentence_number).padStart(3, '0')}`,
        pod_id: podId,
        scene_number: section.number,
        sentence_number: sent.sentence_number,
        global_order: sent.global_order,
        speaker: sent.speaker,
        target_text: sent.target_text,
        known_text: sent.known_text,
        beat_label: sent.beat_label,
        // Carry glue marker through. For legacy 4-col markdown, sent.glue_to_next
        // is undefined → DB default (false) applies. Explicit boolean wins
        // when the chunked 5-col format is used.
        ...(typeof sent.glue_to_next === 'boolean' && { glue_to_next: sent.glue_to_next }),
      });
    }
  }

  // Insert in chunks (Supabase upsert payload size limit)
  const CHUNK = 500;
  for (let i = 0; i < sentenceRows.length; i += CHUNK) {
    const batch = sentenceRows.slice(i, i + CHUNK);
    const { error: insErr } = await db().from('listening_pod_sentences').insert(batch);
    if (insErr) throw new Error(`Sentence insert failed (batch ${i / CHUNK}): ${insErr.message}`);
  }

  console.log(`\n✅ Synced: ${sentenceRows.length} sentences written for ${podId}`);
  return { parsed, speakers, podId, sentenceCount: sentenceRows.length };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Pod Sync — parse pod markdown and upsert to listening_pods + listening_pod_sentences

Usage:
  node tools/pod-sync.cjs <markdown-file> --course=<code> --type=<core|choice> --slug=<slug> [options]

Options:
  --course=<code>     Course code (required) e.g. spa_for_eng
  --type=<type>       'core' or 'choice' (required)
  --slug=<slug>       Pod slug (required) e.g. pod-0, music, travel-situations
  --dry-run           Parse + print summary, do not write to DB
  --verbose           Show per-section and per-speaker breakdown

Examples:
  node tools/pod-sync.cjs ~/Desktop/spanish-pods.md \\
    --course=spa_for_eng --type=core --slug=pod-0

  node tools/pod-sync.cjs ~/Desktop/spanish-podcast-music.md \\
    --course=spa_for_eng --type=choice --slug=music --verbose
`);
    process.exit(0);
  }

  const markdownPath = args[0].startsWith('-') ? null : args[0];
  if (!markdownPath) {
    console.error('❌ First argument must be a markdown file path');
    process.exit(1);
  }

  const getArg = (flag) => {
    for (const a of args) {
      if (a === flag) return true;
      if (a.startsWith(flag + '=')) return a.slice(flag.length + 1);
    }
    return null;
  };

  const courseCode = getArg('--course');
  const podType = getArg('--type');
  const slug = getArg('--slug');
  const dryRun = !!getArg('--dry-run');
  const verbose = !!getArg('--verbose');

  if (!courseCode || !podType || !slug) {
    console.error('❌ --course, --type, and --slug are required');
    process.exit(1);
  }
  if (!['core', 'choice'].includes(podType)) {
    console.error('❌ --type must be "core" or "choice"');
    process.exit(1);
  }

  try {
    await syncPod(path.resolve(markdownPath.replace(/^~/, process.env.HOME)), {
      courseCode, podType, slug, dryRun, verbose,
    });
    console.log('\n✨ Done!\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  parseMarkdown, syncPod, assignVoices, resolveCast,
  canonicalSpeakerName, extractGenderMarker, inferGenderFromName,
  loadVoicePools, poolKeyFor, poolKeysForCourse, normaliseOverrides,
};
