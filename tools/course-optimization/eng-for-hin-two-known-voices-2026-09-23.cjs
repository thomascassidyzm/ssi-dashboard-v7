#!/usr/bin/env node
'use strict';
// eng_for_hin — TWO KNOWN VOICES, ONE FORM PER PHRASE (Kai's rulings 2026-09-23 20:13Z and 20:23Z; job #941·H,
// built from the scoping at d/d8edb3da, #938·H). Kriti (f) and Rehan (m) share the Hindi known side; every
// gendered practice phrase gets ONE form in the matching voice, fixed for ever and stamped on the row; gendered
// seed lines are split half and half; gendered LEGO debuts use the female form; presentations stay in Kriti and
// quote both forms. Never both forms of one phrase (Tom: no doubling). The engine is generic
// (services/known-gender/gendered-known-plan.cjs, tools/course-optimization/gendered-known-variants.cjs); this
// tool is the course-specific run: it puts the PAIR LIST OF RECORD in order first, then the voices, then applies.
//
// THE PAIR LIST — THE SOURCE OF TRUTH IS WHAT THE DASHBOARD SHOWS (Kai, 2026-09-23 20:26Z). The Popty seed view
// shows the other-gender wording of a known line through src/services/supabase.js getGenderPairs, which reads
// course_gender_expansions (text_side='known') and keys the pair on the EXACT original_text / expanded_m /
// expanded_f (the same rule as gender-haiku-service loadGenderMap). That table is the pair list this tool uses;
// nothing else stores a second form (no column on the row, no variants table, no inline markup). It held 2,564
// pairs from 2026-09-03 (job #200·E, machine-written); they cover 2,155 of the 2,753 gendered phrase rows, 120
// of 145 gendered seeds and 88 of 138 gendered LEGOs. cs/883 detected 678 more pairs on 2026-09-23 (Claude CLI,
// verified by re-asking) ONLY for texts with no stored pair, so a stored pair always wins by construction; where
// the detector was probed against 214 stored pairs it agreed on 210 and was wrong on the other 4 (the stored
// forms stand — see verify-stored-pairs.json in the evidence dir). The 678 were never stored, and are stored here.
// Nobody has read the female forms: Shuchita proofread the LIVE (male) texts, not the pair list. Three things
// make the list usable:
//   1. NUKTA: Kai's course-wide nukta ruling (16:30Z, 459 rows) moved the live spelling after the pairs were
//      written (यकीन → यक़ीन …), so 154 live rows no longer matched their pair. Both forms of every pair are
//      normalised with the same NUKTA_PAIRS table the sweep used.
//   2. THE 678 DETECTED PAIRS are stored, so phase8 — which reads stored pairs only — voices those rows by
//      grammar instead of by coin.
//   3. NOT-SPEAKER PAIRS ARE REMOVED. A pair is only usable when its m/f difference is the SPEAKER's gender.
//      The detectors also "feminised" third-person verbs (वह चाहता/चाहती = he/she), ergative object agreement
//      (मैंने फ़िल्म देखी) and impersonal frames (मुझे लगता है, मुझे लग रहा है, मुझे विश्वास नहीं हो रहा). Every
//      such pair was found by the pair-agreement judge (services/known-gender/pair-speaker-agreement.cjs, Claude
//      CLI over all 3,036 gendered rows) plus the Shuchita rulebook's frame rules, and is listed with its reason
//      in eng-for-hin-gendered-pairs-not-speaker-2026-09-23.json. Removing the pair changes NO live text: the
//      row keeps its proofread wording and is voiced by the neutral hash like any other neutral line.
//      This is also where the four real "gender errors" of d/d8edb3da §4 land (3 × मुझे लग रही है, 1 × मुझे
//      विश्वास नहीं हो रही, and फ़िल्म देखा): they were never speaker pairs. The three "third-person forms wrongly
//      feminised" in that list (S0205L01U06, S0236L02U06, S0236L03U06) were misread — the rulebook flagged
//      them for ENGLISH TENSE (H-EMBEDDED-TENSE), the वाली है is correct for "she", and their female forms
//      feminise only the speaker; they stay. किसी → कोई (S0580) is Shuchita's seed-578 precedent applied to a
//      row whose LEGO itself carries किसी across ten live rows; not a gender question and not 100% certain, so
//      it is left and reported.
//
//   node tools/course-optimization/eng-for-hin-two-known-voices-2026-09-23.cjs            # dry run: pair fixes + plan
//   node tools/course-optimization/eng-for-hin-two-known-voices-2026-09-23.cjs --apply    # pairs, voices, plan, apply
//
// Identified writes, one content edit event for the content, evidence in ~/ssi-evidence; NO TTS — the audio pass
// is queued for approval with the character count against the 8M/month Cartesia budget.

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const G = require('./gendered-known-variants.cjs');
const { NUKTA_PAIRS } = require('./eng-for-hin-shuchita-rulebook.cjs');
const { normalizeKnownKey, roleHasGenderedVoices } = require('../../services/shared/known-voice-gender.cjs');

const COURSE = 'eng_for_hin';
const JOB = '#941·H';
const SWEEP = 'eng-for-hin-two-known-voices-2026-09-23';
const NOT_SPEAKER_FILE = path.join(__dirname, 'eng-for-hin-gendered-pairs-not-speaker-2026-09-23.json');
const DETECT_FILE = process.env.ENG_FOR_HIN_DETECT_FILE
  || path.join(process.env.HOME || '', 'ssi-evidence', 'ssi-dashboard-v7', 'tools', 'course-optimization', 'gendered-known-variants', 'eng_for_hin', 'detect-2026-09-23T15-23-21-074Z-retried.json');

const KRITI = { name: 'Kriti', gender: 'f', voiceId: 'cartesia_5283efe8-07d1-4e3a-b615-2ae4a81c1b73', provider: 'cartesia', language: 'hi-IN' };
const REHAN = { name: 'Rehan', gender: 'm', voiceId: 'cartesia_205fc552-2cce-4307-baa1-598b9dc3dd01', provider: 'cartesia', language: 'hi-IN' };
const CAST_RULING = `Kai, 2026-09-23 20:13Z / 20:23Z (job ${JOB}, scoped at d/d8edb3da): TWO known voices — Kriti (f) and Rehan (m). Each gendered known line is spoken in the voice of its own grammar; neutral lines are hash-split; presentations stay in Kriti and quote both forms. Reverses the one-known-voice ruling of 17:47Z for this course. Written by tools/course-optimization/${SWEEP}.cjs.`;

const NUKTA = '़';
function nukta(h) {
  if (!h) return h;
  for (const [plain, dotted] of NUKTA_PAIRS) {
    if (plain === dotted) continue;
    h = h.replace(new RegExp(plain, 'gu'), (w, i) => (h[i + 1] === NUKTA ? w : dotted));
  }
  return h;
}

/** The pair-list work, computed against the stored rows. Pure given its inputs. */
function planPairFixes(storedPairs, detectResults, notSpeaker) {
  const nuktaUpdates = [];
  for (const p of storedPairs) {
    const m = nukta(p.expanded_m), f = nukta(p.expanded_f), o = nukta(p.original_text);
    if (m !== p.expanded_m || f !== p.expanded_f || o !== p.original_text) nuktaUpdates.push({ id: p.id, from: { m: p.expanded_m, f: p.expanded_f }, to: { original_text: o, expanded_m: m, expanded_f: f } });
  }
  const storedKeys = new Set();
  for (const p of storedPairs) { storedKeys.add(normalizeKnownKey(nukta(p.expanded_m))); storedKeys.add(normalizeKnownKey(nukta(p.expanded_f))); }
  const inserts = [];
  const seen = new Set();
  for (const r of detectResults || []) {
    if (r.status !== 'gendered' || !r.m || !r.f) continue;
    const m = nukta(r.m), f = nukta(r.f), o = nukta(r.text);
    if (normalizeKnownKey(m) === normalizeKnownKey(f)) continue;
    if (storedKeys.has(normalizeKnownKey(m)) || storedKeys.has(normalizeKnownKey(f))) continue;
    if (seen.has(o)) continue;
    seen.add(o);
    inserts.push({ course_code: COURSE, original_text: o, language: 'hin', expanded_m: m, expanded_f: f, text_side: 'known' });
  }
  // removals: any stored or to-be-inserted pair whose either form matches a not-speaker entry
  const notKeys = new Map();
  for (const n of notSpeaker) { notKeys.set(normalizeKnownKey(nukta(n.m)), n); notKeys.set(normalizeKnownKey(nukta(n.f)), n); }
  const removals = [];
  for (const p of storedPairs) {
    const hit = notKeys.get(normalizeKnownKey(nukta(p.expanded_m))) || notKeys.get(normalizeKnownKey(nukta(p.expanded_f)));
    if (hit) removals.push({ id: p.id, m: p.expanded_m, f: p.expanded_f, why: hit.why, source: hit.source });
  }
  const insertsKept = inserts.filter(r => !(notKeys.has(normalizeKnownKey(r.expanded_m)) || notKeys.has(normalizeKnownKey(r.expanded_f))));
  const insertsDropped = inserts.length - insertsKept.length;
  return { nuktaUpdates, inserts: insertsKept, insertsDropped, removals };
}

async function applyPairFixes(sb, fixes) {
  let updated = 0, inserted = 0, removed = 0;
  for (const u of fixes.nuktaUpdates) {
    const { error } = await sb.from('course_gender_expansions').update(u.to).eq('id', u.id);
    if (error) throw new Error(`nukta update ${u.id}: ${error.message}`);
    updated++;
  }
  for (let i = 0; i < fixes.inserts.length; i += 500) {
    const batch = fixes.inserts.slice(i, i + 500);
    const { error } = await sb.from('course_gender_expansions').upsert(batch, { onConflict: 'course_code,original_text,text_side' });
    if (error) throw new Error(`pair insert batch ${i}: ${error.message}`);
    inserted += batch.length;
  }
  for (const r of fixes.removals) {
    const { error } = await sb.from('course_gender_expansions').delete().eq('id', r.id).eq('course_code', COURSE).eq('text_side', 'known');
    if (error) throw new Error(`pair removal ${r.id}: ${error.message}`);
    removed++;
  }
  return { updated, inserted, removed };
}

function withTwoKnownVoices(voiceConfig) {
  const vc = JSON.parse(JSON.stringify(voiceConfig || {}));
  vc.voices = vc.voices || {};
  const known = vc.voices.known || {};
  vc.voices.known = {
    ...known,
    ...KRITI, // the role default stays Kriti — a text that resolves to no gender is Kriti's
    byGender: { m: { ...REHAN }, f: { ...KRITI } },
    castRuling: CAST_RULING,
    previousCastRuling: known.castRuling || null,
    settings: known.settings || { speed: 1 },
  };
  // presentation stays a single Kriti voice: no byGender there, by ruling
  if (vc.voices.presentation && vc.voices.presentation.byGender) delete vc.voices.presentation.byGender;
  return vc;
}

async function main() {
  const APPLY = process.argv.includes('--apply');
  const sb = G.supa();
  const outDir = G.outDirFor(COURSE);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const notSpeaker = fs.existsSync(NOT_SPEAKER_FILE) ? JSON.parse(fs.readFileSync(NOT_SPEAKER_FILE, 'utf8')) : [];
  const detect = fs.existsSync(DETECT_FILE) ? JSON.parse(fs.readFileSync(DETECT_FILE, 'utf8')).results : [];
  if (!detect.length) console.log(`note: no detect file at ${DETECT_FILE} — no detected pairs to store`);

  // ── 1. the pair list ──
  let loaded = await G.loadCourse(sb, COURSE);
  const fixes = planPairFixes(loaded.storedPairs, detect, notSpeaker);
  console.log(`pair list: ${loaded.storedPairs.length} stored; nukta updates ${fixes.nuktaUpdates.length}, detected pairs to store ${fixes.inserts.length} (${fixes.insertsDropped} dropped as not-speaker), not-speaker removals ${fixes.removals.length} (from ${notSpeaker.length} listed)`);
  fs.writeFileSync(path.join(outDir, `pair-fixes-${stamp}.json`), JSON.stringify(fixes, null, 1));
  if (APPLY) {
    const r = await applyPairFixes(sb, fixes);
    console.log(`pair list applied: ${JSON.stringify(r)}`);
    loaded = await G.loadCourse(sb, COURSE);
  } else {
    // preview the plan on the pair list AS IT WOULD BE
    const removedIds = new Set(fixes.removals.map(r => r.id));
    loaded.pairs = [
      ...loaded.storedPairs.filter(p => !removedIds.has(p.id)).map(p => ({ ...p, expanded_m: nukta(p.expanded_m), expanded_f: nukta(p.expanded_f) })),
      ...fixes.inserts,
    ].filter(p => normalizeKnownKey(p.expanded_m) !== normalizeKnownKey(p.expanded_f));
  }

  // ── 2. the voices ──
  const vc = withTwoKnownVoices(loaded.course.voice_config);
  if (APPLY) {
    const { error } = await sb.from('courses').update({ voice_config: vc }).eq('course_code', COURSE);
    if (error) throw new Error(`voice_config: ${error.message}`);
    loaded.course.voice_config = vc;
    console.log(`voice_config: known.byGender = m ${REHAN.name} / f ${KRITI.name}; presentation stays ${KRITI.name}`);
  } else {
    loaded.course.voice_config = vc;
    console.log(`voice_config (preview): known.byGender = m ${REHAN.name} / f ${KRITI.name}`);
  }
  if (!roleHasGenderedVoices(vc.voices, 'known')) throw new Error('voice config did not take');

  // ── 3. the plan ──
  const plan = G.planCourse({ courseCode: COURSE, ...loaded }, { stamp });
  console.log(G.summarise(plan));
  if (plan.notes.length) console.log(`notes (${plan.notes.length}):\n` + plan.notes.map(n => `  ${n.id}: ${n.reason}`).join('\n'));
  if (!APPLY) { console.log('dry run — nothing written'); return; }

  // ── 4. apply ──
  const result = await G.applyPlan(sb, COURSE, plan, { identityLabel: SWEEP, reasonPrefix: `${SWEEP} (Kai, job ${JOB}): `, phrases: loaded.phrases });
  console.log(`applied: ${JSON.stringify({ ...result, skippedMoved: result.skippedMoved.length, audioPassReason: undefined })}`);
  if (result.skippedMoved.length) console.log('skipped (row moved under us):', result.skippedMoved);
  fs.writeFileSync(path.join(outDir, `apply-result-${stamp}.json`), JSON.stringify({ result, fixes: { updated: fixes.nuktaUpdates.length, inserted: fixes.inserts.length, removed: fixes.removals.length } }, null, 1));
}

module.exports = { planPairFixes, withTwoKnownVoices, nukta, KRITI, REHAN };
if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
