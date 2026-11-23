#!/usr/bin/env node
'use strict';
/**
 * PAID CLEANUP ITEM 8 PLAN (cs #877·AK for #868, Kai's 18 Nov approval) — female voice reading male forms, and the
 * known-side mirror. NO DATABASE. Reads only JSON the committed copy readers wrote into <dir>, plus the TTS spend
 * ledger mirror (a file) and #710·AI's detector output (branch cs/710-paid-cleanup-item-8b-hindi-two-v, a file):
 *   <course>.dump.json    tools/course-optimization/course-dump-readonly-2026-10-14.cjs
 *   <course>.pairs.json   tools/course-optimization/gender-pairs-dump-readonly-2026-10-29.cjs
 *   <course>.cand.json    ops/paid-cleanup-868/item8/tools/candidates.py (8A only)
 *   <course>.cprov.json   tools/audio/clip-provenance-readonly.cjs over <course>.cand-ids.txt (8A)
 *   <course>.kvoices.json tools/audio/clip-voices.cjs over every known clip id (8B)
 *   <course>.detect.json  #710·AI's detector output (8B)
 *
 * 8A (target courses). target1 is the female seat (render-gender-prep.cjs; every target1 clip on the copy is a female
 * cast voice, checked below by name). A slot is a candidate when its target_text has a stored target-side reading
 * expanded_f that differs. course_audio.text keeps the plain text even for a clip that SAYS the female form, so the
 * label cannot tell; the evidence used, strongest first (#131·AI's method, no transcription):
 *   rerecorded  a course_audio_revisions entry whose reason is a female-form re-record (#984)        -> excluded
 *   ledger      a paid call for this clip's voice within 30 min of its render: which text hash was sent -> wrong/right
 *   date        the clip was rendered BEFORE the pair's processed_at: no female reading existed, so the
 *               plain (male) text was spoken                                                           -> wrong
 *   unknown     pre-ledger render, reading already existed: phase8 MAY have spoken it                  -> listed, marked
 * 8B (eng_for_pan/urd/guj, known side). The pair list of record is #710·AI's: a stored known pair counts only when the
 * detector called one of its forms speaker-gendered (the detector's forms win); detector-only gendered texts add pairs;
 * detector-neutral pairs are dropped; stored pairs the detector never saw are left out (unverified). A known slot is
 * mis-voiced when its text is one form of a pair of record and its clip is in the other gender's voice.
 *   node plan.cjs <dir> <outDir> <ledger.jsonl>
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const kv = require('../../../../services/shared/known-voice-gender.cjs');

const [dir, outDir, ledgerFile] = process.argv.slice(2);
if (!dir || !outDir || !ledgerFile) throw new Error('usage: plan.cjs <dir> <outDir> <ledger.jsonl>');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const A = ['spa_mx_for_eng', 'fra_ca_for_eng', 'por_br_for_eng', 'ara_for_eng'];
const B = ['eng_for_pan', 'eng_for_urd', 'eng_for_guj'];

// Voice genders, by name, from ops/voice-casting/978 (registry-before.json slots, cast-settled.json) and the Azure names.
const VOICE_GENDER = {
  'es-MX-CarlotaNeural': 'f', 'es-MX-LucianoNeural': 'm', 'cartesia_5c5ad5e7-1020-476b-8b91-fdcbe9cc313c': 'f' /* Daniela */,
  'cartesia_3a35daa1-ba81-451c-9b21-59332e9db2f3': 'm' /* Alejandro */,
  'fr-CA-SylvieNeural': 'f', 'fr-CA-AntoineNeural': 'm', 'cartesia_63fdecc2-4e1d-4aa3-a442-27204e3cd3b5': 'f' /* Léonie */,
  'pt-BR-BrendaNeural': 'f', 'pt-BR-JulioNeural': 'm', 'cartesia_1cf751f6-8749-43ab-98bd-230dd633abdb': 'f' /* Ana Paula */,
  'cartesia_07b6f895-78b9-4921-8e10-8a21c99c2e8a': 'm' /* Rafael */,
  'ar-EG-SalmaNeural': 'f', 'ar-SA-ZariyahNeural': 'f', 'ar-EG-ShakirNeural': 'm', 'ar-SA-HamedNeural': 'm',
  'cartesia_9825cf5f-6aff-412a-80c5-bc58a8d55bc4': 'f' /* Maryam */, 'cartesia_002622d8-19d0-4567-a16a-f99c7397c062': 'f' /* Huda */,
  'cartesia_664aec8a-64a4-4437-8a0b-a61aa4f51fe6': 'm' /* Hassan */,
  'pa-IN-VaaniNeural': 'f', 'cartesia_9bf2ddcd-bb35-4e90-81b3-21c8183b24f4': 'f' /* Navjot */,
  'cartesia_8bacd442-a107-4ec1-b6f1-2fcb3f6f4d56': 'm' /* Gurpreet */,
  'ur-PK-UzmaNeural': 'f', 'ur-PK-AsadNeural': 'm',
  'gu-IN-DhwaniNeural': 'f', 'gu-IN-NiranjanNeural': 'm', 'cartesia_4590a461-bc68-4a50-8d14-ac04f5923d22': 'f' /* Isha */,
  'cartesia_91925fe5-42ee-4ebe-96c1-c84b12a85a32': 'm' /* Amit */,
};
const NAME = {
  'cartesia_8bacd442-a107-4ec1-b6f1-2fcb3f6f4d56': 'Gurpreet', 'cartesia_9bf2ddcd-bb35-4e90-81b3-21c8183b24f4': 'Navjot',
  'cartesia_91925fe5-42ee-4ebe-96c1-c84b12a85a32': 'Amit', 'cartesia_4590a461-bc68-4a50-8d14-ac04f5923d22': 'Isha',
  'cartesia_5c5ad5e7-1020-476b-8b91-fdcbe9cc313c': 'Daniela', 'cartesia_63fdecc2-4e1d-4aa3-a442-27204e3cd3b5': 'Léonie',
  'cartesia_1cf751f6-8749-43ab-98bd-230dd633abdb': 'Ana Paula', 'cartesia_9825cf5f-6aff-412a-80c5-bc58a8d55bc4': 'Maryam',
  'cartesia_002622d8-19d0-4567-a16a-f99c7397c062': 'Huda',
};
const bare = (v) => String(v || '').replace(/^azure_/, '');
const genderOf = (v) => VOICE_GENDER[bare(v)] || VOICE_GENDER[v] || null;
const label = (v) => NAME[v] || bare(v);
// The voice the re-record should be made in: the course's known.byGender (cast-settled.json, two-voice-undo-17.json).
const KNOWN_CAST = {
  eng_for_pan: { m: 'cartesia_8bacd442-a107-4ec1-b6f1-2fcb3f6f4d56', f: 'cartesia_9bf2ddcd-bb35-4e90-81b3-21c8183b24f4' },
  eng_for_urd: { m: 'azure_ur-PK-AsadNeural', f: 'azure_ur-PK-UzmaNeural' },
  eng_for_guj: { m: 'cartesia_91925fe5-42ee-4ebe-96c1-c84b12a85a32', f: 'cartesia_4590a461-bc68-4a50-8d14-ac04f5923d22' },
};
const seedOf = (id) => { const m = String(id).match(/^S(\d{4})/); return m ? +m[1] : null; };
const sha16 = (t) => crypto.createHash('sha1').update(t || '').digest('hex').slice(0, 16);
const vnorm = (v) => { const s = String(v || ''); const [p, ...r] = s.split('_'); return ['cartesia', 'azure', 'xai', 'elevenlabs', 'google', 'abair'].includes(p) ? r.join('_') : s; };
const FIRST_PERSON = /[\s"'¿¡(]((i|i'm|i've|i'd|i'll|me|my|mine|myself|we|we're|we've|we'd|we'll|us|our|ours|ourselves)|(i|we)['’](m|ve|d|ll|re))[\s.,!?;:'")]/i;
const OTHER_SUBJECT = /[\s"'¿¡(](you|you're|you've|you'd|you'll|your|yourself|he|he's|she|she's|it|it's|they|they're|this|that|there|his|her|their|someone|nobody|everyone)[\s.,!?;:'")]/i;
const PREDICATE = /[\s'’](am|m|was|were|re|are|be|been|being|feel|feeling|felt|stay|stayed|become|became|seem|seemed|look|looked|myself|ourselves|went|came|left|arrived|returned|fell|woke|sat|born)[\s.,!?;:'")]/i;
const LEDGER_START = '2026-09-28', WINDOW = 30 * 60 * 1000;

// ---------- ledger: only the calls for our four target courses ----------
const want = new Set(A);
const calls = new Map(); // hash -> [{at, voice}]
for (const line of fs.readFileSync(ledgerFile, 'utf8').split('\n')) {
  if (!line.includes('"kind":"call"')) continue;
  if (!A.some((c) => line.includes(c))) continue;
  let e; try { e = JSON.parse(line); } catch { continue; }
  if (!want.has(e.course)) continue;
  (calls.get(e.text_hash) || calls.set(e.text_hash, []).get(e.text_hash)).push({ at: Date.parse(e.at), voice: vnorm(e.voice) });
}

const slots = [], excluded = [], summary = {};
const add = (c, k, n = 1) => { (summary[c] ||= {}); summary[c][k] = (summary[c][k] || 0) + n; };

// ---------- 8A ----------
for (const c of A) {
  const cand = rd(`${c}.cand.json`), prov = rd(`${c}.cprov.json`), pairs = rd(`${c}.pairs.json`);
  const clip = new Map(prov.clips.map((x) => [x.id, x]));
  const revs = new Map(); for (const r of prov.revisions) (revs.get(r.audio_id) || revs.set(r.audio_id, []).get(r.audio_id)).push(r);
  const pairBy = new Map(pairs.map((p) => [p.original_text, p]));
  const seedKnown = new Map(rd(`${c}.dump.json`).seeds.map((x) => [x.seed_number, x.known_text || '']));
  for (const s of cand) {
    const k = clip.get(s.t1);
    const ex = (why) => { excluded.push({ course: c, target: s.kind, id: String(s.id), role: 'target1', why }); add(c, `excluded:${why.split(':')[0]}`); };
    if (!k) { ex('silent: no target1 clip (not mis-voiced)'); continue; }
    const g = genderOf(k.voice_id);
    if (g == null) { ex(`voice-unknown: clip voice ${k.voice_id} has no gender in the cast records (gap, not guessed)`); continue; }
    if (g !== 'f') { ex(`male-voice-on-target1: ${k.voice_id} (a seat-voice defect, not item 8)`); continue; }
    // A case / end-punctuation difference is the same words (library reuse is case-insensitive); anything else is not.
    const same = (a, b) => String(a || '').toLowerCase().replace(/[.!?¿¡]+$/u, '').trim() === String(b || '').toLowerCase().replace(/[.!?¿¡]+$/u, '').trim();
    if (!same(k.text, s.text)) { ex(`label-mismatch: clip text "${k.text}" is not the slot text (a different defect)`); continue; }
    // KAI'S MALE-DEFAULT RULE (16 Nov, as #142·AI / #241·AI applied it): the female form ONLY where the word refers to
    // the female speaker (I / we). A known prompt with no first person (a bare LEGO "tired", "you were brave", "it was
    // nice", a colour) keeps the male form, so the clip is not wrong; held for a reader, never re-recorded on a guess.
    // the speaker must be the one described: I/we AND a predicate that can describe them (am, was, be, feel, …) —
    // "I've got an important meeting" names the speaker but the agreeing word is the meeting's, so it is held.
    const fp = (t) => FIRST_PERSON.test(` ${t || ''} `) && PREDICATE.test(` ${t || ''} `), other = (t) => OTHER_SUBJECT.test(` ${t || ''} `);
    let speaker = null;
    if (fp(s.known)) speaker = 'row describes I/we';
    else if (!other(s.known) && fp(seedKnown.get(s.seed))) speaker = `fragment of seed ${s.seed} "${seedKnown.get(s.seed)}" (I/we)`;
    if (!speaker) { ex(`held-not-first-person: known "${s.known}" (seed ${s.seed} "${seedKnown.get(s.seed)}") speaker not established mechanically: male default (Kai 16 Nov) until a reader says the word refers to the speaker`); continue; }
    const rv = (revs.get(k.id) || []).sort((a, b) => a.revision - b.revision);
    const last = rv[rv.length - 1];
    if (last && /female form/i.test(last.reason || '')) { ex(`rerecorded: ${last.reason.slice(0, 80)}`); continue; }
    const at = last ? last.created_at : k.created_at;
    const T = Date.parse(at), v = vnorm(k.voice_id);
    let best = null;
    for (const [t, side] of [[s.text, 'male'], [s.female, 'female']]) {
      for (const call of calls.get(sha16(t)) || []) {
        if (call.voice === v && Math.abs(call.at - T) <= WINDOW && (!best || Math.abs(call.at - T) < best.d)) best = { d: Math.abs(call.at - T), side };
      }
    }
    let evidence, why;
    const pa = (pairBy.get(s.text) || {}).processed_at || null;
    if (best && best.side === 'female') { ex('right: spend ledger shows the female reading was sent at render'); continue; }
    if (best) { evidence = 'ledger'; why = `spend ledger: the male text was sent ${Math.round(best.d / 1000)}s from this clip's render (${at.slice(0, 10)})`; }
    else if (pa && at < pa) { evidence = 'date'; why = `clip rendered ${at.slice(0, 10)}, before its female reading existed (pair processed ${pa.slice(0, 10)}): it says the plain male form`; }
    else { evidence = 'unknown'; why = `rendered ${at.slice(0, 10)} (${at < LEDGER_START ? 'before the spend ledger' : 'no matching paid call'}), reading existed (${(pa || '?').slice(0, 10)}): not proven either way, re-record makes it certain`; }
    why += `; speaker: ${speaker}`;
    add(c, `slots:${evidence}`); add(c, 'chars', [...s.female].length);
    slots.push({ course: c, target: s.kind, id: String(s.id), seed: s.seed, role: 'target1', text: s.text, speak: s.female, want_gender: 'f',
      current_audio_id: k.id, current_voice: label(k.voice_id), evidence, why });
  }
}

// ---------- 8B ----------
const bReuse = {};
for (const c of B) {
  const d = rd(`${c}.dump.json`), stored = rd(`${c}.pairs.json`), det = rd(`${c}.detect.json`), kvoices = rd(`${c}.kvoices.json`);
  const nk = kv.normalizeKnownKey;
  const detBy = new Map((det.results || []).map((r) => [nk(r.text), r]));
  const keep = [], covered = new Set();
  let unverified = 0, dropped = 0, detOnly = 0, detUpdated = 0;
  for (const p of stored.filter((p) => p.text_side === 'known' && p.expanded_m && p.expanded_f && nk(p.expanded_m) !== nk(p.expanded_f))) {
    const hits = [detBy.get(nk(p.expanded_m)), detBy.get(nk(p.expanded_f)), detBy.get(nk(p.original_text))].filter(Boolean);
    covered.add(nk(p.expanded_m)); covered.add(nk(p.expanded_f)); covered.add(nk(p.original_text));
    const h = hits.find((x) => x.status === 'gendered');
    if (h) { if (nk(h.m) !== nk(p.expanded_m) || nk(h.f) !== nk(p.expanded_f)) detUpdated++; keep.push({ expanded_m: h.m, expanded_f: h.f }); }
    else if (hits.length && hits.every((x) => x.status === 'neutral')) dropped++;
    else unverified++;
  }
  for (const r of det.results || []) {
    if (r.status !== 'gendered' || covered.has(nk(r.text)) || covered.has(nk(r.m)) || covered.has(nk(r.f))) continue;
    covered.add(nk(r.m)); covered.add(nk(r.f)); detOnly++;
    keep.push({ expanded_m: r.m, expanded_f: r.f });
  }
  const index = kv.buildKnownGenderIndex(keep);
  const storedIndex = kv.buildKnownGenderIndex(stored.filter((p) => p.text_side === 'known'));
  const voiceOf = new Map();
  for (const [v, list] of Object.entries(kvoices.voices || {})) for (const x of list) voiceOf.set(x.id, v);
  const rows = [
    ...d.seeds.map((s) => ({ kind: 'seed', id: String(s.seed_number), seed: s.seed_number, r: s })),
    ...d.legos.map((l) => ({ kind: 'lego', id: l.lego_id, seed: l.seed_number, r: l })),
    ...d.phrases.map((p) => ({ kind: 'phrase', id: p.id, seed: p.seed_number, r: p })),
  ];
  let notInDetector = 0;
  for (const { kind, id, seed, r } of rows) {
    const text = r.known_text; if (!text || !text.trim()) continue;
    const hit = index.get(nk(text));
    if (!hit) { if (storedIndex.get(nk(text)) && !detBy.has(nk(text))) notInDetector++; continue; }
    const cur = r.known_audio_id;
    if (!cur) { add(c, 'excluded:silent (item 1 fill, not ours)'); continue; }
    const v = voiceOf.get(cur); const g = genderOf(v);
    if (!v) { excluded.push({ course: c, target: kind, id, role: 'known', why: 'clip not found on the copy' }); add(c, 'excluded:clip-missing'); continue; }
    if (g == null) { excluded.push({ course: c, target: kind, id, role: 'known', why: `voice-unknown ${v}` }); add(c, 'excluded:voice-unknown'); continue; }
    if (g === hit.gender) { add(c, `ok:${hit.gender}-form-in-${g}-voice`); continue; }
    add(c, `slots:${hit.gender}-form-in-${g}-voice`); add(c, 'chars', [...text].length);
    slots.push({ course: c, target: kind, id, seed, role: 'known', text, speak: text, want_gender: hit.gender,
      want_voice: label(KNOWN_CAST[c][hit.gender]), current_audio_id: cur, current_voice: label(v), evidence: 'pair',
      why: `known text is the ${hit.gender === 'm' ? 'male' : 'female'} form of a speaker-gendered pair (#710 detector-verified); clip is in ${label(v)} (${g})` });
  }
  bReuse[c] = { pairsOfRecord: keep.length, storedVerified: keep.length - detOnly, detectorOnly: detOnly, detectorFormsDiffer: detUpdated,
    storedDroppedNeutral: dropped, storedUnverified: unverified, courseTextsWithStoredPairNotInDetector: notInDetector, detectorAt: det.at };
}

const ORDER = [...A, ...B];
slots.sort((a, b) => ORDER.indexOf(a.course) - ORDER.indexOf(b.course) || (a.seed || 0) - (b.seed || 0)
  || ['seed', 'lego', 'phrase'].indexOf(a.target) - ['seed', 'lego', 'phrase'].indexOf(b.target) || a.id.localeCompare(b.id));
// distinct renders: one per (course, role, voice gender, spoken words) — library-first links the rest free
const distinct = {};
for (const s of slots) { const k = `${s.course}|${s.role}|${s.want_gender}|${s.speak}`; distinct[k] ||= [...s.speak].length; }
const renderChars = {};
for (const [k, n] of Object.entries(distinct)) { const c = k.split('|')[0]; renderChars[c] = (renderChars[c] || 0) + n; }
const copy = process.env.COPY_DB || 'unknown';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'slots.json'), JSON.stringify({ copy, built: new Date().toISOString(), job: 'cs #877·AK',
  slots: slots.map(({ seed, ...s }) => s) }, null, 1));
fs.writeFileSync(path.join(outDir, 'excluded.json'), JSON.stringify(excluded, null, 1));
// sample: ~10 per course, spread across seeds, strongest evidence first
const sample = {};
for (const c of ORDER) {
  const mine = slots.filter((s) => s.course === c);
  const pick = [];
  // the unknown pool is the open question (no evidence either way): it gets up to 5 of the 10 when it exists
  const unk = mine.filter((s) => s.evidence === 'unknown'), proven = mine.filter((s) => s.evidence !== 'unknown');
  const nU = Math.min(unk.length, 10 - Math.min(5, proven.length)), nP = Math.min(proven.length, 10 - nU);
  for (const [l, n] of [[proven, nP], [unk, nU]]) for (let i = 0; i < n; i++) pick.push(l[Math.floor(i * l.length / n)]);
  sample[c] = pick.slice(0, 10).map((s) => ({ course: s.course, target: s.target, id: s.id, role: s.role, current_audio_id: s.current_audio_id, text: s.text, evidence: s.evidence }));
}
fs.writeFileSync(path.join(outDir, 'sample.json'), JSON.stringify(sample, null, 1));
console.log(JSON.stringify({ summary, renderChars, bReuse, slots: slots.length, excluded: excluded.length }, null, 1));
