#!/usr/bin/env node
/**
 * welsh-seed-queues-588.cjs — the recording queues Aran asked for on 2026-10-13
 * (job #588), as the language_recording_policy rows that create them.
 *
 *   ENGLISH: an 'eng' policy row naming Aran as human_aran_eng, onlyCastOn, cast
 *   by castOn on the KNOWN side of the four Welsh courses. Every English seed
 *   sentence with an empty known slot and no usable human take enters
 *   /r/human_aran_eng once per text, in served order; a take fills every empty
 *   known_audio_id of that text in those courses (fill-only).
 *   WELSH: live cym_s_for_eng casts nobody in voice_config, so its empty seed
 *   slots were in no queue. Dan (target1) and Eleri (target2) are cast on it by
 *   castOn, fill-only: the original recordings it serves are never displaced.
 *
 * The queue rule that reads these is services/voice-engine/recordist-queue.cjs
 * (castOnEntries); this tool only writes the two policy rows.
 *
 *   node tools/recording/welsh-seed-queues-588.cjs              # dry run: the queues these rows WOULD make, live data, no write
 *   node tools/recording/welsh-seed-queues-588.cjs --apply      # backup, then write (needs the castOn code deployed first)
 *   node tools/recording/welsh-seed-queues-588.cjs --undo [--dry-run]   # restore the backed-up rows
 *
 * Backup: ~/ssi-evidence/ssi-dashboard-v7/tools/recording/welsh-seed-queues-588-backup.json
 */
'use strict'
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const q = require('../../services/voice-engine/recordist-queue.cjs')

const COURSES = ['cym_n_for_eng', 'cym_s_for_eng', 'cym_nv2_for_eng', 'cym_sv2_for_eng']
const ENG_VOICE = 'human_aran_eng'
const ENG_ROW = {
  language: 'eng',
  human_only: false,
  voices: {
    'm:known': {
      name: 'Aran', gender: 'm', voiceId: ENG_VOICE, onlyCastOn: true,
      castOn: COURSES.map((courseCode) => ({ courseCode, role: 'known' })),
    },
  },
  notes: 'Job #588 (Aran, 2026-10-13): Aran records the English known side of the Welsh seed sentences that have no take. ' +
    'onlyCastOn: this voice reads nothing of English but what castOn names; castOn casts are fill-only (recordist-queue.cjs castOnEntries). ' +
    'English is NOT human_only: no TTS policy changes.',
}
const SOUTH_CAST = {
  'm:south': [{ courseCode: 'cym_s_for_eng', role: 'target1' }],   // Dan
  'f:south': [{ courseCode: 'cym_s_for_eng', role: 'target2' }],   // Eleri
}
const BACKUP = path.join(require('os').homedir(), 'ssi-evidence/ssi-dashboard-v7/tools/recording/welsh-seed-queues-588-backup.json')

function proposedCym(row) {
  const voices = JSON.parse(JSON.stringify(row.voices))
  for (const [slot, castOn] of Object.entries(SOUTH_CAST)) {
    if (!voices[slot]) throw new Error(`cym policy has no ${slot} slot`)
    voices[slot].castOn = castOn
  }
  return { ...row, voices }
}

/** The live client, with language_recording_policy answered from `policies`. */
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

async function report(db) {
  const out = {}
  const eng = await q.resolveRecordist(db, ENG_VOICE)
  const engQ = await q.buildQueue(db, eng)
  const engLang = await q.buildLanguageLines(db, 'eng', { cache: new Map() })
  const seedsFilled = engQ.lines.reduce((n, l) => n + 1 + l.alsoFills, 0)
  out.english = { voiceId: ENG_VOICE, lines: engQ.remaining, total: engQ.total, seedSlotsFilled: seedsFilled,
    knownLinkableSkipped: engLang.knownLinkable, byCourse: {} }
  for (const l of engQ.lines) out.english.byCourse[l.courseCode] = (out.english.byCourse[l.courseCode] || 0) + 1
  out.english.first = engQ.lines.slice(0, 5).map((l) => `${l.courseCode} #${l.seedNumber}: ${l.text}`)
  out.welsh = {}
  for (const v of ['human_catrinlliar_cym_n', 'human_aran_cym_n', 'human_dan_cym_s', 'human_eleri_cym_s']) {
    const r = await q.resolveRecordist(db, v)
    const wq = await q.buildQueue(db, r)
    const seeds = wq.lines.filter((l) => l.kind === 'seed')
    const fills = {}
    // which courses' slots the outstanding seed lines reach, by course
    for (const l of seeds) fills[l.courseCode] = (fills[l.courseCode] || 0) + 1
    out.welsh[v] = { allLines: wq.remaining, seedLines: seeds.length, seedLinesByRepCourse: fills }
  }
  return out
}

async function main() {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data: rows, error } = await db.from('language_recording_policy').select('*').order('language')
  if (error) throw error
  const cym = rows.find((r) => r.language === 'cym')
  const existingEng = rows.find((r) => r.language === 'eng')

  if (process.argv.includes('--undo')) {
    const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'))
    console.log(`undo: delete eng row (${existingEng ? 'present' : 'absent'}); restore cym voices from ${BACKUP} (${backup.takenAt})`)
    if (process.argv.includes('--dry-run')) return
    if (backup.eng === null) {
      const { error: e1 } = await db.from('language_recording_policy').delete().eq('language', 'eng')
      if (e1) throw e1
    }
    const { error: e2 } = await db.from('language_recording_policy').update({ voices: backup.cym.voices }).eq('language', 'cym')
    if (e2) throw e2
    console.log('undone')
    return
  }

  const proposed = rows.filter((r) => r.language !== 'cym' && r.language !== 'eng').concat([proposedCym(cym), ENG_ROW])
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify(await report(withPolicies(db, proposed)), null, 2))
    console.log('\n(dry run — nothing written)')
    return
  }
  if (existingEng) throw new Error('an eng policy row already exists — refusing to overwrite it')
  fs.mkdirSync(path.dirname(BACKUP), { recursive: true })
  fs.writeFileSync(BACKUP, JSON.stringify({ takenAt: new Date().toISOString(), cym, eng: null }, null, 2))
  console.log(`backup written: ${BACKUP}`)
  const { error: e1 } = await db.from('language_recording_policy').insert(ENG_ROW)
  if (e1) throw e1
  const { error: e2 } = await db.from('language_recording_policy').update({ voices: proposedCym(cym).voices }).eq('language', 'cym')
  if (e2) throw e2
  console.log('applied')
  console.log(JSON.stringify(await report(db), null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
