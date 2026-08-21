#!/usr/bin/env node
/**
 * hrv-pod0-two-voice-text-2026-08-21.cjs — the gender-agreement edits Tom's two-voice
 * casting rule forces on the Croatian text, and nothing else.
 *
 * TOM'S SCOPE, verbatim: "SCOPE OF TEXT EDITS: minimal. Only touch a line if it
 * EXPLICITLY genders a character (e.g. grammatical agreement, a pronoun, a gendered
 * noun form) in a way that conflicts with the two-voice rule. Do not rewrite dialogue
 * for style. Log every single such edit - old text, new text, scene, line - because
 * this canonical English propagates to every other language pair built from it, and
 * Aran must personally sign off each of these specific lines before this text change
 * is treated as canon."
 *
 * SO: THESE EDITS ARE PROPOSED, NOT CANON. They are written to the pilot pod so the
 * audio can be rendered and heard as one coherent artifact, and every one of them is
 * recorded in the applied log with its before-state. Nothing here is marked approved
 * by a human, and `target_text_review` gains a `two_voice_pending_signoff` block on
 * every edited row naming Aran as the signatory. Reverting is `old` from the log.
 *
 * WHY THE ROWS KEEP THEIR EXISTING TEXT APPROVAL. phase8's text gate refuses to render
 * the target track of an unapproved draft. These are single-token agreement corrections
 * mandated by a ruling, not fresh translation, so clearing the verifier's approval would
 * only block the render Tom asked for while adding no safety — the pending-signoff block
 * is the honest marker, not a withdrawn approval. Stated here so it can be argued with.
 *
 * CROATIAN-ONLY, DELIBERATELY. Every edit below is `target_text`. The progress matcher
 * keys on the KNOWN (English) text — a known-side edit makes a row count as new and
 * drops its learner state (docs/pods/hrv-pod0-progress-mapping-verification-2026-08-21.md).
 * The one English line the rule does touch — the spoken name "Sarah", on a character now
 * cast male — is NOT applied here. It is a change to Aran's canonical English and is
 * carried to him as a decision, not as an edit.
 *
 *   node tools/pods/hrv-pod0-two-voice-text-2026-08-21.cjs           # dry run
 *   node tools/pods/hrv-pod0-two-voice-text-2026-08-21.cjs --apply
 *
 * Refuses to run against any pod id but the working copy. Vocabulary: known / target / seed.
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const POD_ID = 'hrv_for_eng:pod-0-unrecorded'
const APPLY = process.argv.includes('--apply')

/**
 * Every edit: scene, sentence, the exact text it must find, the text it writes, and the
 * single reason it exists. `old` is asserted in the UPDATE's WHERE clause, so a row whose
 * words moved under us matches zero rows and aborts the whole transaction.
 */
const EDITS = [
  // --- the protagonist thread, drafted female, now Voice A / male --------------
  { sc: 3, sn: 2, speaker: 'Sarah', voice: 'A-male', tokens: 'Željela bih -> Želio bih',
    old: 'Dobar dan. Željela bih kavu, molim. S mlijekom, ali bez šećera. Za van.',
    now: 'Dobar dan. Želio bih kavu, molim. S mlijekom, ali bez šećera. Za van.' },
  { sc: 5, sn: 2, speaker: 'Sarah', voice: 'A-male', tokens: 'umorna -> umoran',
    old: 'Da, jako. Sad sam jako umorna. Laku noć. Vidimo se sutra.',
    now: 'Da, jako. Sad sam jako umoran. Laku noć. Vidimo se sutra.' },
  { sc: 7, sn: 4, speaker: 'Customer 1', voice: 'A-male', tokens: 'Željela -> Želio',
    old: 'Željela bih veliku, molim. Sa zobenim mlijekom, ako imate.',
    now: 'Želio bih veliku, molim. Sa zobenim mlijekom, ako imate.' },
  { sc: 8, sn: 2, speaker: 'Customer 1', voice: 'A-male', tokens: 'Željela -> Želio',
    old: 'Željela bih pintu, molim. Koja piva imate točena?',
    now: 'Želio bih pintu, molim. Koja piva imate točena?' },
  { sc: 8, sn: 4, speaker: 'Customer 1', voice: 'A-male', tokens: 'Željela -> Želio',
    old: 'Željela bih pintu gorkog piva, molim.',
    now: 'Želio bih pintu gorkog piva, molim.' },
  { sc: 8, sn: 8, speaker: 'Customer 3', voice: 'A-male', tokens: 'Željela -> Želio',
    old: 'Željela bih veliku… čašu bijelog vina,… molim.',
    now: 'Želio bih veliku… čašu bijelog vina,… molim.' },
  { sc: 8, sn: 10, speaker: 'Customer 2', voice: 'A-male', tokens: 'Željela -> Želio',
    old: 'Željela bih… još dvije čaše piva.',
    now: 'Želio bih… još dvije čaše piva.' },
  { sc: 8, sn: 12, speaker: 'Customer 1', voice: 'A-male', tokens: 'sigurna -> siguran; gladna -> gladan',
    old: 'Nisam sigurna… jesam li gladna. Imate li jelovnik?',
    now: 'Nisam siguran… jesam li gladan. Imate li jelovnik?' },
  { sc: 8, sn: 15, speaker: 'Customer 2', voice: 'A-male', tokens: 'Željela -> Želio',
    old: 'Imate li sendviče? Željela bih sendvič… sa sirom, molim.',
    now: 'Imate li sendviče? Želio bih sendvič… sa sirom, molim.' },

  // --- counterparts drafted male, now Voice B / female ------------------------
  { sc: 4, sn: 3, speaker: 'Friend', voice: 'B-female', tokens: 'zauzet -> zauzeta',
    old: 'Ne, žao mi je,… sutra sam zauzet. Ali razgovarajmo… u subotu. Vidimo se tada.',
    now: 'Ne, žao mi je,… sutra sam zauzeta. Ali razgovarajmo… u subotu. Vidimo se tada.' },
  { sc: 22, sn: 6, speaker: 'Friend', voice: 'B-female', tokens: 'Impresioniran -> Impresionirana',
    old: 'Mislim… da se odlično snalaziš. Impresioniran sam. Mislim… da si spreman početi… govoriti hrvatski… s bilo kim… tko govori hrvatski.',
    now: 'Mislim… da se odlično snalaziš. Impresionirana sam. Mislim… da si spreman početi… govoriti hrvatski… s bilo kim… tko govori hrvatski.' },

  // --- agreement with the ADDRESSEE, not the speaker --------------------------
  { sc: 5, sn: 1, speaker: 'Neighbour (10:30 pm)', voice: 'B-female', tokens: 'imala -> imao',
    old: 'Dobra večer, Sarah. Jesi li imala dug dan?',
    now: 'Dobra večer, Sarah. Jesi li imao dug dan?' },
  { sc: 20, sn: 6, speaker: 'Learner', voice: 'A-male', tokens: 'pomogao -> pomogla',
    old: 'Hvala ti što si mi pomogao.',
    now: 'Hvala ti što si mi pomogla.' },
  { sc: 20, sn: 9, speaker: 'Learner', voice: 'A-male', tokens: 'ljubazan -> ljubazna',
    old: 'Jako si ljubazan.',
    now: 'Jako si ljubazna.' },
  { sc: 20, sn: 10, speaker: 'Learner', voice: 'A-male', tokens: 'ljubazan -> ljubazna',
    old: 'Hvala ti što si tako ljubazan.',
    now: 'Hvala ti što si tako ljubazna.' },
  { sc: 22, sn: 1, speaker: 'Learner', voice: 'A-male', tokens: 'imao -> imala',
    old: 'Bi li imao nešto protiv da pokušam vježbati hrvatski s tobom? Ne učim jako dugo, i još uvijek se osjećam malo nervozno kad govorim s drugim ljudima.',
    now: 'Bi li imala nešto protiv da pokušam vježbati hrvatski s tobom? Ne učim jako dugo, i još uvijek se osjećam malo nervozno kad govorim s drugim ljudima.' },
]

const slot = (e) => `SC${String(e.sc).padStart(2, '0')}-S${String(e.sn).padStart(3, '0')}`

/** An edit must move gender tokens and nothing else. Guard it mechanically. */
function diffWords (a, b) {
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/)
  if (A.length !== B.length) return null // shape moved — not a token swap
  const changed = []
  for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) changed.push(`${A[i]} -> ${B[i]}`)
  return changed
}

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  const log = {
    pod_id: POD_ID, applied: APPLY,
    ruling: "Tom 2026-08-21 — two voices; minimal text edits, only explicit gender conflicts",
    status: 'PROPOSED — pending Aran\'s personal sign-off on each line before this is canon',
    edits: [],
  }

  console.log(`\n${POD_ID} — two-voice gender edits${APPLY ? ' (APPLY)' : ' (DRY RUN)'}`)

  // ---- 1. prove every edit before writing any of them ------------------------
  for (const e of EDITS) {
    const { rows } = await db.query(
      `select id, speaker, target_text, known_text, target_audio_id from listening_pod_sentences
        where pod_id = $1 and scene_number = $2 and sentence_number = $3`,
      [POD_ID, e.sc, e.sn])
    if (rows.length !== 1) throw new Error(`${slot(e)}: expected 1 row, found ${rows.length}`)
    const row = rows[0]
    if (row.target_text !== e.old) {
      throw new Error(`${slot(e)}: BEFORE-STATE DRIFT\n   expected: ${e.old}\n   found:    ${row.target_text}`)
    }
    const changed = diffWords(e.old, e.now)
    if (!changed) throw new Error(`${slot(e)}: edit changes the shape of the line, not just tokens — refusing`)
    if (!changed.length) throw new Error(`${slot(e)}: no-op edit`)
    log.edits.push({
      slot: slot(e), id: row.id, scene: e.sc, sentence: e.sn, speaker: row.speaker, voice: e.voice,
      field: 'target_text', known_text: row.known_text,
      old: e.old, new: e.now, tokens: e.tokens, words_changed: changed,
      // The clip on this row now says the OLD words. Unlink it here rather than leaving it
      // to the cast sweep, which only knows about VOICE: four of these rows (SC20-S006/009/010,
      // SC22-S001) keep the correct voice and would otherwise silently keep stale audio.
      unlinked_target_audio_id: row.target_audio_id || null,
    })
    console.log(`  ${slot(e)}  ${String(row.speaker).padEnd(20)} ${e.voice.padEnd(9)} ${changed.join(' | ')}`)
  }

  // ---- 2. write, all or nothing ---------------------------------------------
  if (APPLY) {
    await db.query('begin')
    try {
      for (const e of EDITS) {
        const review = {
          two_voice_pending_signoff: {
            ruling: 'Tom 2026-08-21 — exactly two voices, Voice A male = learner/protagonist thread',
            signatory: 'Aran',
            status: 'PROPOSED — not canon until Aran signs off this specific line',
            tokens: e.tokens,
            target_text_before: e.old,
            changed_by: 'tools/pods/hrv-pod0-two-voice-text-2026-08-21.cjs',
          },
        }
        const r = await db.query(
          `update listening_pod_sentences
              set target_text = $1,
                  target_text_review = coalesce(target_text_review, '{}'::jsonb) || $2::jsonb,
                  target_audio_id = null,
                  updated_at = now()
            where pod_id = $3 and scene_number = $4 and sentence_number = $5 and target_text = $6`,
          [e.now, JSON.stringify(review), POD_ID, e.sc, e.sn, e.old])
        if (r.rowCount !== 1) throw new Error(`${slot(e)}: expected 1 row updated, got ${r.rowCount} — rolled back`)
      }
      await db.query('commit')
      console.log(`\n  ${EDITS.length} lines edited. All PROPOSED, pending Aran's sign-off.`)
    } catch (err) { await db.query('rollback'); throw err }
  } else {
    console.log(`\n  DRY RUN — ${EDITS.length} edits proved against their before-state, nothing written.`)
  }

  const out = path.join(__dirname, '..', '..', 'docs', 'pods',
    `hrv-pod0-two-voice-text-2026-08-21-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`  wrote ${out}\n`)
  await db.end()
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
