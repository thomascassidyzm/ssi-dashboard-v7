#!/usr/bin/env node
/**
 * language-text-for-staged-pod.cjs — let a STAGED pod carry a deliberate line change into its
 * language's one pod text, so the change can go live through pod-switchover.cjs.
 *
 * WHY THIS EXISTS (job #799, 2026-11-03: Pod 1 Scene 4 becomes Kai's coffee invitation on 64 courses).
 * Two rules meet here, and until now nothing let a text change pass both:
 *   1. Never edit a live pod in place (docs/pods/pod-migration-protocol.md): clone to a held slug,
 *      edit there, switch over with the progress migration.
 *   2. One pod text per target language (Tom 2026-09-20; database/changes/20260920_pod_one_text_per_
 *      target_language.sql). pod-switchover.cjs refuses a staged pod that differs from, or is not
 *      bound to, its language's canonical_pod_target_text. And editing a BOUND pod is no way round
 *      it: the trigger propagates the edit to every bound pod of the language — the live pod-1
 *      included — which is rule 1 broken by the back door.
 * bind-pod-text-to-language.cjs cannot do it either: it only reads pod-1 / pod-1-231 and re-derives
 * the language text from the *_for_eng course's pod-1, i.e. the OLD words.
 *
 * WHAT IT WRITES, in one transaction:
 *   --course=C --staged=SLUG --lines=21,22 [--apply]
 *     - the language's canonical_pod_target_text rows at exactly the named global_orders take the
 *       staged pod's text (no other row is touched, and the staged pod must already agree with the
 *       canon on EVERY other line, or it refuses and names them);
 *     - the staged pod is bound (listening_pods.canonical_lang_text = true; the DB trigger re-checks
 *       the match line for line).
 *     Bound pods of the language that are still live with the old words are NOT rewritten — the canon
 *     table's own trigger only stamps updated_at — so they keep serving what their learners have been
 *     credited with until their own switchover.
 *   --course=C --bind=pod-1 [--apply]
 *     - after the switchover: movePod() does not carry canonical_lang_text, so the promoted pod comes
 *       back unbound; this binds it (the trigger refuses unless it matches).
 * A language with no canonical text has nothing to bind: it says so and exits 0.
 * Every write is attributed (serviceIdentity + content_edit_events). Dry run by default.
 */
'use strict'

const path = require('path')
const { Client } = require('pg')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')

const CANON_SLUG = 'pod-1'
const SURFACE = 'tools/pods/language-text-for-staged-pod.cjs'
const targetLang = (courseCode) => String(courseCode || '').split('_for_')[0]

/**
 * PURE. Which canon lines move, or why not.
 * @param {Map<number,string>} canon  global_order -> language text
 * @param {Map<number,string>} staged global_order -> staged pod text
 * @param {number[]} lines            the global_orders the change is allowed to touch
 */
function planLineMove (canon, staged, lines) {
  const allowed = new Set(lines)
  if (canon.size !== staged.size) return { refuse: `staged pod has ${staged.size} lines, the language text has ${canon.size}` }
  const stray = []; const moves = []
  for (const [g, text] of staged) {
    if (!canon.has(g)) return { refuse: `the language text has no line at global_order ${g}` }
    if (canon.get(g) === text) continue
    if (allowed.has(g)) moves.push({ global_order: g, from: canon.get(g), to: text })
    else stray.push(g)
  }
  if (stray.length) return { refuse: `staged pod differs from the language text outside --lines at global_order ${stray.join(', ')}` }
  return { moves }
}

async function main () {
  require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
  const arg = (n) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : null }
  const APPLY = process.argv.includes('--apply')
  const course = arg('course'); const staged = arg('staged'); const bind = arg('bind')
  const lines = (arg('lines') || '').split(',').filter(Boolean).map(Number)
  if (!course || (!staged && !bind) || (staged && bind)) throw new Error('usage: --course=C (--staged=SLUG --lines=21,22 | --bind=pod-1) [--apply]')
  if (staged && (!lines.length || lines.some(n => !Number.isInteger(n)))) throw new Error('--lines=<global_order,...> is required with --staged')
  const lang = targetLang(course)
  const podId = `${course}:${staged || bind}`

  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  try {
    const canonQ = await db.query('SELECT global_order, target_text FROM canonical_pod_target_text WHERE pod_slug = $1 AND target_lang = $2', [CANON_SLUG, lang])
    if (!canonQ.rows.length) { console.log(JSON.stringify({ course, lang, pod: podId, result: 'no-language-text', note: `${lang} has no canonical pod text — nothing to bind` })); return }
    const podQ = await db.query('SELECT id, canonical_lang_text FROM listening_pods WHERE id = $1', [podId])
    if (!podQ.rows.length) throw new Error(`no pod ${podId}`)
    const canon = new Map(canonQ.rows.map(r => [Number(r.global_order), r.target_text]))
    const rows = (await db.query('SELECT global_order, target_text FROM listening_pod_sentences WHERE pod_id = $1', [podId])).rows
    const stagedText = new Map(rows.map(r => [Number(r.global_order), r.target_text]))
    const plan = planLineMove(canon, stagedText, bind ? [] : lines)
    const out = { course, lang, pod: podId, alreadyBound: !!podQ.rows[0].canonical_lang_text, mode: bind ? 'bind' : 'move-lines', ...plan, apply: APPLY }
    if (plan.refuse) { console.log(JSON.stringify(out, null, 1)); process.exitCode = 2; return }
    if (staged && podQ.rows[0].canonical_lang_text && plan.moves.length) {
      // a bound staged pod would already have pushed its edit to the language (and the live pod) — refuse to compound it
      console.log(JSON.stringify({ ...out, refuse: `${podId} is already bound; a bound pod's edits propagate — investigate before moving lines` }, null, 1)); process.exitCode = 2; return
    }
    if (!APPLY) { console.log(JSON.stringify(out, null, 1)); return }

    const identity = serviceIdentity(SURFACE, { role: 'content-editor' })
    await db.query('BEGIN')
    try {
      for (const m of plan.moves) {
        const r = await db.query('UPDATE canonical_pod_target_text SET target_text = $1, updated_at = now() WHERE pod_slug = $2 AND target_lang = $3 AND global_order = $4 AND target_text = $5',
          [m.to, CANON_SLUG, lang, m.global_order, m.from])
        if (r.rowCount !== 1) throw new Error(`language text ${lang} line ${m.global_order} moved under us — nothing written`)
      }
      if (!podQ.rows[0].canonical_lang_text) await db.query('UPDATE listening_pods SET canonical_lang_text = true WHERE id = $1', [podId])
      await db.query(
        `INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [course, SURFACE, bind ? 'pod-bind-language-text' : 'pod-language-text-lines', identity.kind, String(identity.id), String(identity.label), identity.verified, identity.role || null,
          { pod_id: podId, target_lang: lang, global_orders: plan.moves.map(m => m.global_order) },
          { moves: plan.moves, job: process.env.CS_JOB_LABEL || '#799' }])
      await db.query('COMMIT')
      console.log(JSON.stringify({ ...out, applied: true }, null, 1))
    } catch (e) { await db.query('ROLLBACK'); throw e }
  } finally { await db.end() }
}

module.exports = { planLineMove }
if (require.main === module) main().catch((e) => { console.error(`FAILED: ${e.message}`); process.exit(1) })
