#!/usr/bin/env node
/**
 * Promote a named voice to the front of a `app_config.pod_voice_pools` gender
 * list, so the two-hander pod-sync casts is the one that was actually approved.
 *
 * Why this exists (2026-08-11): recasting `listening_pods.speakers` alone is not
 * durable. pod-sync always takes pool index 0 per gender (POD_VOICES_PER_GENDER
 * defaults to 1), so the next sync silently re-casts the course back to whatever
 * sits at the front of the pool. For `spa` that front pair was Maria `f2f41225`
 * / Pablo `d2313a0d` — the voices Tom rejected as Mexican-sounding — while the
 * Iberian Azure pair the course actually speaks in sat third in each list.
 *
 * This only REORDERS. Nothing is added, nothing is dropped: the parked depth
 * behind the front pair stays exactly as it was, in its original relative order,
 * so POD_VOICES_PER_GENDER > 1 still finds every voice it found before.
 *
 *   node tools/pod-voice-pool-reorder.cjs --pool=spa --f=es-ES-ElviraNeural --m=es-ES-AlvaroNeural
 *   … --apply
 *
 * Writes the single app_config row keyed 'pod_voice_pools'. It never touches
 * listening_pods, course_audio, or a byte of audio, and every other pool is
 * carried across unchanged — asserted before the write, not hoped for.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

let _supabase = null
function db() {
  if (!_supabase) _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return _supabase
}

function parseArgs(argv) {
  const out = { apply: false }
  for (const a of argv.slice(2)) {
    if (a === '--apply') out.apply = true
    else if (a.startsWith('--pool=')) out.pool = a.slice('--pool='.length)
    else if (a.startsWith('--f=')) out.f = a.slice('--f='.length)
    else if (a.startsWith('--m=')) out.m = a.slice('--m='.length)
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length)
  }
  return out
}

/**
 * `voiceId` first, everything else in its original order behind it.
 * Throws if the voice isn't in the list — promoting a voice a pool has never
 * held would be adding one, and this tool does not add.
 */
function promote(list, voiceId) {
  const arr = Array.isArray(list) ? list : []
  const hit = arr.find(v => v && v.voice_id === voiceId)
  if (!hit) {
    throw new Error(`"${voiceId}" is not in this pool — it holds ${arr.map(v => v && v.voice_id).join(', ') || '(nothing)'}`)
  }
  return [hit, ...arr.filter(v => v !== hit)]
}

async function run() {
  const args = parseArgs(process.argv)
  if (!args.pool || (!args.f && !args.m)) {
    console.error('usage: pod-voice-pool-reorder.cjs --pool=<key> [--f=<voice_id>] [--m=<voice_id>] [--apply]')
    process.exit(1)
  }

  const { data: row, error } = await db()
    .from('app_config').select('value').eq('key', 'pod_voice_pools').single()
  if (error) throw new Error(`load pod_voice_pools: ${error.message}`)
  const before = row.value || {}
  if (!before[args.pool]) throw new Error(`no pool "${args.pool}" — pools are ${Object.keys(before).join(', ')}`)

  const after = { ...before, [args.pool]: { ...before[args.pool] } }
  if (args.f) after[args.pool].f = promote(before[args.pool].f, args.f)
  if (args.m) after[args.pool].m = promote(before[args.pool].m, args.m)

  // Every other pool must be carried across byte-identical.
  for (const key of Object.keys(before)) {
    if (key === args.pool) continue
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      throw new Error(`pool "${key}" would change — refusing`)
    }
  }
  if (Object.keys(before).length !== Object.keys(after).length) throw new Error('pool count changed — refusing')

  const name = (v) => `${v.name} (${v.provider}:${v.voice_id})`
  for (const g of ['f', 'm']) {
    console.log(`${args.pool}.${g}:`)
    console.log(`  before  ${(before[args.pool][g] || []).map(name).join('  →  ')}`)
    console.log(`  after   ${(after[args.pool][g] || []).map(name).join('  →  ')}`)
  }
  const changed = JSON.stringify(before) !== JSON.stringify(after)
  console.log(changed ? '\npod-sync would now cast the front pair above.' : '\nalready in this order — nothing to do.')

  const log = {
    ran_at: new Date().toISOString(),
    mode: args.apply ? 'applied' : 'dryrun',
    pool: args.pool,
    promoted: { f: args.f || null, m: args.m || null },
    changed,
    before: before[args.pool],
    after: after[args.pool],
    pools_before: before,
  }
  const out = args.out || path.resolve(
    __dirname, '..', 'docs/voice-engine/pod-cast',
    `pool-reorder-${args.pool}-${args.apply ? 'applied' : 'dryrun'}-log.json`,
  )
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`log → ${out}`)

  if (!args.apply) return console.log('DRY RUN — nothing written. Re-run with --apply.')
  if (!changed) return

  // Guard: the row must still hold what we read before we overwrite it.
  const { data: fresh, error: fErr } = await db()
    .from('app_config').select('value').eq('key', 'pod_voice_pools').single()
  if (fErr) throw new Error(`re-read: ${fErr.message}`)
  if (JSON.stringify(fresh.value || {}) !== JSON.stringify(before)) {
    throw new Error('pod_voice_pools changed under this run — not overwriting')
  }
  const { error: uErr } = await db().from('app_config').update({ value: after }).eq('key', 'pod_voice_pools')
  if (uErr) throw new Error(`write: ${uErr.message}`)
  console.log('written')
}

if (require.main === module) run().catch(e => { console.error(e.message); process.exit(1) })

module.exports = { promote }
