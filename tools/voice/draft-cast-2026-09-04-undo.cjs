#!/usr/bin/env node
/**
 * UNDO the 2026-09-04 draft casting, in one move.
 *
 * Reads tools/voice/draft-cast-2026-09-04-applied-log.json and clears exactly
 * the slots that run wrote, through DELETE /api/voicelab/languages/:language/slot
 * — never SQL.
 *
 * PER-ROW BEFORE-STATE ASSERTION: a slot is cleared ONLY if it still holds the
 * voice this run put there. If Tom has since made a taste call in that slot, the
 * row is SKIPPED and said out loud. This script must never clear a decision.
 *
 * IT LEAVES THE `voices` ROWS ALONE. Casting an unregistered Cartesia catalogue
 * voice registers it in `voices` first, and that registration is deliberately
 * not undone: voice_language_roles carries a foreign key to it, so deleting a
 * voice row would CASCADE into any slot anyone has cast since — including Tom's
 * own. A stray registered catalogue voice is inert; a cascade is not reversible.
 *
 * USAGE
 *   DRY_RUN=1 POPTY_ADMIN_TOKEN=… node tools/voice/draft-cast-2026-09-04-undo.cjs
 *   DRY_RUN=0 POPTY_ADMIN_TOKEN=… node tools/voice/draft-cast-2026-09-04-undo.cjs
 */
const fs = require('fs')
const path = require('path')

const API = process.env.POPTY_API || 'http://localhost:3470'
const TOKEN = process.env.POPTY_ADMIN_TOKEN
const DRY_RUN = process.env.DRY_RUN !== '0'
const LOG = path.join(__dirname, 'draft-cast-2026-09-04-applied-log.json')

async function main () {
  if (!TOKEN) throw new Error('POPTY_ADMIN_TOKEN is required')
  const log = JSON.parse(fs.readFileSync(LOG, 'utf8'))
  const rows = (log.applied || []).filter((r) => !r.dryRun)
  if (!rows.length) { console.log('nothing applied in that log — nothing to undo'); return }

  const res = await fetch(`${API}/api/voicelab/languages`, { headers: { Authorization: `Bearer ${TOKEN}` } })
  if (!res.ok) throw new Error(`GET /api/voicelab/languages ${res.status}`)
  const screen = await res.json()
  const held = new Map()
  for (const L of screen.languages) {
    for (const g of ['m', 'f']) {
      for (const s of (L.slots?.[g] || [])) held.set(`${L.code}|${g}|${s.rank}`, s.filled ? s.voiceId : null)
    }
  }

  let cleared = 0; let skipped = 0
  for (const r of rows) {
    const key = `${r.language}|${r.gender}|${r.rank}`
    const now = held.get(key)
    if (now !== r.voiceId) {
      skipped += 1
      console.log(`  SKIP ${key} — holds ${now || '(empty)'}, not the voice this run wrote (${r.voiceId}). Left alone.`)
      continue
    }
    if (DRY_RUN) { cleared += 1; console.log(`  would clear ${key} (${r.voiceName})`); continue }
    const q = `slot=phrase&gender=${r.gender}&rank=${r.rank}`
    const del = await fetch(`${API}/api/voicelab/languages/${encodeURIComponent(r.language)}/slot?${q}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${TOKEN}` },
    })
    if (del.ok) { cleared += 1; console.log(`  cleared ${key} (${r.voiceName})`) }
    else { skipped += 1; console.log(`  FAILED ${key} — ${del.status} ${(await del.text()).slice(0, 150)}`) }
  }
  console.log(`${DRY_RUN ? 'DRY RUN' : 'DONE'}: ${cleared} cleared, ${skipped} skipped of ${rows.length}`)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
