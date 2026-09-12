#!/usr/bin/env node
/**
 * annotate-jump-in.cjs — set `listening_pod_sentences.jump_in` on a pod that was
 * written before the marker existed (Tom, 2026-09-12). ANNOTATE ONLY: no text
 * changes, no audio changes, no progress touched — the one column, nothing else.
 *
 * The rule is the generator's rule, verbatim (services/shared/pod-jump-in-rule.cjs),
 * judged by the same model family the generator writes with (POD_GEN_MODEL,
 * default sonnet), one call per scene so each line is read in its conversation.
 *
 *   node tools/pods/annotate-jump-in.cjs <podId>              # dry run: judge, log, write nothing
 *   node tools/pods/annotate-jump-in.cjs <podId> --apply      # write jump_in
 *   --model=<m>     override the judging model (default: POD_GEN_MODEL || sonnet)
 *   --scenes=a-b    limit to a scene range
 *   --doc=<path>    also write the annotated dialogue as markdown (line, speaker,
 *                   jumpIn, one-phrase reason) for publishing
 *
 * Every run logs per-row verdicts to
 *   ~/ssi-evidence/ssi-dashboard-v7/tools/pods/annotate-jump-in/<podId>-<dryrun|applied>-<stamp>.json
 * Applying asserts each row's before-state (jump_in as read) and aborts on drift.
 */
'use strict'

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const { Client } = require('pg')
const { claudeChat } = require('../../services/shared/claude-cli.cjs')
const { JUMP_IN_RULE, normaliseJumpIn, deterministicJumpIn, endsInterrupted } = require('../../services/shared/pod-jump-in-rule.cjs')
const { evidencePath } = require('../lib/evidence-path.cjs')

const argv = process.argv.slice(2)
const POD_ID = argv.find((a) => !a.startsWith('--'))
const APPLY = argv.includes('--apply')
const MODEL = (argv.find((a) => a.startsWith('--model=')) || '').slice(8) || process.env.POD_GEN_MODEL || 'sonnet'
const SCENES = (argv.find((a) => a.startsWith('--scenes=')) || '').slice(9)
const DOC = (argv.find((a) => a.startsWith('--doc=')) || '').slice(6)
const TIMEOUT_MS = 5 * 60 * 1000

if (!POD_ID) { console.error('usage: annotate-jump-in.cjs <podId> [--apply] [--model=m] [--scenes=a-b] [--doc=path]'); process.exit(1) }

function scenePrompt(lines) {
  const block = lines.map((l) => `${l.global_order}. [${l.speaker}] ${l.target_text}\n    (${l.known_text})`).join('\n')
  return `You are annotating ONE scene of an existing two-speaker dialogue for how its audio should be scheduled. Do not rewrite anything; you are only judging each line.

${JUMP_IN_RULE}

The lines, in order, each with its ${'known-language'} gloss in brackets under it:
${block}

Return ONLY a single JSON object, no preamble, no code fences:
{"lines":[{"global_order":<n>,"jump_in":true|false,"reason":"<one short phrase, under twelve words, naming the cue you judged from>"}]}
One object per input line, same order, same global_order values. The first line is always false.`
}

function parseVerdicts(raw, lines) {
  let s = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const i = s.indexOf('{'), j = s.lastIndexOf('}')
  if (i !== -1 && j > i) s = s.slice(i, j + 1)
  const obj = JSON.parse(s)
  if (!obj || !Array.isArray(obj.lines)) throw new Error('no "lines" array')
  if (obj.lines.length !== lines.length) throw new Error(`line count ${obj.lines.length} ≠ ${lines.length}`)
  return lines.map((l, k) => {
    const o = obj.lines[k] || {}
    if (Number(o.global_order) !== Number(l.global_order)) throw new Error(`global_order ${o.global_order} ≠ ${l.global_order} at index ${k}`)
    const v = normaliseJumpIn(o.jump_in)
    if (v === null) throw new Error(`line ${l.global_order}: jump_in is not true/false`)
    // The text decides first (Tom, 2026-09-12 21:59Z): a previous line written to
    // stop abruptly makes this one a jump-in whatever the model said. The model
    // only adds the backchannels the text does not mark.
    const byText = k === 0 ? false : deterministicJumpIn(lines[k - 1].target_text, l.target_text)
    if (byText !== null) {
      return { ...l, verdict: byText, source: 'text', reason: k === 0 ? 'scene opener' : (endsInterrupted(lines[k - 1].target_text) ? 'previous line ends cut off' : 'resumes own cut-off sentence') }
    }
    return { ...l, verdict: v, source: 'model', reason: String(o.reason || '').trim().slice(0, 120) }
  })
}

async function judgeScene(lines) {
  let lastErr
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await claudeChat(scenePrompt(lines), { model: MODEL, timeout: TIMEOUT_MS })
      return parseVerdicts(raw, lines)
    } catch (e) { lastErr = e }
  }
  throw new Error(`scene ${lines[0].scene_number}: ${lastErr.message}`)
}

function markdownDoc(podId, rows, meta) {
  const out = []
  out.push(`# Jump-in annotation — ${podId}`)
  out.push('')
  out.push(`${meta.applied ? 'APPLIED' : 'DRY RUN'} · ${rows.length} lines · ${meta.jumpIns} marked jump-in · model ${meta.model} · ${meta.stamp}`)
  out.push('')
  out.push('Rule: a line JUMPS IN when the speaker cuts into the previous speaker\'s flow (backchannel, interjection, finishing their sentence) and plays with no gap; a genuine turn (answer, reply, new topic after a full stop) keeps today\'s gap. First line of a scene is never a jump-in. Text and audio untouched.')
  out.push('')
  let scene = null
  for (const r of rows) {
    if (r.scene_number !== scene) {
      scene = r.scene_number
      out.push('')
      out.push(`## Scene ${scene}`)
      out.push('')
      out.push('| # | speaker | jumpIn | line | reason |')
      out.push('|---|---|---|---|---|')
    }
    const mark = r.verdict ? (r.source === 'text' ? '**⤵ YES** (text)' : '**⤵ YES** (judged)') : 'no'
    const text = String(r.target_text).replace(/\|/g, '\\|')
    const known = String(r.known_text).replace(/\|/g, '\\|')
    out.push(`| ${r.global_order} | ${r.speaker} | ${mark} | ${text}<br>_${known}_ | ${r.reason.replace(/\|/g, '\\|')} |`)
  }
  return out.join('\n') + '\n'
}

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  try {
    const { rows: pods } = await db.query('select id, course_code, slug, visibility from listening_pods where id = $1', [POD_ID])
    if (!pods.length) throw new Error(`pod not found: ${POD_ID}`)
    let where = 'pod_id = $1'
    const params = [POD_ID]
    if (SCENES) {
      const [a, b] = SCENES.split('-').map(Number)
      where += ' and scene_number between $2 and $3'
      params.push(a, Number.isFinite(b) ? b : a)
    }
    const { rows } = await db.query(
      `select id, scene_number, sentence_number, global_order, speaker, target_text, known_text, jump_in
         from listening_pod_sentences where ${where} order by global_order`, params)
    if (!rows.length) throw new Error('no lines')
    const byScene = new Map()
    for (const r of rows) { if (!byScene.has(r.scene_number)) byScene.set(r.scene_number, []); byScene.get(r.scene_number).push(r) }

    const t0 = Date.now()
    const judged = []
    for (const [scene, lines] of byScene) {
      const t = Date.now()
      const v = await judgeScene(lines)
      judged.push(...v)
      console.log(`scene ${scene}: ${lines.length} lines, ${v.filter((x) => x.verdict).length} jump-ins, ${((Date.now() - t) / 1000).toFixed(0)}s`)
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const jumpIns = judged.filter((r) => r.verdict).length
    const byText = judged.filter((r) => r.verdict && r.source === 'text').length
    const meta = { podId: POD_ID, model: MODEL, applied: false, stamp, lines: judged.length, jumpIns, byText, byModel: jumpIns - byText, interruptedEndings: judged.filter((r) => endsInterrupted(r.target_text)).length, elapsedS: Math.round((Date.now() - t0) / 1000) }

    let written = 0
    if (APPLY) {
      await db.query('begin')
      try {
        for (const r of judged) {
          // before-state assertion: the row still holds what we read, and only jump_in moves
          const { rowCount } = await db.query(
            'update listening_pod_sentences set jump_in = $1 where id = $2 and jump_in is not distinct from $3 and target_text = $4',
            [r.verdict, r.id, r.jump_in, r.target_text])
          if (rowCount !== 1) throw new Error(`row ${r.id} drifted since read — aborting, nothing written`)
          written++
        }
        await db.query('commit')
        meta.applied = true
      } catch (e) { await db.query('rollback'); throw e }
    }

    const logPath = evidencePath(`tools/pods/annotate-jump-in/${POD_ID.replace(/[^a-z0-9_-]/gi, '_')}-${APPLY ? 'applied' : 'dryrun'}-${stamp}.json`)
    fs.mkdirSync(path.dirname(logPath), { recursive: true })
    fs.writeFileSync(logPath, JSON.stringify({ meta, rows: judged.map((r) => ({ id: r.id, scene: r.scene_number, global_order: r.global_order, speaker: r.speaker, before: r.jump_in, jump_in: r.verdict, source: r.source, reason: r.reason })) }, null, 2))
    if (DOC) { fs.mkdirSync(path.dirname(DOC), { recursive: true }); fs.writeFileSync(DOC, markdownDoc(POD_ID, judged, meta)) }
    console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'}: ${judged.length} lines, ${jumpIns} jump-ins (${(100 * jumpIns / judged.length).toFixed(0)}%; ${byText} from text, ${jumpIns - byText} judged; ${meta.interruptedEndings} lines end cut off), ${written} rows written, ${meta.elapsedS}s → ${logPath}${DOC ? `, doc ${DOC}` : ''}`)
  } finally { await db.end() }
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
