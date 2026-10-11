// Shared READ-ONLY Supabase access for the phrase-quality lane (command-surface #415).
// No dependencies: reads the shared checkout's .env (worktrees have none) and only ever SELECTs.
'use strict'
const fs = require('fs')

const ENV_FILE = process.env.POPTY_ENV || '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'
function env() {
  const out = {}
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}
const E = env()
const URL_ = E.SUPABASE_URL, KEY = E.SUPABASE_SERVICE_KEY
if (!URL_ || !KEY) throw new Error(`phrase-quality: SUPABASE_URL / SUPABASE_SERVICE_KEY missing from ${ENV_FILE}`)

// GET only, paged by Range. There is deliberately no write helper in this file.
async function select(table, query) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${URL_}/rest/v1/${table}?${query}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' },
    })
    if (!r.ok) throw new Error(`${table}: HTTP ${r.status} ${await r.text()}`)
    const page = await r.json()
    rows.push(...page)
    if (page.length < 1000) return rows
  }
}

// ZUT comparison form: lowercase, bookend punctuation off, whitespace collapsed, diacritics kept
// out only for the comparison (the manual: "diacritics stripped only for ZUT comparison").
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/^[\s¿¡"'«»“”.,!?;:…-]+|[\s"'«»“”.,!?;:…-]+$/g, '').replace(/\s+/g, ' ').trim()

// The lane's scope rule, in one place: live-ish courses only, and NEVER Welsh — Welsh course
// production is Aran's (ruling r-2026-10-08-aran-rules-only-on-arabic-script). Arabic IS ours.
const inScope = (c) => ['released', 'beta'].includes(c.status) && !/cym/.test(c.course_code) && !/^zzz_|_template$/.test(c.course_code)

module.exports = { select, norm, inScope }
