#!/usr/bin/env node
/**
 * Put Sascha's 311 deu_at_for_eng target2 links back.
 *
 * On 2026-08-25 her 225 human clips were unlinked from their 311 content slots
 * (258 practice phrases, 28 legos, 25 seeds) and each slot was pointed at the
 * restored Azure Jonas clip instead. Kai's call: for the beta a single human
 * line surfacing among synthetic voices reads as a fault, so the course speaks
 * with one voice until there is enough human audio to switch wholesale.
 *
 * Nothing was deleted. Her course_audio rows and their S3 objects are untouched.
 * This script reverses the swap using the ledger written at park time.
 *
 *   node tools/deu-at/unpark-sascha-links.cjs           # dry run
 *   APPLY=1 node tools/deu-at/unpark-sascha-links.cjs   # apply
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const LEDGER = path.join(__dirname, '../../docs/audio/deu_at_for_eng-sascha-parked-links-2026-08-25.json')
const url = fs.readFileSync(path.join(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
const APPLY = process.env.APPLY === '1'

;(async () => {
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'))
  const c = new Client({ connectionString: url })
  await c.connect()

  let restored = 0, drifted = []
  for (const e of ledger.links) {
    // Only reverse a slot that still holds exactly what we parked it to. If
    // something else has written to it since, leave it and report the drift —
    // a later human delivery is more current than this ledger.
    const r = APPLY
      ? await c.query(
          `update ${e.table} set target2_audio_id = $2::uuid
             where id::text = $1 and course_code = 'deu_at_for_eng' and target2_audio_id = $3::uuid`,
          [e.slot_id, e.human_audio_id, e.parked_to_synthetic])
      : await c.query(
          `select 1 from ${e.table}
             where id::text = $1 and course_code = 'deu_at_for_eng' and target2_audio_id = $2::uuid`,
          [e.slot_id, e.parked_to_synthetic])
    if (r.rowCount) restored++
    else drifted.push(e.slot_id)
  }

  console.log(`${APPLY ? 'restored' : 'would restore'}: ${restored} of ${ledger.links.length}`)
  if (drifted.length) {
    console.log(`drifted (left alone): ${drifted.length}`)
    console.log(drifted.slice(0, 20).join('\n'))
  }

  const live = (await c.query(
    `select count(*) n from course_practice_phrases p join course_audio a on a.id = p.target2_audio_id
      where p.course_code = 'deu_at_for_eng' and a.origin = 'human'`)).rows[0].n
  console.log('phrase slots now speaking Sascha:', live)
  await c.end()
})()
