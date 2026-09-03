#!/usr/bin/env node
/**
 * eng_for_hin — REVERT the two कल chunk growths of 2026-09-03 (seeds 278, 192).
 *
 * KAI'S RULING, 2026-09-03: *"that sister is really long, prefer the as in
 * method. Probably best to be consistent also - the merging method didn't work
 * for all, so we should use the as in method for all."*
 *
 * So the growths come out and every one of the six bare कल chunks is taught the
 * same way — by the "as in" context in its introduction. A learner meeting the
 * same problem twice should meet the same solution; two mechanisms for one
 * phenomenon is worse than one applied everywhere.
 *
 * WHERE THE BEFORE-STATE COMES FROM. The growth tool's applied logs record which
 * phrase ids it deleted but not what they SAID, so the logs alone cannot restore
 * seed 192. `content_audit_log` can: it holds the full `old_row` for every
 * UPDATE and DELETE, so each of the nine pre-growth rows is re-inserted verbatim
 * — text, position, metadata, decomposition and clip links included. The audit
 * ids are pinned below rather than looked up by time window, so this tool
 * restores exactly the rows a human read, and refuses if any of them has moved.
 *
 * MAKE-BEFORE-BREAK, READ BACKWARDS. The growth nulled S0192L02's three clips
 * and its presentation link. All three clips still exist and still speak exactly
 * "कल रात" / "tomorrow night", so the revert re-points them and the LEGO stops
 * being silent. The presentation link is restored too — that clip is one of this
 * course's 777 stale introductions and says the wrong thing, but it said the
 * wrong thing BEFORE the growth as well, and audible-but-stale is the state we
 * are reverting to. The correct "as in" introduction sits beside it as a pending
 * row waiting on a renderer.
 *
 * NO TTS. All four voices on this course are xAI, which is retired.
 *
 *   node tools/course-optimization/revert-eng-for-hin-kal-growths-2026-09-03.cjs
 *   node tools/course-optimization/revert-eng-for-hin-kal-growths-2026-09-03.cjs --apply
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { decoratePhrasesWithDecomposition } = require('../../services/phrase-decomposition-writer.cjs')

const COURSE = 'eng_for_hin'
const APPLY = process.argv.includes('--apply')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

// The two growths, each stated as "the live row must currently say X; put back Y".
const REVERTS = [
  {
    seed: 278,
    legoId: 'S0278L02',
    now: { known: 'क्या आपको कल रात सब पूरा करना था', target: 'did you have to finish everything last night' },
    back: { known: 'कल रात सब', target: 'everything last night' },
    // clipsBefore in the growth's own applied log: all three null, and the
    // presentation link was null too. Nothing to re-point.
    restoreClips: { known: null, target1: null, target2: null, presentation: null },
    // Its nine drills were never touched — every one of them already contained
    // the grown target, so the growth only re-decomposed them.
    restorePhraseAuditIds: [],
    deleteReplacementPhrases: false,
    // The Frame A introduction the growth wrote, quoting a chunk that no longer
    // exists after this revert. Unrendered (s3_key pending/, no duration, no
    // link), so removing it deletes no audio — it is a placeholder that would
    // otherwise be rendered and bound to the LEGO by a later /generate.
    dropPendingPresentation: 'd5667e2d-9d43-4e9b-a853-06f16f5de656'
  },
  {
    seed: 192,
    legoId: 'S0192L02',
    now: { known: 'मैं कल रात व्यस्त हूँ', target: "I'm busy tomorrow night" },
    back: { known: 'कल रात', target: 'tomorrow night' },
    restoreClips: {
      known: 'f9e4b426-1133-4050-8ebb-0da4820043b1',       // speaks "कल रात"
      target1: 'd45e4f51-396e-425c-ad86-adadb2d2f4a8',      // speaks "tomorrow night"
      target2: '2792e1cc-79b2-42d6-9ef9-0a1013590364',      // speaks "tomorrow night"
      presentation: '76b72dc6-18ac-49c5-844f-5b657426bb18'  // stale, but it is what was linked
    },
    // content_audit_log ids of the nine DELETE rows written at 19:14:21, the
    // instant before the growth inserted its replacements.
    restorePhraseAuditIds: [22899683, 22899685, 22899686, 22899687, 22899688, 22899689, 22899690, 22899691, 22899692],
    deleteReplacementPhrases: true,
    dropPendingPresentation: 'be897157-356c-43a0-bae4-68883e683fbd',
    // The growth swapped कल रात for आज रात in the only two phrases elsewhere in
    // the course that tiled the old chunk. Both are put back: each pins its own
    // tense with an overt present frame (हूँ / चाहता हूँ + subjunctive), which is
    // exactly what the "as in" method asks every कल sentence to do, and each one
    // restores a drill of the chunk.
    downstreamReverts: [
      { id: 'eng_for_hin:S0193L02B02', now: { known: 'आज रात मैं बहुत व्यस्त हूँ', target: "I'm too busy tonight" },
        back: { known: 'कल रात मैं बहुत व्यस्त हूँ', target: "I'm too busy tomorrow night" } },
      { id: 'eng_for_hin:S0249L02U04', now: { known: 'मैं चाहता हूँ कि आप आज रात मेरी मदद करें।', target: 'I want you to help me tonight' },
        back: { known: 'मैं चाहता हूँ कि आप कल रात मेरी मदद करें।', target: 'I want you to help me tomorrow night' } }
    ]
  }
]

async function main () {
  const problems = []
  const log = { course: COURSE, ranAt: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run', reverts: [] }

  for (const r of REVERTS) {
    const entry = { seed: r.seed, legoId: r.legoId, back: r.back }

    const { data: lego, error } = await sb.from('course_legos')
      .select('lego_id, lego_index, known_text, target_text, is_new, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
      .eq('course_code', COURSE).eq('lego_id', r.legoId).single()
    if (error) throw error
    if (lego.known_text !== r.now.known) problems.push(`${r.legoId} known_text is not the grown text: "${lego.known_text}"`)
    if (lego.target_text !== r.now.target) problems.push(`${r.legoId} target_text is not the grown text: "${lego.target_text}"`)
    if (!lego.is_new) problems.push(`${r.legoId} is_new = false`)
    entry.legoIndex = lego.lego_index

    // The clips we are about to re-point must still exist and still speak the
    // text they are being pointed at. A revert that restores a link to a clip
    // saying something else is worse than the silence it replaces.
    const wantIds = Object.values(r.restoreClips).filter(Boolean)
    const { data: clips } = wantIds.length
      ? await sb.from('course_audio').select('id, text, role, s3_key').in('id', wantIds)
      : { data: [] }
    for (const [slot, id] of Object.entries(r.restoreClips)) {
      if (!id) continue
      const c = clips.find(x => x.id === id)
      if (!c) { problems.push(`${r.legoId} ${slot} clip ${id} no longer exists`); continue }
      if (slot === 'known' && c.text !== r.back.known) problems.push(`${r.legoId} known clip says "${c.text}", not "${r.back.known}"`)
      if ((slot === 'target1' || slot === 'target2') && c.text !== r.back.target) problems.push(`${r.legoId} ${slot} clip says "${c.text}", not "${r.back.target}"`)
      if (c.s3_key.startsWith('pending/')) problems.push(`${r.legoId} ${slot} clip ${id} is unrendered`)
    }
    entry.clipsRestored = r.restoreClips

    // The pre-growth phrase rows, recovered from the audit log by pinned id.
    let restoreRows = []
    if (r.restorePhraseAuditIds.length) {
      const { data: audit } = await sb.from('content_audit_log')
        .select('id, change_type, table_name, primary_key, old_row')
        .in('id', r.restorePhraseAuditIds)
      if (audit.length !== r.restorePhraseAuditIds.length) problems.push(`${r.legoId}: expected ${r.restorePhraseAuditIds.length} audit rows, found ${audit.length}`)
      for (const a of audit) {
        if (a.table_name !== 'course_practice_phrases' || a.change_type !== 'DELETE') { problems.push(`audit ${a.id} is a ${a.change_type} on ${a.table_name}`); continue }
        const row = { ...a.old_row }
        // Columns the writer owns, not us.
        delete row.created_at; delete row.updated_at; delete row.version
        restoreRows.push(row)
        // Every restored row must still be tileable: it must contain the chunk
        // we are putting back, on both sides.
        if (!row.known_text.includes(r.back.known)) problems.push(`restored ${row.id} does not contain "${r.back.known}"`)
        if (!row.target_text.toLowerCase().includes(r.back.target.toLowerCase())) problems.push(`restored ${row.id} does not contain "${r.back.target}"`)
      }
      const builds = restoreRows.filter(x => x.phrase_role === 'build').length
      const uses = restoreRows.filter(x => x.phrase_role === 'use').length
      if (builds < 3 || uses < 5) problems.push(`${r.legoId} restored set below the floor: ${builds} build / ${uses} use`)
      entry.restoring = restoreRows.map(x => ({ id: x.id, role: x.phrase_role, known: x.known_text, target: x.target_text }))
    }

    // What is there now, so the log records what the revert removes.
    const { data: current } = await sb.from('course_practice_phrases')
      .select('id, phrase_role, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('course_code', COURSE).eq('seed_number', r.seed).eq('lego_index', lego.lego_index).in('phrase_role', ['build', 'use'])
    entry.currentPhrases = current.map(x => ({ id: x.id, role: x.phrase_role, target: x.target_text, clips: !!(x.known_audio_id || x.target1_audio_id || x.target2_audio_id) }))
    if (r.deleteReplacementPhrases) {
      const withClips = current.filter(x => x.known_audio_id || x.target1_audio_id || x.target2_audio_id)
      if (withClips.length) problems.push(`${r.legoId}: ${withClips.length} replacement phrase(s) carry clips — deleting them would drop audio: ${withClips.map(x => x.id).join(', ')}`)
    }

    // The downstream phrases the growth rewrote.
    for (const d of (r.downstreamReverts || [])) {
      const { data: row } = await sb.from('course_practice_phrases')
        .select('id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id').eq('id', d.id).maybeSingle()
      if (!row) { problems.push(`downstream ${d.id} missing`); continue }
      if (row.known_text !== d.now.known || row.target_text !== d.now.target) {
        problems.push(`downstream ${d.id} has moved since the growth: "${row.known_text}" => "${row.target_text}"`)
      }
      if (row.known_audio_id || row.target1_audio_id || row.target2_audio_id) {
        problems.push(`downstream ${d.id} has acquired clips since the growth — reverting its text would drop them`)
      }
    }
    entry.downstreamReverts = (r.downstreamReverts || []).map(d => ({ id: d.id, back: d.back }))

    // The pending introduction the growth wrote.
    if (r.dropPendingPresentation) {
      const { data: p } = await sb.from('course_audio').select('id, text, s3_key, duration_ms').eq('id', r.dropPendingPresentation).maybeSingle()
      if (!p) { entry.pendingPresentation = 'already gone' } else {
        if (!p.s3_key.startsWith('pending/') || p.duration_ms) problems.push(`presentation ${p.id} is rendered — refusing to delete audio`)
        const { data: linked } = await sb.from('course_legos').select('lego_id').eq('course_code', COURSE).eq('presentation_audio_id', p.id)
        if (linked && linked.length) problems.push(`presentation ${p.id} is linked by ${linked.map(l => l.lego_id).join(', ')}`)
        entry.pendingPresentation = { id: p.id, text: p.text }
      }
    }

    entry._restoreRows = restoreRows
    entry._lego = lego
    log.reverts.push(entry)
  }

  for (const e of log.reverts) {
    console.log(`\nseed ${e.seed}  ${e.legoId}`)
    console.log(`  back to: "${e.back.known}" => "${e.back.target}"`)
    console.log(`  clips to re-point: ${Object.entries(e.clipsRestored).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}`)
    console.log(`  phrases now: ${e.currentPhrases.length}, restoring: ${(e.restoring || []).length}`)
    console.log(`  downstream reverts: ${e.downstreamReverts.length}`)
  }

  if (problems.length) {
    console.error('\nREFUSING:'); problems.forEach(p => console.error('  - ' + p))
    log.problems = problems
    write(log); process.exit(1)
  }
  log.problems = []

  if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply.'); write(log); return }

  const touchedPhraseIds = new Set()
  for (const e of log.reverts) {
    const r = REVERTS.find(x => x.legoId === e.legoId)

    // 1. Every phrase that currently tiles the grown chunk, recorded before the
    //    text moves, so all of them get re-decomposed afterwards.
    const { data: all } = await sb.from('course_practice_phrases')
      .select('id, seed_number, target_text, decomposition').eq('course_code', COURSE)
    for (const p of all) {
      if (Array.isArray(p.decomposition) && p.decomposition.some(b => b.legoId === e.legoId)) touchedPhraseIds.add(p.id)
    }

    // 2. Swap the replacement drill set back. Delete then insert, one LEGO only.
    if (r.deleteReplacementPhrases) {
      const { error: delErr } = await sb.from('course_practice_phrases')
        .delete().eq('course_code', COURSE).eq('seed_number', r.seed).eq('lego_index', e.legoIndex).in('phrase_role', ['build', 'use'])
      if (delErr) throw delErr
      const { error: insErr } = await sb.from('course_practice_phrases').insert(e._restoreRows)
      if (insErr) throw insErr
      e._restoreRows.forEach(x => touchedPhraseIds.add(x.id))
    }

    // 3. The LEGO text goes back, then its clip links. Two statements on
    //    purpose: the text UPDATE fires the course_legos audio-nulling trigger,
    //    so the links must be written after it, not with it.
    const { error: upErr } = await sb.from('course_legos')
      .update({ known_text: r.back.known, target_text: r.back.target })
      .eq('course_code', COURSE).eq('lego_id', r.legoId)
    if (upErr) throw upErr
    const linkPatch = {
      known_audio_id: r.restoreClips.known, target1_audio_id: r.restoreClips.target1,
      target2_audio_id: r.restoreClips.target2, presentation_audio_id: r.restoreClips.presentation
    }
    const { error: linkErr } = await sb.from('course_legos').update(linkPatch)
      .eq('course_code', COURSE).eq('lego_id', r.legoId)
    if (linkErr) throw linkErr

    // 4. Downstream phrases.
    for (const d of (r.downstreamReverts || [])) {
      const { error: dErr } = await sb.from('course_practice_phrases')
        .update({ known_text: d.back.known, target_text: d.back.target }).eq('id', d.id)
      if (dErr) throw dErr
      touchedPhraseIds.add(d.id)
    }

    // 5. The orphaned pending introduction.
    if (r.dropPendingPresentation && typeof e.pendingPresentation === 'object') {
      const { error: pErr } = await sb.from('course_audio').delete().eq('id', r.dropPendingPresentation)
      if (pErr) throw pErr
    }

    // 6. Everything at this seed, whether it tiled the chunk or not.
    const { data: seedPh } = await sb.from('course_practice_phrases')
      .select('id').eq('course_code', COURSE).eq('seed_number', r.seed)
    seedPh.forEach(p => touchedPhraseIds.add(p.id))
  }

  // 7. Re-decompose everything the revert could have destabilised.
  const { data: toDec } = await sb.from('course_practice_phrases')
    .select('id, seed_number, target_text').in('id', [...touchedPhraseIds])
  const dec = await decoratePhrasesWithDecomposition(sb, toDec.map(p => ({ id: p.id, course_code: COURSE, seed_number: p.seed_number, target_text: p.target_text })))
  log.decoration = dec

  // 8. Read every changed row back.
  const after = { legos: [], phrases: {}, concatMismatches: [] }
  for (const r of REVERTS) {
    const { data: l } = await sb.from('course_legos')
      .select('lego_id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
      .eq('course_code', COURSE).eq('lego_id', r.legoId).single()
    after.legos.push(l)
    const ok = l.known_text === r.back.known && l.target_text === r.back.target &&
      (l.known_audio_id || null) === r.restoreClips.known &&
      (l.target1_audio_id || null) === r.restoreClips.target1 &&
      (l.target2_audio_id || null) === r.restoreClips.target2 &&
      (l.presentation_audio_id || null) === r.restoreClips.presentation
    if (!ok) console.error(`VERIFY FAILED on ${r.legoId}`)
  }
  const { data: phAfter } = await sb.from('course_practice_phrases')
    .select('id, target_text, decomposition').in('id', [...touchedPhraseIds])
  after.concatMismatches = phAfter.filter(p => Array.isArray(p.decomposition) &&
    p.decomposition.map(b => b.target).join('') !== p.target_text).map(p => p.id)
  after.redecorated = phAfter.length
  log.verifiedAfter = after
  console.log('\nverify:', JSON.stringify({ legos: after.legos, redecorated: after.redecorated, concatMismatches: after.concatMismatches }, null, 1))
  write(log)
}

function write (log) {
  const out = path.join(__dirname, `revert-eng-for-hin-kal-growths-2026-09-03-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`log → ${out}`)
}

main().catch(e => { console.error(e); process.exit(1) })
