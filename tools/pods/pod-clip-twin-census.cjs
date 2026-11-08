#!/usr/bin/env node
'use strict';
/**
 * POD CLIP TWIN CENSUS (job #813, 2026-11-08) — READ-ONLY. How many pod slots play a SECOND take of words a voice has
 * already recorded? Tom: "Why would we HAVE different copies? What would be the point of that? Unless the cuts are
 * different". The deu_at/fin/spa pod-1 Tom-006 copies were exactly that: the same words in the same voice, rendered
 * again because the text carried phase 8's pod pause cue (" … ") — see withoutPodPauseCues in
 * services/shared/text-normalize.cjs, where the lookup now folds it.
 *
 * A TWIN GROUP is every clip linked from any pod slot (target/known whole turn, sentence_audio_ids,
 * sentence_known_audio_ids, takeg_audio_ids) that shares (language, voice, words) with another, where words are
 * normalizeForAudio(withoutPodPauseCues(text)) — case folded, a trailing ? kept (a question is its own take), the pod
 * pause cue removed, nothing else. Per group:
 *   ids        distinct course_audio ids;   objects  distinct s3 objects (ids sharing one object are pointers, not takes)
 *   cueOnly    the stored texts differ ONLY by the pause cue (the #813 fork)
 *   pods       which pods link which id — a second take only matters where a slot plays it
 * Headline: groups with more than one S3 OBJECT (a voice recorded the same words twice), and of those how many the
 * cue caused. Nothing is repointed here.
 *
 *   set -a; . ~/ssi-restore/qa-copy.env; set +a
 *   node tools/pods/pod-clip-twin-census.cjs [--served] [--json out.json] [--md out.md]
 *     --served   only each course's core pod-1 base rows (what learners hear); default: every pod
 */
const fs = require('fs');
const { connect, clipsById } = require('../../services/shared/agent-db.cjs');
const { normalizeForAudio, withoutPodPauseCues } = require('../../services/shared/text-normalize.cjs');
const { tryCanonicalLanguage } = require('../../services/shared/clip-identity.cjs');

const SLOTS = [
  ['target_audio_id', 'target'], ['known_audio_id', 'known'],
  ['sentence_audio_ids', 'segment'], ['sentence_known_audio_ids', 'knownsegment'], ['takeg_audio_ids', 'takeg'],
];

/** One voice whatever the provider prefix ('cartesia_x' and 'x' are one voice). */
const voiceKey = (v) => (v ? String(v).replace(/^(xai|azure|cartesia|elevenlabs|google|openai)_/i, '').toLowerCase() : null);
const langKey = (l) => (l ? tryCanonicalLanguage(l) || String(l).toLowerCase() : null);
const wordsKey = (t) => normalizeForAudio(withoutPodPauseCues(t));

/** Pure. rows = pod sentences; clips = Map id → course_audio row. Returns the twin groups, largest first. */
function twinGroups(rows, clips) {
  const uses = new Map(); // clip id → [{pod, line, slot}]
  for (const r of rows) for (const [col, slot] of SLOTS) {
    const v = r[col];
    for (const id of (Array.isArray(v) ? v : [v])) {
      if (!id) continue;
      (uses.get(String(id)) || uses.set(String(id), []).get(String(id))).push({ pod: r.pod_id, line: r.id, slot });
    }
  }
  const groups = new Map();
  for (const [id, where] of uses) {
    const c = clips.get(id);
    if (!c || c.text == null || !c.voice_id) continue;
    const k = `${langKey(c.language)}\u001f${voiceKey(c.voice_id)}\u001f${wordsKey(c.text)}`;
    (groups.get(k) || groups.set(k, []).get(k)).push({ id, text: c.text, voice: c.voice_id, s3: c.s3_key, created_at: c.created_at, origin: c.origin, where });
  }
  const out = [];
  for (const [k, members] of groups) {
    if (members.length < 2) continue;
    const [language, voice, words] = k.split('\u001f');
    const objects = new Set(members.map((m) => m.s3)).size;
    const stored = new Set(members.map((m) => normalizeForAudio(m.text)));
    out.push({ language, voice, words, ids: members.length, objects, cueOnly: stored.size > 1, members });
  }
  return out.sort((a, b) => b.objects - a.objects || b.ids - a.ids || a.words.localeCompare(b.words));
}

/** Pure. The counts the report leads with. */
function summarise(groups) {
  const takes = groups.filter((g) => g.objects > 1);
  return {
    twinGroups: groups.length,
    secondTakeGroups: takes.length,
    extraTakes: takes.reduce((n, g) => n + g.objects - 1, 0),
    cueCausedGroups: takes.filter((g) => g.cueOnly).length,
    pointerOnlyGroups: groups.length - takes.length,
  };
}

function markdown(groups, sum, served) {
  const lines = [`# Pod clip twins (${served ? 'served pod-1 only' : 'every pod'})`, '',
    `Second takes (same language, voice and words, more than one recording): **${sum.secondTakeGroups}** groups, ${sum.extraTakes} extra takes; ${sum.cueCausedGroups} of the groups differ only by the pod pause cue. Pointer-only twins (several ids, one recording): ${sum.pointerOnlyGroups}.`, '',
    '| language | voice | words | takes | ids | cue-only | clips (pods) |', '|---|---|---|---|---|---|---|'];
  for (const g of groups.filter((x) => x.objects > 1)) {
    const clips = g.members.map((m) => `${m.id.slice(0, 8)} (${[...new Set(m.where.map((w) => w.pod))].join(', ')})`).join('; ');
    lines.push(`| ${g.language} | ${g.voice} | ${g.words.replace(/\|/g, '/')} | ${g.objects} | ${g.ids} | ${g.cueOnly ? 'yes' : ''} | ${clips} |`);
  }
  return lines.join('\n') + '\n';
}

const POD_SQL = `SELECT s.id, s.pod_id,
    s.target_audio_id::text AS target_audio_id, s.known_audio_id::text AS known_audio_id,
    s.sentence_audio_ids::text[] AS sentence_audio_ids, s.sentence_known_audio_ids::text[] AS sentence_known_audio_ids,
    s.takeg_audio_ids::text[] AS takeg_audio_ids
  FROM listening_pod_sentences s JOIN listening_pods p ON p.id = s.pod_id
  WHERE NOT $1::boolean OR (p.pod_type = 'core' AND p.slug = 'pod-1' AND s.variant_key IS NULL)`;

async function main(argv = process.argv.slice(2)) {
  const flag = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : null);
  const served = argv.includes('--served');
  const pg = await connect();
  try {
    const rows = (await pg.query(POD_SQL, [served])).rows;
    const ids = [...new Set(rows.flatMap((r) => SLOTS.flatMap(([c]) => (Array.isArray(r[c]) ? r[c] : [r[c]]))).filter(Boolean))];
    const clips = new Map((await clipsById(pg, ids)).map((c) => [c.id, c]));
    const groups = twinGroups(rows, clips);
    const sum = { podRows: rows.length, clips: ids.length, ...summarise(groups) };
    if (flag('--json')) fs.writeFileSync(flag('--json'), JSON.stringify({ served, summary: sum, groups }, null, 1));
    if (flag('--md')) fs.writeFileSync(flag('--md'), markdown(groups, sum, served));
    console.log(JSON.stringify(sum, null, 1));
  } finally { await pg.end(); }
}

module.exports = { twinGroups, summarise, wordsKey, voiceKey };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
