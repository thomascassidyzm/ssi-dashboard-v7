#!/usr/bin/env node
/**
 * recast-pod-english.cjs — put every pod-0 English track on the two shared xAI
 * clone voices, Olivia (female) and Tom (male).
 *
 * WHY THIS EXISTS. Tom's ruling, 2026-08-11 (decision B of the pod-0 survey,
 * https://watson-1.tail4968cb.ts.net/d/99a7f100 §2): pod English is standardised
 * on the two clones already in wide use, rather than each course keeping its own
 * English cast. Today the estate's pod-0 English is a patchwork — Leo, Sonia,
 * Libby, Ryan, Hollie, Thomas, Alfie, a voice called "Nova" sharing Olivia's id,
 * and 23 character-slots with no English voice at all.
 *
 * WHAT IT TOUCHES. `listening_pods.speakers[character][track]` and nothing else,
 * where `track` is the ENGLISH one — `known` for X_for_eng courses, `target` for
 * eng_for_X. The track is read from `courses.known_lang`/`target_lang`, never
 * inferred from the course code. `gender`, `variants`, the non-English track and
 * every other key are preserved byte-for-byte.
 *
 * NO AUDIO. This tool has no TTS path, no delete path, and never writes an audio
 * id or an audio pointer. Recasting metadata leaves every existing clip exactly
 * where it is; clips rendered on the old voices simply stop matching the cast,
 * which is what the audio-pass approval is for. Queueing that pass is the
 * parent's job, deliberately not this tool's.
 *
 * THREE THINGS IT REFUSES TO DO
 *
 * 1. It never overwrites a `provider: 'human'` voice. cym_n_for_eng and
 *    cym_s_for_eng are voiced by Aran and Catrin on BOTH tracks — 44 character
 *    slots of real human recordings. Overwriting those with a clone would
 *    discard the cast of record for audio that people actually recorded.
 *
 * 2. It never changes a `gender` that is already set. Every gender in the estate
 *    that deviates from the majority traces to a documented, text-evidence-based
 *    human ruling — docs/course-optimization/pod-voice-gender-sweep-2026-07-16.md
 *    (heb, ara_sy, cat, lav, lit, hin: characters whose TARGET text is
 *    male-scripted or female-scripted) and
 *    docs/course-optimization/tha-listening-recast-plan-2026-07-16.md (tha's 31
 *    characters, cast line by line against Thai politeness particles). Those
 *    rulings fixed a real learner complaint. A majority vote across 60 pods would
 *    silently revert them, so gender is read, never written — except case 3.
 *
 * 3. It only FILLS a gender that is absent, never rewrites one. An absent gender
 *    means the pod was never cast at all (fin_for_eng is the whole of this case),
 *    so there is no human ruling to revert. Fills come from ESTATE_GENDER below
 *    and every one is written to the log individually.
 *
 * THE ONE GENDER IT DOES CHANGE: Learner, and only where it is 'n'.
 * tools/pod-sync.cjs POD0_SPEAKER_GENDER pins the Learner to 'f' — a committed
 * ruling, dated after the gender sweep, with a worked rationale. Measured here
 * against the live estate it is also the difference between a pod being
 * approvable and not: the Learner speaks 79 of the new canon's 231 lines, so on
 * every new-canon pod 'n' (→ male) produces an 84/16 line share, which
 * PodLab castFlags marks BAD as "lopsided; one voice carries the pod", and 'f'
 * produces 50/50. The two pods that already carry 'f' (deu_at_for_eng, and
 * fin_for_eng once filled) are measurably the balanced ones.
 *
 * TWO GUARDS ON THAT RULE, because `gender` drives BOTH tracks. This tool only
 * writes the English voice object, but the field it reads to do so is the same
 * field tools/pod-sync.cjs uses to pick the TARGET voice on its next run. Set a
 * Learner female whose Arabic lines are male-scripted and the next sync puts a
 * female voice on those lines — which is the "male voice using female politeness
 * particles" complaint that started the 2026-07-16 sweep, in mirror.
 *
 * 1. Never touch a Learner already recorded as 'm'. Four pods say 'm' (ara_sy,
 *    cat, heb, spa_for_eng) and each is a target-text finding from that sweep or
 *    from the 2026-08-11 Spanish recast.
 *
 * 2. Never flip a Learner whose own target text carries male evidence. The gate
 *    is tools/gendered-speech.cjs — the estate's own detector, the one the sweep
 *    was built on — run over that pod's Learner lines. Any male marker at all,
 *    and the 'n' stands. Measured on the live estate this holds back 13 pods
 *    (ara, ara_eg, hin, ita, pol, por, por_br, spa, spa_mx and their clones);
 *    tha, by contrast, detects FEMALE and flips safely. Languages with no
 *    gendered speech cannot produce a mismatch and flip freely.
 *
 * --no-learner-female turns the whole rule off.
 *
 * GENDER → VOICE resolves exactly as tools/pod-sync.cjs does: 'f' → Olivia,
 * 'm' and 'n' → Tom. 'n' is a legitimate recorded value (pod-sync writes it for
 * every character its name heuristic cannot read) and it has always meant the
 * male voice; treating it as "missing" here would flip a third of the estate.
 *
 * DRY RUN BY DEFAULT. --apply writes. Every write re-reads the pod's speakers
 * inside the transaction and aborts the WHOLE run if it differs from what the
 * dry run planned against — pods are being aligned concurrently by another
 * worker, so drift is expected rather than theoretical.
 *
 *   node tools/pods/recast-pod-english.cjs                     # dry run, all pods
 *   node tools/pods/recast-pod-english.cjs --apply
 *   node tools/pods/recast-pod-english.cjs --pod=spa_for_eng:pod-0
 *   node tools/pods/recast-pod-english.cjs --restore-from-archive --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { isGenderedSpeechLang, textGender } = require('../gendered-speech.cjs')

const APPLY = process.argv.includes('--apply')
const RESTORE = process.argv.includes('--restore-from-archive')
const LEARNER_FEMALE = !process.argv.includes('--no-learner-female')
const arg = (n) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const ONLY_POD = arg('pod')

const DOCS = path.join(__dirname, '..', '..', 'docs', 'pods')
const ARCHIVE = path.join(DOCS, 'pod-english-shared-cast-archive.json')
const LOG = (kind) => path.join(DOCS, `pod-english-shared-cast-${kind}-log.json`)

// The two shared clones. Shape copied byte-for-byte from the precedent Tom
// pointed at, spa_for_eng:pod-0-unrecorded — key order included, because these
// objects are compared for equality against what is already in the column.
const OLIVIA = { name: 'Olivia', locale: 'en', provider: 'xai', voice_id: 'bedd6226' }
const TOM = { name: 'Tom', locale: 'en', provider: 'xai', voice_id: 'gfzdpspr5fdp' }

// Courses with no English side at all — decision 5 of the survey is unruled, so
// they are out of scope rather than skipped-with-a-guess.
const NO_ENGLISH_SIDE = new Set([
  'cat_for_spa', 'eus_for_spa', 'deu_for_jpn', 'fra_for_jpn',
  'ita_for_jpn', 'spa_for_jpn', 'zho_for_jpn',
])
const EXCLUDE_COURSES = new Set([...NO_ENGLISH_SIDE, 'zzz_test_for_eng'])

/**
 * Gender used ONLY to fill a character that has none — never to overwrite one.
 *
 * Not invented: each entry is the value carried by a large majority of the 60
 * pod-0 pods (58-59 of 60 for the named roles), which is the generation-side
 * colouring every pod was built from. Learner is the one entry with a stronger
 * source than the majority — tools/pod-sync.cjs POD0_SPEAKER_GENDER pins it to
 * 'f' with a worked rationale (79 of 231 lines; balances the two-hander; matches
 * Catrin voicing the Learner in the Welsh human recording).
 */
const ESTATE_GENDER = {
  Anna: 'f', Sarah: 'f', Barista: 'f', Receptionist: 'f', Learner: 'f',
  Bartender: 'm', Driver: 'm', Guest: 'm', James: 'm', Local: 'm',
  Tourist: 'm', Friend: 'm', Neighbour: 'm', Pharmacist: 'm', Waiter: 'm',
  // Roles the estate records as ungendered. 'n' is a real value, not a gap:
  // pod-sync writes it whenever its name heuristic has no answer, and the voice
  // picker has always read it as male.
  Narrator: 'n', Customer: 'n', 'Customer 1': 'n', 'Customer 2': 'n',
  'Customer 3': 'n', Assistant: 'n', Passenger: 'n', _default: 'n',
}

// Same canonicalisation the fingerprint and pod-sync use: "Barista (3 pm)" → "Barista".
const canonicalSpeaker = (s) =>
  String(s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()

const voiceFor = (gender) => (gender === 'f' ? OLIVIA : TOM)

// Compare on the four fields that ARE the casting. Key order and any extra keys
// a pod happens to carry are not differences worth a write.
const sameVoice = (a, b) =>
  !!a && !!b && a.voice_id === b.voice_id && a.provider === b.provider
  && (a.locale || '') === (b.locale || '') && (a.name || '') === (b.name || '')

/** Which track carries English. Read from the course, never from the code. */
function englishTrack(course) {
  if (course.known_lang === 'eng') return 'known'
  if (course.target_lang === 'eng') return 'target'
  return null
}

/**
 * Plan one pod. Pure — takes the row, returns the new speakers object plus the
 * per-character verdicts. Returns null when nothing would change.
 */
function planPod(pod, opts = {}) {
  const track = englishTrack(pod)
  if (!track) return null
  // Guard 2: any male marker in this pod's own Learner lines vetoes the flip.
  const learnerMaleEvidence = !!opts.learnerMaleEvidence

  const before = pod.speakers || {}
  const after = {}
  const items = []
  const heldBack = []

  for (const [name, entryRaw] of Object.entries(before)) {
    const entry = { ...(entryRaw || {}) }
    const canon = canonicalSpeaker(name) || name
    const current = entry[track] || null

    if (current && current.provider === 'human') {
      items.push({ character: name, verdict: 'human-exempt', voice: current.name || current.voice_id })
      after[name] = entryRaw
      continue
    }

    let gender = entry.gender
    let genderFill = null
    let genderChange = null
    if (gender === undefined || gender === null || gender === '') {
      gender = ESTATE_GENDER[canon] ?? ESTATE_GENDER[name] ?? 'n'
      genderFill = gender
      entry.gender = gender
    } else if (LEARNER_FEMALE && canon === 'Learner' && gender === 'n' && !learnerMaleEvidence) {
      // The only recorded gender this tool rewrites. See the header.
      genderChange = { from: 'n', to: 'f' }
      gender = 'f'
      entry.gender = 'f'
    } else if (LEARNER_FEMALE && canon === 'Learner' && gender === 'n' && learnerMaleEvidence) {
      heldBack.push({
        character: name,
        verdict: 'learner-flip-held-back',
        reason: 'male markers in this pod\'s own Learner target text (tools/gendered-speech.cjs)',
      })
    }

    const want = voiceFor(gender)
    if (sameVoice(current, want) && !genderFill && !genderChange) {
      items.push({ character: name, verdict: 'already-correct', gender, voice: want.name })
      after[name] = entryRaw
      continue
    }

    entry[track] = { ...want }
    after[name] = entry
    items.push({
      character: name,
      verdict: current ? 'recast' : 'cast-from-nothing',
      gender,
      gender_filled: genderFill,
      gender_changed: genderChange,
      from: current ? `${current.provider || '?'}:${current.voice_id}${current.name ? ` (${current.name})` : ''}` : null,
      to: `${want.provider}:${want.voice_id} (${want.name})`,
    })
  }

  items.push(...heldBack)
  const changed = items.filter((i) => i.verdict === 'recast' || i.verdict === 'cast-from-nothing')
  return { pod_id: pod.id, course_code: pod.course_code, track, before, after, items, changed: changed.length }
}

async function loadPods(client) {
  const { rows } = await client.query(`
    SELECT p.id, p.course_code, p.slug, p.speakers,
           c.known_lang, c.target_lang, c.status,
           (SELECT count(*) FROM listening_pod_sentences s WHERE s.pod_id = p.id)::int AS sentence_count
      FROM listening_pods p
      JOIN courses c ON c.course_code = p.course_code
     WHERE p.slug LIKE 'pod-0%'
     ORDER BY p.id`)
  return rows.filter((p) => {
    if (EXCLUDE_COURSES.has(p.course_code)) return false
    if (p.sentence_count === 0) return false          // the two gated cym shells
    if (!englishTrack(p)) return false
    if (ONLY_POD && p.id !== ONLY_POD) return false
    return true
  })
}

/**
 * True when the COURSE's Learner lines carry any male marker in the target
 * language. Precision-first by construction: the detector only fires on
 * 1st-person-anchored forms, and one marker anywhere is enough to veto the flip.
 * Languages it does not cover cannot produce an audible mismatch → false.
 *
 * Scoped to the course, not the pod, for two reasons. The Learner is one
 * character with one gender, so a course cannot coherently answer this question
 * twice. And the `pod-0-unrecorded` clones are mid-alignment right now, with
 * much of their target text still blank — read alone, a clone looks like it has
 * no male evidence purely because the evidence has not been translated yet, and
 * it would flip while its own pod-0 held back.
 */
const _evidenceCache = new Map()
async function learnerMaleEvidence(client, pod) {
  if (!isGenderedSpeechLang(pod.target_lang)) return false
  if (_evidenceCache.has(pod.course_code)) return _evidenceCache.get(pod.course_code)
  const { rows } = await client.query(
    `SELECT s.target_text
       FROM listening_pod_sentences s
       JOIN listening_pods p ON p.id = s.pod_id
      WHERE p.course_code = $1 AND p.slug LIKE 'pod-0%' AND s.speaker ILIKE 'Learner%'`,
    [pod.course_code])
  const hit = rows.some((r) => textGender(r.target_text, pod.target_lang) === 'm')
  _evidenceCache.set(pod.course_code, hit)
  return hit
}

/**
 * Write one pod, asserting its before-state has not moved. The re-read is
 * FOR UPDATE inside the caller's transaction, so a concurrent writer either
 * finished before us (we see it and abort) or waits behind us.
 */
async function writePod(client, plan) {
  const { rows } = await client.query(
    'SELECT speakers FROM listening_pods WHERE id = $1 FOR UPDATE', [plan.pod_id])
  if (!rows.length) throw new Error(`${plan.pod_id}: pod vanished between plan and apply`)
  const live = JSON.stringify(rows[0].speakers)
  if (live !== JSON.stringify(plan.before)) {
    throw new Error(
      `${plan.pod_id}: speakers changed since the dry run — refusing to write over another writer.\n`
      + `  planned-against: ${JSON.stringify(plan.before).slice(0, 200)}…\n`
      + `  live now:        ${live.slice(0, 200)}…`)
  }
  await client.query(
    'UPDATE listening_pods SET speakers = $2, updated_at = now() WHERE id = $1',
    [plan.pod_id, JSON.stringify(plan.after)])
}

async function restore(client) {
  if (!fs.existsSync(ARCHIVE)) throw new Error(`no archive at ${ARCHIVE}`)
  const archive = JSON.parse(fs.readFileSync(ARCHIVE, 'utf8'))
  const entries = Object.entries(archive.pods || {})
    .filter(([id]) => !ONLY_POD || id === ONLY_POD)
  if (!entries.length) throw new Error(ONLY_POD ? `${ONLY_POD} is not in the archive` : 'archive is empty')

  console.log(`RESTORE ${APPLY ? '(apply)' : '(dry run)'} — ${entries.length} pod(s) from ${path.basename(ARCHIVE)}`)
  let restored = 0, identical = 0
  if (APPLY) await client.query('BEGIN')
  try {
    for (const [id, speakers] of entries) {
      const { rows } = await client.query(
        `SELECT speakers FROM listening_pods WHERE id = $1${APPLY ? ' FOR UPDATE' : ''}`, [id])
      if (!rows.length) throw new Error(`${id}: not in the database`)
      if (JSON.stringify(rows[0].speakers) === JSON.stringify(speakers)) {
        identical++; console.log(`  = ${id} already matches the archive`); continue
      }
      restored++
      console.log(`  ← ${id} would be restored to its archived cast`)
      if (APPLY) {
        await client.query('UPDATE listening_pods SET speakers = $2, updated_at = now() WHERE id = $1',
          [id, JSON.stringify(speakers)])
      }
    }
    if (APPLY) await client.query('COMMIT')
  } catch (e) {
    if (APPLY) await client.query('ROLLBACK')
    throw e
  }
  console.log(`\n${APPLY ? 'restored' : 'would restore'}: ${restored}, already identical: ${identical}`)
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    if (RESTORE) return await restore(client)

    const pods = await loadPods(client)
    console.log(`pod-0 pods in scope: ${pods.length}${ONLY_POD ? ` (filtered to ${ONLY_POD})` : ''}\n`)

    const plans = []
    const totals = {
      pods_in_scope: pods.length, pods_changed: 0,
      recast: 0, cast_from_nothing: 0, already_correct: 0, human_exempt: 0,
      gender_filled: 0, gender_changed: 0,
    }
    for (const pod of pods) {
      const plan = planPod(pod, { learnerMaleEvidence: await learnerMaleEvidence(client, pod) })
      if (!plan) continue
      for (const i of plan.items) {
        if (i.verdict === 'recast') totals.recast++
        else if (i.verdict === 'cast-from-nothing') totals.cast_from_nothing++
        else if (i.verdict === 'already-correct') totals.already_correct++
        else if (i.verdict === 'human-exempt') totals.human_exempt++
        if (i.gender_filled) totals.gender_filled++
        if (i.gender_changed) totals.gender_changed++
      }
      if (plan.changed) { totals.pods_changed++; plans.push(plan) }
      const tag = plan.changed ? `${plan.changed} to recast` : 'no change'
      console.log(`  ${plan.pod_id.padEnd(34)} [${plan.track.padEnd(6)}] ${tag}`)
    }

    console.log('\nDISTRIBUTION')
    for (const [k, v] of Object.entries(totals)) console.log(`  ${k.padEnd(20)} ${v}`)

    const genderFills = plans.flatMap((p) =>
      p.items.filter((i) => i.gender_filled).map((i) => `${p.pod_id} ${i.character} → ${i.gender_filled}`))
    if (genderFills.length) {
      console.log(`\nGENDER FILLED (absent → estate value), ${genderFills.length}:`)
      for (const g of genderFills) console.log(`  ${g}`)
    }

    const genderChanges = plans.flatMap((p) =>
      p.items.filter((i) => i.gender_changed)
        .map((i) => `${p.pod_id} ${i.character}: ${i.gender_changed.from} → ${i.gender_changed.to}`))
    if (genderChanges.length) {
      console.log(`\nGENDER CHANGED (Learner 'n' → 'f', the one rewrite rule), ${genderChanges.length}:`)
      for (const g of genderChanges) console.log(`  ${g}`)
    }

    const log = {
      generated_at: new Date().toISOString(),
      mode: APPLY ? 'applied' : 'dryrun',
      learner_female_rule: LEARNER_FEMALE,
      ruling: "Tom 2026-08-11: pod English standardised on Olivia (xai bedd6226) + Tom (xai gfzdpspr5fdp)",
      totals,
      pods: plans.map((p) => ({ pod_id: p.pod_id, course_code: p.course_code, track: p.track, items: p.items })),
    }

    if (!APPLY) {
      fs.writeFileSync(LOG('dryrun'), JSON.stringify(log, null, 2))
      console.log(`\nDRY RUN — nothing written. Plan: ${LOG('dryrun')}`)
      console.log('Re-run with --apply to write.')
      return
    }

    // Archive the FULL before-state of every pod in scope (not only the changed
    // ones) before a single write — that file is the way back.
    //
    // ADD-ONLY. This tool is re-run as the concurrent alignment work creates more
    // pod-0 clones, and a plain overwrite on the second run would archive the
    // ALREADY-RECAST cast as if it were the original — silently turning the way
    // back into a no-op. A pod's first archived entry is its only one.
    const prior = fs.existsSync(ARCHIVE) ? JSON.parse(fs.readFileSync(ARCHIVE, 'utf8')) : null
    const archive = {
      first_written_at: (prior && prior.first_written_at) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      note: 'Full listening_pods.speakers BEFORE the 2026-08-11 shared-English-cast recast, '
        + 'add-only across re-runs. Restore with: '
        + 'node tools/pods/recast-pod-english.cjs --restore-from-archive --apply',
      pods: { ...Object.fromEntries(pods.map((p) => [p.id, p.speakers])), ...((prior && prior.pods) || {}) },
    }
    const fresh = pods.filter((p) => !(prior && prior.pods && p.id in prior.pods)).length
    fs.writeFileSync(ARCHIVE, JSON.stringify(archive, null, 2))
    console.log(`\narchived ${fresh} newly-seen pod(s); ${Object.keys(archive.pods).length} total → ${ARCHIVE}`)

    await client.query('BEGIN')
    try {
      for (const plan of plans) await writePod(client, plan)
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      console.error(`\nABORTED — nothing was written.\n${e.message}`)
      process.exit(1)
    }
    // Applied logs ACCUMULATE for the same reason the archive does: re-runs pick
    // up newly-cloned pods, and each run's per-character verdicts are the record
    // the re-audit reconciles against.
    const priorLog = fs.existsSync(LOG('applied'))
      ? JSON.parse(fs.readFileSync(LOG('applied'), 'utf8')) : null
    const runs = [...((priorLog && priorLog.runs) || []), log]
    fs.writeFileSync(LOG('applied'), JSON.stringify({ runs }, null, 2))
    console.log(`applied to ${plans.length} pods (run ${runs.length}). Log: ${LOG('applied')}`)
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(`FAILED: ${e.message}`); process.exit(1) })
}

module.exports = { planPod, canonicalSpeaker, englishTrack, sameVoice, OLIVIA, TOM, ESTATE_GENDER }
