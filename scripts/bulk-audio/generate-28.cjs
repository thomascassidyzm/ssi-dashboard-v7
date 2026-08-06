#!/usr/bin/env node

/**
 * Generate All Encouragements for 28 Selected Languages
 *
 * Uses voice-selections.json to pick one voice per language.
 * Generates all 98 encouragements (48 ordered + 50 pooled) per language.
 * Runs up to 10 concurrent TTS requests for speed.
 * Supports --plan (dry run) and --execute modes.
 * Resumes from where it left off if interrupted.
 *
 * Usage:
 *   node generate-28.cjs --plan              # Show plan with estimates
 *   node generate-28.cjs --execute           # Generate everything (concurrency=10)
 *   node generate-28.cjs --execute --lang ara # Generate one language only
 *   node generate-28.cjs --execute --resume  # Resume from last progress
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DATA_DIR = path.join(__dirname, 'data');
const OUT_BASE = path.join(__dirname, 'generated/encouragements/production');
const PROGRESS_FILE = path.join(OUT_BASE, '_progress.json');
const CONCURRENCY = 10;

const LANG_CODE_MAP = {
  afr: 'af', ara: 'ar', asm: 'as', aze: 'az', bel: 'be', ben: 'bn',
  bos: 'bs', bul: 'bg', cat: 'ca', ceb: 'ceb', ces: 'cs', cmn: 'zh',
  cym: 'cy', dan: 'da', deu: 'de', ell: 'el', est: 'et',
  fas: 'fa', fil: 'fil', fin: 'fi', fra: 'fr', gle: 'ga', glg: 'gl',
  guj: 'gu', hau: 'ha', heb: 'he', hin: 'hi', hrv: 'hr', hun: 'hu',
  hye: 'hy', ind: 'id', isl: 'is', ita: 'it', jav: 'jv', jpn: 'ja',
  kan: 'kn', kat: 'ka', kaz: 'kk', kir: 'ky', kor: 'ko', lav: 'lv',
  lin: 'ln', lit: 'lt', ltz: 'lb', mal: 'ml', mar: 'mr', mkd: 'mk',
  msa: 'ms', nep: 'ne', nld: 'nl', nor: 'nb', nya: 'ny', pan: 'pa',
  pol: 'pl', por: 'pt', pus: 'ps', ron: 'ro', rus: 'ru', slk: 'sk',
  slv: 'sl', snd: 'sd', som: 'so', spa: 'es', srp: 'sr', swa: 'sw',
  swe: 'sv', tam: 'ta', tel: 'te', tha: 'th', tur: 'tr', ukr: 'uk',
  urd: 'ur', vie: 'vi'
};

let _fetch = null;
async function getFetch() {
  if (!_fetch) _fetch = (await import('node-fetch')).default;
  return _fetch;
}

// Retry with exponential backoff
async function generateWithRetry(voiceId, text, langCode, maxRetries = 3) {
  const fetch = await getFetch();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const body = {
      text,
      model_id: 'eleven_v3',
      voice_settings: { voice_stability: 0.4 }
    };
    if (langCode) body.language_code = langCode;

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify(body)
      });

      if (response.status === 429) {
        const waitMs = Math.min(2000 * Math.pow(2, attempt), 30000);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        return { success: false, error: errorText, status: response.status };
      }

      const buffer = await response.buffer();
      return { success: true, buffer };
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
        continue;
      }
      return { success: false, error: err.message, status: 0 };
    }
  }
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return { completed: {} };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function getEncouragementKey(lang, enc) {
  if (enc.type === 'ordered') return `${lang}:ordered:${enc.position}`;
  return `${lang}:pooled:${enc.id}`;
}

// Concurrency pool: run up to N tasks at once
async function runPool(tasks, concurrency) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  const workers = [];
  for (let w = 0; w < Math.min(concurrency, tasks.length); w++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const isPlan = args.includes('--plan');
  const isExecute = args.includes('--execute');
  const isResume = args.includes('--resume');
  const langFilter = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null;

  if (!isPlan && !isExecute) {
    console.log('Usage:');
    console.log('  node generate-28.cjs --plan              # Show plan with estimates');
    console.log('  node generate-28.cjs --execute           # Generate everything');
    console.log('  node generate-28.cjs --execute --lang ara # Generate one language');
    console.log('  node generate-28.cjs --execute --resume  # Resume interrupted run');
    process.exit(0);
  }

  if (isExecute && !ELEVENLABS_API_KEY) {
    console.error('Missing ELEVENLABS_API_KEY in .env');
    process.exit(1);
  }

  // Load configs
  const voices = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'voices.json'), 'utf8'));
  const selections = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'voice-selections.json'), 'utf8'));
  const targetLangs = langFilter
    ? [langFilter]
    : Object.keys(selections).filter(k => !k.startsWith('_'));

  // Build generation plan
  const plan = [];
  let totalChars = 0;

  for (const lang of targetLangs) {
    const sel = selections[lang];
    if (!sel) { console.warn(`WARNING: ${lang} not in voice-selections.json, skipping`); continue; }

    const voiceConfig = voices.voices[lang];
    if (!voiceConfig) { console.warn(`WARNING: ${lang} not in voices.json, skipping`); continue; }

    const voice = voiceConfig.voices[sel.index];
    if (!voice) { console.warn(`WARNING: ${lang} voice index ${sel.index} out of range, skipping`); continue; }

    const transPath = path.join(DATA_DIR, 'translations/encouragements', `${lang}.json`);
    if (!fs.existsSync(transPath)) { console.warn(`WARNING: ${lang} no translation file, skipping`); continue; }

    const trans = JSON.parse(fs.readFileSync(transPath, 'utf8'));
    const ordered = (trans.orderedEncouragements || []).map(e => ({ ...e, type: 'ordered' }));
    const pooled = (trans.pooledEncouragements || []).map(e => ({ ...e, type: 'pooled' }));
    const allEnc = [...ordered, ...pooled];

    let langChars = 0;
    for (const e of allEnc) langChars += e.text.length;
    totalChars += langChars;

    plan.push({
      lang, display_name: voiceConfig.display_name,
      voice_name: voice.name, voice_id: voice.voice_id,
      gender: voice.gender, lang_code: LANG_CODE_MAP[lang] || null,
      encouragements: allEnc,
      ordered_count: ordered.length, pooled_count: pooled.length,
      total_count: allEnc.length, chars: langChars
    });
  }

  const totalSamples = plan.reduce((n, p) => n + p.total_count, 0);

  // --- PLAN MODE ---
  if (isPlan) {
    console.log(`\n${'='.repeat(65)}`);
    console.log('  GENERATION PLAN — Encouragement Audio');
    console.log(`${'='.repeat(65)}\n`);

    for (const p of plan) {
      console.log(`  ${p.lang.toUpperCase()} (${p.display_name}): ${p.voice_name} (${p.gender}) — ${p.total_count} items, ${(p.chars/1000).toFixed(1)}k chars`);
    }

    const estMinutes = Math.ceil(totalSamples / CONCURRENCY * 1.5 / 60);
    console.log(`\n${'-'.repeat(65)}`);
    console.log(`  Languages:       ${plan.length}`);
    console.log(`  Total samples:   ${totalSamples}`);
    console.log(`  Total chars:     ${(totalChars/1000).toFixed(0)}k`);
    console.log(`  Concurrency:     ${CONCURRENCY}`);
    console.log(`  Est. time:       ~${estMinutes} minutes`);
    console.log(`  Output dir:      ${OUT_BASE}`);
    console.log(`${'-'.repeat(65)}`);

    const progress = loadProgress();
    const alreadyDone = Object.keys(progress.completed).length;
    if (alreadyDone > 0) {
      const remaining = totalSamples - alreadyDone;
      const resumeMin = Math.ceil(remaining / CONCURRENCY * 1.5 / 60);
      console.log(`\n  Resume state: ${alreadyDone} done, ${remaining} remaining (~${resumeMin} min)`);
    }

    console.log(`\n  Run with --execute to generate.`);
    console.log(`  Run with --execute --resume to continue from last progress.\n`);
    return;
  }

  // --- EXECUTE MODE ---
  fs.mkdirSync(OUT_BASE, { recursive: true });

  const progress = isResume ? loadProgress() : { completed: {} };
  const alreadyDone = Object.keys(progress.completed).length;

  // Build flat list of all jobs
  const allJobs = [];
  for (const p of plan) {
    const langDir = path.join(OUT_BASE, p.lang);
    fs.mkdirSync(langDir, { recursive: true });

    for (const enc of p.encouragements) {
      const key = getEncouragementKey(p.lang, enc);
      if (progress.completed[key]) continue; // skip done

      allJobs.push({ ...enc, lang: p.lang, voice_id: p.voice_id, lang_code: p.lang_code, langDir, key });
    }
  }

  const totalToDo = allJobs.length;
  if (isResume && alreadyDone > 0) {
    console.log(`\nResuming: ${alreadyDone} done, ${totalToDo} remaining\n`);
  }

  console.log(`${'='.repeat(65)}`);
  console.log(`  GENERATING — ${plan.length} Languages, ${totalToDo} samples, concurrency=${CONCURRENCY}`);
  console.log(`${'='.repeat(65)}\n`);

  let completed = 0;
  let success = 0;
  const failures = [];
  const startTime = Date.now();

  // Per-language manifests (loaded or created)
  const manifests = {};
  for (const p of plan) {
    const manifestPath = path.join(OUT_BASE, p.lang, '_manifest.json');
    manifests[p.lang] = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      : {
          language: p.lang, display_name: p.display_name,
          voice: { voice_id: p.voice_id, name: p.voice_name, gender: p.gender },
          settings: { voice_stability: 0.4, model: 'eleven_v3', language_code: p.lang_code },
          samples: []
        };
  }

  // Progress save batching (save every 10 completions to avoid IO thrash)
  let unsavedCount = 0;
  function flushProgress() {
    if (unsavedCount > 0) {
      saveProgress(progress);
      // Save all manifests
      for (const p of plan) {
        const manifestPath = path.join(OUT_BASE, p.lang, '_manifest.json');
        manifests[p.lang].generated_at = new Date().toISOString();
        fs.writeFileSync(manifestPath, JSON.stringify(manifests[p.lang], null, 2));
      }
      unsavedCount = 0;
    }
  }

  // Build task functions for the pool
  const tasks = allJobs.map(job => async () => {
    const result = await generateWithRetry(job.voice_id, job.text, job.lang_code);

    completed++;
    const pct = ((completed / totalToDo) * 100).toFixed(0);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const typeLabel = job.type === 'ordered' ? `ord:${job.position}` : 'pool';

    if (result.success) {
      const uuid = uuidv4().toUpperCase();
      const filename = `${uuid}.mp3`;
      fs.writeFileSync(path.join(job.langDir, filename), result.buffer);

      const kb = (result.buffer.length / 1024).toFixed(1);
      console.log(`[${completed}/${totalToDo} ${pct}% ${elapsed}s] ${job.lang} ${typeLabel} OK (${kb}kb)`);
      success++;

      manifests[job.lang].samples.push({
        uuid, canonical_id: job.id || null, type: job.type,
        position: job.position || null, text: job.text,
        file: filename, size_kb: parseFloat(kb)
      });

      progress.completed[job.key] = { uuid, file: filename };
      unsavedCount++;
      if (unsavedCount >= 10) flushProgress();
    } else {
      const errShort = (result.error || '').substring(0, 60);
      console.log(`[${completed}/${totalToDo} ${pct}% ${elapsed}s] ${job.lang} ${typeLabel} FAILED (${result.status}): ${errShort}`);
      failures.push({ lang: job.lang, type: job.type, position: job.position, error: result.error });
    }
  });

  // Run with concurrency pool
  await runPool(tasks, CONCURRENCY);

  // Final flush
  flushProgress();

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log(`\n${'='.repeat(65)}`);
  console.log('  GENERATION COMPLETE');
  console.log(`${'='.repeat(65)}`);
  console.log(`  Languages:     ${plan.length}`);
  console.log(`  Generated:     ${success}`);
  console.log(`  Skipped:       ${alreadyDone} (already done)`);
  console.log(`  Failed:        ${failures.length}`);
  console.log(`  Time:          ${elapsed} minutes`);
  console.log(`  Output:        ${OUT_BASE}`);

  if (failures.length > 0) {
    console.log(`\n  Failures:`);
    for (const f of failures) {
      console.log(`    - ${f.lang} ${f.type}:${f.position || '?'}: ${(f.error || '').substring(0, 80)}`);
    }
    console.log(`\n  Re-run with --execute --resume to retry failures.`);
  }

  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
