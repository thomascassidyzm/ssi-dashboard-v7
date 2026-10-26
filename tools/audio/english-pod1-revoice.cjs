#!/usr/bin/env node
'use strict'
// English pod-1 re-voice (job #357, Tom 2026-10-26, r-2026-10-26-english-pod-1-audio-is-one): the ENGLISH side of pod 1 in every
// course with English as known (X_for_eng) or target (eng_for_X) is Cartesia Charlotte for female lines, Tom-006 for male lines.
// Job #371 (Tom 2026-10-26, "no need to re-record anything"): this tool no longer renders. It REPOINTS English pod-1 lines at English
// clips that already exist (Charlotte for female lines, Tom's male voice for male lines) and lists a gap wherever no text-identical clip exists.
// HTTP only (no database code): census/link read /api/pod-scripts; repoint goes through POST /api/production/:course/link-clip
// (replace + expectCurrent = per-row before-state assertion; dry run first). Nothing is deleted, nothing is rendered.
//   node tools/audio/english-pod1-revoice.cjs census                                  # every English-side course: lines, voices
//   node tools/audio/english-pod1-revoice.cjs link --courses=nld_for_eng [--source=ita_for_eng] [--apply] [--only-scene=N]
//   node tools/audio/english-pod1-revoice.cjs link --all                              # dry-run plan for every English-side course (never applies)
const fs = require('fs'), path = require('path')
const BASE = process.env.POPTY_URL || 'http://localhost:3470'
const DIR = path.join(__dirname, '..', '..', 'ops', '357-english-pod1')
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121'
const TOM_006 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const TOM_001 = 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'
// voices an existing English clip may already speak in, per gender, in order of preference (a speaker keeps ONE of them for the scene)
const GOOD_VOICES = { f: [CHARLOTTE], m: [TOM_001, TOM_006] }
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
  const res = await fetch(`${BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-371-english-pod1', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) })
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
/** role names for the English side: a X_for_eng pod plays English as KNOWN, an eng_for_X pod as TARGET */
const rolesFor = course => (englishTrack(course) === 'known' ? { main: 'known', split: 'knownsegment' } : { main: 'target', split: 'segment' })
/** Pure. (voice,text) -> clip id of an existing clip. `pods` = [{lines}] read from source pods; only clips already in a GOOD voice are indexed. */
function buildIndex(pods) {
  const idx = new Map(), ok = new Set([...GOOD_VOICES.f, ...GOOD_VOICES.m].map(bare))
  const add = (id, voice, text) => { if (!id || !text || !ok.has(bare(voice))) return; const k = `${bare(voice)}|${norm(text)}`; if (!idx.has(k)) idx.set(k, id) }
  for (const p of pods) for (const l of p.lines) { add(l.clip, l.oldVoice, l.clipText); for (const s of l.splits) add(s && s.id, s && s.voice_id, s && s.text) }
  return idx
}
/**
 * Pure. Link plan for one pod. A speaker keeps ONE voice per scene, so a (scene, speaker) is all-or-nothing: it is linked only when ONE good
 * voice has a text-identical existing clip for every line (main clip and each split); otherwise it is HELD whole, and the lines with no clip
 * are the gaps. Never a near match, never a render.
 */
function planLink(lines, idx, gender = speakerGender(lines)) {
  const groups = new Map()
  for (const l of lines) { if (!l.clip) continue; const k = `${l.scene}|${l.speaker}`; (groups.get(k) || groups.set(k, []).get(k)).push(l) }
  const links = [], held = [], gaps = []
  for (const [key, ls] of groups) {
    const g = gender[ls[0].speaker], cands = GOOD_VOICES[g] || []
    const tries = cands.map(v => {
      const out = [], miss = []
      for (const l of ls) {
        const need = [{ part: 'main', old: l.clip, text: l.clipText || l.text }, ...l.splits.map((c, i) => ({ part: `split${i}`, old: c && c.id, text: c && c.text }))]
        for (const n of need) {
          if (!n.old || !n.text) continue
          const id = idx.get(`${bare(v)}|${norm(n.text)}`)
          if (id) out.push({ line: l.id, part: n.part, old: n.old, id, voice: v, text: n.text }); else miss.push({ line: l.id, scene: l.scene, speaker: l.speaker, gender: g, part: n.part, text: n.text })
        }
      }
      return { out, miss }
    })
    const best = tries.sort((a, b) => a.miss.length - b.miss.length)[0]
    if (best && !best.miss.length) links.push(...best.out)
    else { held.push({ key, speaker: ls[0].speaker, scene: ls[0].scene, gender: g, lines: ls.length }); gaps.push(...(best ? best.miss : ls.map(l => ({ line: l.id, scene: l.scene, speaker: l.speaker, gender: g || '?', part: 'main', text: l.text })))) }
  }
  return { links, held, gaps }
}
module.exports = { speakerGender, buildIndex, planLink, rolesFor, englishTrack, norm, OLD, GOOD_VOICES }
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
  if (mode === 'link') {
    const arg = n => (process.argv.find(a => a.startsWith(`--${n}=`)) || '').split('=')[1]
    const apply = has('--apply'), sources = (arg('source') || 'ita_for_eng').split(','), sceneOnly = arg('only-scene')
    const courses = has('--all') ? await englishCourses() : (arg('courses') || '').split(',').filter(Boolean)
    if (!courses.length) { console.error('name --courses=a,b or --all'); process.exit(1) }
    if (apply && (has('--all') || courses.length !== 1 || courses[0] !== 'nld_for_eng')) { console.error('--apply is limited to --courses=nld_for_eng this job'); process.exit(1) }
    const idx = buildIndex((await Promise.all(sources.map(podLines))).filter(Boolean))
    const report = {}
    for (const c of courses) {
      const p = await podLines(c); if (!p) { report[c] = { missing: true }; continue }
      const plan = planLink(p.lines, idx)
      let { links } = plan
      if (sceneOnly) { const ids = new Set(p.lines.filter(l => String(l.scene) === sceneOnly).map(l => l.id)); links = links.filter(x => ids.has(x.line)) }
      const r = rolesFor(c), body = links.filter(x => x.old !== x.id).map(x => ({ podSentenceId: x.line, role: x.part === 'main' ? r.main : r.split, audioId: x.id, replace: true, expectCurrent: x.old }))
      let linked = 0, refused = []
      if (apply) for (let i = 0; i < body.length; i += 100) {
        const res = await post(`/api/production/${c}/link-clip`, { links: body.slice(i, i + 100), dryRun: false })
        if (!res.body.results) { refused.push({ status: res.status, body: res.body }); break }
        linked += res.body.linked || 0; refused.push(...res.body.results.filter(x => !x.ok))
        if (refused.length) break   // a refusal is the answer: stop, never retry
      } else if (body.length) {
        const res = await post(`/api/production/${c}/link-clip`, { links: body.slice(0, 500), dryRun: true })
        refused = (res.body.results || []).filter(x => !x.ok); if (!res.body.results) refused.push({ status: res.status, body: res.body })
      }
      report[c] = { lines: p.lines.length, planned: body.length, held: plan.held.length, gaps: plan.gaps.length, linked, refused: refused.length, refusedSample: refused.slice(0, 3), gapList: plan.gaps, heldList: plan.held }
      console.log(`${apply ? 'APPLY' : 'DRY'} ${c}: lines ${p.lines.length}; links planned ${body.length}; speaker-scenes held ${plan.held.length}; gap clips ${plan.gaps.length}; linked ${linked}; refused ${refused.length}`)
    }
    fs.writeFileSync(path.join(DIR, `link-${apply ? 'applied' : 'dry'}-${Date.now()}.json`), JSON.stringify(report, null, 1))
    return
  }
  console.error('modes: census | link'); process.exit(1)
})().catch(e => { console.error(e); process.exit(1) })
