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
 *   - Bengali known lines: NOT voiced — Bengali voices are not settled.
 *
 * Usage: node tools/frame-layer/v4/voice-gap-fill.cjs <course> [--go] [--concurrency 4] [--limit N]
 *   default is a plan: counts and chars per slot, nothing rendered or written.
 */
const fs = require('fs');
const path = require('path');

const TOM = 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2';
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121';
const INAYA = 'cartesia_5f83e88f-9b5a-4563-95c4-904f4b0036e9';
const ERWAN = 'cartesia_ab636c8b-9960-4fb3-bb0c-b7b655fb9745';

/** role → voice, per course. A role absent here is deliberately not voiced. */
const SLOT_VOICES = {
  fra_for_eng: { known: TOM, target1: INAYA, target2: ERWAN },
  eng_for_ben: { target1: CHARLOTTE, target2: TOM }, // known (Bengali) held: voices not settled
};
const COL = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' };
const TEXT = { known: 'known_text', target1: 'target_text', target2: 'target_text' };

/** Pure: live rows → the slots still to voice, each with its named voice and words. */
function planSlots(course, rows) {
  const voices = SLOT_VOICES[course];
  if (!voices) throw new Error(`no voice plan for ${course}`);
  const slots = [];
  for (const r of rows) for (const [role, voiceId] of Object.entries(voices)) {
    if (r[COL[role]]) continue;
    slots.push({ id: r.id, role, voiceId, text: r[TEXT[role]] });
  }
  return slots;
}

async function main() {
  const a = process.argv.slice(2);
  const course = a[0];
  const go = a.includes('--go');
  const ci = a.indexOf('--concurrency'); const conc = ci >= 0 ? +a[ci + 1] : 4;
  const root = path.join(__dirname, '..', '..', '..');
  require(path.join(root, 'node_modules', 'dotenv')).config({ path: path.join(root, '.env'), quiet: true });
  const { supabase } = require(path.join(root, 'services', 'supabase-client.cjs'));
  const out = path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '993-apply-v4-fra-ben');
  const ids = JSON.parse(fs.readFileSync(path.join(out, `apply-rows-${course}.json`), 'utf8')).map(r => r.id);
  const rows = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from('course_practice_phrases')
      .select('id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('course_code', course).in('id', ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    rows.push(...data);
  }
  const li = a.indexOf('--limit');
  const slots = planSlots(course, rows).slice(0, li >= 0 ? +a[li + 1] : Infinity);
  const byRole = {};
  for (const s of slots) { byRole[s.role] = byRole[s.role] || { n: 0, chars: 0 }; byRole[s.role].n++; byRole[s.role].chars += s.text.length; }
  console.log(`${course}: ${rows.length}/${ids.length} rows live, ${slots.length} slots to voice`, JSON.stringify(byRole));
  if (!go) { console.log('PLAN ONLY — pass --go to render'); return; }

  const { serviceIdentity } = require(path.join(root, 'services', 'shared', 'editor-identity.cjs'));
  const { recordContentEdit } = require(path.join(root, 'services', 'shared', 'content-edit-log.cjs'));
  const eventId = await recordContentEdit(supabase, { identity: serviceIdentity('v4-voice-gap-fill-993'), courseCode: course,
    surface: 'tools/frame-layer/v4/voice-gap-fill.cjs', operation: 'link-audio',
    scope: { slots: slots.length }, detail: { voices: SLOT_VOICES[course], job: '#993' } });
  const log = fs.createWriteStream(path.join(out, `voice-log-${course}.jsonl`), { flags: 'a' });
  const tally = { library: 0, rendered: 0, linked: 0, failed: 0, chars: 0 };
  let next = 0, stop = null;
  async function worker() {
    while (next < slots.length && !stop) {
      const s = slots[next++];
      const res = await fetch('http://localhost:3470/api/audio/render', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-993-voice-gap-fill' },
        body: JSON.stringify({ courseCode: course, role: s.role, text: s.text, voiceId: s.voiceId, purpose: `phrase v4 gap fill ${s.id}`, job: '#993' }) });
      const body = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
      if (!res.ok || !body.ok || !body.audioId) {
        tally.failed++; log.write(JSON.stringify({ ...s, status: res.status, body }) + '\n');
        // A refusal is the answer (spend guard / NOT_IN_CHAIN): stop, never retry or reroute.
        if (res.status === 402 || /NOT_IN_CHAIN|CAP|REPEAT/.test(body.code || '')) stop = body.code || res.status;
        continue;
      }
      tally[body.source === 'library' ? 'library' : 'rendered']++; tally.chars += body.charsSpent || 0;
      const { data, error } = await supabase.from('course_practice_phrases')
        .update({ [COL[s.role]]: body.audioId, last_edit_event_id: eventId })
        .eq('course_code', course).eq('id', s.id).is(COL[s.role], null).select('id');
      if (!error && data.length) tally.linked++;
      log.write(JSON.stringify({ ...s, source: body.source, audioId: body.audioId, chars: body.charsSpent, linked: !error && data.length === 1, err: error?.message }) + '\n');
    }
  }
  await Promise.all(Array.from({ length: conc }, worker));
  log.end();
  console.log(`${course} DONE`, JSON.stringify(tally), stop ? `STOPPED on refusal ${stop}` : '', `event ${eventId}`);
}

module.exports = { planSlots, SLOT_VOICES };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
