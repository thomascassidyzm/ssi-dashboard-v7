#!/usr/bin/env node
/**
 * ops/pod1-scene4/recast-course.cjs — job #799, second pass: a course whose Scene 4 speaks in retired or uncast voices gets the
 * coffee lines AND the whole of Scene 4 re-voiced in its CURRENT cast, so the scene stays one voice per speaker.
 * Decision: Watson for Tom, 2026-11-03, under r-2026-10-29 (new work in the new cast voices; live content upgrades gradually
 * within the TTS budget) and r-2026-11-02 ("Re-voicing a course with its new cast within the TTS budget is not a question for
 * Tom; just do it"); eng_for_X included; ara_sy_for_eng stays held. Same doors as run-course.cjs, plus:
 *   - POST /api/audio/render { podRecast: true } — the voice is the course's current cast at the speaker's gender (phase8 resolve);
 *   - a re-record permission per course (tools/audio/rerecord-permission.cjs grant, 7 days, max 12 clips) under that ruling,
 *     because re-voicing an unchanged line ("Hello, good evening!") is a second performance of words the course already holds;
 *   - an unchanged line's held row is PATCHed with its own text, which nulls that side's whole-turn clip and its split clips.
 *   node ops/pod1-scene4/recast-course.cjs <course>
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.resolve(__dirname, '../..')
const POPTY = 'http://localhost:3470'
const HELD = 'pod-1-staged-2026-11-03'
const STAMP = '2026-11-03-c799'
const STATE = path.join(__dirname, 'state.json')
const NEVER = new Set(['cym_n_for_eng', 'cym_s_for_eng', 'ara_sy_for_eng'])
const WHY = 'Tom 2026-11-02, r-2026-11-02-re-voicing-a-course-with-its: "Re-voicing a course with its new cast within the TTS budget is not a question for Tom; just do it"; with r-2026-10-29 (new work records in the new cast voices). Job #799 (relayed by Tom\'s Watson 2026-11-03): Pod 1 Scene 4 re-voiced whole in the current cast so the coffee lines and the scene share one voice per speaker'
const course = process.argv[2]
if (!course) { console.error('usage: recast-course.cjs <course>'); process.exit(64) }

const drafts = JSON.parse(fs.readFileSync(path.join(__dirname, 'drafts.json'), 'utf8')).drafts.filter(d => d.course === course)
const loadState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {})
const save = (patch) => { const s = loadState(); s[course] = { ...(s[course] || {}), ...patch, at: new Date().toISOString() }; fs.writeFileSync(STATE, JSON.stringify(s, null, 1) + '\n') }
const log = (...a) => console.log(`[${course}]`, ...a)
const stop = (state, why, extra = {}) => { save({ state, why, pass: 'recast', ...extra }); log(state.toUpperCase(), why); process.exit(state === 'live' ? 0 : 3) }

async function getPod (slug) {
  const r = await fetch(`${POPTY}/api/pods/${course}/${slug}`)
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`GET pod ${slug}: ${r.status}`)
  return r.json()
}
async function render (body) {
  const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': `job799-${course}` }, body: JSON.stringify({ courseCode: course, purpose: '#799 pod-1 scene 4 recast in current cast', job: '#799', podRecast: true, ...body }) })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}
function signed (method, p, body) {
  const out = spawnSync('node', [path.join(ROOT, 'tools/agent-admin/call.cjs'), '--key', 'job799', '--agent', `job799-${course}-recast`.slice(0, 60), method, p, JSON.stringify(body)], { encoding: 'utf8', cwd: ROOT })
  let json = null; try { json = JSON.parse(out.stdout) } catch { /* */ }
  return { ok: out.status === 0, json, raw: (out.stdout || '') + (out.stderr || '') }
}
function tool (args, timeout = 300000, env = {}) {
  const out = spawnSync('node', args, { encoding: 'utf8', cwd: ROOT, timeout, env: { ...process.env, ...env } })
  return { code: out.status, out: (out.stdout || '') + (out.stderr || '') }
}
const jsonOf = (out) => { const m = /^\{/m.exec(out); try { return m ? JSON.parse(out.slice(m.index)) : null } catch { return null } }
async function linkClips (links, dryRun) {
  const r = await fetch(`${POPTY}/api/production/${course}/link-clip`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': `job799-${course}-link` }, body: JSON.stringify({ links, dryRun }) })
  return r.json()
}

;(async () => {
  if (NEVER.has(course)) stop(course === 'ara_sy_for_eng' ? 'held' : 'skipped-welsh', course === 'ara_sy_for_eng' ? 'pod already holds 108 draft and 6 silent lines: someone else\'s job (Watson 2026-11-03)' : 'Welsh: unchanged')
  const prior = loadState()[course]
  if (prior && prior.state === 'live') { log('already live'); process.exit(0) }

  const live = await getPod('pod-1')
  if (!live) stop('held', 'no live pod-1')
  const draftById = new Map(drafts.map(d => [d.id, d]))
  for (const d of drafts) {
    const r = live.sentences.find(x => x.id === d.id)
    if (!r) stop('held', `live pod-1 has no row ${d.id}`)
    if ((r.target_text || '') !== (d.target_before || '') || (r.known_text || '') !== (d.known_before || '')) stop('held', `live text of ${d.id} no longer matches the draft's "before" — not touched`)
  }
  const scene = live.sentences.filter(r => r.scene_number === 4)
  const { castFor } = require(path.join(ROOT, 'services/shared/pod-line-voice.cjs'))
  const genderOf = (label) => ((castFor(live.pod.speakers || {}, label) || {}).gender === 'f' ? 'f' : 'm')

  let held = await getPod(HELD)
  if (!held) {
    const c = tool(['tools/pods/clone-pod.cjs', `--course=${course}`, `--to=${HELD}`, '--apply'])
    if (c.code !== 0 || !/verified_rows/.test(c.out)) stop('held', `clone refused: ${c.out.split('\n').filter(l => /REFUSED|FAILED|Error/.test(l)).join(' ').slice(0, 400)}`)
    held = await getPod(HELD)
  }
  if (!held || held.sentences.length !== live.sentences.length) stop('held', `held row count ${held && held.sentences.length} != live ${live.sentences.length}`)
  const heldId = (id) => id.replace(`${course}:pod-1:`, `${course}:${HELD}:`)

  // every side of every Scene 4 row, in the current cast
  const jobs = []
  for (const r of scene) {
    const d = draftById.get(r.id)
    const t = d ? d.target_after : r.target_text
    const k = d ? d.known_after : r.known_text
    if (t) jobs.push({ r, side: 'target', role: genderOf(r.speaker) === 'f' ? 'target1' : 'target2', text: t, changed: !!d && t !== r.target_text, current: r.target_audio_id })
    if (k) jobs.push({ r, side: 'known', role: 'known', text: k, changed: !!d && k !== r.known_text, current: r.known_audio_id })
  }
  const st = loadState()[course] || {}
  if (!st.grant) {
    const g = tool(['tools/audio/rerecord-permission.cjs', 'grant', course, '7', WHY, '--roles', 'target1,target2,known', '--max', '12'], 60000, { TOM_SAID_RERECORD: 'yes' })
    if (g.code !== 0) stop('blocked', `re-record permission not written: ${g.out.slice(-300)}`)
    save({ grant: (g.out.match(/#\d+/) || ['written'])[0], state: 'in-progress' })
  }
  const audio = st.recastAudio || {}
  let chars = st.chars || 0
  for (const j of jobs) {
    const key = `${j.r.id.split(':').pop()}:${j.side}`
    if (audio[key]) continue
    const dry = await render({ role: j.role, podSentenceId: j.r.id, text: j.text, dryRun: true })
    if (!dry.body.ok) stop('blocked', `recast render refused (dry run) ${key}: ${dry.status} ${dry.body.code || ''} ${String(dry.body.error || '').slice(0, 300)}`, { recastAudio: audio, chars })
    const real = await render({ role: j.role, podSentenceId: j.r.id, text: j.text })
    if (!real.body.ok || !real.body.audioId) stop('blocked', `recast render refused ${key}: ${real.status} ${real.body.code || ''} ${String(real.body.error || '').slice(0, 300)}`, { recastAudio: audio, chars })
    audio[key] = real.body.audioId; chars += real.body.charsSpent || 0
    save({ state: 'in-progress', step: 'recast-rendering', recastAudio: audio, chars })
    log(`recast ${key} ${real.body.source} ${real.body.charsSpent || 0} chars -> ${real.body.audioId}`)
  }

  // held rows: a side whose clip changes is PATCHed (new text, or its own text) — that nulls its whole-turn clip and splits
  held = await getPod(HELD)
  const todo = jobs.filter(j => j.changed || audio[`${j.r.id.split(':').pop()}:${j.side}`] !== j.current)
  for (const r of scene) {
    const mine = todo.filter(j => j.r.id === r.id)
    if (!mine.length) continue
    const h = held.sentences.find(x => x.id === heldId(r.id))
    const patch = {}
    for (const j of mine) {
      const col = j.side === 'target' ? 'target_audio_id' : 'known_audio_id'
      if (h[col] === audio[`${r.id.split(':').pop()}:${j.side}`] && h[`${j.side}_text`] === j.text) continue // a re-run: already done
      patch[`${j.side}_text`] = j.text
    }
    if (!Object.keys(patch).length) continue
    const res = signed('PATCH', `/api/admin/pod-sentences/${heldId(r.id)}`, patch)
    if (!res.ok || !res.json || !res.json.ok) stop('held', `held row edit refused ${heldId(r.id)}: ${res.raw.slice(0, 300)}`, { recastAudio: audio, chars })
  }
  held = await getPod(HELD)
  const links = []
  for (const j of todo) {
    const h = held.sentences.find(x => x.id === heldId(j.r.id))
    const col = j.side === 'target' ? 'target_audio_id' : 'known_audio_id'
    const want = audio[`${j.r.id.split(':').pop()}:${j.side}`]
    if (h[col] !== want) links.push({ podSentenceId: h.id, role: j.side, audioId: want })
  }
  if (links.length) {
    const dl = await linkClips(links, true)
    if (!dl.ok) stop('held', `link-clip dry run refused: ${JSON.stringify((dl.results || []).filter(x => !x.ok)).slice(0, 400) || dl.error}`, { recastAudio: audio, chars })
    const al = await linkClips(links, false)
    if (!al.ok) stop('held', `link-clip refused: ${JSON.stringify((al.results || []).filter(x => !x.ok)).slice(0, 400) || al.error}`, { recastAudio: audio, chars })
    save({ recastVoices: Object.fromEntries((al.results || []).map(x => [`${x.slot.split(':').pop()}:${x.role}`, x.voiceId])) })
  }
  held = await getPod(HELD)
  for (const j of jobs) {
    const h = held.sentences.find(x => x.id === heldId(j.r.id))
    const col = j.side === 'target' ? 'target_audio_id' : 'known_audio_id'
    if (h[`${j.side}_text`] !== j.text || h[col] !== audio[`${j.r.id.split(':').pop()}:${j.side}`]) stop('held', `held ${h.id} ${j.side} is not the planned text+clip after the edit`, { recastAudio: audio, chars })
  }

  // language text: only the drafted (target-changed) lines move
  const lines = drafts.filter(d => (d.target_after || '') !== (d.target_before || '')).map(d => held.sentences.find(r => r.id === heldId(d.id)).global_order)
  if (lines.length) {
    const plan = jsonOf(tool(['tools/pods/language-text-for-staged-pod.cjs', `--course=${course}`, `--staged=${HELD}`, `--lines=${lines.join(',')}`], 120000).out)
    if (!plan) stop('held', 'language-text dry run unreadable', { recastAudio: audio, chars })
    if (plan.refuse) stop('held', `language text: ${plan.refuse}`, { recastAudio: audio, chars })
    if (plan.result !== 'no-language-text') {
      const befores = new Set(drafts.map(d => d.target_before))
      const foreign = (plan.moves || []).filter(m => !befores.has(m.from))
      if (foreign.length) stop('held', `language text at ${foreign.map(m => m.global_order)} is not this course's old words — not overwritten`, { recastAudio: audio, chars })
      const ap = tool(['tools/pods/language-text-for-staged-pod.cjs', `--course=${course}`, `--staged=${HELD}`, `--lines=${lines.join(',')}`, '--apply'], 120000)
      if (ap.code !== 0 || !/"applied": true/.test(ap.out)) stop('held', `language text move refused: ${ap.out.slice(-400)}`, { recastAudio: audio, chars })
    }
  }

  const base = ['tools/pods/pod-switchover.cjs', `--course=${course}`, `--staged=${HELD}`, `--stamp=${STAMP}`, '--accept-uncast-pod']
  const sd = tool(base, 400000)
  const mig = (sd.out.match(/carry (\d+), keep (\d+), merge (\d+), drop (\d+)/) || []).slice(1).map(Number)
  if (sd.code !== 0 || !/DRY RUN/.test(sd.out)) stop('held', `switchover dry run refused: ${sd.out.split('\n').filter(l => /REFUSED|^\s+- /.test(l)).filter(l => !/off the pod cast|does not belong to their own row/.test(l)).join(' | ').slice(0, 600)}`, { recastAudio: audio, chars })
  const sa = tool([...base, '--apply'], 400000)
  if (sa.code !== 0 || !/switched\./.test(sa.out)) stop('held', `switchover apply failed: ${sa.out.slice(-600)}`, { recastAudio: audio, chars })
  save({ step: 'switched', migrationPlan: { carry: mig[0], keep: mig[1], merge: mig[2], drop: mig[3] }, switchoverResult: (sa.out.match(/learner progress: .*/) || [''])[0] })
  const bd = tool(['tools/pods/language-text-for-staged-pod.cjs', `--course=${course}`, '--bind=pod-1', '--apply'], 120000)
  const bound = /"applied": true|no-language-text/.test(bd.out)

  const after = await getPod('pod-1')
  for (const j of jobs) {
    const r = after.sentences.find(x => x.id === j.r.id)
    const col = j.side === 'target' ? 'target_audio_id' : 'known_audio_id'
    if (!r || r[`${j.side}_text`] !== j.text || r[col] !== audio[`${j.r.id.split(':').pop()}:${j.side}`]) stop('held', `post-switch: live ${j.r.id} ${j.side} is not the planned text+clip (switched — investigate)`, { recastAudio: audio, chars })
  }
  stop('live', `served: Scene 4 re-voiced whole in the current cast (${jobs.length} sides), coffee lines new${bound ? '' : ' (language re-bind FAILED)'}`, { recastAudio: audio, chars, rebound: bound })
})().catch((e) => stop('blocked', `error: ${e.message}`))
