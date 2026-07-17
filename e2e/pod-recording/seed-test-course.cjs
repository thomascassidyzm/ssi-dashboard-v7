#!/usr/bin/env node
// Seeds (or resets) a throwaway course used ONLY by the pod-recording E2E
// suite: one listening pod (two speakers, for the two-voice cast/record
// walk) + one seed/LEGO pair (for the Mode 1 autocue smoke test).
// Idempotent — safe to re-run. Never touches cym_n_for_eng / cym_s_for_eng.
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const COURSE_CODE = process.env.E2E_TEST_COURSE || 'zzz_test_for_eng'
// Canonical pod id shape used server-side (services/production-api.cjs pod
// detail route): `${courseCode}:${slug}` — colon, not hyphen.
const POD_ID = `${COURSE_CODE}:pod-0`

async function main() {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const { error: courseErr } = await db.from('courses').upsert({
    course_code: COURSE_CODE,
    display_name: '[E2E TEST] Pod Recording Suite — safe to delete',
    known_lang: 'eng',
    target_lang: 'eng',
    course_type: 'official',
    status: 'draft',
    visibility: 'hidden',
    creator_email: 'e2e-pod-recording-test@ssi-test.invalid'
  }, { onConflict: 'course_code' })
  if (courseErr) throw courseErr
  console.log('Upserted course', COURSE_CODE)

  // --- Mode 1 (autocue) fixture: one seed containing one LEGO ---
  const { error: seedErr } = await db.from('course_seeds').upsert({
    course_code: COURSE_CODE,
    seed_number: 1,
    known_text: 'Hello there, my friend',
    target_text: 'Hello there, my friend',
    status: 'draft'
  }, { onConflict: 'course_code,seed_number' })
  if (seedErr) throw seedErr

  const { error: legoErr } = await db.from('course_legos').upsert({
    course_code: COURSE_CODE,
    seed_number: 1,
    lego_index: 1,
    type: 'M',
    is_new: true,
    known_text: 'hello there',
    target_text: 'hello there',
    status: 'draft'
  }, { onConflict: 'course_code,seed_number,lego_index' })
  if (legoErr) throw legoErr
  console.log('Upserted seed S0001 + LEGO S0001L01')

  // --- Mode 3 (pods) fixture: one pod, two speakers, six lines ---
  const { error: podErr } = await db.from('listening_pods').upsert({
    id: POD_ID,
    course_code: COURSE_CODE,
    pod_type: 'core',
    slug: 'pod-0',
    pod_order: 0,
    title: 'E2E Test Pod — Coffee Shop',
    scene: 'A quick coffee order',
    difficulty: 'beginner',
    speakers: {}
  }, { onConflict: 'id' })
  if (podErr) throw podErr

  const lines = [
    { speaker: 'Barista', target_text: 'Hello, what can I get you today?', known_text: 'Hello, what can I get you today?' },
    { speaker: 'Customer', target_text: 'A coffee, please.', known_text: 'A coffee, please.' },
    { speaker: 'Barista', target_text: 'Would you like anything else?', known_text: 'Would you like anything else?' },
    { speaker: 'Customer', target_text: 'No thank you, that is all.', known_text: 'No thank you, that is all.' },
    { speaker: 'Barista', target_text: 'That will be three pounds, please.', known_text: 'That will be three pounds, please.' },
    { speaker: 'Customer', target_text: 'Here you are, thank you.', known_text: 'Here you are, thank you.' }
  ]

  for (let i = 0; i < lines.length; i++) {
    const { error } = await db.from('listening_pod_sentences').upsert({
      id: `${POD_ID}-s${i + 1}`,
      pod_id: POD_ID,
      scene_number: 1,
      sentence_number: i + 1,
      global_order: i + 1,
      speaker: lines[i].speaker,
      target_text: lines[i].target_text,
      known_text: lines[i].known_text
    }, { onConflict: 'id' })
    if (error) throw error
  }
  console.log(`Upserted pod ${POD_ID} with ${lines.length} sentences (2 speakers)`)

  console.log('\nE2E test course ready:', COURSE_CODE)
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1) })
}

module.exports = { COURSE_CODE, POD_ID, seedTestCourse: main }
