#!/usr/bin/env node
'use strict'
// English pod-1 re-voice (job #357, Tom 2026-10-26, r-2026-10-26-english-pod-1-audio-is-one): the ENGLISH side of pod 1 in every
// course with English as known (X_for_eng) or target (eng_for_X) is Cartesia Charlotte for female lines, Tom-006 for male lines.
// HTTP only (no database code): census reads /api/pod-scripts, render goes through the one route POST /api/audio/render
// (library-first, spend guard, one call per (text, voice), no retries; a refusal is the answer and stops the run), repoint goes through
// POST /api/production/:course/link-clip (replace + expectCurrent = per-row before-state assertion; dry run first). Nothing is deleted.
//   node tools/audio/english-pod1-revoice.cjs census                 # every English-side course: lines, voices, unique (text,gender)
//   node tools/audio/english-pod1-revoice.cjs render [--dry]         # dryRun by default; --apply renders
//   node tools/audio/english-pod1-revoice.cjs link [--apply] [--courses a,b]
const fs = require('fs'), path = require('path')
const BASE = process.env.POPTY_URL || 'http://localhost:3470'
const DIR = path.join(__dirname, '..', '..', 'ops', '357-english-pod1')
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121'
const TOM_006 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const VOICE = { f: CHARLOTTE, m: TOM_006 }
// the two xAI clones the pod English is on today; any other voice id is a gender the line does not carry -> resolved by speakerGender
const OLD = { bedd6226: 'f', gfzdpspr: 'm', '71a7ad14': 'f', '8fef4d59': 'm', d293d509: 'm' }   // Olivia, Tom xAI clone, Charlotte, tom_001, Tom-006
const bare = v => String(v || '').replace(/^(xai_|cartesia_)/, '').slice(0, 8)
const norm = t => String(t || '').normalize('NFC').replace(/\s+/g, ' ').trim()
/** English side of a course: eng_for_X plays English as the TARGET track, X_for_eng as the KNOWN track. */
const englishTrack = course => (course.startsWith('eng_for_') ? 'target' : 'known')
/** Pure. One scene's speakers each keep ONE voice: the gender of a speaker is the majority of her lines' old voices, else the map's. */
function speakerGender(lines, fallback = {}) {
  const tally = new Map()
  for (const l of lines) {
    const g = OLD[bare(l.oldVoice)]
    if (!g) continue
    const t = tally.get(l.speaker) || { f: 0, m: 0 }
    t[g]++; tally.set(l.speaker, t)
  }
  const out = {}
  for (const l of lines) {
    const t = tally.get(l.speaker)
    out[l.speaker] = t ? (t.f > t.m ? 'f' : 'm') : (fallback[l.speaker] || null)
  }
  return out
}
const get = async p => (await fetch(`${BASE}${p}`, { signal: AbortSignal.timeout(180000) })).json()
const post = async (p, body, headers = {}) => {
  const res = await fetch(`${BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-357-english-pod1', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}
async function englishCourses() {
  const d = await get('/api/courses')
  return (d.courses || d).map(c => c.course_code || c.code).filter(c => c && !c.startsWith('zzz_') && (c.endsWith('_for_eng') || c.startsWith('eng_for_'))).sort()
}
/** The English lines of a course's pod-1: [{id, speaker, scene, order, text, clip:{id,voice,text}, splits:[...]}] */
async function podLines(course) {
  const d = await get(`/api/pod-scripts/${course}?slug=pod-1&track=known`)
  if (!d.scenes) return null
  const tr = englishTrack(course), lines = []
  for (const s of d.scenes) for (const l of s.lines) {
    const a = l.audio || {}, c = a[tr] || {}
    lines.push({ id: l.id, scene: l.scene_number, order: l.global_order, speaker: l.speaker, text: tr === 'known' ? l.known_text : l.target_text,
      clip: c.id || null, clipText: c.text || null, oldVoice: c.voice_id || null, splits: a[`${tr}_splits`] || [], hasSplitArrays: !!a.has_split_arrays })
  }
  return { course, track: tr, lines }
}
/** Pure. The clips a line needs: its own clip plus each split, each with the words it says and the voice it must end up in. */
function lineNeeds(l, gender) {
  const want = VOICE[gender], out = []
  if (!gender || !l.clip) return out
  const on = v => `cartesia_${bare(v)}` === want || bare(v) === bare(want)
  if (!on(l.oldVoice)) { const t = l.clipText || l.text; if (t) out.push({ kind: 'main', old: l.clip, text: t, gender }) }
  l.splits.forEach((c, i) => { if (c && c.id && c.text && !on(c.voice_id)) out.push({ kind: 'split', old: c.id, text: c.text, gender, i }) })
  return out
}
module.exports = { speakerGender, lineNeeds, englishTrack, norm, OLD, VOICE }
if (require.main === module) (async () => {
  const mode = process.argv[2], has = f => process.argv.includes(f)
  fs.mkdirSync(DIR, { recursive: true })
  if (mode === 'census') {
    const out = { courses: {}, missing: [] }
    for (const c of await englishCourses()) {
      const p = await podLines(c)
      if (!p) { out.missing.push(c); continue }
      out.courses[c] = p
    }
    fs.writeFileSync(path.join(DIR, 'census.json'), JSON.stringify(out))
    const uniq = new Map(); let lines = 0, splitLines = 0
    for (const p of Object.values(out.courses)) {
      const g = speakerGender(p.lines.map(l => ({ ...l })))
      for (const l of p.lines) { lines++; if (l.splits.length) splitLines++; uniq.set(`${g[l.speaker] || "?"}|${norm(l.text)}`, (l.text || "").length) }
    }
    console.log(`courses with pod-1: ${Object.keys(out.courses).length}; without: ${out.missing.length} (${out.missing.join(' ')}); lines ${lines}; lines with English split clips ${splitLines}; unique (gender,text) ${uniq.size}; chars ${[...uniq.values()].reduce((a, b) => a + b, 0)}`)
    return
  }
  const census = () => JSON.parse(fs.readFileSync(path.join(DIR, 'census.json'), 'utf8')).courses
  const MAP = path.join(DIR, 'map.json')   // `${gender}|${text}` -> new audioId (library or rendered); written as it goes, so a stopped run resumes
  const map = fs.existsSync(MAP) ? JSON.parse(fs.readFileSync(MAP, 'utf8')) : {}
  const only = (process.argv.find(a => a.startsWith('--courses=')) || '').slice(10).split(',').filter(Boolean)
  const pick = c => !only.length || only.includes(c)
  /** (gender,text) -> {chars, courses:Set} for every clip that still needs a new voice. */
  const asks = () => {
    const a = new Map()
    for (const [c, p] of Object.entries(census())) {
      if (!pick(c)) continue
      const g = speakerGender(p.lines)
      for (const l of p.lines) for (const n of lineNeeds(l, g[l.speaker])) {
        const k = `${n.gender}|${n.text}`
        if (!a.has(k)) a.set(k, { gender: n.gender, text: n.text, courses: new Set() })
        a.get(k).courses.add(c)
      }
    }
    return a
  }
  if (mode === 'plan') {
    const a = asks(); let chars = 0, left = 0
    for (const [k, v] of a) { chars += v.text.length; if (!map[k]) left += v.text.length }
    console.log(`asks ${a.size}; chars ${chars}; not yet answered ${left}`)
    return
  }
  if (mode === 'render') {
    const apply = has('--apply'), max = +((process.argv.find(a => a.startsWith('--max-chars=')) || '=0').split('=')[1]) || Infinity
    let spent = 0, lib = 0, would = 0, n = 0, gated = 0
    const log = path.join(DIR, 'render-log.jsonl')
    for (const [k, v] of asks()) {
      if (map[k]) continue
      if (spent + would + v.text.length > max) { console.log(`STOP: --max-chars ${max} reached`); break }
      const r = await post('/api/audio/render', { courseCode: 'nld_for_eng', role: 'known', language: 'eng', text: v.text, voiceId: VOICE[v.gender], voiceBound: true, dryRun: !apply,
        purpose: 'job #357: English pod 1 on Charlotte (f) / Tom-006 (m) (Tom 2026-10-26)' })
      fs.appendFileSync(log, JSON.stringify({ k, status: r.status, body: r.body }) + '\n')
      const b = r.body
      if (!apply && b.code === 'RERECORD_NOT_PERMITTED') { gated++; continue }   // dry census only: each distinct ask is answered once, never retried
      if (r.status !== 200 || !b.ok) { console.log(`REFUSED ${r.status} ${b.code || ''} ${b.error || ''} — stopping, nothing retried`); break }
      n++
      if (apply) { map[k] = b.audioId; fs.writeFileSync(MAP, JSON.stringify(map, null, 1)) }
      if (b.source === 'library') lib++; else if (b.source === 'would-render') would += b.wouldSpendChars || v.text.length; else spent += b.charsSpent || 0
    }
    console.log(`${apply ? 'RENDER' : 'DRY'}: answered ${n}, library ${lib}, charsSpent ${spent}, wouldSpend ${would}, refused by the re-record gate ${gated}`)
    return
  }
  console.error('modes: census | plan | render | link'); process.exit(1)
})().catch(e => { console.error(e); process.exit(1) })
