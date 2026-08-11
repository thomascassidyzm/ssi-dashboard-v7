#!/usr/bin/env node
/**
 * READ-ONLY casting-state survey across every listening pod.
 *
 * Definitions are lifted verbatim from PodLab (src/views/admin/PodLab.vue,
 * origin/main): canonSpeakerName, resolveSpeakerVoice, voiceKey, castRows,
 * castFlags — so this reports what the product itself would say.
 *
 * No writes. No audio. Output → casting-state.json
 */
require('dotenv').config({ quiet: true })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function all(table, sel, filt) {
  let out = [], from = 0
  for (;;) {
    let q = s.from(table).select(sel).range(from, from + 999)
    if (filt) q = filt(q)
    const { data, error } = await q
    if (error) throw new Error(table + ': ' + error.message)
    out = out.concat(data)
    if (data.length < 1000) break
    from += 1000
  }
  return out
}

// ── PodLab definitions (verbatim) ──────────────────────────────────────────
function canonSpeakerName(speaker) {
  return (speaker || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}
function resolveSpeakerVoice(podSpeakers, speaker, track) {
  const mapping = podSpeakers || {}
  const entry = mapping[canonSpeakerName(speaker)] || mapping[speaker] || mapping._default
  if (!entry) return null
  if (entry[track] && entry[track].voice_id) {
    return {
      name: entry[track].name || null,
      voice_id: entry[track].voice_id,
      provider: entry[track].provider || 'azure',
      locale: entry[track].locale || null,
      gender: entry.gender || 'n',
    }
  }
  if (track === 'target' && entry.voice_id) {
    return { name: entry.name || null, voice_id: entry.voice_id, provider: entry.provider || 'xai', locale: entry.locale || null, gender: entry.gender || 'n' }
  }
  return null
}
const voiceKey = (v) => (v ? `${v.provider}|${v.voice_id}|${v.locale || ''}` : 'none')
const ISO3_TO_ISO1 = {
  ara: 'ar', ben: 'bn', bul: 'bg', cat: 'ca', cym: 'cy', dan: 'da', deu: 'de', ell: 'el',
  eng: 'en', est: 'et', eus: 'eu', fas: 'fa', fin: 'fi', fra: 'fr', gle: 'ga', guj: 'gu',
  heb: 'he', hin: 'hi', hrv: 'hr', hye: 'hy', isl: 'is', ita: 'it', jpn: 'ja', kor: 'ko',
  lav: 'lv', lit: 'lt', nep: 'ne', nld: 'nl', nor: 'no', pan: 'pa', pol: 'pl', por: 'pt',
  ron: 'ro', sin: 'si', spa: 'es', swa: 'sw', swe: 'sv', tam: 'ta', tha: 'th', tur: 'tr',
  ukr: 'uk', urd: 'ur', zho: 'zh',
}
const LOCALE_ALIASES = { no: ['nb', 'nn'], he: ['iw'], zh: ['cmn', 'yue'] }
function localeMatchesTarget(locale, iso3) {
  const want = ISO3_TO_ISO1[iso3]
  if (!want || !locale) return null
  const got = String(locale).toLowerCase().split(/[-_]/)[0]
  return got === want || (LOCALE_ALIASES[want] || []).includes(got)
}
function castRows(speakers, linesBySpeaker, track) {
  const rows = new Map()
  const labels = new Set([...Object.keys(speakers || {}), ...linesBySpeaker.keys()])
  for (const label of labels) {
    const v = resolveSpeakerVoice(speakers, label, track)
    const k = voiceKey(v)
    if (!rows.has(k)) rows.set(k, { key: k, voice: v, labels: [], lines: 0 })
    const row = rows.get(k)
    if (!row.labels.includes(label)) row.labels.push(label)
    row.lines += linesBySpeaker.get(label) || 0
  }
  const total = [...rows.values()].reduce((a, r) => a + r.lines, 0) || 1
  return [...rows.values()].map(r => ({ ...r, share: Math.round((r.lines / total) * 100) })).sort((a, b) => b.lines - a.lines)
}
/** castFlags, restated as data (same conditions, same thresholds). */
function castFlags({ targetCast, knownCast, iso3, kIso3 }) {
  const flags = []
  const voiced = targetCast.filter(r => r.voice)
  const unvoiced = targetCast.filter(r => !r.voice)
  if (unvoiced.length) flags.push({ level: 'bad', code: 'unvoiced_labels', n: unvoiced.length, labels: unvoiced.flatMap(r => r.labels) })
  if (voiced.length !== 2) flags.push({ level: 'bad', code: 'not_two_voices', n: voiced.length })
  else {
    const genders = voiced.map(r => r.voice.gender)
    if (!(genders.includes('f') && genders.includes('m'))) flags.push({ level: 'bad', code: 'gender_not_mf', genders })
  }
  const bad = voiced.filter(r => localeMatchesTarget(r.voice.locale, iso3) === false)
  if (bad.length) flags.push({ level: 'bad', code: 'target_locale_wrong', voices: bad.map(r => `${r.voice.voice_id}→${r.voice.locale}`), iso3 })
  const unknown = voiced.filter(r => localeMatchesTarget(r.voice.locale, iso3) === null)
  if (unknown.length) flags.push({ level: 'warn', code: 'target_locale_unknown', n: unknown.length, locales: unknown.map(r => r.voice.locale || 'no locale') })
  const badKnown = knownCast.filter(r => r.voice && localeMatchesTarget(r.voice.locale, kIso3) === false)
  if (badKnown.length) flags.push({ level: 'warn', code: 'known_locale_wrong', voices: badKnown.map(r => `${r.voice.voice_id}→${r.voice.locale}`), kIso3 })
  const byGender = { f: 0, m: 0, n: 0 }
  for (const r of voiced) byGender[r.voice.gender === 'f' ? 'f' : r.voice.gender === 'm' ? 'm' : 'n'] += r.lines
  const tot = byGender.f + byGender.m + byGender.n
  if (tot) {
    const pct = n => Math.round((n / tot) * 100)
    const skewed = voiced.length === 2 && Math.max(pct(byGender.f), pct(byGender.m)) >= 70
    flags.push({ level: skewed ? 'bad' : 'ok', code: 'line_share', f: pct(byGender.f), m: pct(byGender.m), n: pct(byGender.n) })
  }
  return flags
}

// ── survey ─────────────────────────────────────────────────────────────────
;(async () => {
  const courses = await all('courses', 'course_code,target_lang,known_lang,voice_config')
  const byCourse = Object.fromEntries(courses.map(c => [c.course_code, c]))
  const pods = await all('listening_pods', 'id,course_code,slug,pod_type,speakers')
  const sents = await all('listening_pod_sentences', 'pod_id,speaker,target_audio_id,known_audio_id')
  const linesByPod = {}
  for (const r of sents) {
    const m = (linesByPod[r.pod_id] ||= new Map())
    m.set(r.speaker, (m.get(r.speaker) || 0) + 1)
  }
  const audioIds = new Set()
  for (const r of sents) { if (r.target_audio_id) audioIds.add(r.target_audio_id); if (r.known_audio_id) audioIds.add(r.known_audio_id) }
  const audio = {}
  const idList = [...audioIds]
  for (let i = 0; i < idList.length; i += 200) {
    const { data, error } = await s.from('course_audio').select('id,origin,voice_id').in('id', idList.slice(i, i + 200))
    if (error) throw new Error('course_audio: ' + error.message)
    for (const a of data || []) audio[a.id] = a
  }

  const out = []
  for (const p of pods) {
    const c = byCourse[p.course_code] || {}
    const vc = c.voice_config || {}
    const podCast = vc.podCast || {}
    const speakers = p.speakers || {}
    const lines = linesByPod[p.id] || new Map()
    const targetCast = castRows(speakers, lines, 'target')
    const knownCast = castRows(speakers, lines, 'known')
    const flags = castFlags({ targetCast, knownCast, iso3: c.target_lang || '', kIso3: c.known_lang || '' })
    const podCastVoiceIds = [...new Set(Object.values(podCast).map(e => e && e.voiceId).filter(Boolean))]
    const speakerTargetIds = [...new Set(targetCast.filter(r => r.voice).map(r => r.voice.voice_id))]
    const podSents = sents.filter(r => r.pod_id === p.id)
    const takes = {}
    for (const r of podSents) for (const col of ['target_audio_id', 'known_audio_id']) {
      const a = audio[r[col]]
      if (a && a.voice_id) takes[`${a.origin}|${a.voice_id}`] = (takes[`${a.origin}|${a.voice_id}`] || 0) + 1
    }
    // is every speaker label on the pod covered by podCast?
    const labels = [...new Set([...Object.keys(speakers), ...lines.keys()])]
    const uncastInPodCast = labels.filter(l => !(podCast[l] || podCast[canonSpeakerName(l)]))
    out.push({
      pod: p.id, course: p.course_code, slug: p.slug, pod_type: p.pod_type,
      target_lang: c.target_lang || null, known_lang: c.known_lang || null,
      sentences: podSents.length,
      characters: Object.keys(speakers).length,
      labels_in_sentences: [...lines.keys()].length,
      target_voices: targetCast.filter(r => r.voice).length,
      target_voice_ids: speakerTargetIds,
      target_voice_detail: targetCast.filter(r => r.voice).map(r => ({ id: r.voice.voice_id, provider: r.voice.provider, name: r.voice.name, gender: r.voice.gender, locale: r.voice.locale, lines: r.lines, share: r.share, chars: r.labels.length })),
      known_voices: knownCast.filter(r => r.voice).length,
      known_voice_ids: [...new Set(knownCast.filter(r => r.voice).map(r => r.voice.voice_id))],
      unvoiced_labels: targetCast.filter(r => !r.voice).flatMap(r => r.labels),
      podCast_entries: Object.keys(podCast).length,
      podCast_voice_ids: podCastVoiceIds,
      podCast_voices_declared: vc.podCastVoices || null,
      podCast_aliases: Object.keys(vc.podCastAliases || {}).length ? vc.podCastAliases : null,
      podCast_labels_missing: uncastInPodCast,
      audio_target: podSents.filter(r => r.target_audio_id).length,
      audio_known: podSents.filter(r => r.known_audio_id).length,
      takes_by_voice: takes,
      flags,
    })
  }
  const outPath = path.resolve(__dirname, 'casting-state.json')
  fs.writeFileSync(outPath, JSON.stringify(out, null, 1))
  console.log(`pods: ${out.length} → ${outPath}`)
})().catch(e => { console.error(e.message); process.exit(1) })
