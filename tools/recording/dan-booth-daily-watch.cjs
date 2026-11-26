#!/usr/bin/env node
/**
 * dan-booth-daily-watch.cjs — job #737 (Kai, 26 Nov 2026: "keep an eye out for any new recording sessions he does").
 *
 * Once a day: how many takes Dan (human_dan_cym_s, Southern Welsh) stored since the last run, by step, and his
 * booth total out of the 14,788 lines his booth listed on 26 Nov. One plain line to Kai's current Watson room,
 * and NOTHING on a day with no takes.
 *
 * READS ONLY THE NIGHTLY COPY (Kai's ruling, #736·AL): never live Popty, never the live DB. The booth's own
 * routes are out by construction — /take-days needs a sudo-signed agent-admin header and /summary + the queue
 * log a booth ARRIVAL for Dan on every read (castingRights.boothArrival → recordAccess), which would tell the
 * consent ledger he came to the booth when he did not. This tool refuses any DATABASE_URL that is not the
 * copy (login ssi_copy, database ssi_copy_*), and refuses a copy whose name is not the one copy-state.json
 * says was built (a stale copy would count a day twice or not at all).
 *
 * WHAT A TAKE IS: a course_audio row with voice_id human_dan_cym_s, counted by created_at — the same rule as
 * the booth's take-days route (recordist-router.cjs). The window is [since, the copy's dump time).
 *
 * WHICH STEP A TAKE WAS: read from the slot that links it, because a take carries no line id of its own.
 *   - a course_seeds target slot        → a sentence (cym_sv2_for_eng = the sv2 seed track; cym_s_for_eng = the older list)
 *   - a course_legos target slot        → a chunk (LEGO)
 *   - a course_practice_phrases slot    → a practice phrase; the pass (1 or 2) is the booth's own split,
 *                                         services/voice-engine/phrase-queue.cjs orderCoursePhrases, run on the copy
 *   - linked nowhere                    → "not in a slot" (a retake that lost, a Pod line, or a take whose words
 *                                         another take already fills). Said as such, never guessed into a step.
 *
 * THE TOTAL. The booth's 14,788 = sv2 seeds 764 + sv2 LEGOs 1,292 + Pod 1 90 + the wanted line 1 + phrase pass 1
 * 8,202 + pass 2 4,235 + the older cym_s seed list 204 (#718·AL, 26 Nov 17:10Z, 2,267 recorded). The four
 * tracks that were COMPLETE on 26 Nov (seeds, LEGOs, Pod 1, the wanted line: 2,147) are carried as done — the
 * LEGO and Pod rules (byWords, scene casting) live in recordist-queue.cjs behind a Supabase client and are not
 * reproduced here. The phrase passes are recomputed from the copy with phrase-queue.cjs planCourse (target1,
 * Dan's own slots), and the older list as cym_s_for_eng seeds whose target1 slot holds his take. If the
 * recomputed pass totals are not the booth's 8,202 / 4,235 the total is NOT posted as the booth's figure:
 * it is labelled "(from the copy; the booth said 2,267 on 26 Nov)".
 *
 *   node tools/recording/dan-booth-daily-watch.cjs --from 2026-11-25T00:00:00Z --to 2026-11-26T00:00:00Z   # dry run
 *   node tools/recording/dan-booth-daily-watch.cjs --state <file> --notice <notice-kai.cjs> --until 2026-12-11
 *
 * Exit 0 ran (posted or nothing to post), 10 past --until (run.sh disables the timer), 3 not the copy / stale
 * copy (nothing counted, state untouched), 1 error. State advances only after a post is delivered, or when
 * there was nothing to post.
 */
'use strict'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const agentDb = require('../../services/shared/agent-db.cjs')
const phraseQueue = require('../../services/voice-engine/phrase-queue.cjs')

const VOICE = 'human_dan_cym_s'
const SV2 = 'cym_sv2_for_eng'
const OLD = 'cym_s_for_eng'
const BOOTH_LINES = 14788
const BASELINE = Object.freeze({ at: '2026-11-26T17:10:00Z', recorded: 2267, pass1Total: 8202, pass2Total: 4235 })
// Tracks complete on 26 Nov 17:10Z (#718·AL): sv2 seeds 764/764, sv2 LEGOs 1,292/1,292, Pod 1 90/90, S0114L01U16 1/1.
const COMPLETE_TRACKS = 764 + 1292 + 90 + 1
const ROLES = ['target1', 'target2', 'known']

function args(argv) {
  const a = {}
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (!k.startsWith('--')) continue
    const n = argv[i + 1]
    if (n === undefined || n.startsWith('--')) a[k.slice(2)] = true
    else { a[k.slice(2)] = n; i++ }
  }
  return a
}

/** The socket-form copy URL (postgres://u:p@/db?host=/sock) → login + database, the way pgUrl.mjs reads it. */
function loginOf(raw) {
  const u = new URL(String(raw).replace(/^(postgres(?:ql)?:\/\/[^/]*@)(?=\/)/, '$1localhost'))
  return { user: u.searchParams.get('user') || decodeURIComponent(u.username), db: u.searchParams.get('dbname') || decodeURIComponent(u.pathname.slice(1)) }
}
function isCopy(raw) {
  try { const { user, db } = loginOf(raw); return user === 'ssi_copy' && /^ssi_copy_[a-z0-9_]+$/.test(db) } catch { return false }
}
/** ssi_copy_20261126t033000z → 2026-11-26T03:30:00Z (the dump the copy was restored from). */
function dumpTime(dbName) {
  const m = /^ssi_copy_(\d{4})(\d{2})(\d{2})t(\d{2})(\d{2})(\d{2})z$/.exec(dbName)
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : null
}

const n = (x) => Number(x).toLocaleString('en-GB')
const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

async function takesIn(pg, from, to) {
  const { rows } = await pg.query(
    `SELECT id::text AS id, course_code, role, created_at FROM course_audio
      WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz AND voice_id = $3`,
    [from, to, VOICE])
  return rows
}

/** id → [{table, course_code, row id, slot}] for every content slot pointing at one of these clips. */
async function slotsOf(pg, ids) {
  const out = new Map()
  if (!ids.length) return out
  const add = (r, table) => { if (!out.has(r.audio)) out.set(r.audio, []); out.get(r.audio).push({ table, ...r }) }
  for (const role of ROLES) {
    const col = `${role}_audio_id`
    for (const [table, key] of [['course_seeds', 'seed_number::text'], ['course_legos', 'lego_id'], ['course_practice_phrases', 'id']]) {
      const { rows } = await pg.query(`SELECT ${col}::text AS audio, course_code, ${key} AS row_key, '${role}' AS role FROM ${table} WHERE ${col} = ANY($1::uuid[])`, [ids])
      for (const r of rows) add(r, table)
    }
  }
  return out
}

/** The booth's phrase plan for sv2, target1 = Dan, from the copy. */
async function sv2PhrasePlan(pg) {
  const order = (await pg.query(`SELECT seed_number, position FROM course_running_order WHERE course_code = $1 ORDER BY position`, [SV2])).rows
  const positions = new Map()
  for (const o of order) if (!positions.has(o.seed_number)) positions.set(o.seed_number, o.position)
  const legos = (await pg.query(`SELECT seed_number, lego_index, is_new, known_text, target_text FROM course_legos WHERE course_code = $1 ORDER BY seed_number, lego_index`, [SV2])).rows
  const maxSeed = [...positions.keys()].reduce((m, s) => Math.max(m, s), 0)
  const phrases = (await pg.query(
    `SELECT id, seed_number, lego_index, position, phrase_role, target_text, known_text, target1_audio_id::text AS target1_audio_id
       FROM course_practice_phrases WHERE course_code = $1 AND seed_number <= $2 AND phrase_role = ANY($3::text[])
      ORDER BY seed_number, lego_index, position`, [SV2, maxSeed, ['build', 'use', 'practice']])).rows
  const flags = (await pg.query(`SELECT phrase_id FROM phrase_proof_flags WHERE course_code = $1 AND flagged`, [SV2])).rows
  const voiceOf = await agentDb.clipMap(pg, phrases.map((p) => p.target1_audio_id), { cols: 'id::text AS id, voice_id' })
  const plan = phraseQueue.planCourse({
    courseCode: SV2, positions, legos, phrases,
    roles: { target1: {
      holderOf: (p) => { const id = p.target1_audio_id; return id ? ((voiceOf.get(id) || {}).voice_id === VOICE ? VOICE : 'other') : '' },
      isMine: (v) => v === VOICE,
    } },
    flagged: new Set(flags.map((f) => f.phrase_id)),
  })
  const lines = plan.linesByRole.target1
  const passOf = new Map()
  const totals = { 1: { lines: 0, recorded: 0 }, 2: { lines: 0, recorded: 0 } }
  for (const l of lines) {
    totals[l.pass].lines += 1
    if (l.copies.every((c) => c.holder === VOICE)) totals[l.pass].recorded += 1
    for (const c of l.copies) passOf.set(c.phraseId, l.pass)
  }
  return { passOf, totals }
}

async function oldListRecorded(pg) {
  const { rows } = await pg.query(
    `SELECT count(*)::int AS n FROM course_seeds s JOIN course_audio a ON a.id = s.target1_audio_id
      WHERE s.course_code = $1 AND a.voice_id = $2`, [OLD, VOICE])
  return rows[0].n
}

function classify(takes, slots, passOf) {
  const c = { total: takes.length, sv2Seeds: 0, oldSeeds: 0, legos: 0, pass1: 0, pass2: 0, phraseNoPass: 0, unlinked: 0 }
  for (const t of takes) {
    const s = slots.get(t.id) || []
    const seed = s.find((x) => x.table === 'course_seeds')
    const lego = s.find((x) => x.table === 'course_legos')
    const phrase = s.find((x) => x.table === 'course_practice_phrases')
    if (seed) { if (seed.course_code === OLD) c.oldSeeds++; else c.sv2Seeds++ }
    else if (lego) c.legos++
    else if (phrase) {
      const p = phrase.course_code === SV2 ? passOf.get(phrase.row_key) : null
      if (p === 1) c.pass1++; else if (p === 2) c.pass2++; else c.phraseNoPass++
    } else c.unlinked++
  }
  return c
}

function lineFor(c, from, to, total) {
  const span = day(from) === day(new Date(Date.parse(to) - 1).toISOString()) ? `on ${day(from)}` : `between ${day(from)} and ${day(new Date(Date.parse(to) - 1).toISOString())}`
  const phrases = c.pass1 + c.pass2 + c.phraseNoPass
  const extra = []
  if (c.phraseNoPass) extra.push(`${n(c.phraseNoPass)} outside the two passes`)
  const parts = [
    `${n(c.sv2Seeds)} sentences`,
    `${n(c.legos)} chunks`,
    `${n(phrases)} practice phrases (${n(c.pass1)} first pass, ${n(c.pass2)} second${extra.length ? ', ' + extra.join(', ') : ''})`,
    `${n(c.oldSeeds)} older-list sentences`,
  ]
  if (c.unlinked) parts.push(`${n(c.unlinked)} not in any slot (retakes or Pod lines)`)
  return `Dan recorded ${n(c.total)} takes ${span}: ${parts.join(', ')}. ${total}`
}

async function main() {
  const a = args(process.argv.slice(2))
  if (a.until && Date.now() >= Date.parse(`${a.until}T23:59:59Z`)) { console.log(`dan-booth-watch: past --until ${a.until}; stopping`); return 10 }
  const url = process.env.DATABASE_URL
  if (!url || !isCopy(url)) { console.error('dan-booth-watch: DATABASE_URL is not the nightly copy (ssi_copy login, ssi_copy_* database); refusing'); return 3 }
  const dbName = loginOf(url).db
  const copyStatePath = a['copy-state'] || path.join(os.homedir(), 'ssi-restore', 'copy-state.json')
  let copyState = {}
  try { copyState = JSON.parse(fs.readFileSync(copyStatePath, 'utf8')) } catch {}
  if (copyState.db !== dbName) { console.error(`dan-booth-watch: copy-state names ${copyState.db || 'nothing'}, env names ${dbName}; refusing a stale or mismatched copy`); return 3 }
  const copyAt = dumpTime(dbName)
  if (!copyAt) { console.error(`dan-booth-watch: cannot read the dump time from ${dbName}`); return 3 }

  let state = {}
  if (a.state && fs.existsSync(a.state)) state = JSON.parse(fs.readFileSync(a.state, 'utf8'))
  const from = a.from || state.since || BASELINE.at
  const to = a.to || copyAt
  if (Date.parse(to) > Date.parse(copyAt)) { console.error(`dan-booth-watch: --to ${to} is after the copy's dump ${copyAt}; the copy cannot see it`); return 3 }
  if (Date.parse(from) >= Date.parse(to)) { console.log(`dan-booth-watch: nothing new: window ${from} .. ${to} is empty (copy ${dbName})`); return 0 }

  const pg = await agentDb.connect({ url, app: 'agent:dan-booth-daily-watch' })
  try {
    const takes = await takesIn(pg, from, to)
    console.log(`dan-booth-watch: copy ${dbName}, window ${from} .. ${to}: ${takes.length} takes`)
    const dry = !!(a.from || a.to) || !a.notice
    if (!takes.length) {
      console.log('dan-booth-watch: no takes; posting nothing')
      if (!dry && a.state) fs.writeFileSync(a.state, JSON.stringify({ since: to, lastRun: new Date().toISOString(), lastTakes: 0 }, null, 2))
      return 0
    }
    const [slots, plan, oldRec] = await Promise.all([slotsOf(pg, takes.map((t) => t.id)), sv2PhrasePlan(pg), oldListRecorded(pg)])
    const c = classify(takes, slots, plan.passOf)
    const recorded = COMPLETE_TRACKS + plan.totals[1].recorded + plan.totals[2].recorded + oldRec
    const matches = plan.totals[1].lines === BASELINE.pass1Total && plan.totals[2].lines === BASELINE.pass2Total
    console.log(`dan-booth-watch: by step ${JSON.stringify(c)}`)
    console.log(`dan-booth-watch: from the copy: pass 1 ${plan.totals[1].recorded}/${plan.totals[1].lines} (booth ${BASELINE.pass1Total}), pass 2 ${plan.totals[2].recorded}/${plan.totals[2].lines} (booth ${BASELINE.pass2Total}), older list ${oldRec}/204, complete tracks carried ${COMPLETE_TRACKS}; total ${recorded}/${BOOTH_LINES} (${matches ? 'pass lists match the booth' : 'PASS LISTS DO NOT MATCH THE BOOTH'})`)
    const total = matches
      ? `Booth now ${n(recorded)} of ${n(BOOTH_LINES)} (counted from the nightly copy).`
      : `Booth about ${n(recorded)} of ${n(BOOTH_LINES)} (from the copy; the booth said ${n(BASELINE.recorded)} on 26 Nov).`
    const line = lineFor(c, from, to, total)
    console.log(`dan-booth-watch: ${dry ? 'WOULD POST' : 'POSTING'}: ${line}`)
    if (dry) return 0
    execFileSync(process.execPath, [a.notice, 'kai', process.env.CS_CONV_TOKEN || '', line], { stdio: 'inherit', env: { ...process.env, NOTICE_RELAY: 'dan-booth-watch' } })
    if (a.state) fs.writeFileSync(a.state, JSON.stringify({ since: to, lastRun: new Date().toISOString(), lastTakes: c.total, lastLine: line }, null, 2))
    return 0
  } finally { await pg.end() }
}

if (require.main === module) {
  main().then((code) => process.exit(code), (e) => { console.error(`dan-booth-watch: ${e.stack || e.message}`); process.exit(1) })
}
module.exports = { isCopy, dumpTime, classify, lineFor }
