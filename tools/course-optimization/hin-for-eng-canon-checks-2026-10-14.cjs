#!/usr/bin/env node
'use strict';
// tools/course-optimization/hin-for-eng-canon-checks-2026-10-14.cjs — job #356·Q, hin_for_eng.
//
// The clear defects the canon's checks surfaced, fixed where the fix needs NO Hindi audio. Every Hindi target render
// on this course is refused today (VOICE_POLICY target-uncast: Tom has not cast Hindi), and editing Hindi target text
// NULLs the target links (canon A5), so a Hindi edit now would silence live slots in a beta course. Hindi-side fixes
// are therefore STAGED in the job report, not written here.
//
//   1. INTRO MIRROR (O13). 18 LEGO intros whose "as in" sentence did not contain the LEGO's own words — re-authored
//      in the course template with a demonstration sentence from the LEGO's own basket that carries the LEGO on both
//      sides, else the bare frame. Spoken clips are spliced from existing pieces by POST /api/audio/render, which
//      binds them to the LEGO. S0114L01 ('yest') is job #349·Q's and is not touched.
//      358 COMPONENT intro links out of step are UNLINKED, which is the canon's remedy (O13: components are never
//      introduced, so a stale component intro is unlinked, never re-rendered).
//   2. ZUT (K2/P16, K33). Two USE phrases may not ask one English prompt for two Hindi answers. Where the Hindi says
//      more than the English, the ENGLISH is made to say it: S0090 "…that's good" (तो अच्छा है), S0101 "knowing"
//      (the LEGO it drills is "to know"), S0119 "choices are" (आपके विकल्प … हैं). The new English is rendered FIRST
//      (A6), in the course's known voice, then the text is changed and the new clip linked.
//   3. Two rows that cannot be repaired without Hindi audio and are wrong as they stand are DELETED (R0.3: a phrase
//      may go; never a LEGO): a BUILD whose Hindi is a cut-off fragment of another sentence, and a USE whose Hindi
//      is ungrammatical (…ज़रूरी था की).
//   Every seed touched is unapproved (O5). Rows are backed up to the evidence store before any write.
//
//   node tools/course-optimization/hin-for-eng-canon-checks-2026-10-14.cjs          # census: what is still out of step
//   APPLY=1 node …                                                                  # apply
//   node … --check                                                                  # exit 1 while any item above is still open
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'hin_for_eng';
const JOB = '#356·Q';
const SWEEP = 'hin-for-eng-canon-checks-2026-10-14';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;

// Read by hand 2026-10-14. Demo sentences are the LEGO's own USE rows whose Hindi carries the LEGO; S0043L01 and
// S0119L02 take the bare frame because their only candidate rows mistranslate (listed in the report).
const INTROS = {
  S0008L02: "The Hindi for: 'is', is:",
  S0019L02: "The Hindi for: 'to talk', as in — 'I want to talk with you', is:",
  S0030L01: "The Hindi for: 'from you', as in — 'he wants to learn from you', is:",
  S0031L01: "The Hindi for: 'night', is:",
  S0040L03: "The Hindi for: 'to feel', is:",
  S0043L01: "The Hindi for: 'this', is:",
  S0049L03: "The Hindi for: 'my meaning', is:",
  S0091L03: "The Hindi for: 'on time', as in — 'I'm ready on time', is:",
  S0107L01: "The Hindi for: 'hope', as in — 'I hope', is:",
  S0110L02: "The Hindi for: 'after finishing', as in — 'after finishing I'd like to rest', is:",
  S0118L02: "The Hindi for: 'that', is:",
  S0119L02: "The Hindi for: 'your', is:",
  S0132L02: "The Hindi for: 'her', is:",
  S0133L01: "The Hindi for: 'with', is:",
  S0139L04: "The Hindi for: 'fast', is:",
  S0141L01: "The Hindi for: 'ok', is:",
  S0206L03: "The Hindi for: 'practice', as in — 'practice is important', is:",
  S0268L02: "The Hindi for: 'email', is:",
};

// HELD: these six need one new spoken piece, and the first run (2026-10-14 14:33Z) was refused for it —
// VOICE_POLICY "hin_for_eng known is Tom-006 by rule english-known; Charlotte refused — voices are never hand-picked"
// (the intro splicer and the voice policy disagree about who speaks a missing intro piece). Not retried; listed.
// The seven above that read as the bare frame were first written with an "as in" sentence, refused the same way,
// and moved to the bare frame because every piece of it already exists (a splice, nothing rendered).
const INTRO_HELD = new Set(['S0019L02', 'S0030L01', 'S0091L03', 'S0110L02', 'S0141L01', 'S0206L03']);

const ENGLISH = [
  { id: 'S0090L01U01', target: 'अगर यह संभव है तो अच्छा है।', before: "if it's possible that's great", after: "if it's possible that's good", why: 'अच्छा है is "good"; "great" is बहुत अच्छा (S0090L04)' },
  { id: 'S0090L03U01', target: 'अगर आप धीरे बोल सकें तो अच्छा है।', before: 'if you can speak slowly', after: "if you can speak slowly that's good", why: 'ZUT with S0090L02U02 "if you can speak slowly | अगर आप धीरे बोल सकते हैं।" — the Hindi adds तो अच्छा है' },
  { id: 'S0090L03U02', target: 'अगर आप शुरू कर सकें तो अच्छा है।', before: 'if you can start', after: "if you can start that's good", why: 'the Hindi says तो अच्छा है, the English did not' },
  { id: 'S0090L03U03', target: 'तो अगर आप कर सकें तो अच्छा है।', before: 'so if you can', after: "so if you can do it that's good", why: 'the Hindi says कर सकें … तो अच्छा है' },
  { id: 'S0090L03U04', target: 'अगर आप थोड़ा धीरे बोल सकें तो अच्छा है।', before: 'if you can speak a little slowly', after: "if you can speak a little slowly that's good", why: 'the Hindi says तो अच्छा है' },
  { id: 'S0090L03U05', target: 'या अगर आप इसके बारे में बोल सकें तो अच्छा है।', before: 'or if you can talk about this', after: "or if you can talk about this that's good", why: 'the Hindi says तो अच्छा है' },
  { id: 'S0101L02U05', target: 'जानना ज़रूरी है।', before: 'finding out is important', after: 'knowing is important', why: 'ZUT with S0293 "finding out is important | पता लगाना ज़रूरी है।"; this row drills S0101L02 "to know | जानना" (K33)' },
  { id: 'S0119L02U01', target: 'आपके विकल्प बेहतर हैं।', before: 'your choice is better', after: 'your choices are better', why: 'आपके विकल्प … हैं is plural' },
];

const DELETES = [
  { id: 'S0074L02B03', known: "I'm grateful for your help", target: 'मुझे समझने में मदद करने के लिए बहुत', why: 'the Hindi is the cut-off front of "thank you very much for helping me understand"; it does not say the English' },
  { id: 'S0146L01U03', known: 'she did what was needed', target: 'उसने जो ज़रूरी था की।', why: 'ungrammatical Hindi (…ज़रूरी था की); the right sentence needs a Hindi render, which is blocked' },
];

const seedOf = (id) => Number(String(id).replace(/^hin_for_eng:/, '').slice(1, 5));

async function render(body) {
  const res = await fetch(`${(process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job ${JOB})` }, body: JSON.stringify({ job: '#356', ...body }) });
  return { status: res.status, ...(await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) };
}

async function census(pg) {
  const IM = require('../../services/shared/intro-mirror.cjs');
  const c = await IM.checkCourse(pg, COURSE);
  const legoOpen = c.mismatches.filter((r) => r.kind === 'lego' && INTROS[r.id] && !(process.env.APPLY === '1' && INTRO_HELD.has(r.id)));
  const compOpen = c.mismatches.filter((r) => r.kind === 'component');
  const { rows: en } = await pg.query(`SELECT id, known_text, target_text, known_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)`, [COURSE, ENGLISH.map((e) => `${COURSE}:${e.id}`)]);
  const enOpen = ENGLISH.filter((e) => { const r = en.find((x) => x.id === `${COURSE}:${e.id}`); return r && r.known_text === e.before; });
  const { rows: del } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)`, [COURSE, DELETES.map((d) => `${COURSE}:${d.id}`)]);
  return { legoOpen, compOpen, enOpen, delOpen: DELETES.filter((d) => del.some((x) => x.id === `${COURSE}:${d.id}`)), enRows: en, intro: c };
}

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const at = new Date().toISOString().replace(/[:.]/g, '-');
  try {
    const c = await census(pg);
    console.log(`open: ${c.legoOpen.length}/${Object.keys(INTROS).length} LEGO intros, ${c.compOpen.length} component intro links, ${c.enOpen.length}/${ENGLISH.length} English fixes, ${c.delOpen.length}/${DELETES.length} deletes`);
    if (process.argv.includes('--check')) { process.exitCode = (c.legoOpen.length + c.compOpen.length + c.enOpen.length + c.delOpen.length) ? 1 : 0; return; }
    if (process.env.APPLY !== '1') return;

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
    const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
    const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
    const log = { sweep: SWEEP, job: JOB, at };

    // BACKUP every row this run may touch, before anything is written.
    const ids = [...ENGLISH.map((e) => e.id), ...DELETES.map((d) => d.id)].map((i) => `${COURSE}:${i}`);
    const backup = {
      phrases: (await pg.query(`SELECT * FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)`, [COURSE, ids])).rows,
      components: (await pg.query(`SELECT id, presentation_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)`, [COURSE, c.compOpen.map((r) => r.id)])).rows,
      legos: (await pg.query(`SELECT lego_id, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)`, [COURSE, Object.keys(INTROS)])).rows,
      seeds: (await pg.query(`SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1`, [COURSE])).rows,
    };
    const bf = evidencePath(`tools/course-optimization/${SWEEP}/backup-${at}.json`);
    fs.writeFileSync(bf, JSON.stringify(backup, null, 1)); console.log(`backup: ${bf}`);

    // 1a. LEGO intros: splice + bind via the one audio route.
    log.intros = [];
    if (c.legoOpen.length) {
      const ev = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'presentation-reauthor',
        scope: { seed_numbers: [...new Set(c.legoOpen.map((r) => r.seed))], lego_ids: c.legoOpen.map((r) => r.id), rows: c.legoOpen.length },
        detail: { job: JOB, rule: 'O13 — the intro quotes its LEGO and its "as in" sentence contains it', changes: c.legoOpen.map((r) => ({ lego: r.id, before: r.intro, after: INTROS[r.id] })) } });
      for (const r of c.legoOpen) {
        const body = { courseCode: COURSE, role: 'presentation', legoId: r.id, text: INTROS[r.id], purpose: `intro mirror (O13) for ${r.id}` };
        const dry = await render({ ...body, dryRun: true });
        if (!dry.ok) { log.intros.push({ lego: r.id, refused: `${dry.code || dry.status} ${dry.error || ''}` }); continue; }
        const real = await render(body);
        log.intros.push({ lego: r.id, ok: real.ok, source: real.source, audioId: real.audioId, legoLinked: real.legoLinked, chars: real.charsSpent, error: real.ok ? undefined : `${real.code || real.status} ${real.error || ''}` });
        if (real.ok && real.audioId) await pg.query(`UPDATE course_legos SET last_edit_event_id=$1 WHERE course_code=$2 AND lego_id=$3`, [ev, COURSE, r.id]);
      }
    }
    // 1b. Component intro links: unlink (never re-render — components are never played).
    if (c.compOpen.length) {
      const ev = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'component-intro-unlink',
        scope: { seed_numbers: [...new Set(c.compOpen.map((r) => r.seed))], phrase_ids: c.compOpen.map((r) => r.id), rows: c.compOpen.length },
        detail: { job: JOB, rule: 'O13 — a stale component intro is UNLINKED; components are never introduced', unlinked: c.compOpen.map((r) => ({ id: r.id, link: r.link, intro: r.intro })) } });
      const u = await pg.query(`UPDATE course_practice_phrases SET presentation_audio_id=NULL, last_edit_event_id=$1 WHERE course_code=$2 AND phrase_role='component' AND id = ANY($3)`, [ev, COURSE, c.compOpen.map((r) => r.id)]);
      log.componentUnlinked = u.rowCount;
    }
    // 2. English: render first (A6), then text, then link.
    log.english = [];
    if (c.enOpen.length) {
      const ev = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
        scope: { seed_numbers: [...new Set(c.enOpen.map((e) => seedOf(e.id)))], phrase_ids: c.enOpen.map((e) => `${COURSE}:${e.id}`), rows: c.enOpen.length },
        detail: { job: JOB, rule: 'K2/P16 one prompt one answer; K33 the English follows the LEGO it drills', changes: c.enOpen.map((e) => ({ id: `${COURSE}:${e.id}`, target: e.target, known_before: e.before, known_after: e.after, why: e.why })) } });
      for (const e of c.enOpen) {
        const body = { courseCode: COURSE, role: 'known', text: e.after, purpose: `English matched to its Hindi (${e.id})` };
        const dry = await render({ ...body, dryRun: true });
        if (!dry.ok) { log.english.push({ id: e.id, refused: `${dry.code || dry.status} ${dry.error || ''}` }); continue; }
        const real = await render(body);
        if (!real.ok || !real.audioId) { log.english.push({ id: e.id, refused: `${real.code || real.status} ${real.error || ''}` }); continue; }
        await pg.query('BEGIN');
        try {
          const t = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, last_edit_event_id=$2 WHERE course_code=$3 AND id=$4 AND known_text=$5 AND target_text=$6`, [e.after, ev, COURSE, `${COURSE}:${e.id}`, e.before, e.target]);
          if (t.rowCount !== 1) throw new Error(`${e.id}: text ${t.rowCount}`);
          await pg.query(`UPDATE course_practice_phrases SET known_audio_id=$1 WHERE course_code=$2 AND id=$3`, [real.audioId, COURSE, `${COURSE}:${e.id}`]);
          await pg.query('COMMIT');
          log.english.push({ id: e.id, source: real.source, audioId: real.audioId, chars: real.charsSpent });
        } catch (err) { await pg.query('ROLLBACK'); log.english.push({ id: e.id, error: err.message }); }
      }
    }
    // 3. Deletes.
    if (c.delOpen.length) {
      await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-delete',
        scope: { seed_numbers: [...new Set(c.delOpen.map((d) => seedOf(d.id)))], phrase_ids: c.delOpen.map((d) => `${COURSE}:${d.id}`), rows: c.delOpen.length },
        detail: { job: JOB, rule: 'R0.3 — a phrase that cannot be fixed easily may go; never a LEGO', deleted: c.delOpen.map((d) => ({ id: `${COURSE}:${d.id}`, known: d.known, target: d.target, why: d.why })) } });
      for (const d of c.delOpen) {
        const r = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${d.id}`, d.known, d.target]);
        log.deleted = [...(log.deleted || []), `${d.id}:${r.rowCount}`];
      }
    }
    // Unapprove every seed whose content changed (O5).
    const touched = [...new Set([...log.intros.filter((i) => i.ok).map((i) => seedOf(i.lego)), ...log.english.filter((e) => e.audioId).map((e) => seedOf(e.id)), ...(log.deleted || []).map((d) => seedOf(d))])];
    const { rows: appr } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) AND approved_at IS NOT NULL', [COURSE, touched]);
    if (appr.length) {
      const un = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: appr.map((a) => a.seed_number), rows: appr.length }, detail: { job: JOB, why: 'intro, English or phrase edited (O5)', approved_at_before: appr } });
      await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$3 WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, appr.map((a) => a.seed_number), un]);
    }
    log.unapproved = appr.map((a) => a.seed_number);
    await require('../../services/shared/round-index-refresh.cjs').refreshNow();
    const f = evidencePath(`tools/course-optimization/${SWEEP}/applied-${at}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 1));
    console.log(JSON.stringify({ intros: log.intros.map((i) => `${i.lego}:${i.ok ? i.source + (i.legoLinked ? '+linked' : '') : i.refused || i.error}`), componentUnlinked: log.componentUnlinked, english: log.english.map((e) => `${e.id}:${e.audioId ? e.source : e.refused || e.error}`), deleted: log.deleted, unapproved: log.unapproved }, null, 1));
    console.log(`Wrote ${f}`);
  } finally { await pg.end(); }
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { INTROS, INTRO_HELD, ENGLISH, DELETES };
