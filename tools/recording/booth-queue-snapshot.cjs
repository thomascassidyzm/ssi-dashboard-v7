#!/usr/bin/env node
/**
 * booth-queue-snapshot.cjs — WHAT EACH BOOTH VOICE IS SERVED, read from the running Popty API, so a
 * change to the booth queue can be proved not to have moved anyone else's (job #587: Frisian joined
 * the LEGO and phrase queues with the hard requirement that no Welsh recorder's queue moves).
 *
 * HTTP only: it asks production Popty (GET /api/recording/voice/:id …) exactly what the booth asks.
 * No database access. Per voice it keeps:
 *   - the home summary's tracks: key, total, and each batch's {n, from, to, total} (recorded
 *     counts are dropped — a recorder working between two snapshots must not read as a diff);
 *   - the full queue with recorded lines (?includeRecorded=1): line count per (kind, course) and
 *     the first/last 20 line ids of each, plus a hash of every id in order;
 *   - for each phrase pass, the first and last batch opened (?track=phrase.<p>&batch=<n>): their
 *     line ids (first/last 20) and a hash of all of them.
 *
 *   node tools/recording/booth-queue-snapshot.cjs --out before.json human_dan_cym_s human_eleri_cym_s …
 *   node tools/recording/booth-queue-snapshot.cjs --compare before.json after.json
 *
 * --compare exits 1 and prints every difference when the two snapshots disagree.
 */
'use strict'
const fs = require('fs')
const crypto = require('crypto')

const BASE = process.env.POPTY_API || 'http://localhost:3470'
const hash = (ids) => crypto.createHash('sha256').update(ids.join('\n')).digest('hex').slice(0, 16)
const ends = (ids) => ({ count: ids.length, first20: ids.slice(0, 20), last20: ids.slice(-20), hash: hash(ids) })

async function get(path) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(BASE + path)
    if (res.ok) return res.json()
    if (attempt >= 3 || res.status !== 503) throw new Error(`${path} → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    await new Promise((r) => setTimeout(r, 60000))
  }
}

async function snapshotVoice(voiceId) {
  const v = encodeURIComponent(voiceId)
  const summary = await get(`/api/recording/voice/${v}/summary`)
  const tracks = (summary.tracks || []).map((t) => ({
    key: t.key, kind: t.kind, courseCode: t.courseCode, role: t.role || null, total: t.total,
    batches: (t.batches || []).map((b) => ({ n: b.n, from: b.from, to: b.to, total: b.total, courseCode: b.courseCode || null, firstSeed: b.firstSeed ?? null, lastSeed: b.lastSeed ?? null })),
  }))
  const full = await get(`/api/recording/voice/${v}?includeRecorded=1`)
  const groups = {}
  for (const l of full.lines || []) {
    // Phrase lines of the CURRENT batch move with recording progress; they are covered by the
    // opened batches below, so the full-queue view leaves them out.
    if (l.kind === 'phrase') continue
    const k = `${l.kind}|${l.courseCode}`
    ;(groups[k] = groups[k] || []).push(l.id)
  }
  const queue = Object.fromEntries(Object.entries(groups).sort().map(([k, ids]) => [k, ends(ids)]))
  const phraseBatches = {}
  for (const t of tracks.filter((x) => x.kind === 'phrase')) {
    const ns = [...new Set([1, t.batches.length].filter((n) => n >= 1))]
    for (const n of ns) {
      const got = await get(`/api/recording/voice/${v}?includeRecorded=1&track=${encodeURIComponent(t.key)}&batch=${n}`)
      phraseBatches[`${t.key}#${n}`] = ends((got.lines || []).map((l) => l.id))
    }
  }
  return { voiceId, total: summary.total, tracks, queue, phraseBatches }
}

function compare(a, b) {
  const diffs = []
  const walk = (x, y, path) => {
    if (JSON.stringify(x) === JSON.stringify(y)) return
    if (x && y && typeof x === 'object' && typeof y === 'object' && !Array.isArray(x)) {
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], `${path}.${k}`)
      return
    }
    diffs.push(`${path}: ${JSON.stringify(x)?.slice(0, 300)} → ${JSON.stringify(y)?.slice(0, 300)}`)
  }
  for (const voice of new Set([...Object.keys(a.voices), ...Object.keys(b.voices)])) walk(a.voices[voice], b.voices[voice], voice)
  return diffs
}

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--compare') {
    const [a, b] = [args[1], args[2]].map((f) => JSON.parse(fs.readFileSync(f, 'utf8')))
    const diffs = compare(a, b)
    console.log(diffs.length ? diffs.join('\n') : `IDENTICAL: ${Object.keys(a.voices).length} voices`)
    process.exit(diffs.length ? 1 : 0)
  }
  const at = args.indexOf('--out')
  if (at < 0 || !args[at + 1]) throw new Error('usage: --out <file> <voiceId>… | --compare <a> <b>')
  const out = args[at + 1]
  const voices = args.filter((x, i) => i !== at && i !== at + 1)
  const snap = { takenAt: new Date().toISOString(), base: BASE, voices: {} }
  for (const voiceId of voices) {
    const t0 = Date.now()
    snap.voices[voiceId] = await snapshotVoice(voiceId)
    console.log(`${voiceId}: total ${snap.voices[voiceId].total} (${Date.now() - t0} ms)`)
  }
  fs.writeFileSync(out, JSON.stringify(snap, null, 1))
  console.log(`wrote ${out}`)
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(2) })
module.exports = { compare }
