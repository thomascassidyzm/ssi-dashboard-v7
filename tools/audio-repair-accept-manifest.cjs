// Rebuild an audio-repair accept manifest from the DB's pending candidates.
// Needed because parallel `propose` runs of equal size collide on the log path.
require('dotenv').config()
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const [course, since, out] = process.argv.slice(2)
;(async () => {
  const { data: cands, error } = await db.from('audio_repair_candidates')
    .select('id, audio_id, duration_ms, source, veracity_pass, veracity_reason, veracity_cer, mean_db, peak_db, s3_key, proposed_at')
    .eq('course_code', course).eq('status', 'pending').gte('proposed_at', since)
  if (error) throw new Error(error.message)
  const ids = [...new Set(cands.map(c => c.audio_id))]
  const live = {}
  for (let i = 0; i < ids.length; i += 500) {
    const { data, error: e2 } = await db.from('course_audio')
      .select('id, s3_key, audio_revision, duration_ms, text, role').in('id', ids.slice(i, i + 500))
    if (e2) throw new Error(e2.message)
    for (const r of data) live[r.id] = r
  }
  const seen = new Set()
  const log = []
  for (const c of cands) {
    if (seen.has(c.audio_id) || !live[c.audio_id]) continue
    if (c.veracity_pass === false) continue
    seen.add(c.audio_id)
    const l = live[c.audio_id]
    log.push({
      audioId: c.audio_id, action: 'proposed', candidateId: c.id,
      candidate: { durationMs: c.duration_ms, source: c.source,
        veracity: { pass: c.veracity_pass, reason: c.veracity_reason, cer: c.veracity_cer },
        level: { meanDb: c.mean_db, peakDb: c.peak_db }, s3Key: c.s3_key },
      expect: { id: l.id, s3Key: l.s3_key, revision: l.audio_revision, durationMs: l.duration_ms, text: l.text, role: l.role },
    })
  }
  fs.writeFileSync(out, JSON.stringify(log, null, 1))
  console.log(`${log.length} candidate(s) -> ${out}`)
})().catch(e => { console.error(e.message); process.exit(1) })
