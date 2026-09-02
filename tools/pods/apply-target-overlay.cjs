#!/usr/bin/env node
/**
 * apply-target-overlay — write a target-language line onto canonical pod rows that
 * have none, and NOTHING ELSE.
 *
 * WHY THIS IS NOT ingest-canonical-pods.cjs. That tool imports a WALK: it writes the
 * English, the speakers, the scene structure, the walk steps — the canon. Once a walk
 * is in the store THE DATABASE IS CANON and its own header says so, which is why its
 * only re-write door is `--reimport-destructive`. The health walk's 438 English turns
 * are Aran's hand-authored corpus and the exemplar every other themed walk is written
 * against; re-importing to attach Welsh would overwrite them to add a column. So this
 * tool exists to do the additive half and be incapable of the destructive half:
 *
 *   - it writes `target_text` and `target_lang`, and no other column, ever;
 *   - it writes ONLY where `target_text` is currently null — the guard is in the
 *     request filter (`&target_text=is.null`), so the database enforces it rather
 *     than a check this process did a moment earlier and might race;
 *   - it matches rows by the ingest parser's own deterministic scenario id AND
 *     re-asserts `english_text` equality before writing. A row that fails either
 *     test is REFUSED and named. A right Welsh line against the wrong English turn
 *     is worse than a null, so there is no fuzzy matching and no fallback.
 *
 * The overlay data is one JSON file per context in a directory, so authoring can land
 * a context at a time and a restart resumes rather than restarts.
 *
 *   node tools/pods/apply-target-overlay.cjs --dir=docs/sector-pods/health-welsh-438            # dry run
 *   node tools/pods/apply-target-overlay.cjs --dir=... --scenes=1 --execute                     # one context
 *   node tools/pods/apply-target-overlay.cjs --dir=... --execute                                # the lot
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')

const REPO = path.resolve(__dirname, '../..')
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d }
const EXECUTE = process.argv.includes('--execute')
const SCENES = (arg('scenes', '') || '').split(',').filter(Boolean).map(Number)

const URL = () => (process.env.SUPABASE_URL || '').trim()
const KEY = () => (process.env.SUPABASE_SERVICE_KEY || '').trim()
const H = () => ({ apikey: KEY(), Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' })

async function rest (pathname, init = {}) {
  const r = await fetch(`${URL()}/rest/v1/${pathname}`, { ...init, headers: { ...H(), ...(init.headers || {}) } })
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${pathname.slice(0, 80)}: ${(await r.text()).slice(0, 300)}`)
  return r
}

/** Load the authored contexts. A file that does not parse is a named error for that
 *  file alone: the other contexts still land. */
function loadContexts (dir) {
  const full = path.isAbsolute(dir) ? dir : path.join(REPO, dir)
  const files = fs.readdirSync(full).filter(f => f.endsWith('.json')).sort()
  const out = []
  for (const f of files) {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(full, f), 'utf8'))
      if (!SCENES.length || SCENES.includes(c.scene)) out.push({ file: f, ...c })
    } catch (e) { console.log(`   ERROR: ${f} — ${e.message}`); process.exitCode = 1 }
  }
  return out
}

async function main () {
  const dir = arg('dir', '')
  if (!dir) { console.error('--dir=<path to the authored context JSONs> required'); process.exit(1) }
  const slug = arg('slug', 'health')
  const lang = arg('lang', 'cym_n')

  const contexts = loadContexts(dir)
  const turns = contexts.flatMap(c => (c.turns || []).map(t => ({ ...t, scene: c.scene, file: c.file })))
  console.log(`── ${contexts.length} context file(s), ${turns.length} authored turn(s), slug '${slug}', lang '${lang}'`)

  const r = await rest(`canonical_pod_scenarios?pod_slug=eq.${encodeURIComponent(slug)}&select=id,english_text,target_text&limit=5000`)
  const db = await r.json()
  const byId = new Map(db.map(x => [x.id, x]))
  console.log(`   store: ${db.length} rows under '${slug}', ${db.filter(x => x.target_text).length} already carry a target`)

  const writable = []
  const refused = []
  const alreadySet = []
  for (const t of turns) {
    const row = byId.get(t.id)
    if (!row) { refused.push({ id: t.id, why: 'no such row in the store' }); continue }
    if (row.english_text !== t.en) { refused.push({ id: t.id, why: 'english_text does not match the authored known side' }); continue }
    if (!t.cy || !String(t.cy).trim()) { refused.push({ id: t.id, why: 'no target line authored' }); continue }
    if (row.target_text) { alreadySet.push(t.id); continue }
    writable.push(t)
  }

  console.log(`   writable: ${writable.length}   already carried a target (left alone): ${alreadySet.length}   REFUSED: ${refused.length}`)
  for (const x of refused) console.log(`   REFUSED ${x.id} — ${x.why}`)
  for (const t of writable.slice(0, 3)) console.log(`   sample ${t.id}\n      en: ${t.en.slice(0, 110)}\n      cy: ${t.cy.slice(0, 110)}`)

  if (!EXECUTE) { console.log(`\n   DRY RUN — nothing written. Add --execute.`); return }

  let done = 0
  for (const t of writable) {
    // The null guard lives in the filter, so the database refuses to overwrite a
    // target somebody else wrote between the read above and this write.
    const res = await rest(`canonical_pod_scenarios?id=eq.${encodeURIComponent(t.id)}&target_text=is.null`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ target_text: t.cy, target_lang: lang })
    })
    const back = await res.json()
    if (!back.length) { console.log(`   NOT WRITTEN ${t.id} — the row acquired a target since the read`); continue }
    done += 1
  }
  console.log(`\n   WROTE ${done} target line(s).`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
