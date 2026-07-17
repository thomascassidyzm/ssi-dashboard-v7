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
        const { data } = await db.from('course_audio').select('id,origin,voice_id').in('id', ids)
        return data || []
      },
    })
    results.push({ course, voice: v, plan, final })
  }
  return results
}

function fmtTime(nTakes) {
  const min = Math.round(nTakes * SECONDS_PER_TAKE / 60)
  return `~${min} min`
}

function renderScript({ course, voice, plan, final }) {
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
    }
    const who = it.kind === 'target' ? it.speaker : (it.kind === 'known' ? `English (guide) — for ${it.speaker}'s line` : 'Explainer')
    const read = it.kind === 'target' ? it.line.targetText : it.line.knownText
    const gloss = it.kind === 'target' && it.line.knownText ? it.line.knownText : null
    if (it.recorded) {
      L.push(`${n}. ✅ ~~[${who}] ${read}~~`)
    } else {
      L.push(`${n}. **[${who}]** ${read}`)
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
