#!/usr/bin/env node
/**
 * Pod recolour — re-assign pod speaker voices using the coverage map + graph
 * colouring, working directly on pods already in the DB (no markdown needed).
 * Reads each pod's stored sentences to rebuild the conversation graph, resolves
 * the per-language voice pools, colours so conversants never collide, and
 * (with --apply) updates listening_pods.speakers and NULLs the audio links of
 * only the sentences whose voice actually changed — so a subsequent
 * /generate-pods run regenerates the minimum.
 *
 * Usage:
 *   node tools/pod-recolour.cjs --course=fra_for_eng                 # dry-run all pods
 *   node tools/pod-recolour.cjs --course=fra_for_eng --pod=fra_for_eng:pod-0 --verbose
 *   node tools/pod-recolour.cjs --course=fra_for_eng --apply         # write speakers + null changed audio
 *
 * Dry-run prints a before/after collision report. Never generates TTS.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const { createClient } = require('@supabase/supabase-js')
const { resolveTargetPool, resolveKnownPool, loadVerifiedGenders } = require('./pod-voice-coverage.cjs')
const {
  buildAdjacency, buildTurnWeights, countAdjacentCollisions, assignVoicesColoured, trimPoolPerGender,
} = require('./pod-voice-colour.cjs')
const {
  canonicalSpeakerName, extractGenderMarker, inferGenderFromName, loadVoicePools,
} = require('./pod-sync.cjs')
const { parseNameMap } = require('../services/pod-dialogue-generator.cjs')
// Ground-truth gender check: read the gendered speech in a speaker's own lines
// (Thai ครับ/ค่ะ, gendered pronouns/verbs) so the voice matches what it utters.
// Shared with tools/audio-gender-lint.cjs so both judge gender identically.
const { detectGenderFromTexts } = require('./gendered-speech.cjs')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Resolve a canonical speaker's gender the same way pod-sync does: any variant
// with an explicit (F)/(M)/(N) wins, else the name heuristic, else 'n'.
function genderForCanon(variants) {
  for (const v of variants) { const g = extractGenderMarker(v); if (g) return g }
  return inferGenderFromName(variants[0] ? canonicalSpeakerName(variants[0]) : '') || 'n'
}

/**
 * Build a voice pool out of the voices a pod is ALREADY cast with, one track
 * at a time. Used by --pool-from=pod: re-deal the same voices across the
 * speakers rather than resolving fresh ones from the coverage map.
 *
 * Why this exists: the pod-0 casting rule is about WHICH SPEAKER gets WHICH of
 * the two voices, not about picking new voices. When a pod already resolves to
 * a sensible male/female pair, re-resolving from the coverage map can hand back
 * a worse pair (the eng known pool currently answers Tom for BOTH genders) and
 * would strand every already-generated clip for regeneration. Keeping the pair
 * is make-before-break: only the speakers whose side of the cut moved need new
 * audio.
 *
 * A voice's gender comes from app_config.pod_voice_pools — the table pod-sync
 * casts from, and the only place a VOICE's own gender is recorded. Only if the
 * voice is not in the table does this fall back to the gender of the speakers
 * it plays, weighted by line count (the rule collapseTwoVoiceCast uses).
 * That fallback is genuinely unreliable here: on the Spanish pod-0 the Learner
 * alone is 79 of 232 lines, so one mis-read speaker gender flips the whole
 * voice. Voices that resolve neither way are dropped, never guessed.
 *
 *   speakersMap: listening_pods.speakers
 *   track: 'target' | 'known'
 *   genderOf: (canon) → 'f'|'m'|'n'
 *   lineCountOf: (canon) → number
 *   voiceGenderById: Map voice_id → 'f'|'m' (from pod_voice_pools)
 * Returns { f:[voice], m:[voice] } in the pool shape.
 */
function poolFromPodCast(speakersMap, track, genderOf, lineCountOf, voiceGenderById) {
  const byVoice = new Map()   // voice_id → { voice, f, m }
  for (const [canon, entry] of Object.entries(speakersMap || {})) {
    if (canon === '_default') continue
    const v = entry && entry[track]
    if (!v || !v.voice_id) continue
    if (!byVoice.has(v.voice_id)) byVoice.set(v.voice_id, { voice: v, f: 0, m: 0 })
    const rec = byVoice.get(v.voice_id)
    const weight = Math.max(1, lineCountOf(canon) || 1)
    const g = genderOf(canon)
    if (g === 'f') rec.f += weight
    if (g === 'm') rec.m += weight
  }
  const pool = { f: [], m: [] }
  for (const [voiceId, { voice, f, m }] of byVoice) {
    const known = voiceGenderById && voiceGenderById.get(voiceId)
    if (known === 'f' || known === 'm') { pool[known].push(voice); continue }
    if (f === m) continue          // unresolvable — never guess a voice onto a gender
    pool[f > m ? 'f' : 'm'].push(voice)
  }
  return pool
}

/**
 * voice_id → 'f'|'m' across every language in app_config.pod_voice_pools.
 * Voice ids are globally unique handles, so one flat map serves all tracks.
 */
async function loadVoiceGenders() {
  const pools = await loadVoicePools()
  const map = new Map()
  for (const langPool of Object.values(pools || {})) {
    for (const gender of ['f', 'm']) {
      for (const v of (langPool && langPool[gender]) || []) {
        if (v && v.voice_id && !map.has(v.voice_id)) map.set(v.voice_id, gender)
      }
    }
  }
  return map
}

// Count collisions: adjacent (same-scene) speaker pairs sharing a track voice.
function countCollisions(adj, voiceOf) {
  let n = 0
  const seen = new Set()
  for (const [a, nbrs] of adj) {
    for (const b of nbrs) {
      const key = a < b ? `${a}|${b}` : `${b}|${a}`
      if (seen.has(key)) continue
      seen.add(key)
      const va = voiceOf(a), vb = voiceOf(b)
      if (va && vb && va === vb) n++
    }
  }
  return n
}

async function recolourPod(pod, targetPool, knownPool, opts) {
  const { data: sentences, error } = await supabase
    .from('listening_pod_sentences')
    .select('id, scene_number, global_order, speaker, target_text, target_audio_id, known_audio_id')
    .eq('pod_id', pod.id).order('global_order')
  if (error) throw new Error(`load sentences ${pod.id}: ${error.message}`)
  if (!sentences.length) return { pod_id: pod.id, skipped: 'no sentences' }

  // Group raw speakers by canonical name; build scenes as canonical-speaker lists.
  const variantsByCanon = new Map()
  const linesByCanon = new Map()  // canon → [target_text,...] (for gender detection)
  const scenesMap = new Map()  // scene_number → [canon,...]
  for (const s of sentences) {
    const canon = canonicalSpeakerName(s.speaker)
    if (!canon) continue
    if (!variantsByCanon.has(canon)) variantsByCanon.set(canon, new Set())
    variantsByCanon.get(canon).add(s.speaker)
    if (!linesByCanon.has(canon)) linesByCanon.set(canon, [])
    linesByCanon.get(canon).push(s.target_text || '')
    const sc = s.scene_number == null ? 0 : s.scene_number
    if (!scenesMap.has(sc)) scenesMap.set(sc, [])
    scenesMap.get(sc).push(canon)
  }
  const speakers = [...variantsByCanon.keys()]
  const scenes = [...scenesMap.values()]   // in turn order (built from global_order)
  const adj = buildAdjacency(scenes)
  const weights = buildTurnWeights(scenes)

  // Generated pods localise speaker names from the ledger ("Sarah → Sophie");
  // the gender name-heuristic knows the CANONICAL name, not necessarily the
  // local one — fall back through the pod's name map to the source name.
  const nameMap = parseNameMap(pod.metadata && pod.metadata.consistency_ledger)
  const sourceOfLocal = new Map(nameMap.map(e => [e.local.toLowerCase(), e.source]))
  // Resolve a speaker's gender, most-authoritative signal first:
  //   1. an explicit (F)/(M)/(N) marker on any variant (authorial intent),
  //   2. the gendered speech in the speaker's OWN lines — ground truth of what
  //      the voice will actually utter; this is what stops a male voice landing
  //      on Thai ค่ะ lines even when the label ("Waiter") gives no clue,
  //   3. the name heuristic (canonical, then the ledger's source name).
  const langCode = (opts && opts.targetLang) || null
  const genderOf = (canon) => {
    const variants = [...(variantsByCanon.get(canon) || [canon])]
    for (const v of variants) { const m = extractGenderMarker(v); if (m) return m }
    const textG = detectGenderFromTexts(linesByCanon.get(canon) || [], langCode)
    if (textG) return textG
    const byName = inferGenderFromName(canonicalSpeakerName(canon))
    if (byName) return byName
    const source = sourceOfLocal.get(canon.toLowerCase())
    return (source && inferGenderFromName(canonicalSpeakerName(source))) || 'n'
  }
  const meta = (canon) => ({ variants: [...(variantsByCanon.get(canon) || [])] })

  // BEFORE: collisions under the pod's current speakers map.
  const cur = pod.speakers || {}
  const curVoice = (track) => (canon) => {
    const e = cur[canon] || cur._default
    return e && e[track] ? e[track].voice_id : null
  }
  const beforeT = countCollisions(adj, curVoice('target'))
  const beforeK = countCollisions(adj, curVoice('known'))
  const beforeAdjT = countAdjacentCollisions(weights, curVoice('target'))
  const beforeAdjK = countAdjacentCollisions(weights, curVoice('known'))

  // --pool-from=pod: re-deal the voices this pod is already cast with, instead
  // of resolving fresh ones. Falls back to the passed pool for a track whose
  // existing cast doesn't yield a usable pair (e.g. a pod cast on one voice).
  let tPool = targetPool, kPool = knownPool
  if (opts && opts.poolFromPod) {
    const lineCountOf = (canon) => (linesByCanon.get(canon) || []).length
    for (const [track, fallback] of [['target', targetPool], ['known', knownPool]]) {
      const p = poolFromPodCast(pod.speakers, track, genderOf, lineCountOf, opts.voiceGenderById)
      const usable = p.f.length && p.m.length
      if (track === 'target') tPool = usable ? p : fallback
      else kPool = usable ? p : fallback
      if (!usable) {
        console.warn(`     ⚠️  ${pod.id}: ${track} cast yields no F/M pair — falling back to the resolved pool`)
      }
    }
  }

  // AFTER: colour with the resolved pools.
  const { assignments, report } = assignVoicesColoured({
    scenes, speakers, targetPool: tPool, knownPool: kPool, genderOf, meta,
  })
  // _default for re-run safety (a speaker added between syncs falls back here).
  const defT = (tPool.m[0] || tPool.f[0])
  const defK = (kPool.m[0] || kPool.f[0])
  if (defT && defK) {
    assignments._default = {
      gender: 'n',
      target: { provider: defT.provider, voice_id: defT.voice_id, name: defT.name, locale: defT.locale },
      known:  { provider: defK.provider, voice_id: defK.voice_id, name: defK.name, locale: defK.locale },
    }
  }
  const newVoice = (track) => (canon) => assignments[canon] && assignments[canon][track] ? assignments[canon][track].voice_id : null
  const afterT = countCollisions(adj, newVoice('target'))
  const afterK = countCollisions(adj, newVoice('known'))
  const afterAdjT = countAdjacentCollisions(weights, newVoice('target'))
  const afterAdjK = countAdjacentCollisions(weights, newVoice('known'))

  const result = {
    pod_id: pod.id,
    speakers: speakers.length,
    scenes: scenes.length,
    before: { target: beforeT, known: beforeK },
    after: { target: afterT, known: afterK },
    // adjacent-turn collisions = the "answers himself" metric (Tom 2026-06-11)
    beforeAdj: { target: beforeAdjT, known: beforeAdjK },
    afterAdj: { target: afterAdjT, known: afterAdjK },
    colours: { target: report.targetColours, known: report.knownColours },
    forced: { target: report.targetForced, known: report.knownForced },
    assignments,
    sentences,
  }
  return result
}

// Determine which sentences need their audio nulled (voice changed vs the clip
// that produced the existing audio). Returns { target:[ids], known:[ids] }.
async function changedAudio(result, courseCode) {
  const ids = []
  for (const s of result.sentences) {
    if (s.target_audio_id) ids.push(s.target_audio_id)
    if (s.known_audio_id) ids.push(s.known_audio_id)
  }
  const voiceById = new Map()
  if (ids.length) {
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await supabase.from('course_audio')
        .select('id, voice_id').in('id', ids.slice(i, i + 200))
      if (error) throw new Error(`load course_audio: ${error.message}`)
      for (const a of data) voiceById.set(a.id, a.voice_id)
    }
  }
  const out = { target: [], known: [] }
  for (const s of result.sentences) {
    const canon = canonicalSpeakerName(s.speaker)
    const a = result.assignments[canon] || result.assignments._default
    if (!a) continue
    if (s.target_audio_id && a.target && voiceById.get(s.target_audio_id) !== a.target.voice_id) out.target.push(s.id)
    if (s.known_audio_id && a.known && voiceById.get(s.known_audio_id) !== a.known.voice_id) out.known.push(s.id)
  }
  return out
}

async function main() {
  const args = process.argv.slice(2)
  const getArg = (f) => { for (const a of args) { if (a === f) return true; if (a.startsWith(f + '=')) return a.slice(f.length + 1) } return null }
  const courseCode = getArg('--course')
  const podFilter = getArg('--pod')
  const apply = !!getArg('--apply')
  const verbose = !!getArg('--verbose')
  if (!courseCode) { console.error('❌ --course=<code> required'); process.exit(1) }

  const targetLang = courseCode.split('_for_')[0]

  // Protected languages: skip to avoid disrupting live work. (Croatian was
  // protected for Aran's livecast until canon v2, 2026-06-10 — now empty.)
  // Override with --force only when you know the live work is paused.
  const PROTECTED = new Set([])
  if (PROTECTED.has(targetLang) && !getArg('--force')) {
    console.log(`\n⛔ ${courseCode}: target "${targetLang}" is PROTECTED (live use — Aran's Croatian livecast).`)
    console.log(`   Skipping. Pass --force only if the live work is paused.\n`)
    process.exit(0)
  }

  const knownLang = courseCode.split('_for_')[1] || 'eng'

  // The pod-0 casting rule (Tom, 2026-08-08) — two voices, cast by speaker.
  // --voices-per-gender=1 (the default) trims each pool to one F + one M, so
  // the colouring runs over a two-voice cast and every character keeps one
  // voice for every line they speak. Raise it for pod 1/2, where more voices
  // are wanted; the pair itself always comes from the language's own pool.
  const voicesPerGender = Math.max(1, parseInt(getArg('--voices-per-gender') || '1', 10) || 1)
  const poolFromPod = getArg('--pool-from') === 'pod'
  const keepAudio = !!getArg('--keep-audio')
  // Read the provider's own gender for every voice (voices.gender) BEFORE
  // resolving, so which voice fills a female slot is a fact rather than a
  // catalogue label. SELECT only; it changes nothing until this run applies.
  await loadVerifiedGenders()
  const targetPool = trimPoolPerGender(resolveTargetPool(targetLang), voicesPerGender)
  const knownPool = trimPoolPerGender(resolveKnownPool(knownLang), voicesPerGender)

  console.log(`\n🎨 Pod recolour: ${courseCode}  (${apply ? 'APPLY' : 'DRY-RUN'})`)
  console.log(`   Casting BY SPEAKER on ${voicesPerGender} voice(s) per gender` +
    `${voicesPerGender === 1 ? ' — the two-voice pod-0 rule' : ''}`)
  console.log(`   Target pool: tier ${targetPool.tier} · ${targetPool.note} · gender from ${targetPool.genderSource}`)
  console.log(`     F: ${targetPool.f.map(v => v.name).join(', ') || '(none)'}`)
  console.log(`     M: ${targetPool.m.map(v => v.name).join(', ') || '(none)'}`)
  console.log(`     locale → ${targetPool.locale}`)
  console.log(`   Known pool (${knownLang}): F ${knownPool.f.map(v => v.name).join('/')} · M ${knownPool.m.map(v => v.name).join('/')}`)
  if (targetPool.human) { console.log(`   ⚠️  HUMAN-only language — no TTS. Aborting.`); process.exit(0) }

  let podQuery = supabase.from('listening_pods').select('id, speakers, title, metadata').eq('course_code', courseCode)
  if (podFilter) podQuery = podQuery.eq('id', podFilter)
  const { data: pods, error } = await podQuery
  if (error) { console.error('❌', error.message); process.exit(1) }
  if (!pods.length) { console.log('   (no pods found)'); process.exit(0) }

  const voiceGenderById = poolFromPod ? await loadVoiceGenders() : null

  let totBefore = 0, totAfter = 0, totReassign = 0
  for (const pod of pods) {
    const r = await recolourPod(pod, targetPool, knownPool, { verbose, targetLang, poolFromPod, voiceGenderById })
    if (r.skipped) { console.log(`\n   ${pod.id}: skipped (${r.skipped})`); continue }
    totBefore += r.before.target + r.before.known
    totAfter += r.after.target + r.after.known
    console.log(`\n   ▸ ${r.pod_id}  (${r.speakers} speakers, ${r.scenes} scenes)`)
    console.log(`     collisions  target ${r.before.target}→${r.after.target}   known ${r.before.known}→${r.after.known}   (colours T${r.colours.target}/K${r.colours.known})`)
    console.log(`     adjacent-turn collisions (the "answers himself" metric)  target ${r.beforeAdj.target.turns}→${r.afterAdj.target.turns} turns (${r.beforeAdj.target.pairs}→${r.afterAdj.target.pairs} pairs)   known ${r.beforeAdj.known.turns}→${r.afterAdj.known.turns} turns`)
    if (r.forced.target.length) console.log(`     ⚠️  forced target reuse (pool too small): ${r.forced.target.map(f => `${f.speaker}${f.adjacentTurns != null ? ` (+${f.adjacentTurns} adj turns)` : ''}`).join(', ')}`)
    if (r.forced.known.length)  console.log(`     ⚠️  forced known reuse: ${r.forced.known.map(f => f.speaker).join(', ')}`)
    if (verbose) {
      for (const [sp, a] of Object.entries(r.assignments)) {
        if (sp === '_default') continue
        console.log(`       ${sp.padEnd(22)} (${a.gender})  target=${a.target?.name || '-'}  known=${a.known?.name || '-'}`)
      }
    }

    if (apply) {
      const { error: upErr } = await supabase.from('listening_pods')
        .update({ speakers: r.assignments, updated_at: new Date().toISOString() }).eq('id', r.pod_id)
      if (upErr) throw new Error(`update speakers ${r.pod_id}: ${upErr.message}`)
      const changed = await changedAudio(r, courseCode)
      totReassign += changed.target.length + changed.known.length
      // --keep-audio: write the cast, leave every existing clip linked.
      // Make-before-break (AUDIO_PIPELINE_ARCHITECTURE §6b): unlinking a clip
      // before its replacement exists leaves the pod silent in the gap, and a
      // regeneration big enough to refill it needs its own approval. With this
      // flag the pod keeps playing on the old voices until new audio lands.
      if (keepAudio) {
        console.log(`     ✅ applied — cast written; ${changed.target.length} target + ` +
          `${changed.known.length} known clips are now off-cast but LEFT LINKED (--keep-audio)`)
        continue
      }
      // Null the audio links whose voice changed so /generate-pods rebuilds them.
      for (const [col, idsList] of [['target_audio_id', changed.target], ['known_audio_id', changed.known]]) {
        for (let i = 0; i < idsList.length; i += 200) {
          const batch = idsList.slice(i, i + 200)
          if (!batch.length) continue
          const { error: nErr } = await supabase.from('listening_pod_sentences')
            .update({ [col]: null }).in('id', batch)
          if (nErr) throw new Error(`null ${col}: ${nErr.message}`)
        }
      }
      console.log(`     ✅ applied — ${changed.target.length} target + ${changed.known.length} known clips cleared for regen`)
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`   TOTAL collisions: ${totBefore} → ${totAfter}`)
  if (apply) {
    console.log(keepAudio
      ? `   ${totReassign} clips are off-cast and left linked (--keep-audio) — nothing went silent.`
      : `   Cleared ${totReassign} audio clips for regeneration.`)
    console.log(`   ▶ Next: POST /generate-pods/${courseCode} (TTS — needs approval) to fill them.`)
  } else {
    console.log(`   (dry-run — no writes) Re-run with --apply to write speakers + clear changed audio.`)
  }
  console.log()
}

if (require.main === module) main().catch(e => { console.error('\n❌', e.message); process.exit(1) })

module.exports = { recolourPod, genderForCanon, countCollisions, poolFromPodCast }
