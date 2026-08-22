#!/usr/bin/env node
// Re-verify the empty pod-0 ENGLISH slot count against live data.
// Read-only. Mirrors phase8's own scoping: POD0_CANON_SLUGS + englishColumnFor.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const POD0_SLUGS = new Set(['pod-0', 'pod-0-unrecorded'])
const isEng = l => /^en(g|_|$)|^english$/i.test((l || '').trim())

;(async () => {
  const { data: courses, error: cErr } = await supabase
    .from('courses').select('course_code, known_lang, target_lang')
  if (cErr) throw new Error(cErr.message)
  const byCode = new Map(courses.map(c => [c.course_code, c]))

  // all pod-0 pods
  let pods = [], from = 0
  for (;;) {
    const { data, error } = await supabase.from('listening_pods')
      .select('id, course_code, slug, speakers').range(from, from + 999)
    if (error) throw new Error(error.message)
    pods.push(...data); if (data.length < 1000) break; from += 1000
  }
  pods = pods.filter(p => POD0_SLUGS.has(p.slug))

  const podById = new Map(pods.map(p => [p.id, p]))
  const podIds = pods.map(p => p.id)

  let sentences = []
  for (let i = 0; i < podIds.length; i += 50) {
    const chunk = podIds.slice(i, i + 50)
    let off = 0
    for (;;) {
      const { data, error } = await supabase.from('listening_pod_sentences')
        .select('id, pod_id, speaker, known_text, target_text, known_audio_id, target_audio_id')
        .in('pod_id', chunk).range(off, off + 999)
      if (error) throw new Error(error.message)
      sentences.push(...data); if (data.length < 1000) break; off += 1000
    }
  }

  const empties = [], filled = []
  const noEnglishTrack = new Set()
  for (const s of sentences) {
    const pod = podById.get(s.pod_id); if (!pod) continue
    const c = byCode.get(pod.course_code); if (!c) continue
    let side = null
    if (isEng(c.known_lang)) side = 'known'
    else if (isEng(c.target_lang)) side = 'target'
    if (!side) { noEnglishTrack.add(pod.course_code); continue }
    const rec = {
      sentence_id: s.id, pod_id: s.pod_id, course_code: pod.course_code, slug: pod.slug,
      side, speaker: s.speaker, text: side === 'known' ? s.known_text : s.target_text,
      audio_id: side === 'known' ? s.known_audio_id : s.target_audio_id,
    }
    ;(rec.audio_id ? filled : empties).push(rec)
  }

  const distinctTexts = new Set(empties.map(e => (e.text || '').trim()))
  const podsWithEmpty = new Set(empties.map(e => e.pod_id))
  const coursesWithEmpty = new Set(empties.map(e => e.course_code))

  console.log(JSON.stringify({
    pod0_pods_total: pods.length,
    pod0_courses_total: new Set(pods.map(p => p.course_code)).size,
    courses_with_no_english_track: [...noEnglishTrack].sort(),
    english_slots_total: empties.length + filled.length,
    english_slots_filled: filled.length,
    english_slots_empty: empties.length,
    distinct_missing_texts: distinctTexts.size,
    pods_with_empty: podsWithEmpty.size,
    courses_with_empty: coursesWithEmpty.size,
    by_side: {
      known: empties.filter(e => e.side === 'known').length,
      target: empties.filter(e => e.side === 'target').length,
    },
  }, null, 2))
  require('fs').writeFileSync(__dirname + '/empties.json', JSON.stringify(empties, null, 2))
  console.error(`wrote ${empties.length} empty slots -> scripts/pod0-fill/empties.json`)
})().catch(e => { console.error('FAIL', e.message); process.exit(1) })
