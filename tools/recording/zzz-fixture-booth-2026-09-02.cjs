// Make the zzz TEST voice's queue show BOTH states again: Tom recorded all 9
// lines tonight, so the booth's roster would be uniformly done and the thing the
// job is about — done vs outstanding at a glance — would be invisible.
// rerecord_wanted:{target:voiceId} makes a line outstanding WITHOUT touching its
// clip (recordist-queue: isRecorded = hasTake && !rerecordWanted). Reversible by
// setting the column back to null. Test course only.
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const VOICE = 'human_tom_zzz'
const APPLY = process.argv.includes('--apply')
const REVERT = process.argv.includes('--revert')
;(async () => {
  const { data, error } = await db.from('listening_pod_sentences')
    .select('id, global_order, target_text, target_audio_id, rerecord_wanted')
    .like('id', 'zzz_test2_for_eng:%').order('global_order')
  if (error) throw error
  console.table(data.map(r => ({ id: r.id, order: r.global_order, text: String(r.target_text).slice(0, 30), audio: !!r.target_audio_id, wanted: JSON.stringify(r.rerecord_wanted) })))
  const targets = REVERT ? data : data.filter(r => [4, 7, 9].includes(r.global_order))
  if (!APPLY) { console.log('DRY RUN — would touch:', targets.map(t => t.id)); return }
  for (const t of targets) {
    const next = REVERT ? null : { target: VOICE, reason: 'test fixture: shows an outstanding line in the booth' }
    const { error: e } = await db.from('listening_pod_sentences').update({ rerecord_wanted: next }).eq('id', t.id)
    if (e) throw e
    console.log(REVERT ? 'cleared' : 'flagged', t.id)
  }
})()
