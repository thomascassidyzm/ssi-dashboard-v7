#!/usr/bin/env node
/**
 * hrv-pod0-text-fixes-2026-08-21.cjs — apply the PROVABLE Croatian text fixes to
 * hrv_for_eng:pod-0-unrecorded, and nothing else.
 *
 * PROVENANCE. Two independent read-only reviews of the pod's 118 machine-drafted
 * Croatian lines, jobs #822 (dialogue scenes 1-14 and 22) and #823 (chunk scenes
 * 15-21). Each returned FIX / FLAG / OK per line. ONLY THE FIX ROWS ARE HERE.
 * Every FLAG — synonym choices, register calls, the pounds-vs-euros ledger clash,
 * calque rewrites — is deliberately NOT applied: Croatian is the language Aran
 * field-tested and his ear outranks a model's. They are listed for him and for Tom
 * in docs/pods/hrv-pod0-pilot-2026-08-21.md.
 *
 * THE BAR A ROW HAD TO CLEAR TO BE HERE: one provably correct value, forced either by
 * Croatian grammar/orthography or by a SIBLING LINE ALREADY IN THIS POD that renders
 * the same known-language phrase. Anything softer than that is a FLAG.
 *
 * Three classes, all of them:
 *   ZUT, forced by a sibling — the same known text already has one target form in this
 *     pod, and these rows disagree with it (wine list, Excuse me, Good afternoon, red wine).
 *   Grammar and orthography — sa before s/s/z/z, nasuprot takes the dative, the
 *     obligatory comma before ali, the non-Croatian acute in americana.
 *   Drill tails left as Arabic digits — in Croatian a digit followed by a full stop IS
 *     the ordinal, so a TTS engine reads "60." as sezdeseti. Eight tails were still
 *     digits while their siblings were spelled out in words. This is content, not a
 *     numbered list, and it is never renumbered.
 *   Learner gender — five UNRECORDED drafts in scenes 15-21 wrote the Learner feminine.
 *     The Learner is masculine in Aran's recorded scene 22, and the Friend addresses him
 *     as male there, so the drafts move, not his text.
 *
 * DRAFT FLAGS ARE LEFT ON. Nothing here marks a line approved. Approval is a human ear.
 *
 * ALSO: deletes the one empty slot, SC15-S012. It is not a missing line. The canonical
 * (canonical_pod_scenarios, pod_slug 'pod-0') gives scene 15 exactly ELEVEN sentences and
 * the pod already holds all eleven; the twelfth is residue from the old 15-scene pod,
 * whose scene 15 "First conversation" had twelve and became the new eleven-line scene 22.
 * The align pass emptied it and left the row. It carries no text, no audio and no learner
 * state, and 231 rows is exactly the canonical count.
 *
 * MAKE BEFORE BREAK. Editing a line whose clip already exists makes that clip WRONG, so
 * this nulls the pointer on every edited row that still holds one — the phase8 render
 * then regenerates it. Nulling a pointer is not a deletion: all clips are course_audio
 * rows shared with the live hrv_for_eng:pod-0, which keeps its own pointers and keeps
 * playing. No course_audio row is touched.
 *
 *   node tools/pods/hrv-pod0-text-fixes-2026-08-21.cjs            # dry run
 *   node tools/pods/hrv-pod0-text-fixes-2026-08-21.cjs --apply
 *
 * Every edit asserts its exact before-state and aborts the whole transaction on drift.
 * Vocabulary: known / target / seed.
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const POD_ID = 'hrv_for_eng:pod-0-unrecorded'
const LIVE_POD = 'hrv_for_eng:pod-0'
const APPLY = process.argv.includes('--apply')

/** slot -> { from (exact current target_text), to, why, job } */
const FIXES = {
  // ---- job #822, dialogue scenes -------------------------------------------
  'SC07-S004': { job: 822, why: 'sa before z — sibling SC08-S015 "sa sirom", SC06-S011 "sa suprugom"',
    from: 'Željela bih veliku, molim. S zobenim mlijekom ako imate.',
    to:   'Željela bih veliku, molim. Sa zobenim mlijekom, ako imate.' },
  'SC11-S001': { job: 822, why: '"Dobro podne" is not standard Croatian; siblings SC03-S001/S002 render "Good afternoon" as "Dobar dan"',
    from: 'Dobro podne. Imam rezervaciju… na ime Jones.',
    to:   'Dobar dan. Imam rezervaciju… na ime Jones.' },
  'SC09-S005': { job: 822, why: '"Izvinite" is Serbian; siblings SC02-S001/SC10-S001 render "Excuse me" as "Oprostite"',
    from: 'Izvinite —… imate li nešto… bez glutena? Ili za… vegetarijance?',
    to:   'Oprostite,… imate li nešto… bez glutena? Ili za… vegetarijance?' },
  'SC13-S001': { job: 822, why: 'same Serbianism, same sibling evidence',
    from: 'Izvinite, znate li… kako doći do najbližeg… supermarketa?',
    to:   'Oprostite, znate li… kako doći do najbližeg… supermarketa?' },
  'SC09-S013': { job: 822, why: 'red wine is crno vino in Croatian — siblings SC08-S009 "crnog vina", SC08-S007 "kućno crno"',
    from: 'Jedna boca kućnog… crvenog bila bi divna.',
    to:   'Jedna boca kućnog… crnog bila bi divna.' },
  'SC13-S007': { job: 822, why: 'nasuprot governs the dative, not the genitive',
    from: 'Vidjet ćete supermarket… s lijeve strane, točno… nasuprot autobusnog… stajališta.',
    to:   'Vidjet ćete supermarket… s lijeve strane, točno… nasuprot autobusnom… stajalištu.' },
  'SC12-S010': { job: 822, why: 'digit + full stop is the Croatian ordinal — TTS reads "19." as devetnaesti; siblings are spelled out',
    from: '19. 20. 21. Srijeda. Četvrtak.',
    to:   'Devetnaest. Dvadeset. Dvadeset i jedan. Srijeda. Četvrtak.' },
  'SC14-S010': { job: 822, why: 'same ordinal trap; nominative citation form matches sibling SC13-S011',
    from: '100. 200. 1000. Nedjelja. 12 sati.',
    to:   'Sto. Dvjesto. Tisuća. Nedjelja. Dvanaest sati.' },
  'SC07-S013': { job: 822, why: 'á is not a Croatian letter — the acute is a Spanish import and mis-cues TTS',
    from: 'Dobro jutro. Dva americána… i jednu šalicu čaja,… molim.',
    to:   'Dobro jutro. Dva americana… i jednu šalicu čaja,… molim.' },
  'SC08-S006': { job: 822, why: 'this pod renders "wine list" as vinska karta at SC09-S012 — ZUT',
    from: 'Mogu li vidjeti kartu vina? Želim čašu vina.',
    to:   'Mogu li vidjeti vinsku kartu? Želim čašu vina.' },
  'SC03-S002': { job: 822, why: 'Croatian orthography requires a comma before ali',
    from: 'Dobar dan. Željela bih kavu, molim. S mlijekom ali bez šećera. Za van.',
    to:   'Dobar dan. Željela bih kavu, molim. S mlijekom, ali bez šećera. Za van.' },
  'SC04-S002': { job: 822, why: 'same rule — comma before ali is obligatory',
    from: 'Bok! Žao mi je ali ne mogu sada razgovarati. Moram sada ići kući. Možemo li razgovarati sutra?',
    to:   'Bok! Žao mi je, ali ne mogu sada razgovarati. Moram sada ići kući. Možemo li razgovarati sutra?' },

  // ---- job #823, chunk scenes: Learner gender ------------------------------
  'SC15-S009': { job: 823, why: 'Learner is masculine in the recorded scene 22 (siguran / izrazio / sretan)',
    from: 'Radije bih pokušala govoriti vaš jezik, mislim da je to pristojno.',
    to:   'Radije bih pokušao govoriti vaš jezik, mislim da je to pristojno.' },
  'SC16-S002': { job: 823, why: 'same speaker as recorded SC22-S005 "Nisam siguran"',
    from: 'Govorili ste malo prebrzo, pa nisam sigurna jesam li razumjela.',
    to:   'Govorili ste malo prebrzo, pa nisam siguran jesam li razumio.' },
  'SC19-S001': { job: 823, why: 'masculine instrumental, matching recorded SC22-S011 "sretan"',
    from: 'To me čini sretnom.',
    to:   'To me čini sretnim.' },
  'SC19-S010': { job: 823, why: 'Learner gender — masculine conditional',
    from: 'Željela bih dvije kuglice sladoleda, molim.',
    to:   'Želio bih dvije kuglice sladoleda, molim.' },
  'SC21-S008': { job: 823, why: 'Learner gender',
    from: 'Da, rekla sam da je tamo.',
    to:   'Da, rekao sam da je tamo.' },

  // ---- job #823, chunk scenes: word order + drill tails ---------------------
  'SC17-S001': { job: 823, why: '"blizu ovdje" is not Croatian word order; recorded sibling SC13-S008 gives the natural form',
    from: 'Ima li bankomat blizu ovdje?',
    to:   'Ima li tu negdje bankomat?' },
  'SC15-S011': { job: 823, why: 'digit + full stop is the Croatian ordinal — TTS reads "60." as šezdeseti',
    from: '100.000. 60. 70. 1 sat. 11 sati.',
    to:   'Sto tisuća. Šezdeset. Sedamdeset. Jedan sat. Jedanaest sati.' },
  'SC16-S011': { job: 823, why: 'same; siblings spell numbers out in words',
    from: 'Milijun. 80. 90. 2 sata. 10 sati.',
    to:   'Milijun. Osamdeset. Devedeset. Dva sata. Deset sati.' },
  'SC17-S011': { job: 823, why: 'same',
    from: '3 sata. 9 sati. Siječanj. Veljača.',
    to:   'Tri sata. Devet sati. Siječanj. Veljača.' },
  'SC18-S011': { job: 823, why: 'same',
    from: '4 sata. 8 sati. Ožujak. Travanj.',
    to:   'Četiri sata. Osam sati. Ožujak. Travanj.' },
  'SC19-S011': { job: 823, why: 'same',
    from: '5 sati. 7 sati. Svibanj. Lipanj.',
    to:   'Pet sati. Sedam sati. Svibanj. Lipanj.' },
  'SC20-S011': { job: 823, why: 'same',
    from: '6 sati. Srpanj. Kolovoz. Rujan.',
    to:   'Šest sati. Srpanj. Kolovoz. Rujan.' },
}

/** The empty residue slot — see the header. */
const DELETE_SLOT = 'SC15-S012'

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  const log = { pod_id: POD_ID, applied: APPLY, edits: [], unlinked: [], deleted: [], drift: [] }

  const { rows } = await db.query(
    `select id, scene_number, sentence_number, speaker, known_text, target_text, target_audio_id, target_text_draft
       from listening_pod_sentences where pod_id = $1 order by global_order`, [POD_ID])
  const bySlot = new Map(rows.map(r => [r.id.replace(`${POD_ID}:`, ''), r]))

  for (const [slot, fix] of Object.entries(FIXES)) {
    const row = bySlot.get(slot)
    if (!row) { log.drift.push({ slot, problem: 'slot not found' }); continue }
    if (row.target_text === fix.to) { log.edits.push({ slot, already_applied: true }); continue }
    if (row.target_text !== fix.from) {
      log.drift.push({ slot, problem: 'before-state mismatch', expected: fix.from, actual: row.target_text })
      continue
    }
    log.edits.push({ slot, job: fix.job, speaker: row.speaker, known: row.known_text,
      from: fix.from, to: fix.to, why: fix.why, had_clip: !!row.target_audio_id })
    if (row.target_audio_id) log.unlinked.push({ slot, was_audio_id: row.target_audio_id })
  }

  const doomed = bySlot.get(DELETE_SLOT)
  if (!doomed) log.drift.push({ slot: DELETE_SLOT, problem: 'slot not found' })
  else if ((doomed.target_text || '') !== '' || (doomed.known_text || '') !== '' || doomed.target_audio_id) {
    log.drift.push({ slot: DELETE_SLOT, problem: 'REFUSING to delete — slot is not empty', row: doomed })
  } else log.deleted.push({ slot: DELETE_SLOT, speaker: doomed.speaker })

  const applicable = log.edits.filter(e => !e.already_applied)
  console.log(`\n${POD_ID} — text fixes${APPLY ? ' (APPLY)' : ' (DRY RUN)'}`)
  for (const e of applicable) {
    console.log(`  #${e.job} ${e.slot}${e.had_clip ? ' [clip will be unlinked and re-rendered]' : ''}`)
    console.log(`      known : ${e.known}`)
    console.log(`      -     : ${e.from}`)
    console.log(`      +     : ${e.to}`)
    console.log(`      why   : ${e.why}`)
  }
  console.log(`\n  edits to write        : ${applicable.length}`)
  console.log(`  already applied       : ${log.edits.filter(e => e.already_applied).length}`)
  console.log(`  clips to unlink       : ${log.unlinked.length}`)
  console.log(`  empty slots to delete : ${log.deleted.length}`)
  if (log.drift.length) {
    console.log(`  ⛔ DRIFT (nothing will be written): ${log.drift.length}`)
    for (const d of log.drift) console.log(`      ${d.slot}: ${d.problem}`)
  }

  if (APPLY) {
    if (log.drift.length) throw new Error('refusing to write with drift outstanding')
    // Every clip we unlink must remain reachable from the live pod, or unlinking loses it.
    if (log.unlinked.length) {
      const { rows: live } = await db.query(
        `select distinct target_audio_id from listening_pod_sentences
          where pod_id = $1 and target_audio_id = any($2::uuid[])`,
        [LIVE_POD, log.unlinked.map(u => u.was_audio_id)])
      const reachable = new Set(live.map(r => r.target_audio_id))
      const orphans = log.unlinked.filter(u => !reachable.has(u.was_audio_id))
      if (orphans.length) throw new Error(`REFUSING: ${orphans.length} clip(s) would be unreachable: ${orphans.map(o => o.slot).join(', ')}`)
    }
    await db.query('begin')
    try {
      for (const e of applicable) {
        const r = await db.query(
          `update listening_pod_sentences
              set target_text = $1, target_audio_id = null, updated_at = now()
            where id = $2 and target_text = $3`,
          [e.to, `${POD_ID}:${e.slot}`, e.from])
        if (r.rowCount !== 1) throw new Error(`drift on ${e.slot}: expected 1 row, got ${r.rowCount}`)
      }
      for (const d of log.deleted) {
        const r = await db.query(
          `delete from listening_pod_sentences
            where id = $1 and coalesce(target_text,'') = '' and coalesce(known_text,'') = ''
              and target_audio_id is null`, [`${POD_ID}:${d.slot}`])
        if (r.rowCount !== 1) throw new Error(`drift deleting ${d.slot}: expected 1 row, got ${r.rowCount}`)
      }
      await db.query('commit')
      console.log(`\n  APPLIED: ${applicable.length} edits, ${log.unlinked.length} clips unlinked, ${log.deleted.length} empty slot deleted.`)
    } catch (e) { await db.query('rollback'); throw e }
  } else {
    console.log('\n  DRY RUN — nothing written. Re-run with --apply.')
  }

  const out = path.join(__dirname, '..', '..', 'docs', 'pods',
    `hrv-pod0-text-fixes-2026-08-21-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`  wrote ${out}\n`)
  await db.end()
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
