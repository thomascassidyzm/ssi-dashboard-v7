#!/usr/bin/env node
// One-off apply (job #34·J, Kai 2026-10-01): Southern Welsh pod-1 — Dan's cast, his 15 draft
// ticks and three mechanical text fixes, in ONE guarded transaction. Re-runnable: every guard
// refuses if the world no longer matches. Usage: node apply-dan-cast-cym-s.cjs [--apply]
const path = require('path')
const { Client } = require('pg')
const fs = require('fs')
const envText = fs.readFileSync(path.join(process.env.ENV_PSQL || '.env.psql'), 'utf8')
const url = (envText.match(/DATABASE_URL=(.*)/) || [])[1].replace(/^["']|["']$/g, '')
const consentGate = require('../../services/shared/voice-consent-gate.cjs')

const POD = 'cym_s_for_eng:pod-1', COURSE = 'cym_s_for_eng', VOICE = 'human_dan_cym_s'
// 15 male roles from #32·J minus Cafe Customer 2 (Kai: left for another man).
const ROLES = ['Narrator','Friend','Waiter','Guest','Passenger','James','Local','Bartender','Pharmacist','Assistant','Barista','Cafe Customer 1','Neighbour','Cafe Customer 3']
const DRAFT_ORDERS = [9,15,16,18,41,43,119,140,151,162,173,184,195,206,220]
const FIXES = [ // [global_order, from, to] — only that substring changes
  [133, "bydd hi'n gymryd", "bydd hi'n cymryd"],
  [113, 'pen tost,…a', 'pen tost,… a'],
  [54, 'beint,…os', 'beint,… os'],
]
const APPROVER = 'kai.saraceno@saysomethingin.com'

;(async () => {
  const apply = process.argv.includes('--apply')
  const db = new Client({ connectionString: url }); await db.connect()
  const q = (s, p) => db.query(s, p).then(r => r.rows)
  const fail = m => { console.error('GUARD FAILED:', m); process.exit(2) }

  // consent (same gate the cast route runs)
  require('dotenv').config()
  const consent = await consentGate.assertConsented(VOICE, { db: require('../../services/supabase-client.cjs').getClient(), context: 'dan-cast' }).catch(e => ({ refused: e.message }))
  console.log('consent (via gate):', JSON.stringify(consent))
  if (consent.refused || !consent.allowed) fail('consent: ' + JSON.stringify(consent))

  const cast = (await q(`select voice_config->'podCast' c from courses where course_code=$1`, [COURSE]))[0].c
  if (JSON.stringify(cast) !== '{}') fail('podCast not empty: ' + JSON.stringify(cast))
  const n = (await q(`select count(*)::int n from listening_pod_sentences where pod_id=$1`, [POD]))[0].n
  if (n !== 231) fail('pod-1 line count ' + n)
  const drafts = await q(`select global_order,speaker from listening_pod_sentences where pod_id=$1 and target_text_draft and speaker = any($2) order by 1`,
    [POD, [...ROLES, 'Barista (3 pm)', 'Neighbour (8 am)', 'Neighbour (10:30 pm)', 'Friend (7 pm)']])
  if (JSON.stringify(drafts.map(d => d.global_order)) !== JSON.stringify(DRAFT_ORDERS)) fail('Dan draft set differs: ' + JSON.stringify(drafts.map(d => d.global_order)))

  await db.query('begin')
  try {
    const castObj = {}; for (const r of ROLES) castObj[r] = { voiceId: VOICE, name: 'Dan', gender: 'm' }
    let r = await db.query(`update courses set voice_config = jsonb_set(jsonb_set(voice_config,'{podCast}',$1::jsonb),'{podCastVoices}','1'::jsonb) where course_code=$2 and voice_config->'podCast'='{}'::jsonb`, [JSON.stringify(castObj), COURSE])
    if (r.rowCount !== 1) throw new Error('cast update rowCount ' + r.rowCount)
    // text fixes first (they do not touch draft/approval); audio columns never mentioned
    for (const [go, from, to] of FIXES) {
      r = await db.query(`update listening_pod_sentences set target_text = replace(target_text,$1,$2) where pod_id=$3 and global_order=$4 and position($1 in target_text)>0 and target_audio_id is null`, [from, to, POD, go])
      if (r.rowCount !== 1) throw new Error(`fix at ${go} rowCount ${r.rowCount}`)
    }
    // proofread tick = buildProofreadPatch (pods-cast.cjs): draft=false + stamp, text and audio untouched
    r = await db.query(`update listening_pod_sentences set target_text_draft=false, target_text_approved_at=now(), target_text_approved_by=$1 where pod_id=$2 and global_order = any($3) and target_text_draft`, [APPROVER, POD, DRAFT_ORDERS])
    if (r.rowCount !== 15) throw new Error('proofread rowCount ' + r.rowCount)
    if (apply) { await db.query('commit'); console.log('COMMITTED') } else { await db.query('rollback'); console.log('DRY RUN: all guards + updates succeeded, rolled back') }
  } catch (e) { await db.query('rollback'); console.error('ROLLED BACK:', e.message); process.exit(3) }
  await db.end()
})()
