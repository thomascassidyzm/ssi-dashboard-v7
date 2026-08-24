// AXIS 2 sensitivity — vary target-normalisation strictness and surface membership.
const corpus = require('./jrefute-corpus.json');
const plan = require('./adj-plan.json');
const variants = {
  raw_target: { roles: ['build', 'use'], nt: s => (s || '').trim() },
  loose_target: { roles: ['build', 'use'], nt: s => (s || '').trim().toLowerCase().replace(/[.!?¿¡,]+$/g, '').replace(/\s+/g, ' ') },
  incl_component_rows: { roles: ['build', 'use', 'component'], nt: s => (s || '').trim() },
};
for (const [name, v] of Object.entries(variants)) {
  const R = new Set(v.roles);
  const served = corpus.filter(r => r.tbl === 'course_legos' || R.has(r.phrase_role));
  const ids = new Set(served.map(r => r.row_uuid));
  const edits = new Map();
  // NOTE: card_tile / component_row_latent plan entries reuse the PARENT lego's row_uuid.
  // Only surface === 'known_text' entries change the served prompt string.
  for (const p of plan) if (p.surface === 'known_text' && ['strip', 'rewrite', 'partial'].includes(p.action) && ids.has(p.row_uuid)) edits.set(p.row_uuid, p.new_known_text);
  const g = new Map();
  for (const r of served) {
    const k = r.course_code + '' + (edits.has(r.row_uuid) ? edits.get(r.row_uuid) : r.known_text).trim();
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(r);
  }
  let coll = 0, withEdit = 0; const er = new Set(); const ex = [];
  for (const [k, rows] of g) {
    const tg = [...new Set(rows.map(r => v.nt(r.target_text)))];
    if (tg.length < 2) continue;
    coll++;
    const e = rows.filter(r => edits.has(r.row_uuid));
    if (!e.length) continue;
    withEdit++; e.forEach(r => er.add(r.row_uuid));
    if (ex.length < 30) ex.push({
      key: k.replace('', ' '), targets: tg, edited: e.length,
      rows: rows.map(r => ({ seed: r.seed_number, role: r.phrase_role || 'lego', old: r.known_text, new: edits.get(r.row_uuid) || null, target: r.target_text })),
    });
  }
  console.log(`\n=== ${name} | edits applied ${edits.size} | collision groups ${coll} | containing an edit ${withEdit} | edited rows implicated ${er.size}`);
  for (const e of ex) console.log('   ' + JSON.stringify(e));
}
