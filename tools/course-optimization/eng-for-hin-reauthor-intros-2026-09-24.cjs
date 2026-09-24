#!/usr/bin/env node
'use strict';
// eng_for_hin — every LEGO introduction (presentation) text mirrors its current LEGO (Kai, job #20·I, 2026-09-24).
//
// WHAT WAS WRONG (measured live 2026-09-23 by #833·F and again here): the intro lines were authored before Shuchita's
// proofreading rewrote the Hindi, so most linked intros quote a chunk the LEGO no longer says (S0041L01 "but" presented
// 'बात करना'); every one ends in the machine template's dangling "— में :" ("— in :" where "— is:" was meant; the sibling
// Punjabi/Bengali templates end in ਹੈ:/হয়:); and the LEGOs that debuted since, or whose links the two-voices rebuild
// (#941·H) nulled, have no intro at all.
//
// WHAT THIS DOES — text only, renders nothing, deletes no S3 asset.
// TEMPLATE (cross-family read, Astra #21·I, 2026-09-24): the trailing "में" is "in" and cannot mean "is"; the minimal "है :"
// reads clipped and, on a whole-sentence chunk, can sound as if the Hindi sentence itself is in English. Installed instead:
//   A: {target_lang_name} में — '{known}' — को कहते हैं :                                   ("in English, 'X' is said:")
//   B: {target_lang_name} में — '{known}' — जैसे इस वाक्य में — '{seed}' — को कहते हैं :   ("…as in this sentence 'S'…")
// No native has read it yet — Shuchita's next pass, or a Hindi reviewer, should hear one clip before the joint render.
//
//   plan   (default): reads the live course and writes a PLAN — one proposed intro per is_new LEGO — through the same
//          authoring code phase8 /generate uses (services/phases/presentation-author.cjs: renderIntro over the course's
//          known-language template; the Sonnet frame judge only for LEGOs that never had an intro; the frame of an
//          existing intro is KEPT, not re-decided, exactly as getAudioNeeds does; the कल family is pinned to Frame B —
//          Hindi कल is both yesterday and tomorrow; a gendered chunk quotes 'F' या 'M' per Kai's 2026-09-23 20:23Z
//          ruling; a human-authored line keeps its words — only the trailing template fragment follows the template).
//          Checks every planned line quotes the LEGO's known_text byte-for-byte and none ends in the defect.
//   apply  (--apply --plan <file>): guarded — refuses if the live template, any LEGO text or any mark has moved since the
//          plan. Then: redo snapshot of every seed + one content_edit_event; human mark tail recorded via
//          recordWordingEdit BEFORE its row (the DB trigger refuses the other order); pending Kriti rows re-worded in
//          place or inserted keyed to the LEGO; every stale intro UNLINKED at all three places the player resolves an
//          intro from (course_legos.presentation_audio_id, lego_introductions, and the stale clip's own lego_id — the
//          player falls through to each in turn, so one alone changes nothing a learner hears); each drop logged in
//          content_audio_link_drops with the old id, so it is reversible from the log; audio pass appended, not queued.
//   check  (--check): live mirror census — prints how many linked/pending intros quote their LEGO exactly.
//   --install-template "<t>": retire the active hin template and install <t> (edit-event logged). The plan reads the
//          LIVE template, so install first, then plan. Refused if <t> still ends in the defect.
//
// RE-RUN AFTER A LEGO CHANGE (e.g. the coming oversized-LEGO re-cuts): plan again, apply again. Only LEGOs whose planned
// text differs from the pending Kriti row they already carry are touched; everything else is a no-op.
//
//   node tools/course-optimization/eng-for-hin-reauthor-intros-2026-09-24.cjs                         # plan (dry run)
//   node tools/course-optimization/eng-for-hin-reauthor-intros-2026-09-24.cjs --frames-from <plan>    # re-plan, no judge
//   node tools/course-optimization/eng-for-hin-reauthor-intros-2026-09-24.cjs --apply --plan <plan>
//   node tools/course-optimization/eng-for-hin-reauthor-intros-2026-09-24.cjs --check
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const COURSE = 'eng_for_hin';
const JOB = '#20·I';
const SWEEP = 'eng-for-hin-reauthor-intros-2026-09-24';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Kai, 2026-09-24 (job ${JOB}): every eng_for_hin LEGO introduction quotes its current LEGO; the template's dangling "में :" ending is replaced by the ordinary "is:" ending; stale intro audio is unlinked, never deleted; new intros wait for the joint Kriti render`;

/** The defect: a Hindi intro ending in "में :" ("in :") — the machine template's tail, where "is:" was meant. */
const DEFECT_TAIL = /में\s*:\s*$/u;
/** The chunk an intro quotes: the first dash-quoted slot, which is the {known} slot in every frame of the Hindi template. */
function quotedChunk(text) {
  const m = /— '([^']+)'/u.exec(String(text || ''));
  return m ? m[1] : null;
}
/** Does this intro quote this LEGO? The known side of a slash-compound introduces its first option only (introChunk). */
function mirrors(text, knownText, introChunk = (k) => String(k || '').trim()) {
  return quotedChunk(text) === introChunk(knownText);
}
/** The frame a previous intro used — kept, not re-decided, when the LEGO is re-authored (phase8 getAudioNeeds does the same). */
function priorFrame(text) {
  return /जैसे/u.test(String(text || '')) ? 'B' : 'A';
}
/** Hindi कल is yesterday AND tomorrow: every LEGO carrying the word keeps its context sentence (Frame B pinned, 2026-09-03). */
function isKalFamily(knownText) {
  return /(^|\s)कल(\s|$)/u.test(String(knownText || ''));
}
/**
 * A human-authored line ends in "the course's ordinary bare introduction" (Kai, #877·H). When that ordinary line changes,
 * only that tail follows it; the human's own sentences are byte-identical. Returns null when the tail is not there.
 */
function humanLineWithNewTail(markText, oldBare, newBare) {
  const t = String(markText || '');
  if (oldBare && t.endsWith(oldBare)) return t.slice(0, -oldBare.length) + newBare;
  if (t.endsWith(newBare)) return t;
  return null;
}
/** Every check a planned line must pass before it is written. Returns the list of failures (empty = good). */
function lineProblems(row, introChunk) {
  const out = [];
  if (!row.text || !row.text.trim()) out.push('empty');
  if (DEFECT_TAIL.test(row.text)) out.push('ends in the defect "में :"');
  if (!mirrors(row.text, row.known_text, introChunk)) out.push(`quotes '${quotedChunk(row.text)}' not '${row.known_text}'`);
  if (row.chunkForms && !(row.text.includes(`'${row.chunkForms.f}'`) && row.text.includes(`'${row.chunkForms.m}'`))) out.push('gendered line does not name both forms');
  if (row.frame === 'B' && !row.human && !(row.seed && row.text.includes(`'${row.seed}'`))) out.push('Frame B without its seed sentence');
  if (row.text.includes('{')) out.push('unfilled template slot');
  return out;
}

// ── Live helpers ────────────────────────────────────────────────────────────
function supa() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}
function must(res, what) { if (res.error) throw new Error(`${what}: ${res.error.message}`); return res.data; }
async function pageAll(q, pageSize = 1000) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await q(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < pageSize) return out;
  }
}
async function liveTemplate(sb) {
  const rows = must(await sb.from('presentation_templates').select('id, template, priority').eq('known_lang', 'hin').eq('is_active', true).order('priority', { ascending: false }).limit(1), 'template');
  if (!rows.length) throw new Error('no active hin presentation template');
  return rows[0];
}
function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }

async function loadLive(sb) {
  const humanAuthored = require('../../services/shared/human-authored-presentations.cjs');
  const course = must(await sb.from('courses').select('course_code, known_lang, target_lang, voice_config, status').eq('course_code', COURSE).single(), 'course');
  const legos = (await pageAll((a, b) => sb.from('course_legos').select('lego_id, seed_number, known_text, target_text, presentation_audio_id').eq('course_code', COURSE).eq('is_new', true).order('seed_number').order('lego_index').range(a, b)));
  const seeds = new Map((await pageAll((a, b) => sb.from('course_seeds').select('seed_number, known_text').eq('course_code', COURSE).range(a, b))).map(s => [s.seed_number, s.known_text]));
  const pairs = await pageAll((a, b) => sb.from('course_gender_expansions').select('original_text, expanded_f, expanded_m').eq('course_code', COURSE).eq('text_side', 'known').range(a, b));
  const fToM = new Map();
  for (const p of pairs) {
    if (!p.expanded_f || !p.expanded_m || p.expanded_f === p.expanded_m) continue;
    if (!fToM.has(p.expanded_f)) fToM.set(p.expanded_f, new Set());
    fToM.get(p.expanded_f).add(p.expanded_m);
  }
  const marks = await humanAuthored.loadMarks(sb, COURSE);
  const presRows = await pageAll((a, b) => sb.from('course_audio').select('id, lego_id, text, s3_key, voice_id, origin, created_at').eq('course_code', COURSE).eq('role', 'presentation').order('created_at').range(a, b));
  const intros = await pageAll((a, b) => sb.from('lego_introductions').select('id, lego_id, presentation_audio_id, audio_uuid').eq('course_code', COURSE).range(a, b));
  return { course, legos, seeds, fToM, marks, presRows, intros };
}

// ── Plan ────────────────────────────────────────────────────────────────────
async function buildPlan(sb, { framesFrom = null, templateOverride = null } = {}) {
  const presentationAuthor = require('../../services/phases/presentation-author.cjs');
  const { introChunk, renderIntro, localisedLangName } = presentationAuthor;
  const live = await loadLive(sb);
  const { course, legos, seeds, fToM, marks, presRows } = live;
  const tpl = await liveTemplate(sb);
  // --template previews a template that is not live yet; apply refuses such a plan until --install-template has made it live.
  const template = templateOverride || tpl.template;
  if (templateOverride) tpl.id = null;
  const targetLangName = localisedLangName(course.target_lang, course.known_lang);
  const knownLangName = localisedLangName(course.known_lang, 'eng');
  const presVoice = presentationAuthor.resolvePresentationVoiceId(course);
  const byId = new Map(presRows.map(r => [String(r.id), r]));
  const rowsByLego = new Map();
  for (const r of presRows) if (r.lego_id) { if (!rowsByLego.has(r.lego_id)) rowsByLego.set(r.lego_id, []); rowsByLego.get(r.lego_id).push(r); }
  const isPending = (r) => r.s3_key && r.s3_key.startsWith('pending/');
  const priorOf = (lego) => {
    const linked = lego.presentation_audio_id ? byId.get(String(lego.presentation_audio_id)) : null;
    if (linked) return { ...linked, linked: true };
    const rows = rowsByLego.get(lego.lego_id) || [];
    const rendered = rows.filter(r => !isPending(r));
    const pick = rendered.length ? rendered[rendered.length - 1] : rows[rows.length - 1];
    return pick ? { ...pick, linked: false } : null;
  };
  const previousFrames = new Map();
  // A previous plan's frames are reused only where they were KEPT or PINNED; a frame the judge (or its offline fallback)
  // decided is decided again, so a re-plan after a failed judge run does not freeze the fallback.
  // --keep-judged also reuses the judge's frames (a re-plan for a template change only; the judge decides frames, not words).
  const keepJudged = process.argv.includes('--keep-judged');
  if (framesFrom) for (const r of JSON.parse(fs.readFileSync(framesFrom, 'utf8')).rows) if (r.source && (keepJudged || r.source !== 'judged') && !r.human) previousFrames.set(r.lego_id, r.frame);

  const bareA = (chunk, t) => renderIntro({ frame: 'A', template: t, targetLangName, chunk, seed: '' });
  const oldTail = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :";  // the template the marks were written against

  const items = [];
  const humanRows = [];
  const gendered = [];
  for (const lego of legos) {
    const prior = priorOf(lego);
    const mark = marks.get(lego.lego_id) || null;
    const chunk = introChunk(lego.known_text);
    const ms = fToM.get(lego.known_text);
    let chunkForms = null;
    if (ms && ms.size === 1) chunkForms = { f: lego.known_text, m: [...ms][0] };
    else if (ms && ms.size > 1) gendered.push({ lego_id: lego.lego_id, known_text: lego.known_text, male_forms: [...ms] });
    const base = { lego_id: lego.lego_id, seed_number: lego.seed_number, known_text: lego.known_text, target_text: lego.target_text, seed: seeds.get(lego.seed_number) || null, chunkForms,
      prior: prior ? { id: prior.id, text: prior.text, voice_id: prior.voice_id, pending: Boolean(isPending(prior)), linked: prior.linked, mirrors: mirrors(prior.text, lego.known_text, introChunk) } : null };
    if (mark) {
      const text = humanLineWithNewTail(mark.text, bareA(chunk, oldTail), bareA(chunk, template));
      humanRows.push({ ...base, human: true, frame: 'human', source: 'human-authored', text: text || mark.text, markText: mark.text, tailFollowed: text !== null && text !== mark.text, tailUnrecognised: text === null });
      continue;
    }
    const item = { lego_id: lego.lego_id, chunk, form: lego.target_text, seed_number: lego.seed_number, seed: base.seed, chunkForms, _base: base };
    if (isKalFamily(lego.known_text)) { item.forceFrame = 'B'; item._source = 'pinned:कल'; }
    else if (previousFrames.has(lego.lego_id)) { item.forceFrame = previousFrames.get(lego.lego_id); item._source = prior ? 'kept:previous-plan' : 'judged:previous-plan'; }
    else if (prior) { item.forceFrame = priorFrame(prior.text); item._source = `kept:${prior.linked ? 'linked' : isPending(prior) ? 'pending' : 'unlinked'} intro`; }
    else item._source = 'judged';
    items.push(item);
  }
  const pinned = items.filter(i => i.forceFrame);
  const unpinned = items.filter(i => !i.forceFrame);
  console.log(`plan: ${legos.length} is_new LEGOs — ${humanRows.length} human-authored, ${pinned.length} frame kept/pinned, ${unpinned.length} to judge (${Math.ceil(unpinned.length / 25)} Sonnet batches); template: ${template}`);
  const { authored, flags } = await presentationAuthor.authorPresentations(sb, course, [...pinned, ...unpinned], { template, targetLangName, knownLangName, batchSize: 25,
    onProgress: (done, total) => { if (done % 200 === 0 || done === total) console.log(`  authored ${done}/${total}`); } });
  const rows = [];
  for (const a of authored) {
    const b = a._base;
    rows.push({ ...b, human: false, frame: a.frame, source: a._source, text: a.text });
  }
  rows.push(...humanRows);
  const order = new Map(legos.map((l, i) => [l.lego_id, i]));
  rows.sort((x, y) => order.get(x.lego_id) - order.get(y.lego_id));

  const problems = [];
  for (const r of rows) for (const p of lineProblems(r, introChunk)) problems.push(`${r.lego_id}: ${p}`);
  for (const g of gendered) problems.push(`${g.lego_id}: female form has ${g.male_forms.length} male counterparts (${g.male_forms.join(' | ')}) — quoted bare`);
  const dup = new Map();
  for (const r of rows) { const k = r.text; if (!dup.has(k)) dup.set(k, []); dup.get(k).push(r.lego_id); }
  const sharedText = [...dup.entries()].filter(([, ids]) => ids.length > 1).map(([text, ids]) => ({ text, lego_ids: ids }));

  const counts = {
    legos: rows.length,
    prior_linked: rows.filter(r => r.prior && r.prior.linked).length,
    prior_linked_mirror: rows.filter(r => r.prior && r.prior.linked && r.prior.mirrors).length,
    prior_linked_stale: rows.filter(r => r.prior && r.prior.linked && !r.prior.mirrors).length,
    prior_unlinked_only: rows.filter(r => r.prior && !r.prior.linked && !r.prior.pending).length,
    prior_pending_only: rows.filter(r => r.prior && !r.prior.linked && r.prior.pending).length,
    no_prior: rows.filter(r => !r.prior).length,
    prior_ending_in_defect: rows.filter(r => r.prior && DEFECT_TAIL.test(r.prior.text)).length,
    proposed_A: rows.filter(r => r.frame === 'A').length,
    proposed_B: rows.filter(r => r.frame === 'B').length,
    proposed_human: rows.filter(r => r.human).length,
    gendered_both_forms: rows.filter(r => r.chunkForms).length,
    judged: rows.filter(r => r.source.startsWith('judged')).length,
    unchanged_pending: rows.filter(r => r.prior && r.prior.pending && r.prior.text === r.text).length,
    author_flags: flags.length,
    shared_text_groups: sharedText.length,
    problems: problems.length,
  };
  const plan = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, course: COURSE, template, templateId: tpl.id, targetLangName, presVoice, counts, problems, sharedText,
    flags: flags.map(f => ({ lego_id: f.lego_id, chunk: f.chunk, issue: f.issue })), marks: [...marks.values()].map(m => ({ lego_id: m.lego_id, text: m.text })), rows };
  return plan;
}

function sampleMarkdown(plan) {
  const pick = (pred, n) => plan.rows.filter(pred).slice(0, n);
  const groups = [
    ['Stale linked intro (quotes a chunk the LEGO no longer says)', pick(r => r.prior && r.prior.linked && !r.prior.mirrors && !r.chunkForms && !isKalFamily(r.known_text), 8)],
    ['Linked intro that already quoted the right chunk (only the ending changes)', pick(r => r.prior && r.prior.linked && r.prior.mirrors && !r.chunkForms, 3)],
    ['No intro at all (never authored, or link nulled by the two-voices rebuild)', pick(r => !r.prior && !r.chunkForms, 3)],
    ['Gendered chunk — quotes the female form then the male form', pick(r => r.chunkForms, 3)],
    ['कल family — context kept (yesterday/tomorrow)', pick(r => isKalFamily(r.known_text) && r.frame === 'B', 2)],
    ['Human-authored line — Kai\'s sentences untouched, only the trailing template fragment follows', pick(r => r.human, 1)],
  ];
  const c = plan.counts;
  const lines = [`# eng_for_hin — LEGO introductions re-authored to mirror their LEGOs (dry run, job ${JOB})`, '',
    `Template now: \`${plan.template}\``, '', '## Counts (live, ' + plan.at.slice(0, 16).replace('T', ' ') + 'Z)', '',
    '| | |', '|---|---|',
    `| is_new LEGOs (each gets one intro) | ${c.legos} |`,
    `| …with a linked intro today | ${c.prior_linked} (${c.prior_linked_mirror} quote the right chunk, ${c.prior_linked_stale} quote a stale one) |`,
    `| …with only an unlinked old intro | ${c.prior_unlinked_only} |`,
    `| …with only a pending Kriti row | ${c.prior_pending_only} |`,
    `| …with no intro at all | ${c.no_prior} |`,
    `| existing intros ending in the dangling "में :" | ${c.prior_ending_in_defect} of ${c.legos - c.no_prior} |`,
    `| proposed Frame A (bare) / Frame B (with the seed sentence) / human-authored | ${c.proposed_A} / ${c.proposed_B} / ${c.proposed_human} |`,
    `| gendered chunks quoting both forms | ${c.gendered_both_forms} |`,
    `| frames decided by the Sonnet judge (no earlier intro to keep) | ${c.judged} |`,
    `| LEGO pairs sharing one identical line | ${c.shared_text_groups} |`,
    `| planned lines failing the mirror/ending checks | ${c.problems} |`, ''];
  if (plan.problems.length) { lines.push('## Problems', '', ...plan.problems.map(p => `- ${p}`), ''); }
  if (plan.flags.length) { lines.push('## Judge flags (content it thought looked wrong — recorded, not acted on)', '', ...plan.flags.map(f => `- ${f.lego_id} '${f.chunk}': ${f.issue}`), ''); }
  lines.push('## Before / after sample', '');
  for (const [title, rows] of groups) {
    if (!rows.length) continue;
    lines.push(`### ${title}`, '');
    for (const r of rows) {
      lines.push(`**${r.lego_id}** — LEGO: ${r.known_text} → ${r.target_text}${r.chunkForms ? ` (male form ${r.chunkForms.m})` : ''}`, '');
      lines.push(`- before: ${r.prior ? r.prior.text + (r.prior.pending ? ' _(pending, unrendered)_' : ` _(${r.prior.voice_id}${r.prior.linked ? ', linked' : ', unlinked'})_`) : '_none_'}`);
      lines.push(`- after: ${r.text}`, '');
    }
  }
  if (plan.sharedText.length) { lines.push('## Shared lines', '', ...plan.sharedText.map(s => `- ${s.lego_ids.join(' + ')}: ${s.text}`), ''); }
  return lines.join('\n');
}

// ── Check ───────────────────────────────────────────────────────────────────
async function check(sb) {
  const { introChunk } = require('../../services/phases/presentation-author.cjs');
  const { legos, presRows, intros, course } = await loadLive(sb);
  const presVoice = require('../../services/phases/presentation-author.cjs').resolvePresentationVoiceId(course);
  const byId = new Map(presRows.map(r => [String(r.id), r]));
  const rowsByLego = new Map();
  for (const r of presRows) if (r.lego_id) { if (!rowsByLego.has(r.lego_id)) rowsByLego.set(r.lego_id, []); rowsByLego.get(r.lego_id).push(r); }
  const introByLego = new Map(intros.map(i => [i.lego_id, i]));
  const out = { legos: legos.length, linked: 0, linked_mirror: 0, linked_stale: 0, linked_defect_tail: 0, pending_kriti_keyed: 0, pending_mirror: 0, pending_stale: 0, pending_defect_tail: 0, no_pending: [], stale_clip_still_keyed: 0, legacy_intro_rows_pointing_elsewhere: 0 };
  for (const l of legos) {
    const linked = l.presentation_audio_id ? byId.get(String(l.presentation_audio_id)) : null;
    if (linked) { out.linked++; if (mirrors(linked.text, l.known_text, introChunk)) out.linked_mirror++; else out.linked_stale++; if (DEFECT_TAIL.test(linked.text)) out.linked_defect_tail++; }
    const rows = rowsByLego.get(l.lego_id) || [];
    const pend = rows.filter(r => r.s3_key.startsWith('pending/') && r.voice_id === presVoice);
    if (pend.length) { out.pending_kriti_keyed++; for (const p of pend) { if (mirrors(p.text, l.known_text, introChunk)) out.pending_mirror++; else out.pending_stale++; if (DEFECT_TAIL.test(p.text)) out.pending_defect_tail++; } }
    else out.no_pending.push(l.lego_id);
    for (const r of rows) if (!r.s3_key.startsWith('pending/') && !mirrors(r.text, l.known_text, introChunk)) out.stale_clip_still_keyed++;
    const li = introByLego.get(l.lego_id);
    if (li && (li.presentation_audio_id || li.audio_uuid) && String(li.presentation_audio_id || li.audio_uuid) !== String(l.presentation_audio_id || '')) out.legacy_intro_rows_pointing_elsewhere++;
  }
  return out;
}

// ── Apply ───────────────────────────────────────────────────────────────────
async function apply(sb, plan) {
  const presentationAuthor = require('../../services/phases/presentation-author.cjs');
  const humanAuthored = require('../../services/shared/human-authored-presentations.cjs');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const { bumpCourseVersion, bumpCourseRevalidation } = require('../../services/shared/course-version.cjs');
  const { introChunk } = presentationAuthor;

  // Guard: the live course is what the plan was written against.
  const live = await loadLive(sb);
  const tpl = await liveTemplate(sb);
  const problems = [];
  if (tpl.template !== plan.template) problems.push(`live template is "${tpl.template}", plan used "${plan.template}"`);
  const liveLego = new Map(live.legos.map(l => [l.lego_id, l]));
  for (const r of plan.rows) {
    const l = liveLego.get(r.lego_id);
    if (!l) problems.push(`${r.lego_id} is no longer an is_new LEGO`);
    else if (l.known_text !== r.known_text || l.target_text !== r.target_text) problems.push(`${r.lego_id} moved: "${l.known_text}" → "${l.target_text}"`);
    else if ((live.seeds.get(l.seed_number) || null) !== r.seed) problems.push(`seed ${l.seed_number} text moved`);
  }
  for (const l of live.legos) if (!plan.rows.some(r => r.lego_id === l.lego_id)) problems.push(`${l.lego_id} is new since the plan`);
  for (const m of plan.marks) { const lm = live.marks.get(m.lego_id); if (!lm || lm.text !== m.text) problems.push(`mark ${m.lego_id} moved`); }
  if (live.marks.size !== plan.marks.length) problems.push('a mark was added since the plan');
  for (const r of plan.rows) for (const p of lineProblems(r, introChunk)) problems.push(`${r.lego_id}: ${p}`);
  if (plan.rows.some(r => r.tailUnrecognised)) problems.push('a human-authored line does not end in the ordinary bare intro — not touching it');
  if (problems.length) { console.error('GUARD FAILED — refusing:\n  ' + problems.join('\n  ')); process.exit(2); }
  const presVoice = presentationAuthor.resolvePresentationVoiceId(live.course);
  if (presVoice !== plan.presVoice) { console.error(`presentation voice moved: ${presVoice} vs plan ${plan.presVoice}`); process.exit(2); }
  const pending = must(await sb.from('audio_pass_requests').select('id, reason, metadata').eq('course_code', COURSE).eq('status', 'pending').maybeSingle(), 'pending audio pass');
  if (!pending) throw new Error(`no pending audio-pass request for ${COURSE} — queue one with queue-audio-pass.cjs`);
  console.log('guard: live course matches the plan');

  // What will move — computed before anything is written.
  const byId = new Map(live.presRows.map(r => [String(r.id), r]));
  const isPending = (r) => r.s3_key.startsWith('pending/');
  const kritiByNorm = new Map(live.presRows.filter(r => r.voice_id === presVoice).map(r => [normalizeForAudio(r.text), r]));
  const unlinkFk = [];        // course_legos.presentation_audio_id → NULL
  const detachClips = [];     // stale rendered rows: lego_id → NULL
  const rewordPending = [];   // pending Kriti rows keyed to the LEGO whose text differs
  const insertRows = [];      // new pending rows
  const dropPending = [];     // pending placeholders whose new words another Kriti row already carries
  const seen = new Set();
  for (const r of plan.rows) {
    const l = liveLego.get(r.lego_id);
    const linked = l.presentation_audio_id ? byId.get(String(l.presentation_audio_id)) : null;
    if (linked && linked.text !== r.text) unlinkFk.push({ lego_id: r.lego_id, seed_number: r.seed_number, audio: linked });
    const keyed = live.presRows.filter(x => x.lego_id === r.lego_id);
    const norm = normalizeForAudio(r.text);
    for (const x of keyed) {
      if (isPending(x)) {
        // A pending placeholder in a voice that is not the presentation voice (the six xai_eve कल rows phase8 queued on
        // 2026-09-03 before Kriti was cast) can never render as the course's intro: no asset, dropped and logged.
        if (x.voice_id !== presVoice) { dropPending.push({ row: x, to: r, keptRow: null, why: `pending row in ${x.voice_id}, presentation voice is ${presVoice}` }); continue; }
        if (x.text === r.text) continue;
        const clash = kritiByNorm.get(norm);
        // Re-word in place — unless another Kriti row already carries the new words (unique key), in which case this
        // placeholder is a duplicate: it has no asset and is dropped, and the LEGO shares the existing row by text.
        if (clash && clash.id !== x.id) dropPending.push({ row: x, to: r, keptRow: clash.id });
        else rewordPending.push({ row: x, to: r });
      }
      else if (x.text !== r.text) detachClips.push({ lego_id: r.lego_id, seed_number: r.seed_number, audio: x });
    }
    const already = kritiByNorm.get(norm);
    const rewordCovers = rewordPending.some(p => p.to.lego_id === r.lego_id);
    if (rewordCovers) seen.add(norm);
    if (!already && !rewordCovers && !seen.has(norm)) { insertRows.push(r); seen.add(norm); }
  }
  const legacyRows = live.intros.filter(i => plan.rows.some(r => r.lego_id === i.lego_id));
  console.log(`apply: unlink ${unlinkFk.length} FK links, detach ${detachClips.length} stale clips, reword ${rewordPending.length} pending rows, drop ${dropPending.length} duplicate pending placeholders, insert ${insertRows.length} pending rows, retire ${legacyRows.length} legacy lego_introductions rows`);

  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const seedsTouched = [...new Set(plan.rows.map(r => r.seed_number))].sort((a, b) => a - b);
  // Whole-course snapshot (~7.5 MB of LEGO+phrase JSON) in chunks of 100 seeds — one PostgREST insert per chunk; every batch id is in the event.
  // --snapshot-batches <ids> resumes an interrupted apply on the snapshot it already took (the course is unchanged in the
  // ways the snapshot records: no seed/LEGO/phrase text moved), rather than writing another 7.5 MB of before-images.
  const snapBatches = arg('--snapshot-batches') ? arg('--snapshot-batches').split(',') : [];
  for (let i = 0; snapBatches.length === 0 && i < seedsTouched.length; i += 100) {
    const s = await snapshotSeeds(sb, COURSE, seedsTouched.slice(i, i + 100), { reason: 'presentation-reauthor', notes: `${RULING}. Links only — no seed/LEGO/phrase text changes (chunk ${Math.floor(i / 100) + 1}). Undo: POST /api/build/redo-undo/${COURSE}.` });
    snapBatches.push(s.batchId);
  }
  const snap = { batchId: snapBatches.join(',') };
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'presentation-reauthor',
    scope: { seeds: seedsTouched, legos: plan.rows.map(r => r.lego_id) },
    detail: { job: JOB, ruling: RULING, template: plan.template, counts: plan.counts, snapshot_batches: snapBatches,
      unlinked_fk: unlinkFk.map(u => ({ lego_id: u.lego_id, audio_id: u.audio.id, text: u.audio.text, voice_id: u.audio.voice_id })),
      detached_clips: detachClips.map(d => ({ lego_id: d.lego_id, audio_id: d.audio.id, text: d.audio.text, voice_id: d.audio.voice_id })),
      reworded_pending: rewordPending.map(p => ({ id: p.row.id, from: p.row.text, to: p.to.text })),
      dropped_pending_placeholders: dropPending.map(p => ({ id: p.row.id, text: p.row.text, voice_id: p.row.voice_id, lego_id: p.row.lego_id, kept_row: p.keptRow, why: p.why || 'another Kriti row already carries the new words' })),
      legacy_intro_rows: legacyRows, human_authored: plan.rows.filter(r => r.human).map(r => ({ lego_id: r.lego_id, from: r.markText, to: r.text })) },
  });
  console.log(`edit event ${eventId}; snapshot batch ${snap.batchId} (${seedsTouched.length} seeds${arg('--snapshot-batches') ? ', reused' : ''})`);

  // 1. Human-authored tails — the mark first, then its row (the trigger refuses the other order).
  for (const r of plan.rows.filter(x => x.human && x.tailFollowed)) {
    const mark = live.marks.get(r.lego_id);
    await humanAuthored.recordWordingEdit(sb, mark, { text: r.text, by: `${SWEEP} (job ${JOB})`, why: 'the course\'s ordinary bare introduction changed its ending ("में :" → the template\'s "is:" tail); the human sentences are byte-identical', lego: liveLego.get(r.lego_id) });
    console.log(`mark ${r.lego_id}: tail followed`);
  }
  // 2. Pending Kriti rows keyed to a LEGO: re-worded in place.
  for (const p of rewordPending) {
    must(await sb.from('course_audio').update({ text: p.to.text, text_normalized: normalizeForAudio(p.to.text) }).eq('id', p.row.id).eq('text', p.row.text), `reword ${p.row.id}`);
  }
  for (const p of dropPending) must(await sb.from('course_audio').delete().eq('id', p.row.id).like('s3_key', 'pending/%'), `drop placeholder ${p.row.id}`);
  // 3. New pending rows keyed to their LEGO.
  const toInsert = insertRows.map(r => ({ course_code: COURSE, text: r.text, text_normalized: normalizeForAudio(r.text), language: live.course.known_lang, role: 'presentation', voice_id: presVoice, origin: 'tts', s3_key: `pending/${randomUUID().toUpperCase()}.mp3`, lego_id: r.lego_id }));
  // 25 rows per statement: the audio_autolink trigger runs per row and a 200-row upsert hit the pooler's statement timeout.
  for (let i = 0; i < toInsert.length; i += 25) {
    must(await sb.from('course_audio').upsert(toInsert.slice(i, i + 25), { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true }), 'insert pending');
    if ((i / 25) % 10 === 0) console.log(`  inserted ${Math.min(i + 25, toInsert.length)}/${toInsert.length}`);
  }
  // 4. Unlink: FK, stale clip lego_id, legacy rows — each drop logged.
  const drops = [];
  for (const u of unlinkFk) {
    must(await sb.from('course_legos').update({ presentation_audio_id: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('lego_id', u.lego_id).eq('presentation_audio_id', u.audio.id), `unlink ${u.lego_id}`);
    drops.push({ table_name: 'course_legos', row_id: u.lego_id, course_code: COURSE, seed_number: u.seed_number, column_name: 'presentation_audio_id', role: 'presentation', old_audio_id: u.audio.id, old_text: u.audio.text, old_voice_id: u.audio.voice_id, reason: `presentation-reauthor: intro no longer mirrors the LEGO (job ${JOB}, event ${eventId})` });
  }
  for (const d of detachClips) {
    must(await sb.from('course_audio').update({ lego_id: null }).eq('id', d.audio.id).eq('lego_id', d.lego_id), `detach ${d.audio.id}`);
    drops.push({ table_name: 'course_audio', row_id: String(d.audio.id), course_code: COURSE, seed_number: d.seed_number, column_name: 'lego_id', role: 'presentation', old_audio_id: d.audio.id, old_text: d.audio.text, old_voice_id: d.audio.voice_id, reason: `presentation-reauthor: stale clip detached from ${d.lego_id} so the player's lego_id fallback stops serving it (job ${JOB}, event ${eventId}); asset kept` });
  }
  if (legacyRows.length) {
    for (let i = 0; i < legacyRows.length; i += 200) must(await sb.from('lego_introductions').delete().in('id', legacyRows.slice(i, i + 200).map(x => x.id)), 'legacy rows');
    for (const x of legacyRows) drops.push({ table_name: 'lego_introductions', row_id: x.lego_id, course_code: COURSE, column_name: 'presentation_audio_id', role: 'presentation', old_audio_id: x.presentation_audio_id || x.audio_uuid || null, reason: `presentation-reauthor: legacy intro link retired; phase8 /generate re-populates on link (job ${JOB}, event ${eventId})` });
  }
  for (let i = 0; i < drops.length; i += 500) { const { error } = await sb.from('content_audio_link_drops').insert(drops.slice(i, i + 500)); if (error) console.warn(`drop log: ${error.message}`); }
  if (plan.flags.length) await presentationAuthor.recordAuthorFlags(sb, COURSE, plan.flags.map(f => ({ ...f, seed: null })));

  // 5. Verify what landed.
  const after = await check(sb);
  const bad = [];
  if (after.linked_stale) bad.push(`${after.linked_stale} linked intros still stale`);
  if (after.pending_stale || after.pending_defect_tail) bad.push(`${after.pending_stale} pending rows stale, ${after.pending_defect_tail} with the defect tail`);
  if (after.stale_clip_still_keyed) bad.push(`${after.stale_clip_still_keyed} stale clips still keyed to a LEGO`);
  const sharedIds = new Set(plan.sharedText.flatMap(s => s.lego_ids));
  const missing = after.no_pending.filter(id => !sharedIds.has(id));
  if (missing.length) bad.push(`${missing.length} LEGOs without a pending Kriti row: ${missing.slice(0, 10).join(',')}`);
  for (const s of plan.sharedText) {
    const rows = must(await sb.from('course_audio').select('id, lego_id').eq('course_code', COURSE).eq('role', 'presentation').eq('voice_id', presVoice).eq('text_normalized', normalizeForAudio(s.text)), 'shared check');
    if (!rows.length) bad.push(`shared line for ${s.lego_ids.join('+')} has no Kriti row`);
  }
  if (bad.length) throw new Error(`POST-APPLY CHECK FAILED (snapshot ${snap.batchId}, event ${eventId}): ${bad.join('; ')}`);
  console.log(`verified: ${after.pending_kriti_keyed} LEGOs carry a pending Kriti intro quoting their LEGO (${after.pending_mirror} rows), ${after.linked_stale} stale links, ${after.stale_clip_still_keyed} stale clips keyed; ${after.no_pending.length} LEGO(s) share another LEGO's identical line until /generate links by text`);

  // 6. Audio pass appended; app revalidation.
  const mine = `LEGO intros re-authored to mirror their LEGOs (Kai, job ${JOB}, 2026-09-24): ${plan.counts.legos} pending Kriti intros (${insertRows.length} new, ${rewordPending.length} re-worded, template tail "है :"), ${unlinkFk.length} stale intro links cleared + ${detachClips.length} stale clips detached (assets kept), render all together`;
  must(await sb.from('audio_pass_requests').update({ reason: `${pending.reason} + ${mine}`, metadata: { ...pending.metadata, job20ReauthorIntros: { editEventId: eventId, snapshotBatch: snap.batchId, template: plan.template, legos: plan.counts.legos, inserted: insertRows.length, reworded: rewordPending.length, unlinked: unlinkFk.length, detached: detachClips.length } }, updated_at: new Date().toISOString() }).eq('id', pending.id), 'audio-pass append');
  await bumpCourseVersion(sb, COURSE, 'patch');
  await bumpCourseRevalidation(sb, COURSE);
  return { eventId, snapshot: snap.batchId, unlinked: unlinkFk.length, detached: detachClips.length, reworded: rewordPending.length, inserted: insertRows.length, legacyRetired: legacyRows.length, after };
}

async function installTemplate(sb, text) {
  if (DEFECT_TAIL.test(text)) throw new Error('refusing: the new template still ends in "में :"');
  for (const slot of ['{target_lang_name}', '{known}', '{seed}']) if (!text.includes(slot)) throw new Error(`template lacks ${slot}`);
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const old = await liveTemplate(sb);
  if (old.template === text) { console.log('template already live'); return old; }
  const eventId = await recordContentEdit(sb, { identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: COURSE, surface: SURFACE, operation: 'presentation-template', scope: { known_lang: 'hin' }, detail: { job: JOB, ruling: RULING, from: old.template, to: text, retired_template_id: old.id } });
  must(await sb.from('presentation_templates').update({ is_active: false }).eq('id', old.id), 'retire old');
  const row = must(await sb.from('presentation_templates').insert({ template: text, known_lang: 'hin', priority: (old.priority || 0) + 1, is_active: true }).select().single(), 'insert new');
  console.log(`template installed (event ${eventId}): ${row.template}`);
  return row;
}

async function main() {
  const sb = supa();
  const { evidencePath } = require('../lib/evidence-path.cjs');
  if (process.argv.includes('--check')) { console.log(JSON.stringify(await check(sb), (k, v) => k === 'no_pending' ? `${v.length} LEGOs: ${v.slice(0, 8).join(',')}${v.length > 8 ? '…' : ''}` : v, 1)); return; }
  const install = arg('--install-template');
  if (install) { await installTemplate(sb, install); return; }
  if (process.argv.includes('--apply')) {
    const planFile = arg('--plan');
    if (!planFile) throw new Error('--apply needs --plan <file>');
    const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
    const result = await apply(sb, plan);
    const ev = evidencePath(`tools/course-optimization/${SWEEP}-applied.json`);
    fs.writeFileSync(ev, JSON.stringify({ plan: planFile, ...result }, null, 1));
    console.log(`applied. evidence: ${ev}`);
    return;
  }
  const plan = await buildPlan(sb, { framesFrom: arg('--frames-from'), templateOverride: arg('--template') });
  const ev = evidencePath(`tools/course-optimization/${SWEEP}-plan.json`);
  fs.writeFileSync(ev, JSON.stringify(plan, null, 1));
  const md = evidencePath(`tools/course-optimization/${SWEEP}-sample.md`);
  fs.writeFileSync(md, sampleMarkdown(plan));
  console.log(JSON.stringify(plan.counts, null, 1));
  if (plan.problems.length) console.log('PROBLEMS:\n  ' + plan.problems.join('\n  '));
  console.log(`DRY RUN — nothing written. plan: ${ev}\nsample: ${md}`);
}

module.exports = { COURSE, JOB, SWEEP, DEFECT_TAIL, quotedChunk, mirrors, priorFrame, isKalFamily, humanLineWithNewTail, lineProblems, sampleMarkdown };
if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
