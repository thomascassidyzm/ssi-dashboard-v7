#!/usr/bin/env node
'use strict';
// tools/course-optimization/ara-dup-lego-flip-2026-10-22.cjs — ara_for_eng duplicate LEGOs still marked NEW (job #513, Kai 22 Oct 2026).
//
// Kai's rule (2026-09-23, re-stated 22 Oct): a LEGO is a duplicate, and so NOT NEW, only if BOTH its known text and its target
// text EXACTLY match an earlier LEGO (earlier seed, or earlier index in the same seed). Any difference on either side — gender,
// form, a diacritic, wording — is not a duplicate. Candidates come from census #420 (D6a); this tool re-derives them from live data.
//
//   - A confirmed duplicate goes not-new (lego.update is_new false, with expect is_new true). Never delete a LEGO; its phrases
//     stay where they are and go unplayed (P25) — Kai is fine with that, they are not moved or deleted.
//   - If the flip leaves the seed with NO new LEGO, the LEGO is HELD (not flipped) and reported: there is nowhere played to put
//     the seed sentence.
//   - If the seed sentence (the seed's exact known + target) was played only under the flipped LEGO, a copy goes in as a USE
//     row under the seed's last remaining new LEGO, carrying the seed's own three clips (0 characters of TTS).
//   - Each touched seed is unapproved (approved_at null) when it is approved.
//
//   node …/ara-dup-lego-flip-2026-10-22.cjs check <seeds.json>     # plan + ZUT before/after on a dump of GET …/seeds?status=all
//   APPLY_CONFIRM=1 node … run <seeds.json>                        # edit-batch dry run, then apply
//   node …/ara-dup-lego-flip-2026-10-22.cjs verify <seeds.json>
const fs = require('fs');
const path = require('path');

const COURSE = 'ara_for_eng';
const AGENT = 'ara-dup-lego-flip (job #513)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const P = (id) => `${COURSE}:${id}`;
const sid = (id) => String(id).split(':').pop();

function fromApi(api) {
  const seeds = [], legos = [], phrases = [];
  for (const s of api.seeds) {
    const { legos: ls, ...seed } = s; seeds.push(seed);
    for (const l of ls || []) { const { basket_phrases, ...lego } = l; legos.push(lego); for (const p of basket_phrases || []) phrases.push(p); }
  }
  return { seeds, legos, phrases };
}

const order = (a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index;
// Finding where the seed sentence is played is looser than the duplicate test: harakat, tatweel and punctuation are ignored, so
// S0419L03U02 "…يُحِبَّهُمُ الناسُ" counts as the seed's "…يُحِبَّهُمُ النّاسُ" (same words, one shadda written differently).
const loose = (t) => String(t || '').normalize('NFC').replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/[\s.,?!،؟]+/g, ' ').trim().toLowerCase();
const isSeedSentence = (r, s) => r.phrase_role !== 'component' && loose(r.known_text) === loose(s.known_text) && loose(r.target_text) === loose(s.target_text);

const exact = (r, s) => r.known_text === s.known_text && r.target_text === s.target_text;
const copyRow = (src, over) => {
  const row = { ...src, ...over };
  for (const c of ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id', 'target1_duration_ms', 'target2_duration_ms',
    'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked', 'decomposition', 'display_tiling', 'display_tiling_version']) delete row[c];
  return row;
};

function plan(db) {
  const legos = [...db.legos].sort(order);
  const firstByPair = new Map();
  const dups = [];
  for (const l of legos) {
    const key = `${l.known_text}\u0000${l.target_text}`; // exact, both sides
    if (l.is_new === true && firstByPair.has(key)) dups.push({ lego: l, earlier: firstByPair.get(key) });
    if (!firstByPair.has(key)) firstByPair.set(key, l);
  }
  const out = { flips: [], held: [], copies: [], unapprove: [] };
  for (const { lego, earlier } of dups) {
    const seed = db.seeds.find((s) => s.seed_number === lego.seed_number);
    const flipping = new Set(dups.filter((d) => d.lego.seed_number === lego.seed_number).map((d) => d.lego.lego_id));
    const remaining = legos.filter((l) => l.seed_number === lego.seed_number && l.is_new === true && !flipping.has(l.lego_id));
    const row = { lego: lego.lego_id, earlier: earlier.lego_id, known: lego.known_text, target: lego.target_text, seed: lego.seed_number };
    if (!remaining.length) { out.held.push({ ...row, reason: 'the seed would have no new LEGO left' }); continue; }
    out.flips.push(row);
    const under = (l) => db.phrases.filter((p) => sid(p.id).startsWith(l.lego_id) && isSeedSentence(p, seed));
    if (under(lego).length && !remaining.some((l) => under(l).length)) {
      const home = remaining[remaining.length - 1];
      const homeRows = db.phrases.filter((p) => sid(p.id).startsWith(home.lego_id));
      const nextU = 1 + Math.max(0, ...homeRows.filter((p) => /U\d+$/.test(sid(p.id))).map((p) => +sid(p.id).match(/U(\d+)$/)[1]));
      const id = `${home.lego_id}U${String(nextU).padStart(2, '0')}`;
      // The copy keeps the WORDING of the row it stands in for (not the seed row's spelling): S0419's seed writes النّاسُ, its
      // played row الناسُ — same sound, but two spellings under one known would be a new ZUT pair. The seed's clips speak it.
      out.copies.push({
        seed: seed.seed_number, from: under(lego).map((p) => sid(p.id)), to: id,
        row: copyRow(under(lego)[0], { id: P(id), lego_index: home.lego_index, phrase_role: 'use', lego_position: 'end',
          position: 1 + Math.max(0, ...homeRows.map((p) => p.position || 0)),
          metadata: { ...(under(lego)[0].metadata || {}), seed_sentence_copy: true, placed_by: 'job #513 (P25: duplicate LEGO set not new)', copied_from: sid(under(lego)[0].id) } }),
        // The seed's own clips when the row's words are the seed's verbatim; otherwise (S0419: النّاسُ/الناسُ) the clips of the row
        // it stands in for, which speak exactly its words — Popty refuses a clip whose text differs from the row's.
        clips: exact(under(lego)[0], seed) ? { known: seed.known_audio_id, target1: seed.target1_audio_id, target2: seed.target2_audio_id }
          : { known: under(lego)[0].known_audio_id, target1: under(lego)[0].target1_audio_id, target2: under(lego)[0].target2_audio_id },
        clipsFrom: exact(under(lego)[0], seed) ? `seed S${String(seed.seed_number).padStart(4, '0')}` : sid(under(lego)[0].id),
      });
    }
    if (seed.approved_at && !out.unapprove.some((u) => u.seed === seed.seed_number)) out.unapprove.push({ seed: seed.seed_number, was: seed.approved_at });
  }
  return out;
}

function editOps(p) {
  const ops = [];
  for (const f of p.flips) ops.push({ op: 'lego.update', lego_id: f.lego, set: { is_new: false }, expect: { is_new: true, known_text: f.known, target_text: f.target } });
  for (const c of p.copies) {
    ops.push({ op: 'phrase.insert', row: c.row });
    for (const slot of ['known', 'target1', 'target2']) if (c.clips[slot]) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: c.row.id, slot, audio_id: c.clips[slot] });
  }
  for (const u of p.unapprove) ops.push({ op: 'seed.update', seed_number: u.seed, set: { approved_at: null }, expect: { approved_at: u.was } });
  return ops;
}

function zut(db, p) {
  const audit = require('./audit-phrase-zut.cjs');
  const legos = db.legos.map((l) => ({ ...l, id: l.lego_id }));
  const before = audit.auditRows({ legos, phrases: db.phrases, seeds: db.seeds });
  const after = audit.auditRows({ legos, phrases: db.phrases.concat(p.copies.map((c) => c.row)), seeds: db.seeds });
  const n = (r) => ({ strict: r.bidirectional.violationsStrict.length, membership: r.targetMembership ? r.targetMembership.failures?.length ?? r.targetMembership.length : undefined });
  return { before: n(before), after: n(after) };
}

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  const p = plan(db);
  if (mode === 'verify') {
    const bad = [];
    for (const f of p.flips) bad.push(`${f.lego} still new`);
    console.log(`verify: ${bad.length} breaches; held ${p.held.length}`); for (const b of bad) console.log('  ', b); process.exitCode = bad.length ? 1 : 0; return;
  }
  const z = zut(db, p);
  console.log(`plan: ${p.flips.length} flip, ${p.held.length} held, ${p.copies.length} seed-sentence copies, ${p.unapprove.length} unapprove; ZUT strict ${z.before.strict} → ${z.after.strict}`);
  for (const f of p.flips) console.log(`  flip ${f.lego} = ${f.earlier}: ${f.known} | ${f.target}`);
  for (const h of p.held) console.log(`  HELD ${h.lego} = ${h.earlier} (${h.reason}): ${h.known} | ${h.target}`);
  for (const c of p.copies) console.log(`  copy S${c.seed} sentence (was ${c.from.join(',')}) → ${c.to}, clips from ${c.clipsFrom}`);
  if (mode === 'check') return;
  const ops = editOps(p);
  const prev = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  console.log(`dry run HTTP ${prev.status} ${JSON.stringify(prev.body.error || prev.body.errors || '').slice(0, 600)}`);
  if (prev.status !== 200 || process.env.APPLY_CONFIRM !== '1') return;
  const res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  const log = { job: '#513', at: new Date().toISOString(), plan: p, zut: z, ops, applied: { status: res.status, event: res.body.event_id, undo: res.body.undo_ops || res.body.undo, error: res.status === 200 ? undefined : res.body } };
  const f = path.join(process.env.LOG_DIR || process.cwd(), `ara-dup-lego-flip-applied-${log.at.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2));
  console.log(`APPLY HTTP ${res.status}; event ${log.applied.event}; log ${f}`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { plan, editOps, fromApi };
