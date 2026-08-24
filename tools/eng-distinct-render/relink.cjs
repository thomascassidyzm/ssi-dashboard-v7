#!/usr/bin/env node
/**
 * Relink every pod-0 English slot onto the shared clip for its (distinct text × cast voice).
 * This is make-before-break step 3 — and it runs ONLY against clips already proved alive:
 * a newly rendered clip must have passed verify.cjs, a reuse-credited clip must have passed
 * sweep-reused.cjs. A unit with no proved clip relinks nothing and is reported as a gap.
 *
 * Nothing is deleted and nothing is overwritten. The old clip and its S3 object stay exactly
 * where they are; only the slot's pointer moves, so the whole pass replays backwards from
 * its own log.
 *
 * EXCLUSIONS, stated rather than implied:
 *   - cym_n_for_eng / cym_s_for_eng entirely. 23 of their pod-0 English slots are Aran's
 *     human recordings and are never touched; the other 439 are empty and are LEFT empty,
 *     because filling them means synthesising English into a human-voiced course, which is
 *     the same ruling (Tom 2026-07-25) that made tts-service refuse those courses at the
 *     chokepoint. Every prior pod-0 pass excluded cym_* for exactly this reason.
 *   - slots whose speaker resolves to no gender, so no cast voice can be derived.
 *
 * The before-state is asserted in the UPDATE itself: a row is only written if its current
 * value is still the one the plan was built from. A row that moved under us simply does not
 * update, and the count mismatch is reported as drift rather than silently overwritten.
 *
 *   node tools/eng-distinct-render/relink.cjs            # DRY RUN
 *   node tools/eng-distinct-render/relink.cjs --apply
 */
const fs = require('fs')
const path = require('path')
const { q } = require('./db.cjs')

const APPLY = process.argv.includes('--apply')
const D = __dirname
const rows = JSON.parse(fs.readFileSync(D + '/slots-resolved.json'))

// ---- the proved-clip index -------------------------------------------------
const clip = new Map()
let nRendered = 0, nReused = 0

const verified = new Map()
if (fs.existsSync(D + '/verify-results.json')) {
  for (const v of JSON.parse(fs.readFileSync(D + '/verify-results.json'))) {
    const ok = v.alive && v.voice_ok && v.decodable && v.duration_agrees !== false && !v.rate_outlier && !v.fail
    if (ok) verified.set(v.audio_id, v)
  }
}
for (const l of fs.readFileSync(D + '/render-log.jsonl', 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(l)
  if (!r.ok || r.skipped) continue
  if (!verified.has(r.audio_id)) continue          // unverified clip never gets linked
  clip.set(r.norm + ' ' + r.voice, { id: r.audio_id, s3_key: r.s3_key, source: 'rendered' })
  nRendered++
}
for (const r of JSON.parse(fs.readFileSync(D + '/reused-liveness.json'))) {
  if (!r.alive) continue
  const k = r.norm + ' ' + r.voice
  if (clip.has(k)) continue
  clip.set(k, { id: r.audio_id, s3_key: r.s3_key, source: 'reused' })
  nReused++
}
console.log(`proved clips: ${clip.size} (${nRendered} rendered+verified, ${nReused} reuse-credited+alive)`)

// ---- the plan --------------------------------------------------------------
const HUMAN = /^cym_/, TEST = /^zzz_test/
const plan = []
const tally = { welsh_excluded: 0, test_excluded: 0, no_cast_voice: 0, empty_text: 0, no_proved_clip: 0, already_on_cast_untouched: 0, relink: 0 }
const noClip = new Map()
for (const r of rows) {
  if (HUMAN.test(r.course_code)) { tally.welsh_excluded++; continue }
  if (TEST.test(r.course_code)) { tally.test_excluded++; continue }
  if (!r.want) { tally.no_cast_voice++; continue }
  if (!r.norm) { tally.empty_text++; continue }
  // ALREADY CORRECT SLOTS ARE LEFT ALONE. The recount counted 1,790 slots already on the
  // right cast voice as "no work", and that is the scope Tom approved. Such a slot is
  // linked to a per-course clip of the same words in the same voice — repointing it at the
  // shared row would change the uuid a learner's cache keys on for zero audible gain, and
  // would be work he did not ask for. Sharing is for slots that are wrong or empty.
  if (r.aid && r.cur === r.want) { tally.already_on_cast_untouched++; continue }
  const c = clip.get(r.norm + ' ' + r.want)
  if (!c) { tally.no_proved_clip++; noClip.set(r.norm + ' ' + r.want, (noClip.get(r.norm + ' ' + r.want) || 0) + 1); continue }
  tally.relink++
  plan.push({
    sentence_id: r.sentence_id, course_code: r.course_code, pod_id: r.pod_id,
    column: r.side === 'known' ? 'known_audio_id' : 'target_audio_id',
    from: r.aid || null, to: c.id, source: c.source,
    from_voice: r.cur || null, to_voice: r.want, text: r.txt,
  })
}
console.log('slot disposition:', JSON.stringify(tally, null, 1))
console.log('relink by source:', JSON.stringify(plan.reduce((a, p) => (a[p.source] = (a[p.source] || 0) + 1, a), {})))
console.log('relink by column:', JSON.stringify(plan.reduce((a, p) => (a[p.column] = (a[p.column] || 0) + 1, a), {})))
console.log('relink from-voice:', JSON.stringify(plan.reduce((a, p) => (a[p.from_voice || 'unlinked'] = (a[p.from_voice || 'unlinked'] || 0) + 1, a), {})))
console.log('courses touched:', new Set(plan.map(p => p.course_code)).size)
if (noClip.size) console.log(`units with no proved clip yet: ${noClip.size} (covering ${tally.no_proved_clip} slots)`)

fs.writeFileSync(D + `/relink-${APPLY ? 'applied' : 'dryrun'}-plan.json`, JSON.stringify(plan))
fs.writeFileSync(D + '/relink-gaps.json', JSON.stringify([...noClip.entries()].map(([k, n]) => ({ unit: k, slots: n })), null, 1))

if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply.'); process.exit(0) }

// ---- apply -----------------------------------------------------------------
;(async () => {
  const log = []
  let written = 0, drifted = 0
  for (const column of ['known_audio_id', 'target_audio_id']) {
    const set = plan.filter(p => p.column === column)
    for (let i = 0; i < set.length; i += 500) {
      const batch = set.slice(i, i + 500)
      const ids = batch.map(b => b.sentence_id)
      const froms = batch.map(b => b.from)
      const tos = batch.map(b => b.to)
      const r = await q(
        `UPDATE listening_pod_sentences s SET ${column} = v.to_id::uuid
         -- listening_pod_sentences.id is TEXT while the audio columns are UUID; the arrays
         -- must be cast per column or the join operator does not resolve.
         FROM (SELECT unnest($1::text[]) AS id, unnest($2::uuid[]) AS from_id, unnest($3::uuid[]) AS to_id) v
         WHERE s.id = v.id AND s.${column} IS NOT DISTINCT FROM v.from_id
         RETURNING s.id`, [ids, froms, tos])
      written += r.length
      const got = new Set(r.map(x => x.id))
      for (const b of batch) if (!got.has(b.sentence_id)) { drifted++; log.push({ ...b, result: 'drift — before-state no longer matched, NOT written' }) }
      for (const b of batch) if (got.has(b.sentence_id)) log.push({ ...b, result: 'relinked' })
      console.log(`  ${column} ${Math.min(i + 500, set.length)}/${set.length} written=${written} drift=${drifted}`)
    }
  }
  console.log(`\nRELINKED ${written} slots, ${drifted} skipped on drift (of ${plan.length} planned)`)
  fs.writeFileSync(D + '/relink-applied-log.json', JSON.stringify(log))
})().catch(e => { console.error(e); process.exit(1) })
