#!/usr/bin/env node
'use strict'
/**
 * pod-rerecord.cjs — re-record a whole pod in the language's picked voices, ONE take per turn, and cut every
 * Drill clip from those same takes. The one-button Popty process Tom asked for once Italian proved it
 * (r-2026-09-30-pods-record-one-take-per-turn: "build the process so it is a one-button thing in Popty");
 * first run on German Pod 1 in Nico + Viktoria (r-2026-10-08-german-pods-drill-cuts-from-nico, job #216).
 *
 * Italian (#938) did this by hand with Whisper word timings and a dynamic-programming re-search for hard turns.
 * Since #643 the render route stores Cartesia's own word timings on every clip, so the cut needs no
 * transcription: tools/pods/drill-cuts.cjs anchors each cut on those timings (the #181 rule).
 *
 * STAGES, each writing its state into one evidence directory (out of the repo), each re-runnable:
 *   snapshot   the pod's rows + speakers cast as they stand (the switch plan's before-state)
 *   render     one take per turn through POST /api/audio/render — dry run unless --go. Library first, spend
 *              guard, one render, no retries; a refusal is recorded as the answer and never re-asked.
 *   cut        every multi-sentence take cut into its sentences (drill-cuts.cjs) + seam/edge measurement
 *   publish    each cut into S3 + a course_audio row (word timings re-based onto the piece) — dry unless --go.
 *              Library first on the dedup key: an existing clip with these words in this voice is reused.
 *   plan       the switch plan for tools/pods/switch-pod-clip-pointers.cjs (whole-turn takes, per-sentence clips,
 *              Drill fusion clips, speakers cast). Writes nothing to the pod: going live is that tool's --apply.
 *   page       a phone listen page (every turn's take, then its Drill cuts) into --out=<dir>
 *
 *   node tools/pods/pod-rerecord.cjs <course> <stage> [--pod=pod-1] [--job=#216] [--go] [--out=dir]
 *
 * What it refuses: a drafted target line (never render unread text); a speaker it cannot place as m/f; a
 * language with no pod_voice_picks entry for either gender; a cut plan whose timed words are not the turn's
 * words. Refusals are listed, never skipped silently.
 *
 * WHAT GOES LIVE AND WHAT DOES NOT. Only fields a learner's slots do not hang on: the per-row unit count
 * (sentence_audio_ids length) is preserved exactly — a split row is re-pointed onto the same number of new
 * sentence clips, an unsplit row stays unsplit — so learner progress is untouched (switch-pod-clip-pointers.cjs
 * enforces it again). The English known side is not touched.
 */
const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const { randomUUID } = require('crypto')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true })
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true })
const { evidencePath } = require('../lib/evidence-path.cjs')
const cuts = require('./drill-cuts.cjs')

const execFileP = promisify(execFile)
const SPLICER = path.join(__dirname, 'splice.py')
const POPTY = process.env.POPTY_URL || 'http://localhost:3470'

const argv = process.argv.slice(2)
const flag = (name, dflt) => { const a = argv.find((x) => x === `--${name}` || x.startsWith(`--${name}=`)); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : dflt }
const [COURSE, STAGE] = argv.filter((a) => !a.startsWith('--'))
const POD_ID = `${COURSE}:${flag('pod', 'pod-1')}`
const JOB = String(flag('job', ''))
const GO = flag('go', false) === true
const LANG = String(COURSE || '').split('_for_')[0]
const DIR = path.dirname(evidencePath(`tools/pods/rerecord/${String(POD_ID).replace(/[:]/g, '_')}/x`))
const st = (f) => path.join(DIR, f)
const readJ = (f, d) => (fs.existsSync(st(f)) ? JSON.parse(fs.readFileSync(st(f), 'utf8')) : d)
const writeJ = (f, v) => fs.writeFileSync(st(f), JSON.stringify(v, null, 1))

const cleanSpeaker = (s) => String(s || '').replace(/\s*\([^)]*\)\s*/g, '').trim()

/** Pure: m/f for every speaker — its own gender, else the gender of whoever shares its current target voice. */
function speakerGenders (speakers) {
  const byVoice = {}
  for (const v of Object.values(speakers)) if (v.gender && v.target) byVoice[v.target.voice_id] = v.gender
  const out = {}
  for (const [name, v] of Object.entries(speakers)) out[name] = v.gender || (v.target && byVoice[v.target.voice_id]) || null
  return out
}

/** Pure: the speakers cast after the re-record — every target voice moved to the picked voice for its gender. */
function recastSpeakers (speakers, picks, locale) {
  const g = speakerGenders(speakers)
  const out = JSON.parse(JSON.stringify(speakers))
  for (const [name, v] of Object.entries(out)) {
    const p = picks[g[name]]
    if (!p) throw new Error(`speaker ${name}: no gender or no pick for "${g[name]}"`)
    v.gender = g[name]
    v.target = { name: p.name, locale, provider: p.provider, voice_id: p.voice_id }
  }
  return out
}

// ── The Drill fusion groups, as the player builds them (ssi-learning-app packages/core/src/pods/fusionDrill.ts
// partitionUnits + glueLeadingInterjection). Copied, not imported: two repos share a database, not a module graph.
const SENTENCE_PUNCT = /[.!?…。！？؟]/
const fineUnits = (fine) => (Array.isArray(fine) ? fine : []).filter((u) => u && (u.kind === undefined || u.kind === 'atom' || u.kind === 'passthrough') && u.target_surface)
function partitionUnits (text, units) {
  const lower = String(text || '').toLowerCase(); const groups = [[]]; let cursor = 0
  units.forEach((u, i) => {
    const s = String(u.target_surface || '').toLowerCase(); const idx = s ? lower.indexOf(s, cursor) : -1
    if (i > 0 && idx !== -1 && SENTENCE_PUNCT.test(text.slice(cursor, idx))) groups.push([])
    groups[groups.length - 1].push(i)
    if (idx !== -1) cursor = idx + s.length
  })
  return groups.filter((g) => g.length)
}
const glueLeadingInterjection = (groups, units) => (groups.length >= 2 && groups[0].length === 1 && String(units[groups[0][0]].target_surface || '').trim().split(/\s+/).filter(Boolean).length <= 1
  ? [[...groups[0], ...groups[1]], ...groups.slice(2)] : groups)

/**
 * Pure: the new takeg_audio_ids for a row, or undefined to leave the row's alone.
 * A group covering the whole turn takes the whole-turn take; a one-sentence group takes that sentence's cut; a
 * group joining SOME of a turn's sentences gets null (the player then drills those sentences one by one, each
 * with its own English — #938's rule). An array the player ignores (length ≠ its group count) is left as it is.
 */
function newTakeg (row, sentenceCount, takeId, sentenceClip) {
  if (!Array.isArray(row.takeg_audio_ids) || !row.takeg_audio_ids.length) return undefined
  const units = fineUnits(row.atom_map_fine)
  if (!units.length) return undefined
  const glued = glueLeadingInterjection(partitionUnits(row.target_text, units), units)
  if (glued.length !== row.takeg_audio_ids.length) return undefined
  // unit → sentence index, by the same cursor walk
  const text = row.target_text; const lower = text.toLowerCase()
  const sents = cuts.sentencesOf(text); const starts = []; { let c = 0; for (const s of sents) { const i = text.indexOf(s, c); starts.push(i); c = i + s.length } }
  const sentOf = (pos) => { let k = 0; starts.forEach((s, i) => { if (pos >= s) k = i }); return k }
  const unitSent = []; { let cur = 0; for (const u of units) { const idx = lower.indexOf(u.target_surface.toLowerCase(), cur); unitSent.push(idx === -1 ? -1 : sentOf(idx)); if (idx !== -1) cur = idx + u.target_surface.length } }
  return glued.map((g) => {
    const ss = g.map((i) => unitSent[i]).filter((x) => x >= 0)
    if (!ss.length) return null
    const a = Math.min(...ss), b = Math.max(...ss)
    if (a === 0 && b === sentenceCount - 1) return takeId
    if (a === b) return sentenceClip(a)
    return null
  })
}

// ── IO ──────────────────────────────────────────────────────────────────────────────────────────────────────
async function pgClient () { const { Client } = require('pg'); const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect(); return c }

async function snapshot () {
  const pg = await pgClient()
  const { rows } = await pg.query('select * from listening_pod_sentences where pod_id = $1 order by global_order', [POD_ID])
  const { rows: [pod] } = await pg.query('select speakers from listening_pods where id = $1', [POD_ID])
  const { rows: [pk] } = await pg.query("select value from app_config where key = 'pod_voice_picks'")
  await pg.end()
  const picks = (pk && pk.value && pk.value[LANG]) || {}
  if (!picks.m || !picks.f) throw new Error(`no pod_voice_picks for ${LANG} m+f — Tom picks pod voices first`)
  const drafts = rows.filter((r) => r.target_text_draft)
  if (drafts.length) throw new Error(`${drafts.length} drafted target lines — never render unread text`)
  recastSpeakers(pod.speakers, picks, LANG) // throws on an unplaceable speaker
  writeJ('rows-before.json', rows); writeJ('speakers-before.json', pod.speakers); writeJ('picks.json', picks)
  console.log(`${POD_ID}: ${rows.length} rows, ${rows.reduce((a, r) => a + r.target_text.length, 0)} target chars; picks m=${picks.m.name} f=${picks.f.name} → ${DIR}`)
}

function castedRows () {
  const rows = readJ('rows-before.json'); const speakers = readJ('speakers-before.json'); const picks = readJ('picks.json')
  if (!rows) throw new Error('run snapshot first')
  const g = speakerGenders(speakers)
  return rows.filter((r) => String(r.target_text || '').trim()).map((r) => {
    const gender = g[cleanSpeaker(r.speaker)] || g[r.speaker]
    if (!picks[gender]) throw new Error(`row ${r.global_order}: speaker ${r.speaker} has no gender`)
    return { row: r, voiceId: `cartesia_${picks[gender].voice_id}`, voiceName: picks[gender].name }
  })
}

async function render () {
  const work = castedRows()
  const file = GO ? 'takes.json' : 'takes-dry.json'
  const done = readJ(file, {})
  const tally = { library: 0, rendered: 0, wouldRender: 0, wouldSpendChars: 0, charsSpent: 0, refused: 0 }
  for (const { row, voiceId } of work) {
    const prev = done[row.id]
    if (prev && prev.result && (prev.result.ok || prev.result.status !== 0)) continue // an answer, refusal included, is never re-asked
    const body = { courseCode: COURSE, role: 'target1', text: row.target_text, voiceId, voiceBound: true, dryRun: !GO, job: JOB || undefined,
      purpose: `${POD_ID} re-record, one take per turn, row ${row.global_order} (${row.speaker})${JOB ? ` — job ${JOB}` : ''} (Tom 2026-10-08)` }
    let result
    for (let i = 0; ; i++) {
      try {
        const res = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `pod-rerecord${JOB ? `-${JOB}` : ''}` }, body: JSON.stringify(body) })
        result = { status: res.status, ...(await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) }
      } catch (e) { result = { ok: false, status: 0, error: `fetch: ${e.message} ${(e.cause && e.cause.code) || ''}` } }
      // ECONNREFUSED never reached Popty (it restarts under deploys): nothing spent, safe to ask again.
      if (result.status !== 0 || !/ECONNREFUSED/.test(result.error || '') || i >= 12) break
      await new Promise((r) => setTimeout(r, 15000))
    }
    done[row.id] = { g: row.global_order, text: row.target_text, voiceId, result }
    writeJ(file, done)
    if (!result.ok) { tally.refused++; console.log(`✗ row ${row.global_order}: ${result.status} ${result.code || ''} ${result.error || ''}`); if (result.status === 402) break; continue }
    if (result.source === 'library') tally.library++
    else if (result.source === 'rendered') tally.rendered++
    else tally.wouldRender++
    tally.wouldSpendChars += result.wouldSpendChars || 0; tally.charsSpent += result.charsSpent || 0
  }
  console.log(`${GO ? 'RENDER' : 'DRY RUN'} ${POD_ID}: ${work.length} turns`, JSON.stringify(tally))
}

const s3Url = (key) => `https://${process.env.S3_BUCKET || 'ssi-audio-stage'}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/${key}`

async function takeClips () {
  const takes = readJ('takes.json'); if (!takes) throw new Error('run render --go first')
  const ids = Object.values(takes).filter((t) => t.result.ok && t.result.audioId).map((t) => t.result.audioId)
  const pg = await pgClient()
  const { rows } = await pg.query('select id::text, text, voice_id, s3_key, duration_ms, word_timings from course_audio where id = any($1::uuid[])', [ids])
  // A library-linked take may sit on a row without timings; the same bytes' timings live on whichever row has them.
  const missing = rows.filter((r) => !r.word_timings).map((r) => r.s3_key)
  if (missing.length) {
    const { rows: alt } = await pg.query('select s3_key, word_timings from course_audio where s3_key = any($1) and word_timings is not null', [missing])
    const byKey = new Map(alt.map((a) => [a.s3_key, a.word_timings]))
    for (const r of rows) if (!r.word_timings) r.word_timings = byKey.get(r.s3_key) || null
  }
  await pg.end()
  return new Map(rows.map((r) => [r.id, r]))
}

async function peakDb (file, start, dur) {
  const { stderr } = await execFileP('ffmpeg', ['-hide_banner', '-v', 'info', '-i', file, '-af', `atrim=start=${start.toFixed(4)}:end=${(start + dur).toFixed(4)},volumedetect`, '-f', 'null', '-'])
  const v = [...stderr.matchAll(/max_volume:\s*(-?[0-9.]+) dB/g)]
  return v.length ? parseFloat(v[v.length - 1][1]) : null
}
const probe = async (f) => parseFloat((await execFileP('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', f])).stdout)

async function cut () {
  const takes = readJ('takes.json'); const clips = await takeClips()
  const rowsById = new Map(readJ('rows-before.json').map((r) => [r.id, r]))
  fs.mkdirSync(st('takes'), { recursive: true }); fs.mkdirSync(st('pieces'), { recursive: true })
  const out = {}; const refusals = []
  for (const [rowId, t] of Object.entries(takes)) {
    if (!t.result.ok) continue
    const row = rowsById.get(rowId); const clip = clips.get(t.result.audioId)
    if (!clip) { refusals.push({ g: t.g, reason: 'take row missing' }); continue }
    const src = st(`takes/${t.g}.mp3`)
    if (!fs.existsSync(src)) await execFileP('curl', ['-sf', '--max-time', '60', '-o', src, s3Url(clip.s3_key)])
    const dur = await probe(src)
    const sents = cuts.sentencesOf(row.target_text)
    const entry = { g: t.g, rowId, takeId: clip.id, dur, voiceId: clip.voice_id, sentences: sents, pieces: [] }
    if (sents.length > 1) {
      if (!clip.word_timings) { refusals.push({ g: t.g, reason: 'take has no word timings' }); out[rowId] = { ...entry, refused: 'no timings' }; continue }
      const healed = JSON.parse((await execFileP('python3', [SPLICER, src, '--silences'])).stdout).healed
      const plan = cuts.planCuts(row.target_text, clip.word_timings, cuts.interiorGaps(healed, dur))
      if (!plan.ok) { refusals.push({ g: t.g, reason: plan.reason }); out[rowId] = { ...entry, refused: plan.reason }; continue }
      const windows = cuts.pieceWindows(plan.cuts.map((c) => c.at), dur)
      for (let i = 0; i < plan.units.length; i++) {
        const file = st(`pieces/${t.g}_${i}.mp3`)
        await execFileP('ffmpeg', cuts.ffmpegPieceArgs(src, windows[i], file))
        const d = await probe(file)
        const peak = await peakDb(file, 0, d)
        const head = i > 0 ? await peakDb(file, 0, 0.03) : null
        const tail = i < plan.units.length - 1 ? await peakDb(file, Math.max(0, d - 0.03), 0.03) : null
        // splice-sentence-clips.cjs's seam gate: an internal seam edge is room tone — under -35 dB and 20 dB below the piece's own peak.
        const loud = [head, tail].filter((x) => x != null && (x > -35 || x > peak - 20))
        entry.pieces.push({ i, text: plan.units[i].text, file: path.basename(file), ...windows[i], dur: d, cutSource: [plan.cuts[i - 1], plan.cuts[i]].filter(Boolean).map((c) => c.source),
          headDb: head, tailDb: tail, peakDb: peak, seamOk: loud.length === 0, timings: cuts.pieceTimings(clip.word_timings, plan.units[i], windows[i]) })
      }
    }
    out[rowId] = entry
  }
  writeJ('cuts.json', out); writeJ('cut-refusals.json', refusals)
  const ps = Object.values(out).flatMap((e) => e.pieces)
  console.log(`cut ${Object.keys(out).length} takes → ${ps.length} sentence pieces; word-gap fallbacks ${ps.filter((p) => p.cutSource.includes('word-gap')).length}; seam flags ${ps.filter((p) => !p.seamOk).length}; refused ${refusals.length}`)
  for (const r of refusals) console.log(`  refused row ${r.g}: ${r.reason}`)
}

async function publish () {
  const out = readJ('cuts.json'); if (!out) throw new Error('run cut first')
  const pub = readJ('published.json', {})
  const { createClient } = require('@supabase/supabase-js')
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs')
  const clipIndex = require('../../services/shared/clip-index.cjs')
  const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
  const s3 = new S3Client({ region: process.env.AWS_REGION })
  const tally = { reused: 0, inserted: 0, wouldInsert: 0, skippedSeam: 0 }
  for (const e of Object.values(out)) {
    for (const p of e.pieces) {
      const key = `${e.rowId}:${p.i}`
      if (pub[key]) continue
      const tn = normalizeForAudio(p.text)
      // The database stores text_normalized with punctuation stripped ("et vous " for "Et vous ?") while normalizeForAudio keeps
      // it, and a PostgREST eq filter loses trailing spaces: an exact eq never finds the row and the insert then hits
      // unique_course_audio_per_voice (French #229). Compare on letters/digits/spaces only, in JS.
      const plain = (x) => String(x || '').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()
      const { data: cands, error } = await sb.from('course_audio').select('id,text_normalized').eq('course_code', COURSE)
        .ilike('text_normalized', `${(String(tn).match(/^[\p{L}\p{N}]+/u) || [''])[0]}%`).eq('language', LANG).eq('role', 'target1').eq('voice_id', e.voiceId)
      if (error) throw error
      const hit = (cands || []).find((c) => plain(c.text_normalized) === plain(tn))
      if (hit) { pub[key] = { id: hit.id, reused: true }; tally.reused++; if (GO) writeJ('published.json', pub); continue }
      if (!GO) { tally.wouldInsert++; continue }
      const body = fs.readFileSync(st(`pieces/${p.file}`))
      const id = randomUUID()
      const s3Key = `mastered/${id.toUpperCase()}.mp3`
      await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: s3Key, Body: body, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }))
      await s3.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: s3Key }))
      const { error: insErr } = await sb.from('course_audio').insert({ id, course_code: COURSE, text: p.text, text_normalized: tn, language: LANG, role: 'target1',
        voice_id: e.voiceId, origin: 'tts', s3_key: s3Key, duration_ms: Math.round(p.dur * 1000), file_size_bytes: body.length, word_timings: p.timings })
      if (insErr) throw new Error(`${key}: ${insErr.message}`)
      await clipIndex.writeThrough(sb, [{ id, course_code: COURSE, text: p.text, language: LANG, voice_id: e.voiceId, s3_key: s3Key, origin: 'tts' }], `pod-rerecord${JOB}`, console)
      pub[key] = { id, reused: false, s3Key }
      tally.inserted++
      writeJ('published.json', pub)
    }
  }
  console.log(`${GO ? 'PUBLISH' : 'DRY RUN'} ${POD_ID}:`, JSON.stringify(tally))
}

function plan () {
  const rows = readJ('rows-before.json'); const speakers = readJ('speakers-before.json'); const picks = readJ('picks.json')
  const takes = readJ('takes.json'); const out = readJ('cuts.json'); const pub = readJ('published.json', {})
  const switchPlan = { podId: POD_ID, jobLabel: JOB, rows: [], speakers: { before: speakers, after: recastSpeakers(speakers, picks, LANG) } }
  const left = []
  for (const r of rows) {
    const t = takes[r.id]; const e = out[r.id]
    if (!t || !t.result.ok || !e || e.refused) { left.push({ g: r.global_order, why: !t ? 'no take' : !t.result.ok ? 'take refused' : 'cut refused' }); continue }
    const n = e.sentences.length
    const sentenceClip = (i) => (n === 1 ? e.takeId : (pub[`${r.id}:${i}`] || {}).id || null)
    const before = { target_audio_id: r.target_audio_id }; const after = { target_audio_id: e.takeId }
    const split = (r.sentence_audio_ids || []).filter(Boolean).length >= 2
    if (split) {
      const ids = e.sentences.map((_, i) => sentenceClip(i))
      if (ids.length !== r.sentence_audio_ids.filter(Boolean).length || ids.some((x) => !x)) { left.push({ g: r.global_order, why: 'sentence clips incomplete' }); continue }
      before.sentence_audio_ids = r.sentence_audio_ids; after.sentence_audio_ids = ids
    }
    const tg = newTakeg(r, n, e.takeId, sentenceClip)
    if (tg !== undefined) {
      before.takeg_audio_ids = r.takeg_audio_ids; after.takeg_audio_ids = tg
      // ms spans in atom_map_fine described the OLD Take G's timebase; nothing measures them on the new take.
      if (Array.isArray(r.atom_map_fine) && r.atom_map_fine.some((u) => u && (u.target_start_ms != null || u.target_end_ms != null))) {
        before.atom_map_fine = r.atom_map_fine
        after.atom_map_fine = r.atom_map_fine.map((u) => (u && (u.target_start_ms != null || u.target_end_ms != null) ? { ...u, target_start_ms: null, target_end_ms: null } : u))
      }
    }
    switchPlan.rows.push({ id: r.id, before, after })
  }
  writeJ('switch-plan.json', switchPlan)
  console.log(`switch plan: ${switchPlan.rows.length}/${rows.length} rows; not switchable: ${left.length}${left.length ? ' ' + JSON.stringify(left) : ''}`)
  console.log(`dry run:  node tools/pods/switch-pod-clip-pointers.cjs ${st('switch-plan.json')}`)
}

function page () {
  const outDir = String(flag('out', '')); if (!outDir) throw new Error('--out=<dir> for the page')
  const rows = readJ('rows-before.json'); const takes = readJ('takes.json'); const out = readJ('cuts.json'); const picks = readJ('picks.json')
  fs.mkdirSync(path.join(outDir, 'a'), { recursive: true })
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  let html = '', nT = 0, nP = 0, scene = null
  const flags = []
  for (const r of rows) {
    const e = out[r.id]; const t = takes[r.id]
    if (!e || !t || !t.result.ok) continue
    if (r.scene_number !== scene) { scene = r.scene_number; html += `<h2>Scene ${scene}</h2>` }
    const tf = `t${r.global_order}.mp3`; fs.copyFileSync(st(`takes/${e.g}.mp3`), path.join(outDir, 'a', tf)); nT++
    const who = e.voiceId.includes(picks.m.voice_id) ? picks.m.name : picks.f.name
    html += `<div class=t><div class=h>${r.global_order} · ${esc(r.speaker)} · <b>${who}</b> · ${e.dur.toFixed(1)} s</div><p>${esc(r.target_text)}</p><audio controls preload=none src="a/${tf}"></audio>`
    if (e.refused) html += `<p class=w>Drill not cut: ${esc(e.refused)}</p>`
    if (e.pieces.length) {
      html += '<div class=d>Drill cuts:'
      for (const p of e.pieces) {
        const pf = `p${r.global_order}_${p.i}.mp3`; fs.copyFileSync(st(`pieces/${p.file}`), path.join(outDir, 'a', pf)); nP++
        const note = [!p.seamOk && 'seam not quiet', p.cutSource.includes('word-gap') && 'cut between words, no pause found'].filter(Boolean)
        if (note.length) flags.push(`${r.global_order}.${p.i + 1}`)
        html += `<div class=p><span>${p.i + 1}. ${esc(p.text)} <small>${p.dur.toFixed(1)} s</small>${note.length ? ` <span class=w>⚑ ${note.join('; ')}</span>` : ''}</span><audio controls preload=none src="a/${pf}"></audio></div>`
      }
      html += '</div>'
    }
    html += '</div>'
  }
  const head = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${esc(POD_ID)} — ${picks.m.name} + ${picks.f.name}</title>` +
    '<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:.8em;line-height:1.35}audio{width:100%;height:36px;margin:.2em 0}.t{border-top:1px solid #ddd;padding:.5em 0}.h{color:#555;font-size:.85em}.d{margin:.3em 0 0 .8em;padding-left:.6em;border-left:3px solid #8b8}.p{margin:.35em 0}.w{color:#a40}small{color:#777}p{margin:.2em 0}</style>' +
    `<h1>${esc(POD_ID)} in ${picks.m.name} + ${picks.f.name}</h1><p>Every turn is one take; each Drill cut below it is cut from that same take at the pause between sentences. ${nT} takes, ${nP} Drill cuts.${flags.length ? ` Flagged by measurement (worth an ear): ${flags.join(', ')}.` : ' None flagged by measurement.'} Not live yet.</p>`
  fs.writeFileSync(path.join(outDir, 'index.html'), head + html)
  console.log(`page: ${path.join(outDir, 'index.html')} (${nT} takes, ${nP} cuts, ${flags.length} flagged)`)
}

module.exports = { speakerGenders, recastSpeakers, newTakeg, partitionUnits, glueLeadingInterjection }

if (require.main === module) {
  const stages = { snapshot, render, cut, publish, plan, page }
  if (!COURSE || !stages[STAGE]) { console.error(`usage: pod-rerecord.cjs <course> <${Object.keys(stages).join('|')}> [--pod=pod-1] [--job=#N] [--go] [--out=dir]`); process.exit(1) }
  Promise.resolve(stages[STAGE]()).catch((e) => { console.error('FATAL', e.message || e); process.exit(1) })
}
