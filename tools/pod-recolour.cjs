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
const { resolveTargetPool, resolveKnownPool } = require('./pod-voice-coverage.cjs')
const { buildAdjacency, assignVoicesColoured } = require('./pod-voice-colour.cjs')
const {
  canonicalSpeakerName, extractGenderMarker, inferGenderFromName,
} = require('./pod-sync.cjs')
const { parseNameMap } = require('../services/pod-dialogue-generator.cjs')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Resolve a canonical speaker's gender the same way pod-sync does: any variant
// with an explicit (F)/(M)/(N) wins, else the name heuristic, else 'n'.
function genderForCanon(variants) {
  for (const v of variants) { const g = extractGenderMarker(v); if (g) return g }
  return inferGenderFromName(variants[0] ? canonicalSpeakerName(variants[0]) : '') || 'n'
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
    .select('id, scene_number, global_order, speaker, target_audio_id, known_audio_id')
    .eq('pod_id', pod.id).order('global_order')
  if (error) throw new Error(`load sentences ${pod.id}: ${error.message}`)
  if (!sentences.length) return { pod_id: pod.id, skipped: 'no sentences' }

  // Group raw speakers by canonical name; build scenes as canonical-speaker lists.
  const variantsByCanon = new Map()
  const scenesMap = new Map()  // scene_number → [canon,...]
  for (const s of sentences) {
    const canon = canonicalSpeakerName(s.speaker)
    if (!canon) continue
    if (!variantsByCanon.has(canon)) variantsByCanon.set(canon, new Set())
    variantsByCanon.get(canon).add(s.speaker)
    const sc = s.scene_number == null ? 0 : s.scene_number
    if (!scenesMap.has(sc)) scenesMap.set(sc, [])
    scenesMap.get(sc).push(canon)
  }
  const speakers = [...variantsByCanon.keys()]
  const scenes = [...scenesMap.values()]
  const adj = buildAdjacency(scenes)

  // Generated pods localise speaker names from the ledger ("Sarah → Sophie");
  // the gender name-heuristic knows the CANONICAL name, not necessarily the
  // local one — fall back through the pod's name map to the source name.
  const nameMap = parseNameMap(pod.metadata && pod.metadata.consistency_ledger)
  const sourceOfLocal = new Map(nameMap.map(e => [e.local.toLowerCase(), e.source]))
  const genderOf = (canon) => {
    const g = genderForCanon([...(variantsByCanon.get(canon) || [canon])])
    if (g !== 'n') return g
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

  // AFTER: colour with the resolved pools.
  const { assignments, report } = assignVoicesColoured({
    scenes, speakers, targetPool, knownPool, genderOf, meta,
  })
  // _default for re-run safety (a speaker added between syncs falls back here).
  const defT = (targetPool.m[0] || targetPool.f[0])
  const defK = (knownPool.m[0] || knownPool.f[0])
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

  const result = {
    pod_id: pod.id,
    speakers: speakers.length,
    scenes: scenes.length,
    before: { target: beforeT, known: beforeK },
    after: { target: afterT, known: afterK },
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
  const targetPool = resolveTargetPool(targetLang)
  const knownPool = resolveKnownPool(knownLang)

  console.log(`\n🎨 Pod recolour: ${courseCode}  (${apply ? 'APPLY' : 'DRY-RUN'})`)
  console.log(`   Target pool: tier ${targetPool.tier} · ${targetPool.note}`)
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

  let totBefore = 0, totAfter = 0, totReassign = 0
  for (const pod of pods) {
    const r = await recolourPod(pod, targetPool, knownPool, { verbose })
    if (r.skipped) { console.log(`\n   ${pod.id}: skipped (${r.skipped})`); continue }
    totBefore += r.before.target + r.before.known
    totAfter += r.after.target + r.after.known
    console.log(`\n   ▸ ${r.pod_id}  (${r.speakers} speakers, ${r.scenes} scenes)`)
    console.log(`     collisions  target ${r.before.target}→${r.after.target}   known ${r.before.known}→${r.after.known}   (colours T${r.colours.target}/K${r.colours.known})`)
    if (r.forced.target.length) console.log(`     ⚠️  forced target reuse (pool too small): ${r.forced.target.map(f => f.speaker).join(', ')}`)
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
    console.log(`   Cleared ${totReassign} audio clips for regeneration.`)
    console.log(`   ▶ Next: POST /generate-pods/${courseCode} (TTS — needs approval) to fill them.`)
  } else {
    console.log(`   (dry-run — no writes) Re-run with --apply to write speakers + clear changed audio.`)
  }
  console.log()
}

if (require.main === module) main().catch(e => { console.error('\n❌', e.message); process.exit(1) })

module.exports = { recolourPod, genderForCanon, countCollisions }
