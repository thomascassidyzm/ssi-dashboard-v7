#!/usr/bin/env node
/**
 * THE ONE WAY TO GET AUDIO MADE — a thin client for POST /api/audio/render on
 * production Popty (job #702, Tom 2026-09-29: "Single route for audio from now on.
 * Always. Popty is the only way to do it.").
 *
 *   RE-RECORD one clip in its own voice (make-before-break, old object kept, next audio_revision):
 *        node tools/audio/render.cjs --course C --role R --text STORED_TEXT --replace <course_audio id> [--spoken "what to say"] --purpose P
 *   --voice-bound: answer only with a clip in this voice (a two-voice phrase's slots).
 *   --trial: TRIAL render (job #748; a standing lane since job #23, 2026-10-28): any voice, any text, no cast/voicing/rerecord gates; the
 *        clip is stored apart (id trial_<UUID>, answer carries playPath /api/audio/trial/<id>) and is NEVER connected to a course. The
 *        daily cap still applies, and each trial call is capped (300 chars). A trial names who started it: --started-by NAME or --job "#NN".
 *        ElevenLabs only: --model eleven_v3|eleven_v4|eleven_v4_turbo|eleven_multilingual_v2 and
 *        --voice-settings '{"stability":0.5,"similarity_boost":0.75,"speed":0.85,"style":0}'. Cartesia: --speed 0.7..1.
 *   --job "#913": the job this render belongs to; a Tom-approved job (tools/tts-cap.cjs approve)
 *        spends from its own allowance up to the 3M/day ceiling instead of the automatic 1M/day cap.
 *
 *   SHARED AUDIO (job #464): --role welcome (the course welcome; --text may be left out, the course's welcome script is said),
 *        --role encouragement | instruction [--sequence N] (shared by every course of that known language, in its presentation voice).
 *
 *   node tools/audio/render.cjs --course ita_for_eng --role target1 \
 *        --text "ha detto qualcos'altro?" --purpose "kai: seed 376 fix" [--voice <id>] [--lang ita] [--dry-run]
 *
 * It sends no provider key and imports no TTS code: the server does library-first,
 * the spend guard (50k chars/day total, repeat cap, Tom-signed exemptions), ONE
 * render with no retries, and writes the clip back to course_audio and clip_index.
 * Exit 0 = clip exists (source: library|rendered), 2 = refused/failed (the reason
 * is printed; do NOT retry — a refusal is the answer), 1 = bad usage,
 * 3 = TRY LATER: the approval could not be checked because the Command Surface was down (APPROVAL_CHECK_UNAVAILABLE) for the
 * whole back-off; nothing was rendered, leave the slot unanswered and ask again next run.
 *
 *   --approval kai:YYYY-MM-DD:<reason> (or tom:…): a re-record / EXISTS_IN_LANGUAGE grant. The route verifies it came from the
 *        seat it names (#116·AI): this tool sends CS_CONV_TOKEN (the surface session's own token, already in its env) as x-cs-conv.
 *
 * Env: POPTY_URL (default http://localhost:3470), AGENT_ID (who you are; default $USER), CS_CONV_TOKEN (only sent with --approval).
 */
const argv = process.argv.slice(2)
const opt = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined }
const body = {
  courseCode: opt('--course'), role: opt('--role'), text: opt('--text'), purpose: opt('--purpose'),
  language: opt('--lang'), voiceId: opt('--voice'), legoId: opt('--lego'), dryRun: argv.includes('--dry-run'),
  replaceAudioId: opt('--replace'), spokenText: opt('--spoken'), job: opt('--job'), approval: opt('--approval'), trial: argv.includes('--trial') || undefined,
  sequence: opt('--sequence') == null ? undefined : Number(opt('--sequence')),
  startedBy: opt('--started-by'), model: opt('--model'), speed: opt('--speed') == null ? undefined : Number(opt('--speed')),
  voiceSettings: opt('--voice-settings') == null ? undefined : JSON.parse(opt('--voice-settings')),
}
const missing = ['courseCode', 'role', ...(body.role === 'welcome' ? [] : ['text']), 'purpose'].filter(k => !body[k])
if (missing.length) { console.error(`usage: render.cjs --course C --role R --text T --purpose P [--voice V] [--lang L] [--lego ID] [--dry-run] [--replace AUDIO_ID [--spoken TEXT]]\nmissing: ${missing.join(', ')}`); process.exit(1) }
const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
;(async () => {
  // TRY-LATER IS NOT A REFUSAL (cs #43·AL): APPROVAL_CHECK_UNAVAILABLE means the Command Surface was down when the route
  // tried to check --approval, and nothing was rendered. Back off and ask again (30s, 60s, 120s, then every 240s) for up to
  // RENDER_APPROVAL_WAIT_SEC (default 900). Still down after that → exit 3 "try later": the caller must leave the slot
  // UNANSWERED, never log it as refused. Every other answer, refusals included, is printed once and is final.
  const waitBudget = Number(process.env.RENDER_APPROVAL_WAIT_SEC || 900) * 1000
  const started = Date.now()
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${base}/api/audio/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-id': process.env.AGENT_ID || process.env.USER || 'unknown-agent', ...require('../../services/shared/approval-origin.cjs').approvalHeaders(body) },
      body: JSON.stringify(body),
    })
    const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
    if (out.code === 'APPROVAL_CHECK_UNAVAILABLE') {
      const waitMs = Math.max(Number(out.retryAfterSec || 0) * 1000, Math.min(30000 * 2 ** attempt, 240000))
      if (Date.now() - started + waitMs <= waitBudget) {
        console.error(`approval check unavailable (surface down); asking again in ${Math.round(waitMs / 1000)}s`)
        await new Promise(r => setTimeout(r, waitMs))
        continue
      }
      console.log(JSON.stringify({ ...out, tryLater: true }, null, 2))
      process.exit(3)
    }
    console.log(JSON.stringify(out, null, 2))
    process.exit(res.ok && out.ok ? 0 : 2)
  }
})().catch(e => { console.error(`Popty unreachable at ${base}: ${e.message}`); process.exit(2) })
