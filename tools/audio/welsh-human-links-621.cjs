#!/usr/bin/env node
/**
 * Job #621 (Aran's Welsh relaunch asks 3 and 4, approved by Tom 2026-10-13). Links EXISTING human takes into EMPTY slots of
 * live cym_n_for_eng, same text only. Nothing is rendered, nothing filled is ever touched, no clip is deleted.
 *
 *   --item catrin   target1_audio_id ← Catrin. Aran confirmed the old North voice 1 IS Catrin, so her takes are the
 *                   cym_n_for_eng target1 human clips voiced `human_catrinlliar_cym_n` and `legacy_import`
 *                   (never the `human_aran_*` pod rows that also sit under target1).
 *   --item aran     known_audio_id ← Aran's English: the known/eng human clips voiced `human_aran_cym_n` and `legacy_import`
 *                   in cym_n_for_eng, then cym_s_for_eng (the old courses' English is Aran's, one shared recording set). These are the English slots #606 emptied
 *                   of Tom-006; a human take of the same text fills them.
 *
 *   node tools/audio/welsh-human-links-621.cjs --item catrin plan            write the ledger (backup of every before-state)
 *   node tools/audio/welsh-human-links-621.cjs --item catrin apply [--limit N] [--apply]
 *   node tools/audio/welsh-human-links-621.cjs --item catrin undo  [--limit N] [--apply]
 *   --no-bump skips the content_version bump (an apply+undo test slice that leaves no net change)
 *
 * Every planned move passes resolve-voice assertPointer (the #609 human-take guard + Welsh Tom-clone refusal + cast check).
 * Writes are one UPDATE per chunk on the direct connection (the REST role's 8 s cap cancels these, #606), each row asserting
 * the slot still holds its before-state (NULL on apply, the linked clip on undo), so a slot #606 or anyone else changed in the
 * meantime is skipped and counted, never overwritten. The DB trigger human_take_lock is the second layer. Ledger:
 * ops/welsh-human-links-621/<item>-ledger.csv (committed). One content_version patch bump per course per applied run.
 */
const fs = require('fs'), path = require('path')
for (const p of [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql']) if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break }
for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env']) if (fs.existsSync(p) && !process.env.SUPABASE_URL) { require('dotenv').config({ path: p, quiet: true }); break }
const { normalizeForDb } = require('../../services/shared/text-normalize.cjs')
const COURSE = 'cym_n_for_eng'
const TABLES = ['course_seeds', 'course_legos', 'course_practice_phrases']
const ITEMS = {
  catrin: { col: 'target1_audio_id', textCol: 'target_text', role: 'target1', language: 'cym', voices: ['human_catrinlliar_cym_n', 'legacy_import'], courses: ['cym_n_for_eng'] },
  // The old South course's English is the same narrator: 4,366 of the 4,640 texts both old courses hold are the SAME s3 file
  // (4,617 within 30 ms), so its English-only lines are Aran's too. North clips are preferred; South fills what North lacks.
  aran: { col: 'known_audio_id', textCol: 'known_text', role: 'known', language: 'eng', voices: ['human_aran_cym_n', 'legacy_import'], courses: ['cym_n_for_eng', 'cym_s_for_eng'] },
}
const DIR = path.join(__dirname, '../../ops/welsh-human-links-621')
const ledgerPath = (item) => path.join(DIR, `${item}-ledger.csv`)
// #606 owns these: the 21 cym_n_for_eng slots it restored from Tom-006 (census /d/3dc8c804). Never touched here.
const CENSUS = '/home/tomcassidy/ssi-evidence/ssi-dashboard-v7/609/census-slots.csv'

/** Same text: Popty's normalizeForDb, with curly apostrophes folded to straight and whitespace runs collapsed (seeds are
 *  stored with ’, takes with '). Nothing else is loosened. */
const sameTextKey = (t) => normalizeForDb(String(t || '').replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' '))

const HEAD = ['course_code', 'tbl', 'pk', 'col', 'from', 'to', 'clip_voice', 'key']
const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') q = false; else cell += c; continue }
    if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = '' } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [h, ...rest] = rows
  return rest.filter((r) => r.length === h.length).map((r) => Object.fromEntries(r.map((v, i) => [h[i], v])))
}
const readLedger = (item) => parseCsv(fs.readFileSync(ledgerPath(item), 'utf8'))

/** Pick one clip per normalised text: an explicitly-voiced take over a legacy one, then the newest. Pure. */
function pickClips(clips, voices, courses = []) {
  const rank = (c) => voices.indexOf(c.voice_id) + voices.length * Math.max(0, courses.indexOf(c.course_code))
  const best = new Map()
  for (const c of clips) {
    const k = sameTextKey(c.text)
    if (!k) continue
    const cur = best.get(k)
    if (!cur || rank(c) < rank(cur) || (rank(c) === rank(cur) && String(c.created_at) > String(cur.created_at))) best.set(k, c)
  }
  return best
}

/** Empty slots whose text has a take. Pure. `owned` = "tbl:pk:col" keys another job owns. */
function planMoves({ slots, best, col, owned = new Set() }) {
  const moves = [], misses = []
  for (const s of slots) {
    if (s.current != null) continue
    if (owned.has(`${s.tbl}:${s.pk}:${col}`)) continue
    const k = sameTextKey(s.text)
    const clip = k && best.get(k)
    if (!clip) { misses.push(s); continue }
    moves.push({ course_code: COURSE, tbl: s.tbl, pk: s.pk, col, from: '', to: clip.id, clip_voice: `${clip.voice_id}@${clip.course_code || COURSE}`, key: k })
  }
  return { moves, misses }
}

async function pgClient() {
  const { Client } = require('pg')
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); await pg.query('set statement_timeout=0')
  return pg
}

async function plan(item) {
  const cfg = ITEMS[item], pg = await pgClient()
  const { rows: clips } = await pg.query(
    `select id::text, text, voice_id, origin, created_at, course_code from course_audio where course_code = any($1) and role=$2 and language=$3 and voice_id = any($4) and (origin='human' or voice_id ~* '^human_')`,
    [cfg.courses, cfg.role, cfg.language, cfg.voices])
  const slots = []
  for (const tbl of TABLES) {
    const { rows } = await pg.query(`select id::text pk, ${cfg.textCol} as text, ${cfg.col}::text as current from ${tbl} where course_code=$1 and ${cfg.col} is null`, [COURSE])
    for (const r of rows) slots.push({ tbl, ...r })
  }
  await pg.end()
  const owned = new Set()
  if (fs.existsSync(CENSUS)) for (const r of parseCsv(fs.readFileSync(CENSUS, 'utf8'))) if (r.course_code === COURSE) owned.add(`${r.table_name}:${r.primary_key}:${r.col}`)
  const best = pickClips(clips, cfg.voices, cfg.courses)
  const { moves, misses } = planMoves({ slots, best, col: cfg.col, owned })
  // The gate, per move: #609 human-take guard, Welsh Tom-clone refusal, cast. A refusal drops the move and is reported.
  const db = require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const rv = require('../../services/shared/resolve-voice.cjs')
  const ok = [], refused = []
  for (const m of moves) {
    try { await rv.assertPointer(db, { courseCode: COURSE, col: m.col, to: m.to, tbl: m.tbl, key: m.pk, from: null }); ok.push(m) } catch (e) {
      if (e.code !== 'VOICE_POLICY' && e.code !== 'HUMAN_TAKE') throw e
      refused.push({ ...m, reason: e.reason })
    }
  }
  fs.mkdirSync(DIR, { recursive: true })
  fs.writeFileSync(ledgerPath(item), [HEAD.join(','), ...ok.map((m) => HEAD.map((h) => csvCell(m[h])).join(','))].join('\n') + '\n')
  const by = (arr, f) => arr.reduce((a, x) => ((a[f(x)] = (a[f(x)] || 0) + 1), a), {})
  console.log(JSON.stringify({ item, clips: clips.length, distinctTexts: best.size, emptySlots: slots.length, ownedSkipped: owned.size,
    planned: ok.length, byTable: by(ok, (m) => m.tbl), byVoice: by(ok, (m) => m.clip_voice), refused: refused.length,
    refusedReasons: by(refused, (m) => m.reason), noTake: by(misses, (m) => m.tbl), ledger: path.relative(process.cwd(), ledgerPath(item)) }, null, 1))
}

async function move(item, { back, apply, limit, bump = true }) {
  const cfg = ITEMS[item]
  let rows = readLedger(item)
  if (limit) rows = rows.slice(0, limit)
  if (!apply) { console.log(`(dry run) ${back ? 'undo' : 'apply'} ${item}: ${rows.length} ledger rows; pass --apply to write`); return }
  const db = require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
  const event = await recordContentEdit(db, { identity: serviceIdentity('welsh-human-links-621'), courseCode: COURSE, surface: 'tools:audio/welsh-human-links-621', operation: 'update',
    detail: { why: `job #621 ${back ? 'UNDO ' : ''}${item}: existing human takes linked into empty ${cfg.col} slots, same text only`, ledger: `ops/welsh-human-links-621/${item}-ledger.csv`, rows: rows.length } })
  const pg = await pgClient()
  let moved = 0, skipped = 0
  for (const tbl of TABLES) {
    const mine = rows.filter((r) => r.tbl === tbl)
    for (let i = 0; i < mine.length; i += 200) {
      const chunk = mine.slice(i, i + 200)
      const sql = back
        ? `update ${tbl} t set ${cfg.col} = null, last_edit_event_id = $3 from unnest($1::text[], $2::text[]) as v(pk, to_id) where t.id::text = v.pk and t.course_code = '${COURSE}' and t.${cfg.col} = v.to_id::uuid`
        : `update ${tbl} t set ${cfg.col} = v.to_id::uuid, last_edit_event_id = $3 from unnest($1::text[], $2::text[]) as v(pk, to_id) where t.id::text = v.pk and t.course_code = '${COURSE}' and t.${cfg.col} is null`
      const res = await pg.query(sql, [chunk.map((r) => r.pk), chunk.map((r) => r.to), event])
      moved += res.rowCount; skipped += chunk.length - res.rowCount
    }
  }
  await pg.end()
  if (moved && bump) { const v = await bumpCourseVersion(db, COURSE, 'patch'); if (!v) throw new Error(`content_version bump failed for ${COURSE}`) }
  console.log(`${back ? 'undo' : 'apply'} ${item}: moved ${moved}; skipped (slot no longer in its before-state) ${skipped}; edit event ${event}`)
}

async function main() {
  const a = process.argv.slice(2), item = a[a.indexOf('--item') + 1], cmd = a.find((x) => ['plan', 'apply', 'undo'].includes(x))
  if (!ITEMS[item] || !cmd) { console.error('usage: --item catrin|aran plan|apply|undo [--limit N] [--apply]'); process.exit(2) }
  const limit = a.includes('--limit') ? Number(a[a.indexOf('--limit') + 1]) : 0
  if (cmd === 'plan') return plan(item)
  return move(item, { back: cmd === 'undo', apply: a.includes('--apply'), limit, bump: !a.includes('--no-bump') })
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1) })
module.exports = { pickClips, planMoves, parseCsv, sameTextKey }
