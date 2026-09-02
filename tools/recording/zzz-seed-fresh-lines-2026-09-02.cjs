/**
 * Fresh, unrecorded lines for the zzz TEST voice, so the booth's navigation can
 * actually be exercised: Start, auto-advance, Back, Again, Stop here, edit the
 * text, re-record, edit an already-recorded line and record it again.
 *
 * Tom, 2026-09-02: "can I have some brand new lines to record, I want to test
 * the nav within the thing". Twelve is enough to move around in without the
 * queue ending under you.
 *
 * SAFE BY CONSTRUCTION. It writes only to zzz_test2_for_eng's pod, only ADDS
 * rows, and every text is new — a clip's identity is (language, text, voice), so
 * a text nobody has ever read has no take and lands as outstanding. Nothing
 * existing is touched and no audio is deleted.
 *
 * Speaker MUST be "Customer": that is the role this course's voice_config casts
 * to human_tom_zzz. A "Barista" line goes to the female test voice's queue.
 *
 *   node tools/recording/zzz-seed-fresh-lines-2026-09-02.cjs           # dry run
 *   node tools/recording/zzz-seed-fresh-lines-2026-09-02.cjs --apply
 *   node tools/recording/zzz-seed-fresh-lines-2026-09-02.cjs --remove  # take them out again
 */
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const COURSE = 'zzz_test2_for_eng'
const POD = `${COURSE}:pod-0`
const SPEAKER = 'Customer'
const TAG = 'nav-test-2026-09-02'

// Short enough to read in one breath, varied in length so the run has some
// shape, and obviously a test set rather than anything that could be mistaken
// for course content.
const LINES = [
  'Good morning.',
  'Could I get the bill, please?',
  'Is this seat free?',
  'I would like to try the other one.',
  'What time do you close tonight?',
  'That was really good, thank you.',
  'Can I pay by card?',
  'Do you have anything without sugar?',
  'I will take two of those, please.',
  'Sorry, could you say that again?',
  'It is much colder than yesterday.',
  'See you next week.',
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

  const maxOrder = existing.reduce((n, r) => Math.max(n, r.global_order || 0), 0)
  const maxSeq = existing.reduce((n, r) => {
    const m = /-s(\d+)$/.exec(r.id)
    return m ? Math.max(n, Number(m[1])) : n
  }, 0)
  const already = new Set(existing.map((r) => r.target_text))

  const rows = LINES.filter((t) => !already.has(t)).map((text, i) => ({
    id: `${POD}-s${maxSeq + 1 + i}`,
    pod_id: POD,
    scene_number: 1,
    sentence_number: maxSeq + 1 + i,
    global_order: maxOrder + 1 + i,
    speaker: SPEAKER,
    target_text: text,
    known_text: text,
    target_audio_id: null,
    target_text_draft: false,
    metadata_tag: undefined,
  })).map(({ metadata_tag, ...r }) => r)

  console.table(rows.map((r) => ({ id: r.id, order: r.global_order, text: r.target_text })))
  if (!APPLY) { console.log(`DRY RUN (${TAG}) — ${rows.length} rows would be inserted`); return }
  if (!rows.length) { console.log('nothing to add — they are all there already'); return }
  const { error: insErr } = await db.from('listening_pod_sentences').insert(rows)
  if (insErr) throw insErr
  console.log(`inserted ${rows.length} fresh lines into ${POD}`)
})()
