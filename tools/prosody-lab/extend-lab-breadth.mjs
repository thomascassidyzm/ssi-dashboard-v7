#!/usr/bin/env node
/**
 * extend-lab-breadth.mjs — language-breadth extension of the VAD Lab data,
 * runnable WITHOUT DATABASE_URL or S3 credentials.
 *
 * Founder ruling 2026-07-29: the listening tour and record-yourself tab need
 * real language breadth (Spanish / French / Italian / Chinese featured, plus
 * genuine variety). The canonical pipeline (sample-pairs.cjs → prosody.py)
 * needs pg + S3 + numpy; this tool reaches the SAME estate through the two
 * public read paths instead:
 *
 *   - course_audio rows  → Supabase REST (anon key from .env — reads only)
 *   - clip audio         → https://saysomethingin.app/api/audio/:id
 *
 * Features come from src/views/admin/vadProsody.js — the verified line-for-line
 * JS mirror of prosody.py (extractor prosody-lab-poc-2) — decoded via ffmpeg,
 * so scores stay comparable with the baked study. The 2026-07-28 study's
 * anchors (dimension_discrimination, combined_score median_scale, AUC tables)
 * are deliberately NOT recomputed: they are the study's finding; new pairs are
 * scored against that same fixed scale, exactly as the record-yourself flow
 * already does.
 *
 * Output: public/vad-lab/ part-files rewritten with the merged pair set, plus
 * temp/prosody-lab/breadth-summary.json for the run report.
 *
 * Usage: node tools/prosody-lab/extend-lab-breadth.mjs [--dry-run]
 * Resume-safe: clip downloads and features are cached under temp/prosody-lab/.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  extractFeatures,
  dtwDistance,
  SR,
} from '../../src/views/admin/vadProsody.js'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = path.join(REPO, 'temp', 'prosody-lab')
const CLIP_DIR = path.join(OUT_DIR, 'clips')
const FEAT_DIR = path.join(OUT_DIR, 'features-js')
const LAB_DIR = path.join(REPO, 'public', 'vad-lab')
const AUDIO_PROXY = 'https://saysomethingin.app/api/audio'
const PART_BYTES = 30 * 1024 // must match build-lab-data.cjs (founder-network upload ceiling)
const DRY = process.argv.includes('--dry-run')

// mirrors prosody.py constants (extractor prosody-lab-poc-2)
const HOP = 160
const RMS_WIN = 400
const SILENCE_DB = -40
const PAUSE_MIN_S = 0.15
const F0_WIN = 640

// Per-language sampling plan. course pins the query to an indexed, single
// course so REST statement timeouts don't bite; target1/target2 are the two
// model voices of every course, which is exactly the crossvoice condition.
const PLAN = [
  { lang: 'ita', course: 'ita_for_eng', crossvoice: 24, crossprovider: 12 },
  { lang: 'zho', course: 'zho_for_eng', crossvoice: 24, crossprovider: 12 },
  { lang: 'spa', course: 'spa_for_eng', crossvoice: 12, crossprovider: 0 },
  { lang: 'fra', course: 'fra_for_eng', crossvoice: 12, crossprovider: 0 },
  { lang: 'por', course: 'por_for_eng', crossvoice: 16, crossprovider: 0 },
  { lang: 'kor', course: 'kor_for_eng', crossvoice: 16, crossprovider: 0 },
  { lang: 'eus', course: 'eus_for_spa', crossvoice: 12, crossprovider: 0 },
]
const MAX_ROWS_PER_COURSE = 12000

function env() {
  const txt = fs.readFileSync(path.join(REPO, '.env'), 'utf8')
  const get = (k) => (txt.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim()
  const url = get('SUPABASE_URL')
  const key = get('SUPABASE_ANON_KEY') || get('SUPABASE_SERVICE_KEY')
  if (!url || !key) throw new Error('SUPABASE_URL / key missing from .env')
  return { url, key }
}
const { url: SB_URL, key: SB_KEY } = env()

async function rest(pathAndQuery, attempt = 0) {
  const res = await fetch(`${SB_URL}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  })
  const body = await res.json().catch(() => null)
  // 57014 = statement timeout — the estate's big languages hit it transiently
  if ((!res.ok || body?.code === '57014') && attempt < 5) {
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    return rest(pathAndQuery, attempt + 1)
  }
  if (!res.ok || body?.code) throw new Error(`REST ${pathAndQuery}: ${JSON.stringify(body).slice(0, 200)}`)
  return body
}

function provider(voiceId, origin) {
  if (origin === 'human') return 'human'
  if (/^azure_/.test(voiceId) || /^[a-z]{2,3}-[A-Z]{2}-.*Neural/.test(voiceId)) return 'azure'
  if (/^elevenlabs_/.test(voiceId)) return 'elevenlabs'
  if (/^xai_/.test(voiceId)) return 'xai'
  return 'other'
}

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex')

async function fetchCourseRows({ lang, course }) {
  const cols = 'id,language,text,text_stripped,voice_id,origin,role,s3_key,duration_ms,course_code'
  const rows = []
  let cursor = ''
  while (rows.length < MAX_ROWS_PER_COURSE) {
    const page = await rest(
      `course_audio?select=${cols}&course_code=eq.${course}&language=eq.${lang}` +
        `&origin=eq.tts&role=in.(target1,target2)&s3_key=like.*.mp3` +
        `&order=id.asc&limit=1000${cursor ? `&id=gt.${cursor}` : ''}`
    )
    rows.push(...page)
    if (page.length < 1000) break
    cursor = page[page.length - 1].id
  }
  return rows
}

function buildPairs(rows, plan, existingClipIds) {
  const groups = new Map() // text_stripped → rows
  for (const r of rows) {
    const t = (r.text_stripped || '').trim()
    if (t.length < 6 || t.length > 80) continue
    if (!groups.has(t)) groups.set(t, [])
    groups.get(t).push(r)
  }
  // deterministic order, same spirit as the pg sampler (ORDER BY md5)
  const keys = [...groups.keys()].sort((a, b) =>
    md5(plan.lang + '|' + a).localeCompare(md5(plan.lang + '|' + b))
  )
  const cv = []
  const cp = []
  for (const k of keys) {
    const g = groups.get(k)
    const azure = g.filter((r) => provider(r.voice_id, r.origin) === 'azure')
    const nonAzure = g.filter((r) => ['xai', 'other', 'elevenlabs'].includes(provider(r.voice_id, r.origin)))
    const pick = (list, keyFn) => {
      const seen = new Map()
      for (const r of list.slice().sort((a, b) => md5(a.id).localeCompare(md5(b.id))))
        if (!seen.has(keyFn(r))) seen.set(keyFn(r), r)
      return [...seen.values()]
    }
    const azVoices = pick(azure, (r) => r.voice_id)
    if (cv.length < plan.crossvoice && azVoices.length >= 2) {
      const [a, b] = azVoices
      if (a.s3_key !== b.s3_key && !(existingClipIds.has(a.id) && existingClipIds.has(b.id)))
        cv.push({ category: 'crossvoice', a, b })
    }
    if (cp.length < plan.crossprovider && azVoices.length >= 1 && nonAzure.length >= 1) {
      const a = azVoices[0]
      const b = pick(nonAzure, (r) => r.voice_id)[0]
      if (a.s3_key !== b.s3_key && !(existingClipIds.has(a.id) && existingClipIds.has(b.id)))
        cp.push({ category: 'crossprovider', a, b })
    }
    if (cv.length >= plan.crossvoice && cp.length >= plan.crossprovider) break
  }
  return [...cv, ...cp]
}

async function download(clip) {
  const dest = path.join(CLIP_DIR, `${clip.id}.mp3`)
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${AUDIO_PROXY}/${clip.id}`)
    if (res.ok) {
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
      return dest
    }
    if (attempt >= 3) throw new Error(`download ${clip.id}: HTTP ${res.status}`)
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
  }
}

function decode16kMono(file) {
  const p = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], {
    maxBuffer: 1 << 28,
  })
  if (p.status !== 0) throw new Error(`ffmpeg decode failed: ${p.stderr}`)
  const buf = p.stdout
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4))
}

// pause_count + syllable_rate — the two prosody.py fields the browser mirror
// doesn't emit (the record flow never needed them). Same framing and gates.
function extraStats(x, feat) {
  const nFrames = 1 + Math.max(0, Math.floor((x.length - RMS_WIN) / HOP))
  const rms = new Array(nFrames)
  let maxRms = 0
  for (let f = 0; f < nFrames; f++) {
    let e = 0
    const off = f * HOP
    for (let k = 0; k < RMS_WIN; k++) e += x[off + k] * x[off + k]
    rms[f] = Math.sqrt(e / RMS_WIN) + 1e-12
    if (rms[f] > maxRms) maxRms = rms[f]
  }
  const db = rms.map((v) => 20 * Math.log10(v / maxRms))
  let lo = -1, hi = -1
  for (let f = 0; f < nFrames; f++) if (db[f] > SILENCE_DB) { if (lo < 0) lo = f; hi = f + 1 }
  if (lo < 0) return { pause_count: 0, syllable_rate: null }
  const dbT = db.slice(lo, hi)
  const xtLen = (hi - 1) * HOP + RMS_WIN - lo * HOP
  const nPf = 1 + Math.max(0, Math.floor((xtLen - F0_WIN) / HOP))
  const n = Math.min(nPf, dbT.length)
  const minRun = Math.round(PAUSE_MIN_S / 0.01)
  let pauses = 0, run = 0
  for (let f = 0; f < n; f++) {
    run = dbT[f] < SILENCE_DB ? run + 1 : 0
    if (run === minRun) pauses++
  }
  return {
    pause_count: pauses,
    syllable_rate: feat.duration_s > 0 ? Math.round((feat.syllable_peaks / feat.duration_s) * 1000) / 1000 : null,
  }
}

function featuresFor(clip) {
  const cache = path.join(FEAT_DIR, `${clip.id}.json`)
  if (fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, 'utf8'))
  const x = decode16kMono(path.join(CLIP_DIR, `${clip.id}.mp3`))
  const feat = extractFeatures(x)
  if (!feat) return null
  const full = { id: clip.id, ...feat, ...extraStats(x, feat) }
  fs.writeFileSync(cache, JSON.stringify(full))
  return full
}

const round = (x, dp = 3) => (x == null ? null : Math.round(x * 10 ** dp) / 10 ** dp)

function compareFull(fa, fb) {
  const r = {
    energy_dtw: round(dtwDistance(fa.energy_contour_z, fb.energy_contour_z), 4),
    dur_log_ratio: round(Math.abs(Math.log(fa.duration_s / fb.duration_s)), 4),
    syl_count_diff: Math.abs(fa.syllable_peaks - fb.syllable_peaks),
    syl_rate_diff:
      fa.syllable_rate == null || fb.syllable_rate == null
        ? null
        : round(Math.abs(fa.syllable_rate - fb.syllable_rate), 3),
    voiced_frac_diff: round(Math.abs(fa.voiced_frac - fb.voiced_frac), 4),
    pause_diff: Math.abs(fa.pause_count - fb.pause_count),
    f0_dtw: null,
    f0_range_diff_st: null,
    f0_register_gap_st: null,
  }
  if (fa.f0_contour_st && fb.f0_contour_st) {
    r.f0_dtw = round(dtwDistance(fa.f0_contour_st, fb.f0_contour_st), 4)
    r.f0_range_diff_st = round(Math.abs(fa.f0_range_st - fb.f0_range_st), 3)
    r.f0_register_gap_st = round(Math.abs(12 * Math.log2(fa.f0_median_hz / fb.f0_median_hz)), 2)
  }
  return r
}

function loadLab() {
  const man = JSON.parse(fs.readFileSync(path.join(LAB_DIR, 'manifest.json'), 'utf8'))
  const bufs = man.parts.map((p) => fs.readFileSync(path.join(LAB_DIR, p)))
  return JSON.parse(Buffer.concat(bufs))
}

function writeLab(lab) {
  const payload = Buffer.from(JSON.stringify(lab))
  for (const f of fs.readdirSync(LAB_DIR)) fs.unlinkSync(path.join(LAB_DIR, f))
  const parts = []
  for (let off = 0; off < payload.length; off += PART_BYTES) {
    const name = `lab-data.part-${String(parts.length).padStart(2, '0')}`
    fs.writeFileSync(path.join(LAB_DIR, name), payload.subarray(off, off + PART_BYTES))
    parts.push(name)
  }
  fs.writeFileSync(
    path.join(LAB_DIR, 'manifest.json'),
    JSON.stringify({ parts, bytes: payload.length, generated: lab.generated })
  )
  return { parts: parts.length, bytes: payload.length }
}

async function main() {
  fs.mkdirSync(CLIP_DIR, { recursive: true })
  fs.mkdirSync(FEAT_DIR, { recursive: true })
  const lab = loadLab()
  const existingClipIds = new Set(Object.keys(lab.contours))
  const existingPairIds = new Set(lab.pairs.map((p) => p.pair_id))
  const scale = lab.combined_score.median_scale
  const DIMS = lab.combined_score.dims

  const summary = { started: new Date().toISOString(), languages: {}, added_pairs: 0, added_clips: 0, failures: [] }
  const newPairs = []

  for (const plan of PLAN) {
    console.log(`\n── ${plan.lang} (${plan.course})`)
    let rows
    try {
      rows = await fetchCourseRows(plan)
    } catch (e) {
      console.error(`  FAIL fetch: ${e.message}`)
      summary.failures.push({ lang: plan.lang, stage: 'fetch', error: e.message })
      continue
    }
    console.log(`  ${rows.length} rows`)
    const pairs = buildPairs(rows, plan, existingClipIds)
    console.log(`  ${pairs.filter((p) => p.category === 'crossvoice').length} crossvoice, ${pairs.filter((p) => p.category === 'crossprovider').length} crossprovider candidates`)
    summary.languages[plan.lang] = { rows: rows.length, candidates: pairs.length, added: 0 }

    for (const { category, a, b } of pairs) {
      const pairId = `${category}:${a.id.slice(0, 8)}:${b.id.slice(0, 8)}`
      if (existingPairIds.has(pairId)) continue
      try {
        await Promise.all([download(a), download(b)])
        const fa = featuresFor(a)
        const fb = featuresFor(b)
        if (!fa || !fb) throw new Error('feature extraction returned null (too short/silent)')
        const dims = compareFull(fa, fb)
        const parts = DIMS.filter((d) => dims[d] != null).map((d) => dims[d] / (scale[d] || 1))
        const combined = parts.length ? round(parts.reduce((s, v) => s + v, 0) / parts.length) : null
        newPairs.push({
          pair_id: pairId,
          category,
          language: plan.lang,
          same_bytes: false,
          text_a: a.text,
          text_b: b.text,
          a: { id: a.id, voice: a.voice_id, origin: a.origin, provider: provider(a.voice_id, a.origin) },
          b: { id: b.id, voice: b.voice_id, origin: b.origin, provider: provider(b.voice_id, b.origin) },
          dims: {
            energy_dtw: round(dims.energy_dtw),
            dur_log_ratio: round(dims.dur_log_ratio),
            syl_count_diff: dims.syl_count_diff,
            syl_rate_diff: round(dims.syl_rate_diff),
            f0_dtw: round(dims.f0_dtw),
            f0_range_diff_st: round(dims.f0_range_diff_st),
            f0_register_gap_st: round(dims.f0_register_gap_st),
            voiced_frac_diff: round(dims.voiced_frac_diff),
            pause_diff: dims.pause_diff,
          },
          combined,
        })
        for (const [clip, feat] of [[a, fa], [b, fb]]) {
          if (!lab.contours[clip.id]) {
            lab.contours[clip.id] = {
              e: feat.energy_contour_z.map((v) => round(v, 2)),
              dur: round(feat.duration_s, 2),
              syl: feat.syllable_peaks,
              sylT: feat.syllable_peak_t || [],
              f0: feat.f0_contour_st ? feat.f0_contour_st.map((v) => round(v, 1)) : null,
            }
            summary.added_clips++
          }
        }
        existingPairIds.add(pairId)
        summary.languages[plan.lang].added++
        summary.added_pairs++
        process.stdout.write('.')
      } catch (e) {
        summary.failures.push({ lang: plan.lang, pair: pairId, error: e.message })
        process.stdout.write('x')
      }
    }
    console.log('')
  }

  lab.pairs.push(...newPairs)
  lab.n_pairs = lab.pairs.length
  lab.n_clips = Object.keys(lab.contours).length
  lab.generated = new Date().toISOString()
  lab.breadth_extension = {
    date: lab.generated,
    tool: 'tools/prosody-lab/extend-lab-breadth.mjs',
    note:
      'Language-breadth pairs added via Supabase REST + audio proxy + the JS extractor ' +
      '(parity-verified mirror of prosody.py). Study anchors (AUC tables, median_scale) are ' +
      'the unmodified 2026-07-28 finding; new pairs are scored on that fixed scale.',
    added_pairs: summary.added_pairs,
    added_clips: summary.added_clips,
  }

  summary.finished = new Date().toISOString()
  summary.total_pairs = lab.n_pairs
  summary.total_clips = lab.n_clips
  fs.writeFileSync(path.join(OUT_DIR, 'breadth-summary.json'), JSON.stringify(summary, null, 2))

  if (DRY) {
    console.log('\nDRY RUN — lab data NOT written')
  } else {
    const w = writeLab(lab)
    console.log(`\nwrote ${LAB_DIR}: ${lab.n_pairs} pairs, ${lab.n_clips} clips, ${(w.bytes / 1024).toFixed(0)} KB in ${w.parts} parts`)
  }
  console.log(`summary: ${path.join(OUT_DIR, 'breadth-summary.json')}`)
  console.log(JSON.stringify(summary.languages))
  if (summary.failures.length) console.log(`${summary.failures.length} failures (see summary)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
