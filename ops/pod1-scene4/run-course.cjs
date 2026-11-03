#!/usr/bin/env node
/**
 * ops/pod1-scene4/run-course.cjs — job #799: put Kai's coffee invitation into ONE course's live Pod 1 Scene 4,
 * through the held-slug switchover, exactly as the ita_for_eng probe did by hand (2026-11-03).
 *
 *   node ops/pod1-scene4/run-course.cjs <course>            # does it (each step guarded; stops the course on any refusal)
 *
 * It touches the database ONLY through Popty routes and committed, merged tools run unchanged:
 *   GET  /api/pods/:course/:slug                 read live / held rows (public)
 *   node tools/pods/clone-pod.cjs --apply        copy pod-1 to the held slug (not served)
 *   POST /api/audio/render (podSentenceId)       one route for audio; the voice is the live line's own clip voice
 *   PATCH /api/admin/pod-sentences/:id           held rows only, signed --key job799 (nulls that side's audio + splits)
 *   POST /api/production/:course/link-clip       fill-only
 *   node tools/pods/language-text-for-staged-pod.cjs   move the named lines of the language text, bind held / promoted pod
 *   node tools/pods/pod-switchover.cjs --apply   archive + progress migration + promote, one transaction
 * --accept-uncast-pod is passed because pod-cast-gate compares "cartesia_<uuid>" clip voices against bare cast uuids and
 * calls every clip off-cast (it lists Sarah's own voice as "not in" a cast that contains it); the live pod already serves
 * those very clips. Any OTHER switchover refusal stops the course.
 * Never touches the Welsh courses (Tom, r-2026-11-03-welsh-pods-human-recorded). Writes ops/pod1-scene4/state.json.
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { execFileSync, spawnSync } = require('child_process')

const ROOT = path.resolve(__dirname, '../..')
const POPTY = 'http://localhost:3470'
const HELD = 'pod-1-staged-2026-11-03'
const STAMP = '2026-11-03'
const STATE = path.join(__dirname, 'state.json')
const WELSH = new Set(['cym_n_for_eng', 'cym_s_for_eng'])
const course = process.argv[2]
if (!course) { console.error('usage: run-course.cjs <course>'); process.exit(64) }

const drafts = JSON.parse(fs.readFileSync(path.join(__dirname, 'drafts.json'), 'utf8')).drafts.filter(d => d.course === course)
const loadState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {})
const save = (patch) => { const s = loadState(); s[course] = { ...(s[course] || {}), ...patch, at: new Date().toISOString() }; fs.writeFileSync(STATE, JSON.stringify(s, null, 1) + '\n') }
const log = (...a) => console.log(`[${course}]`, ...a)
const stop = (state, why, extra = {}) => { save({ state, why, ...extra }); log(state.toUpperCase(), why); process.exit(state === 'live' ? 0 : 3) }

async function getPod (slug) {
  const r = await fetch(`${POPTY}/api/pods/${course}/${slug}`)
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`GET pod ${slug}: ${r.status}`)
  return r.json()
}
async function render (body) {
  const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': `job799-${course}` }, body: JSON.stringify({ courseCode: course, purpose: '#799 pod-1 scene 4 coffee line', job: '#799', ...body }) })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}
function signed (step, method, p, body) {
  const out = spawnSync('node', [path.join(ROOT, 'tools/agent-admin/call.cjs'), '--key', 'job799', '--agent', `job799-${step}`, method, p, JSON.stringify(body)], { encoding: 'utf8', cwd: ROOT })
  let json = null; try { json = JSON.parse(out.stdout) } catch { /* not json */ }
  return { ok: out.status === 0, json, raw: (out.stdout || '') + (out.stderr || '') }
}
function tool (args, timeout = 300000) {
  const out = spawnSync('node', args, { encoding: 'utf8', cwd: ROOT, timeout })
  return { code: out.status, out: (out.stdout || '') + (out.stderr || '') }
}
async function linkClips (links, dryRun) {
  const r = await fetch(`${POPTY}/api/production/${course}/link-clip`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': `job799-${course}-link` }, body: JSON.stringify({ links, dryRun }) })
  return r.json()
}

;(async () => {
  if (WELSH.has(course)) stop('skipped-welsh', 'human-recorded Welsh pod: unchanged by Tom\'s ruling r-2026-11-03-welsh-pods-human-recorded')
  if (!drafts.length) stop('held', 'no drafts for this course')
  const prior = loadState()[course]
  if (prior && prior.state === 'live') { log('already live'); process.exit(0) }

  // 1. drift guard: the live lines must still say what the drafts were written against
  const live = await getPod('pod-1')
  if (!live) stop('held', 'no live pod-1')
  const liveById = new Map(live.sentences.map(r => [r.id, r]))
  for (const d of drafts) {
    const r = liveById.get(d.id)
    if (!r) stop('held', `live pod-1 has no row ${d.id}`)
    if ((r.target_text || '') !== (d.target_before || '') || (r.known_text || '') !== (d.known_before || '')) stop('held', `live text of ${d.id} no longer matches the draft's "before" — not touched`)
  }
  const speakers = live.pod.speakers || {}
  const { castFor } = require(path.join(ROOT, 'services/shared/pod-line-voice.cjs'))
  const genderOf = (label) => ((castFor(speakers, label) || {}).gender === 'f' ? 'f' : 'm')

  // 2. held pod: clone unless a previous run already made it
  let held = await getPod(HELD)
  if (!held) {
    const c = tool(['tools/pods/clone-pod.cjs', `--course=${course}`, `--to=${HELD}`, '--apply'])
    if (c.code !== 0 || !/verified_rows/.test(c.out)) stop('held', `clone refused: ${c.out.split('\n').filter(l => /REFUSED|FAILED|Error/.test(l)).join(' ').slice(0, 400)}`)
    held = await getPod(HELD)
    if (!held || held.sentences.length !== live.sentences.length) stop('held', `clone row count ${held && held.sentences.length} != live ${live.sentences.length}`)
    save({ state: 'in-progress', step: 'cloned' })
  }
  const heldId = (id) => id.replace(`${course}:pod-1:`, `${course}:${HELD}:`)
  const heldById = new Map(held.sentences.map(r => [r.id, r]))

  // 3. render every changed side (dry run first; a refusal stops the course before any switchover)
  const audio = (loadState()[course] || {}).audio || {}
  let chars = (loadState()[course] || {}).chars || 0
  const jobs = []
  for (const d of drafts) {
    if ((d.target_after || '') !== (d.target_before || '') && d.target_after) jobs.push({ d, side: 'target', role: genderOf(d.speaker) === 'f' ? 'target1' : 'target2', text: d.target_after })
    if ((d.known_after || '') !== (d.known_before || '') && d.known_after) jobs.push({ d, side: 'known', role: 'known', text: d.known_after })
  }
  for (const j of jobs) {
    const key = `${j.d.line}:${j.side}`
    if (audio[key]) continue
    const dry = await render({ role: j.role, podSentenceId: j.d.id, text: j.text, dryRun: true })
    if (!dry.body.ok) stop('blocked', `render refused (dry run) ${key}: ${dry.status} ${dry.body.code || ''} ${String(dry.body.error || '').slice(0, 300)}`, { audio, chars })
    const real = await render({ role: j.role, podSentenceId: j.d.id, text: j.text })
    if (!real.body.ok || !real.body.audioId) stop('blocked', `render refused ${key}: ${real.status} ${real.body.code || ''} ${String(real.body.error || '').slice(0, 300)}`, { audio, chars })
    audio[key] = real.body.audioId; chars += real.body.charsSpent || 0
    save({ state: 'in-progress', step: 'rendering', audio, chars })
    log(`render ${key} ${real.body.source} ${real.body.charsSpent || 0} chars -> ${real.body.audioId}`)
  }

  // 4. edit the HELD rows (only the fields that change) — never the live pod
  for (const d of drafts) {
    const hid = heldId(d.id); const h = heldById.get(hid)
    if (!h) stop('held', `held pod has no row ${hid}`)
    const patch = {}
    if ((d.target_after || '') !== (d.target_before || '') && h.target_text !== d.target_after) patch.target_text = d.target_after
    if ((d.known_after || '') !== (d.known_before || '') && h.known_text !== d.known_after) patch.known_text = d.known_after
    if (!Object.keys(patch).length) continue
    const r = signed(`${course}-edit`.slice(0, 50), 'PATCH', `/api/admin/pod-sentences/${hid}`, patch)
    if (!r.ok || !r.json || !r.json.ok) stop('held', `held row edit refused ${hid}: ${r.raw.slice(0, 300)}`, { audio, chars })
  }
  save({ state: 'in-progress', step: 'edited', audio, chars })

  // 5. attach (fill-only), dry run first
  held = await getPod(HELD)
  const heldNow = new Map(held.sentences.map(r => [r.id, r]))
  const links = []
  for (const j of jobs) {
    const hid = heldId(j.d.id); const h = heldNow.get(hid)
    const col = j.side === 'target' ? 'target_audio_id' : 'known_audio_id'
    if (h[col] === audio[`${j.d.line}:${j.side}`]) continue
    links.push({ podSentenceId: hid, role: j.side, audioId: audio[`${j.d.line}:${j.side}`] })
  }
  if (links.length) {
    const dl = await linkClips(links, true)
    if (!dl.ok) stop('held', `link-clip dry run refused: ${JSON.stringify((dl.results || []).filter(x => !x.ok)).slice(0, 400) || dl.error}`, { audio, chars })
    const al = await linkClips(links, false)
    if (!al.ok) stop('held', `link-clip refused: ${JSON.stringify((al.results || []).filter(x => !x.ok)).slice(0, 400) || al.error}`, { audio, chars })
    const voices = Object.fromEntries((al.results || []).map(x => [`${x.slot.split(':').pop()}:${x.role}`, x.voiceId]))
    save({ voices })
  }
  held = await getPod(HELD)
  for (const d of drafts) {
    const h = held.sentences.find(r => r.id === heldId(d.id))
    if (h.target_text !== (d.target_after || h.target_text) || h.known_text !== d.known_after) stop('held', `held row ${h.id} text is not the draft after the edit`, { audio, chars })
    if ((h.target_text && !h.target_audio_id) || !h.known_audio_id) stop('held', `held row ${h.id} still has an empty audio slot`, { audio, chars })
  }

  // 6. language text: move exactly the target-edited lines, only from THIS course's "before" words
  const lines = drafts.filter(d => (d.target_after || '') !== (d.target_before || '')).map(d => held.sentences.find(r => r.id === heldId(d.id)).global_order)
  if (lines.length) {
    const dry = tool(['tools/pods/language-text-for-staged-pod.cjs', `--course=${course}`, `--staged=${HELD}`, `--lines=${lines.join(',')}`], 120000)
    const jsonStart = dry.out.indexOf('{'); let plan = null; try { plan = JSON.parse(dry.out.slice(jsonStart)) } catch { /* */ }
    if (!plan) stop('held', `language-text dry run unreadable: ${dry.out.slice(0, 300)}`, { audio, chars })
    if (plan.refuse) stop('held', `language text: ${plan.refuse}`, { audio, chars })
    if (plan.result !== 'no-language-text') {
      const befores = new Set(drafts.map(d => d.target_before))
      const foreign = (plan.moves || []).filter(m => !befores.has(m.from))
      if (foreign.length) stop('held', `language text at ${foreign.map(m => m.global_order)} is not this course's old words (another course moved it?) — not overwritten`, { audio, chars })
      const ap = tool(['tools/pods/language-text-for-staged-pod.cjs', `--course=${course}`, `--staged=${HELD}`, `--lines=${lines.join(',')}`, '--apply'], 120000)
      if (ap.code !== 0 || !/"applied": true/.test(ap.out)) stop('held', `language text move refused: ${ap.out.slice(-400)}`, { audio, chars })
      save({ languageText: { moved: (plan.moves || []).map(m => m.global_order), bound: true } })
    } else save({ languageText: 'none' })
  }

  // 7. switchover: dry run, then apply
  const base = ['tools/pods/pod-switchover.cjs', `--course=${course}`, `--staged=${HELD}`, `--stamp=${STAMP}`, '--accept-uncast-pod']
  const sd = tool(base, 400000)
  const mig = (sd.out.match(/carry (\d+), keep (\d+), merge (\d+), drop (\d+)/) || []).slice(1).map(Number)
  if (sd.code !== 0 || !/DRY RUN/.test(sd.out)) stop('held', `switchover dry run refused: ${sd.out.split('\n').filter(l => /REFUSED|^\s+- /.test(l)).filter(l => !/off the pod cast|does not belong to their own row/.test(l)).join(' | ').slice(0, 600)}`, { audio, chars })
  const sa = tool([...base, '--apply'], 400000)
  if (sa.code !== 0 || !/switched\./.test(sa.out)) stop('held', `switchover apply failed: ${sa.out.slice(-600)}`, { audio, chars, migrationPlan: mig })
  save({ state: 'in-progress', step: 'switched', migrationPlan: { carry: mig[0], keep: mig[1], merge: mig[2], drop: mig[3] }, switchoverResult: (sa.out.match(/learner progress: .*/) || [''])[0] })

  // 8. re-bind the promoted pod to its language text (movePod drops the flag)
  const bd = tool(['tools/pods/language-text-for-staged-pod.cjs', `--course=${course}`, '--bind=pod-1', '--apply'], 120000)
  const bound = /"applied": true|no-language-text/.test(bd.out)

  // 9. verify what learners are now served
  const after = await getPod('pod-1')
  for (const d of drafts) {
    const r = after.sentences.find(x => x.id === d.id)
    if (!r || r.target_text !== (d.target_after || r.target_text) || r.known_text !== d.known_after) stop('held', `post-switch: live ${d.id} does not carry the new text (switched — investigate)`, { audio, chars })
    for (const j of jobs.filter(j => j.d.line === d.line)) {
      const col = j.side === 'target' ? 'target_audio_id' : 'known_audio_id'
      if (r[col] !== audio[`${d.line}:${j.side}`]) stop('held', `post-switch: live ${d.id} ${col} is ${r[col]}, expected ${audio[`${d.line}:${j.side}`]}`, { audio, chars })
    }
  }
  if (after.sentences.length !== live.sentences.length) stop('held', `post-switch row count ${after.sentences.length} != ${live.sentences.length}`, { audio, chars })
  stop('live', `served: ${drafts.length} line(s) new, audio linked${bound ? '' : ' (language re-bind FAILED: ' + bd.out.slice(-200) + ')'}`, { audio, chars, rebound: bound })
})().catch((e) => stop('blocked', `error: ${e.message}`))
