#!/usr/bin/env node
/**
 * course-editor CLI — SANDBOX harness.
 *
 * This CLI ALWAYS runs against an in-memory fake DB persisted to a JSON file
 * (no real Supabase). It exists so humans and adversarial test agents can drive
 * the real course-editor library end-to-end without any risk to live data.
 *
 * The production faces (MCP server / production-api endpoints) wire the SAME
 * library to the real client via createCourseEditor() in index.cjs.
 *
 * Usage:
 *   node cli.cjs --sandbox <file> seed-incident 79
 *   node cli.cjs --sandbox <file> seed-small spa_for_eng
 *   node cli.cjs --sandbox <file> dump course_legos
 *   node cli.cjs --sandbox <file> edit-lego spa_for_eng S0001L01 --set known_text="I want"
 *   node cli.cjs --sandbox <file> edit-phrase spa_for_eng spa_for_eng:S0001L01B01 --set target_text=quieres
 *   node cli.cjs --sandbox <file> resolve-zut spa_for_eng S0001L01 --known "I want (verb)"
 *   node cli.cjs --sandbox <file> strip-parens spa_for_eng [--dry-run] [--confirm]
 *   node cli.cjs --sandbox <file> find-slashes spa_for_eng
 *   node cli.cjs --sandbox <file> apply-qmark spa_for_eng spa_for_eng:S0001L01B01 spa
 *   node cli.cjs --sandbox <file> raw-update <table> --where lego_id=S0524L01 --set known_text=three [--cross-course] [--confirm]
 *   node cli.cjs --sandbox <file> get <table> --where course_code=spa_for_eng
 *   node cli.cjs --sandbox <file> audit
 *
 * Exit codes: 0 success · 2 refused (CourseEditorError) · 1 unexpected error.
 * Add --json for machine-readable output.
 */

const fs = require('fs')
const path = require('path')
const { createEditor } = require('./editor.cjs')
const { createOperations } = require('./operations.cjs')
const { CourseEditorError } = require('./errors.cjs')
const { FakeSupabase } = require('./__tests__/fake-supabase.cjs')
const fixtures = require('./__tests__/fixtures.cjs')

// ---- arg parsing -----------------------------------------------------------
function parseArgs(argv) {
  const out = { _: [], flags: {}, set: {}, where: {} }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--set' || a === '--where') {
      const target = a === '--set' ? out.set : out.where
      const pairs = argv[++i] || ''
      for (const p of splitPairs(pairs)) {
        const idx = p.indexOf('=')
        target[p.slice(0, idx)] = coerce(p.slice(idx + 1))
      }
    } else if (a === '--sandbox' || a === '--known' || a === '--threshold' || a === '--ack') {
      // value-taking flags
      out.flags[a.slice(2)] = argv[++i]
    } else if (a.startsWith('--')) {
      out.flags[a.slice(2)] = true
    } else {
      out._.push(a)
    }
  }
  return out
}
// split "a=1,b=2" but allow commas inside quotes
function splitPairs(s) {
  const parts = []
  let cur = '', q = null
  for (const ch of s) {
    if (q) { if (ch === q) q = null; else cur += ch }
    else if (ch === '"' || ch === "'") q = ch
    else if (ch === ',') { parts.push(cur); cur = '' }
    else cur += ch
  }
  if (cur) parts.push(cur)
  return parts
}
function coerce(v) {
  if (v === 'true') return true
  if (v === 'false') return false
  if (v === 'null') return null
  if (/^-?\d+$/.test(v)) return Number(v)
  return v
}

// ---- sandbox persistence ---------------------------------------------------
function loadDb(file) {
  let state = { tables: {}, audit: [], auditSeq: 1, clock: 1 }
  if (file && fs.existsSync(file)) state = JSON.parse(fs.readFileSync(file, 'utf8'))
  const db = new FakeSupabase({ tables: state.tables })
  db.audit = state.audit || []
  db._auditSeq = state.auditSeq || 1
  db._clock = state.clock || 1
  return db
}
function saveDb(file, db) {
  if (!file) return
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ tables: db.tables, audit: db.audit, auditSeq: db._auditSeq, clock: db._clock }, null, 2))
}

function out(json, obj, human) {
  if (json) console.log(JSON.stringify(obj, null, 2))
  else console.log(human != null ? human : JSON.stringify(obj))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const cmd = args._[0]
  const json = !!args.flags.json
  const file = args.flags.sandbox || process.env.COURSE_EDITOR_SANDBOX

  const db = loadDb(file)
  const editor = createEditor({ client: db, confirmThreshold: args.flags.threshold ? Number(args.flags.threshold) : 25 })
  const ops = createOperations(editor)

  const opts = {
    dryRun: !!args.flags['dry-run'],
    confirm: !!args.flags.confirm,
    crossCourse: !!args.flags['cross-course'],
    acknowledgeImpacts: args.flags.ack,
    overrideBlock: !!args.flags['override-block'],
  }

  let result
  switch (cmd) {
    case 'seed-incident':
      db.tables = new FakeSupabase({ tables: fixtures.buildIncidentDb(Number(args._[1]) || 79) }).tables
      result = { seeded: 'incident', courses: Number(args._[1]) || 79 }
      break
    case 'seed-small':
      db.tables = new FakeSupabase({ tables: fixtures.buildSmallCourseDb(args._[1] || 'spa_for_eng') }).tables
      result = { seeded: 'small', course: args._[1] || 'spa_for_eng' }
      break
    case 'dump':
      result = db.rows(args._[1])
      break
    case 'get':
      result = await editor.select(args._[1], args.where)
      break
    case 'edit-lego':
      result = await ops.editLego(args._[1], args._[2], args.set, opts)
      break
    case 'analyze-lego':
      result = await ops.analyzeLegoEdit(args._[1], args._[2], args.set)
      break
    case 'edit-seed':
      result = await ops.editSeed(args._[1], Number(args._[2]), args.set, opts)
      break
    case 'analyze-seed':
      result = await ops.analyzeSeedEdit(args._[1], Number(args._[2]), args.set)
      break
    case 'edit-phrase':
      result = await ops.editPhrase(args._[1], args._[2], args.set, opts)
      break
    case 'delete-phrase':
      result = await ops.deletePhrase(args._[1], args._[2], opts)
      break
    case 'resolve-zut':
      result = await ops.resolveZutDuplicate(args._[1], args._[2], { known_text: args.flags.known, markNotNew: !args.flags['keep-new'] }, opts)
      break
    case 'strip-parens':
      result = await ops.stripParensFromCourse(args._[1], opts)
      break
    case 'find-slashes':
      result = await ops.findSlashesInCourse(args._[1])
      break
    case 'apply-qmark':
      result = await ops.applyQuestionMark(args._[1], args._[2], args._[3], opts)
      break
    case 'raw-update': // the escape hatch — still fully guarded by editor.update
      result = await editor.update(args._[1], args.where, args.set, opts)
      break
    case 'raw-delete':
      result = await editor.remove(args._[1], args.where, opts)
      break
    case 'audit':
      result = { count: db.audit.length, last: db.audit.slice(-5) }
      break
    case 'restore': { // mirror /api/admin/audit-restore: upsert old_row by pk (oldest per pk)
      const ids = args._.slice(1).map(Number)
      const events = db.audit.filter((e) => ids.includes(e.id)).sort((a, b) => a.id - b.id)
      const seen = new Set()
      const restored = []
      for (const e of events) {
        const key = `${e.table_name}:${e.primary_key}`
        if (seen.has(key)) continue
        seen.add(key)
        const rows = db.tables[e.table_name] || (db.tables[e.table_name] = [])
        const pkCol = db.pkOf(e.table_name)
        const existing = rows.find((r) => String(r[pkCol]) === String(e.primary_key))
        if (existing) Object.assign(existing, e.old_row)
        else rows.push(e.old_row)
        restored.push(key)
      }
      result = { restored }
      break
    }
    default:
      out(json, { error: 'unknown command', cmd }, `Unknown command: ${cmd}`)
      process.exit(1)
  }

  saveDb(file, db)
  out(json, result, summarize(cmd, result))
  process.exit(0)
}

function renderReport(report) {
  const lines = []
  for (const i of report.impacts) {
    const tag = i.severity === 'block' ? '⛔ BLOCK' : i.severity === 'warn' ? '⚠️  WARN' : 'ℹ️  info'
    lines.push(`  ${tag}  [${i.type}] ${i.message}`)
    for (const it of (i.items || []).slice(0, 8)) {
      lines.push(`        - ${JSON.stringify(it)}`)
    }
    if (i.count > 8) lines.push(`        … and ${i.count - 8} more`)
  }
  if (report.requiresAck) {
    lines.push(``)
    lines.push(`  → Review the above, then re-run with --ack ${report.ackToken}` +
      (report.maxSeverity === 'block' ? ' --override-block' : ''))
  }
  return lines.join('\n')
}

function rowPreview(row) {
  const id = row.id || row.lego_id || row.seed_number
  const k = row.known_text !== undefined ? row.known_text : row.text
  const t = row.target_text
  return `  ${String(id).padEnd(28)} ${k ?? ''}${t !== undefined ? '  →  ' + t : ''}`
}

function summarize(cmd, r) {
  if (!r) return 'ok'
  // dump/get return arrays — show one line per row, not just a count (UX feedback).
  if (Array.isArray(r)) {
    if (r.length === 0) return '0 rows'
    return `${r.length} row(s):\n` + r.slice(0, 40).map(rowPreview).join('\n') + (r.length > 40 ? `\n  … and ${r.length - 40} more` : '')
  }
  // analyze-* commands return a bare report
  if (r.ackToken && r.impacts) {
    return `IMPACT REVIEW (${r.maxSeverity}${r.requiresAck ? ', ack required' : ''}):\n` + renderReport(r)
  }
  let s = ''
  if (r.applied !== undefined) {
    s = `${r.applied ? 'APPLIED' : 'dry-run'} · ${r.plan ? r.plan.length : 0} row(s)${r.batchId ? ' · batch ' + r.batchId : ''}`
  } else {
    s = JSON.stringify(r).slice(0, 400)
  }
  if (r.impact && r.impact.impacts.length) s += `\n  impacts noted (${r.impact.maxSeverity}): ` + r.impact.impacts.map((i) => i.type).join(', ')
  return s
}

main().catch((err) => {
  const json = process.argv.includes('--json')
  if (err instanceof CourseEditorError || err.code) {
    let human = `REFUSED [${err.code}]: ${err.message}`
    if (err.code === 'IMPACT_REVIEW' && err.details && err.details.report) {
      human += '\n' + renderReport(err.details.report)
    }
    out(json, { refused: true, code: err.code, message: err.message, details: err.details }, human)
    process.exit(2)
  }
  out(json, { error: err.message, stack: err.stack }, `ERROR: ${err.message}`)
  process.exit(1)
})
