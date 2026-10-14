#!/usr/bin/env node
'use strict';
// tools/course-optimization/hin-for-eng-speaker-gender-2026-10-14.cjs — job #356·Q, hin_for_eng.
//
// THE DEFECT. hin_for_eng's target1 is Aarti (female) and target2 Kunal (male), but the Hindi is written in the
// MALE speaker's form ("मैं हिंदी बोलना चाहता हूँ"), and course_gender_expansions held no row for the course, so
// Aarti said "चाहता" — a woman speaking a man's grammar — in ~800 slots. Ten rows (seeds 177, 645) are the other
// way round: written female, so Kunal says "पूछूँगी".
//
// THE RULE IT APPLIES (estate mechanism, not a new one). Target-side speaker gender is carried by
// course_gender_expansions (text_side='target'), keyed by the row's exact target text: target1 speaks expanded_f,
// target2 speaks expanded_m (services/gender-haiku-service.cjs loadGenderMap). ita_for_eng works this way (canon
// L29, "The female versions": Elsa speaks expanded_f). Kai's rule (2026-09-29, the generator prompt): a female form
// ONLY where the word refers back to the speaker. So only a first-person-SINGULAR NOMINATIVE clause moves —
// मैं / हूँ / -ूँगा — never मुझे-constructions (मुझे लगता है, मुझे पता था), never मैंने (the verb agrees with the
// object), never हम, never आप, never a third person. Each voice says ONE form; no phrase is doubled; the displayed
// text is untouched (eng_for_hin's 23 Sept "one form per voice, no doubling" seen from the target side).
// Written like the generator writes it: expanded_f only where it differs from the text, expanded_m only where it
// differs — so no {f,m} pair is created and the builder's gender-variant licence (validation.cjs) is not widened.
//
// WHAT IS NOT TOUCHED. Seed 127 and every row job #349·Q owns (a want/try mismatch, by its own HARD rule) — their
// Hindi is about to change, so an expansion keyed on today's text would be orphaned. Components (never played).
// A re-run after #349·Q lands picks the new texts up (idempotent: an existing expansion row is never overwritten).
//
// AUDIO. A female reading is only heard once Aarti re-records it. RENDER=1 asks POST /api/audio/render for each,
// dry run first, and STOPS at the first refusal (a refusal is the answer). On 2026-10-14 every Hindi target render
// was refused: VOICE_POLICY "hin (f) has only the 2026-09-04 draft casting — Tom has not chosen a voice". When Tom
// casts Hindi in the Voice Lab, RENDER=1 is the whole remaining step: render, check the clip, then swap the
// target1/target2 link (make-before-break; the old clip is kept and the swap logged in content_audio_link_drops).
//
//   node tools/course-optimization/hin-for-eng-speaker-gender-2026-10-14.cjs            # census, prints the plan
//   APPLY=1 node …                                                                      # write the expansion rows
//   RENDER=1 node …                                                                     # re-record + relink (blocked today)
//   node … --check                     # exit 1 while any text the rule reads differently has no expansion row (the proof)
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'hin_for_eng';
const JOB = '#356·Q';
const SWEEP = 'hin-for-eng-speaker-gender-2026-10-14';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const LAST_PLAYED_SEED = 300; // seeds 301–668 have no LEGOs, so nothing of theirs is played: expansions yes, renders no

// ── The female reading (pure) ─────────────────────────────────────────────────────────────────────────────────
// Verb stems that end in ा: before a light verb (रहा/सकता/चुका/पाया/गया…) they are stems and never change.
const STEMS = new Set(['आ', 'जा', 'खा', 'पा', 'गा', 'ला', 'बता', 'सुना', 'समझा', 'दिखा', 'बना', 'सिखा', 'मना', 'बुला', 'उठा', 'पढ़ा', 'लौटा', 'घुमा', 'सुला', 'भुला', 'बिता', 'सजा', 'बचा', 'कमा', 'निभा', 'अपना', 'जगा', 'हटा', 'लगा', 'दबा', 'छुपा', 'छिपा', 'पहुँचा', 'पहुंचा', 'चबा', 'नहा', 'बहा', 'उगा']);
const PARTICLES = new Set(['नहीं', 'न', 'भी', 'ही', 'तो', 'तक', 'अभी', 'सच', 'कभी']);
// Words ending in ा that never agree with the speaker (nouns, possessives, quantifiers, wh-words).
const NOT_SPEAKER = new Set(['पता', 'रास्ता', 'सस्ता', 'वास्ता', 'नाता', 'माता', 'पिता', 'कविता', 'जनता', 'दस्ता', 'खाता', 'मेरा', 'अपना', 'थोड़ा', 'ज़्यादा', 'ज्यादा', 'ऐसा', 'वैसा', 'जैसा', 'कैसा', 'क्या', 'उतना', 'जितना', 'इतना', 'कितना', 'पूरा', 'सारा', 'दूसरा', 'पहला', 'अगला', 'पिछला', 'बड़ा', 'छोटा', 'अच्छा', 'बुरा', 'सबसे']);
const FUT1 = /(ूँगा|ूंगा|ऊँगा|ऊंगा)$/;          // 1sg future — only ever the speaker
const AUX = /^(हूँ|हूं|था)$/;
const LIGHT = new Set(['रहा', 'सका', 'चुका', 'पाया', 'लगा']);
const OTHER_SUBJ = /^(वो|वह|वे|आप|तुम|तू|हम|उसने|उन्होंने|मैंने|आपने|हमने|तुमने|मुझे|मुझको|मेरे|मुझसे)$/;
const SPLIT_AFTER = /^(तो|कि|लेकिन|मगर|क्योंकि|जब|अगर|जो|जहाँ|जैसे|हालाँकि|हालांकि)$/;
const SPLIT_BEFORE = /^(जिसने|जिन्होंने|जिसे|जिसको|जिन्हें|जिसकी|जिसका|जिसके|जिनसे|जिससे|जिनको|आपने|उसने|उन्होंने|हमने|तुमने|मैंने)$/;
// A LEGO/BUILD fragment with no मैं is first person only by its English; these never are (impersonal frames).
const FALLBACK_NEVER = /^(आता|लगता|होता|होगा|था|मिला|मिल|गया)$/;
const punct = (tok) => { const m = tok.match(/^(.*?)([।?!,.]*)$/); return [m[1], m[2]]; };

function femWord(w) {
  if (FUT1.test(w)) return w.replace(/गा$/, 'गी');
  if (w === 'था') return 'थी';
  if (w === 'हुआ') return 'हुई';
  if (/या$/.test(w)) return w.replace(/या$/, 'ई');
  if (/ा$/.test(w)) return w.replace(/ा$/, 'ी');
  return w;
}
const masc = (w) => (/ा$/.test(w) && !/ना$/.test(w)) || w === 'हुआ';

/** Walk back from the head of a verb group (an aux, or the clause's last word), changing what agrees with the speaker. */
function walk(bare, out, i, fromAux) {
  if (fromAux) { if (bare[i] === 'था') out[i] = 'थी'; i--; }
  let participleOnly = false;
  while (i >= 0) {
    const w = bare[i];
    if (PARTICLES.has(w)) { i--; continue; }
    if (FUT1.test(w)) { out[i] = femWord(w); return; }
    if (!masc(w) || NOT_SPEAKER.has(w)) return;
    if (participleOnly && !/ा$|या$/.test(w)) return;
    if (STEMS.has(w) && /^(रहा|रहता|सकता|सका|चुका|पाया|पाता|गया|लगा|हुआ)$/.test(bare[i + 1] || '')) return;
    out[i] = femWord(w);
    if (w === 'रहता' || w === 'हुआ' || w === 'गया') { participleOnly = true; i--; continue; } // करता रहता / थका हुआ / चला गया
    return; // a -ता participle, a light verb, a perfective or a predicate adjective ends the group
  }
}

function femClause(bareIn, fallbackI) {
  let n = bareIn.length;
  while (n > 0 && (SPLIT_AFTER.test(bareIn[n - 1]) || PARTICLES.has(bareIn[n - 1]))) n--;
  const bare = bareIn.slice(0, n), tail = bareIn.slice(n);
  if (!bare.length) return null;
  if (fallbackI && !bare.includes('मैं') && FALLBACK_NEVER.test(bare[bare.length - 1])) return null;
  const hasMain = bare.includes('मैं');
  const hasAux1 = bare.some((w) => /^(हूँ|हूं)$/.test(w));
  const hasFut1 = bare.some((w) => FUT1.test(w));
  const other = bare.some((w) => OTHER_SUBJ.test(w));
  if (!(hasMain || hasAux1 || hasFut1 || (fallbackI && !other))) return null;
  const out = bare.slice();
  const heads = [];
  bare.forEach((w, i) => { if (AUX.test(w)) heads.push([i, true]); });
  if (!heads.length || heads[heads.length - 1][0] !== bare.length - 1) heads.push([bare.length - 1, false]);
  for (const [i, aux] of heads) {
    if (aux && bare[i] === 'था' && !(hasMain || (fallbackI && !other))) continue; // था with no मैं belongs to someone else
    walk(bare, out, i, aux);
  }
  bare.forEach((w, i) => { if (FUT1.test(w)) out[i] = femWord(w); });
  // "थका हुआ" describing the speaker, wherever it sits in the clause (…थका हुआ महसूस कर रहा हूँ)
  if (!other) bare.forEach((w, i) => { if (w === 'हुआ' && i > 0 && /ा$/.test(bare[i - 1]) && !NOT_SPEAKER.has(bare[i - 1])) { out[i] = 'हुई'; out[i - 1] = femWord(bare[i - 1]); } });
  return out.concat(tail);
}

function clauses(text) {
  const res = [];
  let cur = [];
  for (const tok of text.split(' ')) {
    const [b, p] = punct(tok);
    if (SPLIT_BEFORE.test(b) && cur.length) { res.push(cur); cur = []; }
    cur.push(tok);
    if (SPLIT_AFTER.test(b) || /[।?!,]/.test(p)) { res.push(cur); cur = []; }
  }
  if (cur.length) res.push(cur);
  return res;
}

/**
 * The line as a woman says it. Only speaker-agreeing words move. `fragmentFallback` lets a LEGO or BUILD fragment
 * with no Hindi subject ("नहीं पाया" under "I couldn't") be read as first person from its English.
 */
function femaleReading(text, english, { fragmentFallback = false } = {}) {
  if (!text) return text;
  if (OVERRIDES[text]) return OVERRIDES[text].f;
  const cls = clauses(text);
  const enI = fragmentFallback && cls.length === 1 && /^(i|i'm|i'll|i'd|i've|i was|i wasn't)\b(?!-)/i.test(String(english || '').trim());
  const words = [];
  for (const c of cls) {
    const f = femClause(c.map((t) => punct(t)[0]), enI);
    c.forEach((t, j) => words.push(f ? f[j] + punct(t)[1] : t));
  }
  return words.join(' ');
}

/** The line as a man says it — only for the few rows written in the female speaker's form. */
function maleReading(text) {
  if (OVERRIDES_M[text]) return OVERRIDES_M[text];
  return text.replace(/(ूँगी|ऊँगी)(?=[\s।?!,]|$)/g, (m) => m.replace(/गी$/, 'गा')).replace(/(सकती|चाहती|रही|करती|जानती) (हूँ)/g, (m, a, b) => `${a.replace(/ती$/, 'ता').replace(/ही$/, 'हा')} ${b}`);
}
/** Is this text written in the female speaker's form (a 1sg clause already feminine)? */
const writtenFemale = (t) => { const s = String(t || ''); return /(ूँगी|ऊँगी)(?=[\s।?!,]|$)|मैं[^।?]*(सकती|चाहती|रही|करती|जानती) हूँ/.test(s) && !/(ूँगा|ऊँगा)(?=[\s।?!,]|$)|मैं[^।?]*(ता|रहा) हूँ/.test(s); };

// Hand readings where the walk is not enough (read by hand, 2026-10-14): predicate words before the verb group
// that also agree with the speaker (इतना भाग्यशाली, बड़ा होकर, चलता नहीं रह…, आपका शुक्रगुज़ार), and a clause the
// relative-pronoun split cuts in two.
const OVERRIDES = {
  'हाँ मैं इतना भाग्यशाली था कि अफ्रीका जा सका।': { f: 'हाँ मैं इतनी भाग्यशाली थी कि अफ्रीका जा सकी।' },
  'तो मैं बड़ा होकर घर छोड़ना चाहता था।': { f: 'तो मैं बड़ी होकर घर छोड़ना चाहती थी।' },
  'मैं और अधिक समय तक चलता नहीं रह सकता था।': { f: 'मैं और अधिक समय तक चलती नहीं रह सकती थी।' },
  'यह आपकी बहुत दयालुता है और मैं मदद के लिए आपका शुक्रगुज़ार हूँ।': { f: 'यह आपकी बहुत दयालुता है और मैं मदद के लिए आपकी शुक्रगुज़ार हूँ।' },
  'मैं जो शब्द कहने की कोशिश कर रहा था वो भूल गया।': { f: 'मैं जो शब्द कहने की कोशिश कर रही थी वो भूल गई।' },
};
const OVERRIDES_M = {};

// ── What job #349·Q owns (its own HARD rule, tools/check-hin-want-try.cjs on its branch), and seed 127 ──────────
const EN_WANT = /\b(want|wants|wanted|wanting|wish|wishes|wished)\b|\b(would|'d|wouldn't)( \w+)? like\b/i;
const EN_TRY = /\b(try|tries|tried|trying)\b/i;
const EN_TRY_OR_NOUN = /\b(try|tries|tried|trying|attempt|attempts|attempted|attempting|effort|efforts)\b/i;
const EN_CONCESSIVE = /\b(however|whatever|whoever|wherever|whenever|whether|no matter|even if)\b/i;
function ownedBy349(row) {
  if (row.sn === 127) return true;
  const k = String(row.k || ''), t = String(row.t || '');
  const hiWant = /चाह(?!िए)/.test(t), hiTry = /कोशिश|प्रयास/.test(t);
  if (hiWant && !EN_WANT.test(k) && !(EN_CONCESSIVE.test(k) && /चाहे /.test(t) && !/चाह(?!िए|े )/.test(t))) return true;
  if (hiTry && !EN_TRY_OR_NOUN.test(k)) return true;
  if (EN_TRY.test(k) && !hiTry) return true;
  return false;
}

/** The plan, from rows {kind, id, sn, k, t}. Pure. */
function plan(rows) {
  const byText = new Map();
  const skipped = [];
  for (const r of rows) {
    if (r.kind === 'component' || !r.t) continue;
    const fallback = r.kind === 'lego' || r.kind === 'build';
    let f = null, m = null;
    if (writtenFemale(r.t)) { m = maleReading(r.t); if (m === r.t) m = null; }
    else { f = femaleReading(r.t, r.k, { fragmentFallback: fallback }); if (f === r.t) f = null; }
    if (!f && !m) continue;
    if (ownedBy349(r)) { skipped.push({ ...r, f, m, why: r.sn === 127 ? 'seed 127 (#349·Q)' : 'want/try row (#349·Q)' }); continue; }
    const e = byText.get(r.t) || { original_text: r.t, expanded_f: f, expanded_m: m, rows: [] };
    if ((e.expanded_f || null) !== (f || null) || (e.expanded_m || null) !== (m || null)) {
      // one text read two ways by two rows' English (fragment fallback): keep the reading that changes more
      if (f && (!e.expanded_f || f.length > e.expanded_f.length)) e.expanded_f = f;
      if (m && !e.expanded_m) e.expanded_m = m;
    }
    e.rows.push(r);
    byText.set(r.t, e);
  }
  return { expansions: [...byText.values()], skipped };
}

// ── Live ──────────────────────────────────────────────────────────────────────────────────────────────────────
async function loadRows(pg) {
  const q = async (sql) => (await pg.query(sql, [COURSE])).rows;
  return [
    ...(await q(`SELECT 'seed' kind, seed_id id, seed_number sn, known_text k, target_text t, target1_audio_id a1, target2_audio_id a2 FROM course_seeds WHERE course_code=$1`)),
    ...(await q(`SELECT 'lego' kind, lego_id id, seed_number sn, known_text k, target_text t, target1_audio_id a1, target2_audio_id a2 FROM course_legos WHERE course_code=$1`)),
    ...(await q(`SELECT phrase_role kind, id, seed_number sn, known_text k, target_text t, target1_audio_id a1, target2_audio_id a2 FROM course_practice_phrases WHERE course_code=$1`)),
  ];
}

async function applyExpansions(pg, supabase, p, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { rows: existing } = await pg.query(`SELECT original_text FROM course_gender_expansions WHERE course_code=$1 AND text_side='target'`, [COURSE]);
  const have = new Set(existing.map((e) => e.original_text));
  const todo = p.expansions.filter((e) => !have.has(e.original_text));
  log.expansions = { planned: p.expansions.length, alreadyPresent: p.expansions.length - todo.length, written: 0 };
  if (!todo.length) return;
  const ev = await recordContentEdit(supabase, {
    identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: COURSE, surface: SURFACE, operation: 'gender-expansion-edit',
    scope: { seed_numbers: [...new Set(todo.flatMap((e) => e.rows.map((r) => r.sn)))].sort((a, b) => a - b), rows: todo.length },
    detail: { job: JOB, ruling: "Kai 2026-09-29: a female form only where the word refers to the speaker; target1 (Aarti) speaks expanded_f, target2 (Kunal) expanded_m (estate mechanism, ita_for_eng)", upserts: todo.map((e) => ({ original: e.original_text, f: e.expanded_f, m: e.expanded_m })) },
  });
  await pg.query('BEGIN');
  try {
    for (const e of todo) {
      const r = await pg.query(`INSERT INTO course_gender_expansions (course_code, original_text, language, expanded_f, expanded_m, text_side) VALUES ($1,$2,'hin',$3,$4,'target')
        ON CONFLICT (course_code, original_text, text_side) DO NOTHING`, [COURSE, e.original_text, e.expanded_f, e.expanded_m]);
      log.expansions.written += r.rowCount;
    }
    await pg.query('COMMIT');
  } catch (err) { await pg.query('ROLLBACK'); throw err; }
  log.expansions.event = ev;
}

async function render(body) {
  const res = await fetch(`${(process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job ${JOB})` }, body: JSON.stringify({ job: '#356', ...body }) });
  return { status: res.status, ...(await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) };
}

/** Re-record each played slot whose clip does not say its voice's reading; swap only after the new clip exists. */
async function applyRenders(pg, p, log) {
  log.renders = [];
  const TABLE = { seed: ['course_seeds', 'seed_id'], lego: ['course_legos', 'lego_id'] };
  for (const e of p.expansions) {
    for (const [role, text] of [['target1', e.expanded_f], ['target2', e.expanded_m]]) {
      if (!text) continue;
      const slots = [];
      for (const r of e.rows.filter((x) => x.sn <= LAST_PLAYED_SEED)) {
        const old = role === 'target1' ? r.a1 : r.a2;
        const { rows: [clip] } = old ? await pg.query('SELECT id, text, voice_id FROM course_audio WHERE id=$1', [old]) : { rows: [] };
        if (clip && clip.text === text) continue;
        slots.push({ r, clip });
      }
      if (!slots.length) continue;
      const body = { courseCode: COURSE, role, text, purpose: `speaker-gender reading for ${role} (${slots[0].r.id})` };
      const dry = await render({ ...body, dryRun: true });
      if (!dry.ok) { log.renders.push({ text, role, refused: `${dry.code || dry.status}: ${dry.error || ''}` }); log.stoppedAt = 'dry-run refusal'; return; }
      const real = await render(body);
      if (!real.ok || !real.audioId) { log.renders.push({ text, role, refused: `${real.code || real.status}: ${real.error || ''}` }); log.stoppedAt = 'render refusal'; return; }
      const { rows: [nc] } = await pg.query('SELECT id, text, voice_id FROM course_audio WHERE id=$1', [real.audioId]);
      if (!nc || nc.text !== text) { log.renders.push({ text, role, notLinked: `clip ${real.audioId} says "${nc && nc.text}"` }); continue; }
      const swapped = [];
      for (const { r, clip } of slots) {
        const [table, key] = TABLE[r.kind] || ['course_practice_phrases', 'id'];
        const col = `${role}_audio_id`;
        const up = await pg.query(`UPDATE ${table} SET ${col}=$1 WHERE course_code=$2 AND ${key}=$3 AND target_text=$4 AND ${col} IS NOT DISTINCT FROM $5`, [nc.id, COURSE, r.id, r.t, clip ? clip.id : null]);
        if (up.rowCount !== 1) { swapped.push(`${r.id} (slot moved — not swapped)`); continue; }
        await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, new_audio_id, old_text, new_text, old_voice_id, reason) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [table, r.id, COURSE, r.sn, col, role, clip ? clip.id : null, nc.id, clip ? clip.text : null, nc.text, clip ? clip.voice_id : null, `${SWEEP}: ${role} said the other speaker's grammar; replaced after the new clip was stored (job ${JOB}); old clip kept`]);
        swapped.push(r.id);
      }
      log.renders.push({ text, role, source: real.source, audioId: nc.id, chars: real.charsSpent, swapped });
    }
  }
}

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const { evidencePath } = require('../lib/evidence-path.cjs');
  try {
    const rows = await loadRows(pg);
    const p = plan(rows);
    const played = p.expansions.filter((e) => e.rows.some((r) => r.sn <= LAST_PLAYED_SEED));
    const chars = (side) => played.reduce((n, e) => n + (e[side] ? e[side].length : 0), 0);
    console.log(`${COURSE}: ${p.expansions.length} texts get a speaker reading (${p.expansions.filter((e) => e.expanded_f).length} female, ${p.expansions.filter((e) => e.expanded_m).length} male), ${p.expansions.reduce((n, e) => n + e.rows.length, 0)} rows; ${p.skipped.length} rows left to #349·Q`);
    console.log(`render size, played seeds 1–${LAST_PLAYED_SEED}: ${played.length} texts, ${chars('expanded_f') + chars('expanded_m')} chars`);
    if (process.argv.includes('--check')) {
      const { rows: have } = await pg.query(`SELECT original_text, expanded_f, expanded_m FROM course_gender_expansions WHERE course_code=$1 AND text_side='target'`, [COURSE]);
      const byText = new Map(have.map((h) => [h.original_text, h]));
      const missing = p.expansions.filter((e) => { const h = byText.get(e.original_text); return !h || (e.expanded_f && !h.expanded_f) || (e.expanded_m && !h.expanded_m); });
      console.log(`CHECK: ${missing.length} of ${p.expansions.length} speaker-gendered texts have no reading for the other voice`);
      missing.slice(0, 5).forEach((e) => console.log(`  ${e.rows[0].id}  ${e.original_text}`));
      process.exitCode = missing.length ? 1 : 0;
      return;
    }
    const log = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), plan: p.expansions, skipped: p.skipped };
    const snap = evidencePath(`tools/course-optimization/${SWEEP}/before-${log.at.replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(snap, JSON.stringify((await pg.query(`SELECT * FROM course_gender_expansions WHERE course_code=$1`, [COURSE])).rows, null, 1));
    if (process.env.APPLY === '1') {
      const { createClient } = require('@supabase/supabase-js');
      await applyExpansions(pg, createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }), p, log);
      console.log(`EXPANSIONS: ${log.expansions.written} written, ${log.expansions.alreadyPresent} already present (event ${log.expansions.event || '—'})`);
    }
    if (process.env.RENDER === '1') {
      await applyRenders(pg, p, log);
      const done = log.renders.filter((r) => r.swapped);
      console.log(`RENDERS: ${done.length} clips made, ${done.reduce((n, r) => n + r.swapped.length, 0)} slots swapped${log.stoppedAt ? ` — STOPPED (${log.stoppedAt}): ${log.renders[log.renders.length - 1].refused}` : ''}`);
    }
    const f = evidencePath(`tools/course-optimization/${SWEEP}/${process.env.APPLY === '1' ? 'applied' : process.env.RENDER === '1' ? 'render' : 'census'}-${log.at.replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 1)); console.log(`Wrote ${f}\nBackup of the table before this run: ${snap}`);
  } finally { await pg.end(); }
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { femaleReading, maleReading, writtenFemale, ownedBy349, plan, OVERRIDES };
