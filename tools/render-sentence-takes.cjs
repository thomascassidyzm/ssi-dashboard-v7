#!/usr/bin/env node
/**
 * render-sentence-takes.cjs — render NATURAL per-sentence takes for every
 * multi-sentence pod turn and link them (sentence_audio_ids /
 * sentence_known_audio_ids on listening_pod_sentences).
 *
 * WHY (Tom 2026-07-07): a course whose turn audio gets re-rendered loses its
 * June silence-split sentence clips (fra_for_eng: 0/142 split turns) — the
 * app then falls back to WHOLE-TURN rows in the main flow. Rather than
 * re-split the new takes (found-pause cutting — "a BAD split is WORSE than
 * NO split"), render each sentence as its OWN take with the turn's cast
 * voices: exact by construction, no slice gate, and the fusion ladder's
 * whole-sentence rung gets a real natural take instead of the gapped Take G.
 *
 * Sentence boundaries come from the MOLECULAR atom_map_fine partition
 * (agent-authored, tiling-verified) walked over the original turn text so
 * punctuation survives; regex sentence-split is the fallback for turns
 * without a fine map. Known-side sentences render only when their count
 * matches the target side (splitRowUnits pairs by index).
 *
 *   PHASE8_NO_LISTEN=1 node tools/render-sentence-takes.cjs <course> [orders] [--dry]
 *
 * Idempotent: target-side sentence_audio_ids that are already fully linked
 * are never re-rendered. The known side is re-resolved through
 * generatePodAudio's text+voice dedup on every run (a cheap DB lookup, no
 * TTS call unless the text actually changed) so a known-text-only edit
 * (target unchanged) still regenerates its stale fine-ladder clips instead
 * of being skipped as "already linked" — TTS costs money — run under an
 * approved plan.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const p8 = require('../services/phases/phase8-audio-v13.cjs')

const COURSE = process.argv[2]
const ORDERS = (process.argv[3] || '').split(',').map(Number).filter(Boolean)
const dry = process.argv.includes('--dry')
if (!COURSE) { console.error('usage: render-sentence-takes.cjs <course> [orders] [--dry]'); process.exit(1) }
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const SENTENCE_PUNCT = /[.!?…。！？؟]/
// CJK terminals (。！？) split with or without a following space — CJK text has none,
// and a \s+ split saw multi-sentence Japanese/Chinese turns as ONE sentence. Latin
// marks keep requiring whitespace so decimals ("3.5") and abbreviations don't split.
const SENTENCE_SPLIT = /(?<=[。！？])\s*(?=\S)|(?<=[.!?…؟])\s+(?=\S)/

// Raw (unglued) sentence partition of the fine units — same walk as the
// Take G grouping, minus the interjection glue (sentence_audio_ids are
// per RAW sentence; splitRowUnits pairs them 1:1 with the text split).
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

/** The ORIGINAL text span (punctuation and all) covering each raw group. */
function sentenceTextsFromGroups(turnText, groups) {
  const lower = turnText.toLowerCase()
  const spans = []
  let cursor = 0
  for (const g of groups) {
    const first = lower.indexOf(g[0].target_surface.toLowerCase(), cursor)
    if (first === -1) return null
    let end = first
    for (const a of g) {
      const idx = lower.indexOf(a.target_surface.toLowerCase(), end)
      if (idx === -1) return null
      end = idx + a.target_surface.length
    }
    // extend through trailing punctuation (the sentence's terminal mark)
    const tail = turnText.slice(end)
    const stop = tail.search(/(?<=[.!?…。！？؟])/)
    spans.push({ start: first, end: stop === -1 ? turnText.length : end + stop })
    cursor = spans[spans.length - 1].end
  }
  return spans.map((s) => turnText.slice(s.start, s.end).trim()).filter(Boolean)
}

;(async () => {
  const { data: pod } = await supabase.from('listening_pods').select('speakers').eq('id', `${COURSE}:pod-0`).single()
  if (!pod || !pod.speakers) { console.error(`ERR: no speakers cast on ${COURSE}:pod-0`); process.exit(1) }
  const { data: course } = await supabase.from('courses').select('voice_config').eq('course_code', COURSE).single()
  const vc = ((course || {}).voice_config || {}).voices || {}
  const targetLang = vc.target1?.language || COURSE.split('_')[0]
  const knownLang = vc.known?.language || COURSE.split('_for_')[1] || 'eng'

  let q = supabase.from('listening_pod_sentences')
    .select('id, global_order, speaker, target_text, known_text, atom_map_fine, sentence_audio_ids, sentence_known_audio_ids')
    .eq('pod_id', `${COURSE}:pod-0`).order('global_order')
  if (ORDERS.length) q = q.in('global_order', ORDERS)
  const { data: sents, error } = await q
  if (error) { console.error(error.message); process.exit(1) }

  let rendered = 0, reused = 0, singles = 0, linked = 0, failed = 0, skipped = 0
  async function processTurn(s) {
    const atoms = (s.atom_map_fine || []).filter((a) => a.kind !== 'note' && a.target_surface)
    const tSents = atoms.length
      ? sentenceTextsFromGroups(s.target_text || '', atomGroups(s.target_text, atoms))
      : (s.target_text || '').split(SENTENCE_SPLIT).map((x) => x.trim()).filter(Boolean)
    if (!tSents) { console.log(`S${s.global_order}: ✗ fine units don't walk the turn text`); failed++; return }
    if (tSents.length < 2) { singles++; return } // whole-turn take IS the sentence

    const kSents = (s.known_text || '').split(SENTENCE_SPLIT).map((x) => x.trim()).filter(Boolean)
    const doKnown = kSents.length === tSents.length
    const targetLinked = Array.isArray(s.sentence_audio_ids) && s.sentence_audio_ids.filter(Boolean).length === tSents.length
    if (targetLinked && !doKnown) { skipped++; return } // nothing this run can do for a mismatched known side

    const tVoice = p8.resolvePodSpeakerVoice(pod.speakers, s.speaker, 'target')
    const kVoice = p8.resolvePodSpeakerVoice(pod.speakers, s.speaker, 'known')
    if (!targetLinked && !tVoice) { console.log(`S${s.global_order}: ✗ no target voice for "${s.speaker}"`); failed++; return }

    if (dry) {
      console.log(`S${s.global_order} [${s.speaker}]: ${tSents.length} sentences${targetLinked ? ' (target linked)' : ''} — ${tSents.join(' ‖ ')}${doKnown ? '' : '  (known side skipped)'}`)
      return
    }
    try {
      let tIds = s.sentence_audio_ids
      if (!targetLinked) {
        tIds = []
        for (const text of tSents) {
          const res = await p8.generatePodAudio({ courseCode: COURSE, text, language: targetLang, role: 'target1', voice: tVoice })
          res.reused ? reused++ : rendered++
          tIds.push(res.id)
        }
      }
      let kIds = null, kChanged = false
      if (doKnown && kVoice) {
        kIds = []
        for (const text of kSents) {
          const res = await p8.generatePodAudio({ courseCode: COURSE, text, language: knownLang, role: 'known', voice: kVoice })
          res.reused ? reused++ : rendered++
          kIds.push(res.id)
        }
        const prevKnown = Array.isArray(s.sentence_known_audio_ids) ? s.sentence_known_audio_ids : []
        kChanged = prevKnown.length !== kIds.length || kIds.some((id, i) => id !== prevKnown[i])
      }
      if (targetLinked && !kChanged) { skipped++; return } // known side re-resolved to the same ids — no drift

      const update = {}
      if (!targetLinked) update.sentence_audio_ids = tIds
      if (kIds && kChanged) update.sentence_known_audio_ids = kIds
      const { error: werr } = await supabase.from('listening_pod_sentences').update(update).eq('id', s.id)
      if (werr) { console.log(`S${s.global_order}: LINK FAIL ${werr.message}`); failed++; return }
      linked++
    } catch (e) {
      console.log(`S${s.global_order}: ✗ ${e.message.slice(0, 120)}`)
      failed++
    }
  }

  const CONC = Number(process.env.RENDER_CONC || 6)
  let next = 0
  const worker = async () => { while (next < (sents || []).length) await processTurn(sents[next++]) }
  await Promise.all(Array.from({ length: Math.min(CONC, (sents || []).length) }, worker))
  console.log(`\n${dry ? '[DRY] ' : ''}${COURSE}: ${linked} turns linked (${rendered} rendered, ${reused} reused), ${singles} single-sentence, ${skipped} already linked, ${failed} failed.`)
  process.exit(failed ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
