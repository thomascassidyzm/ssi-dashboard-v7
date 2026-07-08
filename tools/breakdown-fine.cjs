#!/usr/bin/env node
/**
 * breakdown-fine.cjs — author the DRAFT fine-granularity unit map for a pod
 * course, into listening_pod_sentences.atom_map_fine. NO TTS, NO writes to the
 * live atom_map: this is the text-only first step of the Stage-0 fusion-ladder
 * pilot (Aran's model, 2026-07-01/02), so the CUTS can be judged by eye in the
 * Pod Lab before any audio money is spent.
 *
 * THE MODEL: units are natural PROSODIC units of meaning — the beats a careful
 * speaker separates when saying the sentence slowly for a learner. FINER than
 * the intention-level live atom_map (which keeps whole clauses as one atom):
 * each clause breaks into its speech beats. These seams are where the future
 * Take G (slow gapped take) will breathe, so every seam must be a natural
 * place to pause. Units tile each sentence; punctuation seams are mandatory.
 *
 *   node tools/breakdown-fine.cjs <course> [orders] [--dry]
 *   node tools/breakdown-fine.cjs zho_for_eng              # whole pod-0
 *   node tools/breakdown-fine.cjs zho_for_eng 25,1,3 --dry # preview only
 *
 * Same skeleton as breakdown-flat.cjs (claude CLI, tiling verification, worker
 * pool) minus every render step. Idempotent: re-running overwrites the draft.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const { execFile } = require('child_process')

const COURSE = process.argv[2]
const ORDERS = (process.argv[3] || '').split(',').map(Number).filter(Boolean)
const dry = process.argv.includes('--dry')
const MODEL = process.env.BD_MODEL || 'opus'
if (!COURSE) { console.error('usage: breakdown-fine.cjs <course> [orders] [--dry]'); process.exit(1) }
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const bare = (s) => (s || '').toLowerCase().replace(/[.,!?;:¿¡"'’，。？！、]/g, '').replace(/\s+/g, ' ').trim()
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

// The learner's KNOWN language from the course code (X_for_KNOWN) — glosses are
// authored in it (wave 3: eng_for_X / X_for_jpn have non-English knowns).
const KNOWN_NAMES = { eng: 'English', jpn: 'Japanese', zho: 'Chinese', spa: 'Spanish', fra: 'French', deu: 'German', ita: 'Italian', por: 'Portuguese', ara: 'Arabic', gle: 'Irish', cym: 'Welsh', rus: 'Russian', nld: 'Dutch', kor: 'Korean', hin: 'Hindi' }
const KNOWN = KNOWN_NAMES[(COURSE.split('_for_')[1] || 'eng').split('_')[0]] || 'the learner\'s language'

const RULES = `You author the MOLECULAR chunk breakdown for ONE dialogue TURN — the seams where a slow, careful take of this speech will pause for a learner. A pause WILL BE SYNTHESIZED at every seam you place (the gapped TTS take inserts one), and each chunk becomes an audio slice paired with its translation — so every seam is a real, audible commitment.
THE MODEL — chunks are MOLECULAR, not atomic (Tom 2026-07-05): breath-groups / clause-sized spans, typically 3–6 words (Chinese/Japanese: typically 4–10 characters) — "good morning Anna," | "what are you thinking" | "of doing today?" — NOT single words, NOT minimal grammar atoms. The learner should hear a chunk and feel a whole piece of the idea, while still seeing how the sentence is built from its parts.
THE TEST for every seam: "would a careful speaker naturally pause HERE when saying this slowly — and would a comma there read naturally?" If a pause there would sound wrong, do NOT split there. Never split inside anything spoken as one breath (a fused expression, a verb and its bound particle, a measure word and its noun).
SEAMS LOOK BOTH WAYS: the fragment on EACH side of a seam must itself be a natural beat. Never strand a bare word that merely completes or introduces a phrase — a conjunction ALWAYS attaches to the clause it introduces ("mais je ne peux pas parler" is ONE chunk, never "… mais | je ne peux pas"), a subject pronoun to its verb phrase, bound particles to their host. Before keeping any seam, say each side aloud alone: if either side sounds like a stub, merge it.
CROSS-LANGUAGE 1:1 — each chunk's gloss must translate EXACTLY that chunk, no more and no less: no word of meaning may sit in the neighbouring chunk's gloss (if "but" is in this chunk's target, "but" belongs in THIS gloss). A learner will hear the chunk audio against exactly this gloss; any drift between them is a defect.
- a typical sentence yields 1–3 chunks; a short sentence is ONE chunk (do not split what fits in one breath).
- Punctuation breaks are MANDATORY seams; a chunk NEVER spans any punctuation mark and NEVER crosses a sentence boundary (. ! ? 。 ！ ？ ؟).
- Chunks must TILE each sentence IN ORDER — their surfaces, concatenated, reconstruct it exactly.
- Snap to the speaking-course LEGO seams below where they fit — they mark units this course's learners already own.
- Each chunk is glossed with its LITERAL/contextual meaning in natural ${KNOWN} a learner instantly understands (the ACTUAL contextual sense, not a dictionary lump) — the learner's own language is ${KNOWN}; never gloss in any other language. Word-order of the gloss follows the TARGET's construction where that helps show how the target builds the idea.
- Proper nouns / NAMES → source "name", gloss null.
Output ONLY JSON: {"atoms":[{"target":"...","gloss":"... or null","source":"lego|llm|name"}]}`

// Tiling + boundary check: units must exactly tile EACH sentence in order.
// Comparison is MARK-INSENSITIVE (NFC, then letters/digits only): models habitually strip
// Arabic/Farsi combining diacritics (tanween etc.) from returned chunks — a normalisation
// artefact, not a bad seam; base letters must still tile exactly. On success each unit's
// surface is SNAPPED back to the verbatim source span, so dropped diacritics come back and
// nothing the model invented is ever stored. Returns snapped units, or null on mismatch.
const cmp = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
function tileAndSnap(units, targetText) {
  const sents = String(targetText).split(/(?<=[.!?。！？…؟])/).map((raw) => {
    const nfc = raw.normalize('NFC')
    let keep = ''; const map = []
    for (let i = 0; i < nfc.length; i++) {
      const c = cmp(nfc[i])
      for (let k = 0; k < c.length; k++) { keep += c[k]; map.push(i) }
    }
    return { raw: nfc, keep, map }
  }).filter((x) => x.keep)
  let si = 0, pos = 0
  const out = []
  for (const u of units) {
    const ua = cmp(u.target)
    if (!ua) continue
    if (si >= sents.length) return null
    const s = sents[si]
    if (s.keep.slice(pos, pos + ua.length) !== ua) return null
    let end = s.map[pos + ua.length - 1] + 1
    while (end < s.raw.length && /\p{M}/u.test(s.raw[end])) end++ // chunk-final combining marks ride along
    out.push({ ...u, target: s.raw.slice(s.map[pos], end).trim() })
    pos += ua.length
    if (pos === s.keep.length) { si++; pos = 0 }
  }
  return si === sents.length && pos === 0 ? out : null
}

;(async () => {
  const { data: legos } = await supabase.from('course_legos').select('target_text, known_text').eq('course_code', COURSE).limit(5000)
  const inv = (legos || []).filter(l => l.target_text && l.known_text).map(l => ({ t: l.target_text, k: l.known_text, b: bare(l.target_text) }))
  let q = supabase.from('listening_pod_sentences').select('id, global_order, target_text, known_text').eq('pod_id', `${COURSE}:pod-0`).order('global_order')
  if (ORDERS.length) q = q.in('global_order', ORDERS)
  const { data: sents } = await q

  let ok = 0, tilefail = 0
  async function processTurn(s) {
    const sb = ' ' + bare(s.target_text) + ' '
    const matches = inv.filter(l => l.b.length >= 2 && sb.includes(l.b)).sort((a, c) => c.b.length - a.b.length).slice(0, 24).map(l => `  "${l.t}" = ${l.k}`)
    const prompt = `${RULES}\n\nSPEAKING-COURSE LEGO UNITS present:\n${matches.join('\n') || '  (none)'}\n\nTURN (${COURSE}):\ntarget: ${s.target_text}\nknown:  ${s.known_text}\n\nJSON only:`
    let plan
    try { const o = await claude(prompt); plan = JSON.parse(o.slice(o.indexOf('{'), o.lastIndexOf('}') + 1)) } catch (e) { console.log(`S${s.global_order}: PARSE FAIL`); return }
    let units = (plan.atoms || []).map(a => ({ ...a, target: cleanSurface(a.target) })).filter(a => alnum(a.target))
    units = tileAndSnap(units, s.target_text)
    if (!units) {
      console.log(`S${s.global_order}: ✗ TILING/BOUNDARY MISMATCH — skipped`)
      tilefail++; return
    }
    const map = units.map(a => {
      const t = String(a.target).trim()
      const isName = a.source === 'name' || !a.gloss
      return {
        kind: isName ? 'passthrough' : 'atom',
        gloss: isName ? null : String(a.gloss).trim(),
        lego_key: isName ? null : `s${s.global_order}-${slug(t)}`,
        target_surface: t,
        target_start_ms: null,
        target_end_ms: null,
      }
    })
    if (!dry) await supabase.from('listening_pod_sentences').update({ atom_map_fine: map }).eq('id', s.id)
    console.log(`S${s.global_order}: ✓ ${map.length} units — ${units.map(a => a.gloss ? a.target : a.target + '(name)').join(' | ')}`)
    ok++
  }
  const CONC = Number(process.env.BD_CONC || 20)
  let next = 0
  const worker = async () => { while (next < sents.length) await processTurn(sents[next++]) }
  await Promise.all(Array.from({ length: Math.min(CONC, sents.length) }, worker))
  console.log(`\n${dry ? '[DRY] ' : ''}${COURSE}: ${ok} authored → atom_map_fine, ${tilefail} tiling-fail.`)
  process.exit(0)
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
