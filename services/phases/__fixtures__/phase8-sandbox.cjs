/**
 * Loads the REAL services/phases/phase8-audio-v13.cjs with every outside edge
 * replaced by an in-memory double, so getAudioNeeds() can be driven as itself
 * with zero Supabase, zero S3 and — critically — zero TTS spend.
 *
 * Interception is done at Module._load, before phase8 is required, because
 * phase8 captures `supabase`, `s3` and `ttsService` in module-closure consts
 * at load time; there is no seam to inject them afterwards.
 */

const Module = require('module')
const path = require('path')
const { makeFakeSupabase } = require('./fake-supabase.cjs')

const PHASE8 = path.resolve(__dirname, '..', 'phase8-audio-v13.cjs')

function loadPhase8({ tables = {}, s3Objects = new Set() } = {}) {
  // Blow away any cached copy so each scenario gets a clean module instance.
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/services/') || k.includes('@supabase')) delete require.cache[k]
  }

  const supabase = makeFakeSupabase(tables)

  const tts = {
    calls: [],
    async generateAudio(...args) {
      tts.calls.push(args)
      throw new Error('SANDBOX: TTS must never be reached in this reproduction')
    },
  }

  const s3 = {
    headCalls: [],
    putCalls: [],
    async send(cmd) {
      const kind = cmd.__kind
      const key = cmd.__input?.Key
      if (kind === 'head') {
        s3.headCalls.push(key)
        if (s3Objects.has(key)) return {}
        const e = new Error('NotFound'); e.name = 'NotFound'
        e.$metadata = { httpStatusCode: 404 }
        throw e
      }
      if (kind === 'put') { s3.putCalls.push(key); return {} }
      return {}
    },
  }

  const origLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === '@supabase/supabase-js') {
      return { createClient: () => supabase }
    }
    if (request === '@aws-sdk/client-s3') {
      const mk = kind => class { constructor(input) { this.__kind = kind; this.__input = input } }
      return {
        S3Client: class { send(cmd) { return s3.send(cmd) } },
        HeadObjectCommand: mk('head'),
        PutObjectCommand: mk('put'),
        GetObjectCommand: mk('get'),
      }
    }
    if (request.endsWith('tts-service.cjs')) return tts
    return origLoad.apply(this, arguments)
  }

  process.env.PHASE8_NO_LISTEN = '1'

  let phase8
  try {
    phase8 = require(PHASE8)
  } finally {
    Module._load = origLoad
  }

  return { phase8, supabase, tts, s3, db: supabase.db }
}

// ---------------------------------------------------------------------------
// Fixture: a two-slot scratch course with ONE lego whose target1 clip is
// already linked and is the "bad" audio the operator wants replaced.
// ---------------------------------------------------------------------------
const COURSE = {
  course_code: 'zzz_for_qqq',
  known_lang: 'qqq',
  target_lang: 'zzz',
}

const BAD_S3_KEY = 'audio/zzz_for_qqq/BAD-CLIP.mp3'

function fixtureTables({ linked = true, audioRowPresent = true } = {}) {
  const audioRow = {
    id: 'aud-bad-1',
    course_code: COURSE.course_code,
    text: 'kotva',
    text_normalized: 'kotva',
    language: 'zzz',
    role: 'target1',
    voice_id: 'azure_zz-ZZ-TestNeural',
    origin: 'tts',
    s3_key: BAD_S3_KEY,
    lego_id: null,
  }
  return {
    course_audio: audioRowPresent ? [audioRow] : [],
    course_legos: [{
      id: 'S0001L01',
      course_code: COURSE.course_code,
      seed_number: 1,
      known_text: 'anchor',
      target_text: 'kotva',
      known_audio_id: 'aud-known-1',
      target1_audio_id: linked ? 'aud-bad-1' : null,
      target2_audio_id: 'aud-t2-1',
      presentation_audio_id: 'aud-pres-1',
      components: null,
    }],
    course_practice_phrases: [],
    course_seeds: [],
    courses: [COURSE],
  }
}

module.exports = { loadPhase8, fixtureTables, COURSE, BAD_S3_KEY }
