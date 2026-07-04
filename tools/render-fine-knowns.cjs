#!/usr/bin/env node
/**
 * render-fine-knowns.cjs — render the KNOWN-language (English) clips the
 * unified ladder plays below the whole sentence, into course_audio under
 * role 'pod_fine_known':
 *
 *   - one clip per distinct fine-unit GLOSS (atom_map_fine, kind='atom') —
 *     the plain translation the unit rung plays ('means,' formula retired)
 *   - one clip per distinct fusion-WINDOW translation (window_known_map,
 *     authored by author-window-knowns.cjs)
 *
 * Clips are keyed by TEXT (deduped on phase8's normalizeForAudio), so a
 * window whose English equals a unit's gloss shares one clip, and the
 * composer resolves any chunk's known audio by its known text — no link
 * columns. Voice = the fleet's single KNOWN coach voice (Tom's xAI clone for
 * English), read from voice_config like breakdown-flat does.
 *
 *   node tools/render-fine-knowns.cjs <course> [--dry]
 *
 * Idempotent: generatePodAudio reuses by text+voice+role hash. TTS costs
 * money — run only under an approved plan.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const p8 = require('../services/phases/phase8-audio-v13.cjs')
const { normalizeForAudio } = require('../services/shared/text-normalize.cjs')

const COURSE = process.argv[2]
const dry = process.argv.includes('--dry')
if (!COURSE) { console.error('usage: render-fine-knowns.cjs <course> [--dry]'); process.exit(1) }
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ROLE = 'pod_fine_known'
const TOM_CLONE = 'gfzdpspr5fdp'
const XAI_OFFICIAL = new Set(['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'zh', 'ja', 'ko', 'vi', 'hi', 'bn', 'ar', 'tr', 'pl'])
const base = (l) => String(l || '').toLowerCase().split('-')[0]

;(async () => {
  const { data: course } = await supabase.from('courses').select('voice_config').eq('course_code', COURSE).single()
  const kn = ((course && course.voice_config && course.voice_config.voices) || {}).known
  if (!kn || !kn.voiceId) { console.error(`ERR: ${COURSE} voice_config missing known`); process.exit(1) }
  const KNOWN_LANG = base(kn.language) || 'en'
  const VOICE = KNOWN_LANG === 'en' ? { voice_id: TOM_CLONE, provider: 'xai', locale: 'en' }
    : XAI_OFFICIAL.has(KNOWN_LANG) ? { voice_id: 'eve', provider: 'xai', locale: KNOWN_LANG }
    : { voice_id: kn.voiceId, provider: kn.provider, locale: kn.language }
  console.log(`${COURSE}: known=${VOICE.voice_id}/${VOICE.provider}/${KNOWN_LANG}${dry ? '  [DRY]' : ''}`)

  const { data: sents, error } = await supabase.from('listening_pod_sentences')
    .select('global_order, atom_map_fine, window_known_map')
    .eq('pod_id', `${COURSE}:pod-0`).order('global_order')
  if (error) { console.error(error.message); process.exit(1) }

  // Distinct texts, first-come order; norm-key mirrors findExistingAudio.
  const texts = new Map() // normKey → text
  let unitTexts = 0, windowTexts = 0
  for (const s of sents || []) {
    for (const a of s.atom_map_fine || []) {
      if (a.kind !== 'atom' || !a.gloss) continue
      const k = normalizeForAudio(a.gloss)
      if (!texts.has(k)) { texts.set(k, a.gloss.trim()); unitTexts++ }
    }
    for (const w of s.window_known_map || []) {
      if (!w.known) continue
      const k = normalizeForAudio(w.known)
      if (!texts.has(k)) { texts.set(k, w.known.trim()); windowTexts++ }
    }
  }
  const todo = [...texts.values()]
  console.log(`${COURSE}: ${todo.length} distinct texts (${unitTexts} unit glosses + ${windowTexts} window-only)`)
  if (dry) { todo.slice(0, 20).forEach((t) => console.log(`  "${t}"`)); process.exit(0) }

  let rendered = 0, reused = 0, failed = 0
  async function renderOne(text) {
    try {
      const res = await p8.generatePodAudio({ courseCode: COURSE, text, language: KNOWN_LANG, role: ROLE, voice: VOICE })
      res.reused ? reused++ : rendered++
      if ((rendered + reused) % 100 === 0) console.log(`  …${rendered + reused}/${todo.length} (${rendered} new)`)
    } catch (e) {
      failed++
      console.log(`  ✗ "${text.slice(0, 60)}" — ${e.message.slice(0, 120)}`)
    }
  }
  const CONC = Number(process.env.RENDER_CONC || 8)
  let next = 0
  const worker = async () => { while (next < todo.length) await renderOne(todo[next++]) }
  await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, worker))

  const { count } = await supabase.from('course_audio')
    .select('id', { count: 'exact', head: true }).eq('course_code', COURSE).eq('role', ROLE)
  console.log(`\n${COURSE}: ${rendered} rendered, ${reused} reused, ${failed} failed → course_audio role=${ROLE} now ${count} rows.`)
  process.exit(failed ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
