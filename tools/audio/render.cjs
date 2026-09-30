#!/usr/bin/env node
/**
 * THE ONE WAY TO GET AUDIO MADE — a thin client for POST /api/audio/render on
 * production Popty (job #702, Tom 2026-09-29: "Single route for audio from now on.
 * Always. Popty is the only way to do it.").
 *
 *   RE-RECORD one clip in its own voice (make-before-break, old object kept, next audio_revision):
 *        node tools/audio/render.cjs --course C --role R --text STORED_TEXT --replace <course_audio id> [--spoken "what to say"] --purpose P
 *   --voice-bound: answer only with a clip in this voice (a two-voice phrase's slots).
 *   --job "#913": the job this render belongs to; a Tom-approved job (tools/tts-cap.cjs approve)
 *        spends from its own allowance up to the 300k/day ceiling instead of the automatic 100k.
 *
 *   node tools/audio/render.cjs --course ita_for_eng --role target1 \
 *        --text "ha detto qualcos'altro?" --purpose "kai: seed 376 fix" [--voice <id>] [--lang ita] [--dry-run]
 *
 * It sends no provider key and imports no TTS code: the server does library-first,
 * the spend guard (50k chars/day total, repeat cap, Tom-signed exemptions), ONE
 * render with no retries, and writes the clip back to course_audio and clip_index.
 * Exit 0 = clip exists (source: library|rendered), 2 = refused/failed (the reason
 * is printed; do NOT retry — a refusal is the answer), 1 = bad usage.
 *
 * Env: POPTY_URL (default http://localhost:3470), AGENT_ID (who you are; default $USER).
 */
const argv = process.argv.slice(2)
const opt = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined }
const body = {
  courseCode: opt('--course'), role: opt('--role'), text: opt('--text'), purpose: opt('--purpose'),
  language: opt('--lang'), voiceId: opt('--voice'), legoId: opt('--lego'), dryRun: argv.includes('--dry-run'),
  voiceBound: argv.includes('--voice-bound'), replaceAudioId: opt('--replace'), spokenText: opt('--spoken'), job: opt('--job'),
}
const missing = ['courseCode', 'role', 'text', 'purpose'].filter(k => !body[k])
if (missing.length) { console.error(`usage: render.cjs --course C --role R --text T --purpose P [--voice V] [--lang L] [--lego ID] [--dry-run] [--voice-bound] [--replace AUDIO_ID [--spoken TEXT]]\nmissing: ${missing.join(', ')}`); process.exit(1) }
const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
;(async () => {
  const res = await fetch(`${base}/api/audio/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agent-id': process.env.AGENT_ID || process.env.USER || 'unknown-agent' },
    body: JSON.stringify(body),
  })
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
  console.log(JSON.stringify(out, null, 2))
  process.exit(res.ok && out.ok ? 0 : 2)
})().catch(e => { console.error(`Popty unreachable at ${base}: ${e.message}`); process.exit(2) })
