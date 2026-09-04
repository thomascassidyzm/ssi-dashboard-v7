#!/usr/bin/env node
/**
 * DRAFT CASTING — fill every EMPTY phrase slot from the Cartesia catalogue.
 *
 * Tom, 2026-09-04: "can you populate a draft casting, based on Cartesia where
 * we have it - and cast all language voices into each language so they can then
 * be selected from there … cast it as a pool if there are more than one male and
 * one female … I'll make taste calls when I go through the whole thing tomorrow."
 *
 * WHAT THIS IS NOT: it is not a recommendation. No voice is chosen for being
 * better. Per language and gender the EMPTY ranks are filled in order — rank 0,
 * then rank 1 — from that language's Cartesia candidate list in the list's own
 * existing order, which registry.cartesiaCandidates() defines as estate-owned
 * clones first and then Cartesia's published order. The ordering is the
 * vendor's, not this script's.
 *
 * THE RULES IT OBEYS
 *  - Every write goes through PUT /api/voicelab/languages/:language/slot, never
 *    SQL: that endpoint is where the consent gate, the human-voice guard and the
 *    cym/bre/pdc ruling-level backstop live. A refusal is reported, never
 *    worked around.
 *  - A slot that is ALREADY FILLED is left exactly as it is. Populating a draft
 *    never displaces a decision (Tom's clone on English male primary, 2026-09-03).
 *  - Cartesia only. A language with no Cartesia voice is left alone and reported.
 *  - A voice whose gender Cartesia does not state cannot fill a gendered slot,
 *    so it is skipped and counted. All six of this estate's own Cartesia clones
 *    are in that position today.
 *  - RENDERS NOTHING, SPENDS NOTHING: one catalogue read (free) and HTTP calls
 *    to our own API.
 *
 * USAGE
 *   DRY_RUN=1 POPTY_ADMIN_TOKEN=… node tools/voice/draft-cast-2026-09-04.cjs
 *   DRY_RUN=0 POPTY_ADMIN_TOKEN=… node tools/voice/draft-cast-2026-09-04.cjs
 *   …optionally ONLY=ita to restrict to one language (the probe).
 *
 * Writes tools/voice/draft-cast-2026-09-04-{dryrun,applied}-log.json.
 * Undo: tools/voice/draft-cast-2026-09-04-undo.cjs
 */
const fs = require('fs')
const path = require('path')
const policy = require('../../services/shared/tts-provider-policy.cjs')

const API = process.env.POPTY_API || 'http://localhost:3470'
const TOKEN = process.env.POPTY_ADMIN_TOKEN
const DRY_RUN = process.env.DRY_RUN !== '0'
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null
const NOTES = 'draft casting 2026-09-04 — mechanical fill from the Cartesia catalogue in vendor order, no taste applied'
const CARTESIA_API_VERSION = '2025-04-16'

function envFile () {
  for (const p of ['/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env', path.join(__dirname, '..', '..', '.env')]) {
    if (fs.existsSync(p)) return p
  }
  return null
}
if (!process.env.CARTESIA_API_KEY) {
  const f = envFile()
  if (f) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = /^([A-Z_]+)=(.*)$/.exec(line)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
  }
}

async function catalogue () {
  const key = process.env.CARTESIA_API_KEY
  if (!key) throw new Error('no CARTESIA_API_KEY')
  const byLang = {}
  let url = 'https://api.cartesia.ai/voices/?limit=100'
  let pages = 0
  while (url && pages < 10) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}`, 'Cartesia-Version': CARTESIA_API_VERSION } })
    if (!res.ok) throw new Error(`cartesia /voices ${res.status}`)
    const body = await res.json()
    for (const v of body.data || []) {
      const gender = v.gender === 'feminine' ? 'f' : v.gender === 'masculine' ? 'm' : null
      ;(byLang[v.language] = byLang[v.language] || []).push({ id: v.id, name: v.name, gender, owner: v.is_owner === true })
    }
    pages += 1
    url = body.has_more && body.next_page
      ? `https://api.cartesia.ai/voices/?limit=100&starting_after=${encodeURIComponent(body.next_page)}`
      : null
  }
  return byLang
}

async function screen () {
  const res = await fetch(`${API}/api/voicelab/languages`, { headers: { Authorization: `Bearer ${TOKEN}` } })
  if (!res.ok) throw new Error(`GET /api/voicelab/languages ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

/** The empty (language, gender, rank) slots and the voice each would take. */
function plan (languages, cat) {
  const rows = []
  const uncovered = []
  for (const L of languages) {
    if (ONLY && !ONLY.includes(L.code)) continue
    const iso1 = policy.toCartesiaLangCode(L.baseCode || L.code)
    // Estate-owned clones first, then the vendor's own order — the same sort
    // registry.cartesiaCandidates() applies, and Array#sort is stable.
    const all = (cat[iso1] || []).slice().sort((a, b) => (a.owner ? 0 : 1) - (b.owner ? 0 : 1))
    const ungendered = all.filter((v) => !v.gender)
    const cast = new Set()
    for (const g of ['m', 'f']) for (const s of (L.slots?.[g] || [])) if (s.filled) cast.add(s.voiceId)
    let planned = 0
    for (const g of ['m', 'f']) {
      const genderPool = all.filter((v) => v.gender === g)
      const pool = genderPool.filter((v) => !cast.has(`cartesia_${v.id}`))
      let i = 0
      for (const s of (L.slots?.[g] || [])) {
        if (s.filled || i >= pool.length) continue
        const v = pool[i++]
        rows.push({
          language: L.code, slot: 'phrase', gender: g, rank: s.rank,
          voiceId: `cartesia_${v.id}`, voiceName: v.name,
          dialectOf: L.dialectOf || null, poolSize: genderPool.length,
        })
        planned += 1
      }
    }
    if (!planned) {
      uncovered.push({
        language: L.code, human: L.human, cartesiaCovers: L.cartesiaCovers,
        pool: { m: all.filter((v) => v.gender === 'm').length, f: all.filter((v) => v.gender === 'f').length, ungendered: ungendered.length },
        reason: L.human ? 'human-voiced language — synthesis is never cast into it'
          : all.length === 0 ? 'Cartesia publishes no voice for this language'
            : 'every slot Cartesia could fill is already cast',
      })
    }
  }
  return { rows, uncovered }
}

async function main () {
  if (!TOKEN) throw new Error('POPTY_ADMIN_TOKEN is required — this script never writes SQL')
  const [cat, s] = await Promise.all([catalogue(), screen()])
  const { rows, uncovered } = plan(s.languages, cat)
  console.log(`${DRY_RUN ? 'DRY RUN' : 'APPLY'}: ${rows.length} empty slot(s) to fill across ${new Set(rows.map((r) => r.language)).size} language(s); ${uncovered.length} language(s) with nothing to do`)

  const applied = []
  const refused = []
  for (const r of rows) {
    if (DRY_RUN) { applied.push({ ...r, dryRun: true }); continue }
    const res = await fetch(`${API}/api/voicelab/languages/${encodeURIComponent(r.language)}/slot`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot: 'phrase', gender: r.gender, rank: r.rank, voiceId: r.voiceId, notes: NOTES }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      applied.push({ ...r, voiceId: body.voiceId || r.voiceId, skippedCourses: body.skippedTotal || 0, timestamp: new Date().toISOString() })
      console.log(`  cast ${r.language}/${r.gender}/rank${r.rank} = ${r.voiceName}`)
    } else {
      refused.push({ ...r, status: res.status, code: body.code || null, error: body.error || null, timestamp: new Date().toISOString() })
      console.log(`  REFUSED ${r.language}/${r.gender}/rank${r.rank} [${res.status} ${body.code || ''}] ${String(body.error || '').slice(0, 120)}`)
    }
  }

  const out = {
    run: 'draft-cast-2026-09-04',
    dryRun: DRY_RUN,
    only: ONLY,
    notes: NOTES,
    generatedAt: new Date().toISOString(),
    counts: { planned: rows.length, applied: applied.length, refused: refused.length, uncovered: uncovered.length },
    applied,
    refused,
    uncovered,
  }
  const file = path.join(__dirname, `draft-cast-2026-09-04-${DRY_RUN ? 'dryrun' : 'applied'}-log.json`)
  fs.writeFileSync(file, JSON.stringify(out, null, 1))
  console.log(`log → ${file}`)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
