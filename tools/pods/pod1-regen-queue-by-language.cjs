#!/usr/bin/env node
/**
 * POD-1 RECAST REGEN QUEUE, GROUPED PER LANGUAGE (2026-08-23).
 *
 * Tom's clarification, verbatim: "They will be per language I think. Because
 * POD1 is based on languages not courses."
 *
 * He is right, and the data already says so for English: the 16 eng_for_*
 * courses link the SAME course_audio rows — one asset set, 16 consumers. The
 * per-course number this recast first reported (5,620 line-links) therefore
 * counts one shared clip up to sixteen times.
 *
 * This tool re-derives the burden on the real unit — the DISTINCT CLIP — and
 * groups it by language:
 *   target track → grouped by TARGET language (the dialogue voice that flipped)
 *   known track  → grouped by KNOWN language (the explainer/known-side voice)
 *
 * It reads the LIVE applied cast (listening_pods.speakers) against the LIVE
 * delivered voice (course_audio.voice_id via the sentence's audio links), so it
 * is a measurement of the estate as it now stands, not a replay of the recast
 * tool's own arithmetic. It writes nothing and renders nothing.
 *
 * Usage: node tools/pods/pod1-regen-queue-by-language.cjs
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { canonicalSpeakerName } = require('../pod-voice-colour-n.cjs')

const OUT_DIR = path.join(__dirname, '../../docs/pods')
const STAMP = '2026-08-23'
const norm = (v) => String(v || '').replace(/^(xai_|azure_)/, '')

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const rows = (await db.query(`
    select p.id pod, p.course_code,
           split_part(p.course_code,'_for_',1) target_lang,
           split_part(p.course_code,'_for_',2) known_lang,
           s.scene_number, s.sentence_number, s.global_order, s.speaker,
           s.target_text, s.known_text,
           s.target_audio_id, s.known_audio_id,
           regexp_replace(ta.voice_id,'^(xai_|azure_)','') delivered_target,
           regexp_replace(ka.voice_id,'^(xai_|azure_)','') delivered_known,
           p.speakers cast
      from listening_pods p
      join listening_pod_sentences s on s.pod_id = p.id
      left join course_audio ta on ta.id = s.target_audio_id
      left join course_audio ka on ka.id = s.known_audio_id
     where p.visibility = 'live' and p.slug in ('pod-0','pod-1')
       and p.course_code not like 'zzz%'
     order by p.id, s.global_order`)).rows

  // Provenance comes from the recast's own applied log, joined per line, so a
  // clip can say WHY it needs re-rendering:
  //   recast     — this recast moved the character to the other voice
  //   drift      — the clip already disagreed with the pod's own stored cast
  //   divergence — a track this recast deliberately did NOT touch (the
  //                eng_for_* known side), where cast and audio disagreed
  //                before the job and still do. Not this job's burden; listed
  //                so the number is complete rather than flattering.
  const applied = JSON.parse(fs.readFileSync(
    path.join(OUT_DIR, `pod1-percall-recast-estate-${STAMP}-applied-log.json`), 'utf8'))
  const provenance = new Map()
  for (const rep of applied) {
    for (const q of rep.regenQueue || []) {
      provenance.set(`${q.pod}|${q.scene}|${q.sentence}|${q.track}`,
        q.causedByRecast ? 'recast' : 'drift')
    }
  }

  // clipKey → the work item. A clip shared by 16 courses is ONE item.
  const items = new Map()
  const perCourse = new Map()

  for (const r of rows) {
    const cast = r.cast || {}
    const entry = cast[canonicalSpeakerName(r.speaker)] || cast._default
    for (const track of ['target', 'known']) {
      const audioId = track === 'target' ? r.target_audio_id : r.known_audio_id
      const delivered = track === 'target' ? r.delivered_target : r.delivered_known
      const castVoice = entry && entry[track] ? norm(entry[track].voice_id) : null
      if (!audioId || !delivered || !castVoice || delivered === castVoice) continue

      // The language of a CLIP is the language it is spoken in — the course's
      // target language when it is a target clip, its known language when it is
      // a known clip. English pod clips are one pool serving BOTH the known
      // side of the *_for_eng courses and the target side of the eng_for_*
      // courses, so the same clip legitimately arrives down both paths.
      const lang = track === 'target' ? r.target_lang : r.known_lang
      const why = provenance.get(`${r.pod}|${r.scene_number}|${r.sentence_number}|${track}`) || 'divergence'
      const key = audioId // the clip IS the unit of re-render
      if (!items.has(key)) {
        items.set(key, {
          clipId: audioId, language: lang,
          text: track === 'target' ? r.target_text : r.known_text,
          voiceBefore: delivered, voiceAfter: castVoice,
          speaker: canonicalSpeakerName(r.speaker),
          tracks: new Set(), why: new Set(), slots: [], courses: new Set(),
        })
      }
      const it = items.get(key)
      it.tracks.add(track)
      it.why.add(why)
      it.slots.push(`${r.pod}:SC${r.scene_number}-S${r.sentence_number}`)
      it.courses.add(r.course_code)
      if (!perCourse.has(r.course_code)) perCourse.set(r.course_code, new Set())
      perCourse.get(r.course_code).add(key)
    }
  }

  // ---- group by language ----------------------------------------------------
  // One entry per language. That IS the unit of work: a voice flip is fixed
  // once per language and every course drawing on that language inherits it —
  // wherever the language's clips are genuinely pooled. Where they are not,
  // the group says so.
  const reason = (it) => (it.why.has('recast') ? 'recast' : it.why.has('drift') ? 'drift' : 'divergence')
  const byLang = new Map()
  for (const it of items.values()) {
    if (!byLang.has(it.language)) byLang.set(it.language, { language: it.language, clips: [], courses: new Set() })
    const g = byLang.get(it.language)
    g.clips.push(it)
    for (const c of it.courses) g.courses.add(c)
  }

  const groups = [...byLang.values()].map(g => {
    const count = (w) => g.clips.filter(c => reason(c) === w).length
    const links = g.clips.reduce((n, c) => n + c.slots.length, 0)
    return {
      language: g.language,
      clips: g.clips.length,
      clipsCausedByRecast: count('recast'),
      clipsPreexistingDrift: count('drift'),
      clipsUntouchedDivergence: count('divergence'),
      lineLinks: links,
      pooled: +(links / g.clips.length).toFixed(2), // >1 = one clip serves many slots/courses
      courses: [...g.courses].sort(),
      tracks: [...new Set(g.clips.flatMap(c => [...c.tracks]))].sort(),
      voiceMoves: Object.entries(g.clips.reduce((m, c) => {
        const k = `${c.voiceBefore} → ${c.voiceAfter}`; m[k] = (m[k] || 0) + 1; return m
      }, {})).sort((a, b) => b[1] - a[1]),
      queue: g.clips.map(c => ({
        clipId: c.clipId, speaker: c.speaker, tracks: [...c.tracks],
        why: reason(c), voiceBefore: c.voiceBefore, voiceAfter: c.voiceAfter,
        text: c.text, courses: [...c.courses].sort(), slots: c.slots,
      })).sort((a, b) => a.slots[0].localeCompare(b.slots[0])),
    }
  }).sort((a, b) => b.clips - a.clips)

  const totalClips = items.size
  const totalLinks = [...items.values()].reduce((n, c) => n + c.slots.length, 0)
  const tally = (w) => [...items.values()].filter(c => reason(c) === w).length

  const report = {
    generated: STAMP,
    unit: 'distinct course_audio clip — the thing phase-8 actually re-renders',
    grouping: 'per LANGUAGE (Tom, 2026-08-23): pod 1 is language-scoped, so a voice flip is fixed once per language',
    totalClips, totalLineLinks: totalLinks,
    clipsCausedByRecast: tally('recast'),
    clipsPreexistingDrift: tally('drift'),
    clipsUntouchedDivergence: tally('divergence'),
    sharedClips: [...items.values()].filter(c => c.courses.size > 1).length,
    languages: groups.map(({ queue, ...g }) => g),
    perCourseClipCount: Object.fromEntries([...perCourse.entries()]
      .map(([c, s]) => [c, s.size]).sort((a, b) => b[1] - a[1])),
    groups,
  }

  const out = path.join(OUT_DIR, `pod1-recast-regen-queue-by-language-${STAMP}.json`)
  fs.writeFileSync(out, JSON.stringify(report, null, 2))

  console.log(`DISTINCT CLIPS TO RE-RENDER: ${totalClips}  ` +
    `(recast ${report.clipsCausedByRecast} / pre-existing drift ${report.clipsPreexistingDrift} / ` +
    `untouched divergence ${report.clipsUntouchedDivergence}) — ${totalLinks} line-links, ${report.sharedClips} shared clips\n`)
  console.log('language\tclips\trecast\tdrift\tdiverg\tlinks\tpooled\tcourses')
  for (const g of groups) {
    console.log([g.language, g.clips, g.clipsCausedByRecast, g.clipsPreexistingDrift,
      g.clipsUntouchedDivergence, g.lineLinks, g.pooled, g.courses.length].join('\t'))
  }
  console.log(`\nlog: ${out}`)
  await db.end()
}

main().catch(e => { console.error(e); process.exit(1) })
