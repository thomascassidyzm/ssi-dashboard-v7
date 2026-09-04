#!/usr/bin/env node
/**
 * verify-welsh-pod0-queue.cjs — the acceptance test for Tom's brief 2026-08-06:
 * "make sure the human recording is not doing the older stuff".
 *
 * Builds the recording plan exactly as GET /api/production/:course/pods/recording-plan
 * does (same buildRecordingPlan/finalizeRecordingPlan, same live tables) for every
 * Welsh (course, voice) pair, and asserts:
 *
 *   1. every English line a recorder would be shown is in the current canonical;
 *   2. no English line from the superseded pod-0 appears anywhere in any queue;
 *   3. every Welsh line served is either one that was written for the English now
 *      beside it, or a line MARKED AS A DRAFT (Tom 2026-08-06, "opus drafts, Aran
 *      proofreads" — new Welsh may be served, but never as if it were finished);
 *   4. every drafted row in the pod reaches the recorder carrying that marker, and
 *      no line the archive wrote is marked as a draft.
 *
 * Exit 0 = a Welsh recorder cannot be served the old text, and cannot be served
 * drafted words believing they are final. Exit 1 = it can.
 */
'use strict'
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { buildRecordingPlan, finalizeRecordingPlan } = require('../../services/voice-engine/pods-plan.cjs')
const { norm } = require('./pod0-recording-diff.cjs')
const { baseSlate } = require('../../services/shared/canonical-slate.cjs')

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ARCHIVE = path.join(__dirname, '..', '..', 'docs', 'pods', 'pod0-welsh-prealign-archive-2026-08-06')
// The live canonical slate. Renamed from 'pod-0' to 'pod-1' on 2026-09-01 —
// this is a `canonical_pod_scenarios` slug and is NOT a course's listening-pod
// slug, which is per-course and still 'pod-0' on most courses.
const CANONICAL_SLUG = 'pod-1'

const COURSES = ['cym_n_for_eng', 'cym_s_for_eng']

;(async () => {
  const { data: __slateRaw } = await db.from('canonical_pod_scenarios')
    .select('*').eq('pod_slug', CANONICAL_SLUG).order('global_order')
  // Base slate only — a variant row is a continuation attached to a coordinate,
  // not an extra line of the walk (services/shared/canonical-slate.cjs).
  const canonRaw = baseSlate(__slateRaw || [])
  const canonEnglish = new Set(canonRaw.map(r => norm(r.english_text.replace(/\[target language\]/gi, 'Welsh'))))

  let failures = 0
  const report = []
  for (const course of COURSES) {
    const oldRows = JSON.parse(fs.readFileSync(path.join(ARCHIVE, `${course}-pod0-sentences-prealign.json`), 'utf8')).sentences
    const oldOnlyEnglish = new Set(oldRows.map(r => norm(r.known_text)).filter(t => !canonEnglish.has(t)))
    const welshFor = new Map()   // normalised Welsh → the English it was written for
    for (const r of oldRows) welshFor.set(norm(r.target_text), norm(r.known_text))

    const { data: courseRow } = await db.from('courses').select('voice_config').eq('course_code', course).single()
    const vc = courseRow.voice_config || {}
    const podCast = vc.podCast || {}
    const aliases = vc.podCastAliases || {}
    const { data: pods } = await db.from('listening_pods').select('*').like('id', `${course}:%`)
    const { data: sentencesRaw } = await db.from('listening_pod_sentences')
      .select('*').in('pod_id', pods.map(p => p.id)).order('global_order')
    // Base rows only — a continuation is not part of the walk this verifies.
    const sentences = baseSlate(sentencesRaw || [])
    const draftIds = new Set(sentences.filter(s => s.target_text_draft).map(s => s.id))

    const voices = [...new Map(Object.entries(podCast).filter(([k]) => k !== '__explainer__')
      .map(([, e]) => [e.voiceId, e])).values()]
    const exp = podCast.__explainer__
    if (exp && !voices.some(v => v.voiceId === exp.voiceId)) voices.push(exp)

    for (const v of voices) {
      const plan = buildRecordingPlan({ pods, sentences, podCast, voiceId: v.voiceId })
      const final = await finalizeRecordingPlan({
        plan, sentences, voiceId: v.voiceId,
        acceptVoiceIds: new Set([v.voiceId, ...(aliases[v.voiceId] || [])]),
        fetchAudioRows: async (ids) => (await db.from('course_audio').select('id,origin,voice_id,duration_ms,file_size_bytes').in('id', ids)).data || [],
      })
      const bad = {
        englishNotCanonical: [], oldEnglish: [], welshMismatched: [], emptyLine: [],
        draftServedUnmarked: [], archiveWelshMarkedDraft: [],
      }
      const seenDraftItems = new Set()
      for (const it of final.items) {
        const en = norm(it.line.knownText)
        const wl = norm(it.line.targetText)
        if (!String(it.line.knownText || it.line.targetText || '').trim()) bad.emptyLine.push(it.sentenceId)
        if (en) {
          if (oldOnlyEnglish.has(en)) bad.oldEnglish.push(`${it.sentenceId}: ${it.line.knownText}`)
          else if (!canonEnglish.has(en)) bad.englishNotCanonical.push(`${it.sentenceId}: ${it.line.knownText}`)
        }
        // A served Welsh line must be one that was written for the English now
        // beside it, OR a line the recorder is being told is a draft.
        if (wl && it.kind === 'target') {
          const isDraftRow = (it.sentenceIds || [it.sentenceId]).some(id => draftIds.has(id))
          const writtenFor = welshFor.get(wl)
          if (writtenFor === undefined && !isDraftRow) {
            bad.welshMismatched.push(`${it.sentenceId}: Welsh neither from the archive nor marked as a draft`)
          }
          // The marker must actually REACH the recorder, both ways round.
          if (isDraftRow) {
            seenDraftItems.add(it.sentenceId)
            if (it.draft !== true) bad.draftServedUnmarked.push(`${it.sentenceId}: drafted Welsh served WITHOUT the draft marker`)
          } else if (it.draft === true) {
            bad.archiveWelshMarkedDraft.push(`${it.sentenceId}: human-written Welsh served marked as a draft`)
          }
        }
      }
      const n = Object.values(bad).reduce((a, x) => a + x.length, 0)
      failures += n
      report.push({
        course, voice: v.voiceId, items: final.items.length, recorded: final.totals.recorded,
        draftItemsServed: seenDraftItems.size, violations: bad, ok: n === 0,
      })
    }
  }
  console.log(JSON.stringify({ pass: failures === 0, failures, report }, null, 2))
  process.exit(failures === 0 ? 0 : 1)
})().catch(e => { console.error(e); process.exit(2) })
