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
 *   - one clip per distinct SENTENCE of each multi-sentence turn's known_text
 *     (glue-mapped to the ladder's sentence groups) — the whole-sentence
 *     known slot prefers these over the June silence-split take slices,
 *     several of which cut wrong (a 312ms "sentence" = its neighbour's tail)
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

const { XAI_OFFICIAL } = require('../services/shared/xai-catalogue.cjs')

const ROLE = 'pod_fine_known'
const TOM_CLONE = 'gfzdpspr5fdp'
const base = (l) => String(l || '').toLowerCase().split('-')[0]
const SENTENCE_PUNCT = /[.!?…。！？؟]/

// same grouping + glue as the Lab, to map known_text sentences onto groups
function atomGroups(targetText, atoms) {
  const text = targetText || ''
  const lower = text.toLowerCase()
  const groups = [[]]
  let cursor = 0
  for (let i = 0; i < atoms.length; i++) {
    const idx = lower.indexOf(atoms[i].target_surface.toLowerCase(), cursor)
    if (i > 0 && idx !== -1 && SENTENCE_PUNCT.test(text.slice(cursor, idx))) groups.push([])
    groups[groups.length - 1].push(atoms[i])
    if (idx !== -1) cursor = idx + atoms[i].target_surface.length
  }
  return groups.filter((g) => g.length)
}
// glued per-group known texts, or null when counts don't align
function gluedKnownTexts(targetText, atoms, knownText) {
  const rawGroups = atomGroups(targetText, atoms)
  if (rawGroups.length < 2) return null
  // CJK terminals split space-optionally (X_for_jpn knowns have no space after 。);
  // Latin marks keep requiring whitespace so decimals/abbreviations don't split.
  const sents = String(knownText || '').split(/(?<=[。！？])\s*(?=\S)|(?<=[.!?…؟])\s+(?=\S)/).filter(Boolean)
  if (sents.length !== rawGroups.length) return null
  const out = []
  let pushedAny = false
  let carry = []
  rawGroups.forEach((g, i) => {
    if (!pushedAny && g.length === 1 && i < rawGroups.length - 1) { carry.push(sents[i]); return }
    out.push([...carry, sents[i]].join(' '))
    pushedAny = true
    carry = []
  })
  if (carry.length) out.push(carry.join(' '))
  return out
}

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
    .select('global_order, target_text, known_text, atom_map_fine, window_known_map')
    .eq('pod_id', `${COURSE}:pod-0`).order('global_order')
  if (error) { console.error(error.message); process.exit(1) }

  // Distinct texts, first-come order; norm-key mirrors findExistingAudio.
  const texts = new Map() // normKey → text
  let unitTexts = 0, windowTexts = 0, sentenceTexts = 0, unalignedTurns = 0
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
    const atoms = (s.atom_map_fine || []).filter((a) => a.kind !== 'note')
    if (atoms.length) {
      const kts = gluedKnownTexts(s.target_text, atoms, s.known_text)
      if (kts) {
        for (const t of kts) {
          const k = normalizeForAudio(t)
          if (!texts.has(k)) { texts.set(k, t.trim()); sentenceTexts++ }
        }
      } else if (String(s.known_text || '').split(/(?<=[。！？])\s*(?=\S)|(?<=[.!?…؟])\s+(?=\S)/).filter(Boolean).length > 1) {
        unalignedTurns++
      }
    }
  }
  const todo = [...texts.values()]
  console.log(`${COURSE}: ${todo.length} distinct texts (${unitTexts} unit glosses + ${windowTexts} window-only + ${sentenceTexts} sentence knowns; ${unalignedTurns} turns known-split-unaligned)`)
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
