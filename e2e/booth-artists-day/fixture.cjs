#!/usr/bin/env node
// THE THROWAWAY BOOTH for the artist's-day browser run.
//
// One test voice, one test course, one 8-line pod, all in the `zzz` test
// language and all named e2e_booth. The voice sits in the zzz policy row under
// its own slot with its own DIALECT ('e2e'), and the course carries that same
// dialect — the queue's second filter (recordist-queue.cjs) — so this voice's
// queue is exactly these eight lines and no other voice's queue ever sees them.
// Nothing here can reach human_aran_cym_n, human_catrinlliar_cym_n, human_tom_zzz
// or any real pod: every write names VOICE_ID / COURSE_CODE / POD_ID.
//
//   node e2e/booth-artists-day/fixture.cjs seed     # idempotent: create or refresh
//   node e2e/booth-artists-day/fixture.cjs reset    # seed + wipe the test voice's takes
//   node e2e/booth-artists-day/fixture.cjs verify 1,2,3   # exactly these lines recorded
//   node e2e/booth-artists-day/fixture.cjs takes    # what the test voice holds, as JSON
//
// Reset deletes ONLY: course_audio rows whose voice_id is the test voice, their
// recording_provenance rows, and the target_audio_id links on the test pod's
// own sentences. S3 objects (raw/ and mastered/) are left: this repo has no
// delete path for them, and a stray test object in the bucket costs nothing.
require('dotenv').config({ quiet: true })
const { createClient } = require('@supabase/supabase-js')

const VOICE_ID = 'human_e2e_booth_zzz'
const VOICE_NAME = 'E2E Booth (test voice — not a person)'
const VOICE_EMAIL = 'e2e-booth@ssi-test.invalid'
const LANGUAGE = 'zzz'
const DIALECT = 'e2e'
const SLOT = 'm:e2e'
const COURSE_CODE = 'zzz_e2ebooth_for_eng'
const POD_ID = `${COURSE_CODE}:pod-0`
const SPEAKER = 'Reader'
const LINES = [
  'e2e booth line one, read once and kept.',
  'e2e booth line two, refused and then read again.',
  'e2e booth line three, read after the refusal.',
  'e2e booth line four, never read today.',
  'e2e booth line five, never read today.',
  'e2e booth line six, never read today.',
  'e2e booth line seven, never read today.',
  'e2e booth line eight, never read today.',
]
const lineId = (n) => `${POD_ID}-s${n}`

function db() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env')
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data }

async function seed(sb) {
  // 1. The voice: one slot on the zzz policy row, nothing else on that row touched.
  const policy = must(await sb.from('language_recording_policy').select('*').eq('language', LANGUAGE).maybeSingle())
  if (!policy) throw new Error(`no language_recording_policy row for ${LANGUAGE} — the zzz test language is missing`)
  const voices = { ...(policy.voices || {}) }
  for (const [slot, v] of Object.entries(voices)) {
    if (v && v.voiceId === VOICE_ID && slot !== SLOT) throw new Error(`${VOICE_ID} already sits in slot ${slot}; refusing to guess`)
  }
  voices[SLOT] = { name: VOICE_NAME, email: VOICE_EMAIL, gender: 'm', dialect: DIALECT, aliases: [], voiceId: VOICE_ID }
  must(await sb.from('language_recording_policy').update({ voices }).eq('language', LANGUAGE))

  // 2. The course, in the test dialect. Hidden, draft, never a learner's.
  must(await sb.from('courses').upsert({
    course_code: COURSE_CODE,
    display_name: '[E2E BOOTH] artist\'s-day browser run — safe to delete',
    known_lang: 'eng', target_lang: LANGUAGE, dialect: DIALECT,
    course_type: 'official', status: 'draft', visibility: 'hidden',
    creator_email: VOICE_EMAIL,
    voice_config: { podCast: { [SPEAKER]: { name: VOICE_NAME, voiceId: VOICE_ID, gender: 'm', provider: 'human' } } },
  }, { onConflict: 'course_code' }))

  // 3. The pod and its eight lines.
  must(await sb.from('listening_pods').upsert({
    id: POD_ID, course_code: COURSE_CODE, pod_type: 'core', slug: 'pod-0', pod_order: 0,
    title: 'E2E Booth — the artist\'s day', scene: 'Eight lines nobody is', difficulty: 'beginner', speakers: {},
  }, { onConflict: 'id' }))
  for (let i = 0; i < LINES.length; i++) {
    must(await sb.from('listening_pod_sentences').upsert({
      id: lineId(i + 1), pod_id: POD_ID, scene_number: 1, sentence_number: i + 1, global_order: i + 1,
      speaker: SPEAKER, target_text: LINES[i], known_text: LINES[i],
    }, { onConflict: 'id' }))
  }
}

async function takes(sb) {
  const audio = must(await sb.from('course_audio').select('id, course_code, text, s3_key, duration_ms, file_size_bytes, created_at').eq('voice_id', VOICE_ID).order('created_at'))
  const stems = audio.map((a) => stem(a.s3_key)).filter(Boolean)
  const prov = stems.length
    ? must(await sb.from('recording_provenance').select('audio_uuid, recorded_by, recording_device, recorded_at').in('audio_uuid', stems))
    : []
  const sentences = must(await sb.from('listening_pod_sentences').select('id, sentence_number, target_audio_id').eq('pod_id', POD_ID).order('sentence_number'))
  return { audio, provenance: prov, sentences }
}
const stem = (key) => { const m = /\/([^/.]+)\.[a-z0-9]+$/i.exec(String(key || '')); return m ? m[1] : null }

async function reset(sb) {
  await seed(sb)
  const { audio, provenance } = await takes(sb)
  if (provenance.length) must(await sb.from('recording_provenance').delete().in('audio_uuid', provenance.map((p) => p.audio_uuid)))
  if (audio.length) must(await sb.from('course_audio').delete().eq('voice_id', VOICE_ID))
  must(await sb.from('listening_pod_sentences').update({ target_audio_id: null }).eq('pod_id', POD_ID))
  return { deletedAudio: audio.length, deletedProvenance: provenance.length }
}

/** Exactly `expected` line numbers recorded by the test voice, each with a clip, a link and a provenance row. */
async function verify(sb, expected) {
  const t = await takes(sb)
  const problems = []
  const byText = new Map(t.audio.map((a) => [a.text, a]))
  for (const n of expected) {
    const a = byText.get(LINES[n - 1])
    if (!a) { problems.push(`line ${n}: no course_audio row for the test voice`); continue }
    if (!a.s3_key || !(a.file_size_bytes > 1000)) problems.push(`line ${n}: clip ${a.s3_key} is ${a.file_size_bytes} bytes`)
    const p = t.provenance.find((x) => x.audio_uuid === stem(a.s3_key))
    if (!p) problems.push(`line ${n}: no recording_provenance row for ${stem(a.s3_key)}`)
    else if (p.recorded_by !== VOICE_EMAIL) problems.push(`line ${n}: provenance says recorded_by=${p.recorded_by}, expected ${VOICE_EMAIL}`)
    const s = t.sentences.find((x) => x.sentence_number === n)
    if (!s || s.target_audio_id !== a.id) problems.push(`line ${n}: pod sentence links ${s && s.target_audio_id}, expected ${a.id}`)
  }
  for (const a of t.audio) {
    const n = LINES.indexOf(a.text) + 1
    if (!expected.includes(n)) problems.push(`unexpected take of line ${n || '?'} (${a.text})`)
  }
  for (const s of t.sentences) {
    if (!expected.includes(s.sentence_number) && s.target_audio_id) problems.push(`line ${s.sentence_number} is linked to ${s.target_audio_id} but was never read`)
  }
  return { ok: problems.length === 0, problems, rows: t.audio.length, provenance: t.provenance.length }
}

async function main() {
  const [cmd, arg] = process.argv.slice(2)
  const sb = db()
  if (cmd === 'seed') { await seed(sb); console.log(`seeded ${VOICE_ID} / ${COURSE_CODE} / ${POD_ID} (${LINES.length} lines)`) }
  else if (cmd === 'reset') { const r = await reset(sb); console.log(`reset: ${JSON.stringify(r)}; ${LINES.length} lines to read`) }
  else if (cmd === 'takes') console.log(JSON.stringify(await takes(sb), null, 2))
  else if (cmd === 'verify') {
    const expected = String(arg || '').split(',').filter(Boolean).map(Number)
    const v = await verify(sb, expected)
    console.log(JSON.stringify(v, null, 2))
    if (!v.ok) process.exit(1)
  } else { console.error('usage: fixture.cjs seed|reset|takes|verify <n,n,..>'); process.exit(3) }
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1) })
module.exports = { VOICE_ID, VOICE_NAME, VOICE_EMAIL, COURSE_CODE, POD_ID, LINES, lineId, seed, reset, verify, takes }
