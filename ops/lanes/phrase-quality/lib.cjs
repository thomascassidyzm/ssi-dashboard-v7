// Shared plumbing for the phrase-quality lane (command-surface #415). It holds NO gate logic of its own:
// ZUT comparison is the course builder's normalizeForZUT, and every phrase change is judged by
// tools/phrase-gate/gate-check.cjs (the replay of /api/seed/complete's own gates). Tom 2026-10-11 20:54:
// "no phrases can be changed without them passing the strict popty course-builder gate process".
'use strict'
const fs = require('fs')
const { normalizeForZUT } = require('../../../services/course-builder/lib/text-normalization.cjs')
const { isChinese } = require('../../../services/course-builder/lib/language-config.cjs')

const ENV_FILE = process.env.POPTY_ENV || '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'
function env() {
  const out = {}
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}
let _client = null
function client() {
  if (_client) return _client
  const E = env()
  if (!E.SUPABASE_URL || !E.SUPABASE_SERVICE_KEY) throw new Error(`phrase-quality: SUPABASE_URL / SUPABASE_SERVICE_KEY missing from ${ENV_FILE}`)
  const { createClient } = require('@supabase/supabase-js')
  _client = createClient(E.SUPABASE_URL, E.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  return _client
}
// paged SELECT through the client; there is no write helper here (apply-staged.cjs owns the only writes)
async function selectAll(table, cols, build) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(client().from(table).select(cols)).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

// The course builder's own ZUT key (lane review #420: a private normaliser kept Arabic tashkeel and
// split أريد / أُريد into two groups).
const zutKey = (text, courseCode) => normalizeForZUT(String(text || ''), isChinese(courseCode))

// Production-direction ZUT groups touching a seed window: one normalised KNOWN → more than one TARGET,
// on LEGO / BUILD / USE rows (component rows are exempt on the known side, Tom 2026-07-04).
function zutGroups(rows, courseCode, from, to) {
  const byKnown = new Map()
  for (const r of rows) {
    if (r.role === 'component') continue
    const k = zutKey(r.known_text, courseCode); if (!k) continue
    if (!byKnown.has(k)) byKnown.set(k, [])
    byKnown.get(k).push(r)
  }
  const out = []
  for (const [k, rs] of byKnown) {
    if (!rs.some((r) => r.seed_number >= from && r.seed_number <= to)) continue
    if (new Set(rs.map((r) => zutKey(r.target_text, courseCode))).size > 1)
      out.push({ known: k, rows: rs.map((r) => ({ id: r.id, role: r.role, seed: r.seed_number, target: r.target_text })) })
  }
  return out
}

// Scope: released and beta courses; never Welsh (handwritten N and S, and Welsh production is Aran's,
// r-2026-10-08); never test/template courses. Arabic is ours.
const inScope = (c) => ['released', 'beta'].includes(c.status) && !/cym/.test(c.course_code) && !/^zzz_|_template$/.test(c.course_code)

// Tom's priority order (2026-10-11, #463). Target language in the big 10 (variants alongside their parent;
// Austrian/Swiss German and Cantonese out): (a) every big-10 _for_eng; (b) eng_for_<any known>;
// (c) spa_for_any; then fra, deu, zho, ara, por, kor, jpn, ita _for_any. Returns a tier number, or null
// when the course is not a priority course (the lane never queues it). Welsh never; only inScope courses.
const BIG10 = ['eng', 'fra', 'spa', 'deu', 'zho', 'ara', 'por', 'kor', 'jpn', 'ita']
const PRIORITY_TARGETS = ['spa', 'fra', 'deu', 'zho', 'ara', 'por', 'kor', 'jpn', 'ita']
const priorityTier = (code) => {
  const m = /^([a-z]{3})(?:_([a-z]{2}))?_for_([a-z]{3})$/.exec(code)
  if (!m || /cym/.test(code)) return null
  const [, tgt, variant, known] = m
  if (!BIG10.includes(tgt) || (tgt === 'deu' && ['at', 'ch'].includes(variant)) || tgt === 'yue') return null
  if (known === 'eng') return tgt === 'eng' ? null : 0
  if (tgt === 'eng') return 1
  return 2 + PRIORITY_TARGETS.indexOf(tgt)   // spa 2, fra 3, deu 4, zho 5, ara 6, por 7, kor 8, jpn 9, ita 10
}

// Tom 2026-10-11 20:57: "no LEGO can end up with < 4 USE phrases is the only hard and fast rule".
const USE_FLOOR = 4

module.exports = { client, selectAll, zutKey, zutGroups, inScope, priorityTier, USE_FLOOR }
