/**
 * Tom's three Italian clone-sample lines, cast to him in the booth he already
 * has open.
 *
 * Tom, 2026-09-04: "of course, it will just appear in my lines". He is building
 * a Cartesia INSTANT CLONE of himself actually speaking Italian, to compare
 * against stock Lorenzo — ~10-13 seconds is all the clone needs. The booth
 * queue is already per-artist, so the whole job is three pod rows cast to the
 * speaker his link reads.
 *
 * WHERE THEY GO. `zzz_test2_for_eng:pod-0` — the estate's TEST FIXTURE course
 * (scratch prefix `zzz_`, visibility hidden, target_lang 'zzz', never a real
 * course and never learner-facing). Its podCast casts the speaker "Customer" to
 * human_tom_zzz and nobody else, which is exactly the link he holds. Aran and
 * Catrin read cym; this course is not Welsh and cannot enter their queues.
 *
 * WHY THE CLIP IS FILED UNDER 'zzz' AND NOT 'ita'. The booth is one language
 * per link by construction: the queue is derived from the recordist's policy
 * language and the take route files every clip under `recordist.language`
 * (recordist-router.cjs). His link is the zzz test voice, so a take read there
 * is stored as (zzz, text, human_tom_zzz). That is the mechanism keeping this
 * private — a zzz-tagged clip cannot be reached by any Italian course, by
 * clip identity itself. The lines READ as Italian: the text is his own Italian,
 * and the crib line under it says so on every one of the three.
 *
 *   node tools/recording/tom-ita-clone-sample-lines-2026-09-04.cjs           # dry run
 *   node tools/recording/tom-ita-clone-sample-lines-2026-09-04.cjs --apply
 *   node tools/recording/tom-ita-clone-sample-lines-2026-09-04.cjs --remove --apply
 */
require('dotenv').config({ quiet: true })
const { createClient } = require('@supabase/supabase-js')
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const POD = 'zzz_test2_for_eng:pod-0'
const SPEAKER = 'Customer'   // the cast entry that routes to human_tom_zzz
const CRIB = 'ITALIAN — private clone sample. Read it as you would say it.'

// His own lines from the Italian Method Pod, verbatim. Not re-translated, not
// paraphrased, nothing added.
const LINES = [
  'Allora me la prendo. Perché è la stessa chiesa.',
  'Un tedesco su un tedesco, una studentessa su una studentessa, e uno di noi due su se stesso con un pesce gallese.',
  'Allora — aspetta. Come lo sappiamo?',
]

const APPLY = process.argv.includes('--apply')
const REMOVE = process.argv.includes('--remove')

;(async () => {
  const { data: existing, error } = await db
    .from('listening_pod_sentences')
    .select('id, global_order, sentence_number, target_text')
    .eq('pod_id', POD)
    .order('global_order')
  if (error) throw error

  if (REMOVE) {
    const ids = existing.filter((r) => LINES.includes(r.target_text)).map((r) => r.id)
    console.log(APPLY ? 'removing' : 'DRY RUN — would remove', ids)
    if (APPLY && ids.length) {
      const { error: e } = await db.from('listening_pod_sentences').delete().in('id', ids)
      if (e) throw e
      console.log('removed', ids.length)
    }
    return
  }

  const already = new Set(existing.map((r) => r.target_text))
  const maxOrder = existing.reduce((n, r) => Math.max(n, r.global_order || 0), 0)
  const maxSeq = existing.reduce((n, r) => {
    const m = /-s(\d+)$/.exec(r.id)
    return m ? Math.max(n, Number(m[1])) : n
  }, 0)

  const rows = LINES.filter((t) => !already.has(t)).map((text, i) => ({
    id: `${POD}-s${maxSeq + 1 + i}`,
    pod_id: POD,
    scene_number: 1,
    sentence_number: maxOrder + 1 + i,
    global_order: maxOrder + 1 + i,
    speaker: SPEAKER,
    target_text: text,
    known_text: CRIB,
    target_text_draft: false,
  }))

  if (!rows.length) { console.log('already present — nothing to add'); return }
  if (!APPLY) {
    console.log('DRY RUN — would insert into', POD)
    console.log(rows.map((r) => `${r.id} #${r.global_order} ${r.speaker}: ${r.target_text}`).join('\n'))
    return
  }
  const { error: e } = await db.from('listening_pod_sentences').insert(rows)
  if (e) throw e
  console.log('inserted', rows.length, 'lines into', POD)
})()
