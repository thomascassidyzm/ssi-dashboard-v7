#!/usr/bin/env node
'use strict';
/**
 * PAID CLEANUP ITEM 8B (cs #710·AI, Kai 18 Nov 2026): the Hindi two-known-voice rule
 * (services/shared/known-voice-gender.cjs, services/known-gender/gendered-known-plan.cjs — Kai's design 2026-09-23,
 * applied to eng_for_hin by #941·H) carried to eng_for_guj, eng_for_urd and eng_for_pan.
 *
 * NO DATABASE CODE. Reads are files made by the committed read-only dumps (QA copy):
 *   tools/course-optimization/course-dump-readonly-2026-10-14.cjs <course> <dump.json>
 *   tools/course-optimization/gender-pairs-dump-readonly-2026-10-29.cjs <course> <pairs.json>
 * Writes go through Popty only: POST :3470/api/production/:course/edit-batch (dry run, then apply, undo kept),
 * POST :3470/api/audio/render (the one audio route), POST :3470/api/production/:course/link-clip.
 *
 * Modes
 *   detect <course> <texts.json> <out.json>     the committed speaker-gender detector (Claude CLI, sonnet) over a text list
 *   plan   <course> <dump> <pairs> <detect>     pair list of record + the balanced plan → ops files in ops/paid-cleanup-item8b/<course>/
 *   post   <course> <ops.json> dry|apply        edit-batch, writes <ops>.dry.json / .apply.json (event id + undo ops)
 *   audio  <course> <dump> <pairs> <detect> dry|render [--max-chars N]
 *                                               every known slot whose clip is not in the voice its text resolves to,
 *                                               and every silent known slot: render (voice NAMED) then link-clip
 *                                               replace+expectCurrent (make-before-break; old clips never deleted)
 *
 * THE PAIR LIST OF RECORD. The three courses already hold July gender-prep pairs (text_side='known'), made before the
 * speaker-only detector existed, so they may mix listener / third-person agreement in (the detector's own header says
 * so; #941·H removed 179 such pairs from eng_for_hin). So every text the plan would touch is put to the detector:
 *   stored pair + detector 'gendered'   → kept; where its forms differ the DETECTOR's win (gender.update): the July female
 *                                         forms are often wrong (guj ગયું/રહ્યી for ગઈ/રહી)
 *   stored pair + detector 'neutral'    → NOT speaker-gendered: gender.delete (the #941·H precedent), never rewritten
 *   stored pair + 'unverified'/unasked  → kept in the DB, left out of the rewrite plan (voice still follows its form)
 *   no stored pair + 'gendered'         → gender.insert (text_side 'known')
 */
const fs = require('fs');
const path = require('path');
const { buildGenderedKnownPlan } = require('../../services/known-gender/gendered-known-plan.cjs');
const { detectKnownSpeakerGender } = require('../../services/known-gender/detect-known-speaker-gender.cjs');
const kv = require('../../services/shared/known-voice-gender.cjs');

const POPTY = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'cs-item8b-710AI';
const LANG = { eng_for_guj: 'guj', eng_for_urd: 'urd', eng_for_pan: 'pan' };
// Kai's provisional casting (18 Nov): the existing female Azure voice stays f, an Azure native male is m.
const VOICES = {
  eng_for_guj: { f: 'azure_gu-IN-DhwaniNeural', m: 'azure_gu-IN-NiranjanNeural' },
  eng_for_urd: { f: 'azure_ur-PK-UzmaNeural', m: 'azure_ur-PK-AsadNeural' },
  eng_for_pan: { f: 'azure_pa-IN-VaaniNeural', m: 'azure_pa-IN-OjasNeural' },
};
const APPROVAL = 'kai:2026-11-18:item 8B gendered known lines voiced in the voice of their own grammar (cs #710·AI)';
const PURPOSE = 'paid cleanup item 8B: known line in the voice of its own speaker grammar (Kai 18 Nov, cs #710·AI)';

const dirFor = (course) => { const d = path.join(__dirname, course); fs.mkdirSync(d, { recursive: true }); return d; };
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const wr = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1));
const nk = kv.normalizeKnownKey;
const realPair = (p) => p.text_side === 'known' && p.expanded_m && p.expanded_f && nk(p.expanded_m) !== nk(p.expanded_f);

async function waitForPopty(course) {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(`${POPTY}/api/production/${course}/edit-ops`, { signal: AbortSignal.timeout(5000) }); if (r.ok) return; } catch {}
    await new Promise((res) => setTimeout(res, 5000));
  }
  throw new Error('Popty did not come back in 10 minutes');
}

async function post(p, body, headers = {}) {
  try {
    const r = await fetch(POPTY + p, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT, ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}

/** Pure: the pair list of record after the detector, and the gender.* ops that make the DB say so. */
function pairListOfRecord(course, stored, detection) {
  const det = new Map((detection.results || []).map((r) => [nk(r.text), r]));
  const keep = [], dropOps = [], insertOps = [], fixOps = [], disagree = [], unverifiedKept = [];
  const covered = new Set();
  for (const p of stored.filter(realPair)) {
    const hits = [det.get(nk(p.expanded_m)), det.get(nk(p.expanded_f))].filter(Boolean);
    covered.add(nk(p.expanded_m)); covered.add(nk(p.expanded_f));
    if (!hits.length) { unverifiedKept.push({ id: p.id, why: 'not asked (neither form is a course text)' }); continue; }
    if (hits.some((h) => h.status === 'gendered')) {
      const h = hits.find((x) => x.status === 'gendered');
      if (nk(h.m) !== nk(p.expanded_m) || nk(h.f) !== nk(p.expanded_f)) {
        // The July rows carry wrong female forms (guj neuter ગયું for ગઈ, misspelt રહ્યી for રહી): the detector's
        // forms are checked mechanically (one form = the course text byte for byte, same word count), so they win.
        disagree.push({ id: p.id, stored: [p.expanded_m, p.expanded_f], detector: [h.m, h.f] });
        fixOps.push({ op: 'gender.update', id: p.id, set: { expanded_m: h.m, expanded_f: h.f }, expect: { expanded_m: p.expanded_m, expanded_f: p.expanded_f } });
        keep.push({ ...p, expanded_m: h.m, expanded_f: h.f });
      } else keep.push(p);
    } else if (hits.every((h) => h.status === 'neutral')) {
      dropOps.push({ op: 'gender.delete', id: p.id, expect: { expanded_m: p.expanded_m, expanded_f: p.expanded_f, text_side: 'known' } });
    } else unverifiedKept.push({ id: p.id, why: hits.map((h) => h.reason || h.status).join('; ') });
  }
  const seen = new Set();
  for (const r of detection.results || []) {
    if (r.status !== 'gendered') continue;
    const k = nk(r.text);
    if (covered.has(k) || covered.has(nk(r.m)) || covered.has(nk(r.f)) || seen.has(nk(r.m))) continue;
    seen.add(nk(r.m));
    const row = { course_code: course, original_text: r.text, language: LANG[course], expanded_m: r.m, expanded_f: r.f, text_side: 'known' };
    // (course_code, original_text, language) is unique: a stored row keyed on this text whose forms are an OLDER wording
    // (the course text was edited after July) is updated to the detector's forms, never duplicated.
    const old = stored.find((p) => p.original_text === r.text && p.language === LANG[course]);
    if (old) fixOps.push({ op: 'gender.update', id: old.id, set: { expanded_m: r.m, expanded_f: r.f, text_side: 'known' }, expect: { expanded_m: old.expanded_m, expanded_f: old.expanded_f } });
    else insertOps.push({ op: 'gender.insert', row });
    keep.push({ ...row, id: null });
  }
  return { keep, dropOps, insertOps, fixOps, disagree, unverifiedKept };
}

/** Pure: the edit-batch ops for one plan. Every op carries an expect on the text it was planned from. */
function planOps(course, plan, phrasesById) {
  const ops = [];
  for (const c of plan.collapses) ops.push({ op: 'phrase.delete', phrase_id: c.drop, expect: { known_text: c.drop_known } });
  for (const f of plan.legoFlips) ops.push({ op: 'lego.update', lego_id: f.lego_id, set: { known_text: f.to }, expect: { known_text: f.from } });
  for (const a of plan.phraseAssignments) {
    const meta = { ...((phrasesById.get(a.id) || {}).metadata || {}), known_gender: a.gender, known_gender_stamped_at: plan.at, known_gender_job: 'cs #710·AI item 8B' };
    const set = { metadata: meta };
    if (a.rewrite) set.known_text = a.to;
    ops.push({ op: 'phrase.update', phrase_id: a.id, set, expect: { known_text: a.from } });
  }
  for (const a of plan.seedAssignments.filter((x) => x.rewrite)) ops.push({ op: 'seed.update', seed_number: a.seed_number, set: { known_text: a.to }, expect: { known_text: a.from } });
  return ops;
}

function loadDump(dumpFile) {
  const d = rd(dumpFile);
  d.seeds = d.seeds.map((s) => ({ ...s, seed_id: s.seed_id || `S${String(s.seed_number).padStart(4, '0')}` }));
  return d;
}

/** Pure: which voice a known text must be spoken in, under the rule, given the pair list of record. */
function voiceForText(course, text, index, anchors) {
  const g = kv.knownGenderForText(text, index, { salt: course, anchors });
  return { gender: g.gender, source: g.source, voiceId: VOICES[course][g.gender] };
}

async function main() {
  const [mode, course, ...rest] = process.argv.slice(2);
  if (!LANG[course]) throw new Error(`course must be one of ${Object.keys(LANG).join(', ')}`);
  const dir = dirFor(course);

  if (mode === 'detect') {
    const [inFile, outFile] = rest;
    const texts = rd(inFile);
    const t0 = Date.now();
    const det = await detectKnownSpeakerGender(texts, { language: LANG[course], concurrency: +(process.env.CONCURRENCY || 4),
      onProgress: (d, t) => { if (d % 5 === 0 || d === t) console.log(`batch ${d}/${t} ${Math.round((Date.now() - t0) / 1000)}s`); } });
    det.course_code = course; det.at = new Date().toISOString();
    wr(outFile, det);
    console.log(`${course} detect: ${JSON.stringify(det.coverage)} → ${outFile}`);
    return;
  }

  if (mode === 'plan') {
    const [dumpFile, pairsFile, detFile] = rest;
    const d = loadDump(dumpFile), stored = rd(pairsFile), det = rd(detFile);
    const rec = pairListOfRecord(course, stored, det);
    const plan = buildGenderedKnownPlan({ courseCode: course, seeds: d.seeds, legos: d.legos, phrases: d.phrases, pairs: rec.keep });
    plan.at = new Date().toISOString();
    const ops = planOps(course, plan, new Map(d.phrases.map((p) => [p.id, p])));
    wr(path.join(dir, 'pairs-ops.json'), { ops: [...rec.dropOps, ...rec.fixOps, ...rec.insertOps] });
    wr(path.join(dir, 'text-ops.json'), { ops });
    wr(path.join(dir, 'pair-review.json'), { disagree: rec.disagree, unverifiedKept: rec.unverifiedKept, dropped: rec.dropOps.length, inserted: rec.insertOps.length, kept: rec.keep.length });
    const { assignments, ...slim } = plan;
    wr(path.join(dir, 'plan.json'), slim);
    console.log(JSON.stringify({ course, pairs: { kept: rec.keep.length, insert: rec.insertOps.length, drop: rec.dropOps.length, disagree: rec.disagree.length, unverifiedKept: rec.unverifiedKept.length },
      counts: plan.counts, voiced: plan.voiced, bySource: plan.bySource, textOps: ops.length, notes: plan.notes.length }, null, 1));
    return;
  }

  if (mode === 'post') {
    const [opsFile, how] = rest;
    const { ops } = rd(opsFile);
    const out = { at: new Date().toISOString(), batches: [] };
    const N = +(process.env.CHUNK || 40); // 813 ops in one transaction hit the statement timeout (57014)
    // A work queue: a chunk that times out (57014, rolled back) or is refused (drift, a rule) is split in half and retried,
    // down to one op; a single op that is still refused is recorded as skipped (another job moved the row, or a rule said no).
    const queue = [];
    for (let i = 0; i < ops.length; i += N) queue.push({ from: i, chunk: ops.slice(i, i + N) });
    const outFile = opsFile.replace(/\.json$/, `.${how}.json`);
    out.skipped = [];
    while (queue.length) {
      const { from, chunk } = queue.shift();
      // Popty restarts on every main push (auto-deploy, 2 min): wait it out. A request that never reached it (ECONNREFUSED)
      // is sent again; one dropped mid-flight is retried only as a dry run — an apply stops so a person reads what landed.
      let r;
      for (let attempt = 0; attempt < 30; attempt++) {
        await waitForPopty(course);
        r = await post(`/api/production/${course}/edit-batch`, { ops: chunk, apply: how === 'apply', reason: PURPOSE });
        const net = r.status === 0 || r.status === 502 || r.status === 503;
        if (!net) break;
        if (how === 'apply' && r.body.error !== 'ECONNREFUSED') { console.log(`STOP: ${course} ${how} ${from} dropped mid-request (${r.body.error}) — read what landed before re-running`); wr(outFile, out); process.exit(3); }
      }
      const b = r.body || {};
      const good = r.status === 200 && b.ok !== false;
      if (!good && r.status !== 0) {
        if (chunk.length > 1) { const h = Math.ceil(chunk.length / 2); queue.unshift({ from, chunk: chunk.slice(0, h) }, { from: from + h, chunk: chunk.slice(h) }); continue; }
        out.skipped.push({ from, op: chunk[0], status: r.status, code: b.code || null, error: b.error || null });
        console.log(`SKIP ${course} ${how} ${from}: ${r.status} ${b.code || ''} ${String(b.error || '').slice(0, 200)}`);
        wr(outFile, out); continue;
      }
      out.batches.push({ from, n: chunk.length, status: r.status, ok: b.ok, event_id: b.event_id || null, undo_file: b.undo_file || null, undo_ops: b.undo_ops || null, counts: b.counts || b.summary || null });
      console.log(`${course} ${how} ${from}+${chunk.length}: ${r.status} event=${b.event_id || '-'}`);
      wr(outFile, out);
    }
    wr(opsFile.replace(/\.json$/, `.${how}.json`), out);
    return;
  }

  if (mode === 'audio') {
    const [dumpFile, pairsFile, detFile, how] = rest;
    const maxChars = +(process.argv.includes('--max-chars') ? process.argv[process.argv.indexOf('--max-chars') + 1] : 60000);
    const d = loadDump(dumpFile), stored = rd(pairsFile), det = rd(detFile);
    const clipVoices = fs.existsSync(path.join(dir, 'clip-voices.json')) ? rd(path.join(dir, 'clip-voices.json')) : null;
    if (!clipVoices) throw new Error(`run tools/audio/clip-voices.cjs over the course's known clip ids first → ${dir}/clip-voices.json`);
    const voiceOf = new Map();
    for (const [v, list] of Object.entries(clipVoices.voices || {})) for (const c of list) voiceOf.set(c.id, v);
    const rec = pairListOfRecord(course, stored, det);
    const index = kv.buildKnownGenderIndex(rec.keep);
    const anchors = kv.buildAnchorSet([...d.legos.map((l) => l.known_text), ...d.seeds.map((s) => s.known_text)]);
    // slots: phrases, LEGOs, seeds — known side only
    const slots = [
      ...d.phrases.map((p) => ({ kind: 'phrase', id: p.id, text: p.known_text, current: p.known_audio_id || null })),
      ...d.legos.map((l) => ({ kind: 'lego', id: l.lego_id, text: l.known_text, current: l.known_audio_id || null })),
      ...d.seeds.map((s) => ({ kind: 'seed', id: s.seed_number, text: s.known_text, current: s.known_audio_id || null })),
    ].filter((s) => s.text && s.text.trim());
    const work = [];
    let neutralHashMaleStillFemale = 0, neutralHashMaleChars = 0;
    for (const s of slots) {
      const v = voiceForText(course, s.text, index, anchors);
      const cur = s.current ? voiceOf.get(s.current) : null;
      if (s.current && cur === v.voiceId) continue;
      if (s.current && v.source === 'hash') { neutralHashMaleStillFemale++; neutralHashMaleChars += s.text.length; continue; } // taste-safe: neutral clips stay
      if (s.current && v.source === 'anchor') continue; // anchored female line already voiced: nothing to do unless male voice holds it
      work.push({ ...s, want: v.voiceId, gender: v.gender, source: v.source, currentVoice: cur });
    }
    // one render per distinct text+voice
    const byText = new Map();
    for (const w of work) { const k = `${w.want}\u0000${w.text.trim()}`; if (!byText.has(k)) byText.set(k, { text: w.text.trim(), voiceId: w.want, slots: [] }); byText.get(k).slots.push(w); }
    const LOG = path.join(dir, `render-${how}.jsonl`);
    const done = new Map((fs.existsSync(path.join(dir, 'render-render.jsonl')) ? fs.readFileSync(path.join(dir, 'render-render.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [])
      .filter((l) => l.status === 200 && l.body.audioId).map((l) => [`${l.voiceId}\u0000${l.text}`, l.body.audioId]));
    console.log(`${course} audio ${how}: ${work.length} slots, ${byText.size} distinct texts; neutral lines the hash gives male still female-voiced (left): ${neutralHashMaleStillFemale} (${neutralHashMaleChars} chars)`);
    wr(path.join(dir, 'audio-census.json'), { at: new Date().toISOString(), slots: work.length, texts: byText.size, neutralHashMaleStillFemale, neutralHashMaleChars,
      byReason: work.reduce((a, w) => { const k = `${w.current ? 'revoice' : 'silent'}:${w.gender}:${w.source}`; a[k] = (a[k] || 0) + 1; return a; }, {}) });
    let spent = 0, planned = 0;
    const results = [];
    for (const t of byText.values()) {
      const key = `${t.voiceId}\u0000${t.text}`;
      if (done.has(key)) { results.push({ ...t, audioId: done.get(key) }); continue; }
      planned += t.text.length;
      if (how === 'render' && spent + t.text.length > maxChars) { console.log(`STOP: --max-chars ${maxChars} reached`); break; }
      const body = { courseCode: course, role: 'known', text: t.text, voiceId: t.voiceId, purpose: PURPOSE, approval: APPROVAL, dryRun: how !== 'render' };
      const r = await post('/api/audio/render', body, { 'x-cs-conv': process.env.CS_CONV_TOKEN || '' });
      fs.appendFileSync(LOG, JSON.stringify({ text: t.text, voiceId: t.voiceId, status: r.status, body: r.body }) + '\n');
      if (r.status !== 200 || !r.body.ok) {
        console.log(`REFUSED ${r.status} ${r.body.code || ''} ${String(r.body.error || '').slice(0, 200)} — "${t.text.slice(0, 40)}"`);
        results.push({ ...t, refused: r.body.code || r.status });
        if (r.status === 402 || ['DAILY_TOTAL_CAP', 'NOT_IN_CHAIN'].includes(r.body.code)) break; // the answer: stop
        continue;
      }
      spent += r.body.charsSpent || 0;
      results.push({ ...t, audioId: r.body.audioId || null, source: r.body.source });
    }
    console.log(`${course} audio ${how}: planned ${planned} chars, spent ${spent}`);
    if (how !== 'render') return;
    // link: make-before-break — the clip exists (render answered with its id) before any slot moves; replace only what we read.
    const links = [];
    for (const t of results) if (t.audioId) for (const s of t.slots) {
      const slot = s.kind === 'phrase' ? { phraseId: s.id } : s.kind === 'lego' ? { legoId: s.id } : { seedNumber: s.id };
      links.push({ ...slot, role: 'known', audioId: t.audioId, ...(s.current ? { replace: true, expectCurrent: s.current } : {}) });
    }
    wr(path.join(dir, 'links.json'), links);
    const linkOut = [];
    for (let i = 0; i < links.length; i += 500) {
      const r = await post(`/api/production/${course}/link-clip`, { links: links.slice(i, i + 500) });
      linkOut.push({ from: i, status: r.status, body: r.body });
      console.log(`${course} link ${i}: ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
    }
    wr(path.join(dir, 'link-result.json'), linkOut);
    return;
  }
  throw new Error('mode: detect | plan | post | audio');
}

module.exports = { pairListOfRecord, planOps, voiceForText, VOICES };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
