'use strict'
// #812: Southern Welsh pod-1 rebalance. The only whole Eleri speaker part that can go to Dan
// with zero self-dialogue is "Cafe Customer 2" (SC07): every other Eleri part is in an exchange
// with a fixed Dan part (or is Learner, which Kai keeps). Snapshot first, then mergePodCast.
const fs = require('fs'), path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
const { Client } = require('pg')
const { mergePodCast } = require('../../services/voice-engine/pods-cast.cjs')
const COURSE = 'cym_s_for_eng'
;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect()
  const { voice_config } = (await c.query('SELECT voice_config FROM courses WHERE course_code=$1', [COURSE])).rows[0]
  const snap = path.join(__dirname, 'voice_config.before.json')
  if (!fs.existsSync(snap)) fs.writeFileSync(snap, JSON.stringify(voice_config, null, 2))
  const next = mergePodCast(voice_config, { 'Cafe Customer 2': { voiceId: 'human_dan_cym_s', name: 'Dan', gender: 'm' } })
  if (JSON.stringify(next.voices) !== JSON.stringify(voice_config.voices)) throw new Error('voices would change')
  await c.query('UPDATE courses SET voice_config=$1 WHERE course_code=$2', [next, COURSE])
  console.log('written', next.podCast['Cafe Customer 2']); await c.end()
})()
