#!/usr/bin/env node
/**
 * render-16.cjs — generate the 16 approved ell_for_eng presentation clips whose
 * intro text was corrected (label stripped) by commit 159a8d43 but whose AUDIO
 * still speaks the old grammar label.
 *
 * Kai approved exactly this: 16 clips, 482 characters, ~$0.002. The script
 * asserts that shape before it spends anything and refuses to run if the plan
 * has drifted — the approval is for these 16 clips, not a blank cheque.
 *
 * WHY audio-repair-core AND NOT tools/repair-presentation-clips.cjs.
 * The latter's step 7 DELETES the old course_audio row. The brief forbids
 * deleting any existing clip or S3 object (a previous Greek pass unlinked 548
 * rows with no before-image). audio-repair-core is the same-id path: it keeps
 * the row, bumps `audio_revision`, writes a `course_audio_revisions` history row
 * and LEAVES the superseded S3 object in the bucket. Nothing is deleted, and a
 * revert is a data-only operation.
 *
 * That the revision bump actually reaches a learner was verified, not assumed:
 * ssi-learning-app/api/_utils/audioAccess.ts fetchRevisedAudioRefs() stamps
 * every clip with audio_revision > 1 as `<uuid>.v<rev>`, AUDIO_ID_COLUMNS
 * includes presentation_audio_id, and cycles.ts applies it. So the URL changes
 * (busting the immutable year-long cache) while the id does not.
 *
 * Stages:
 *   --dry      cost + plan only, renders nothing
 *   --propose  render, master, level-check, whisper-verify, upload candidate
 *   --qc       my own second opinion on each pending candidate
 *   --accept   swap each verified candidate in (revision 1 -> 2)
 *   --verify   re-read the live rows and the live S3 objects
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const path = require('path')

const PLAN = require('./pending-render.json')
const COURSE = PLAN.course
const ACTOR = 'greek-16-clips-generate (for Kai)'
const REASON = 'spoken grammar label stripped from Greek presentation intro (forum complaint); text corrected in 159a8d43, audio re-rendered to match'
const STATE = path.join(__dirname, 'render-16-state.json')

// ── The approval envelope. Nothing spends until these all hold. ─────────────
const APPROVED = { clips: 16, chars: 482, usd: 0.002 }

const stage = process.argv.find(a => /^--(dry|propose|qc|accept|verify)$/.test(a))
if (!stage) {
  console.error('usage: render-16.cjs --dry | --propose | --qc | --accept | --verify')
  process.exit(1)
}

function loadState () {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')) } catch { return { candidates: {}, accepted: {} } }
}
function saveState (s) { fs.writeFileSync(STATE, JSON.stringify(s, null, 1)) }

/** Refuse to spend if the plan is not the plan Kai approved. */
function assertEnvelope (rows) {
  const chars = rows.reduce((n, r) => n + r.new_text.length, 0)
  const problems = []
  if (rows.length !== APPROVED.clips) problems.push(`clip count ${rows.length}, approved ${APPROVED.clips}`)
  if (chars !== APPROVED.chars) problems.push(`character count ${chars}, approved ${APPROVED.chars}`)
  // Azure S0 rate as this estate cost it everywhere else — $4 per 1M chars
  // (services/audio-generation-planner.cjs s0 tier, and the same constant in
  // tools/audio-veracity-repair.cjs and tools/build-chunk-audio-regen-queue.cjs).
  // This is the rate the approved $0.002 quote was computed at.
  const usd = chars * (4 / 1e6)
  if (usd > APPROVED.usd * 1.15) problems.push(`cost $${usd.toFixed(5)}, approved $${APPROVED.usd}`)
  if (rows.some(r => r.role_live !== 'presentation')) problems.push('a row is not role=presentation')
  if (problems.length) {
    console.error('REFUSING TO SPEND — the plan has drifted from what was approved:')
    problems.forEach(p => console.error('  - ' + p))
    process.exit(2)
  }
  return { chars, usd }
}

const { q } = require('./db.cjs')

/** Live state of the 16 rows — the plan file is a record, the DB is the truth. */
async function liveRows () {
  const ids = PLAN.clips.map(c => c.audio_id)
  const { rows } = await q(`course_audio?id=in.(${ids.join(',')})` +
    '&select=id,lego_id,text,role,language,voice_id,duration_ms,s3_key,audio_revision,file_size_bytes,word_boundaries')
  return PLAN.clips.map(c => {
    const live = rows.find(r => r.id === c.audio_id)
    if (!live) throw new Error(`row ${c.audio_id} (${c.lego_id}) is GONE from course_audio`)
    if (live.text !== c.new_text) {
      throw new Error(`row ${c.audio_id} (${c.lego_id}) text is ${JSON.stringify(live.text)}, ` +
        `plan expects ${JSON.stringify(c.new_text)} — refusing, the corrected text is the thing being voiced`)
    }
    return { ...c, role_live: live.role, live }
  })
}

/**
 * The label fragments that must NOT survive into the new audio.
 *
 * Words the CORRECTED text legitimately contains are excluded, or the check
 * would convict its own fix: S0047L05's label is "(you, present)" and its
 * corrected line is "for you to make", so a bare "you" search finds a word that
 * is supposed to be there. Markers like "1sg" / "aorist" / "masculine" have no
 * such excuse and are what the check is really looking for.
 */
function labelWords (oldSpoken, newText) {
  const m = /\(([^)]*)\)?/.exec(oldSpoken)
  if (!m) return []
  const allowed = new Set(newText.toLowerCase().match(/[a-z0-9]+/g) || [])
  return m[1].split(/[\s,+]+/)
    .map(w => w.replace(/[^a-z0-9]/gi, '').toLowerCase())
    .filter(w => w.length > 2 && !allowed.has(w))
}

;(async () => {
  const rows = await liveRows()
  const env = assertEnvelope(rows)
  const state = loadState()

  if (stage === '--dry') {
    console.log(`${COURSE}: ${rows.length} presentation clips, ${env.chars} chars, $${env.usd.toFixed(5)} at Azure S0`)
    console.log('all 16 live texts match the plan; all role=presentation; nothing rendered\n')
    for (const r of rows) {
      console.log(`${r.lego_id}  rev${r.live.audio_revision ?? 1}  ${String(r.live.duration_ms).padStart(5)}ms  ${r.voice_id}`);
      console.log(`   now speaks: ${r.old_spoken_text}`)
      console.log(`   will speak: ${r.new_text}`)
    }
    return
  }

  const repair = require('../../services/audio-repair.cjs')

  if (stage === '--propose') {
    for (const r of rows) {
      if (state.candidates[r.audio_id]) { console.log(`${r.lego_id} already proposed, skipping`); continue }
      process.stdout.write(`${r.lego_id} rendering… `)
      try {
        const res = await repair.propose({
          courseCode: COURSE, audioId: r.audio_id, source: 'tts', actor: ACTOR,
        })
        state.candidates[r.audio_id] = {
          candidateId: res.candidateId, legoId: r.lego_id,
          durationMs: res.candidate.durationMs, s3Key: res.candidate.s3Key,
          veracity: res.candidate.veracity, level: res.candidate.level,
          before: res.current,
        }
        saveState(state)
        console.log(`ok ${res.candidate.durationMs}ms  cer=${res.candidate.veracity.cer}  ` +
          `mean=${res.candidate.level && res.candidate.level.meanDb}dB  cand=${res.candidateId}`)
      } catch (e) {
        console.log(`FAILED ${e.code || ''} ${e.message}`)
        state.candidates[r.audio_id] = { legoId: r.lego_id, failed: e.message }
        saveState(state)
      }
    }
    return
  }

  if (stage === '--qc') {
    // A second opinion, independent of the core's own gate. Three questions the
    // core does not ask in these words: is the duration plausible for the text,
    // did the label survive, and is the clip shorter than the labelled original
    // (it must be — we removed words).
    const veracity = require('../../services/audio-veracity.cjs')
    let bad = 0
    for (const r of rows) {
      const c = state.candidates[r.audio_id]
      if (!c || c.failed) { console.log(`${r.lego_id}  NO CANDIDATE`); bad++; continue }
      const { buffer } = await repair.storage.get(c.s3Key)
      const decode = await veracity.decodeAudio(buffer, 'en')
      const heard = veracity.normalise(String(decode && decode.text || decode || ''))
      const cps = r.new_text.length / (c.durationMs / 1000)
      const survived = labelWords(r.old_spoken_text, r.new_text).filter(w => heard.includes(w.toLowerCase()))
      const shorter = c.durationMs < r.live.duration_ms
      const plausible = cps >= 5 && cps <= 16
      const ok = !survived.length && shorter && plausible && buffer.length > 4000
      if (!ok) bad++
      console.log(`${ok ? 'PASS' : 'FAIL'} ${r.lego_id}  ${c.durationMs}ms (was ${r.live.duration_ms}ms)  ` +
        `${cps.toFixed(1)} chars/s  ${buffer.length}B` +
        `${survived.length ? '  LABEL SURVIVED: ' + survived.join(',') : ''}` +
        `${shorter ? '' : '  NOT SHORTER THAN LABELLED ORIGINAL'}` +
        `${plausible ? '' : '  IMPLAUSIBLE RATE'}`)
      console.log(`     heard: ${heard}`)
      state.candidates[r.audio_id].qc = { ok, cps, survived, shorter, bytes: buffer.length, heard }
      saveState(state)
    }
    console.log(bad ? `\n${bad} clip(s) failed QC — do not accept those` : '\nall 16 passed QC')
    return
  }

  if (stage === '--accept') {
    for (const r of rows) {
      const c = state.candidates[r.audio_id]
      if (!c || c.failed) { console.log(`${r.lego_id} no candidate, skipping`); continue }
      if (!c.qc || !c.qc.ok) { console.log(`${r.lego_id} REFUSED — has not passed QC`); continue }
      if (state.accepted[r.audio_id]) { console.log(`${r.lego_id} already accepted`); continue }
      process.stdout.write(`${r.lego_id} accepting… `)
      try {
        const res = await repair.accept({
          courseCode: COURSE, audioId: r.audio_id, candidateId: c.candidateId,
          actor: ACTOR, reason: REASON,
        })
        state.accepted[r.audio_id] = res
        saveState(state)
        console.log(`rev ${res.previousRevision} -> ${res.revision}  ${res.durationMs.before}ms -> ${res.durationMs.after}ms  ` +
          `superseded ${res.supersededS3Key} (KEPT)`)
      } catch (e) {
        console.log(`FAILED ${e.code || ''} ${e.message} (rollback: ${e.rollback})`)
      }
    }
    return
  }

  if (stage === '--verify') {
    // Live re-read: the row, the object behind it, and what a learner's URL
    // would now be. Nothing here trusts the state file.
    const veracity = require('../../services/audio-veracity.cjs')
    const ids = PLAN.clips.map(c => c.audio_id)
    const { rows: live } = await q(`course_audio?id=in.(${ids.join(',')})` +
      '&select=id,lego_id,text,s3_key,duration_ms,audio_revision,file_size_bytes,veracity_pass,veracity_cer')
    const { rows: legos } = await q(`course_legos?course_code=eq.${COURSE}` +
      `&lego_id=in.(${PLAN.clips.map(c => c.lego_id).join(',')})&select=lego_id,presentation_audio_id`)
    let good = 0
    for (const r of rows) {
      const l = live.find(x => x.id === r.audio_id)
      const head = await repair.storage.head(l.s3_key)
      const { buffer } = await repair.storage.get(l.s3_key)
      const decode = await veracity.decodeAudio(buffer, 'en')
      const heard = veracity.normalise(String(decode && decode.text || decode || ''))
      const survived = labelWords(r.old_spoken_text, r.new_text).filter(w => heard.includes(w.toLowerCase()))
      const rev = l.audio_revision ?? 1
      const lego = legos.find(x => x.lego_id === r.lego_id)
      const ok = rev > 1 && head.exists && !survived.length && l.s3_key !== r.s3_key_old
      if (ok) good++
      console.log(`${ok ? 'LIVE OK' : 'PROBLEM'} ${r.lego_id}  rev${rev}  ${l.duration_ms}ms  ${head.bytes}B  ` +
        `learner ref ${rev > 1 ? r.audio_id + '.v' + rev : r.audio_id}`)
      console.log(`     text : ${l.text}`)
      console.log(`     heard: ${heard}${survived.length ? '   LABEL STILL SPOKEN: ' + survived.join(',') : ''}`)
      console.log(`     lego presentation link -> ${lego ? (lego.presentation_audio_id === r.audio_id ? 'this row' : lego.presentation_audio_id) : 'NO LEGO'}`)
    }
    console.log(`\n${good}/${rows.length} clips verified live`)
    return
  }
})().catch(e => { console.error('FATAL', e); process.exit(1) })
