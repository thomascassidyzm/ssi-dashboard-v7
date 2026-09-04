/**
 * Tom's private Italian clone-sample set, in the booth he already uses.
 *
 * Tom, 2026-09-04: he is building a Cartesia INSTANT CLONE of his own voice
 * speaking ITALIAN, to compare against stock Lorenzo — his English clone
 * speaking Italian carries his English mouth; a clone built from him actually
 * speaking Italian is a different artefact. Cartesia needs ~10-13 seconds.
 * He asked to read it in the booth, not to record elsewhere and send a file.
 *
 * REUSES THE EXISTING MECHANISM, BUILDS NOTHING NEW. The booth's queue is
 * derived by LANGUAGE from language_recording_policy (recordist-queue.cjs), so
 * a private Italian set is exactly three existing rows: a policy voice, a
 * scratch course, a pod. No new page, no new route, no new pod type.
 *
 * WHY IT CANNOT LEAK INTO ITALIAN CONTENT. The queue's second filter is
 * DIALECT — courses.dialect must equal the reading voice's dialect tag
 * (Tom, 2026-08-19; services/shared/dialect.cjs). This voice and this course
 * both carry dialect 'clone-sample'; every real Italian course is 'standard'.
 * So even if ita_for_eng is cast to a male speaker mid-render (job #429, the
 * Method Pod), its 309 rows land in a different bucket and can never appear in
 * this queue. The course code carries the estate's scratch prefix `zzz_`
 * (services/shared/learner-counts.cjs), the course is visibility:hidden, and
 * the policy row is human_only:false so Italian does NOT become a human-only
 * language — phase8 TTS and the coverage bar are both untouched.
 *
 *   node tools/recording/ita-clone-sample-booth-2026-09-04.cjs           # dry run
 *   node tools/recording/ita-clone-sample-booth-2026-09-04.cjs --apply
 *   node tools/recording/ita-clone-sample-booth-2026-09-04.cjs --remove --apply
 */
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const LANGUAGE = 'ita'
const DIALECT = 'clone-sample'
const VOICE = 'human_tom_ita_sample'
const COURSE = 'zzz_itasample_for_eng'
const POD = `${COURSE}:pod-0`
const SPEAKER = 'Tom'

// Tom's own lines from the Italian Method Pod, verbatim. Not re-translated,
// not paraphrased, nothing added.
const LINES = [
  'Allora me la prendo. Perché è la stessa chiesa.',
  'Un tedesco su un tedesco, una studentessa su una studentessa, e uno di noi due su se stesso con un pesce gallese.',
  'Allora — aspetta. Come lo sappiamo?',
]

const APPLY = process.argv.includes('--apply')
const REMOVE = process.argv.includes('--remove')

async function policyRow() {
  const { data, error } = await db.from('language_recording_policy').select('*').eq('language', LANGUAGE).maybeSingle()
  if (error) throw error
  return data
}

;(async () => {
  const existingPolicy = await policyRow()

  if (REMOVE) {
    console.log(APPLY ? 'removing' : 'DRY RUN — would remove', { POD, COURSE, VOICE })
    if (!APPLY) return
    await db.from('listening_pod_sentences').delete().eq('pod_id', POD)
    await db.from('listening_pods').delete().eq('id', POD)
    await db.from('courses').delete().eq('course_code', COURSE)
    if (existingPolicy) {
      const voices = { ...(existingPolicy.voices || {}) }
      delete voices[`m:${DIALECT}`]
      if (Object.keys(voices).length) await db.from('language_recording_policy').update({ voices }).eq('language', LANGUAGE)
      else await db.from('language_recording_policy').delete().eq('language', LANGUAGE)
    }
    console.log('removed')
    return
  }

  const voices = {
    ...(existingPolicy && existingPolicy.voices ? existingPolicy.voices : {}),
    [`m:${DIALECT}`]: {
      name: 'Tom (PRIVATE clone sample — not a production recordist)',
      email: 'thomas.cassidy+ssi@gmail.com',
      gender: 'm',
      dialect: DIALECT,
      aliases: [],
      voiceId: VOICE,
    },
  }

  const course = {
    course_code: COURSE,
    display_name: '[PRIVATE — TOM ONLY] Italian clone sample. Not a course, not learner-facing.',
    known_lang: 'eng',
    target_lang: LANGUAGE,
    dialect: DIALECT,
    course_type: 'official',
    status: 'draft',
    visibility: 'hidden',
    new_app_status: 'not_available',
    legacy_app_status: 'not_available',
    voice_config: {
      podCast: {
        [SPEAKER]: { name: 'Tom', email: 'thomas.cassidy+ssi@gmail.com', gender: 'm', voiceId: VOICE },
      },
    },
  }

  const pod = {
    id: POD,
    course_code: COURSE,
    pod_type: 'core',
    slug: 'pod-0',
    title: 'Tom — Italian clone sample (private)',
    speakers: [SPEAKER],
    metadata: { purpose: 'cartesia instant clone sample', private: true },
    visibility: 'held',
  }

  const sentences = LINES.map((text, i) => ({
    id: `${POD}-s${i + 1}`,
    pod_id: POD,
    scene_number: 1,
    sentence_number: i + 1,
    global_order: i + 1,
    speaker: SPEAKER,
    target_text: text,
    known_text: 'Italian clone sample — read it as you would say it.',
    target_text_draft: false,
  }))

  if (!APPLY) {
    console.log('DRY RUN')
    console.log('policy voices →', JSON.stringify(voices, null, 1))
    console.log('course →', COURSE, 'dialect', DIALECT)
    console.log('sentences →', sentences.map((s) => `${s.id}: ${s.target_text}`))
    console.log('URL → https://popty.app/r/' + VOICE)
    return
  }

  const up = async (table, row, opts) => {
    const { error } = await db.from(table).upsert(row, opts)
    if (error) throw new Error(`${table}: ${error.message}`)
  }

  await up('language_recording_policy', { language: LANGUAGE, human_only: false, voices, notes: 'Tom private Italian clone sample only — Italian is NOT human-only.' }, { onConflict: 'language' })
  await up('courses', course, { onConflict: 'course_code' })
  await up('listening_pods', pod, { onConflict: 'id' })
  await up('listening_pod_sentences', sentences, { onConflict: 'id' })
  console.log('applied. URL → https://popty.app/r/' + VOICE)
})()
