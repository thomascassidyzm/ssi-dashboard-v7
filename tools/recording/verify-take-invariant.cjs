#!/usr/bin/env node
/**
 * verify-take-invariant.cjs — THE PROOF, not the assertion.
 *
 * Tom, 2026-09-02: "we should be able to know for sure that what we record IS
 * what is served to the learner."
 *
 * For every pod line of a course this resolves the clip TWICE through the one
 * resolver (services/voice-engine/take-selection.cjs) — once as the LEARNER's
 * playback sees it (the slot column the bundle API reads, no fallback, no voice
 * restriction) and once as the RECORDIST's Listen button sees it (their own
 * voices, slot first, identity fallback) — and compares the resulting FILE.
 * Same line, same s3_key, or the line is reported.
 *
 * It also reports, per line, whether the file being served carries a
 * take_quality verdict of 'bad' in recording_provenance — a take a human has
 * already listened to and rejected, still being served.
 *
 * READ-ONLY. It writes one log file next to itself and nothing else.
 *
 *   node tools/recording/verify-take-invariant.cjs cym_n_for_eng
 *   node tools/recording/verify-take-invariant.cjs cym_n_for_eng --json
 *
 * Exit status is 0 when every line agrees and 1 when any line does not, so it
 * can be run as a gate.
 */
'use strict'

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { resolveCurrentClip } = require('../../services/voice-engine/take-selection.cjs')
const { resolveRecordist, loadPolicies } = require('../../services/voice-engine/recordist-queue.cjs')
const { canonicalLanguage } = require('../../services/shared/clip-identity.cjs')
const { canonicalDialect, courseDialect } = require('../../services/shared/dialect.cjs')

const TRACKS = ['target', 'known']

async function main() {
  const courseCode = process.argv[2]
  const asJson = process.argv.includes('--json')
  if (!courseCode) {
    console.error('usage: verify-take-invariant.cjs <courseCode> [--json]')
    process.exit(2)
  }
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const { data: course, error: cErr } = await db
    .from('courses').select('course_code, target_lang, voice_config, dialect').eq('course_code', courseCode).maybeSingle()
  if (cErr) throw new Error(cErr.message)
  if (!course) throw new Error(`no course ${courseCode}`)
  const language = canonicalLanguage(course.target_lang)

  const { data: pods } = await db.from('listening_pods').select('id').eq('course_code', courseCode)
  const podIds = (pods || []).map((p) => p.id)
  const sentences = []
  for (let from = 0; podIds.length; from += 1000) {
    const { data, error } = await db
      .from('listening_pod_sentences')
      .select('id, speaker, target_text, known_text, target_audio_id, known_audio_id')
      .in('pod_id', podIds).order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    sentences.push(...(data || []))
    if (!data || data.length < 1000) break
  }

  // Every human recordist of this language AND THIS COURSE'S DIALECT.
  //
  // Dialect is not decoration here. Aran reads Welsh north; cym_s_for_eng's
  // lines are southern, and a northern take of a southern line is not a take of
  // that line at all — it is the 2026-08-19 defect one step down the pipe. A
  // check that ignored it would report 24 southern lines as "the learner is
  // silent while a take exists" and send somebody to link the wrong accent.
  // loadPolicies takes OPTIONS, not a language — filter here, and refuse to run
  // blind. A run with no recordists would score every filled slot as agreement
  // and prove nothing, which is exactly the failure this tool exists to catch.
  const policies = await loadPolicies(db)
  const policy = policies.find((p) => p.language === language)
  const recordists = new Map()
  for (const slot of Object.keys((policy && policy.voices) || {})) {
    const entry = policy.voices[slot]
    if (!entry || !entry.voiceId) continue
    const r = await resolveRecordist(db, entry.voiceId)
    if (r && canonicalDialect(r.dialect) === courseDialect(course)) recordists.set(r.voiceId, r)
  }

  // take_quality verdicts, keyed by the s3_key of the take they are about.
  const verdicts = new Map()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('recording_provenance').select('audio_uuid, quality_notes')
      .order('created_at', { ascending: true }).range(from, from + 999)
    if (error) throw new Error(error.message)
    for (const row of data || []) {
      if (typeof row.quality_notes !== 'string' || row.quality_notes[0] !== '{') continue
      let ctx; try { ctx = JSON.parse(row.quality_notes) } catch { continue }
      const v = ctx && ctx.take_quality && ctx.take_quality.verdict
      if (!v) continue
      verdicts.set(ctx.s3_key || `mastered/${row.audio_uuid}.mp3`, v)
    }
    if (!data || data.length < 1000) break
  }

  if (!recordists.size) {
    throw new Error(`no human recordist is cast for ${language} in ${courseDialect(course)} — nothing to compare against, so this run would prove nothing`)
  }

  const report = { courseCode, language, checkedAt: new Date().toISOString(), lines: 0, checks: 0, agree: 0, notAHumanTake: 0, disagree: [], learnerSilent: [], servingRejectedTake: [] }

  for (const s of sentences) {
    report.lines += 1
    for (const track of TRACKS) {
      if (!String(s[`${track}_text`] || '').trim()) continue
      report.checks += 1
      // AS THE LEARNER HEARS IT — the slot column and nothing else.
      const learner = await resolveCurrentClip(db, { sentence: s, track })
      // AS THE RECORDIST HEARS IT — every human voice of this language gets
      // asked; the one whose take the line actually holds is the comparison.
      let recordist = null
      // ORDER-INDEPENDENT ON PURPOSE. If the slot is filled, the recordist to
      // compare against is the one whose voice is IN it — otherwise a second
      // recordist who happens to hold a take of the same words could be picked
      // and reported as a divergence that nobody experiences.
      const ordered = [...recordists.values()].sort((a, b) => {
        const av = learner && a.spellings.includes(learner.voiceId) ? 0 : 1
        const bv = learner && b.spellings.includes(learner.voiceId) ? 0 : 1
        return av - bv
      })
      for (const r of ordered) {
        const got = await resolveCurrentClip(db, {
          sentence: s, track, language: r.language, restrictToVoices: r.spellings, allowIdentityFallback: true,
        })
        if (got) { recordist = { ...got, voice: r.voiceId }; break }
      }
      const item = { line: s.id, track, speaker: s.speaker, learner: learner && learner.s3Key, recordist: recordist && recordist.s3Key, recordistVoice: recordist && recordist.voice, via: recordist && recordist.source }
      if (learner && verdicts.get(learner.s3Key) === 'bad') report.servingRejectedTake.push(item)
      if (!learner && recordist) { report.learnerSilent.push(item); continue }
      if (!learner && !recordist) continue          // nothing recorded yet — not a divergence
      if (!recordist) {
        // The slot holds a clip that belongs to no human recordist of this
        // language — a TTS render, or another voice entirely. Not a take, so
        // not a divergence, but counted separately rather than as agreement:
        // "we could not check this one" must never look like "this one passed".
        report.notAHumanTake += 1
        continue
      }
      if (learner.s3Key === recordist.s3Key) report.agree += 1
      else report.disagree.push(item)
    }
  }

  const out = path.join(__dirname, `verify-take-invariant-${courseCode}-log.json`)
  fs.writeFileSync(out, JSON.stringify(report, null, 1))
  if (asJson) { console.log(JSON.stringify(report, null, 1)); }
  else {
    console.log(`${courseCode}: ${report.lines} lines, ${report.checks} tracks checked`)
    console.log(`  agree (recordist file === learner file): ${report.agree}`)
    console.log(`  slot holds no human take (TTS/other):    ${report.notAHumanTake}`)
    console.log(`  DISAGREE (different file served):        ${report.disagree.length}`)
    console.log(`  learner silent while a take exists:      ${report.learnerSilent.length}`)
    console.log(`  serving a take a human marked 'bad':     ${report.servingRejectedTake.length}`)
    console.log(`  log: ${out}`)
  }
  // BOTH are invariant breaks: a different file, or a file the learner never
  // gets while the artist has given us one.
  process.exit(report.disagree.length || report.learnerSilent.length ? 1 : 0)
}

main().catch((err) => { console.error(err.message); process.exit(2) })
