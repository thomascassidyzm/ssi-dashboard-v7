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
 *   PHASE8_NO_LISTEN=1 node tools/render-sentence-takes.cjs <course> [orders] [--dry] [--pod=<slug>]
 *
 * --pod (2026-08-24): the tool was hard-wired to `<course>:pod-0`. The live
 * learner-facing pod is now `pod-1` on 22 courses, and its split arrays were
 * NULLed by the inheritance repair (1053db318) — leaving multi-sentence turns
 * playing to the learner as one undifferentiated block (podSentenceSplit.ts
 * returns a single whole-turn unit when a row has fewer than 2 sentence clips).
 * The pod slug is now selectable so a rebuild derives from the LIVE pod's own
 * rows and its OWN cast — never positionally from another pod, which was the
 * original disease. Default stays pod-0 for every existing caller.
 *
 * --dry now COSTS the run: each sentence is looked up through the same
 * findExistingAudio dedup key generatePodAudio uses, so the reuse-vs-new split
 * is known before a penny is spent (the TTS approval gate in CLAUDE.md).
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
const POD_SLUG = (process.argv.find((a) => a.startsWith('--pod=')) || '--pod=pod-0').slice(6)
// --only-missing (2026-08-24): touch ONLY turns whose target side is unlinked.
// A turn that is already correctly split is not this job's problem, and the
// known-side re-resolve below would spend real TTS on it for nothing. Verified
// before adding: all 611 surviving split rows across the 22 live Pod 1s carry
// clips whose text is contained in their OWN row's text — they are correct.
const onlyMissing = process.argv.includes('--only-missing')
// --free-only (2026-08-24): link ONLY the turns whose every sentence clip
// already exists under the dedup key — zero TTS calls, so no spend gate. Lets
// the ungated half of a rebuild land while the paid half waits for approval.
// On the Pod 1 fleet this is a thin seam (15 turns of 1,516): pod-1's
// per-sentence clips were never rendered in the first place, so there is very
// little to relink for free. Measuring it is the point — it is what says the
// rebuild is a render job, not a linking job.
const freeOnly = process.argv.includes('--free-only')
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
  const POD_ID = `${COURSE}:${POD_SLUG}`
  const { data: pod } = await supabase.from('listening_pods').select('speakers, visibility').eq('id', POD_ID).single()
  if (!pod || !pod.speakers) { console.error(`ERR: no speakers cast on ${POD_ID}`); process.exit(1) }
  const { data: course } = await supabase.from('courses').select('voice_config').eq('course_code', COURSE).single()
  const vc = ((course || {}).voice_config || {}).voices || {}
  const targetLang = vc.target1?.language || COURSE.split('_')[0]
  const knownLang = vc.known?.language || COURSE.split('_for_')[1] || 'eng'

  let q = supabase.from('listening_pod_sentences')
    .select('id, global_order, speaker, target_text, known_text, atom_map_fine, sentence_audio_ids, sentence_known_audio_ids')
    .eq('pod_id', POD_ID).order('global_order')
  if (ORDERS.length) q = q.in('global_order', ORDERS)
  const { data: sents, error } = await q
  if (error) { console.error(error.message); process.exit(1) }

  let rendered = 0, reused = 0, singles = 0, linked = 0, failed = 0, skipped = 0, fellBack = 0
  async function processTurn(s) {
    const atoms = (s.atom_map_fine || []).filter((a) => a.kind !== 'note' && a.target_surface)
    const regexSplit = () => (s.target_text || '').split(SENTENCE_SPLIT).map((x) => x.trim()).filter(Boolean)
    let tSents = atoms.length
      ? sentenceTextsFromGroups(s.target_text || '', atomGroups(s.target_text, atoms))
      : regexSplit()
    // A fine map that does NOT walk this row's own text cannot be trusted to
    // partition it. On the Pod 1 fleet that is not a rare authoring slip: on
    // ita_for_eng:pod-1, 27 of 141 fine maps fail the walk, and some describe a
    // completely different turn (S141's text is "Quanto costa?" while its fine
    // map is a long request about practising Italian) — atom_map_fine was
    // inherited positionally by the same clone that scrambled the split arrays.
    // Falling back to the regex split of the row's OWN text keeps the rule the
    // brief demands: derive from this row, never from another pod's data. The
    // regex is also exactly the app's own boundary (POD_SENTENCE_BOUNDARY in
    // podSentenceSplit.ts), so text and clips cannot disagree.
    if (!tSents) {
      tSents = regexSplit()
      console.log(`S${s.global_order}: ⚠ fine map doesn't walk own text — using own-text sentence split (${tSents.length})`)
      fellBack++
    }
    if (tSents.length < 2) { singles++; return } // whole-turn take IS the sentence

    const kSents = (s.known_text || '').split(SENTENCE_SPLIT).map((x) => x.trim()).filter(Boolean)
    const doKnown = kSents.length === tSents.length
    const targetLinked = Array.isArray(s.sentence_audio_ids) && s.sentence_audio_ids.filter(Boolean).length === tSents.length
    if (targetLinked && onlyMissing) { skipped++; return } // already split correctly — not this run's business
    if (targetLinked && !doKnown) { skipped++; return } // nothing this run can do for a mismatched known side

    const tVoice = p8.resolvePodSpeakerVoice(pod.speakers, s.speaker, 'target')
    const kVoice = p8.resolvePodSpeakerVoice(pod.speakers, s.speaker, 'known')
    if (!targetLinked && !tVoice) { console.log(`S${s.global_order}: ✗ no target voice for "${s.speaker}"`); failed++; return }

    if (dry) {
      // Cost the run on the SAME dedup key generatePodAudio uses, so the
      // reuse-vs-new split reported here is the real spend, not an estimate.
      // A single sentence never gets the multi-sentence " … " pause cue, so
      // the lookup text is the sentence text verbatim.
      let willRender = 0, willReuse = 0
      if (!targetLinked) {
        for (const text of tSents) {
          const hit = await p8.findExistingAudio(COURSE, text, targetLang, 'target1', tVoice.voice_id)
          hit ? willReuse++ : willRender++
        }
      }
      if (doKnown && kVoice) {
        for (const text of kSents) {
          const hit = await p8.findExistingAudio(COURSE, text, knownLang, 'known', kVoice.voice_id)
          hit ? willReuse++ : willRender++
        }
      }
      rendered += willRender; reused += willReuse; if (!targetLinked) linked++; else skipped++
      console.log(`S${s.global_order} [${s.speaker}]: ${tSents.length} sentences${targetLinked ? ' (target linked)' : ''} — new=${willRender} reuse=${willReuse}${doKnown ? '' : '  (known side skipped)'}`)
      return
    }
    try {
      if (freeOnly) {
        const need = []
        if (!targetLinked) for (const t of tSents) need.push(p8.findExistingAudio(COURSE, t, targetLang, 'target1', tVoice.voice_id))
        if (doKnown && kVoice) for (const t of kSents) need.push(p8.findExistingAudio(COURSE, t, knownLang, 'known', kVoice.voice_id))
        if ((await Promise.all(need)).some((id) => !id)) { skipped++; return }
      }
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
  console.log(`\n${dry ? '[DRY] ' : ''}${COURSE}: ${linked} turns linked (${rendered} rendered, ${reused} reused), ${singles} single-sentence, ${skipped} already linked, ${fellBack} own-text fallback, ${failed} failed.`)
  process.exit(failed ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
