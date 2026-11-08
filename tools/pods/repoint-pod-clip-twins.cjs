#!/usr/bin/env node
'use strict';
/**
 * REPOINT POD CLIP TWINS (job #813; Tom 2026-11-08 11:11Z: "Let's re-point all of these so we don't get future drift").
 * Every pod slot that plays a second take of words its voice has already recorded is moved onto ONE take of those words,
 * so a later re-record (job #776 rebakes the shared clips only) reaches every pod at once instead of leaving copies behind.
 *
 * Twins are found exactly as tools/pods/pod-clip-twin-census.cjs finds them (same language, voice and words, the pod pause
 * cue folded), read from the database this process points at (the nightly QA copy). THE KEEPER of a group is, in order:
 * the take linked from the most pod slots (the shared clip everyone already plays), one with word timings, plain text
 * over the cued spelling, the oldest, the lowest id. Every other member's slots are repointed to it.
 *
 * WHAT IS NOT MOVED (each counted in the plan, never silently):
 *   - pod-only clips (pod_atom / pod_fine_known: Drill pieces CUT from a turn, job #338) — neither moved nor kept;
 *   - a member with word timings whose keeper has none (the player's per-sentence split would lose its timings);
 *   - retired pods (slug -retired-): their rows are rollback history.
 * Nothing is deleted: the old takes stay in course_audio, unlinked.
 *
 * WRITES go through Popty only: POST /api/production/:course/link-clip, replace:true + expectCurrent = the take the slot
 * held in the copy, so a slot that moved since the copy was taken is refused (NOT_HELD / SLOT_FILLED), never overwritten.
 *
 *   set -a; . ~/ssi-restore/qa-copy.env; set +a
 *   node tools/pods/repoint-pod-clip-twins.cjs --language=eng [--course=fin_for_eng] [--apply]
 * Dry run by default (link-clip dryRun:true). Plan + per-link results go to ~/ssi-evidence/.../repoint-pod-clip-twins/.
 */
const fs = require('fs');
const path = require('path');
const { connect, clipsById } = require('../../services/shared/agent-db.cjs');
const { isPodOnlyClip } = require('../../services/shared/pod-audio.cjs');
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
const { evidencePath } = require('../lib/evidence-path.cjs');
const { voiceKey, wordsKey } = require('./pod-clip-twin-census.cjs');
const { tryCanonicalLanguage } = require('../../services/shared/clip-identity.cjs');

const POPTY = process.env.POPTY_URL || 'http://localhost:3470';
const SLOTS = [
  ['target_audio_id', 'target'], ['known_audio_id', 'known'],
  ['sentence_audio_ids', 'segment'], ['sentence_known_audio_ids', 'knownsegment'], ['takeg_audio_ids', 'takeg'],
];
const COLS = "id::text AS id, course_code, role, language, voice_id, text, s3_key, origin, created_at, (word_timings IS NOT NULL OR word_boundaries IS NOT NULL) AS has_timings";
const langKey = (l) => (l ? tryCanonicalLanguage(l) || String(l).toLowerCase() : null);

/** Pure. rows = pod sentences {id, pod_id, course_code, <slot cols>}; clips = Map id → row. Returns { links, held, groups }. */
function planRepoints(rows, clips, { language }) {
  const uses = new Map();
  for (const r of rows) for (const [col, slot] of SLOTS) {
    const v = r[col];
    for (const id of (Array.isArray(v) ? v : [v])) {
      if (!id) continue;
      (uses.get(String(id)) || uses.set(String(id), []).get(String(id))).push({ course: r.course_code, line: r.id, slot });
    }
  }
  const groups = new Map();
  for (const [id, where] of uses) {
    const c = clips.get(id);
    if (!c || c.text == null || !c.voice_id || !c.s3_key || String(c.s3_key).startsWith('pending/')) continue;
    if (langKey(c.language) !== language) continue;
    const k = `${voiceKey(c.voice_id)}\u001f${wordsKey(c.text)}`;
    (groups.get(k) || groups.set(k, []).get(k)).push({ ...c, where });
  }
  const links = [], held = [], out = [], seen = new Set();
  for (const [k, all] of groups) {
    if (new Set(all.map((m) => m.s3_key)).size < 2) continue; // pointers to one recording are not twins
    const podOnly = all.filter(isPodOnlyClip);
    const members = all.filter((m) => !isPodOnlyClip(m));
    for (const m of podOnly) held.push({ reason: 'pod-only cut', id: m.id, slots: m.where.length });
    if (members.length < 2) continue;
    const plain = (m) => (normalizeForAudio(m.text) === wordsKey(m.text) ? 0 : 1);
    const keeper = members.slice().sort((a, b) => b.where.length - a.where.length || (b.has_timings - a.has_timings) ||
      plain(a) - plain(b) || String(a.created_at).localeCompare(String(b.created_at)) || a.id.localeCompare(b.id))[0];
    out.push({ key: k.replace('\u001f', ' | '), keeper: keeper.id, moved: members.filter((m) => m.id !== keeper.id).map((m) => m.id) });
    for (const m of members) {
      if (m.id === keeper.id) continue;
      if (m.has_timings && !keeper.has_timings) { held.push({ reason: 'keeper lacks word timings', id: m.id, keeper: keeper.id, slots: m.where.length }); continue; }
      for (const w of m.where) {
        const k2 = `${w.line}|${w.slot}|${m.id}`; // an array holding the take twice is one link: link-clip moves every position
        if (seen.has(k2)) continue; seen.add(k2);
        links.push({ course: w.course, podSentenceId: w.line, role: w.slot, audioId: keeper.id, replace: true, expectCurrent: m.id });
      }
    }
  }
  return { links, held, groups: out };
}

const POD_SQL = `SELECT s.id, s.pod_id, p.course_code,
    s.target_audio_id::text AS target_audio_id, s.known_audio_id::text AS known_audio_id,
    s.sentence_audio_ids::text[] AS sentence_audio_ids, s.sentence_known_audio_ids::text[] AS sentence_known_audio_ids,
    s.takeg_audio_ids::text[] AS takeg_audio_ids
  FROM listening_pod_sentences s JOIN listening_pods p ON p.id = s.pod_id
  WHERE p.slug NOT LIKE '%-retired-%' AND ($1::text IS NULL OR p.course_code = $1)`;

async function linkBatch(course, links, apply) {
  const res = await fetch(`${POPTY}/api/production/${course}/link-clip`, {
    method: 'POST', signal: AbortSignal.timeout(600000),
    headers: { 'Content-Type': 'application/json', 'x-agent-id': 'tools/pods/repoint-pod-clip-twins.cjs (job #813)', 'x-agent-role': 'agent' },
    body: JSON.stringify({ dryRun: !apply, links: links.map(({ course: _c, ...l }) => l) }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main(argv = process.argv.slice(2)) {
  const arg = (n) => (argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || null;
  const apply = argv.includes('--apply');
  const language = arg('language');
  if (!language) { console.error('name --language=<code> (e.g. eng)'); process.exit(1); }
  const pg = await connect();
  let rows, clips;
  try {
    rows = (await pg.query(POD_SQL, [arg('course')])).rows;
    const ids = [...new Set(rows.flatMap((r) => SLOTS.flatMap(([c]) => (Array.isArray(r[c]) ? r[c] : [r[c]]))).filter(Boolean))];
    clips = new Map((await clipsById(pg, ids, { cols: COLS })).map((c) => [c.id, c]));
  } finally { await pg.end(); }
  const plan = planRepoints(rows, clips, { language });
  const dir = evidencePath('tools/pods/repoint-pod-clip-twins');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '');
  const byCourse = new Map();
  for (const l of plan.links) (byCourse.get(l.course) || byCourse.set(l.course, []).get(l.course)).push(l);
  const results = [];
  let changed = 0, refused = 0;
  for (const [course, ls] of [...byCourse].sort()) {
    for (let i = 0; i < ls.length; i += 500) {
      const { status, body } = await linkBatch(course, ls.slice(i, i + 500), apply);
      const rs = body.results || [{ ok: false, status, error: body.error || body.code || 'no results' }];
      for (const r of rs) { results.push({ course, ...r }); if (r.ok && r.changed) changed++; if (!r.ok) refused++; }
    }
    console.log(`${apply ? 'APPLY' : 'DRY'} ${course}: ${ls.length} links`);
  }
  const summary = { apply, language, groups: plan.groups.length, links: plan.links.length, changed, refused, held: plan.held.length,
    refusedByCode: results.filter((r) => !r.ok).reduce((m, r) => ((m[r.code || 'ERR'] = (m[r.code || 'ERR'] || 0) + 1), m), {}) };
  const file = path.join(dir, `${apply ? 'applied' : 'dry'}-${language}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify({ summary, groups: plan.groups, held: plan.held, results }, null, 1));
  console.log(JSON.stringify({ ...summary, file }, null, 1));
}

module.exports = { planRepoints };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
