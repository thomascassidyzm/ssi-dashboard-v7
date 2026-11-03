#!/usr/bin/env node
'use strict'
/**
 * aran-clone-fill-probe.cjs — job #592 (Aran said YES 2026-11-03 11:18Z to #590's pace plan).
 *
 * The PROBE before the nv2/sv2 English stand-in fill (tools/audio/aran-clone-english-fill.cjs) goes bulk. The pace is a
 * post-render tempo by belt (services/shared/aran-clone-standin.cjs: seeds 1-19 x1.0, 20-79 x1.1, 80+ x1.25) and had only
 * been tried on trial samples. This proves it on REAL course renders before ~21,700 more are made:
 *
 *   pick  [--n 50]   choose N plan entries spread evenly across the three pace bands (and both courses) → probe.json,
 *                    a list of the fill tool's entry keys; render them with
 *                    `aran-clone-english-fill.cjs render --only <probe.json> [--dry]` (same route, same log).
 *   paces [--n 2]    per band, N lines as ONE trial take stored at 1.0/1.1/1.25 (trial lane, paces) → the exact
 *                    duration ratio of the same performance at each tempo. Separate takes cannot show it: the clone
 *                    wanders more take to take than the belt steps (#590 measured +44%).
 *   check            for every REAL probe clip in the render log: its course_audio row (agent-db clipsById: duration_ms,
 *                    word_timings), its bytes (Popty's stream route), the speech span ffmpeg silencedetect finds, and
 *                    whether the stored word timings land on it (last word end vs speech end). Writes check.json.
 *
 * READ-ONLY on the database (agent-db, the agent login). Spends only through POST /api/audio/render (paces: one trial
 * take per line). Files: the fill tool's dir (ARAN_FILL_DIR), probe-592/.
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawnSync } = require('child_process')
const fill = require('./aran-clone-english-fill.cjs')
const { standInSpeed } = require('../../services/shared/aran-clone-standin.cjs')

const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const DIR = process.env.ARAN_FILL_DIR || path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/tools/audio/aran-clone-english-fill')
const PDIR = path.join(DIR, 'probe-592')
const AGENT = 'aran-clone-fill-probe (job #592)'
const TEMPOS = [1, 1.1, 1.25]
const arg = (name, dflt = null) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt }
const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])

/** The tempo a plan entry is rendered at — the render route's own rule, from the entry's earliest slot. */
const entryTempo = (e) => standInSpeed(fill.entrySeedPosition(e))

/** N entries spread evenly across the tempo bands, each band's share alternating the two courses, pure. */
function pickSpread(entries, n = 50) {
  const per = TEMPOS.map((_, i) => Math.floor(n / TEMPOS.length) + (i < n % TEMPOS.length ? 1 : 0))
  const out = []
  TEMPOS.forEach((t, bi) => {
    const band = entries.filter((e) => entryTempo(e) === t)
    const byCourse = fill.COURSES.map((c) => band.filter((e) => e.courseCode === c)).filter((xs) => xs.length)
    for (let k = 0; k < per[bi] && byCourse.length; k += 1) {
      const xs = byCourse[k % byCourse.length]
      const slot = Math.floor(k / byCourse.length), of = Math.ceil(per[bi] / byCourse.length)
      const e = xs[Math.min(xs.length - 1, Math.floor(((slot + 0.5) * xs.length) / of))]
      if (e && !out.includes(e)) out.push(e)
    }
  })
  return out
}

/** Speech span of an audio file: first and last non-silent instants (ffmpeg silencedetect, -40 dB, 120 ms). */
function speechSpan(file) {
  // ffmpeg reports on stderr; spawnSync hands it back (execFileSync returns stdout only).
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=noise=-40dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8' })
  return parseSilence(String(r.stderr || ''))
}
function parseSilence(log) {
  const dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(log)
  const total = dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : null
  const ev = []
  for (const m of log.matchAll(/silence_(start|end): ([\d.]+)/g)) ev.push([m[1], Number(m[2])])
  let start = 0, end = total
  if (ev.length && ev[0][0] === 'start' && ev[0][1] < 0.02) { const e = ev.find((x) => x[0] === 'end'); if (e) start = e[1] }
  const last = ev[ev.length - 1]
  if (last && last[0] === 'start') end = last[1]
  else if (last && last[0] === 'end' && total != null && Math.abs(last[1] - total) < 0.03) { const s = [...ev].reverse().find((x) => x[0] === 'start'); if (s) end = s[1] }
  return { total, start, end }
}
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null }

async function main() {
  const mode = process.argv[2]
  fs.mkdirSync(PDIR, { recursive: true })
  const plan = JSON.parse(fs.readFileSync(path.join(DIR, 'plan.json'), 'utf8'))
  const probeFile = path.join(PDIR, 'probe.json')
  if (mode === 'pick') {
    const picked = pickSpread(plan.entries, Number(arg('--n', '50')) || 50)
    fs.writeFileSync(probeFile, JSON.stringify(picked.map((e) => fill.entryKey(e.courseCode, e.text))))
    const by = {}; for (const e of picked) { const k = `${entryTempo(e)} ${e.courseCode}`; by[k] = (by[k] || 0) + 1 }
    console.log(JSON.stringify({ probeFile, picked: picked.length, chars: picked.reduce((n, e) => n + e.chars, 0), byTempoCourse: by }, null, 1))
    return
  }
  const keys = new Set(JSON.parse(fs.readFileSync(probeFile, 'utf8')))
  const probe = plan.entries.filter((e) => keys.has(fill.entryKey(e.courseCode, e.text)))
  if (mode === 'paces') {
    const n = Number(arg('--n', '2')) || 2
    const log = path.join(PDIR, 'paces.jsonl')
    for (const t of TEMPOS) {
      for (const e of probe.filter((x) => entryTempo(x) === t).slice(0, n)) {
        const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT },
          body: JSON.stringify({ courseCode: e.courseCode, role: 'known', language: 'eng', text: e.text, trial: true, paces: TEMPOS, job: '#592', startedBy: 'Aran (job #592 brief: probe the pace bands)', purpose: 'job #592 probe: one take at 1.0/1.1/1.25 to measure the tempo ratio', dryRun: process.argv.includes('--dry') }), signal: AbortSignal.timeout(300000) })
        const body = await r.json().catch(() => ({}))
        fs.appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), band: t, courseCode: e.courseCode, text: e.text, status: r.status, body }) + '\n')
        const takes = (body.takes || []).map((x) => `${x.pace}:${x.durationMs}`).join(' ')
        console.log(t, r.status, body.code || body.source || '', takes, e.text)
        if (!r.ok) return
      }
    }
    return
  }
  if (mode === 'check') {
    const renders = readJsonl(path.join(DIR, 'render.jsonl')).filter((r) => !r.dry && keys.has(fill.entryKey(r.courseCode, r.text)))
    const byKey = new Map(probe.map((e) => [fill.entryKey(e.courseCode, e.text), e]))
    const got = renders.filter((r) => r.status >= 200 && r.status < 300 && r.body && r.body.audioId)
    const db = require('../../services/shared/agent-db.cjs')
    const pg = await db.connect()
    let rows
    try { rows = await db.clipMap(pg, got.map((r) => r.body.audioId), { cols: 'id::text AS id, voice_id, text, s3_key, duration_ms, word_timings' }) } finally { await pg.end() }
    const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'probe592-'))
    const clips = []
    for (const r of got) {
      const e = byKey.get(fill.entryKey(r.courseCode, r.text)); const row = rows.get(r.body.audioId) || {}
      const f = path.join(PDIR, 'clips', `${r.body.audioId}.mp3`); fs.mkdirSync(path.dirname(f), { recursive: true })
      if (!fs.existsSync(f)) { const a = await fetch(`${POPTY}/api/production/audio/${r.body.audioId}/stream`); if (a.ok) fs.writeFileSync(f, Buffer.from(await a.arrayBuffer())) }
      const span = fs.existsSync(f) ? speechSpan(f) : null
      const wt = row.word_timings || null
      const lastEnd = wt && wt.ends && wt.ends.length ? wt.ends[wt.ends.length - 1] : null
      const firstStart = wt && wt.starts && wt.starts.length ? wt.starts[0] : null
      clips.push({ audioId: r.body.audioId, courseCode: r.courseCode, text: r.text, chars: r.text.length, seedPosition: fill.entrySeedPosition(e), tempo: entryTempo(e),
        source: r.body.source, answeredTempo: r.body.tempo || 1, voiceId: row.voice_id, durationMs: row.duration_ms, file: f,
        speechStart: span && span.start, speechEnd: span && span.end, total: span && span.total, words: wt ? wt.words.length : 0, firstStart, lastEnd,
        endGap: lastEnd != null && span ? Math.round((span.end - lastEnd) * 1000) / 1000 : null })
    }
    fs.rmSync(tmp, { recursive: true, force: true })
    const bands = {}
    for (const t of TEMPOS) {
      const cs = clips.filter((c) => c.tempo === t && c.source === 'rendered')
      bands[t] = { rendered: cs.length, library: clips.filter((c) => c.tempo === t && c.source === 'library').length, wrongTempo: cs.filter((c) => c.answeredTempo !== t).length,
        noTimings: cs.filter((c) => !c.words).length, medianSecPerChar: median(cs.map((c) => (c.speechEnd - c.speechStart) / c.chars)),
        medianEndGap: median(cs.filter((c) => c.endGap != null).map((c) => c.endGap)), worstEndGap: cs.reduce((m, c) => (c.endGap != null && Math.abs(c.endGap) > Math.abs(m) ? c.endGap : m), 0) }
    }
    const refused = renders.filter((r) => !(r.status >= 200 && r.status < 300)).map((r) => ({ courseCode: r.courseCode, text: r.text, status: r.status, code: r.body && r.body.code }))
    const out = { checkedAt: new Date().toISOString(), probe: probe.length, answered: renders.length, refused, bands, clips }
    fs.writeFileSync(path.join(PDIR, 'check.json'), JSON.stringify(out, null, 1))
    console.log(JSON.stringify({ probe: probe.length, answered: renders.length, refused: refused.length, bands }, null, 1))
    return
  }
  console.error('usage: pick [--n 50] | paces [--n 2] [--dry] | check'); process.exit(1)
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1) })
module.exports = { pickSpread, parseSilence, entryTempo }
