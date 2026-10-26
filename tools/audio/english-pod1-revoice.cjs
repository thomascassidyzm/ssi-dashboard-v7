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
const OLD = { bedd6226: 'f', gfzdpspr5fdp: 'm' }
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
module.exports = { speakerGender, englishTrack, norm, OLD, VOICE }
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
      for (const l of p.lines) { lines++; if (l.splits.length) splitLines++; uniq.set(`${g[l.speaker] || '?'}|${norm(l.text)}`, l.text.length) }
    }
    console.log(`courses with pod-1: ${Object.keys(out.courses).length}; without: ${out.missing.length} (${out.missing.join(' ')}); lines ${lines}; lines with English split clips ${splitLines}; unique (gender,text) ${uniq.size}; chars ${[...uniq.values()].reduce((a, b) => a + b, 0)}`)
    return
  }
  console.error('modes: census | render | link'); process.exit(1)
})().catch(e => { console.error(e); process.exit(1) })
