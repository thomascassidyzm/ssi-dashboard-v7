#!/usr/bin/env node
/**
 * READ-ONLY audit: where does the CAST voice disagree with the voice that
 * ACTUALLY RENDERED each clip?  Job #398.  No writes, anywhere.
 *
 * Two comparisons, deliberately kept apart:
 *   LAYER B (stored)  courses.voice_config.voices.<role>  vs course_audio.voice_id
 *   LAYER A (cast)    applyLanguageCast(...) resolution   vs course_audio.voice_id
 * Both sides canonicalised with tryCanonicalVoiceId, so a match is within a
 * provider by construction.
 */
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../../..');
const { tryCanonicalVoiceId } = require(REPO + '/services/shared/clip-identity.cjs');
const { applyLanguageCast } = require(REPO + '/services/shared/language-voice-cast.cjs');
const { isHumanVoiceCourse, isHumanVoiceLang } = require(REPO + '/services/shared/human-voice-courses.cjs');
const { castKeyForCourse, baseLanguageOfCastKey } = require(REPO + '/services/shared/cast-language-key.cjs');

const S = process.env.CS_SCRATCH;
const J = (f) => JSON.parse(fs.readFileSync(path.join(S, f), 'utf8'));
const courses = J('courses.json');
const voices = J('voices.json');
const roles = J('roles.json');
const humanRows = J('humanrows.json');

const key = (c, r) => c + '||' + r;

// (course, role) -> [{voice_id, origin, n}]
function loadAgg(file) {
  const m = new Map();
  for (const line of fs.readFileSync(path.join(S, file), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const [course_code, role, voice_id, origin, n] = line.split('\t');
    const k = key(course_code, role);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push({ voice_id, origin, n: Number(n) });
  }
  return m;
}
// LIBRARY = every course_audio row. LINKED = only the rows a seed or a practice
// phrase actually points at, i.e. what a learner is served. The LINKED set is
// the unit this audit judges on; the library count is reported beside it because
// the gap between them is dead stock, not served audio.
const lib = loadAgg('agg.tsv');
const agg = loadAgg('linked.tsv');

const canon = (id, provider) =>
  (provider ? tryCanonicalVoiceId(id, { provider }) : null) || tryCanonicalVoiceId(id) || null;

const ROLES = ['known', 'target1', 'target2', 'presentation', 'instruction', 'encouragement'];
const out = [];

for (const c of courses) {
  const vc = c.voice_config || {};
  let cast;
  try {
    cast = applyLanguageCast({ voiceConfig: vc, course: c, roles, voices, humanRows });
  } catch (e) {
    cast = { config: vc, decisions: [{ role: null, source: 'ERROR', reason: String(e.message) }] };
  }
  const decByRole = new Map(cast.decisions.filter(d => d.role).map(d => [d.role, d]));

  const rolesSeen = new Set([...ROLES, ...Object.keys(vc.voices || {})]);
  for (const m of [agg, lib]) for (const k of m.keys()) {
    const [cc, r] = k.split('||');
    if (cc === c.course_code) rolesSeen.add(r);
  }

  for (const role of rolesSeen) {
    // Only these four roles have link columns on course_seeds /
    // course_practice_phrases, so they are the only ones whose "what a learner
    // is served" set is knowable. For every other role (instruction,
    // encouragement, welcome, pod_*) nothing points at the clip from content,
    // so the library IS the only unit there is and saying otherwise would
    // report 0 served clips for audio that plainly plays.
    const LINKED_ROLES = ['known', 'target1', 'target2', 'presentation'];
    const linkable = LINKED_ROLES.includes(role);
    const clips = (linkable ? agg : lib).get(key(c.course_code, role)) || [];
    const stored = (vc.voices || {})[role] || null;
    const storedId = (stored && (stored.voiceId || stored.voice_id)) || null;
    const storedCanon = storedId ? canon(storedId, stored.provider) : null;
    const castCfg = ((cast.config && cast.config.voices) || {})[role] || null;
    const castId = (castCfg && (castCfg.voiceId || castCfg.voice_id)) || null;
    const castCanon = castId ? canon(castId, castCfg.provider) : null;
    const dec = decByRole.get(role) || null;

    const total = clips.reduce((s, x) => s + x.n, 0);
    const byCanon = new Map();
    for (const x of clips) {
      const cid = canon(x.voice_id) || ('UNRESOLVED:' + x.voice_id);
      const e = byCanon.get(cid) || { id: cid, n: 0, origins: new Set(), raw: new Set() };
      e.n += x.n; e.origins.add(x.origin); e.raw.add(x.voice_id);
      byCanon.set(cid, e);
    }
    const rendered = [...byCanon.values()].sort((a, b) => b.n - a.n).map(e => ({
      id: e.id, n: e.n, share: total ? e.n / total : 0,
      origins: [...e.origins], raw: [...e.raw],
    }));

    const humanN = rendered
      .filter(r => r.origins.includes('human') || r.origins.includes('legacy_import') || r.id.startsWith('human_'))
      .reduce((s, r) => s + r.n, 0);
    const matchN = storedCanon ? rendered.filter(r => r.id === storedCanon).reduce((s, r) => s + r.n, 0) : 0;
    const castMatchN = castCanon ? rendered.filter(r => r.id === castCanon).reduce((s, r) => s + r.n, 0) : 0;

    const targetKey = castKeyForCourse(c, 'target');
    const knownKey = castKeyForCourse(c, 'known');
    const spokenKey = (role === 'known' || role === 'instruction' || role === 'encouragement') ? knownKey : targetKey;
    const humanLangRole = isHumanVoiceCourse(c.course_code) || isHumanVoiceLang(baseLanguageOfCastKey(spokenKey || ''));

    let cls;
    if (total === 0) cls = storedCanon ? 'no-clips' : 'no-clips-no-config';
    else if (!storedCanon) cls = 'unconfigured-slot';
    else if (matchN === total) cls = 'match';
    else if (humanLangRole && humanN > 0) cls = 'human-vs-TTS-expected';
    else if (matchN === 0) cls = 'genuine-mismatch-total';
    else cls = 'genuine-mismatch-partial';

    out.push({
      course_code: c.course_code, role,
      target_lang: c.target_lang, known_lang: c.known_lang,
      cast_key: spokenKey,
      human_voice_policy: humanLangRole,
      stored_voice: storedId, stored_canon: storedCanon,
      stored_provider: (stored && stored.provider) || null,
      cast_voice: castId, cast_canon: castCanon, cast_source: (dec && dec.source) || null,
      clips_total: total, clips_matching_stored: matchN, clips_matching_cast: castMatchN,
      unit: linkable ? 'linked-slots' : 'library-rows',
      library_total: (lib.get(key(c.course_code, role)) || []).reduce((s2, x) => s2 + x.n, 0),
      stored_match_share: total ? matchN / total : null,
      cast_match_share: total ? castMatchN / total : null,
      rendered, classification: cls,
      new_app_status: c.new_app_status, released: !!c.released_at,
    });
  }
}

fs.writeFileSync(path.join(S, 'audit.json'), JSON.stringify(out, null, 1));
const tally = {};
for (const r of out) tally[r.classification] = (tally[r.classification] || 0) + 1;
console.log('rows', out.length);
console.log(tally);
