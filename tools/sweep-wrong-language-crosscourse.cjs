#!/usr/bin/env node
/**
 * sweep-wrong-language-crosscourse.cjs — DETECTION-ONLY cross-course sweep for
 * pod clips whose recording is in the wrong language (English phonology baked
 * into a target-language take — the ita "come stai" defect class).
 *
 * Mandate: CoS ruling 2026-07-24 under Tom's standing "completely fix the TTS
 * side of things for all courses" (2026-07-11). HARD LIMIT: no TTS
 * regeneration in this pass — output is a per-course flag ledger + aggregate
 * report; any re-render list goes back for approval before generation
 * (tools/rescue-wrong-language-clips.cjs is the approved-plan apply tool).
 *
 * Method (mirrors the ita_for_eng 2026-07-23 sweep, see
 * tools/audio-sweeps/wrong-language-sweep-ita_for_eng-2026-07-23.md):
 *   - Universe: per course, every target-side pod clip — target_audio_id +
 *     sentence_audio_ids from listening_pod_sentences (same set as ita's 377).
 *   - Detect: whisper-cli (ggml-small) auto language-detect on the mastered
 *     mp3, downloaded direct from S3 (public bucket).
 *   - Verify flags cheaply (whisper misdetects short clips constantly):
 *     4x byte-concat loop re-detect (the strongest cheap signal), forced
 *     -l <target> and -l en decodes for the transcript record, and a
 *     sibling-take check (slices cut from the same take can't switch
 *     phonology mid-sentence).
 *   - Prioritise English-homograph targets (the ita finding: the one real
 *     defect was a cross-language homograph): clips whose target text
 *     contains an English-dictionary word run first, and courses with the
 *     highest homograph share run first.
 *
 * Resume-safe: one ledger JSON per course in tools/audio-sweeps/crosscourse/;
 * already-scored clip ids are skipped on re-run. Kill and relaunch freely.
 *
 * Polite: whisper runs under `nice -n 15` with a small inter-clip sleep —
 * safe to run on a machine someone is using interactively.
 *
 *   node tools/sweep-wrong-language-crosscourse.cjs                # full run
 *   node tools/sweep-wrong-language-crosscourse.cjs --courses a,b  # subset
 *   node tools/sweep-wrong-language-crosscourse.cjs --limit 40     # per-course cap (pilot)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const WHISPER = process.env.WHISPER || '/opt/homebrew/bin/whisper-cli'
const WHISPER_MODEL = process.env.WHISPER_MODEL
  || path.join(os.homedir(), 'SSi', 'whisper-models', 'ggml-small.bin')
// Second-opinion model for FLAGS only (small is near-blind on cy/ga-class
// languages). Optional — the rung engages per-flag as soon as the file exists.
const MEDIUM_MODEL = process.env.WHISPER_MEDIUM
  || path.join(os.homedir(), 'SSi', 'whisper-models', 'ggml-medium.bin')
const S3_BASE = 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/'
const OUT_DIR = path.join(__dirname, 'audio-sweeps', 'crosscourse')
const GATE_DATE = '2026-07-10' // phonology gate ship date — clips after this were render-gated

const coursesIdx = process.argv.indexOf('--courses')
const ONLY = coursesIdx !== -1 ? new Set(process.argv[coursesIdx + 1].split(',')) : null
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx !== -1 ? Number(process.argv[limitIdx + 1]) : Infinity
// ita_for_eng fully swept 2026-07-23 (see companion log); zzz_test is a fixture.
const SKIP = new Set(['ita_for_eng', 'zzz_test_for_eng'])

// whisper reports 2-letter codes (superset of the rescue tool's map).
const ISO3TO1 = {
  ita: 'it', spa: 'es', fra: 'fr', deu: 'de', por: 'pt', nld: 'nl', hrv: 'hr',
  gle: 'ga', isl: 'is', cym: 'cy', eng: 'en', jpn: 'ja', kor: 'ko', zho: 'zh',
  swe: 'sv', ron: 'ro', dan: 'da', eus: 'eu', lav: 'lv', cat: 'ca', pol: 'pl',
  swa: 'sw', lit: 'lt', nor: 'no', tur: 'tr', heb: 'he', ukr: 'uk', bul: 'bg',
  est: 'et', hin: 'hi', ara: 'ar', ell: 'el', nep: 'ne', hye: 'hy', fas: 'fa',
  tha: 'th', pan: 'pa', guj: 'gu', sin: 'si', urd: 'ur', ben: 'bn', tam: 'ta',
}
const langBase = (token) => ISO3TO1[token.split('_')[0]] || null

// English lexicon for homograph flagging (macOS words file; lowercase, ≥2 chars).
const ENGLISH = (() => {
  try {
    const words = fs.readFileSync('/usr/share/dict/words', 'utf8').split('\n')
    return new Set(words.filter((w) => w.length >= 2 && /^[a-z]+$/.test(w)))
  } catch { return new Set() }
})()
const hasEnglishHomograph = (text) => {
  for (const tok of (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z]+/)) {
    if (tok.length >= 2 && ENGLISH.has(tok)) return true
  }
  return false
}

function runWhisper(args, model = WHISPER_MODEL) {
  return new Promise((res) => {
    execFile('/usr/bin/nice', ['-n', '15', WHISPER, '-m', model, '-t', '4', ...args],
      { encoding: 'utf8', maxBuffer: 1 << 22 }, (e, stdout, stderr) => {
        const m = /auto-detected language: (\w+)(?:\s*\(p\s*=\s*([\d.]+)\))?/.exec(stderr || '')
        res({ lang: m ? m[1] : null, p: m && m[2] ? Number(m[2]) : null, text: (stdout || '').trim() })
      })
  })
}
const detect = (mp3, model) => runWhisper(['-l', 'auto', '-nt', '-f', mp3], model)
const forced = (mp3, lang) => runWhisper(['-l', lang, '-nt', '-f', mp3])

async function download(url, dest) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`GET → ${r.status}`)
      fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
      return true
    } catch (e) {
      if (attempt === 2) { console.log(`  download failed: ${url.slice(-50)} (${e.message})`); return false }
      await sleep(1000 * (attempt + 1))
    }
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// --- sentence-slot → text walk, copied from rescue-wrong-language-clips.cjs ---
const SENTENCE_PUNCT = /[.!?…。！？؟]/
const SENTENCE_SPLIT = /(?<=[。！？])\s*(?=\S)|(?<=[.!?…؟])\s+(?=\S)/
function atomGroups(targetText, atoms) {
  const text = targetText || ''
  const lower = text.toLowerCase()
  const groups = [[]]
  let cursor = 0
  for (let i = 0; i < atoms.length; i++) {
    const idx = lower.indexOf(atoms[i].target_surface.toLowerCase(), cursor)
    if (i > 0 && idx !== -1 && SENTENCE_PUNCT.test(text.slice(cursor, idx))) groups.push([])
    groups[groups.length - 1].push(atoms[i])
    if (idx !== -1) cursor = idx + atoms[i].target_surface.length
  }
  return groups.filter((g) => g.length)
}
function sentenceTextsFromGroups(turnText, groups) {
  const lower = turnText.toLowerCase()
  const spans = []
  let cursor = 0
  for (const g of groups) {
    const first = lower.indexOf(g[0].target_surface.toLowerCase(), cursor)
    if (first === -1) return null
    let end = first
    for (const a of g) {
      const idx = lower.indexOf(a.target_surface.toLowerCase(), end)
      if (idx === -1) return null
      end = idx + a.target_surface.length
    }
    const tail = turnText.slice(end)
    const stop = tail.search(/(?<=[.!?…。！？؟])/)
    spans.push({ start: first, end: stop === -1 ? turnText.length : end + stop })
    cursor = spans[spans.length - 1].end
  }
  return spans.map((s) => turnText.slice(s.start, s.end).trim()).filter(Boolean)
}
function sentenceTexts(row) {
  const atoms = (row.atom_map_fine || []).filter((a) => a.kind !== 'note' && a.target_surface)
  return atoms.length
    ? sentenceTextsFromGroups(row.target_text || '', atomGroups(row.target_text, atoms))
    : (row.target_text || '').split(SENTENCE_SPLIT).map((x) => x.trim()).filter(Boolean)
}
// -----------------------------------------------------------------------------

async function fetchAllPodRows() {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('listening_pod_sentences')
      .select('id, pod_id, global_order, target_text, atom_map_fine, target_audio_id, sentence_audio_ids')
      .order('pod_id').order('global_order')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows
}

async function fetchAudioMeta(ids) {
  const meta = {}
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await supabase
      .from('course_audio').select('id, s3_key, created_at, duration_ms')
      .in('id', ids.slice(i, i + 150))
    if (error) throw new Error(error.message)
    for (const r of data || []) meta[r.id] = r
  }
  return meta
}

function buildJobs(rows) {
  const jobs = []
  const seen = new Set()
  for (const r of rows) {
    const sids = r.sentence_audio_ids || []
    const texts = sids.length ? sentenceTexts(r) : null
    if (r.target_audio_id && !seen.has(r.target_audio_id)) {
      seen.add(r.target_audio_id)
      jobs.push({ id: r.target_audio_id, rowId: r.id, slot: 'take', text: r.target_text || '' })
    }
    sids.forEach((id, k) => {
      if (!id || seen.has(id)) return
      seen.add(id)
      const text = texts && texts.length === sids.length ? texts[k] : (r.target_text || '')
      jobs.push({ id, rowId: r.id, slot: k, text })
    })
  }
  return jobs
}

async function sweepCourse(course, rows, tmpDir) {
  const targetToken = course.split('_for_')[0]
  const knownToken = course.split('_for_')[1] || 'eng'
  const target = langBase(targetToken)
  const known = langBase(knownToken) || 'en'
  const ledgerPath = path.join(OUT_DIR, `${course}.json`)
  const ledger = fs.existsSync(ledgerPath)
    ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8'))
    : { course, target, known, startedAt: new Date().toISOString(), clips: {}, done: false }
  if (!target) {
    ledger.done = true
    ledger.skipped = `unmappable target language token "${targetToken}"`
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 1))
    console.log(`${course}: SKIPPED (${ledger.skipped})`)
    return ledger
  }

  let jobs = buildJobs(rows)
  const meta = await fetchAudioMeta(jobs.map((j) => j.id))
  for (const j of jobs) {
    j.homograph = hasEnglishHomograph(j.text)
    j.s3_key = meta[j.id]?.s3_key || null
    j.preGate = (meta[j.id]?.created_at || '') < GATE_DATE
    j.durationMs = meta[j.id]?.duration_ms ?? null
  }
  jobs.sort((a, b) => Number(b.homograph) - Number(a.homograph))
  if (Number.isFinite(LIMIT)) jobs = jobs.slice(0, LIMIT)

  const pending = jobs.filter((j) => !ledger.clips[j.id])
  console.log(`${course}: ${jobs.length} clips (${jobs.filter((j) => j.homograph).length} homograph-bearing), ${pending.length} to score, target=${target}`)

  // Detector-blindness circuit breaker: whisper (small AND medium) is
  // near-blind on some targets (empirically: a clean Irish clip → en/en/en
  // p=0.80). When ≥75% of the first 40 scored clips flag, the instrument
  // can't hear this language — stop paying for the per-flag ladder, record
  // auto-detect only, and report the course as needing a different method.
  let scored = 0, flagged = 0
  let n = 0
  for (const j of pending) {
    const rec = { text: j.text, rowId: j.rowId, slot: j.slot, homograph: j.homograph, preGate: j.preGate, durationMs: j.durationMs }
    if (!j.s3_key) {
      rec.verdict = 'no-audio-row'
    } else {
      const mp3 = path.join(tmpDir, 'clip.mp3')
      if (!(await download(S3_BASE + j.s3_key, mp3))) { rec.verdict = 'download-failed' } else {
        const d = await detect(mp3)
        rec.detected = d.lang; rec.p = d.p; rec.transcript = d.text
        if (d.lang === target) {
          rec.verdict = 'ok'
        } else if (ledger.detectorBlind) {
          rec.verdict = 'undetectable-language'
        } else {
          // cheap verification ladder (see header)
          const buf = fs.readFileSync(mp3)
          const looped = path.join(tmpDir, 'loop.mp3')
          fs.writeFileSync(looped, Buffer.concat([buf, buf, buf, buf]))
          const dl = await detect(looped)
          rec.loopDetected = dl.lang; rec.loopP = dl.p
          const ft = await forced(mp3, target)
          rec.forcedTarget = ft.text
          const fe = target !== 'en' ? await forced(mp3, 'en') : null
          if (fe) rec.forcedEn = fe.text
          // Medium-model second opinion (flags only — small is near-blind on
          // some targets). Engages as soon as the model file exists on disk.
          let mediumLang = null
          if (fs.existsSync(MEDIUM_MODEL)) {
            const dm = await detect(mp3, MEDIUM_MODEL)
            rec.mediumDetected = dm.lang; rec.mediumP = dm.p; rec.mediumTranscript = dm.text
            mediumLang = dm.lang
          }
          rec.verdict = dl.lang === target ? 'fp-loop'
            : mediumLang === target ? 'fp-medium'
            : (dl.lang === 'en' || dl.lang === known) ? 'flag-suspect'
            : 'flag-other'
          fs.rmSync(looped, { force: true })
        }
        fs.rmSync(mp3, { force: true })
      }
    }
    ledger.clips[j.id] = rec
    scored++
    if (rec.verdict?.startsWith('flag') || rec.verdict === 'undetectable-language') flagged++
    if (!ledger.detectorBlind && scored === 40 && flagged / scored >= 0.75) {
      ledger.detectorBlind = true
      console.log(`  ${course}: DETECTOR-BLIND (${flagged}/${scored} early flags) — auto-detect only from here; course needs a different verification method`)
    }
    n++
    if (n % 20 === 0) {
      fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 1))
      console.log(`  ${course}: ${n}/${pending.length} (${Object.values(ledger.clips).filter((c) => c.verdict?.startsWith('flag')).length} open flags)`)
    }
    await sleep(60) // politeness gap
  }

  // Sibling-take pass — CALIBRATED AGAINST THE REAL DEFECT: the come-stai
  // take switched phonology mid-sentence exactly ON the homograph word while
  // its "Buongiorno" sibling decoded clean Italian. So "a take can't switch
  // phonology mid-sentence" is FALSE for homograph-bearing clips — sibling
  // evidence only clears flags whose text carries NO English homograph.
  for (const [id, rec] of Object.entries(ledger.clips)) {
    if (!rec.verdict?.startsWith('flag') || rec.homograph) continue
    const sibs = Object.entries(ledger.clips)
      .filter(([sid, s]) => sid !== id && s.rowId === rec.rowId && (s.verdict === 'ok' || s.verdict === 'fp-loop'))
    if (sibs.length && rec.slot !== 'take') rec.verdict = `fp-sibling(${rec.verdict})`
  }

  ledger.done = pending.length === 0 || Object.keys(ledger.clips).length >= jobs.length
  ledger.finishedAt = new Date().toISOString()
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 1))

  const tally = {}
  for (const rec of Object.values(ledger.clips)) tally[rec.verdict] = (tally[rec.verdict] || 0) + 1
  console.log(`${course}: DONE — ${JSON.stringify(tally)}`)
  return ledger
}

;(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  if (!fs.existsSync(WHISPER) || !fs.existsSync(WHISPER_MODEL)) {
    console.error('whisper-cli or model missing — cannot sweep'); process.exit(1)
  }
  if (!ENGLISH.size) console.log('WARN: /usr/share/dict/words unavailable — homograph prioritisation off')

  console.log('Fetching pod rows…')
  const all = await fetchAllPodRows()
  const byCourse = {}
  for (const r of all) {
    const c = r.pod_id.split(':')[0]
    ;(byCourse[c] ??= []).push(r)
  }
  let courses = Object.keys(byCourse).filter((c) => !SKIP.has(c))
  if (ONLY) courses = courses.filter((c) => ONLY.has(c))

  // Course order: highest homograph share first (real defects cluster there).
  // English-TARGET courses go last — an English voice reading English is the
  // least exposed to the cross-language-homograph class, and their "share" is
  // trivially ~100%.
  const share = {}
  for (const c of courses) {
    if (langBase(c.split('_for_')[0]) === 'en') { share[c] = -1; continue }
    const jobs = buildJobs(byCourse[c])
    share[c] = jobs.length ? jobs.filter((j) => hasEnglishHomograph(j.text)).length / jobs.length : 0
  }
  courses.sort((a, b) => share[b] - share[a])
  console.log(`${courses.length} courses queued (homograph-share order): ${courses.slice(0, 8).join(', ')}…`)

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sweep-wl-'))
  const summary = []
  for (const c of courses) {
    const done = path.join(OUT_DIR, `${c}.json`)
    if (fs.existsSync(done) && JSON.parse(fs.readFileSync(done, 'utf8')).done && !ONLY) {
      console.log(`${c}: already done — skipping`)
      continue
    }
    try {
      const ledger = await sweepCourse(c, byCourse[c], tmpDir)
      summary.push([c, ledger])
    } catch (e) {
      console.log(`${c}: ERROR ${e.message} — continuing`)
    }
  }
  fs.rmSync(tmpDir, { recursive: true, force: true })

  console.log('\n===== SWEEP SUMMARY =====')
  let flags = 0
  for (const [c, l] of summary) {
    const open = Object.entries(l.clips).filter(([, r]) => r.verdict?.startsWith('flag'))
    flags += open.length
    if (open.length) console.log(`${c}: ${open.length} open flags — ${open.slice(0, 5).map(([id, r]) => `${id.slice(0, 8)} "${r.text.slice(0, 30)}" → ${r.detected}`).join(' | ')}`)
  }
  console.log(`total open flags needing eyes: ${flags}`)
})()
