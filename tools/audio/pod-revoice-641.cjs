#!/usr/bin/env node
/**
 * POD TARGET-LINE RE-VOICE (job #641, Tom 2026-10-12 01:22Z: "re-record the pod-1 for Mexican spanish ... in the new voices").
 * Moves every non-cast TARGET clip of one listening pod onto the variety's cast voice (voice_language_roles phrase slot, rank 0:
 * female -> f, male -> m; the gender comes from the clip's OLD voice, so each speaker keeps their sex). Same shape as charlotte-backfill.cjs:
 * Popty's ONE render route (library-first, spend-guarded, no retries), verify-then-swap, write-ahead ledger, never deletes a clip.
 *
 *   node tools/audio/pod-revoice-641.cjs --pod spa_mx_for_eng:pod-1 --cast spa_mx --budget 20000 [--dry-run] [--render-only]
 *   node tools/audio/pod-revoice-641.cjs --pod spa_mx_for_eng:pod-1 --cast spa_mx --undo
 *
 * Clips live in THREE places on listening_pod_sentences: target_audio_id (the full line), sentence_audio_ids[] and takeg_audio_ids[]
 * (ordered segment indexes with NO foreign key). Arrays are swapped with array_replace, which keeps every position.
 * --render-only renders and ledgers 'rendered' lines but moves nothing; re-running without it finds each clip in the library (free) and repoints.
 * Known (English) lines are not touched. When the swap is done the pod's speakers.<name>.target is rewritten to the cast voice.
 */
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
const { Client } = require('pg')
const { evidencePath } = require('../lib/evidence-path.cjs')
const { runBudgeted } = require('./charlotte-backfill.cjs')

const argv = process.argv.slice(2)
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const has = f => argv.includes(f)
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const AUDIO_BASE = process.env.LEARNER_AUDIO_BASE || 'https://saysomethingin.app/api/audio'
const JOB = '#641'
const bare = v => String(v || '').replace(/^cartesia_/, '')
// azure/xAI names -> sex; anything not here is reported and skipped, never guessed
const FEMALE = /(carlota|dalia|elvira|paloma|eve|ara|nova|sonia|olivia)/i, MALE = /(luciano|jorge|alvaro|marcos|leo|rex|sal|ryan|tom)/i
const sexOf = v => (FEMALE.test(v) ? 'f' : MALE.test(v) ? 'm' : null)

async function main() {
  const podId = opt('--pod'), cast = opt('--cast')
  if (!podId || !cast) { console.error('--pod and --cast required'); process.exit(1) }
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await pg.connect()
  const course = podId.split(':')[0]
  const ledger = evidencePath(`641/${podId.replace(':', '-')}-ledger.jsonl`)
  const castFor = async g => (await pg.query(`select vlr.voice_id, v.display_name from voice_language_roles vlr join voices v using (voice_id)
     where vlr.slot='phrase' and vlr.language=$1 and vlr.gender=$2 and vlr.rank=0 and v.is_active and vlr.voice_id like 'cartesia\\_%'`, [cast, g])).rows[0]
  const cv = { f: await castFor('f'), m: await castFor('m') }
  if (!cv.f || !cv.m) { console.log(`NO CAST for ${cast}: f=${cv.f && cv.f.voice_id} m=${cv.m && cv.m.voice_id}`); return pg.end() }

  if (has('--undo')) {
    const lines = fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
    const undone = new Set(lines.filter(l => l.kind === 'undo').map(l => `${l.oldId}|${l.newId}`))
    let n = 0
    for (const e of lines.filter(l => l.kind === 'swap' && !undone.has(`${l.oldId}|${l.newId}`)).reverse()) {
      await swap(pg, podId, e.newId, e.oldId); fs.appendFileSync(ledger, JSON.stringify({ kind: 'undo', oldId: e.oldId, newId: e.newId, at: new Date().toISOString() }) + '\n'); n++
    }
    console.log(`undone ${n} swaps`); return pg.end()
  }

  const { rows } = await pg.query(`select ca.id::text, ca.text, ca.role, ca.voice_id, ca.language, min(x.go) pos from (
      select target_audio_id i, global_order go from listening_pod_sentences where pod_id=$1 and target_audio_id is not null
      union all select unnest(sentence_audio_ids), global_order from listening_pod_sentences where pod_id=$1
      union all select unnest(takeg_audio_ids), global_order from listening_pod_sentences where pod_id=$1) x
    join course_audio ca on ca.id = x.i where ca.voice_id not in ($2,$3,$4,$5) group by ca.id`, [podId, cv.f.voice_id, bare(cv.f.voice_id), cv.m.voice_id, bare(cv.m.voice_id)])
  const work = []; const skipped = []
  for (const r of rows) {
    const g = sexOf(r.voice_id)
    if (!g || !['target1', 'target2'].includes(r.role)) { skipped.push(`${r.id} ${r.role} ${r.voice_id}`); continue }
    work.push({ oldId: r.id, text: r.text, role: r.role, oldVoice: r.voice_id, language: r.language, target: cv[g].voice_id, chars: r.text.length, pos: r.pos, slots: [] })
  }
  work.sort((a, b) => a.pos - b.pos)
  const total = work.reduce((n, w) => n + w.chars, 0)
  console.log(`${podId} -> f ${cv.f.display_name} / m ${cv.m.display_name}: ${work.length} old clips, ${total} chars, ${skipped.length} skipped${skipped.length ? ' ' + skipped.slice(0, 3).join('; ') : ''}`)
  const budget = Number(opt('--budget', 0)), dryRun = has('--dry-run'), renderOnly = has('--render-only')
  let moved = 0
  const render = async w => {
    const res = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-641-pod-revoice' },
      body: JSON.stringify({ courseCode: course, role: w.role, text: w.text, language: w.language, voiceId: w.target, job: JOB, dryRun,
        purpose: `Tom 2026-10-12: ${podId} target lines -> cast voice (${cast}), job #641` }) })
    return { status: res.status, ...(await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) }
  }
  const verify = async (r, w) => {
    const { rows: [c] } = await pg.query('select voice_id, s3_key, audio_revision from course_audio where id=$1', [r.audioId])
    if (!c) return 'row missing'
    if (bare(c.voice_id) !== bare(w.target)) return `voice is ${c.voice_id}`
    if (!c.s3_key || c.s3_key.startsWith('pending/')) return 'no object'
    const ref = c.audio_revision > 1 ? `${r.audioId}.v${c.audio_revision}` : r.audioId
    const res = await fetch(`${AUDIO_BASE}/${ref}`, { headers: { 'User-Agent': 'job-641' } })
    if (!res.ok) return `proxy HTTP ${res.status}`
    return (await res.arrayBuffer()).byteLength > 2000 ? null : 'tiny'
  }
  const commit = async (w, r) => {
    if (renderOnly) { fs.appendFileSync(ledger, JSON.stringify({ kind: 'rendered', oldId: w.oldId, newId: r.audioId, oldVoice: w.oldVoice, text: w.text, source: r.source, charsSpent: r.charsSpent || 0, at: new Date().toISOString() }) + '\n'); return }
    fs.appendFileSync(ledger, JSON.stringify({ kind: 'swap', oldId: w.oldId, newId: r.audioId, oldVoice: w.oldVoice, text: w.text, source: r.source, charsSpent: r.charsSpent || 0, at: new Date().toISOString() }) + '\n')
    moved += await swap(pg, podId, w.oldId, r.audioId)
  }
  // runBudgeted calls verify(r) with one argument; close over the clip by wrapping render's result
  const byNew = new Map()
  const out = await runBudgeted(work, { budget, dryRun, concurrency: Number(process.env.CONCURRENCY || 3),
    render: async w => { const r = await render(w); if (r.ok && r.audioId) byNew.set(r.audioId, w); return r },
    verify: r => verify(r, byNew.get(r.audioId)), commit })
  console.log(`OUTSTANDING ${work.length - out.done}`)
  console.log(`SKIPPED-BUDGET ${out.budgetSkipped}`)
  if (!dryRun && !renderOnly && out.done === work.length) await speakers(pg, podId, cv, cast)
  console.log(`done ${out.done} clips, ${moved} sentence rows repointed, ${out.spent} chars spent. ledger ${ledger}`)
  await pg.end()
}

/** Swap every pod reference to oldId (single column + both ordered arrays). Returns rows touched. */
async function swap(pg, podId, oldId, newId) {
  const q = (sql) => pg.query(sql, [podId, oldId, newId]).then(r => r.rowCount)
  return (await q(`update listening_pod_sentences set target_audio_id=$3 where pod_id=$1 and target_audio_id=$2`))
    + (await q(`update listening_pod_sentences set sentence_audio_ids=array_replace(sentence_audio_ids,$2::uuid,$3::uuid) where pod_id=$1 and $2::uuid = any(sentence_audio_ids)`))
    + (await q(`update listening_pod_sentences set takeg_audio_ids=array_replace(takeg_audio_ids,$2::uuid,$3::uuid) where pod_id=$1 and $2::uuid = any(takeg_audio_ids)`))
}

/** Pod speakers: target = the cast voice of the speaker's gender. */
async function speakers(pg, podId, cv, cast) {
  const { rows: [p] } = await pg.query('select speakers from listening_pods where id=$1', [podId])
  const sp = p.speakers
  for (const k of Object.keys(sp)) {
    const g = sp[k].gender === 'f' || sp[k].gender === 'm' ? sp[k].gender : null
    if (!g) continue
    sp[k].target = { name: cv[g].display_name, locale: 'spa', provider: 'cartesia', voice_id: bare(cv[g].voice_id) }
  }
  await pg.query('update listening_pods set speakers=$2, updated_at=now() where id=$1', [podId, JSON.stringify(sp)])
  console.log('speakers.target rewritten')
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })
