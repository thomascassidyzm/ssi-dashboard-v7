#!/usr/bin/env node
/**
 * Job #333 (Aran, 2026-10-14): fill the 8 EMPTY known-audio slots of
 * cym_nv2_for_eng whose English sentence repeats one already linked in
 * the North course, using the clip already chosen for that sentence — through
 * the booth's own linkSeedTake for human_aran_eng, behind a write guard that
 * lets ONE kind of write through: course_seeds.known_audio_id on the named
 * cym_nv2_for_eng seed, set to the named clip, from NULL. Everything else
 * linkSeedTake wanted to write (other courses, incl. live cym_s_for_eng) is
 * counted and refused. No audio rendering.
 *
 *   node tools/recording/link-north-repeat-english-333.cjs           # dry run
 *   node tools/recording/link-north-repeat-english-333.cjs --apply
 */
'use strict'
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const q = require('../../services/voice-engine/recordist-queue.cjs')

const COURSE = 'cym_nv2_for_eng'
const PLAN = [ // nv2 seed number -> clip id
  [259, '7cf25e45-4c30-4e84-9bca-3b8007047fb3'], [260, 'af3797f4-bc3f-4a1c-84cd-fb7b48cbebbd'], [261, '0d156325-92a8-43ce-ba05-1a7aaaf75668'], [279, '3e9fbb93-10a9-4ef3-9f80-2afaf9f8a274'],
  [283, '3eb66c8e-2d55-462d-a575-528c2855125d'], [284, 'fca40a9b-f7b2-499e-bfc5-19900c75a5c9'], [290, '1920c3b4-703c-4645-a3dc-02c8159ce626'], [292, '5497be20-f2bf-4ec1-a846-567b5c59347e'],
]
const APPLY = process.argv.includes('--apply')

async function main() {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
  const items = []
  for (const [num, clipId] of PLAN) {
    const { data: seed } = await db.from('course_seeds').select('id, seed_number, known_text, known_audio_id').eq('course_code', COURSE).eq('seed_number', num).single()
    const { data: clip } = await db.from('course_audio').select('id, text, s3_key, voice_id').eq('id', clipId).single()
    items.push({ num, seed, clip })
  }
  return { db, items }
}

module.exports = { PLAN, COURSE }
if (require.main === module) {
  main().then(async ({ db, items }) => {
    const clipRows = items
    const allowed = new Map()
    for (const it of clipRows) {
      const ok = it.seed && it.clip && it.seed.known_audio_id == null && it.seed.known_text.trim().toLowerCase() === it.clip.text.trim().toLowerCase()
      console.log(`S${it.num} | ${it.seed && it.seed.known_text} | ${it.clip && it.clip.id} | ${ok ? 'OK' : 'REFUSED (slot filled or text mismatch)'}`)
      if (ok) allowed.set(it.seed.id, it.clip.id)
    }
    const guarded = new Proxy(db, { get(t, p) {
      if (p !== 'from') return t[p].bind ? t[p].bind(t) : t[p]
      return (table) => {
        const real = t.from(table)
        if (table !== 'course_seeds') return real
        return new Proxy(real, { get(r, m) {
          if (m !== 'update') return r[m].bind(r)
          return (vals) => ({ eq: async (col, id) => {
            const key = Object.keys(vals)[0]
            if (col === 'id' && key === 'known_audio_id' && Object.keys(vals).length === 1 && allowed.get(id) === vals.known_audio_id) {
              if (!APPLY) { guarded.wrote.push(id); return { error: null } }
              guarded.wrote.push(id); return r.update(vals).eq(col, id)
            }
            guarded.refused.push(id); return { error: null }
          } })
        } })
      }
    } })
    guarded.wrote = []; guarded.refused = []
    const recordist = await q.resolveRecordist(db, 'human_aran_eng')
    const quiet = { log() {}, warn() {}, error: console.error }
    for (const [seedId, clipId] of allowed) {
      await q.linkSeedTake({ db: guarded, recordist, seedId, role: 'known', audioId: clipId, logger: quiet })
    }
    console.log(`${APPLY ? 'WROTE' : 'WOULD WRITE'} ${guarded.wrote.length} slots; guard refused ${guarded.refused.length} other-course writes`)
  }).catch((e) => { console.error(e); process.exit(1) })
}
