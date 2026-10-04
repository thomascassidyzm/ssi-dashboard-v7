#!/usr/bin/env node
/**
 * ita-pod1-rerender-timings-2026-10-04.cjs — job #645, follows #629 (english-revoice) and #640
 * (finish-revoice). Those clips were rendered before the render route asked Cartesia for word
 * timestamps (#643), so they carry no word_timings. This re-records each of them IN PLACE
 * (replaceAudioId): same row id, same voice, same text, so no pod link moves and nothing needs
 * repointing. Why in place and not a fresh render: the route is library-first, so asking again for
 * the same text+voice would just link the clip we already have and render nothing.
 *
 * Make-before-break is the route's own: the new object is uploaded and HEADed alive before the row
 * points at it, the old object is retained, and the row keeps a revision (swapClipInPlace) — that is
 * the revert path. The clip list comes from the two maps; the ledger below makes it resumable.
 *
 *   node tools/pods/ita-pod1-rerender-timings-2026-10-04.cjs --dry-run|--render [--limit N] [--ceiling CHARS]
 * Take-G clips (kind G in the finish map) change bytes, so re-run tools/slice-take-g.cjs after.
 */
'use strict'
const path = require('path')
const fs = require('fs')
const os = require('os')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const COURSE = 'ita_for_eng'
const DIR = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/docs/pods')
const MAPS = ['ita-pod1-english-revoice-2026-10-04-map.json', 'ita-pod1-finish-revoice-2026-10-04-map.json']
const LEDGER = path.join(DIR, 'ita-pod1-rerender-timings-2026-10-04-ledger.json')
// PHASE8_URL posts straight to a phase8 /render (needed when the API in front proxies to a phase8 that
// predates #643 — the staging API on :3490 proxies to prod's :3465). Else POPTY_URL's /api/audio/render.
const PHASE8_URL = process.env.PHASE8_URL
const BASE = process.env.POPTY_URL || 'http://localhost:3470'
const WHO = 'job-645-ita-pod1-timings'
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d }
const mode = ['--dry-run', '--render'].find((f) => process.argv.includes(f))
if (!mode) { console.error('say --dry-run or --render'); process.exit(1) }
const LIMIT = Number(arg('--limit', Infinity))
const MIN_LEN = Number(arg('--min-len', 0))
const CEILING = Number(arg('--ceiling', 20000))
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function post (body) {
  for (let i = 0; ; i++) {
    let r
    try {
      const res = await fetch(PHASE8_URL ? `${PHASE8_URL}/render` : `${BASE}/api/audio/render`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-id': WHO }, body: JSON.stringify(PHASE8_URL ? { ...body, requestedBy: WHO } : body) })
      r = { status: res.status, ...(await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) }
    } catch (e) { r = { ok: false, status: 0, error: `fetch: ${e.message} ${(e.cause && e.cause.code) || ''}` } }
    // ECONNREFUSED = never reached Popty, nothing spent. Anything else (incl. a guard refusal) is the answer.
    if (r.status !== 0 || !/ECONNREFUSED/.test(r.error || '') || i >= 12) return r
    await new Promise((res) => setTimeout(res, 15000))
  }
}

async function main () {
  const ids = [...new Set(MAPS.flatMap((m) => Object.values(JSON.parse(fs.readFileSync(path.join(DIR, m), 'utf8')).audio)))]
  const clips = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await sb.from('course_audio').select('id,role,text,voice_id,language,word_timings,course_code').in('id', ids.slice(i, i + 100))
    if (error) throw error
    clips.push(...data)
  }
  const ledger = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : {}
  const todo = clips.filter((c) => c.course_code === COURSE && !c.word_timings && !ledger[c.id] && c.text.length >= MIN_LEN).sort((a, b) => a.text.length - b.text.length)
  console.log(`${clips.length} clips in the maps, ${todo.length} still without word_timings`)
  let spent = 0, rendered = 0, fail = 0, n = 0, would = 0
  for (const c of todo) {
    if (n >= LIMIT) break
    if (mode === '--render' && spent + c.text.length > CEILING) { console.log(`ceiling ${CEILING} reached`); break }
    n++
    const r = await post({ courseCode: COURSE, role: c.role, text: c.text, replaceAudioId: c.id, voiceId: c.voice_id, dryRun: mode === '--dry-run',
      job: '#645', purpose: '#645 Italian pod 1: re-record #629/#640 clips in place with word timings (same voice)' })
    if (!r.ok) { fail++; console.warn('✗', c.id, r.status, r.code || r.error); if (r.status === 402) break; continue }
    spent += r.charsSpent || 0; would += r.wouldSpendChars || 0
    if (mode === '--render') { rendered++; ledger[c.id] = { source: r.source, chars: r.charsSpent, revision: r.revision }; fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 1)) }
  }
  console.log(`${mode}: attempted ${n}, rendered ${rendered}, failed ${fail}, charsSpent ${spent}, wouldSpend ${would}`)
}
main().catch((e) => { console.error('FATAL', e.message || e); process.exit(1) })
