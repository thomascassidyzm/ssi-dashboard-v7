#!/usr/bin/env node
/**
 * breakdown-flat.cjs — author the FLAT, TILING atom_map for a pod course.
 *
 * THE MODEL (Tom 2026-06-30): the INTENTION is the unit; the atoms exist ONLY to
 * EXPLAIN how THIS target language builds it. Break per BEST FIT for the
 * language-pair — only where the split reveals a genuinely reusable construction
 * (a transparent compound, an idiom particle); otherwise keep the whole intention
 * as one glossed atom. No cross-language consistency ("good morning" breaks in
 * Croatian, stays whole in Italian — both correct). The reusable unit is
 * frequently multi-word; don't shred useful chunks into bare words.
 *
 * Per turn: LLM authors a flat atom_map that TILES the turn (surfaces reconstruct
 * it, never crossing a sentence boundary), then renders the "[atom] <surface>"
 * slices (in the course's TARGET voice) + "means, <gloss>" clips (in the course's
 * KNOWN/English voice), and writes listening_pod_sentences.atom_map. Idempotent.
 * The composer (preview + runtime) splits per sentence + partitions per intention.
 *
 *   node tools/breakdown-flat.cjs <course> [orders] [--dry]
 *   node tools/breakdown-flat.cjs hrv_for_eng            # whole pod
 *   node tools/breakdown-flat.cjs ita_for_eng 1,8,12 --dry
 *
 * Voices are read from courses.voice_config (target1 → atom, known → means), so
 * it self-configures per course (Azure / xAI, correct locale). --dry renders
 * nothing and writes nothing (LLM authoring only — outside the TTS cost gate).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
process.env.PHASE8_NO_LISTEN = '1'
const { createClient } = require('@supabase/supabase-js')
const { execFile } = require('child_process')

const COURSE = process.argv[2]
const ORDERS = (process.argv[3] || '').split(',').map(Number).filter(Boolean)
const dry = process.argv.includes('--dry')
const MODEL = process.env.BD_MODEL || 'opus'
const ROLE = 'pod_explainer'
if (!COURSE) { console.error('usage: breakdown-flat.cjs <course> [orders] [--dry]'); process.exit(1) }
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const p8 = require('../services/phases/phase8-audio-v13.cjs')
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim()
const bare = (s) => (s || '').toLowerCase().replace(/[.,!?;:¿¡"'’]/g, '').replace(/\s+/g, ' ').trim()
const alnum = (s) => (s || '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '')
const slug = (s) => bare(s).replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').slice(0, 64)
const cleanSurface = (s) => String(s || '').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim()

function claude(prompt) {
  return new Promise((res, rej) => {
    const e = { ...process.env }; delete e.CLAUDECODE
    execFile(process.env.HOME + '/.local/bin/claude', ['--print', '--model', MODEL, prompt], { env: e, maxBuffer: 1 << 22 },
      (err, o) => err ? rej(err) : res(o.trim()))
  })
}

const RULES = `You author the ATOM breakdown for ONE dialogue TURN.
FIRST PRINCIPLE — the INTENTION is the unit; the atoms exist ONLY to EXPLAIN how THIS target language builds it. Breaking is a teaching aid, never the unit. So break ONLY where the split reveals a GENUINELY REUSABLE construction in this target language. Where a split explains nothing useful (a fused / lexicalised unit), KEEP THE WHOLE INTENTION AS ONE ATOM, still glossed.
BEST FIT, PER LANGUAGE-PAIR — judge ONLY from the actual target below; there is NO cross-language consistency to honour. The same idea may break in one language and stay whole in another, and that is correct (e.g. "good morning" that is literally good+morning, both parts recurring, SHOULD break; a single fused greeting word should NOT).
GRANULARITY — the reusable unit is FREQUENTLY MULTI-WORD; the chunk IS the construction, and splitting it into bare words explains nothing extra. KEEP multi-word units together: "un caffè"="a coffee", "con latte"="with milk", "senza zucchero"="without sugar", "sono occupato"="I'm busy", "sono molto stanca"="I'm very tired", "žao mi je"="I'm sorry", "S mlijekom"="with milk". Go FINER (word-level) ONLY when the finer split itself reveals a reusable pattern — a transparent compound ("Dobro jutro" → "dobro"=good + "jutro"=morning) or an idiom particle ("A domani" → "a"=at/towards/until + "domani"=tomorrow). DEFAULT to the larger useful chunk; when in doubt, do NOT split.
Each atom is glossed with its LITERAL/contextual meaning (ZUT — the ACTUAL contextual sense, not a dictionary lump). When you DO break, the parts get LITERAL glosses and the natural whole meaning lives on the sentence, not the atom.
- Snap to the speaking-course LEGO seams below where they overlap — they signal the reusable units in THIS course.
- Proper nouns / NAMES → source "name", gloss null (kept in the phrase, never explained on their own).
Atoms must TILE the turn IN ORDER (their surfaces, concatenated, reconstruct it) and NEVER cross a sentence boundary (. ! ?).
Output ONLY JSON: {"atoms":[{"target":"...","gloss":"... or null","source":"lego|llm|name"}]}`

let ATOM_VOICE, MEANS_VOICE, ATOM_LANG, MEANS_LANG

async function ensureAtomSlice(surface) {
  const key = `[atom] ${surface}`
  const { data: ex } = await supabase.from('course_audio').select('id').eq('course_code', COURSE).eq('role', ROLE).eq('text_normalized', norm(key)).limit(1).maybeSingle()
  if (ex) return ex.id
  const res = await p8.generatePodAudio({ courseCode: COURSE, text: surface, language: ATOM_LANG, role: ROLE, voice: ATOM_VOICE })
  await supabase.from('course_audio').update({ text: key, text_normalized: norm(key) }).eq('id', res.id)
  return res.id
}
async function ensureMeans(legoKey, target, gloss, order) {
  const { data: pl } = await supabase.from('pod_legos').select('explainer_audio_id').eq('course_code', COURSE).eq('lego_key', legoKey).limit(1).maybeSingle()
  if (pl && pl.explainer_audio_id) return pl.explainer_audio_id
  const res = await p8.generatePodAudio({ courseCode: COURSE, text: `means, ${gloss}`, language: MEANS_LANG, role: ROLE, voice: MEANS_VOICE })
  await supabase.from('pod_legos').upsert({ id: require('crypto').randomUUID(), course_code: COURSE, lego_key: legoKey, target, known: gloss, explainer_audio_id: res.id, is_name: false, first_seen_order: order }, { onConflict: 'course_code,lego_key' })
  return res.id
}

;(async () => {
  // Voices from voice_config: target1 → atom (target lang), known → means (English).
  const { data: course } = await supabase.from('courses').select('voice_config').eq('course_code', COURSE).single()
  const v = (course && course.voice_config && course.voice_config.voices) || {}
  const t1 = v.target1, kn = v.known
  if (!t1 || !t1.voiceId || !kn || !kn.voiceId) { console.error(`ERR: ${COURSE} voice_config missing target1/known`); process.exit(1) }
  ATOM_VOICE = { voice_id: t1.voiceId, provider: t1.provider, locale: t1.language }
  MEANS_VOICE = { voice_id: kn.voiceId, provider: kn.provider, locale: kn.language }
  ATOM_LANG = t1.language; MEANS_LANG = kn.language
  console.log(`${COURSE}: atom=${t1.voiceId}/${t1.provider}/${t1.language}  means=${kn.voiceId}/${kn.provider}/${kn.language}${dry ? '  [DRY — no render]' : ''}`)

  const { data: legos } = await supabase.from('course_legos').select('target_text, known_text').eq('course_code', COURSE).limit(5000)
  const inv = (legos || []).filter(l => l.target_text && l.known_text).map(l => ({ t: l.target_text, k: l.known_text, b: bare(l.target_text) }))
  let q = supabase.from('listening_pod_sentences').select('id, global_order, target_text, known_text').eq('pod_id', `${COURSE}:pod-0`).order('global_order')
  if (ORDERS.length) q = q.in('global_order', ORDERS)
  const { data: sents } = await q

  let ok = 0, tilefail = 0
  for (const s of sents) {
    const sb = ' ' + bare(s.target_text) + ' '
    const matches = inv.filter(l => l.b.length >= 2 && (sb.includes(' ' + l.b + ' ') || (sb.includes(' ' + l.b) && l.b.length > 3))).sort((a, c) => c.b.length - a.b.length).slice(0, 24).map(l => `  "${l.t}" = ${l.k}`)
    const prompt = `${RULES}\n\nSPEAKING-COURSE LEGO UNITS present:\n${matches.join('\n') || '  (none)'}\n\nTURN (${COURSE}):\ntarget: ${s.target_text}\nknown:  ${s.known_text}\n\nJSON only:`
    let plan
    try { const o = await claude(prompt); plan = JSON.parse(o.slice(o.indexOf('{'), o.lastIndexOf('}') + 1)) } catch (e) { console.log(`S${s.global_order}: PARSE FAIL`); continue }
    const atoms = (plan.atoms || []).map(a => ({ ...a, target: cleanSurface(a.target) })).filter(a => bare(a.target))
    const tiled = atoms.map(a => alnum(a.target)).join('')
    if (tiled !== alnum(s.target_text)) {
      console.log(`S${s.global_order}: ✗ TILING MISMATCH — skipped\n   want: ${alnum(s.target_text)}\n   got:  ${tiled}`)
      tilefail++; continue
    }
    const atomMap = []
    for (const a of atoms) {
      const t = String(a.target).trim()
      const isName = a.source === 'name' || !a.gloss
      const legoKey = `s${s.global_order}-${slug(t)}`
      if (!dry) await ensureAtomSlice(t)
      if (!isName && !dry) await ensureMeans(legoKey, t, String(a.gloss).trim(), s.global_order)
      atomMap.push({ kind: isName ? 'passthrough' : 'atom', gloss: isName ? null : String(a.gloss).trim(), lego_key: isName ? null : legoKey, target_surface: t, target_start_ms: null, target_end_ms: null })
    }
    if (!dry) await supabase.from('listening_pod_sentences').update({ atom_map: atomMap }).eq('id', s.id)
    console.log(`S${s.global_order}: ✓ ${atomMap.length} atoms — ${atoms.map(a => a.gloss ? a.target : a.target + '(name)').join(' · ')}`)
    ok++
  }
  console.log(`\n${dry ? '[DRY] ' : ''}${COURSE}: ${ok} authored, ${tilefail} tiling-fail.`)
  process.exit(0)
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
