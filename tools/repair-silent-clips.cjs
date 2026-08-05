#!/usr/bin/env node
/**
 * repair-silent-clips.cjs — RETIRED 2026-08-05. This is now a thin shim that
 * forwards to `tools/audio-repair.cjs propose`. Its own engine has been deleted.
 *
 * ── The history this tool carries, which is worth keeping ───────────────────
 * WHY IT EXISTED (2026-08-03, fra_for_eng): a long xAI batch degraded and began
 * answering with empty or truncated HTTP 200 bodies. `response.ok` passed them,
 * the mastering chain laundered them into well-formed MP3s, and duration_ms was
 * computed FROM those files — so the row and the object agreed perfectly and
 * every consistency check in the estate passed. 539 clips shipped as digital
 * silence and ~300 more as half-sentences. This tool re-rendered them.
 *
 * ── WHY THE ENGINE WENT ─────────────────────────────────────────────────────
 * It repaired a clip by minting a NEW course_audio id, because the unique index
 * `unique_course_audio_per_voice (course_code, text_normalized, language, role,
 * voice_id)` will not hold two rows with the same text at the same voice. A new
 * id forces a DELETE of the old row, and a delete drags every foreign key with
 * it:
 *
 *   SET NULL  course_legos / course_practice_phrases / course_seeds
 *             .{known,target1,target2}_audio_id       <- captured and relinked
 *   CASCADE   lego_introductions.presentation_audio_id <- DESTROYS the authored
 *             "The German for: X, as in — Y, is:" script
 *
 * That last line is why this tool hard-refused `role='presentation'` for its
 * whole life. The refusal was correct: it was the honest consequence of a
 * delete-first design, and it left six damaged deu_for_eng intro clips in the
 * first five seeds with no repair path at all.
 *
 * ── WHAT REMOVED THE REFUSAL ────────────────────────────────────────────────
 * Not an argument — a different mechanism. services/audio-repair-core.cjs swaps
 * bytes IN PLACE AT THE SAME ID: `accept` UPDATEs the existing row's s3_key,
 * duration_ms and audio_revision, and leaves id, text, text_normalized,
 * language, role, voice_id and every foreign key alone. Nothing is created,
 * nothing is deleted, so no CASCADE can fire, no link can be orphaned, and the
 * unique index is never approached. Presentation clips take the identical code
 * path as everything else, which is why there is nothing left to refuse.
 *
 * The core asserts that claim rather than stating it: a link census is taken
 * before and after every swap and any movement rolls the row back
 * (services/audio-repair-core.cjs `linkCensus`), and its test suite drives the
 * whole path against a role='presentation' fixture with a live
 * lego_introductions row.
 *
 * ── The one thing same-id costs, and how it is paid ─────────────────────────
 * This tool's old header argued a new id was REQUIRED, because
 * ssi-learning-app/api/audio/[audioId].ts serves audio `Cache-Control: public,
 * max-age=31536000, immutable` and player-vue caches blobs in IndexedDB keyed by
 * audio id — fresh bytes under an unchanged URL would never reach a device that
 * already played the damaged clip. That was true until 2026-08-05, when the
 * learning app started carrying `course_audio.audio_revision` in the URL as
 * /api/audio/<id>?v=<rev> (ssi-learning-app api/_utils/audioRevisions.ts). The
 * URL changes on every accepted repair; the id does not; immutable caching —
 * which is what makes the app fast — survives intact.
 *
 * ── What changes for you at the keyboard ────────────────────────────────────
 * The old command repaired on sight. The new one PROPOSES and stops. TTS is not
 * even attempted without --spend, and nothing reaches a learner without a human
 * running `accept --i-have-listened`. Machines may flag audio; only humans may
 * pass it.
 *
 *   old:  node tools/repair-silent-clips.cjs fra_for_eng --flags /tmp/f.json
 *   new:  node tools/audio-repair.cjs propose fra_for_eng --targets /tmp/f.json
 *         node tools/audio-repair.cjs propose fra_for_eng --targets /tmp/f.json --spend
 *         node tools/audio-repair.cjs accept  fra_for_eng --from <log> --i-have-listened --actor <you>
 */
const path = require('path')
const { spawnSync } = require('child_process')
const { parseArgv } = require('./lib/audio-repair-cli.cjs')

const { flags, positional } = parseArgv(process.argv.slice(2))
const COURSE = positional[0]
const FLAGS_FILE = typeof flags.flags === 'string' ? flags.flags : (typeof flags.targets === 'string' ? flags.targets : null)

if (!COURSE || !FLAGS_FILE) {
  console.error('usage: repair-silent-clips.cjs <course> --flags <repair.json> [--only confirmed|suspect|all] [--limit N] [--spend]')
  console.error('\nThis tool is retired; it forwards to tools/audio-repair.cjs propose.')
  process.exit(1)
}

const forwarded = ['propose', COURSE, '--targets', FLAGS_FILE]
if (typeof flags.only === 'string') forwarded.push('--only', flags.only)
if (typeof flags.limit === 'string') forwarded.push('--limit', flags.limit)
if (typeof flags.role === 'string') forwarded.push('--role', flags.role)
if (typeof flags.actor === 'string') forwarded.push('--actor', flags.actor)
// --spend is NEVER inferred. The old --dry is now the default, so an old command
// line copied verbatim from a runbook cannot bill anything.
if (flags.spend === true) forwarded.push('--spend')

console.log(`
──────────────────────────────────────────────────────────────────────────────
repair-silent-clips.cjs is RETIRED. Forwarding to tools/audio-repair.cjs.

  It no longer deletes and re-creates rows: replacements are swapped IN PLACE
  at the same course_audio id, so role='presentation' is repairable now and
  nothing can CASCADE into lego_introductions.

  BEHAVIOUR CHANGE: this PROPOSES only. Nothing reaches a learner until a human
  runs \`audio-repair.cjs accept --i-have-listened\`.${flags.spend ? '' : `
  No TTS will be attempted — pass --spend once the plan is approved.`}
${flags.attempts || flags.concurrency || flags.dry ? `
  Ignored: ${[flags.attempts && '--attempts (the core re-rolls a bad render itself)', flags.concurrency && '--concurrency (propose runs serially — sustained load is what caused the 2026-08-03 damage)', flags.dry && '--dry (dry is now the default; --spend is the opt-in)'].filter(Boolean).join('\n            ')}` : ''}
──────────────────────────────────────────────────────────────────────────────
`)

const r = spawnSync(process.execPath, [path.join(__dirname, 'audio-repair.cjs'), ...forwarded], { stdio: 'inherit' })
process.exit(r.status === null ? 1 : r.status)
