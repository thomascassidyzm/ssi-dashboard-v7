#!/usr/bin/env node
'use strict';
/**
 * link-pod-from-siblings.cjs — fill a staged pod's EMPTY clip slots with clips that already exist in sibling courses,
 * as a plan for switch-pod-clip-pointers.cjs (job #340, 2026-11-02).
 *
 * WHY. Ten courses (eng_for_{ara,jpn,kor,zho}, {deu,fra,ita,spa,zho}_for_jpn, eus_for_spa) hold a complete, approved
 * 231-line Pod 1 text staged at `pod-1-231` with no audio on either side. Every line is already recorded somewhere:
 * the target side is the target language's own pod (eng_for_fra's English, deu_for_eng's German…), and the known side
 * is the target side of the known language's pod (zho_for_eng's Chinese, jpn_for_eng's Japanese…). Tom, 2 Nov: move
 * every course onto the 22-scene Pod 1 — "5. We can do that now". Linking is free; rendering 231×2 lines is not.
 *
 * THE RULES IT ENFORCES (each refusal names its row):
 *   - A clip qualifies only if it has the slot's language (audio-reuse-planner's sameLanguage), the same text under the
 *     ONE audio normaliser (text-normalize.cjs normalizeForAudio — case folded, a trailing ? kept), and a real S3
 *     object (no `pending/` key). Rows are paired by global_order AND (scene, sentence); a structure drift refuses.
 *   - FILL-ONLY. A slot that already holds a clip is never replaced; its clip still counts towards that speaker's voice.
 *   - ONE SIBLING PER SIDE. Each side's clips come from one named sibling pod, so each speaker carries that sibling's
 *     voice on that side. A speaker whose linked clips name two voices (bare-vs-prefixed ids are one voice, Tom
 *     2026-08-07 via relink-voice-guard.cjs) is refused, never resolved by picking one.
 *   - THE FLIP'S OWN CAST GATE. The projected pod (rows + cast + clips) is run through pod-cast-gate.cjs checkPodCast,
 *     the same call pod-switchover.cjs makes, so a plan this tool calls clean is a pod the switchover will accept.
 *   - SPEAKER LABELS follow the TARGET sibling: if it carries a relabel (#325's scene-21 "Narrator 2", Kai's #508
 *     ruling), the plan carries it too. --relabel adds one explicitly where the sibling does not.
 *   - HOLES are lines no sibling row voices with the right text (the five lines that name the language being learnt
 *     differ per course). Each hole is looked up estate-wide in course_audio by (speaker's voice, language, text) —
 *     the indexed key — and otherwise reported, never rendered here. Render through POST /api/audio/render, rerun.
 *
 * Whole-turn slots only (target_audio_id, known_audio_id, speaker): a staged row's split arrays are empty, and filling
 * them would change its unit count, which switch-pod-clip-pointers refuses as a learner-slot move.
 *
 *   node tools/pods/link-pod-from-siblings.cjs --course=eng_for_zho --target-from=eng_for_fra:pod-1:target
 *        [--known-from=zho_for_eng:pod-1:target] [--staged=pod-1-231] [--relabel=SC21-S014=Narrator 2@<voice_id>]
 *        [--job=#340] [--apply]
 * Dry run by default: writes the plan + holes to ~/ssi-evidence, exits 0 only if the pod would be fully covered and
 * cast-clean (3 = holes/refusals). --apply hands the clean plan to switch-pod-clip-pointers.cjs --apply, which writes
 * its rollback file first and records the editor identity.
 */
const path = require('path');
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
const { sameLanguage, languageCandidates, bareVoiceId } = require('../../services/audio-reuse-planner.cjs');
const { pickPreferredAudioRow } = require('../../services/shared/audio-link-preference.cjs');
const { checkPodCast } = require('./pod-cast-gate.cjs');
const { canonicalSpeakerName } = require('../pod-voice-colour-n.cjs');

const SIDES = ['target', 'known'];
const isReal = (c) => !!(c && c.s3_key && !String(c.s3_key).startsWith('pending/'));
const textKey = (t) => normalizeForAudio(String(t || ''));
const libKey = (voice, lang, text) => `${bareVoiceId(voice)}|${languageCandidates(lang)[0] || lang}|${textKey(text)}`;
const providerOf = (v) => (String(v).match(/^([a-z]+)_/) || [])[1] || null;

/** "<course>:<slug>:<side>" → { podId, course, side } */
function parseSource(spec) {
  const m = String(spec || '').match(/^([a-z_]+):([a-z0-9-]+)(?::(target|known))?$/);
  if (!m) throw new Error(`source "${spec}" is not <course>:<slug>[:target|known]`);
  return { podId: `${m[1]}:${m[2]}`, course: m[1], side: m[3] || 'target' };
}

/** "SC21-S014=Narrator 2@cartesia_x" → { suffix, speaker, voice } */
function parseRelabel(spec) {
  const m = String(spec || '').match(/^(SC\d+-S\d+)=([^@]+)@(.+)$/);
  if (!m) throw new Error(`relabel "${spec}" is not SC<nn>-S<nnn>=<speaker>@<target voice_id>`);
  return { suffix: m[1], speaker: m[2].trim(), voice: m[3].trim() };
}

/** Is `clip` a valid link for a slot wanting `lang` + `text`? Returns null if so, else the reason. */
function clipRefusal(clip, lang, text) {
  if (!clip) return 'no clip on the sibling row';
  if (!isReal(clip)) return `clip ${clip.id} has no rendered audio`;
  if (!sameLanguage(lang, clip.language)) return `clip ${clip.id} is ${clip.language}, slot wants ${lang}`;
  if (textKey(clip.text) !== textKey(text)) return `text differs: slot "${text}" vs clip "${clip.text}"`;
  return null;
}

/**
 * PURE. Build the link plan.
 * @param staged  { podId, course, speakers, rows[] }  rows: id, scene_number, sentence_number, global_order, speaker,
 *                                                       target_text, known_text, target_audio_id, known_audio_id
 * @param sources { target: {podId, side, speakers, rows[]}, known: {…} }
 * @param langs   { target: 'eng', known: 'zho' }
 * @param clips   Map id → { id, text, voice_id, language, s3_key, origin, created_at } (sibling + staged clips)
 * @param library Map libKey → clip (estate-wide hits for holes; optional)
 * @param relabels [{ suffix, speaker, voice }]
 */
function buildLinkPlan({ staged, sources, langs, clips, library = new Map(), relabels = [], jobLabel = null }) {
  const problems = [];
  const holes = [];
  const linked = { target: 0, known: 0, library: 0, kept: 0 };
  const srcByOrder = {};
  for (const side of SIDES) srcByOrder[side] = new Map(sources[side].rows.map((r) => [r.global_order, r]));
  const relabelOf = new Map(relabels.map((r) => [r.suffix, r]));

  // 1. speaker label per row: the target sibling's label, then any explicit relabel.
  const proj = staged.rows.map((r) => {
    const src = srcByOrder.target.get(r.global_order);
    let speaker = r.speaker;
    if (src && src.speaker !== r.speaker) speaker = src.speaker;
    const rl = relabelOf.get(r.id.split(':').pop());
    if (rl) speaker = rl.speaker;
    return { ...r, speaker };
  });
  for (const rl of relabels) if (!proj.some((r) => r.id.endsWith(`:${rl.suffix}`))) problems.push(`relabel ${rl.suffix}: no such row`);

  // 2. each side: candidate clip per row (existing slot kept; sibling clip only on exact text/language/real).
  const pick = {}; // side → Map rowId → clip
  for (const side of SIDES) {
    const src = sources[side];
    pick[side] = new Map();
    for (const r of proj) {
      const field = `${side}_audio_id`;
      const text = r[`${side}_text`];
      if (r[field]) { // FILL-ONLY: never replaced; still part of the speaker's voice
        const c = clips.get(r[field]);
        if (c) pick[side].set(r.id, { clip: c, kept: true });
        linked.kept++;
        continue;
      }
      const s = srcByOrder[side].get(r.global_order);
      if (!s) { holes.push({ side, row: r, why: `no row at global_order ${r.global_order} in ${src.podId}` }); continue; }
      if (s.scene_number !== r.scene_number || s.sentence_number !== r.sentence_number) {
        problems.push(`${r.id}: ${src.podId} has SC${s.scene_number}/S${s.sentence_number} at global_order ${r.global_order} — structure differs`);
        continue;
      }
      const rl = side === 'target' && relabelOf.get(r.id.split(':').pop());
      const c = clips.get(s[`${src.side}_audio_id`]);
      const why = rl ? `relabelled to ${rl.speaker}, wants voice ${rl.voice}` : clipRefusal(c, langs[side], text);
      if (why) { holes.push({ side, row: r, why, voice: rl ? rl.voice : null }); continue; }
      pick[side].set(r.id, { clip: c });
    }
  }

  // 3. one voice per speaker per side, read off the clips themselves.
  const cast = { target: new Map(), known: new Map() }; // side → canonical speaker → voice_id
  for (const side of SIDES) {
    const seen = new Map();
    for (const r of proj) {
      const p = pick[side].get(r.id);
      if (!p) continue;
      const name = canonicalSpeakerName(r.speaker);
      if (!seen.has(name)) seen.set(name, new Map());
      seen.get(name).set(bareVoiceId(p.clip.voice_id), p.clip.voice_id);
    }
    for (const rl of relabels) if (side === 'target') {
      const name = canonicalSpeakerName(rl.speaker);
      if (!seen.has(name)) seen.set(name, new Map());
      seen.get(name).set(bareVoiceId(rl.voice), rl.voice);
    }
    for (const [name, voices] of seen) {
      if (voices.size > 1) problems.push(`${name} would have ${voices.size} ${side} voices: ${[...voices.values()].join(', ')}`);
      cast[side].set(name, [...voices.values()][0]);
    }
  }

  // 4. holes: estate-wide library hit in the speaker's voice, else reported.
  for (const h of holes.splice(0)) {
    const name = canonicalSpeakerName(h.row.speaker);
    const srcCast = sources[h.side].speakers?.[name]?.[sources[h.side].side];
    const voice = h.voice || cast[h.side].get(name) || srcCast?.voice_id || null;
    const text = h.row[`${h.side}_text`];
    const hit = voice && library.get(libKey(voice, langs[h.side], text));
    if (hit && !clipRefusal(hit, langs[h.side], text)) {
      pick[h.side].set(h.row.id, { clip: hit, library: true });
      if (!cast[h.side].has(name)) cast[h.side].set(name, hit.voice_id);
      linked.library++;
      continue;
    }
    holes.push({ side: h.side, id: h.row.id, go: h.row.global_order, speaker: h.row.speaker, voiceId: voice, language: langs[h.side], text, why: h.why });
  }
  for (const h of holes) h.chars = String(h.text || '').length;

  // 5. the cast block, from the clips (gender/variants from the siblings' cast entries).
  const speakersAfter = {};
  const names = [...new Set(proj.map((r) => canonicalSpeakerName(r.speaker)))].sort();
  for (const name of names) {
    const entry = { gender: null, variants: [...new Set(proj.filter((r) => canonicalSpeakerName(r.speaker) === name).map((r) => r.speaker))].sort() };
    for (const side of SIDES) {
      const s = sources[side];
      const sib = s.speakers?.[name] || s.speakers?.[name.replace(/ \d+$/, '')] || {};
      entry.gender = entry.gender || sib.gender || null;
      const v = cast[side].get(name);
      if (v) entry[side] = { voice_id: v, provider: providerOf(v) || sib[s.side]?.provider || null, locale: langs[side] };
    }
    speakersAfter[name] = entry;
  }

  // 6. plan rows (only what changes) + projected pod for the flip's own cast gate.
  const rows = [];
  for (const r of proj) {
    const orig = staged.rows.find((o) => o.id === r.id);
    const before = {}, after = {};
    for (const side of SIDES) {
      const f = `${side}_audio_id`;
      const p = pick[side].get(r.id);
      if (!orig[f] && p) { before[f] = null; after[f] = p.clip.id; r[f] = p.clip.id; }
    }
    if (r.speaker !== orig.speaker) { before.speaker = orig.speaker; after.speaker = r.speaker; }
    if (Object.keys(after).length) rows.push({ id: r.id, before, after });
    if (pick.target.get(r.id)) linked.target += pick.target.get(r.id).kept ? 0 : 1;
    if (pick.known.get(r.id)) linked.known += pick.known.get(r.id).kept ? 0 : 1;
  }
  const gateClips = {};
  for (const side of SIDES) for (const p of pick[side].values()) gateClips[p.clip.id] = { text: p.clip.text, voice_id: p.clip.voice_id };
  const gate = checkPodCast({ rows: proj, speakers: speakersAfter, track: 'target', clips: gateClips, course: staged.course });
  if (!holes.length) for (const f of gate.failures) problems.push(`cast gate: ${f}`);

  const plan = {
    podId: staged.podId, jobLabel,
    note: `filled from ${sources.target.podId}:${sources.target.side} (target) and ${sources.known.podId}:${sources.known.side} (known) by tools/pods/link-pod-from-siblings.cjs`,
    speakers: { before: staged.speakers || {}, after: speakersAfter },
    rows,
  };
  return { plan, holes, problems, gate, linked, ok: !holes.length && !problems.length };
}

// ---------------------------------------------------------------------------------------------------------------- CLI
const ROW_COLS = 'id, scene_number, sentence_number, global_order, speaker, target_text, known_text, target_audio_id::text AS target_audio_id, known_audio_id::text AS known_audio_id';
const LIB_COLS = 'id::text AS id, course_code, language, voice_id, text, s3_key, origin, created_at';

async function loadPod(pg, podId) {
  const { rows: [pod] } = await pg.query('SELECT id, course_code, speakers FROM listening_pods WHERE id = $1', [podId]);
  if (!pod) throw new Error(`pod ${podId} not found`);
  const { rows } = await pg.query(`SELECT ${ROW_COLS} FROM listening_pod_sentences WHERE pod_id = $1 ORDER BY global_order`, [podId]);
  return { podId, course: pod.course_code, speakers: pod.speakers || {}, rows };
}

/** Estate-wide course_audio rows for each hole, on idx_course_audio_voice_language_text (voice_id, language, text_normalized). */
async function loadLibrary(pg, holes) {
  const lib = new Map();
  for (const h of holes) {
    if (!h.voiceId) continue;
    const voices = [...new Set([h.voiceId, bareVoiceId(h.voiceId)])];
    const { rows } = await pg.query(`SELECT ${LIB_COLS} FROM course_audio WHERE voice_id = ANY($1::text[]) AND language = ANY($2::text[]) AND text_normalized = ANY($3::text[])`,
      [voices, languageCandidates(h.language), [textKey(h.text)]]);
    const k = libKey(h.voiceId, h.language, h.text);
    for (const r of rows) if (isReal(r)) lib.set(k, pickPreferredAudioRow(lib.get(k), r));
  }
  return lib;
}

async function main() {
  const arg = (n) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null; };
  const course = arg('course');
  if (!course || !course.includes('_for_')) throw new Error('--course=<target>_for_<known> is required');
  const [tLang, kLang] = course.split('_for_');
  const stagedSlug = arg('staged') || 'pod-1-231';
  const tSpec = arg('target-from') || (tLang !== 'eng' ? `${tLang}_for_eng:pod-1:target` : null);
  const kSpec = arg('known-from') || (kLang !== 'eng' ? `${kLang}_for_eng:pod-1:target` : null);
  if (!tSpec || !kSpec) throw new Error('name --target-from / --known-from (no default for an English side)');
  const relabels = process.argv.filter((a) => a.startsWith('--relabel=')).map((a) => parseRelabel(a.slice(10)));
  const apply = process.argv.includes('--apply');

  const fs = require('fs');
  const db = require('../../services/shared/agent-db.cjs');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = await db.connect();
  let result;
  try {
    const staged = await loadPod(pg, `${course}:${stagedSlug}`);
    const sources = {};
    for (const [side, spec] of [['target', tSpec], ['known', kSpec]]) {
      const s = parseSource(spec);
      if (s.course === course) throw new Error(`${side} source ${spec} is the course itself`);
      sources[side] = { ...(await loadPod(pg, s.podId)), side: s.side };
    }
    const ids = [...staged.rows, ...sources.target.rows, ...sources.known.rows]
      .flatMap((r) => [r.target_audio_id, r.known_audio_id]).filter(Boolean);
    const clips = await db.clipMap(pg, ids, { cols: LIB_COLS });
    const input = { staged, sources, langs: { target: tLang, known: kLang }, clips, relabels, jobLabel: arg('job') };
    result = buildLinkPlan(input);
    if (result.holes.length) result = buildLinkPlan({ ...input, library: await loadLibrary(pg, result.holes) });
  } finally { await pg.end(); }

  const { plan, holes, problems, gate, linked } = result;
  const dir = evidencePath(`docs/pods/pod1-sibling-link-${new Date().toISOString().slice(0, 10)}`);
  fs.mkdirSync(dir, { recursive: true });
  const planFile = path.join(dir, `${course}.link.plan.json`);
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 1));
  fs.writeFileSync(path.join(dir, `${course}.link.holes.json`), JSON.stringify(holes, null, 1));
  console.log(`${plan.podId}: target from ${tSpec}, known from ${kSpec}`);
  console.log(`  linked ${linked.target} target + ${linked.known} known clips from siblings, ${linked.library} from the library; ${linked.kept} slots already filled (kept)`);
  console.log(`  relabels: ${plan.rows.filter((r) => 'speaker' in r.after).map((r) => `${r.id.split(':').pop()} ${r.before.speaker}→${r.after.speaker}`).join(', ') || 'none'}`);
  console.log(`  cast gate (target track): ${gate.voicesInUse.length} voice(s), ${gate.sameVoicePairs.length} same-voice pair(s), ${gate.uncast.length} uncast, ${gate.offCastClips || 0} off-cast, ${gate.wrongRowClips || 0} wrong-row`);
  console.log(`  plan: ${planFile} (${plan.rows.length} rows)`);
  if (holes.length) {
    console.error(`REFUSED — ${holes.length} slot(s) have no existing clip (${holes.reduce((n, h) => n + h.chars, 0)} chars to render):`);
    for (const h of holes) console.error(`  ${h.side} ${h.id} ${h.speaker} [${h.voiceId}] "${h.text}" — ${h.why}`);
  }
  if (problems.length) console.error(`REFUSED — ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  if (!result.ok) process.exit(3);
  if (!apply) { console.log('dry run clean — pass --apply to link'); return; }
  require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'switch-pod-clip-pointers.cjs'), planFile, '--apply'], { stdio: 'inherit' });
}

module.exports = { buildLinkPlan, clipRefusal, parseSource, parseRelabel, libKey };

if (require.main === module) main().catch((e) => { console.error(`FAILED: ${e.message}`); process.exit(1); });
