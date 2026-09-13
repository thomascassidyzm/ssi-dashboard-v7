#!/usr/bin/env node
// Build the Welsh weekend recording pack: one markdown script per (course, voice),
// in the EXACT queue order the recording tool serves (pods-plan buildRecordingPlan),
// with already-recorded items marked. Writes docs/pods/welsh-recording-pack/*.md
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { buildRecordingPlan, finalizeRecordingPlan } = require('../services/voice-engine/pods-plan.cjs')

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const OUT_DIR = path.join(__dirname, '..', 'docs', 'pods', 'welsh-recording-pack')
const COURSES = [
  { code: 'cym_n_for_eng', label: 'Northern Welsh' },
  { code: 'cym_s_for_eng', label: 'Southern Welsh' },
]
const SECONDS_PER_TAKE = 6
const CANONICAL_STAMP = '2026-08-06'
const CANONICAL_LINES = 231
const BUILT_STAMP = new Date().toISOString().slice(0, 10)

async function buildFor(course) {
  const { data: courseRow } = await db.from('courses').select('voice_config').eq('course_code', course.code).single()
  const vc = courseRow.voice_config || {}
  const podCast = vc.podCast || {}
  const aliases = vc.podCastAliases || {}
  const { data: pods } = await db.from('listening_pods').select('*').like('id', `${course.code}:%`)
  const { data: sentences } = await db.from('listening_pod_sentences')
    .select('*').in('pod_id', pods.map(p => p.id)).order('global_order')

  const results = []
  const voices = [...new Map(Object.entries(podCast)
    .filter(([k]) => k !== '__explainer__')
    .map(([, e]) => [e.voiceId, e])).values()]
  // ensure explainer voice included even if it plays no character
  const exp = podCast.__explainer__
  if (exp && !voices.some(v => v.voiceId === exp.voiceId)) voices.push(exp)

  for (const v of voices) {
    const accept = new Set([v.voiceId, ...(aliases[v.voiceId] || [])])
    const plan = buildRecordingPlan({ pods, sentences, podCast, voiceId: v.voiceId })
    const final = await finalizeRecordingPlan({
      plan, sentences, voiceId: v.voiceId, acceptVoiceIds: accept,
      fetchAudioRows: async (ids) => {
        const { data } = await db.from('course_audio').select('id,origin,voice_id,duration_ms,file_size_bytes').in('id', ids)
        return data || []
      },
    })
    results.push({ course, voice: v, plan, final, sentences })
  }
  return results
}

// Aran's ruling on voicing, 2026-08-06, in his own words:
//   "Did some interleaving in the first few scenes and then beyond that it seemed
//    faster to do them as chunks, without scene-based to and fro for everything,
//    they'll work fine like that (also kind of fits with what I've been saying
//    about not needing multiple voices)."
// Applied in the canonical: scenes 1-14 and 22 are interleaved dialogue with real
// characters; scenes 15-21 are single-voice chunks. The sheet must not cast a chunk
// scene as a to-and-fro, so the mode is read back off the data rather than assumed.
const CHUNK_SPEAKERS = new Set(['Learner', 'Narrator'])
function sceneShape(sentences) {
  const byScene = new Map()
  for (const r of sentences) {
    if (r.global_order >= 90000) continue   // retired/parked rows are in no queue
    if (!byScene.has(r.scene_number)) byScene.set(r.scene_number, [])
    byScene.get(r.scene_number).push(r)
  }
  const out = new Map()
  for (const [n, rows] of byScene) {
    const speakers = [...new Set(rows.map(r => r.speaker))]
    out.set(n, {
      lines: rows.length,
      awaitingTarget: rows.filter(r => !String(r.target_text || '').trim()).length,
      // Drafted = machine-written, awaiting Aran's proofread. It IS in the queue —
      // it just must never be read as if it were finished course text.
      draftTarget: rows.filter(r => r.target_text_draft).length,
      speakers,
      mode: speakers.every(sp => CHUNK_SPEAKERS.has(sp)) ? 'chunk' : 'dialogue',
    })
  }
  return out
}

function fmtTime(nTakes) {
  const min = Math.round(nTakes * SECONDS_PER_TAKE / 60)
  return `~${min} min`
}

function renderScript({ course, voice, plan, final, sentences }) {
  const shape = sceneShape(sentences)
  const awaitingTotal = [...shape.values()].reduce((a, s) => a + s.awaitingTarget, 0)
  const draftTotal = [...shape.values()].reduce((a, s) => a + s.draftTarget, 0)
  const isExplainer = plan.isExplainer
  const remaining = final.items.filter(i => !i.recorded)
  const L = []
  L.push(`# ${voice.name} — ${course.label} (\`${course.code}\`) pod-0 recording script`)
  L.push('')
  L.push(`Voice: \`${voice.voiceId}\` · Recording room: \`/record/${course.code}?podVoice=${voice.voiceId}\``)
  L.push('')
  L.push(`Characters you play: **${plan.castSpeakers.join(', ') || '(guide only)'}**${isExplainer ? ' — plus you are the **bilingual guide**: every English line in the pod is yours too.' : ''}`)
  L.push('')
  L.push(`**${remaining.length} lines still to record** (${final.totals.recorded} already done, ${final.totals.items} total). Estimated ${fmtTime(remaining.length)} at ~${SECONDS_PER_TAKE}s a take.`)
  L.push('')
  L.push(`Built ${BUILT_STAMP} against **Aran's ${CANONICAL_STAMP} pod-0 canonical** (${CANONICAL_LINES} sentences, 22 scenes). Any earlier pack is superseded — see \`docs/pods/welsh-recording-pack-SUPERSEDED-2026-07/\`.`)
  L.push('')
  if (awaitingTotal) {
    L.push(`**${awaitingTotal} of the ${CANONICAL_LINES} canonical lines have no Welsh written yet.** Their Welsh takes are not in this queue — every Welsh line printed below has been written already. Writing the missing Welsh is a translation job, not a recording job: nobody is expected to improvise it at the microphone.`)
    L.push('')
  }
  if (draftTotal) {
    L.push(`**${draftTotal} of the ${CANONICAL_LINES} canonical lines are marked 📝 DRAFT below.** That Welsh was drafted by a machine and nobody has proofread it yet — it is here so it can be read and corrected, not so it can be recorded as it stands. **Do not record a 📝 DRAFT line until Aran has approved the words.** The recording room shows the same mark, and editing the line there is what clears it.`)
    L.push('')
  }
  L.push(`Lines already recorded are marked ✅ and struck through — the recording tool will skip you straight past them; they are kept here so the numbering matches what you see on screen. A \`…\` mid-line is a **breathing point**: take a natural breath there and carry on in the same sentence.`)
  L.push('')
  let n = 0
  let lastScene = null
  for (const it of final.items) {
    n++
    const sceneKey = `${it.podId}::${it.sceneNumber}`
    if (sceneKey !== lastScene) {
      lastScene = sceneKey
      L.push('')
      L.push(`## Scene ${it.sceneNumber}${it.sceneTitle ? ` — ${it.sceneTitle}` : ''}`)
      L.push('')
      const sh = shape.get(it.sceneNumber)
      if (sh) {
        L.push(sh.mode === 'chunk'
          ? `*Single-voice chunk — no scene-based to and fro. Read straight through.*`
          : `*Dialogue — ${sh.speakers.join(', ')}.*`)
        if (sh.awaitingTarget) {
          L.push('')
          L.push(`*${sh.awaitingTarget} of this scene's ${sh.lines} canonical lines have no Welsh written yet — their Welsh take is not in this queue. Where you see an English guide line with no Welsh beside it, that is why.*`)
        }
        if (sh.draftTarget) {
          L.push('')
          L.push(`*${sh.draftTarget} of this scene's ${sh.lines} lines are 📝 DRAFT — drafted, not yet proofread. Read them, correct them; do not record them as they stand.*`)
        }
        L.push('')
      }
    }
    const who = it.kind === 'target' ? it.speaker : (it.kind === 'known' ? `English (guide) — for ${it.speaker}'s line` : 'Explainer')
    const read = it.kind === 'target' ? it.line.targetText : it.line.knownText
    const gloss = it.kind === 'target' && it.line.knownText ? it.line.knownText : null
    const draftMark = it.draft ? '📝 **DRAFT — AWAITING ARAN** ' : ''
    if (it.recorded) {
      L.push(`${n}. ✅ ~~[${who}] ${read}~~`)
    } else {
      L.push(`${n}. ${draftMark}**[${who}]** ${read}`)
      if (gloss) L.push(`    · *${gloss}*`)
    }
  }
  L.push('')
  return { text: L.join('\n'), remaining: remaining.length, total: final.totals.items, recorded: final.totals.recorded }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const summary = []
  for (const course of COURSES) {
    const results = await buildFor(course)
    for (const r of results) {
      const rendered = renderScript(r)
      const fname = `${r.course.code}-${r.voice.name.toLowerCase()}.md`
      fs.writeFileSync(path.join(OUT_DIR, fname), rendered.text)
      summary.push({
        file: `docs/pods/welsh-recording-pack/${fname}`,
        course: r.course.code, voice: r.voice.name,
        remaining: rendered.remaining, recorded: rendered.recorded, total: rendered.total,
        estMinutes: Math.round(rendered.remaining * SECONDS_PER_TAKE / 60),
      })
    }
  }
  console.log(JSON.stringify(summary, null, 2))
}
main().catch(e => { console.error(e); process.exit(1) })
