#!/usr/bin/env node
/**
 * VOICE THE APPLIED v4 GAP-FILL ROWS (job #993, Tom 2026-10-09 09:32Z: "Merge French and
 * Bengali. Then we need to rebuild the audio. Bengali has not been settled so we want to
 * leave the audio for that one for the Bengali voices … English is already settled as Tom
 * and Charlotte in Cartesia").
 *
 * Every clip goes through THE ONE AUDIO ROUTE (POST /api/audio/render: library first, spend
 * guard, one render). The route files the clip in course_audio but does not point a phrase
 * row at it, and the course linker (link_all_audio_ids) matches the course's STORED voice,
 * which for these courses is retired xAI — so it would refuse these clips. This tool
 * therefore attaches each clip to its OWN phrase row by id, only where the slot is still
 * NULL (never overwrites, never re-renders existing audio).
 *
 * The voice per slot is NAMED, never left to resolution, so the plan is the run:
 *   - English lines: male slot = Tom (Cartesia clone tom_001), female slot = Charlotte
 *     (r-2026-09-26-english-voices-estate-wide-male-tom), keeping each course's existing
 *     gender per role (fra known was Tom's xAI clone → tom_001; eng_for_ben target1 was
 *     Olivia → Charlotte, target2 was Tom's xAI clone → tom_001).
 *   - French target lines: the course's own Eve (f, target1) / Leo (m, target2) are xAI,
 *     which can no longer render (tts-provider-policy: xAI retired from selection). A new
 *     line is a true gap, so it takes Tom's picked French Cartesia voices of 2026-10-08,
 *     Inaya (f) / Erwan (m) — the same genders per role.
 *   - Bengali known lines: Ananya only (Tom 2026-10-09; no Rubel split).
 *
 * NO DIRECT DATABASE (job #544, hard rule #384): rows are READ through Popty's phrase-v4 read
 * route (?audio=1) and clips are LINKED through the course-edit door as the signed agent
 * V4_AGENT_ID (default phrase-v4-voice): one `audio.link` op per slot, each carrying
 * `expect: {<slot column>: null}` so a filled slot is never overwritten, and the door's own
 * text gate refuses a clip that does not speak the row's words. Every batch is PREVIEWED first
 * (the real transaction, rolled back) and only then applied; every apply returns an undo file,
 * whose names are written to the log. Rendering is unchanged: POST /api/audio/render.
 *
 * Usage: node tools/frame-layer/v4/voice-gap-fill.cjs <course> [--go] [--concurrency 4] [--limit N]
 *   default is a plan: counts and chars per slot, nothing rendered or written.
 *   Undo:  node tools/agent-admin/call.cjs --agent <id> POST /api/admin/course-edit/<course>/edit-batch '{"undo_file":"<name>","apply":true}'
 */
const fs = require('fs');
const path = require('path');
const { popty } = require('./db.cjs');

const TOM = 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2';
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121';
const INAYA = 'cartesia_5f83e88f-9b5a-4563-95c4-904f4b0036e9';
const ERWAN = 'cartesia_ab636c8b-9960-4fb3-bb0c-b7b655fb9745';
// Bengali known voice (Tom 2026-10-09, supersedes the #118 Ananya/Rubel hash split): Ananya ONLY for every known-side prompt.
// Rubel clips already rendered stay as they are (a voice change never re-renders existing audio).
const ANANYA_BN = 'cartesia_48b9e1de-e2fa-4914-8b32-31c437813548';
const bengaliKnownVoice = () => ANANYA_BN;

/** role → voice, per course. A role absent here is deliberately not voiced. */
const SLOT_VOICES = {
  fra_for_eng: { known: TOM, target1: INAYA, target2: ERWAN },
  eng_for_ben: { known: bengaliKnownVoice, target1: CHARLOTTE, target2: TOM },
};
const agentId = () => process.env.V4_AGENT_ID || 'phrase-v4-voice';
const COL = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' };
const TEXT = { known: 'known_text', target1: 'target_text', target2: 'target_text' };

/** Pure: live rows → the slots still to voice, each with its named voice and words. */
function planSlots(course, rows) {
  const voices = SLOT_VOICES[course];
  if (!voices) throw new Error(`no voice plan for ${course}`);
  const slots = [];
  for (const r of rows) for (const [role, voiceId] of Object.entries(voices)) {
    if (r[COL[role]]) continue;
    const text = r[TEXT[role]];
    slots.push({ id: r.id, role, voiceId: typeof voiceId === 'function' ? voiceId(text, course) : voiceId, text });
  }
  return slots;
}

/**
 * A deploy restarts Popty under a long run (job #993's first run died on "fetch failed" when
 * a push to main redeployed it). An UNREACHABLE server or a 502/503 is not a refusal, so it is
 * waited out and the same request re-sent; the route is library-first, so a clip that was
 * rendered before the connection dropped is linked on the re-ask, never paid for twice.
 * Any answer the route actually gives — including a 402 refusal — is returned as it is.
 */
async function postRender(body, { tries = 40, waitMs = 15000 } = {}) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch('http://localhost:3470/api/audio/render', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-id': agentId() }, body: JSON.stringify(body) });
      if (![502, 503, 504].includes(res.status) || i >= tries) return res;
    } catch (e) { if (i >= tries) throw e; }
    await new Promise(r => setTimeout(r, waitMs));
  }
}

/** Pure: one `audio.link` op per rendered slot. `expect` pins the slot to NULL — fill-only, never an overwrite. */
function buildLinkOps(rendered) {
  return rendered.map(r => ({ op: 'audio.link', target: 'phrase', phrase_id: r.id, slot: r.role, audio_id: r.audioId,
    expect: { [COL[r.role]]: null } }));
}

/**
 * Preview, then apply, one chunk of link ops through the signed course-edit door. An op the
 * door refuses (the slot got filled since we read it: DRIFT; a clip that does not speak the row:
 * TEXT_MISMATCH) is DROPPED and recorded, and the chunk is previewed again — one stale slot never
 * costs the other 199. Returns { applied, skipped:[{op, code, error}], undoFiles:[…] }.
 */
function linkChunk(course, ops, { call = popty } = {}) {
  const url = `/api/admin/course-edit/${encodeURIComponent(course)}/edit-batch`;
  let live = ops.slice();
  const skipped = [];
  while (live.length) {
    try {
      call('POST', url, { ops: live, apply: false });           // the real transaction, rolled back
    } catch (e) {
      const b = e.body || {};
      if (['DRIFT', 'TEXT_MISMATCH', 'NOT_FOUND', 'NO_SUCH_AUDIO'].includes(b.code) && Number.isInteger(b.index) && live[b.index]) {
        skipped.push({ op: live[b.index], code: b.code, error: b.error });
        const remaining = live.filter((_, i) => i !== b.index);
        if (remaining.length >= live.length) throw e; // retry only with fewer ops
        live = remaining;
        continue;
      }
      throw e;
    }
    const out = call('POST', url, { ops: live, apply: true });
    return { applied: live.length, skipped, undoFiles: out.undo_file ? [out.undo_file] : [], eventId: out.event_id || null };
  }
  return { applied: 0, skipped, undoFiles: [], eventId: null };
}

async function main() {
  const a = process.argv.slice(2);
  const course = a[0];
  const go = a.includes('--go');
  const ci = a.indexOf('--concurrency'); const conc = ci >= 0 ? +a[ci + 1] : 4;
  const out = path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '993-apply-v4-fra-ben');
  const ids = new Set(JSON.parse(fs.readFileSync(path.join(out, `apply-rows-${course}.json`), 'utf8')).map(r => r.id));
  // READ through Popty (signed). The door answers the whole course; we keep the staged rows.
  const read = popty('GET', `/api/admin/phrase-v4/course/${encodeURIComponent(course)}?audio=1`);
  const rows = read.phrases.filter(p => ids.has(p.id)).map(p => ({ id: p.id, known_text: p.known_text, target_text: p.target_text,
    known_audio_id: p.known_audio_id, target1_audio_id: p.target1_audio_id, target2_audio_id: p.target2_audio_id }));
  const li = a.indexOf('--limit');
  const slots = planSlots(course, rows).slice(0, li >= 0 ? +a[li + 1] : Infinity);
  const byRole = {};
  for (const s of slots) { byRole[s.role] = byRole[s.role] || { n: 0, chars: 0 }; byRole[s.role].n++; byRole[s.role].chars += s.text.length; }
  console.log(`${course}: ${rows.length}/${ids.size} rows live, ${slots.length} slots to voice`, JSON.stringify(byRole));
  if (!go) { console.log('PLAN ONLY — pass --go to render and link (every link batch is previewed before it is applied)'); return; }

  const log = fs.createWriteStream(path.join(out, `voice-log-${course}.jsonl`), { flags: 'a' });
  const tally = { library: 0, rendered: 0, linked: 0, skipped: 0, failed: 0, chars: 0 };
  const rendered = [];
  let next = 0, stop = null;
  async function worker() {
    while (next < slots.length && !stop) {
      const s = slots[next++];
      const res = await postRender({ courseCode: course, role: s.role, text: s.text, voiceId: s.voiceId, purpose: `phrase v4 gap fill ${s.id}`, job: '#993' });
      const body = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
      if (!res.ok || !body.ok || !body.audioId) {
        tally.failed++; log.write(JSON.stringify({ ...s, status: res.status, body }) + '\n');
        // A refusal is the answer (spend guard / NOT_IN_CHAIN): stop, never retry or reroute.
        if (res.status === 402 || /NOT_IN_CHAIN|CAP|REPEAT/.test(body.code || '')) stop = body.code || res.status;
        continue;
      }
      tally[body.source === 'library' ? 'library' : 'rendered']++; tally.chars += body.charsSpent || 0;
      rendered.push({ ...s, audioId: body.audioId, source: body.source, chars: body.charsSpent });
    }
  }
  await Promise.all(Array.from({ length: conc }, worker));

  // Link what was rendered — even after a stop, so paid clips are never left unattached.
  const ops = buildLinkOps(rendered);
  const undoFiles = [];
  for (let i = 0; i < ops.length; i += 200) {
    const r = linkChunk(course, ops.slice(i, i + 200));
    tally.linked += r.applied; tally.skipped += r.skipped.length; undoFiles.push(...r.undoFiles);
    for (const k of r.skipped) log.write(JSON.stringify({ skipped: k }) + '\n');
  }
  for (const r of rendered) log.write(JSON.stringify(r) + '\n');
  log.end();
  console.log(`${course} DONE`, JSON.stringify(tally), stop ? `STOPPED on refusal ${stop}` : '', `undo files: ${undoFiles.join(', ') || 'none'}`);
}

module.exports = { planSlots, buildLinkOps, linkChunk, SLOT_VOICES };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
