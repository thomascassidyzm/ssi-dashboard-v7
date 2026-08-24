#!/usr/bin/env node
/**
 * verify-pod-audio-fidelity.cjs — 2026-08-24
 *
 * THE STANDARD (Tom, 2026-08-24 11:19Z ruling, item 3): a verification
 * mechanism that proves EVERY SINGLE PHRASE in every pod-1 course actually
 * plays as expected — whole-turn AND split, on BOTH language tracks —
 * through the real serving path. Full coverage, not samples: for every row
 * of every course, every audio column resolves, fetches from the production
 * learner URL, and its content matches its own row's text, with the speaker
 * in the course's two-voice cast.
 *
 * This is the PERMANENT release gate for pod work — run it after any pod
 * flip, recast, or repair, not just this one. It never writes to the DB.
 *
 * SCOPE, BY COLUMN (each is a distinct kind of check, not one blanket rule):
 *
 *   target_audio_id / known_audio_id
 *     Whole-turn. Full-string text match, full two-voice cast check.
 *
 *   sentence_audio_ids / sentence_known_audio_ids
 *     Split clips (podSentenceSplit.ts). Joined-or-contained text match
 *     (same rule the repair tool uses — the split may legitimately fragment
 *     the sentence across clips), full two-voice cast check. This is the
 *     column the ita_for_eng / fleet defect actually lived in.
 *
 *   takeg_audio_ids
 *     Per-atom "take again" clips (tools/render-take-g.cjs). Each clip's
 *     text need only be CONTAINED in target_text (they are sub-sentence
 *     fragments by design, not the whole line) — full-match would be a
 *     false positive generator. Target-side cast check.
 *
 *   explainer_audio_id
 *     Composite construction-explainer narration (services/pod-explainer-
 *     composite.cjs), text is explainer_text, not target/known_text, and it
 *     is voiced from a SEPARATE narrator pool, not the course's two-character
 *     dialogue cast (confirmed: cast check on this column produced 34
 *     false "off-cast" flags fleet-wide in the prior sweep). Existence +
 *     production-URL fetch only; text/cast are reported informationally,
 *     never scored as a failure.
 *
 *   note_audio_id
 *     No paired text column exists anywhere in the schema. Existence +
 *     production-URL fetch only, no text/cast claim is possible or made.
 *
 * WHAT "VERIFIED" MEANS FOR EACH ID:
 *   1. resolves — a course_audio row exists for the id (no dangling FK;
 *      these columns carry none, per tools/revoice-clips.cjs's own note).
 *   2. text     — DB-level: course_audio.text normalizes-matches the row's
 *      own text for that side (skipped for explainer/note).
 *   3. cast     — DB-level: course_audio.voice_id (both xai_ and azure_
 *      prefixes stripped) is one of the pod's declared cast voices for that
 *      side (skipped for explainer/note).
 *   4. served   — THROUGH THE REAL SERVING PATH: a live HTTP GET against
 *      the production learner proxy (https://saysomethingin.app/api/audio/
 *      <id>) returns 2xx and a non-zero Content-Length/Content-Range. Uses
 *      Range: bytes=0-0 (1 byte) so full-fleet coverage (~15k unique clips)
 *      doesn't mean downloading hundreds of MB — this proves the id resolves
 *      end-to-end (proxy → entitlement → S3 GetObject) without paying for
 *      the whole body. A clip that resolves in the DB but 404s/500s here is
 *      the "genuinely missing" case Tom asked to be listed for his Popty
 *      trigger, not repaired by this tool (it renders nothing, ever).
 *
 * Usage:
 *   node tools/pods/verify-pod-audio-fidelity.cjs <course_code> [--json-out <path>] [--concurrency N]
 *
 * Exit code 0 = fully verified (informational-only issues may still be
 * printed); exit code 1 = at least one scored failure (dangling ref, text
 * mismatch, off-cast, or unserved clip).
 *
 * ---------------------------------------------------------------------------
 * VARIANT RUNS SPLIT ACROSS TWO VOICES (added 2026-08-24, Tom's ruling)
 *
 * A defect class of its own, and NOT an off-cast clip. In the Italian pod-1
 * case both voices were legitimately in the cast, every clip was on-cast, and
 * `checkPodCast` went green — while scene 21 had one character saying "It's
 * down there on the left", then "It's down there on the right", then, asked to
 * repeat, "Yes, I said it's over there". Nothing on the estate could see it,
 * because nothing was measuring the RUN. Tom, on being told the rule had been
 * written down: "That's just common sense though. Should just be what happens
 * in casting, right?"
 *
 * So this gate now reports, per pod, every variant run whose lines are split
 * across two voices on either track, naming the rows and quoting the
 * contradiction in plain English. The rule itself lives in
 * tools/pods/variant-run.cjs and is not restated here.
 *
 * IT IS COUNTED SEPARATELY AND DOES NOT FLIP THE VERDICT. Two reasons, and the
 * second is the load-bearing one. First, it is a content-attribution defect,
 * not a broken clip — nothing is missing, mis-served or off-cast. Second, this
 * is a PERMANENT release gate that people run to decide whether pod work is
 * safe to ship, and quietly widening what FAIL means would retro-fail work that
 * is fine today; the read-only fleet census of all 22 live pod-1 courses on
 * 2026-08-24 found 462 variant runs and ZERO of them split, so the count is
 * expected to be 0 and a non-zero one is news. `--variant-runs-blocking` makes
 * it scored, for whoever wants it in a pipeline.
 *
 * A variant run wholly on ONE voice is the CORRECT state and is never reported.
 * The all-learner practice scenes (Italian 18 and 19) have no second speaker by
 * design — Aran's chunk ruling of 2026-08-06 — and produce nothing here.
 *
 * READ-ONLY, unchanged: this check adds no write of any kind.
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { splitVariantRuns } = require('./variant-run.cjs')

const COURSE = process.argv[2]
const jsonOutIdx = process.argv.indexOf('--json-out')
const JSON_OUT = jsonOutIdx > -1 ? process.argv[jsonOutIdx + 1] : null
const concIdx = process.argv.indexOf('--concurrency')
const CONCURRENCY = concIdx > -1 ? Number(process.argv[concIdx + 1]) : 24
const PROD_BASE = process.env.POD_AUDIO_BASE || 'https://saysomethingin.app/api/audio'
/** Variant-run splits are counted separately by default — see the header. */
const VARIANT_RUNS_BLOCKING = process.argv.includes('--variant-runs-blocking')

if (!COURSE) {
  console.error('usage: verify-pod-audio-fidelity.cjs <course_code> [--json-out <path>] [--concurrency N] [--variant-runs-blocking]')
  process.exit(2)
}

const REPO = path.resolve(__dirname, '../..')
const envText = fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
const DATABASE_URL = (envText.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/) || [])[1]
if (!DATABASE_URL) throw new Error('no DATABASE_URL in .env.psql')

const norm = (s) => (s || '')
  .toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/\[pause\]/g, ' ').replace(/[…]/g, ' ')
  .replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim()

// Same normalization the repair tool's own gate settled on (2026-08-24): a
// voice id appears both bare and provider-prefixed in the same course
// (`ara`/`xai_ara`, `es-ES-ElviraNeural`/`azure_es-ES-ElviraNeural`); both
// prefixes must come off before any cast comparison.
const bare = (v) => (v || '').replace(/^(xai_|azure_)/, '')

async function fetchExists (id) {
  // 1-byte range GET through the real production proxy. Retries transient
  // network failures; does not retry 4xx/5xx (those ARE the finding).
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${PROD_BASE}/${id}`, { headers: { Range: 'bytes=0-0' } })
      const cl = res.headers.get('content-range') || res.headers.get('content-length')
      const total = res.headers.get('content-range')
        ? Number((res.headers.get('content-range') || '').split('/')[1])
        : Number(res.headers.get('content-length') || 0)
      return { ok: res.status === 206 || res.status === 200, status: res.status, bytes: total }
    } catch (e) {
      if (attempt === 2) return { ok: false, status: 0, error: e.message }
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
    }
  }
}

async function pool (items, worker, concurrency) {
  const results = new Array(items.length)
  let next = 0
  async function runner () {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runner))
  return results
}

// column-group definitions: how to check text + whether cast applies
const SIDE_TEXT = { target: 'target_text', known: 'known_text' }

async function main () {
  const db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()

  const podRow = (await db.query('select course_code, visibility, speakers from listening_pods where id=$1', [COURSE + ':pod-1'])).rows[0]
  if (!podRow) throw new Error(`no such pod: ${COURSE}:pod-1`)

  const cast = { target: new Set(), known: new Set() }
  for (const entry of Object.values(podRow.speakers || {})) {
    for (const side of ['target', 'known']) {
      const v = entry?.[side]?.voice_id
      if (v) cast[side].add(bare(v))
    }
  }

  const rows = (await db.query(
    `select id, scene_number, sentence_number, speaker, target_text, known_text, explainer_text,
            target_audio_id, known_audio_id, explainer_audio_id, note_audio_id,
            sentence_audio_ids, sentence_known_audio_ids, takeg_audio_ids
       from listening_pod_sentences where pod_id=$1
      order by scene_number, sentence_number`, [COURSE + ':pod-1'])).rows

  // Build the flat list of every (row, column-entry) to check.
  const checks = []
  for (const r of rows) {
    const rid = `s${r.scene_number}/${r.sentence_number}`
    if (r.target_audio_id) checks.push({ row: rid, col: 'target_audio_id', id: r.target_audio_id, side: 'target', text: r.target_text, mode: 'full', castApplies: true })
    if (r.known_audio_id) checks.push({ row: rid, col: 'known_audio_id', id: r.known_audio_id, side: 'known', text: r.known_text, mode: 'full', castApplies: true })
    for (const id of (r.sentence_audio_ids || []).filter(Boolean)) checks.push({ row: rid, col: 'sentence_audio_ids', id, side: 'target', text: r.target_text, mode: 'group', groupIds: r.sentence_audio_ids.filter(Boolean), castApplies: true })
    for (const id of (r.sentence_known_audio_ids || []).filter(Boolean)) checks.push({ row: rid, col: 'sentence_known_audio_ids', id, side: 'known', text: r.known_text, mode: 'group', groupIds: r.sentence_known_audio_ids.filter(Boolean), castApplies: true })
    for (const id of (r.takeg_audio_ids || []).filter(Boolean)) checks.push({ row: rid, col: 'takeg_audio_ids', id, side: 'target', text: r.target_text, mode: 'contained', castApplies: true })
    if (r.explainer_audio_id) checks.push({ row: rid, col: 'explainer_audio_id', id: r.explainer_audio_id, side: null, text: r.explainer_text, mode: 'informational', castApplies: false })
    if (r.note_audio_id) checks.push({ row: rid, col: 'note_audio_id', id: r.note_audio_id, side: null, text: null, mode: 'informational', castApplies: false })
  }

  const uniqueIds = [...new Set(checks.map((c) => c.id))]
  const clipRows = uniqueIds.length
    ? (await db.query('select id, text, voice_id from course_audio where id = any($1)', [uniqueIds])).rows
    : []
  const clips = Object.fromEntries(clipRows.map((c) => [c.id, { text: c.text, voice: bare(c.voice_id) }]))

  // DB-level scoring (fast, no network).
  const findings = []
  // group text-match is per (row,col) not per-id — compute once per group.
  const groupSeen = new Set()
  for (const c of checks) {
    const clip = clips[c.id]
    if (!clip) {
      findings.push({ ...c, kind: 'dangling', detail: 'no course_audio row for this id — genuinely missing' })
      continue
    }
    if (c.castApplies && !cast[c.side].has(clip.voice)) {
      findings.push({ ...c, kind: 'off-cast', detail: `voice ${clip.voice} not in ${c.side} cast` })
    }
    if (c.mode === 'full') {
      if (norm(clip.text) !== norm(c.text)) findings.push({ ...c, kind: 'text-mismatch', detail: `clip="${clip.text}" row="${c.text}"` })
    } else if (c.mode === 'contained') {
      const want = norm(c.text)
      if (!(norm(clip.text) && want.includes(norm(clip.text)))) findings.push({ ...c, kind: 'text-not-contained', detail: `clip="${clip.text}" not within row target_text` })
    } else if (c.mode === 'group') {
      const gkey = c.row + '|' + c.col
      if (groupSeen.has(gkey)) continue
      groupSeen.add(gkey)
      const texts = c.groupIds.map((id) => clips[id]?.text || '')
      const want = norm(c.text)
      const joined = norm(texts.join(' '))
      const contained = texts.every((t) => norm(t) && want.includes(norm(t)))
      if (!(joined === want || contained)) findings.push({ ...c, kind: 'group-text-mismatch', detail: `group texts [${texts.join(' | ')}] vs row target_text` })
    }
    // mode 'informational' — never scored.
  }

  // Production-URL check on every unique id (dedup across columns).
  const idList = uniqueIds.filter((id) => clips[id]) // only bother checking ids that at least resolve in DB
  const served = {}
  const urlResults = await pool(idList, async (id) => ({ id, ...(await fetchExists(id)) }), CONCURRENCY)
  for (const r of urlResults) served[r.id] = r
  for (const id of idList) {
    const s = served[id]
    if (!s.ok || !s.bytes) {
      // find a representative check for reporting context
      const ctx = checks.find((c) => c.id === id)
      findings.push({ ...ctx, kind: 'not-served', detail: `production URL status=${s.status} bytes=${s.bytes || 0}` })
    }
  }
  // ids referenced but with zero course_audio row are already 'dangling' above and skipped from URL check.
  for (const id of uniqueIds) {
    if (!clips[id]) continue // already counted as dangling
  }

  // --- VARIANT RUNS SPLIT ACROSS TWO VOICES (see header) --------------------
  // Not an off-cast clip: both voices are legitimately in the cast, which is
  // exactly why nothing caught this. Measured per track from the whole-turn
  // link each row actually holds.
  const voiceOn = (col) => (r) => {
    const clip = clips[r[col]]
    return clip ? clip.voice : null
  }
  const variantSplits = []
  for (const [track, col] of [['target', 'target_audio_id'], ['known', 'known_audio_id']]) {
    for (const split of splitVariantRuns(rows, voiceOn(col))) {
      variantSplits.push({ ...split, track, column: col })
    }
  }

  const scored = findings.filter((f) => f.mode !== 'informational')
    .concat(VARIANT_RUNS_BLOCKING ? variantSplits.map((v) => ({ row: `s${v.scene}`, col: v.column, kind: 'variant-run-split', detail: v.reason, mode: 'variant' })) : [])
  const informational = findings.filter((f) => f.mode === 'informational')

  const summary = {
    course: COURSE,
    rows: rows.length,
    checks_total: checks.length,
    unique_clip_ids: uniqueIds.length,
    scored_failures: scored.length,
    by_kind: scored.reduce((acc, f) => { acc[f.kind] = (acc[f.kind] || 0) + 1; return acc }, {}),
    informational_count: informational.length,
    variant_run_splits: variantSplits.length,
    variant_runs_blocking: VARIANT_RUNS_BLOCKING,
    verdict: scored.length === 0 ? 'REPAIRED+VERIFIED' : 'FAILED',
  }

  console.log(JSON.stringify(summary, null, 1))

  if (variantSplits.length) {
    console.log(`\nVARIANT RUNS SPLIT ACROSS TWO VOICES: ${variantSplits.length}` +
      (VARIANT_RUNS_BLOCKING ? '  [BLOCKING — --variant-runs-blocking]' : '  [counted separately, does not flip the verdict]'))
    console.log('  This is NOT an off-cast clip. Both voices are in the cast — that is why nothing caught it.')
    console.log("  Tom's ruling, 2026-08-24: a variant drill gives its alternative responses in ONE voice.")
    for (const v of variantSplits) {
      console.log(`  ${v.track} ${v.runId} ${v.speaker}: lines ${v.labels.join(', ')} split across ${v.voices.join(' / ')}`)
      for (const [voice, labels] of Object.entries(v.byVoice)) console.log(`      ${voice}: ${labels.join(', ')}`)
      console.log(`      ${v.reason}`)
    }
  }
  if (scored.length) {
    console.log('\nFAILURES (first 30):')
    for (const f of scored.slice(0, 30)) console.log(`  ${f.row} ${f.col} [${f.kind}] id=${f.id} ${f.detail}`)
  }

  if (JSON_OUT) {
    fs.writeFileSync(JSON_OUT, JSON.stringify({ summary, findings, variantSplits, generated_at: new Date().toISOString() }, null, 1))
    console.log(`\nfull report: ${JSON_OUT}`)
  }

  await db.end()
  process.exit(scored.length === 0 ? 0 : 1)
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1) })
