#!/usr/bin/env node
/**
 * run-canonical-231-build.cjs — drive canonical-231-build-plan.json: for each course,
 * draft or relabel the known side, then build the held pod.
 *
 * Idempotent and resumable: a course whose held pod already holds 231 rows is SKIPPED,
 * so a crashed or killed run is restarted by running it again. Nothing here can write to
 * a serving slug — build-canonical-231-pod.cjs refuses one — and nothing here renders,
 * queues or approves audio.
 *
 *   node tools/pods/run-canonical-231-build.cjs            # dry run, plans only
 *   node tools/pods/run-canonical-231-build.cjs --apply
 *   node tools/pods/run-canonical-231-build.cjs --apply --only=eng_for_ben,eng_for_guj
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { Client } = require('pg')
const { evidencePath } = require('../lib/evidence-path.cjs')

const APPLY = process.argv.includes('--apply')
const arg = (n) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : null }
const ONLY = (arg('only') || '').split(',').map(s => s.trim()).filter(Boolean)
const POD_SLUG = arg('pod-slug') || 'pod-1-231'
/**
 * Where the drafted known sides are parked between drafting and writing.
 * NOT $CS_SCRATCH: a long run launched as a systemd unit outlives the session that
 * started it, and $CS_SCRATCH is SWEPT the moment that session's job is marked done.
 * The 2026-09-19 run lost five of its six translations to exactly that — the unit stayed
 * up, exited 0, and every remaining course failed on a directory that had been deleted
 * underneath it. The evidence store is where machine-generated intermediates belong and
 * it survives.
 */
const SCRATCH = arg('drafts-dir') || evidencePath('docs/pods/build-231/drafts/.keep').replace(/\/\.keep$/, '')
const NAME_LINES = '33,94,95,221,226'

const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'canonical-231-build-plan.json'), 'utf8'))
// DOTENV_CONFIG_QUIET: dotenv v17 prints its tip banner to STDOUT, which lands in the
// middle of the JSON these tools return. Silencing it is what makes the result parseable.
const run = (script, args) => execFileSync(process.execPath, [path.join(__dirname, script), ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024,
  env: { ...process.env, DOTENV_CONFIG_QUIET: 'true' },
})

;(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  const results = []

  for (const c of plan.build) {
    if (ONLY.length && !ONLY.includes(c.course)) continue
    const podId = `${c.course}:${POD_SLUG}`
    const { rows } = await db.query('SELECT count(*)::int n FROM listening_pod_sentences WHERE pod_id = $1', [podId])
    if (rows[0].n === 231) { results.push({ course: c.course, status: 'already-built' }); console.error(`[build-231] ${c.course}: already built, skipping`); continue }
    if (rows[0].n) { results.push({ course: c.course, status: 'PARTIAL', rows: rows[0].n }); console.error(`[build-231] ${c.course}: ${rows[0].n} rows already — refusing to merge`); continue }

    try {
      const buildArgs = [`--course=${c.course}`, `--pod-slug=${POD_SLUG}`, `--reference=${plan.reference}`,
        `--target-source=${c.targetSource}`, `--target-lang-en=${c.targetLangEn}`, `--substitute=${c.substitute}`]
      if (c.carryTargetDraft) buildArgs.push('--carry-target-draft')

      if (c.translateKnown) {
        // The only genuinely expensive path: a language the estate has never rendered.
        const out = path.join(SCRATCH, `${c.course}-known.json`)
        if (!fs.existsSync(out)) {
          console.error(`[build-231] ${c.course}: translating 231 lines into ${c.knownLang}`)
          run('draft-pod-known-side.cjs', [`--mode=translate`, `--lang=${c.knownLang}`, `--target-lang=${c.targetLangEn}`,
            `--script=${c.script}`, `--reference=${plan.reference}`, `--out=${out}`])
        }
        buildArgs.push(`--known-drafts=${out}`, '--draft=known')
      } else {
        const out = path.join(SCRATCH, `${c.course}-names.json`)
        if (!fs.existsSync(out)) {
          console.error(`[build-231] ${c.course}: relabelling the five language-name lines in ${c.knownLang}`)
          run('draft-pod-known-side.cjs', [`--mode=relabel`, `--lang=${c.knownLang}`, `--target-lang=${c.targetLangEn}`,
            `--existing=${c.knownSource}`, `--script=${c.script}`, `--lines=${NAME_LINES}`,
            `--reference=${plan.reference}`, `--out=${out}`])
        }
        buildArgs.push(`--known-source=${c.knownSource}`, `--overrides=${out}`)
      }

      if (APPLY) buildArgs.push('--apply')
      const res = JSON.parse(run('build-canonical-231-pod.cjs', buildArgs))
      results.push({ course: c.course, status: res.mode, rows: res.summary.rows, drafts: res.summary.drafts })
      console.error(`[build-231] ${c.course}: ${res.mode} (${res.summary.rows} rows, ${res.summary.drafts} drafts)`)
    } catch (e) {
      results.push({ course: c.course, status: 'FAILED', error: String(e.message).slice(0, 400) })
      console.error(`[build-231] ${c.course}: FAILED — ${String(e.message).slice(0, 200)}`)
    }
  }

  await db.end()
  const logFile = evidencePath(`docs/pods/build-231/run-${APPLY ? 'applied' : 'dryrun'}-${Date.now()}.json`)
  fs.writeFileSync(logFile, JSON.stringify({ mode: APPLY ? 'APPLIED' : 'DRY_RUN', results }, null, 2))
  console.log(JSON.stringify({ mode: APPLY ? 'APPLIED' : 'DRY_RUN', results, log_file: logFile }, null, 2))
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
