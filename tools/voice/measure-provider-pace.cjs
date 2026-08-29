#!/usr/bin/env node
/**
 * MEASURE EACH VOICE'S NATURAL PACE, FROM THE PROVIDER API — not from the estate.
 *
 * Tom's correction, 2026-08-29, which is why this tool exists at all:
 *
 *   "be careful - Azure voices were recorded at non 1.0x speeds so we can only
 *    use the providers APIs for the voice as the truth - not the recordings we
 *    have in the estate"
 *
 * tools/voice/measure-natural-pace.cjs measured `course_audio`. However
 * carefully it filtered for clips believed to be 1.0x, it was still measuring
 * RECORDINGS — decisions somebody already made — rather than VOICES. This tool
 * renders one fresh sentence per voice, at speed 1.0 with no prosody rate and
 * no post-processing, and times the bytes with ffprobe.
 *
 *   Usage:
 *     node tools/voice/measure-provider-pace.cjs --probe            # 5 voices, 2 providers, no writes
 *     node tools/voice/measure-provider-pace.cjs                    # full render, no writes
 *     node tools/voice/measure-provider-pace.cjs --apply            # full render + write voices.*
 *     node tools/voice/measure-provider-pace.cjs --only <id,id,...> # named voices only
 *
 * ── WHY ONE IDENTICAL SENTENCE PER LANGUAGE ─────────────────────────────────
 * Every voice speaking a language gets THE SAME TEXT, so character count,
 * punctuation and phonetic content all cancel exactly. The comparison is then
 * pure duration: reference ÷ this voice. No cps normalisation, no cross-language
 * arithmetic, nothing to argue about. (cps is still stored as evidence, because
 * the column exists and a reader deserves the raw figure — but nothing divides
 * by it.)
 *
 * ── NORMALISED WITHIN LANGUAGE ONLY, NOT (LANGUAGE, ROLE) ───────────────────
 * The estate-derived tool normalised within (language, role) because it was
 * pooling clips that had been rendered for different roles. With one controlled
 * sentence there is no role dimension: a voice speaks at one pace. DEFAULT taken
 * 2026-08-29, flagged for Tom.
 *
 * ── WHAT IT NEVER DOES ──────────────────────────────────────────────────────
 * Touches, re-renders or reads a single existing course clip. Writes
 * natural_pace_nudge. Uploads anything. The samples land in a scratch directory
 * and stay there for a human to listen to.
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { combineMeasurements } = require('../../services/shared/voice-pace.cjs');
const tts = require('../../services/tts-service.cjs');
const langCodes = require('../../services/language-code-service.cjs');

const METHOD = 'provider-api@1.0x one-sentence-per-language v2 2026-08-29';

/** Concurrency. Network-bound work on a 4-core box that is also Tom's Command Surface. */
const CONCURRENCY = Number(process.env.PACE_CONCURRENCY || 5);

/**
 * xAI is RETIRED FROM SELECTION for new renders (tts-provider-policy.cjs) and
 * this tool honours that for the 118 xAI voices nobody will ever cast again.
 * These six are different: they are cast on LIVE courses today, so the player
 * will apply a pace correction to clips rendered in them, and a correction
 * without a measurement is a guess. Measuring a voice is not selecting it.
 */
const XAI_IN_USE = new Set(['eve', 'ara', 'leo', 'sal', 'rex', 'bedd6226', 'gfzdpspr5fdp']);

const SCRATCH = process.env.CS_SCRATCH || path.join(os.tmpdir(), 'pace-samples');

// ── SENTENCE SELECTION ──────────────────────────────────────────────────────
// A sentence with numerals, abbreviations or unusual punctuation is expanded or
// paused on differently by every provider, which would put provider quirks into
// a number meant to measure voices. So: plain prose, one clause or two, long
// enough for a stable read and short enough to be cheap.
const MIN_CHARS = 30, MAX_CHARS = 130;
const MIN_WORDS = 6, MAX_WORDS = 20;
/** Scripts that do not space their words: judged on characters alone. */
const UNSPACED = new Set(['zho', 'cmn', 'jpn', 'tha', 'lao', 'mya', 'khm']);
const UNSPACED_MIN = 18, UNSPACED_MAX = 55;

function sentenceOk(text, lang, tier) {
  if (!text) return false;
  const t = String(text).trim();
  if (/[0-9]/.test(t)) return false;                       // numerals get expanded, unpredictably
  if (/\b[A-Z]{2,}\b/.test(t)) return false;               // abbreviations read letter-by-letter
  if (/[«»"“”()[\]{}…*_/\\|#@%&+=<>~^`]/.test(t)) return false; // odd punctuation
  // Tier 1 is the clean ideal. Tiers 2 and 3 relax only what has to be relaxed
  // for a language whose corpus is small, and the tier used is RECORDED per
  // language so a reader can see which sentences were compromises.
  if (tier === 1 && /[!?;:]/.test(t)) return false;        // question/exclamation prosody changes pace
  const lo = UNSPACED.has(lang) ? UNSPACED_MIN : (tier === 3 ? 22 : MIN_CHARS);
  const hi = UNSPACED.has(lang) ? UNSPACED_MAX : (tier === 3 ? 170 : MAX_CHARS);
  if (t.length < lo || t.length > hi) return false;
  if (UNSPACED.has(lang)) return true;
  const w = t.split(/\s+/).length;
  if (tier === 3) return w >= 4;
  return w >= MIN_WORDS && w <= MAX_WORDS;
}

async function buildSentenceBank(db, languages) {
  const { data: courses, error } = await db.from('courses').select('course_code,target_lang,known_lang,seed_count');
  if (error) throw new Error(`courses: ${error.message}`);
  const size = (c) => (c.seed_count == null ? 0 : c.seed_count);
  const bank = {};
  for (const lang of [...languages].sort()) {
    // Prefer the language as a TARGET (the text was authored in it); fall back
    // to the known side of a course that teaches FROM it. seed_count is often
    // NULL on a real course, so it orders the candidates and never excludes one.
    const targetCourses = courses.filter((c) => c.target_lang === lang).sort((a, b) => size(b) - size(a));
    const knownCourses = courses.filter((c) => c.known_lang === lang).sort((a, b) => size(b) - size(a));
    let picked = null;
    for (const tier of [1, 2, 3]) {
      for (const [list, col] of [[targetCourses, 'target_text'], [knownCourses, 'known_text']]) {
        for (const c of list.slice(0, 3)) {
          const { data: seeds } = await db.from('course_seeds')
            .select(`seed_number,${col}`).eq('course_code', c.course_code)
            .order('seed_number', { ascending: false }).limit(600);
          const hits = (seeds || []).filter((x) => sentenceOk(x[col], lang, tier));
          if (!hits.length) continue;
          // The LONGEST qualifying sentence, not the first: a longer read is a
          // steadier measurement, and "longest in the window" is deterministic
          // so a re-measurement uses the same sentence.
          hits.sort((a, b) => String(b[col]).length - String(a[col]).length || a.seed_number - b.seed_number);
          const hit = hits[0];
          picked = { text: String(hit[col]).trim(), source: `${c.course_code} seed ${hit.seed_number} (${col})`, tier };
          break;
        }
        if (picked) break;
      }
      if (picked) break;
    }
    if (picked) bank[lang] = picked;
  }
  return bank;
}

// ── VOICE POPULATION ────────────────────────────────────────────────────────
function providerOf(v) {
  const e = (v.tts_engine || '').toLowerCase();
  return ['azure', 'cartesia', 'elevenlabs', 'xai'].includes(e) ? e : null;
}

/**
 * The one language a voice's pace is filed under, as ISO 639-3 — which is what
 * courses and course_audio use, and therefore the only key a sentence can be
 * looked up under. `voices.languages` is a mix of ISO-639-1 ('pt', 'de') and
 * ISO-639-3 ('cmn', 'eng'), so it is normalised, and the BCP-47 locale is
 * preferred where there is one because it is the most specific thing we hold.
 */
function primaryLanguage(v) {
  const idLocale = (String(v.voice_id || '').replace(/^[a-z]+_/, '').match(/^[a-z]{2,3}(?:-[A-Za-z]+)*-/) || [''])[0].replace(/-$/, '');
  const candidates = [v.tts_locale, ...(Array.isArray(v.languages) ? v.languages : []), idLocale].filter(Boolean)
    .filter((c) => c !== 'unknown');
  for (const c of candidates) {
    for (const form of [c, String(c).split('-')[0]]) {
      try {
        const iso3 = langCodes.toIso3(form);
        if (iso3 && /^[a-z]{3}$/.test(iso3)) return iso3;
      } catch { /* unmappable code: try the next candidate */ }
    }
  }
  return null;
}

/**
 * The BCP-47 steer handed to the provider. Cartesia and xAI HARD FAIL without
 * one and warn loudly on 'auto', and an unsteered multilingual voice reads
 * cross-language text with English phonology — which would corrupt the timing
 * as well as sounding wrong. So a missing tts_locale falls back to the
 * language's own two-letter code rather than to 'auto'.
 */
function bcp47(v, iso3) {
  if (v.tts_locale) return v.tts_locale;
  try {
    const azure = langCodes.getAzureLocale(iso3);   // 'spa' → 'es-ES'
    if (azure) return azure;
  } catch { /* the language is not in the Azure table; fall through */ }
  return null;
}

async function loadVoices(db) {
  let all = [], from = 0;
  for (;;) {
    const { data, error } = await db.from('voices')
      .select('voice_id,type,tts_engine,tts_voice_name,tts_locale,languages,is_active,natural_pace_ratio,natural_pace_nudge')
      .range(from, from + 999);
    if (error) throw new Error(`voices: ${error.message}`);
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all.filter((v) => {
    if (v.is_active === false) return false;
    const p = providerOf(v);
    if (!p) return false;                       // human, assembled, legacy: nothing to render
    if (p === 'xai') {
      const names = [v.voice_id, String(v.voice_id).replace(/^xai_/, ''), v.tts_voice_name]
        .filter(Boolean).map((x) => String(x).toLowerCase());
      if (!names.some((n) => XAI_IN_USE.has(n))) return false;
    }
    return true;
  });
}

/**
 * WHICH LANGUAGES A MULTILINGUAL VOICE ACTUALLY SPEAKS ON LIVE COURSES.
 *
 * Six xAI voices (eve, leo, ara, sal and Tom's two clones) declare `mul` and are
 * cast on RELEASED courses — fra_for_eng, spa_for_eng, jpn_for_eng, ita_for_eng,
 * kor_for_eng among them. A multilingual voice has no single natural pace, and
 * skipping them would leave the estate's most-heard voices unmeasured while the
 * player corrected everything around them. So they are measured once per
 * language they are CAST IN, read straight off courses.voice_config, and their
 * stored ratio is the median across those languages — the same shape
 * combineMeasurements() already defines.
 *
 * The role→language mapping is the estate's own: `known` and `presentation`
 * speak the known language, `target1`/`target2` the target.
 */
async function castLanguages(db) {
  const { data: courses, error } = await db.from('courses').select('course_code,target_lang,known_lang,voice_config');
  if (error) throw new Error(`courses: ${error.message}`);
  const map = new Map();
  for (const c of courses) {
    const voices = c.voice_config && c.voice_config.voices;
    if (!voices) continue;
    for (const [role, slot] of Object.entries(voices)) {
      const id = slot && (slot.voice_id || slot.voiceId || slot.id);
      if (!id) continue;
      const lang = /^target/.test(role) ? c.target_lang : c.known_lang;
      if (!lang) continue;
      if (!map.has(id)) map.set(id, new Set());
      map.get(id).add(lang);
    }
  }
  return map;
}

// ── RENDER + TIME ───────────────────────────────────────────────────────────
async function renderOne(voice, text, iso3) {
  const provider = providerOf(voice);
  const locale = bcp47(voice, iso3);
  if (provider === 'azure') {
    return tts.generateAzure(text, {
      subscriptionKey: process.env.AZURE_SPEECH_KEY || process.env.AZURE_TTS_KEY,
      region: process.env.AZURE_SPEECH_REGION || process.env.AZURE_TTS_REGION,
      // Azure wants the FULL locale-prefixed name ('en-US-JennyNeural'), which
      // is what voice_id carries; tts_voice_name is often the bare tail and a
      // bare tail is rejected with "Unsupported voice" (verified 2026-08-29).
      voiceName: azureVoiceName(voice),
      speed: 1.0,
    });
  }
  if (provider === 'cartesia') {
    return tts.generateCartesia(text, {
      apiKey: process.env.CARTESIA_API_KEY,
      voiceId: String(voice.voice_id).replace(/^cartesia_/, ''),
      locale: locale || 'auto',
      speed: 1.0,
    });
  }
  if (provider === 'elevenlabs') {
    return tts.generateElevenLabs(text, {
      apiKey: process.env.ELEVENLABS_API_KEY,
      voiceId: String(voice.voice_id).replace(/^elevenlabs_/, ''),
      speed: 1.0,
    });
  }
  if (provider === 'xai') {
    return tts.generateXai(text, {
      apiKey: process.env.XAI_API_KEY,
      // The ID, never the display name: xAI's clones are addressed by id
      // ('gfzdpspr5fdp'), and sending tts_voice_name gets a 404 ("Voice 'Tom'
      // not found"). Preset voices happen to have id === name, which is what
      // hid this until the clones were measured.
      voiceId: String(voice.voice_id).replace(/^xai_/, ''),
      language: locale || 'auto',
    });
  }
  throw new Error(`no render path for provider ${provider}`);
}

function azureVoiceName(v) {
  const fromId = String(v.voice_id || '').replace(/^azure_/, '');
  if (/^[a-z]{2,3}(-[A-Za-z]+)+-/.test(fromId)) return fromId;
  const name = v.tts_voice_name || fromId;
  if (/^[a-z]{2,3}(-[A-Za-z]+)+-/.test(name)) return name;
  return v.tts_locale ? `${v.tts_locale}-${name}` : name;
}

function durationSeconds(file) {
  // ffprobe on the bytes we actually received. A provider-reported duration is
  // a claim about what it meant to send; this is what it sent.
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file], { encoding: 'utf8' });
  const d = Number(String(out).trim());
  if (!Number.isFinite(d) || d <= 0) throw new Error(`ffprobe gave no duration for ${file}`);
  return d;
}

async function pool(items, n, fn) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    for (;;) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const probe = argv.includes('--probe');
  const onlyArg = argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? new Set(onlyArg.split('=')[1].split(',')) : null;

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

  let voices = await loadVoices(db);
  if (only) voices = voices.filter((v) => only.has(v.voice_id));

  const langs = new Set(voices.map(primaryLanguage).filter(Boolean));
  const bank = await buildSentenceBank(db, langs);

  const cast = await castLanguages(db);
  const castLangsFor = (v) => {
    const ids = [v.voice_id, String(v.voice_id).replace(/^[a-z]+_/, ''), v.tts_voice_name].filter(Boolean);
    const out = new Set();
    for (const id of ids) for (const l of (cast.get(id) || [])) out.add(l);
    return [...out];
  };

  // One task = one (voice, language) render. Single-language voices make one
  // task; a multilingual voice makes one per language it is cast in.
  const tasks = [];
  const noLang = [], noSentence = [];
  for (const v of voices) {
    const primary = primaryLanguage(v);
    let langs = primary && bank[primary] ? [primary] : [];
    if (!langs.length) {
      const fromCast = castLangsFor(v).filter((l) => bank[l]);
      if (fromCast.length) langs = fromCast;
    }
    if (!langs.length) { (primary ? noSentence : noLang).push(v); continue; }
    for (const lang of langs) tasks.push({ voice: v, lang });
  }

  let queue = tasks;
  if (probe) {
    // Three to five voices across at least two providers, eyeballed before any
    // bulk spend. Tom's commission: "a human-checked sample before any bulk".
    const pick = [];
    for (const p of ['azure', 'cartesia', 'elevenlabs', 'xai']) {
      const cands = tasks.filter((t) => providerOf(t.voice) === p);
      pick.push(...cands.slice(0, p === 'azure' ? 2 : 1));
    }
    queue = pick.filter(Boolean).slice(0, 5);
  }

  const outDir = path.join(SCRATCH, 'pace-samples');
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`${voices.length} candidate voices · ${langs.size} languages · ${Object.keys(bank).length} sentences · ${queue.length} renders`);
  if (noLang.length) console.log(`  ${noLang.length} voice(s) with no resolvable language — skipped, listed in the report`);
  if (noSentence.length) console.log(`  ${noSentence.length} voice(s) in a language with no usable sentence — skipped, listed in the report`);

  const failures = [];
  let chars = 0;
  const measured = await pool(queue, CONCURRENCY, async (t) => {
    const v = t.voice, lang = t.lang;
    const text = bank[lang].text;
    const file = path.join(outDir, `${String(v.voice_id).replace(/[^\w.-]/g, '_')}__${lang}.mp3`);
    try {
      const { audioBuffer } = await renderOne(v, text, lang);
      fs.writeFileSync(file, audioBuffer);
      const seconds = durationSeconds(file);
      chars += text.length;
      return {
        voice_id: v.voice_id, provider: providerOf(v), language: lang,
        chars: text.length, seconds: Math.round(seconds * 1000) / 1000,
        cps: Math.round((text.length / seconds) * 1000) / 1000,
        bytes: audioBuffer.length, file,
      };
    } catch (e) {
      failures.push({ voice_id: v.voice_id, provider: providerOf(v), language: lang, error: String(e.message).slice(0, 200) });
      return null;
    }
  });

  const rows = measured.filter(Boolean);

  // ── REFERENCE PACE PER LANGUAGE ───────────────────────────────────────────
  // The median DURATION of the same sentence across that language's measured
  // voices. Not persisted: it is derivable from the voices themselves, and a
  // second copy is a second thing to keep in step. The API recomputes it.
  const byLang = {};
  for (const r of rows) (byLang[r.language] = byLang[r.language] || []).push(r);
  const reference = {};
  for (const [lang, list] of Object.entries(byLang)) {
    const s = list.map((r) => r.seconds).sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    reference[lang] = {
      seconds: s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2,
      voices: s.length,
      sentence: bank[lang].text,
      sentence_source: bank[lang].source,
      sentence_tier: bank[lang].tier,
    };
  }

  const perVoice = new Map();
  for (const r of rows) {
    const ref = reference[r.language];
    // A language with ONE measured voice has no reference: its ratio would be
    // 1.000 by construction and would claim we know something we do not.
    if (!ref || ref.voices < 2) continue;
    const ratio = ref.seconds / r.seconds;
    if (!perVoice.has(r.voice_id)) perVoice.set(r.voice_id, []);
    perVoice.get(r.voice_id).push({ ratio, samples: 1, ...r });
  }

  const updates = [];
  for (const [voiceId, list] of perVoice) {
    const combined = combineMeasurements(list);      // median across languages
    if (!combined) continue;
    const chosen = list.reduce((best, r) =>
      Math.abs(r.ratio - combined.ratio) < Math.abs(best.ratio - combined.ratio) ? r : best, list[0]);
    updates.push({
      voice_id: voiceId,
      natural_pace_ratio: combined.ratio,
      natural_pace_cps: chosen.cps,
      // One controlled render per language: the sample count is the number of
      // languages behind the figure, and it is honestly small.
      natural_pace_samples: list.length,
      natural_pace_measured_at: new Date().toISOString(),
      natural_pace_method: METHOD,
      _lang: list.length > 1 ? `${chosen.language}+${list.length - 1}` : chosen.language,
      _seconds: chosen.seconds, _provider: chosen.provider,
    });
  }
  updates.sort((a, b) => b.natural_pace_ratio - a.natural_pace_ratio);

  const report = {
    method: METHOD, generated_at: new Date().toISOString(),
    probe, applied: apply,
    characters_rendered: chars,
    reference, measurements: rows, updates, failures,
    skipped_no_language: noLang.map((v) => v.voice_id),
    skipped_no_sentence: noSentence.map((v) => ({ voice_id: v.voice_id, language: primaryLanguage(v) })),
    renders: queue.length,
    sample_dir: outDir,
  };
  const reportFile = path.join(SCRATCH, probe ? 'provider-pace-probe.json' : 'provider-pace.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 1));

  // THE PER-LANGUAGE REFERENCE, committed to the repo rather than to a table.
  // The ratio on a voice is derivable back to a reference pace (ref_cps =
  // cps / ratio), but the SENTENCE is not derivable from anything — and without
  // the sentence the measurement is neither reproducible nor explicable to a
  // human looking at the Voice Lab. It is a small, stable, human-readable
  // artifact of a measurement, so it lives in git beside the tool that made it
  // and is read by services/voicelab/router.cjs. A new table would need DDL to
  // say the same thing less legibly.
  if (!probe) {
    const refFile = path.join(__dirname, 'provider-pace-reference.json');
    const langs = {};
    for (const [lang, r] of Object.entries(reference)) {
      langs[lang] = {
        sentence: r.sentence,
        sentence_source: r.sentence_source,
        sentence_tier: r.sentence_tier,
        reference_seconds: Math.round(r.seconds * 1000) / 1000,
        reference_cps: Math.round((bank[lang].text.length / r.seconds) * 1000) / 1000,
        chars: bank[lang].text.length,
        voices: r.voices,
      };
    }
    fs.writeFileSync(refFile, JSON.stringify({
      method: METHOD,
      measured_at: report.generated_at,
      note: 'One identical sentence per language, rendered fresh from each provider API at 1.0x and timed with ffprobe. A voice ratio is reference_seconds / that voice\'s seconds: above 1.0 = brisker than the reference.',
      languages: langs,
    }, null, 1) + '\n');
    console.log(`reference: ${refFile}`);
  }

  console.log(`\nratio  secs   lang  provider     voice_id`);
  for (const u of updates) {
    console.log(`${u.natural_pace_ratio.toFixed(3)}  ${u._seconds.toFixed(2)}  ${String(u._lang).padEnd(7)} ${u._provider.padEnd(11)}  ${u.voice_id}`);
  }
  console.log(`\n${rows.length} rendered · ${updates.length} with a language reference · ${failures.length} failed · ${chars} characters`);
  console.log(`samples: ${outDir}\nreport:  ${reportFile}`);
  for (const f of failures.slice(0, 20)) console.log(`  FAIL ${f.voice_id} (${f.provider}/${f.language}): ${f.error}`);

  if (!apply) { console.log('\nDRY RUN — nothing written. Re-run with --apply.'); return; }

  let written = 0, missing = 0;
  for (const u of updates) {
    const { _lang, _seconds, _provider, ...row } = u;
    const { data, error } = await db.from('voices').update(row).eq('voice_id', u.voice_id).select('voice_id');
    if (error) { console.error(`  ${u.voice_id}: ${error.message}`); continue; }
    if (!data || !data.length) { missing++; continue; }
    written++;
  }
  console.log(`\nWrote ${written} voices (${missing} had no row). natural_pace_nudge untouched, by construction.`);
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
