#!/usr/bin/env node
/**
 * stage-welsh-love-pods.cjs — put "I love you" in Welsh into the ordinary Popty
 * recording queue, for the /guess games (job #867, Tom 2026-10-05: "They should
 * be in the regular recording tool for him ... He can edit the text and then
 * record").
 *
 *   node tools/recording/guess-love-lines/stage-welsh-love-pods.cjs          # DRY RUN
 *   node tools/recording/guess-love-lines/stage-welsh-love-pods.cjs --apply
 *
 * The recordist queue has no free-text intake: it is derived from pod sentences,
 * seeds and flagged clips, and only a POD line is text-editable in the booth
 * (canEditText in recordist-queue.cjs). So each line is one sentence of a tiny
 * held `choice` pod read SOLO by the dialect's voices — the same shape as
 * stage-pilot-pod.cjs in tools/recording/health-seed-ladders. A choice pod on
 * this slug is served by nothing (the learner resolves core/pod-1); 'held' is
 * only a second statement of intent.
 *
 * The line is a DRAFT (target_text_draft) until its reader edits or approves it.
 * THE READER'S SAVED TEXT IS THE TEXT: the guess build reads the pod sentence
 * (target_text + target_audio_id), never a copy of this wording.
 *
 * North: Aran + Kai (solo readers). South: Dan, via the course's Narrator cast (Aran's
 * dialect filter would never serve him a South line). Idempotent; touches no audio and no
 * other course.
 */
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const { assertNoCharacters } = require('../../../services/shared/pod-solo-readers.cjs')

const APPLY = process.argv.includes('--apply')
const SLUG = 'guess-i-love-you'

const LINES = [
  { course: 'cym_n_for_eng', readers: ['human_aran_cym_n', 'human_kai_cym_n'], welsh: "Dw i'n dy garu di" },
  // South: Dan is a cast-only voice (no language_recording_policy row), so a solo-reader pod
  // would count him `uncast`; he is reached the ordinary way, as the course's Narrator.
  { course: 'cym_s_for_eng', speaker: 'Narrator', welsh: "Rwy'n dy garu di" },
]

async function main() {
  const db = APPLY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null
  for (const l of LINES) {
    const podId = `${l.course}:${SLUG}`
    const pod = {
      id: podId, course_code: l.course, pod_type: 'choice', slug: SLUG, pod_order: 901,
      title: 'I love you — for the guess games (job #867)', scene: 'Guess game line',
      speakers: {}, visibility: 'held',
      metadata: { job: '867', purpose: 'guess-game-love-line', ...(l.readers ? { solo_readers: l.readers } : {}) },
    }
    const sentence = {
      id: `${podId}:1`, pod_id: podId, scene_number: 1, sentence_number: 1, global_order: 1,
      speaker: l.speaker || '', target_text: l.welsh, known_text: 'I love you', target_text_draft: true,
    }
    if (l.readers) assertNoCharacters(pod, [sentence])
    console.log(`${APPLY ? 'APPLY' : 'DRY'} ${podId}  "${l.welsh}"  readers: ${(l.readers || [l.speaker]).join(', ')}`)
    if (!APPLY) continue
    // never overwrite a line a reader has already edited or recorded
    const { data: ex } = await db.from('listening_pod_sentences').select('id').eq('id', sentence.id).maybeSingle()
    const { error: pe } = await db.from('listening_pods').upsert(pod, { onConflict: 'id' })
    if (pe) throw new Error(`pod ${podId}: ${pe.message}`)
    if (ex) { console.log('  sentence exists — left as the reader has it'); continue }
    const { error: se } = await db.from('listening_pod_sentences').insert(sentence)
    if (se) throw new Error(`sentence ${sentence.id}: ${se.message}`)
  }
}
main().catch((e) => { console.error(e.message); process.exit(1) })
