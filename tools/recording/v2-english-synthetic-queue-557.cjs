#!/usr/bin/env node
/**
 * v2-english-synthetic-queue-557.cjs — job #557 (Aran, 2026-10-29).
 *
 * Sets `synthetic: 'queue'` on the eng policy's castOn entries for cym_nv2_for_eng / cym_sv2_for_eng KNOWN, so a
 * seed slot held by synthetic speech stays in /r/human_aran_eng (recordist-queue.cjs SYNTHETIC_MODES). The same
 * switch tools/recording/welsh-phrase-queues-619.cjs made for live North, for the two relaunch courses — it touches
 * those two castOn entries and nothing else (live cym_n/cym_s entries are left exactly as they are).
 *
 * What a take LINKS is not changed by this switch: on these two courses a take replaces a clip of the stand-in
 * voice (services/shared/aran-clone-standin.cjs, linkSeedSlotsByWords), and fills empty slots; any OTHER synthetic
 * holder this switch queues is left in its slot (fill-only) and the line counts as recorded by its words.
 *
 *   node tools/recording/v2-english-synthetic-queue-557.cjs                 # dry run: the castOn diff + what newly queues
 *   node tools/recording/v2-english-synthetic-queue-557.cjs --apply         # backup, then write
 *   node tools/recording/v2-english-synthetic-queue-557.cjs --undo [--apply] # put the two entries back as the backup had them
 *
 * Backup: ~/ssi-evidence/ssi-dashboard-v7/tools/recording/v2-english-synthetic-queue-557-backup.json (the eng row's
 * voices before every write). Undo restores ONLY the two castOn entries, so any other edit to the row since survives.
 * Never touches course content, voice_config or any audio. No TTS.
 */
'use strict'
const fs = require('fs')
const path = require('path')
const os = require('os')

const V2 = ['cym_nv2_for_eng', 'cym_sv2_for_eng']
const ENG_VOICE = 'human_aran_eng'
const BACKUP_JSON = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/tools/recording/v2-english-synthetic-queue-557-backup.json')

const isV2Known = (c) => c && V2.includes(c.courseCode) && c.role === 'known'

/** The eng row's voices with the two v2 known castOn entries' `synthetic` set to `mode` (null removes it). Pure. */
function withV2SyntheticMode(voices, mode) {
  const out = JSON.parse(JSON.stringify(voices))
  const hit = new Set()
  for (const v of Object.values(out)) {
    if (!v || v.voiceId !== ENG_VOICE) continue
    for (const c of v.castOn || []) {
      if (!isV2Known(c)) continue
      if (mode) c.synthetic = mode; else delete c.synthetic
      hit.add(c.courseCode)
    }
  }
  if (hit.size !== V2.length) throw new Error(`expected ${ENG_VOICE} castOn known entries for ${V2.join(' + ')}, found ${[...hit].join(', ') || 'none'}`)
  return out
}

/** Undo, pure: the two v2 known entries put back exactly as `before` had them; everything else as `now` has it. */
function restoreV2Entries(now, before) {
  const was = new Map()
  for (const v of Object.values(before)) for (const c of (v && v.voiceId === ENG_VOICE && v.castOn) || []) if (isV2Known(c)) was.set(c.courseCode, c)
  const out = JSON.parse(JSON.stringify(now))
  for (const v of Object.values(out)) {
    if (!v || v.voiceId !== ENG_VOICE) continue
    v.castOn = (v.castOn || []).map((c) => (isV2Known(c) && was.has(c.courseCode) ? JSON.parse(JSON.stringify(was.get(c.courseCode))) : c))
  }
  return out
}

/** The live client, with language_recording_policy answered from `policies` (a dry run's proposed rows). */
function withPolicies(db, policies) {
  return {
    from(table) {
      if (table !== 'language_recording_policy') return db.from(table)
      const ok = (data) => ({ data, error: null })
      const qq = {
        select() { return qq }, order() { return qq },
        eq(col, val) { return { ...qq, then: (r, j) => Promise.resolve(ok(policies.filter((p) => p[col] === val))).then(r, j) } },
        then(r, j) { return Promise.resolve(ok(policies)).then(r, j) },
      }
      return qq
    },
  }
}

async function main() {
  for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env']) if (fs.existsSync(p) && !process.env.SUPABASE_URL) require('dotenv').config({ path: p, quiet: true })
  const { createClient } = require('@supabase/supabase-js')
  const q = require('../../services/voice-engine/recordist-queue.cjs')
  const argv = process.argv.slice(2)
  const apply = argv.includes('--apply')
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data: rows, error } = await db.from('language_recording_policy').select('*').order('language')
  if (error) throw error
  const eng = rows.find((r) => r.language === 'eng')
  if (!eng) throw new Error('no eng policy row')
  const backups = fs.existsSync(BACKUP_JSON) ? JSON.parse(fs.readFileSync(BACKUP_JSON, 'utf8')) : []
  const backup = (label) => {
    backups.push({ takenAt: new Date().toISOString(), label, voices: eng.voices })
    fs.mkdirSync(path.dirname(BACKUP_JSON), { recursive: true })
    fs.writeFileSync(BACKUP_JSON, JSON.stringify(backups, null, 2))
  }
  const write = async (voices) => {
    const { error: e } = await db.from('language_recording_policy').update({ voices }).eq('language', 'eng')
    if (e) throw e
    const { data: after } = await db.from('language_recording_policy').select('voices').eq('language', 'eng').single()
    return after.voices
  }
  const v2Entries = (voices) => Object.values(voices).flatMap((v) => (v && v.voiceId === ENG_VOICE ? (v.castOn || []).filter(isV2Known) : []))

  if (argv.includes('--undo')) {
    const pre = backups.find((b) => b.label === 'pre-apply')
    if (!pre) throw new Error(`no pre-apply backup in ${BACKUP_JSON}`)
    const voices = restoreV2Entries(eng.voices, pre.voices)
    console.log('undo → v2 entries:', JSON.stringify(v2Entries(voices)))
    if (!apply) { console.log('(dry run: add --apply)'); return }
    backup('pre-undo')
    const after = await write(voices)
    console.log(JSON.stringify(v2Entries(after)) === JSON.stringify(v2Entries(pre.voices)) ? 'undone: v2 entries equal the pre-apply backup' : 'UNDO MISMATCH')
    return
  }

  const voices = withV2SyntheticMode(eng.voices, 'queue')
  console.log('before:', JSON.stringify(v2Entries(eng.voices)))
  console.log('after: ', JSON.stringify(v2Entries(voices)))
  // What the switch changes in Aran's seed queue: lines queued BECAUSE a v2 known slot holds synthetic speech.
  const count = async (client) => {
    const lang = await q.buildLanguageLines(client, 'eng', { cache: new Map() })
    const lines = [...lang.byBucket.values()].flat().filter((l) => l.kind === 'seed' && l.role === 'known' && l.syntheticHeld)
    return lines.filter((l) => V2.includes(l.courseCode) || (l.duplicateOf || []).some((d) => V2.includes(d.courseCode)))
  }
  const now = await count(db)
  q.invalidateLanguageQueueCache()
  const next = await count(withPolicies(db, rows.map((r) => (r.language === 'eng' ? { ...r, voices } : r))))
  console.log(JSON.stringify({ syntheticHeldV2SeedLinesNow: now.length, afterSwitch: next.length,
    newlyQueued: next.filter((l) => !now.some((n) => n.id === l.id)).slice(0, 20).map((l) => `#${l.seedNumber} ${l.courseCode}: ${l.text}`) }, null, 1))
  if (!apply) { console.log('(dry run — nothing written)'); return }
  backup('pre-apply')
  const after = await write(voices)
  console.log('written:', JSON.stringify(v2Entries(after)))
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1) })
module.exports = { V2, withV2SyntheticMode, restoreV2Entries }
